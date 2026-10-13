import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CreatorProgram from '@/pages/CreatorProgram';
const mock = vi.hoisted(() => ({ rpc: vi.fn(), user: null as any, application: null as any, capacity: { limit: 100, claimed: 0, remaining: 100, is_open: true }, toast: vi.fn() }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mock.toast }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: mock.user } }) }, rpc: mock.rpc,
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: mock.application }) }) }) }),
} }));
const verified = { email: 'creator@example.com', email_confirmed_at: '2026-10-12T00:00:00Z', user_metadata: { full_name: 'Creator Name' } };
const renderPage = () => render(<MemoryRouter><CreatorProgram /></MemoryRouter>);
beforeEach(() => {
  mock.user = verified; mock.application = null; mock.rpc.mockReset(); mock.toast.mockReset();
  mock.capacity = { limit: 100, claimed: 0, remaining: 100, is_open: true };
  mock.rpc.mockImplementation(async (name: string) => name === 'get_creator_lifetime_capacity' ? { data: mock.capacity, error: null } : { data: {}, error: null });
});

describe('creator program user flow', () => {
  it('routes new/unconfirmed users through account verification without requesting payment', async () => {
    mock.user = { ...verified, email_confirmed_at: null };
    renderPage();
    expect(await screen.findByRole('link', { name: 'Crear mi cuenta gratis' })).toHaveAttribute('href', '/register?redirect=%2Fcolaboraciones');
    expect(screen.queryByRole('button', { name: 'Enviar para activar acceso vitalicio' })).not.toBeInTheDocument();
    expect(mock.rpc).not.toHaveBeenCalledWith('submit_creator_lifetime_application', expect.anything());
  });
  it('lets an invited creator submit 3 videos while retaining an active finite preview', async () => {
    mock.application = { status: 'active', access_kind: 'limited', approved_at: '2026-10-12T00:00:00Z', subscription_ends_at: '2099-10-20T00:00:00Z', email: verified.email, full_name: 'Creator Name', whatsapp: '2213267653', tiktok_url: 'https://www.tiktok.com/@creator', video_urls: [] };
    mock.rpc.mockImplementation(async (name: string) => {
      if (name === 'get_creator_lifetime_capacity') return { data: mock.capacity, error: null };
      mock.application = { ...mock.application, status: 'pending_review' }; return { data: { status: 'pending_review' } };
    });
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
    mock.capacity = { limit: 100, claimed: 100, remaining: 0, is_open: false };
    renderPage();
    expect(await screen.findByRole('link', { name: 'Usar TokXray' })).toHaveAttribute('href', '/app');
    expect(screen.queryByRole('button', { name: 'Enviar para activar acceso vitalicio' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver mi código y comisiones' })).toHaveAttribute('href', '/affiliates');
  });
  it('does not invite guests to create videos or request a trial after the offer closes', async () => {
    mock.user = null;
    mock.capacity = { limit: 100, claimed: 100, remaining: 0, is_open: false };
    renderPage();
    expect(await screen.findByRole('link', { name: 'Entrar con mi cuenta existente' })).toHaveAttribute('href', '/login?redirect=%2Fcolaboraciones');
    expect(screen.queryByRole('link', { name: 'Crear mi cuenta gratis' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Conocer el programa de afiliados' })).toHaveAttribute('href', '/programa-creadores');
    expect(screen.getByText(/No grabes videos para solicitar este beneficio/)).toBeVisible();
  });
  it('closes new applications at zero while preserving the creator account' , async () => {
    mock.capacity = { limit: 100, claimed: 100, remaining: 0, is_open: false };
    renderPage();
    expect(await screen.findByText('Cupo vitalicio agotado')).toBeVisible();
    expect(screen.queryByLabelText('Video publicado 1')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar para activar acceso vitalicio' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver mi código y comisiones' })).toBeVisible();
  });
  it('keeps a pending application visible without implying it reserved a place', async () => {
    mock.application = { status: 'pending_review', access_kind: 'limited', email: verified.email, video_urls: [] };
    mock.capacity = { limit: 100, claimed: 100, remaining: 0, is_open: false };
    renderPage();
    expect(await screen.findByText('Estamos revisando tus tres videos')).toBeVisible();
    expect(screen.getByText(/esta solicitud no reserva lugar/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Actualizar estado' })).toBeEnabled();
  });
  it('blocks sending when availability cannot be verified, then enables after retry', async () => {
    mock.rpc.mockResolvedValueOnce({ data: null, error: { message: 'offline' } });
    renderPage();
    const submit = await screen.findByRole('button', { name: 'Enviar para activar acceso vitalicio' });
    expect(submit).toBeDisabled();
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos verificar');
    fireEvent.submit(submit.closest('form')!);
    expect(mock.rpc).not.toHaveBeenCalledWith('submit_creator_lifetime_application', expect.anything());
    await waitFor(() => expect(submit).toBeEnabled());
  });
  it('refreshes capacity after a failed submission when the last place was just claimed', async () => {
    mock.capacity = { limit: 100, claimed: 99, remaining: 1, is_open: true };
    mock.rpc.mockImplementation(async (name: string) => {
      if (name === 'get_creator_lifetime_capacity') return { data: mock.capacity, error: null };
      mock.capacity = { limit: 100, claimed: 100, remaining: 0, is_open: false };
      return { data: null, error: { message: 'Cupo agotado' } };
    });
    renderPage();
    await screen.findByText('Queda 1 de 100 accesos vitalicios');
    await screen.findByLabelText('Video publicado 1');
    const links = ['https://www.tiktok.com/@creator/video/123', 'https://www.instagram.com/reel/abc/', 'https://www.youtube.com/shorts/xyz'];
    links.forEach((value, i) => fireEvent.change(screen.getByLabelText(`Video publicado ${i + 1}`), { target: { value } }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.submit(screen.getByRole('button', { name: 'Enviar para activar acceso vitalicio' }).closest('form')!);
    expect(await screen.findByText('Cupo vitalicio agotado')).toBeVisible();
    expect(mock.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'No se pudo enviar', description: 'Cupo agotado' }));
  });

});
