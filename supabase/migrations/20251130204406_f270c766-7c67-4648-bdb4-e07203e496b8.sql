-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('active', 'cancelled', 'past_due', 'unpaid')),
  price_usd numeric NOT NULL DEFAULT 49,
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,
  created_at timestamp with time zone DEFAULT now(),
  renew_at timestamp with time zone,
  UNIQUE(user_id)
);

-- Enable RLS on subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription"
ON public.subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can manage subscriptions (for webhooks)
CREATE POLICY "Service role can manage subscriptions"
ON public.subscriptions
FOR ALL
USING (true)
WITH CHECK (true);

-- Create affiliates table
CREATE TABLE public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ref_code text NOT NULL UNIQUE,
  usd_earned numeric NOT NULL DEFAULT 0,
  usd_available numeric NOT NULL DEFAULT 0,
  usd_withdrawn numeric NOT NULL DEFAULT 0,
  active_referrals_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on affiliates
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

-- Users can view their own affiliate data
CREATE POLICY "Users can view own affiliate data"
ON public.affiliates
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can manage affiliates
CREATE POLICY "Service role can manage affiliates"
ON public.affiliates
FOR ALL
USING (true)
WITH CHECK (true);

-- Create referrals table
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date timestamp with time zone DEFAULT now(),
  status text NOT NULL CHECK (status IN ('pending', 'active', 'cancelled')),
  earned_usd numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can view referrals they're part of (as affiliate)
CREATE POLICY "Affiliates can view their referrals"
ON public.referrals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.affiliates
    WHERE affiliates.id = referrals.affiliate_id
    AND affiliates.user_id = auth.uid()
  )
);

-- Service role can manage referrals
CREATE POLICY "Service role can manage referrals"
ON public.referrals
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_affiliates_user_id ON public.affiliates(user_id);
CREATE INDEX idx_affiliates_ref_code ON public.affiliates(ref_code);
CREATE INDEX idx_referrals_affiliate_id ON public.referrals(affiliate_id);
CREATE INDEX idx_referrals_referred_user_id ON public.referrals(referred_user_id);

-- Function to generate unique ref code
CREATE OR REPLACE FUNCTION generate_ref_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    -- Generate 8 character alphanumeric code
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.affiliates WHERE ref_code = new_code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Trigger to auto-create affiliate record when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user_affiliate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create affiliate record with unique ref code
  INSERT INTO public.affiliates (user_id, ref_code)
  VALUES (NEW.id, generate_ref_code());
  
  RETURN NEW;
END;
$$;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created_affiliate
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_affiliate();