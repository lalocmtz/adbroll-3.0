import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SalesCase, estimateCaseCommission } from '@/components/landing/SalesCase';
import { CreatorScenarios, ProductTour } from '@/components/landing/ProductTour';

const video = { creator_handle: 'emiliocampos244', creator_name: null, revenue_mxn: 727040, snapshot_date_range: null, product_name: 'Consola de videojuegos', title: null, product: { commission: 5 } };

describe('landing sales evidence', () => {
  it('derives the estimate from the selected report, not from views or a hardcoded earning', () => {
    expect(estimateCaseCommission(727040, 5)).toBe(36352);
    expect(estimateCaseCommission(625411, 4)).toBeCloseTo(25016.44);
    const { rerender } = render(<SalesCase video={video} onExplore={() => {}} />);
    expect(screen.getByText(/≈ \$36,352/)).toBeInTheDocument();
    expect(screen.getByText(/no es un pago confirmado al creador/)).toBeInTheDocument();
    rerender(<SalesCase video={{ ...video, revenue_mxn: 1000, product: { commission: 10 } }} onExplore={() => {}} />);
    expect(screen.getByText(/≈ \$100/)).toBeInTheDocument();
    expect(screen.queryByText(/≈ \$36,352/)).not.toBeInTheDocument();
  });
  it.each([null, undefined, NaN, Infinity, -1, 101])('does not invent income for unavailable or invalid commission %s', rate => {
    expect(estimateCaseCommission(1000, rate)).toBeNull();
  });
  it('preserves a real zero rate and hides estimates when the rate is absent', () => {
    expect(estimateCaseCommission(1000, 0)).toBe(0);
    render(<SalesCase video={{ ...video, product: null }} onExplore={() => {}} />);
    expect(screen.getByText('Sin dato')).toBeInTheDocument();
    expect(screen.queryByText(/≈/)).not.toBeInTheDocument();
  });
  it('does not substitute fictitious evidence when live data is unavailable', () => {
    const { container } = render(<SalesCase onExplore={() => {}} />);
    expect(container).toBeEmptyDOMElement();
    expect(estimateCaseCommission(NaN, 5)).toBeNull();
  });
});

describe('product demonstration funnel', () => {
  it('sends each demonstration to exploration without a checkout side effect', () => {
    const explore = vi.fn();
    render(<ProductTour onExplore={explore} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver qué está vendiendo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Explorar videos y guiones' }));
    fireEvent.click(screen.getByRole('button', { name: 'Encontrar una oportunidad' }));
    expect(explore.mock.calls).toEqual([['tour_videos'], ['tour_scripts'], ['tour_opportunities']]);
  });
  it('labels illustrative stories visibly and does not impersonate customer reviews', () => {
    render(<CreatorScenarios onExplore={() => {}} />);
    expect(screen.getByText('Situaciones ilustrativas. No son testimonios ni resultados de clientes.')).toBeInTheDocument();
    expect(screen.getAllByText(/Escenario ilustrativo/)).toHaveLength(3);
  });
});
