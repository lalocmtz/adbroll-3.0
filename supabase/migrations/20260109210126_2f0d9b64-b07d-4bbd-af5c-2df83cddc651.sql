-- Add plan_tier to profiles for Pro/Premium differentiation
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'free' 
CHECK (plan_tier IN ('free', 'pro', 'premium'));

-- Update video_credits table with monthly vs purchased credits tracking
ALTER TABLE public.video_credits 
ADD COLUMN IF NOT EXISTS credits_monthly INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS credits_purchased INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_monthly_reset TIMESTAMPTZ;

-- Create credit_purchases table to track pack purchases
CREATE TABLE IF NOT EXISTS public.credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  stripe_session_id TEXT,
  pack_type TEXT NOT NULL CHECK (pack_type IN ('pack_3', 'pack_10')),
  credits_purchased INTEGER NOT NULL,
  amount_usd DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on credit_purchases
ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own purchases
CREATE POLICY "Users can view own credit purchases" 
ON public.credit_purchases 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy for service role to insert purchases (via webhook)
CREATE POLICY "Service role can insert credit purchases" 
ON public.credit_purchases 
FOR INSERT 
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_credit_purchases_user_id ON public.credit_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_plan_tier ON public.profiles(plan_tier);