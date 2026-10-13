import { MONTHLY_PRICE_USD, estimateMxn } from '@/lib/pricing';
export function SubscriptionPrice({ compact = false }: { compact?: boolean; firstMonth?: boolean }) {
  return <div className="space-y-1">
    <p><strong className={compact ? 'text-2xl tracking-tight' : 'text-3xl font-bold tracking-tight'}>US${MONTHLY_PRICE_USD}</strong><span className="ml-1.5 text-sm text-muted-foreground">/ mes</span></p>
    <p className="text-sm text-muted-foreground">≈ ${estimateMxn(MONTHLY_PRICE_USD)} MXN / mes</p>
    <p className="text-xs text-muted-foreground">El mismo precio desde el primer mes, con o sin código.</p>
  </div>;
}
export function CurrencyDisclosure() {
  return <p className="text-[11px] leading-relaxed text-muted-foreground">Cobro en USD. Equivalente ilustrativo a $18 MXN/USD; tu banco determina el tipo de cambio y el importe en pesos. Revisa el total antes de confirmar en Stripe.</p>;
}
