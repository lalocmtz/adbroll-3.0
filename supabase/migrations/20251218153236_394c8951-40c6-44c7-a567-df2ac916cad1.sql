-- =============================================
-- Migración 2: Sistema de Campañas Digitales
-- =============================================

-- 1. Crear función is_brand() security definer
CREATE OR REPLACE FUNCTION public.is_brand(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'brand'::app_role
  )
$$;

-- 2. Crear tabla brand_profiles (perfiles de marcas/empresas)
CREATE TABLE public.brand_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  logo_url TEXT,
  website TEXT,
  description TEXT,
  contact_email TEXT,
  industry TEXT,
  verified BOOLEAN DEFAULT false,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 3. Crear tabla campaigns (campañas digitales)
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brand_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_url TEXT,
  product_image_url TEXT,
  brief TEXT NOT NULL,
  rules TEXT,
  objective TEXT NOT NULL DEFAULT 'awareness',
  min_payment_mxn NUMERIC NOT NULL DEFAULT 200,
  max_payment_mxn NUMERIC NOT NULL DEFAULT 700,
  requires_spark_code BOOLEAN DEFAULT true,
  video_duration_min INTEGER DEFAULT 15,
  video_duration_max INTEGER DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'draft',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  max_submissions INTEGER,
  submissions_count INTEGER DEFAULT 0,
  approved_count INTEGER DEFAULT 0,
  total_spent_mxn NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Crear tabla campaign_submissions (videos enviados)
CREATE TABLE public.campaign_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_url TEXT,
  video_file_url TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  proposed_price_mxn NUMERIC NOT NULL,
  creator_note TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review',
  brand_feedback TEXT,
  approved_price_mxn NUMERIC,
  spark_code TEXT,
  spark_code_submitted_at TIMESTAMPTZ,
  legal_consent_accepted BOOLEAN DEFAULT false,
  legal_consent_accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, creator_id)
);

-- 5. Crear tabla campaign_transactions (pagos)
CREATE TABLE public.campaign_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.campaign_submissions(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brand_profiles(id),
  creator_id UUID NOT NULL REFERENCES auth.users(id),
  amount_mxn NUMERIC NOT NULL,
  platform_fee_mxn NUMERIC DEFAULT 0,
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- INDICES
CREATE INDEX idx_campaigns_brand_id ON public.campaigns(brand_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaign_submissions_campaign_id ON public.campaign_submissions(campaign_id);
CREATE INDEX idx_campaign_submissions_creator_id ON public.campaign_submissions(creator_id);
CREATE INDEX idx_campaign_submissions_status ON public.campaign_submissions(status);
CREATE INDEX idx_campaign_transactions_submission_id ON public.campaign_transactions(submission_id);

-- RLS brand_profiles
ALTER TABLE public.brand_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own brand profile"
ON public.brand_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own brand profile"
ON public.brand_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own brand profile"
ON public.brand_profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Public can view verified brand profiles"
ON public.brand_profiles FOR SELECT
USING (verified = true);

CREATE POLICY "Service role can manage brand profiles"
ON public.brand_profiles FOR ALL
USING (true)
WITH CHECK (true);

-- RLS campaigns
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active campaigns"
ON public.campaigns FOR SELECT
USING (status = 'active' AND auth.uid() IS NOT NULL);

CREATE POLICY "Brands can view own campaigns"
ON public.campaigns FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.brand_profiles
    WHERE brand_profiles.id = campaigns.brand_id
    AND brand_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Brands can create campaigns"
ON public.campaigns FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.brand_profiles
    WHERE brand_profiles.id = campaigns.brand_id
    AND brand_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Brands can update own campaigns"
ON public.campaigns FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.brand_profiles
    WHERE brand_profiles.id = campaigns.brand_id
    AND brand_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Brands can delete own campaigns"
ON public.campaigns FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.brand_profiles
    WHERE brand_profiles.id = campaigns.brand_id
    AND brand_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage campaigns"
ON public.campaigns FOR ALL
USING (true)
WITH CHECK (true);

-- RLS campaign_submissions
ALTER TABLE public.campaign_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view own submissions"
ON public.campaign_submissions FOR SELECT
USING (auth.uid() = creator_id);

CREATE POLICY "Creators can create submissions"
ON public.campaign_submissions FOR INSERT
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update own submissions"
ON public.campaign_submissions FOR UPDATE
USING (auth.uid() = creator_id);

CREATE POLICY "Brands can view submissions to their campaigns"
ON public.campaign_submissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns c
    JOIN public.brand_profiles bp ON c.brand_id = bp.id
    WHERE c.id = campaign_submissions.campaign_id
    AND bp.user_id = auth.uid()
  )
);

CREATE POLICY "Brands can update submissions to their campaigns"
ON public.campaign_submissions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns c
    JOIN public.brand_profiles bp ON c.brand_id = bp.id
    WHERE c.id = campaign_submissions.campaign_id
    AND bp.user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage submissions"
ON public.campaign_submissions FOR ALL
USING (true)
WITH CHECK (true);

-- RLS campaign_transactions
ALTER TABLE public.campaign_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view own transactions"
ON public.campaign_transactions FOR SELECT
USING (auth.uid() = creator_id);

CREATE POLICY "Brands can view own transactions"
ON public.campaign_transactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.brand_profiles
    WHERE brand_profiles.id = campaign_transactions.brand_id
    AND brand_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage transactions"
ON public.campaign_transactions FOR ALL
USING (true)
WITH CHECK (true);

-- TRIGGERS updated_at
CREATE TRIGGER update_brand_profiles_updated_at
BEFORE UPDATE ON public.brand_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaign_submissions_updated_at
BEFORE UPDATE ON public.campaign_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();