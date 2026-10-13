export const MONTHLY_PRICE_CENTS = 2900;
export const AFFILIATE_RATE = 0.15;

export function normalizeReferralCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z0-9]{4,32}$/.test(code) ? code : null;
}

export function commissionBaseCents(invoice: { currency: string; amount_paid: number; tax?: number | null; total_tax_amounts?: { amount: number }[] }): number {
  if (invoice.currency.toLowerCase() !== "usd") throw new Error("Unsupported commission currency");
  const taxes = invoice.total_tax_amounts?.reduce((sum, item) => sum + item.amount, 0) ?? invoice.tax ?? 0;
  return Math.max(0, Math.round(invoice.amount_paid - taxes));
}

export function stripeSubscriptionStatus(status: string): string {
  // Never grant access for incomplete, expired, paused or unpaid subscriptions.
  if (["active", "trialing", "past_due"].includes(status)) return status;
  return "cancelled";
}

export function validateMonthlyPrice(price: { active: boolean; currency: string; unit_amount: number | null; recurring?: { interval: string; interval_count: number } | null }): void {
  if (!price.active || price.currency !== "usd" || price.unit_amount !== MONTHLY_PRICE_CENTS || price.recurring?.interval !== "month" || price.recurring.interval_count !== 1) {
    throw new Error("Configure an active recurring price of 29 USD per month");
  }
}

export function canRetryPayout(createdAt: string, nowMs = Date.now()): boolean {
  const age = nowMs - Date.parse(createdAt);
  return Number.isFinite(age) && age >= 0 && age < 20 * 60 * 60 * 1000;
}

export function validateReferralCoupon(coupon: { valid: boolean; percent_off: number | null; amount_off?: number | null; currency?: string | null; duration: string; applies_to?: { products: string[] } }, productId: string): void {
  if (!coupon.valid || coupon.percent_off !== null || coupon.amount_off !== 1400 || coupon.currency !== "usd" || coupon.duration !== "once" ||
      (coupon.applies_to && !coupon.applies_to.products.includes(productId))) {
    throw new Error("Configure a valid 14 USD first-invoice coupon for TokXray Pro");
  }
}

export const BILLING_POLICY = "2026-10-13";
export const PREVIOUS_BILLING_POLICY = "2026-10-10";

// A subscription keeps the policy captured at checkout, even after a new launch.
export function commissionRecorder(policy?: string): string {
  if (policy === BILLING_POLICY) return "record_affiliate_commission_v3";
  if (policy === PREVIOUS_BILLING_POLICY) return "record_affiliate_commission_v2";
  if (!policy) return "record_affiliate_commission";
  throw new Error(`Unsupported billing policy: ${policy}`);
}

export function policyMonthlyPrice(policy?: string): number {
  return policy === BILLING_POLICY || policy === PREVIOUS_BILLING_POLICY ? 29 : 30;
}

export function invoiceCommissionType(reason: string | null, firstPurchase: string | undefined, policy?: string): "initial" | "recurring" | "reactivation" | null {
  if (reason === "subscription_cycle") return "recurring";
  if (reason !== "subscription_create") return null;
  if (firstPurchase !== "false") return "initial";
  return policy === BILLING_POLICY ? "reactivation" : "recurring";
}
export function affiliateCommissionCents(baseCents: number, initial: boolean): number {
  return initial ? Math.min(1000, Math.max(0, baseCents)) : Math.round(Math.max(0, baseCents) * AFFILIATE_RATE);
}
