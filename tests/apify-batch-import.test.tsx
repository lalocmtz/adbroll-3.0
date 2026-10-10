import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ApifyBatchImport from '@/components/admin/ApifyBatchImport';
const mock = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: mock.invoke } } }));
const id = 'oyd4q7HpSifnSUHYD';
beforeEach(() => { mock.invoke.mockReset(); localStorage.clear(); });
async function start() {
  render(<ApifyBatchImport />);
  fireEvent.change(screen.getByLabelText('ID de ejecución de Apify'), { target: { value: id } });
  fireEvent.click(screen.getByRole('button', { name: 'Importar / reanudar lote' }));
}
describe('resumable Apify batch publishing', () => {
  it('continues pages, reports skipped media and saves the next offset', async () => {
    mock.invoke.mockResolvedValueOnce({ data: { total: 4, nextOffset: 3, results: [{ id: '1', status: 'imported' }, { id: '2', status: 'unavailable' }, { id: '3', status: 'already_available' }] } })
      .mockResolvedValueOnce({ data: { total: 4, nextOffset: 4, complete: true, results: [{ id: '4', status: 'imported' }] } });
    await start();
    await screen.findByText(/Lote terminado/);
    expect(mock.invoke.mock.calls.map(([, args]) => args.body.offset)).toEqual([0, 3]);
    expect(localStorage.getItem(`tokxray-apify-offset-${id}`)).toBe('4');
    expect(screen.getByText(/Nuevos: 2/)).toHaveTextContent('No disponibles: 1');
  });
  it('stops on a transient failure and retries the same page without losing completed work', async () => {
    localStorage.setItem(`tokxray-apify-offset-${id}`, '3');
    mock.invoke.mockResolvedValueOnce({ data: { total: 6, nextOffset: 3, retry: true, results: [{ id: '4', status: 'retry' }] } });
    await start();
    await screen.findByText(/Algunos archivos no se pudieron transferir/);
    expect(mock.invoke).toHaveBeenCalledTimes(1);
    expect(mock.invoke.mock.calls[0][1].body.offset).toBe(3);
    expect(localStorage.getItem(`tokxray-apify-offset-${id}`)).toBe('3');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Importar / reanudar lote' })).toBeEnabled());
  });
});
