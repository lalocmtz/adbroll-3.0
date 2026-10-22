import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SubscriptionPrice, CurrencyDisclosure } from '@/components/SubscriptionPrice';
import { emailTemplates } from '@/lib/email';
import { MONTHLY_PRICE_USD, INITIAL_AFFILIATE_REWARD_USD, DIRECT_RENEWAL_COMMISSION_USD, LEADER_RENEWAL_COMMISSION_USD } from '@/lib/pricing';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

describe('current subscription offer and historical billing copy', () => {
  it('shows US$15 and illustrative MXN$270 even on the legacy first-month presentation path', () => {
    render(<><SubscriptionPrice firstMonth /><CurrencyDisclosure /></>);
    expect(screen.getByText('US$15')).toBeVisible();
    expect(screen.getByText('≈ $270 MXN / mes')).toBeVisible();
    expect(screen.getByText(/El código de creador no cambia el precio/)).toBeVisible();
    expect(screen.getByText(/importe final dependen de tu banco/)).toBeVisible();
    expect(screen.queryByText(/US\$29|522 MXN/)).not.toBeInTheDocument();
  });
  it('uses the current offer for new-customer commission examples', () => {
    expect([MONTHLY_PRICE_USD, INITIAL_AFFILIATE_REWARD_USD, DIRECT_RENEWAL_COMMISSION_USD, LEADER_RENEWAL_COMMISSION_USD]).toEqual([15, 5, 2.25, 0.75]);
  });
  it('preserves the actual price supplied for old subscription receipts and renewals', () => {
    expect(emailTemplates.subscriptionConfirmed('creator@example.com', 'US$29').html).toContain('US$29/mes');
    expect(emailTemplates.renewalReminder('2026-11-14', 'US$29').html).toContain('US$29/mes');
    expect(emailTemplates.subscriptionConfirmed('new@example.com', 'US$15').html).toContain('US$15/mes');
  });
});
