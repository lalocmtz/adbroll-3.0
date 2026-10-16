import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Login from '@/pages/Login';

const mocks = vi.hoisted(() => ({ signIn: vi.fn(), toast: vi.fn() }));
vi.mock('@/contexts/BlurGateContext', () => ({ useBlurGateContext: () => ({ isLoggedIn: false, isFounder: false }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'es' }) }));
vi.mock('@/components/MarketSwitcher', () => ({ default: () => <span>TikTok Shop México</span> }));
vi.mock('@/components/DashboardFooter', () => ({ default: () => null }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: {
  getUser: async () => ({ data: { user: null } }), signInWithPassword: mocks.signIn,
} } }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() } as any);
});

describe('mobile navigation and login', () => {
  it('keeps closed navigation out of the accessibility tree and closes it on Escape', async () => {
    render(<MemoryRouter><DashboardLayout><h1>Catálogo</h1></DashboardLayout></MemoryRouter>);
    expect(screen.queryByRole('link', { name: 'Productos' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    const menu = await screen.findByRole('dialog', { name: 'Menú de TokXray' });
    expect(screen.getByRole('link', { name: 'Gana recomendando' })).toBeVisible();
    fireEvent.keyDown(menu, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByRole('link', { name: 'Productos' })).not.toBeInTheDocument();
  });

  it('keeps sign-in failure actionable without exposing server details or changing the account', async () => {
    mocks.signIn.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    render(<MemoryRouter><Login /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'creator@example.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'TestPassword1!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Si creaste tu cuenta con Google');
    expect(screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' })).toHaveAttribute('href', '/recuperar-cuenta');
    expect(mocks.signIn).toHaveBeenCalledTimes(1);
  });
});
