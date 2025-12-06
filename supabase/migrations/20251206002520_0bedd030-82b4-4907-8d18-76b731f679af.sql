-- 1. Create plan enum
CREATE TYPE public.user_plan AS ENUM ('free', 'creator', 'studio');

-- 2. Add plan fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS plan public.user_plan DEFAULT 'free',
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS marketplace text DEFAULT 'mx',
ADD COLUMN IF NOT EXISTS language text DEFAULT 'es',
ADD COLUMN IF NOT EXISTS referral_code_used text;

-- 3. Create affiliate_codes table (one code per user)
CREATE TABLE public.affiliate_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.affiliate_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own affiliate code"
ON public.affiliate_codes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own affiliate code"
ON public.affiliate_codes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage affiliate codes"
ON public.affiliate_codes FOR ALL
USING (true)
WITH CHECK (true);

-- 4. Create affiliate_referrals table
CREATE TABLE public.affiliate_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_used text NOT NULL,
  referred_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(referred_user_id)
);

ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referral"
ON public.affiliate_referrals FOR SELECT
USING (auth.uid() = referred_user_id);

CREATE POLICY "Service role can manage referrals"
ON public.affiliate_referrals FOR ALL
USING (true)
WITH CHECK (true);

-- 5. Create affiliate_discounts table
CREATE TABLE public.affiliate_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_original_price numeric NOT NULL,
  discounted_price numeric NOT NULL,
  used_referral_code text NOT NULL,
  discount_applied boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.affiliate_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own discount"
ON public.affiliate_discounts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage discounts"
ON public.affiliate_discounts FOR ALL
USING (true)
WITH CHECK (true);

-- 6. Create affiliate_payouts table (structure only, no logic yet)
CREATE TABLE public.affiliate_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_referred uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  affiliate_code text NOT NULL,
  month text NOT NULL,
  amount_paid numeric NOT NULL DEFAULT 0,
  commission_affiliate numeric NOT NULL DEFAULT 0,
  commission_agency numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage payouts"
ON public.affiliate_payouts FOR ALL
USING (true)
WITH CHECK (true);

-- 7. Create affiliate_agencies table
CREATE TABLE public.affiliate_agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_code text NOT NULL UNIQUE,
  agency_owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.affiliate_agencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own agency"
ON public.affiliate_agencies FOR SELECT
USING (auth.uid() = agency_owner_user_id);

CREATE POLICY "Service role can manage agencies"
ON public.affiliate_agencies FOR ALL
USING (true)
WITH CHECK (true);

-- 8. Create affiliate_agency_assignments table
CREATE TABLE public.affiliate_agency_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_code text NOT NULL,
  affiliate_code text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(affiliate_code)
);

ALTER TABLE public.affiliate_agency_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage agency assignments"
ON public.affiliate_agency_assignments FOR ALL
USING (true)
WITH CHECK (true);

-- 9. Function to generate unique affiliate code
CREATE OR REPLACE FUNCTION public.generate_affiliate_code()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM public.affiliate_codes WHERE code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- 10. Function to validate and apply referral code
CREATE OR REPLACE FUNCTION public.apply_referral_code(p_user_id uuid, p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code_valid boolean;
BEGIN
  -- Check if code exists
  SELECT EXISTS(SELECT 1 FROM public.affiliate_codes WHERE code = upper(p_code)) INTO code_valid;
  
  IF NOT code_valid THEN
    RETURN false;
  END IF;
  
  -- Update profile with referral code
  UPDATE public.profiles SET referral_code_used = upper(p_code) WHERE id = p_user_id;
  
  -- Create referral record
  INSERT INTO public.affiliate_referrals (code_used, referred_user_id)
  VALUES (upper(p_code), p_user_id)
  ON CONFLICT (referred_user_id) DO NOTHING;
  
  RETURN true;
END;
$$;