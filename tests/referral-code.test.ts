import { describe, expect, it } from 'vitest';
import { isCustomAffiliateCode, isReferralCode, normalizeReferralCode } from '@/lib/referral-code';
import { registerSchema } from '@/lib/validations';

describe('referral code boundaries', () => {
  it('accepts GUS and normalizes lowercase without changing interior characters', () => {
    expect(normalizeReferralCode(' gus ')).toBe('GUS');
    expect(isCustomAffiliateCode('gus')).toBe(true);
    expect(isReferralCode('GUS')).toBe(true);
    expect(isCustomAffiliateCode('A'.repeat(12))).toBe(true);
    expect(isCustomAffiliateCode('A'.repeat(13))).toBe(false);
  });
  it('accepts generated attribution codes up to32 but rejects unsupported formats', () => {
    expect(isReferralCode('A'.repeat(32))).toBe(true);
    for (const code of ['', 'GU', 'A'.repeat(33), 'G-US', 'G US', 'GÚS', '<GUS>']) {
      expect(isReferralCode(code), code).toBe(false);
      expect(isCustomAffiliateCode(code), code).toBe(false);
    }
  });
  it.each(['', 'gus', 'A'.repeat(32)])('allows valid optional code %s through the email signup schema', referralCode => {
    const result = registerSchema.safeParse({ fullName: 'Gustavo', email: 'gus@example.com', password: 'Password1!', referralCode });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.referralCode).toBe(referralCode.toUpperCase());
  });
});
