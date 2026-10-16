import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SubscriptionOffer } from '@/components/SubscriptionOffer';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), start: vi.fn(), persist: vi.fn(), clear: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  rpc: mocks.rpc, auth: { getSession: async () => ({ data: { session: null }, error: null }) },
} }));
vi.mock('@/hooks/useSubscription', () => ({ useSubscription: () => ({ isPro: false, loading: false }) }));
vi.mock('@/lib/checkout', () => ({ useStartCheckout: () => ({ startWithReferral: mocks.start, loading: false }) }));
vi.mock('@/lib/attribution', () => ({ getStoredRefCode: () => null, persistRefCode: mocks.persist, clearStoredRefCode: mocks.clear }));
beforeEach(() => { vi.resetAllMocks(); mocks.rpc.mockResolvedValue({ data: true, error: null }); });
describe('subscription referral attribution', () => {
  it.each(['gus', 'A'.repeat(32)])('validates and forwards %s without truncating it', async code => {
    render(<MemoryRouter initialEntries={[`/pricing?ref=${code}`]}><SubscriptionOffer /></MemoryRouter>);
    await screen.findByText('Código reconocido. Se conservará al crear tu cuenta y al pagar.');
    expect(mocks.rpc).toHaveBeenCalledWith('validate_referral_code', { p_code: code.toUpperCase() });
    expect(screen.getByLabelText('Código de creador')).toHaveAttribute('maxlength', '32');
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta y ver Pro' }));
    expect(mocks.start).toHaveBeenCalledWith(code.toUpperCase());
    expect(mocks.persist).toHaveBeenCalledWith(code.toUpperCase());
  });
  it('does not invoke validation for too-short or malformed codes', async () => {
    render(<MemoryRouter initialEntries={['/pricing?ref=GU']}><SubscriptionOffer /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('No encontramos ese código'));
    expect(screen.getByRole('button', { name: 'Crear cuenta y ver Pro' })).toBeDisabled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
