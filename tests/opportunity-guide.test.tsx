import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OpportunityGuide } from '@/pages/Opportunities';

describe('opportunity score explanation', () => {
  it('explains the actual SQL weights and report limitations without promising outcomes', () => {
    const { container } = render(<OpportunityGuide language="es" />);
    expect(screen.getByText('Encuentra qué producto vale la pena explorar')).toBeVisible();
    const details = container.querySelector('details')!;
    details.open = true;
    expect(details).toHaveTextContent('30%Ventas reportadas');
    expect(details).toHaveTextContent('25%Menos creadores');
    expect(details).toHaveTextContent('20%Impulso de ventas');
    expect(details).toHaveTextContent('15%Comisión por venta');
    expect(details).toHaveTextContent('10%Retorno publicitario');
    expect(details).toHaveTextContent('no equivalen siempre a los últimos 30 días');
    expect(details).toHaveTextContent('Los datos faltantes pueden contar como cero');
    expect(details).toHaveTextContent('no una probabilidad de éxito');
  });
  it('provides the same explanation in English', () => {
    render(<OpportunityGuide language="en" />);
    expect(screen.getByText('Find a product worth exploring')).toBeVisible();
    expect(screen.getByText(/not a success probability or sales forecast/)).toBeInTheDocument();
  });
});
