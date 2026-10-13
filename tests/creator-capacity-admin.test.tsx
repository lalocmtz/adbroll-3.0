import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CreatorProgramManager from '@/components/admin/CreatorProgramManager';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), toast: vi.fn(), remaining: 1, reviewError: false }));
const application = {
  id: 'application', email: 'creator@example.com', full_name: 'Creator', whatsapp: null,
  tiktok_url: 'https://www.tiktok.com/@creator', status: 'pending_review', access_kind: 'limited',
  video_urls: ['https://www.tiktok.com/@creator/video/1', 'https://www.tiktok.com/@creator/video/2', 'https://www.tiktok.com/@creator/video/3'],
  ad_permission_at: '2026-10-13', created_at: '2026-10-13', subscription_ends_at: null,
};
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  rpc: mocks.rpc, from: () => ({ select: () => ({ order: async () => ({ data: [application], error: null }) }) }),
} }));
beforeEach(() => {
  mocks.rpc.mockReset(); mocks.toast.mockReset(); mocks.remaining = 1; mocks.reviewError = false;
  mocks.rpc.mockImplementation(async (name: string) => {
    if (name === 'get_creator_lifetime_capacity') return { data: { limit: 100, claimed: 100 - mocks.remaining, remaining: mocks.remaining, is_open: mocks.remaining > 0 }, error: null };
    mocks.remaining = 0;
    return { data: { success: true }, error: mocks.reviewError ? { message: 'Cupo agotado' } : null };
  });
});
const open = () => render(<MemoryRouter><CreatorProgramManager /></MemoryRouter>);
describe('admin creator capacity', () => {
  it('blocks approval with no places but still allows returning the delivery for corrections', async () => {
    mocks.remaining = 0;
    open();
    expect(await screen.findByRole('button', { name: 'Activar vitalicio' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Devolver entrega de Creator' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Devolver entrega de Creator' }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith('review_creator_lifetime_application', { p_application_id: 'application', p_approve: false }));
  });
  it.each([false, true])('refreshes the available capacity after approval, including a capacity race (error=%s)', async (error) => {
    mocks.reviewError = error;
    open();
    const approve = await screen.findByRole('button', { name: 'Activar vitalicio' });
    await waitFor(() => expect(approve).toBeEnabled());
    fireEvent.click(approve);
    expect(await screen.findByText('Los 100 accesos vitalicios ya fueron otorgados')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Activar vitalicio' })).toBeDisabled();
    expect(mocks.rpc).toHaveBeenCalledWith('review_creator_lifetime_application', { p_application_id: 'application', p_approve: true });
    if (error) expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'No se pudo revisar', description: 'Cupo agotado' }));
  });
});
