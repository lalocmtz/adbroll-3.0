import { MONTHLY_PRICE_USD, estimateMxn } from '@/lib/pricing';
export function SubscriptionPrice({ compact = false }: { compact?: boolean; firstMonth?: boolean }) {
  return <div className="space-y-1">
    <p><strong className={compact ? 'text-2xl tracking-tight' : 'text-3xl font-bold tracking-tight'}>US${MONTHLY_PRICE_USD}</strong><span className="ml-1.5 text-sm text-muted-foreground">/ mes</span></p>
    <p className="text-sm text-muted-foreground">≈ ${estimateMxn(MONTHLY_PRICE_USD)} MXN / mes</p>
    <p className="text-xs text-muted-foreground">US$29 desde el primer mes. El código de creador no cambia el precio.</p>
  </div>;
}
export function CurrencyDisclosure() {
  return <p className="text-[11px] leading-relaxed text-muted-foreground">El cobro es en dólares (USD). La referencia en pesos usa $18 MXN por dólar; el tipo de cambio y el importe final dependen de tu banco. Revisa el total en Stripe antes de confirmar.</p>;
}
