import { beforeEach, describe, expect, it, vi } from 'vitest';
import { startCheckout } from '@/lib/checkout';

const mocks = vi.hoisted(() => ({ session: vi.fn(), invoke: vi.fn(), ref: vi.fn(), error: vi.fn(), track: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: mocks.session }, functions: { invoke: mocks.invoke } } }));
vi.mock('@/lib/attribution', () => ({ getStoredRefCode: mocks.ref }));
vi.mock('@/lib/analytics', () => ({ trackInitiateCheckout: mocks.track }));
vi.mock('sonner', () => ({ toast: { error: mocks.error } }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.ref.mockReturnValue('LALO');
  mocks.invoke.mockResolvedValue({ data: { url: 'https://checkout.stripe.com/test-session' }, error: null });
  mocks.session.mockResolvedValue({ data: { session: { user: { id: 'user', email_confirmed_at: '2026-10-10' } } }, error: null });
});
describe('registration before checkout', () => {
  it('preserves the referral and requires an account for guests', async () => {
    mocks.session.mockResolvedValue({ data: { session: null }, error: null });
    await startCheckout();
    expect(window.location.pathname).toBe('/register');
    expect(new URLSearchParams(window.location.search).get('ref')).toBe('LALO');
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it('requires email confirmation before requesting a payment', async () => {
    mocks.session.mockResolvedValue({ data: { session: { user: { email_confirmed_at: null } } }, error: null });
    await startCheckout();
    expect(window.location.pathname).toBe('/auth/continue');
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it('forwards the explicitly validated code for authenticated users', async () => {
    await startCheckout('ALICIA');
    expect(mocks.invoke).toHaveBeenCalledWith('create-checkout', { body: { referral_code: 'ALICIA' } });
    expect(window.location.hostname).toBe('checkout.stripe.com');
  });
  it('does not resurrect a stored referral after the user clears it', async () => {
    await startCheckout('');
    expect(mocks.invoke).toHaveBeenCalledWith('create-checkout', { body: { referral_code: undefined } });
  });
  it('shows the server error instead of pretending checkout succeeded', async () => {
    mocks.invoke.mockResolvedValue({ data: null, error: { context: { json: async () => ({ error: 'Código no válido' }) } } });
    await startCheckout();
    expect(mocks.error).toHaveBeenCalledWith('Código no válido');
  });
});
