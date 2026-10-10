import { MONTHLY_PRICE_USD, REFERRAL_FIRST_MONTH_USD, estimateMxn } from '@/lib/pricing';
export function SubscriptionPrice({ compact = false, firstMonth = false }: { compact?: boolean; firstMonth?: boolean }) {
  const price = firstMonth ? REFERRAL_FIRST_MONTH_USD : MONTHLY_PRICE_USD;
  return <div className="space-y-1">
    <p><strong className={compact ? 'text-2xl tracking-tight' : 'text-3xl font-bold tracking-tight'}>US${price}</strong><span className="ml-1.5 text-sm text-muted-foreground">{firstMonth ? 'el primer mes' : '/ mes'}</span></p>
    <p className="text-sm text-muted-foreground">≈ ${estimateMxn(price)} MXN{firstMonth ? ' el primer mes' : ' / mes'}</p>
    {firstMonth && <p className="text-xs text-muted-foreground">Después US$29 / mes (≈ $522 MXN).</p>}
  </div>;
}
export function CurrencyDisclosure() {
  return <p className="text-[11px] leading-relaxed text-muted-foreground">Cobro en USD. Equivalente ilustrativo a $18 MXN/USD; tu banco determina el tipo de cambio y el importe en pesos. Revisa el total antes de confirmar en Stripe.</p>;
}
