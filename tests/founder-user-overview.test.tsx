import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { UserAffiliateOverview } from '@/components/admin/UserAffiliateOverview';
const mock = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mock.rpc } }));
const overview = {
  stats: { registered: 1005, email_confirmed: 900, paid_active: 100, complimentary_active: 5, affiliate_codes: 1005, active_affiliates: 12 },
  total: 26, rows: [{ id: '1', full_name: 'Lalo', email: 'lalo@example.com', created_at: '2026-10-10T12:00:00Z', email_confirmed: true, ref_code: 'LALO', referral_code_used: null, referrals_registered: 5, referrals_paid_active: 2, access_kind: 'complimentary' }],
};
beforeEach(() => mock.rpc.mockReset());
describe('Founder user overview', () => {
  it('uses server pagination and keeps global totals independent of current page', async () => {
    mock.rpc.mockResolvedValueOnce({ data: overview }).mockResolvedValueOnce({ data: { ...overview, rows: [] } });
    render(<UserAffiliateOverview />);
    await screen.findByText('lalo@example.com');
    expect(screen.getByText('Acceso gratuito / invitación')).toBeVisible();
    expect(screen.getByText('2 de pago activos')).toBeVisible();
    expect(screen.getAllByText('1,005')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await waitFor(() => expect(mock.rpc).toHaveBeenLastCalledWith('get_founder_user_overview', expect.objectContaining({ p_offset: 25, p_limit: 25 })));
    expect(await screen.findByText('26–26 de 26')).toBeVisible();
  });
  it('searches after typing and resets pagination when selecting a filter', async () => {
    mock.rpc.mockResolvedValue({ data: overview });
    render(<UserAffiliateOverview />);
    await screen.findByText('lalo@example.com');
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await waitFor(() => expect(mock.rpc).toHaveBeenLastCalledWith('get_founder_user_overview', expect.objectContaining({ p_offset: 25 })));
    fireEvent.change(screen.getByLabelText('Filtrar usuarios'), { target: { value: 'paid' } });
    await waitFor(() => expect(mock.rpc).toHaveBeenLastCalledWith('get_founder_user_overview', expect.objectContaining({ p_filter: 'paid', p_offset: 0 })));
    fireEvent.change(screen.getByLabelText('Buscar por nombre, correo o código'), { target: { value: 'Lalo' } });
    await waitFor(() => expect(mock.rpc).toHaveBeenLastCalledWith('get_founder_user_overview', expect.objectContaining({ p_search: 'Lalo', p_offset: 0 })));
  });
  it('shows an error rather than empty account counts when authorization or loading fails', async () => {
    mock.rpc.mockResolvedValue({ data: null, error: { message: 'Not authorized' } });
    render(<UserAffiliateOverview />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar los usuarios');
    expect(screen.queryByText('0 usuarios')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actualizar' })).toBeEnabled();
  });
});
