/** User-selected codes are short; attribution also accepts existing generated codes. */
export const CUSTOM_AFFILIATE_CODE_PATTERN = /^[A-Z0-9]{3,12}$/;
export const REFERRAL_CODE_PATTERN = /^[A-Z0-9]{3,32}$/;
export const normalizeReferralCode = (code: string) => code.trim().toUpperCase();
export const isReferralCode = (code: string) => REFERRAL_CODE_PATTERN.test(normalizeReferralCode(code));
export const isCustomAffiliateCode = (code: string) => CUSTOM_AFFILIATE_CODE_PATTERN.test(normalizeReferralCode(code));
