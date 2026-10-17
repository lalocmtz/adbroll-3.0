import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminCatalogProcessing } from '@/components/admin/AdminCatalogProcessing';
const rpc = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));
const status = {
  settings: { enabled: true, daily_attempt_limit: 100, max_concurrent: 3 },
  counts: { pending: 12, dispatched: 2, running: 3, ready: 90, failed: 1 },
  attemptsToday: 16, estimatedCostUsd: 0.1234,
  failures: [{ video_id: 'video1', title: 'Mi producto', attempts: 3, last_error_code: 'GEMINI_429_RESOURCE_EXHAUSTED', updated_at: '2026-10-16T18:00:00Z' }],
};
beforeEach(() => { rpc.mockReset(); rpc.mockResolvedValue({ data: status, error: null }); });
describe('founder catalog processing view', () => {
  it('reads status, displays actual counts and cost, and refreshes without mutating queue settings', async () => {
    render(<AdminCatalogProcessing />);
    expect(await screen.findByText('Preparación automática activa')).toBeVisible();
    expect(screen.getByText('90')).toBeVisible();
    expect(screen.getByText('16 / 100')).toBeVisible();
    expect(screen.getByText('$0.1234 USD')).toBeVisible();
    expect(screen.getByText('Mi producto')).toBeVisible();
    expect(screen.getByText('Se alcanzó temporalmente el límite del servicio de análisis.')).toBeVisible();
    expect(screen.queryByText(/Gemini/i)).not.toBeInTheDocument();
    rpc.mockResolvedValueOnce({ data: { ...status, settings: { ...status.settings, enabled: false }, counts: { ...status.counts, ready: 95 } }, error: null });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Actualizar estado' })); });
    expect(screen.getByText('Preparación automática pausada')).toBeVisible();
    expect(screen.getByText('95')).toBeVisible();
    expect(rpc.mock.calls).toEqual([['get_catalog_processing_status'], ['get_catalog_processing_status']]);
  });
  it('handles an empty PostgreSQL aggregate as an empty queue', async () => {
    rpc.mockResolvedValue({ data: { ...status, counts: null, failures: null, attemptsToday: 0, estimatedCostUsd: 0 }, error: null });
    render(<AdminCatalogProcessing />);
    expect(await screen.findByText('No hay fallos registrados en esta consulta.')).toBeVisible();
    expect(screen.getAllByText('0')).toHaveLength(5);
    expect(screen.getByText('$0.00 USD')).toBeVisible();
  });
  it.each([{ data: null, error: { message: 'Founder access required' } }, { data: { counts: {} }, error: null }])('does not present an unavailable response as zero cost or zero pending work', async response => {
    rpc.mockResolvedValueOnce(response);
    render(<AdminCatalogProcessing />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos consultar');
    expect(screen.queryByText(/Costo estimado acumulado/)).not.toBeInTheDocument();
    expect(screen.queryByText('Listos')).not.toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Actualizar estado' })); });
    expect(screen.getByText('90')).toBeVisible();
  });
  it('marks retained numbers as stale when a refresh fails', async () => {
    render(<AdminCatalogProcessing />);
    await screen.findByText('90');
    rpc.mockRejectedValueOnce(new Error('offline'));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Actualizar estado' })); });
    expect(screen.getByRole('alert')).toHaveTextContent('última consulta correcta');
    expect(screen.getByText('90')).toBeVisible();
  });
});
