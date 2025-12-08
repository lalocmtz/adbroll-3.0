-- Add Stripe Connect columns to affiliates table
ALTER TABLE public.affiliates 
ADD COLUMN IF NOT EXISTS stripe_connect_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_payout_at TIMESTAMP WITH TIME ZONE;

-- Create withdrawal_history table
CREATE TABLE IF NOT EXISTS public.withdrawal_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  stripe_transfer_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on withdrawal_history
ALTER TABLE public.withdrawal_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for withdrawal_history
CREATE POLICY "Users can view own withdrawal history"
ON public.withdrawal_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.affiliates 
    WHERE affiliates.id = withdrawal_history.affiliate_id 
    AND affiliates.user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage withdrawals"
ON public.withdrawal_history
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_affiliates_stripe_connect ON public.affiliates(stripe_connect_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_history_affiliate ON public.withdrawal_history(affiliate_id);