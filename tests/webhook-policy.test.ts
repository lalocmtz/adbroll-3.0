// @vitest-environment node
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';
import * as billing from '../supabase/functions/_shared/billing';

function webhookFixture(policy: string | undefined = billing.BILLING_POLICY, reason = 'subscription_cycle', first = 'true') {
  let handler: (request: Request) => Promise<Response>;
  const invoice = { id: 'in_test', customer: 'cus_test', subscription: 'sub_test', currency: 'usd', amount_paid: 2900, billing_reason: reason };
  const subscription = { id: 'sub_test', customer: 'cus_test', status: 'active', current_period_end: 2000000000, items: { data: [{ price: { product: 'prod_tokxray' } }] }, metadata: { billing_policy: policy, first_purchase: first } };
  const event = { id: 'evt_test', type: 'invoice.paid', data: { object: invoice } };
  const stripe = {
    subscriptions: { retrieve: vi.fn().mockResolvedValue(subscription) },
    invoices: { retrieve: vi.fn().mockResolvedValue(invoice) },
    charges: { retrieve: vi.fn().mockResolvedValue({ id: 'ch_test', invoice: 'in_test', currency: 'usd', amount: 2900, amount_refunded: 1450 }) },
    webhooks: { constructEventAsync: vi.fn().mockImplementation(async () => event) },
  };
  const rpc = vi.fn().mockResolvedValue({ data: 4.35, error: null });
  const client = { rpc, from: (table: string) => {
    const data = table === 'profiles' ? { id: 'buyer', referral_code_used: 'LALO' } : { user_id: 'creator', code: 'LALO' };
    const result = { data, error: null };
    const chain: any = { then: (resolve: any) => Promise.resolve(result).then(resolve) };
    for (const key of ['select', 'eq', 'update', 'single', 'maybeSingle']) chain[key] = () => chain;
    return chain;
  } };
  const source = readFileSync(new URL('../supabase/functions/stripe-webhook/index.ts', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  const scope = { ...billing, serve: (fn: typeof handler) => { handler = fn; }, Stripe: function () { return stripe; }, createClient: () => client, Deno: { env: { get: (name: string) => name === 'STRIPE_PRODUCT_ID' ? 'prod_tokxray' : 'test' } }, console: { log: vi.fn(), error: vi.fn() } };
  new Function(...Object.keys(scope), compiled)(...Object.values(scope));
  return { rpc, event, stripe, run: () => handler!(new Request('https://test/webhook', { method: 'POST', headers: { 'stripe-signature': 'test' }, body: '{}' })) };
}

describe('Stripe invoice integration without payment side effects', () => {
  it.each([
    ['2026-10-13', 'subscription_create', 'true', 'record_affiliate_commission_v3', 'initial'],
    ['2026-10-13', 'subscription_cycle', 'true', 'record_affiliate_commission_v3', 'recurring'],
    ['2026-10-13', 'subscription_create', 'false', 'record_affiliate_commission_v3', 'reactivation'],
    ['2026-10-10', 'subscription_create', 'true', 'record_affiliate_commission_v2', 'initial'],
  ])('dispatches %s %s %s without changing legacy policy', async (policy, reason, first, recorder, type) => {
    const test = webhookFixture(policy, reason, first);
    expect((await test.run()).status).toBe(200);
    expect(test.rpc).toHaveBeenCalledWith(recorder, { p_referred_user_id: 'buyer', p_code: 'LALO', p_invoice_id: 'in_test', p_amount_paid_cents: 2900, p_type: type });
  });
  it('does not credit prorations or subscriptions for another product', async () => {
    const prorated = webhookFixture(billing.BILLING_POLICY, 'subscription_update');
    expect((await prorated.run()).status).toBe(200);
    expect(prorated.rpc).not.toHaveBeenCalled();
    const other = webhookFixture();
    other.stripe.subscriptions.retrieve.mockResolvedValue({ items: { data: [{ price: { product: 'other' } }] } });
    expect((await other.run()).status).toBe(200);
    expect(other.rpc).not.toHaveBeenCalled();
  });
  it('reconciles both recipients from a refunded invoice', async () => {
    const test = webhookFixture();
    test.event.type = 'charge.refunded';
    test.event.data.object = { id: 'ch_test' } as any;
    expect((await test.run()).status).toBe(200);
    expect(test.rpc.mock.calls.map(call => call[0])).toEqual(['record_affiliate_commission_v3', 'reconcile_affiliate_refund']);
    expect(test.rpc).toHaveBeenCalledWith('reconcile_affiliate_refund', { p_invoice_id: 'in_test', p_refunded_cents: 1450, p_charged_cents: 2900 });
  });
  it('holds direct and leader balances even when dispute arrives before invoice event', async () => {
    const test = webhookFixture();
    test.event.type = 'charge.dispute.created';
    test.event.data.object = { charge: 'ch_test' } as any;
    expect((await test.run()).status).toBe(200);
    expect(test.rpc.mock.calls.map(call => call[0])).toEqual(['record_affiliate_commission_v3', 'hold_affiliate_invoice']);
    expect(test.rpc).toHaveBeenCalledWith('hold_affiliate_invoice', { p_invoice_id: 'in_test' });
  });
  it('never accepts an invalid webhook signature', async () => {
    const test = webhookFixture();
    test.stripe.webhooks.constructEventAsync.mockRejectedValue(new Error('Invalid signature'));
    expect((await test.run()).status).toBe(400);
    expect(test.rpc).not.toHaveBeenCalled();
  });
});
