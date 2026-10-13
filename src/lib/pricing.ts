/** Customer-facing amounts. Stripe remains authoritative for eligibility and payment. */
export const MONTHLY_PRICE_USD = 29;
export const REFERRAL_FIRST_MONTH_USD = MONTHLY_PRICE_USD;
// An illustrative conversion, deliberately not advertised as a live exchange rate.
export const ILLUSTRATIVE_MXN_PER_USD = 18;
export const estimateMxn = (usd: number) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(usd * ILLUSTRATIVE_MXN_PER_USD);
