/** Customer-facing amounts. Stripe remains authoritative for eligibility and payment. */
export const MONTHLY_PRICE_USD = 15;
export const REFERRAL_FIRST_MONTH_USD = MONTHLY_PRICE_USD;
export const INITIAL_AFFILIATE_REWARD_USD = 5;
export const DIRECT_RENEWAL_RATE = 0.15;
export const LEADER_RENEWAL_RATE = 0.05;
export const DIRECT_RENEWAL_COMMISSION_USD = MONTHLY_PRICE_USD * DIRECT_RENEWAL_RATE;
export const LEADER_RENEWAL_COMMISSION_USD = MONTHLY_PRICE_USD * LEADER_RENEWAL_RATE;
// An illustrative conversion, deliberately not advertised as a live exchange rate.
export const ILLUSTRATIVE_MXN_PER_USD = 18;
export const estimateMxn = (usd: number) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(usd * ILLUSTRATIVE_MXN_PER_USD);
