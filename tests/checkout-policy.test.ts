// @vitest-environment node
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';
import * as billing from '../supabase/functions/_shared/billing';

// Execute the real edge handler with boundary mocks: no Stripe calls or charges.
function checkoutFixture(options: { lifetime?: boolean; confirmed?: boolean; active?: boolean; open?: any[]; priceCents?: number; previous?: any[]; paidInvoices?: any[]; invoicePages?: any[]; linePages?: any[]; referralCode?: string } = {}) {
  let handler: (request: Request) => Promise<Response>;
  const create = vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/new' });
  const expire = vi.fn().mockResolvedValue({});
  const price = { active: true, currency: 'usd', unit_amount: options.priceCents ?? 1500, recurring: { interval: 'month', interval_count: 1 }, product: 'prod_tokxray' };
  const stripe = {
    invoices: { list: vi.fn().mockImplementation(async ({ starting_after }: any) => options.invoicePages ? options.invoicePages[starting_after ? 1 : 0] : { data: options.paidInvoices ?? [], has_more: false }), listLineItems: vi.fn().mockImplementation(async () => options.linePages?.[0] ?? { data: [], has_more: false }) },
    prices: { retrieve: vi.fn().mockResolvedValue(price) },
    subscriptions: { list: vi.fn().mockResolvedValue({ data: options.active ? [{ status: 'active' }] : options.previous ?? [] }) },
    checkout: { sessions: { create, expire, list: vi.fn().mockResolvedValue({ data: options.open ?? [] }) } },
  };
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'buyer', email: 'buyer@example.com', email_confirmed_at: options.confirmed === false ? null : '2026-10-13' } } }) },
    from: (table: string) => {
      const data = table === 'profiles' ? { stripe_customer_id: 'cus_buyer', referral_code_used: options.referralCode ?? 'LALO' }
        : table === 'affiliate_codes' ? { code: options.referralCode ?? 'LALO', user_id: 'creator' }
        : table === 'creator_program_applications' ? (options.lifetime ? [{ id: 'grant' }] : []) : null;
      const result = { data, error: null };
      const chain: any = { then: (resolve: any) => Promise.resolve(result).then(resolve) };
      for (const key of ['select', 'eq', 'not', 'is', 'limit', 'single', 'maybeSingle']) chain[key] = () => chain;
      return chain;
    },
  };
  const source = readFileSync(new URL('../supabase/functions/create-checkout/index.ts', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  const scope = { ...billing, serve: (fn: typeof handler) => { handler = fn; }, Stripe: function () { return stripe; }, createClient: () => client, Deno: { env: { get: (name: string) => name === 'STRIPE_PRICE_ID_PRO' ? 'price_15' : 'test' } } };
  new Function(...Object.keys(scope), compiled)(...Object.values(scope));
  return { create, expire, stripe, run: () => handler!(new Request('https://test/checkout', { method: 'POST', headers: { Authorization: 'Bearer test' }, body: JSON.stringify({ referral_code: 'LALO' }) })) };
}

describe('new commercial checkout boundary', () => {
  it('attributes the creator but charges full price without old referral coupon', async () => {
    const test = checkoutFixture();
    expect((await test.run()).status).toBe(200);
    const params = test.create.mock.calls[0][0];
    expect(params.line_items).toEqual([{ price: 'price_15', quantity: 1 }]);
    expect(params.discounts).toBeUndefined();
    expect(params.allow_promotion_codes).toBeUndefined();
    expect(params.subscription_data.metadata).toMatchObject({ billing_policy: '2026-10-14', price_usd: '15', referral_code: 'LALO', first_purchase: 'true' });
  });
  it('preserves a three-character creator code in both checkout and subscription metadata', async () => {
    const test = checkoutFixture({ referralCode: 'GUS' });
    expect((await test.run()).status).toBe(200);
    expect(test.create.mock.calls[0][0].metadata.referral_code).toBe('GUS');
    expect(test.create.mock.calls[0][0].subscription_data.metadata.referral_code).toBe('GUS');
  });
  it.each(['2026-10-10', '2026-10-13'])('expires stale %s TokXray sessions while preserving unrelated products', async policy => {
    const metadata = { supabase_user_id: 'buyer', plan_type: 'pro', referral_code: 'LALO', price_usd: '29', billing_policy: policy };
    const test = checkoutFixture({ open: [{ id: 'old_tokxray', mode: 'subscription', metadata }, { id: 'other_product', mode: 'subscription', metadata: { supabase_user_id: 'buyer' } }] });
    expect((await test.run()).status).toBe(200);
    expect(test.expire.mock.calls).toEqual([['old_tokxray']]);
  });
  it('rejects the old 29-dollar Stripe price instead of silently charging it', async () => {
    const test = checkoutFixture({ priceCents: 2900 });
    expect((await test.run()).status).toBe(400);
    expect(test.create).not.toHaveBeenCalled();
  });
  it('new checkout after cancellation uses new price without another first-purchase bonus', async () => {
    const test = checkoutFixture({ previous: [{ status: 'canceled', metadata: { billing_policy: '2026-10-13' } }], paidInvoices: [{ id: 'paid_old', amount_paid: 2900, lines: { data: [{ amount: 2900, price: { product: 'prod_tokxray' } }], has_more: false } }] });
    expect((await test.run()).status).toBe(200);
    expect(test.create.mock.calls[0][0].subscription_data.metadata).toMatchObject({ price_usd: '15', billing_policy: '2026-10-14', first_purchase: 'false' });
  });
  it.each(['incomplete_expired', 'canceled'])('preserves the first-payment bonus after %s without a paid invoice', async status => {
    const test = checkoutFixture({ previous: [{ status }] });
    expect((await test.run()).status).toBe(200);
    expect(test.create.mock.calls[0][0].metadata.first_purchase).toBe('true');
    expect(test.stripe.invoices.list).toHaveBeenCalledWith({ customer: 'cus_buyer', status: 'paid', limit: 100 });
  });
  it('ignores free invoices and payments for other products', async () => {
    const test = checkoutFixture({ previous: [{ status: 'canceled' }], paidInvoices: [
      { id: 'free', amount_paid: 0, lines: { data: [{ amount: 1500, price: { product: 'prod_tokxray' } }], has_more: false } },
      { id: 'other', amount_paid: 9900, lines: { data: [{ amount: 9900, price: { product: 'prod_other' } }], has_more: false } },
    ] });
    expect((await test.run()).status).toBe(200);
    expect(test.create.mock.calls[0][0].metadata.first_purchase).toBe('true');
  });
  it('finds a paid TokXray invoice beyond the first invoice and line pages', async () => {
    const test = checkoutFixture({ invoicePages: [
      { data: [{ id: 'latest', amount_paid: 0 }], has_more: true },
      { data: [{ id: 'older', amount_paid: 2900, lines: { data: [{ id: 'line_other', amount: 500, price: { product: 'other' } }], has_more: true } }], has_more: false },
    ], linePages: [{ data: [{ id: 'line_tok', amount: 2400, price: { product: { id: 'prod_tokxray' } } }], has_more: false }] });
    expect((await test.run()).status).toBe(200);
    expect(test.create.mock.calls[0][0].metadata.first_purchase).toBe('false');
    expect(test.stripe.invoices.list).toHaveBeenLastCalledWith({ customer: 'cus_buyer', status: 'paid', limit: 100, starting_after: 'latest' });
    expect(test.stripe.invoices.listLineItems).toHaveBeenCalledWith('older', { limit: 100, starting_after: 'line_other' });
  });
  it('does not guess bonus eligibility when invoice lookup fails', async () => {
    const test = checkoutFixture();
    test.stripe.invoices.list.mockRejectedValue(new Error('Stripe unavailable'));
    expect((await test.run()).status).toBe(400);
    expect(test.create).not.toHaveBeenCalled();
  });
  it('reuses a matching new-policy session', async () => {
    const test = checkoutFixture({ open: [{ id: 'same', mode: 'subscription', url: 'https://checkout.stripe.com/same', metadata: { supabase_user_id: 'buyer', plan_type: 'pro', referral_code: 'LALO', price_usd: '15', billing_policy: '2026-10-14', first_purchase: 'true', checkout_brand: 'tokxray-v1' } }] });
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
    expect(billing.commissionRecorder('2026-10-14')).toBe('record_affiliate_commission_v4');
    expect(billing.policyMonthlyPrice('2026-10-14')).toBe(15);
    expect(billing.policyMonthlyPrice('2026-10-13')).toBe(29);
    expect(() => billing.policyMonthlyPrice('unknown')).toThrow();
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
