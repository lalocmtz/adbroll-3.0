import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScriptTranslation } from '@/components/ScriptTranslation';
const invoke = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));
const original = 'Mira cómo uso este producto.';
async function click(label: string) { await act(async () => { fireEvent.click(screen.getByRole('button', { name: label })); }); }
beforeEach(() => {
  invoke.mockReset();
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
});
describe('separate script translation', () => {
  it('only translates on request, preserves the source, copies translation and reuses an already translated language', async () => {
    invoke.mockResolvedValue({ data: { translation: 'Watch how I use this product.' }, error: null });
    render(<><p>{original}</p><ScriptTranslation text={original} /></>);
    expect(invoke).not.toHaveBeenCalled();
    await click('Traducir al inglés');
    expect(invoke).toHaveBeenCalledWith('translate-script', { body: { text: original, targetLanguage: 'en' } });
    expect(screen.getByText(original)).toBeInTheDocument();
    expect(screen.getByText('Watch how I use this product.')).toBeInTheDocument();
    await click('Copiar traducción');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Watch how I use this product.');
    await click('Volver al original');
    expect(screen.queryByText('Watch how I use this product.')).not.toBeInTheDocument();
    await click('Traducir al inglés');
    expect(invoke).toHaveBeenCalledOnce();
  });
  it('shows the provider error persistently and retries the selected Spanish target', async () => {
    invoke.mockResolvedValueOnce({ error: { context: { json: async () => ({ error: 'Límite diario alcanzado.' }) } }, data: null })
      .mockResolvedValueOnce({ error: null, data: { translation: 'Mira este producto.' } });
    render(<ScriptTranslation text="Watch this product." />);
    await click('Traducir al español');
    expect(screen.getByRole('alert')).toHaveTextContent('Límite diario alcanzado.');
    await click('Reintentar traducción');
    expect(invoke.mock.calls[1][1].body.targetLanguage).toBe('es');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Mira este producto.')).toBeInTheDocument();
  });
  it.each(['', ' '.repeat(4), 'a'.repeat(30001)])('validates input before calling the paid service', async text => {
    render(<ScriptTranslation text={text} />);
    await click('Traducir al inglés');
    expect(screen.getByRole('alert')).toHaveTextContent('entre 1 y 30,000 caracteres');
    expect(invoke).not.toHaveBeenCalled();
  });
  it('discards pending translations when source text changes', async () => {
    let finish!: (value: unknown) => void;
    invoke.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const view = render(<ScriptTranslation text={original} />);
    await click('Traducir al inglés');
    expect(screen.getByRole('status')).toHaveTextContent('Traduciendo');
    expect(screen.getByRole('button', { name: 'Traducir al español' })).toBeDisabled();
    await act(async () => { view.rerender(<ScriptTranslation text="Otro guion nuevo." />); });
    await act(async () => { finish({ data: { translation: 'Outdated translation' }, error: null }); });
    expect(screen.queryByText('Outdated translation')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Traducir al inglés' })).toBeEnabled();
  });
  it('can return to original while pending without restoring a late translation', async () => {
    let finish!: (value: unknown) => void;
    invoke.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    render(<ScriptTranslation text={original} />);
    await click('Traducir al inglés'); await click('Volver al original');
    await act(async () => { finish({ data: { translation: 'Late translation' }, error: null }); });
    expect(screen.queryByText('Late translation')).not.toBeInTheDocument();
  });
  it('rejects an empty successful response', async () => {
    invoke.mockResolvedValue({ data: { translation: '  ' }, error: null });
    render(<ScriptTranslation text={original} />);
    await click('Traducir al inglés');
    expect(screen.getByRole('alert')).toHaveTextContent('La traducción llegó vacía');
  });
});
