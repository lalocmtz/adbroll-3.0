import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminOperationsOverview } from '@/components/admin/AdminOperationsOverview';
const rpc = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));
const empty = {
  asOf: '2026-10-16T18:00:00Z', storage: { databaseBytes: 4000000, fileBytes: 0, unknownSizes: 0, buckets: [] },
  users: { registered: 0, email_confirmed: 0, paid_active: 0, complimentary_active: 0, affiliate_codes: 0, active_affiliates: 0 },
  ai: { balanceUsd: null, unmeteredAnalyses: 0, models: [] },
  queue: { remaining: 0, failed: 0, retrying: 0, completed_last_hour: 0, expired_leases: 0 },
  downloads: {failed:0,unknown:0,rejected:0,billingBlocked:0,latestFailureAt:null},
  settings: { enabled: true, dailyLimit: 200, concurrency: 2 }, attemptsToday: 0,
};
beforeEach(() => { rpc.mockReset(); rpc.mockResolvedValue({ data: empty, error: null }); });
describe('founder operations overview', () => {
  it('shows actual zeros without inventing a provider balance or cost', async () => {
    render(<AdminOperationsOverview />);
    expect(await screen.findByText('Saldo no conectado')).toBeVisible();
    expect(screen.getByText('Sin estimación disponible')).toBeVisible();
    expect(screen.getByText('No quedan videos en la cola activa.')).toBeVisible();
    expect(screen.getByRole('link', {name: /Consultar saldo/})).toHaveAttribute('href','https://aistudio.google.com/usage');
    expect(rpc.mock.calls).toEqual([['get_operations_overview']]);
  });
  it('uses measured model costs and observed throughput with caps and failures visible', async () => {
    rpc.mockResolvedValue({ data: { ...empty, attemptsToday: 200,
      downloads: {failed:0,unknown:1,rejected:1,billingBlocked:1,latestFailureAt:null},
      queue: { remaining: 60, failed: 2, retrying: 1, completed_last_hour: 30, expired_leases: 0 },
      ai: { balanceUsd: null, unmeteredAnalyses: 3, models: [{model:'gemini-3.5-flash-lite',analyses:4,metered_analyses:1,input_tokens:10000,output_tokens:2000,estimated_usd:0.008}] },
    }, error: null });
    render(<AdminOperationsOverview />);
    expect(await screen.findByText('US$0.0080')).toBeVisible();
    expect(screen.getByText(/aproximadamente 2.0 horas/)).toBeVisible();
    expect(screen.getByText(/Se alcanzó el límite diario/)).toBeVisible();
    expect(screen.getByText(/2 videos requieren revisión/)).toBeVisible();
    expect(screen.getByText(/descargas bloqueadas por saldo/)).toBeVisible();
    expect(screen.getByText(/Excluye variantes, fallos, reintentos/)).toBeVisible();
  });
  it.each([{data:null,error:{message:'Founder access required'}},{data:{},error:null}])('does not turn denied or malformed data into zero metrics', async response => {
    rpc.mockResolvedValueOnce(response);
    render(<AdminOperationsOverview />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo consultar');
    expect(screen.queryByText('Suscriptores de pago activos')).not.toBeInTheDocument();
  });
  it('shows future attempts separately from historical cached estimates, without adding them', async () => {
    rpc.mockResolvedValueOnce({data:{...empty,providerUsage:{since:empty.asOf,latestAt:empty.asOf,attempts:2,failed:1,unpricedAttempts:1,estimatedUsd:0.008,models:[]},ai:{balanceUsd:null,unmeteredAnalyses:0,models:[{model:'gemini-3.5-flash-lite',analyses:1,metered_analyses:1,input_tokens:10000,output_tokens:2000,estimated_usd:0.007}]}},error:null});
    render(<AdminOperationsOverview />);
    expect(await screen.findByText('US$0.0080')).toBeVisible();
    expect(screen.getByText('US$0.0070')).toBeVisible();
    expect(screen.queryByText('US$0.0150')).not.toBeInTheDocument();
    expect(screen.getByText(/2 intentos registrados/)).toBeVisible();
    expect(screen.getByText(/Un fallo sin tokens tiene costo desconocido/)).toBeVisible();
  });
  it('keeps the last successful snapshot clearly marked after a failed refresh', async () => {
    render(<AdminOperationsOverview />);
    await screen.findByText('Saldo no conectado');
    rpc.mockRejectedValueOnce(new Error('offline'));
    await act(async () => fireEvent.click(screen.getByRole('button',{name:'Actualizar resumen'})));
    expect(screen.getByRole('alert')).toHaveTextContent('última consulta correcta');
    expect(screen.getByText('Sin estimación disponible')).toBeVisible();
  });
});
