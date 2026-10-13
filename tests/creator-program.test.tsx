import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CreatorProgram from '@/pages/CreatorProgram';
const mock = vi.hoisted(() => ({ rpc: vi.fn(), user: null as any, application: null as any, toast: vi.fn() }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mock.toast }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: mock.user } }) }, rpc: mock.rpc,
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: mock.application }) }) }) }),
} }));
const verified = { email: 'creator@example.com', email_confirmed_at: '2026-10-12T00:00:00Z', user_metadata: { full_name: 'Creator Name' } };
const renderPage = () => render(<MemoryRouter><CreatorProgram /></MemoryRouter>);
beforeEach(() => { mock.user = verified; mock.application = null; mock.rpc.mockReset(); mock.toast.mockReset(); });

describe('creator program user flow', () => {
  it('routes new/unconfirmed users through account verification without requesting payment', async () => {
    mock.user = { ...verified, email_confirmed_at: null };
    renderPage();
    expect(await screen.findByRole('link', { name: 'Crear mi cuenta gratis' })).toHaveAttribute('href', '/register?redirect=%2Fcolaboraciones');
    expect(screen.queryByRole('button', { name: 'Enviar para activar acceso vitalicio' })).not.toBeInTheDocument();
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it('lets an invited creator submit 3 videos while retaining an active finite preview', async () => {
    mock.application = { status: 'active', access_kind: 'limited', approved_at: '2026-10-12T00:00:00Z', subscription_ends_at: '2099-10-20T00:00:00Z', email: verified.email, full_name: 'Creator Name', whatsapp: '2213267653', tiktok_url: 'https://www.tiktok.com/@creator', video_urls: [] };
    mock.rpc.mockImplementation(async () => { mock.application = { ...mock.application, status: 'pending_review' }; return { data: { status: 'pending_review' } }; });
    renderPage();
    await screen.findByText(/Tu acceso de prueba está activo/);
    const links = ['https://www.tiktok.com/@creator/video/123', 'https://www.instagram.com/reel/abc/', 'https://www.youtube.com/shorts/xyz'];
    links.forEach((value, i) => fireEvent.change(screen.getByLabelText(`Video publicado ${i + 1}`), { target: { value } }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.submit(screen.getByRole('button', { name: 'Enviar para activar acceso vitalicio' }).closest('form')!);
    await waitFor(() => expect(mock.rpc).toHaveBeenCalledWith('submit_creator_lifetime_application', expect.objectContaining({ p_video_urls: links, p_ad_permission: true })));
    expect(await screen.findByText('Estamos revisando tus tres videos')).toBeVisible();
    expect(screen.getByText(/Tu acceso de prueba está activo/)).toBeVisible();
  });
  it('shows a lifetime approval as usable access, without purchase or code redemption gates', async () => {
    mock.application = { status: 'active', access_kind: 'lifetime', approved_at: '2026-10-12T00:00:00Z', subscription_ends_at: null, video_urls: [] };
    renderPage();
    expect(await screen.findByRole('link', { name: 'Usar TokXray' })).toHaveAttribute('href', '/app');
    expect(screen.queryByRole('button', { name: 'Enviar para activar acceso vitalicio' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver mi código y comisiones' })).toHaveAttribute('href', '/affiliates');
  });
});
