import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CreatorLifetimeCapacity } from '@/components/creators/CreatorLifetimeCapacity';
import { useCreatorLifetimeCapacity, type CreatorLifetimeCapacityState } from '@/hooks/useCreatorLifetimeCapacity';

const mock = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mock.rpc } }));
const availability = (remaining: number) => ({ limit: 100, claimed: 100 - remaining, remaining, is_open: remaining > 0 });
const state = (remaining: number): CreatorLifetimeCapacityState => ({ capacity: availability(remaining), loading: false, error: null, refresh: vi.fn(async () => {}) });
beforeEach(() => { mock.rpc.mockReset(); mock.rpc.mockResolvedValue({ data: availability(100), error: null }); });
afterEach(() => { vi.useRealTimers(); });

describe('honest creator capacity display', () => {
  it.each([[100, 'Quedan 100 de 100 accesos vitalicios'], [1, 'Queda 1 de 100 accesos vitalicios'], [0, 'Los 100 accesos vitalicios ya fueron otorgados']])('shows server remaining %s without a deadline', (remaining, label) => {
    render(<CreatorLifetimeCapacity state={state(Number(remaining))} tone="dark" />);
    expect(screen.getByText(String(label))).toBeVisible();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(100 - Number(remaining)));
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it('never fills unknown availability with 100 and exposes retry', () => {
    const refresh = vi.fn(async () => {});
    const { rerender } = render(<CreatorLifetimeCapacity state={{ capacity: null, error: null, loading: true, refresh }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Verificando');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    rerender(<CreatorLifetimeCapacity state={{ capacity: null, error: 'No pudimos verificar', loading: false, refresh }} />);
    expect(screen.queryByText('Quedan 100 de 100 accesos vitalicios')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar disponibilidad' }));
    expect(refresh).toHaveBeenCalledOnce();
  });
});

describe('creator capacity refresh', () => {
  it('fetches immediately, every 30s and on focus, then cleans up', async () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() => useCreatorLifetimeCapacity());
    await act(async () => {});
    expect(result.current.capacity?.remaining).toBe(100);
    expect(mock.rpc).toHaveBeenCalledTimes(1);
    mock.rpc.mockResolvedValue({ data: availability(1), error: null });
    await act(async () => { vi.advanceTimersByTime(30_000); });
    expect(result.current.capacity?.remaining).toBe(1);
    mock.rpc.mockResolvedValue({ data: availability(0), error: null });
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    expect(result.current.capacity?.is_open).toBe(false);
    unmount();
    await act(async () => { vi.advanceTimersByTime(60_000); window.dispatchEvent(new Event('focus')); });
    expect(mock.rpc).toHaveBeenCalledTimes(3);
  });
  it('rejects inconsistent responses and clears stale availability on failure', async () => {
    const { result } = renderHook(() => useCreatorLifetimeCapacity());
    await waitFor(() => expect(result.current.capacity?.remaining).toBe(100));
    mock.rpc.mockResolvedValueOnce({ data: { limit: 100, remaining: 100, claimed: 99, is_open: true }, error: null });
    await act(async () => { await result.current.refresh(); });
    expect(result.current.capacity).toBeNull();
    expect(result.current.error).toContain('No pudimos verificar');
  });
  it('ignores an older in-flight response after a newer result and after unmount', async () => {
    let finish!: (value: unknown) => void;
    mock.rpc.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const { result, unmount } = renderHook(() => useCreatorLifetimeCapacity());
    mock.rpc.mockResolvedValueOnce({ data: availability(1), error: null });
    await act(async () => { await result.current.refresh(); });
    await act(async () => { finish({ data: availability(100), error: null }); });
    expect(result.current.capacity?.remaining).toBe(1);
    mock.rpc.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    let pending!: Promise<void>;
    act(() => { pending = result.current.refresh(); });
    unmount();
    await act(async () => { finish({ data: availability(0), error: null }); await pending; });
  });
});
