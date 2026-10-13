import { describe, expect, it } from "vitest";
import { affiliateCommissionCents, commissionBaseCents, normalizeReferralCode, stripeSubscriptionStatus, validateMonthlyPrice, canRetryPayout, validateReferralCoupon } from "../supabase/functions/_shared/billing";
describe("affiliate billing contract", () => {
  it("bases commission on actual discounted cash collected, excluding taxes", () => {
    expect(commissionBaseCents({currency:"usd",amount_paid:1450,total_tax_amounts:[{amount:200}]})).toBe(1250);
    expect(Math.round(commissionBaseCents({currency:"usd",amount_paid:1250}) * .3)).toBe(375);
    expect(Math.round(commissionBaseCents({currency:"usd",amount_paid:2500}) * .3)).toBe(750);
  });
  it("never credits an unpaid invoice or mixes currencies", () => {
    expect(commissionBaseCents({currency:"usd",amount_paid:0})).toBe(0);
    expect(()=>commissionBaseCents({currency:"mxn",amount_paid:2500})).toThrow();
  });
  it("does not grant access for incomplete or paused subscriptions", () => {
    for (const status of ['incomplete','incomplete_expired','paused','unpaid','canceled']) expect(stripeSubscriptionStatus(status)).toBe('cancelled');
    expect(stripeSubscriptionStatus('trialing')).toBe('trialing');
  });
  it("validates referral codes before use in billing", () => {
    expect(normalizeReferralCode(' alicia ')).toBe('ALICIA');
    expect(normalizeReferralCode('<script>')).toBeNull();
    expect(normalizeReferralCode({})).toBeNull();
  });
});

describe("published monthly price", () => {
  const price = { active: true, currency: "usd", unit_amount: 2900, recurring: { interval: "month", interval_count: 1 } };
  it("accepts exactly 29 USD monthly", () => expect(() => validateMonthlyPrice(price)).not.toThrow());
  it("rejects stale prices and different billing periods", () => {
    for (const invalid of [{ ...price, unit_amount:2499 },{ ...price,currency:"mxn" },{ ...price,active:false },{ ...price,recurring:{ interval:"year", interval_count:1 } }]) expect(() => validateMonthlyPrice(invalid)).toThrow();
  });
});

describe("ambiguous payout retries", () => {
  it("allows recent reservations but holds old or invalid ones for reconciliation", () => {
    const now=Date.parse("2026-09-19T12:00:00Z");
    expect(canRetryPayout("2026-09-19T11:00:00Z",now)).toBe(true);
    expect(canRetryPayout("2026-09-18T12:00:00Z",now)).toBe(false);
    expect(canRetryPayout("invalid",now)).toBe(false);
  });
});

describe("new customer referral policy", () => {
  it("pays ten dollars once and 15 percent of renewals", () => {
    expect(affiliateCommissionCents(commissionBaseCents({ currency: "usd", amount_paid: 2900 }), true)).toBe(1000);
    expect(affiliateCommissionCents(commissionBaseCents({ currency: "usd", amount_paid: 2900 }), false)).toBe(435);
  });
  it("rejects repeating or mismatched coupons", () => {
    const coupon = { valid: true, percent_off: null, amount_off: 1400, currency: "usd", duration: "once" };
    expect(() => validateReferralCoupon(coupon, "pro")).not.toThrow();
    for (const invalid of [{ ...coupon, duration: "forever" }, { ...coupon, valid: false }, { ...coupon, percent_off: 50 }, { ...coupon, amount_off: 1500 }, { ...coupon, currency: "mxn" }, { ...coupon, applies_to: { products: ["other"] } }]) expect(() => validateReferralCoupon(invalid, "pro")).toThrow();
  });
});

it("caps the initial reward at actual net cash and at ten dollars",()=>{
 expect(affiliateCommissionCents(1000,true)).toBe(1000);
 expect(affiliateCommissionCents(500,true)).toBe(500);
 expect(affiliateCommissionCents(2900,true)).toBe(1000);
 expect(affiliateCommissionCents(0,true)).toBe(0);
 expect(affiliateCommissionCents(1500,false)).toBe(225);
});
