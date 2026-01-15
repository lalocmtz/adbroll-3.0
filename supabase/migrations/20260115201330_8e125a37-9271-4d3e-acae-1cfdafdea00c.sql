-- Add brand_name and brand_logo_url columns to campaigns
ALTER TABLE public.campaigns 
  ADD COLUMN IF NOT EXISTS brand_name TEXT,
  ADD COLUMN IF NOT EXISTS brand_logo_url TEXT;

-- Make brand_id optional (allow NULL)
ALTER TABLE public.campaigns 
  ALTER COLUMN brand_id DROP NOT NULL;

-- Update RLS policies for campaign_applications to allow public inserts
DROP POLICY IF EXISTS "Anyone can apply to campaigns" ON public.campaign_applications;
CREATE POLICY "Anyone can apply to campaigns" 
ON public.campaign_applications
FOR INSERT 
WITH CHECK (true);

-- Allow public to view active campaigns
DROP POLICY IF EXISTS "Public can view active campaigns" ON public.campaigns;
CREATE POLICY "Public can view active campaigns"
ON public.campaigns
FOR SELECT
USING (status = 'active');

-- Allow founders to manage all campaigns
DROP POLICY IF EXISTS "Founders can manage campaigns" ON public.campaigns;
CREATE POLICY "Founders can manage campaigns"
ON public.campaigns
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'founder'))
WITH CHECK (public.has_role(auth.uid(), 'founder'));

-- Allow public to view creator_directory (approved creators only)
DROP POLICY IF EXISTS "Public can view approved creators" ON public.creator_directory;
CREATE POLICY "Public can view approved creators"
ON public.creator_directory
FOR SELECT
USING (status = 'approved');