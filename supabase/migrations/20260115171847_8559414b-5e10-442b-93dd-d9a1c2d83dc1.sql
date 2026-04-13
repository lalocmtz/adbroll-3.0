-- Create campaign_applications table to connect creator_directory with campaigns
CREATE TABLE public.campaign_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_directory_id UUID NOT NULL REFERENCES creator_directory(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'applied',
  note TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, creator_directory_id)
);

-- Enable RLS
ALTER TABLE public.campaign_applications ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is a creator in directory
CREATE OR REPLACE FUNCTION public.is_creator_in_directory(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.creator_directory
    WHERE email = _email
  )
$$;

-- Get creator directory id by email
CREATE OR REPLACE FUNCTION public.get_creator_directory_id(_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.creator_directory
  WHERE email = _email
  LIMIT 1
$$;

-- Creators can view their own applications
CREATE POLICY "Creators view own applications" ON public.campaign_applications
  FOR SELECT USING (
    creator_directory_id = public.get_creator_directory_id(auth.jwt()->>'email')
  );

-- Anyone authenticated can apply
CREATE POLICY "Authenticated users can apply" ON public.campaign_applications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Founders can do everything
CREATE POLICY "Founders full access" ON public.campaign_applications
  FOR ALL USING (public.has_role(auth.uid(), 'founder'));

-- Add trigger for updated_at
CREATE TRIGGER update_campaign_applications_updated_at
  BEFORE UPDATE ON public.campaign_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for campaign_applications
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_applications;