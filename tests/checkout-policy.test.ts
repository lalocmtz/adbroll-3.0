// @vitest-environment node
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';
import * as billing from '../supabase/functions/_shared/billing';

// Execute the real edge handler with boundary mocks: no Stripe calls or charges.
function checkoutFixture(options: { lifetime?: boolean; confirmed?: boolean; active?: boolean; open?: any[] } = {}) {
  let handler: (request: Request) => Promise<Response>;
  const create = vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/new' });
  const expire = vi.fn().mockResolvedValue({});
  const price = { active: true, currency: 'usd', unit_amount: 2900, recurring: { interval: 'month', interval_count: 1 }, product: 'prod_tokxray' };
  const stripe = {
    prices: { retrieve: vi.fn().mockResolvedValue(price) },
    subscriptions: { list: vi.fn().mockResolvedValue({ data: options.active ? [{ status: 'active' }] : [] }) },
    checkout: { sessions: { create, expire, list: vi.fn().mockResolvedValue({ data: options.open ?? [] }) } },
  };
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'buyer', email: 'buyer@example.com', email_confirmed_at: options.confirmed === false ? null : '2026-10-13' } } }) },
    from: (table: string) => {
      const data = table === 'profiles' ? { stripe_customer_id: 'cus_buyer', referral_code_used: 'LALO' }
        : table === 'affiliate_codes' ? { code: 'LALO', user_id: 'creator' }
        : table === 'creator_program_applications' ? (options.lifetime ? [{ id: 'grant' }] : []) : null;
      const result = { data, error: null };
      const chain: any = { then: (resolve: any) => Promise.resolve(result).then(resolve) };
      for (const key of ['select', 'eq', 'not', 'is', 'limit', 'single', 'maybeSingle']) chain[key] = () => chain;
      return chain;
    },
  };
  const source = readFileSync(new URL('../supabase/functions/create-checkout/index.ts', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  const scope = { ...billing, serve: (fn: typeof handler) => { handler = fn; }, Stripe: function () { return stripe; }, createClient: () => client, Deno: { env: { get: (name: string) => name === 'STRIPE_PRICE_ID_PRO' ? 'price_29' : 'test' } } };
  new Function(...Object.keys(scope), compiled)(...Object.values(scope));
  return { create, expire, run: () => handler!(new Request('https://test/checkout', { method: 'POST', headers: { Authorization: 'Bearer test' }, body: JSON.stringify({ referral_code: 'LALO' }) })) };
}

describe('new commercial checkout boundary', () => {
  it('attributes the creator but charges full price without old referral coupon', async () => {
    const test = checkoutFixture();
    expect((await test.run()).status).toBe(200);
    const params = test.create.mock.calls[0][0];
    expect(params.line_items).toEqual([{ price: 'price_29', quantity: 1 }]);
    expect(params.discounts).toBeUndefined();
    expect(params.allow_promotion_codes).toBeUndefined();
    expect(params.subscription_data.metadata).toMatchObject({ billing_policy: '2026-10-13', referral_code: 'LALO', first_purchase: 'true' });
  });
  it('expires stale TokXray sessions while preserving sessions for unrelated products', async () => {
    const metadata = { supabase_user_id: 'buyer', plan_type: 'pro', referral_code: 'LALO', price_usd: '29', billing_policy: '2026-10-10' };
    const test = checkoutFixture({ open: [{ id: 'old_tokxray', mode: 'subscription', metadata }, { id: 'other_product', mode: 'subscription', metadata: { supabase_user_id: 'buyer' } }] });
    expect((await test.run()).status).toBe(200);
    expect(test.expire.mock.calls).toEqual([['old_tokxray']]);
  });
  it('reuses a matching new-policy session', async () => {
    const test = checkoutFixture({ open: [{ id: 'same', mode: 'subscription', url: 'https://checkout.stripe.com/same', metadata: { supabase_user_id: 'buyer', plan_type: 'pro', referral_code: 'LALO', price_usd: '29', billing_policy: '2026-10-13', checkout_brand: 'tokxray-v1' } }] });
    expect(await (await test.run()).json()).toEqual({ url: 'https://checkout.stripe.com/same' });
    expect(test.create).not.toHaveBeenCalled();
  });
  it.each([{ lifetime: true }, { confirmed: false }, { active: true }])('prevents charging an ineligible customer: %j', async options => {
    const test = checkoutFixture(options);
    expect((await test.run()).status).toBe(400);
    expect(test.create).not.toHaveBeenCalled();
  });
});

describe('historical subscription isolation', () => {
  it('preserves the correct ledger for each billing policy', () => {
    expect(billing.commissionRecorder('2026-10-13')).toBe('record_affiliate_commission_v3');
    expect(billing.commissionRecorder('2026-10-10')).toBe('record_affiliate_commission_v2');
    expect(billing.commissionRecorder()).toBe('record_affiliate_commission');
    expect(() => billing.commissionRecorder('unknown')).toThrow();
    expect(billing.policyMonthlyPrice('2026-10-10')).toBe(29);
  });
  it('separates real renewals, reactivation, and prorations', () => {
    expect(billing.invoiceCommissionType('subscription_create', 'true', billing.BILLING_POLICY)).toBe('initial');
    expect(billing.invoiceCommissionType('subscription_create', 'false', billing.BILLING_POLICY)).toBe('reactivation');
    expect(billing.invoiceCommissionType('subscription_cycle', 'false', billing.BILLING_POLICY)).toBe('recurring');
    expect(billing.invoiceCommissionType('subscription_update', 'true', billing.BILLING_POLICY)).toBeNull();
    expect(billing.invoiceCommissionType('subscription_create', 'false', '2026-10-10')).toBe('recurring');
  });
});
