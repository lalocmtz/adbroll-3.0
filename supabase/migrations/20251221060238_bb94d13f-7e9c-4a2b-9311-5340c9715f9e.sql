-- Create creator_program_applications table for creator grant program
CREATE TABLE public.creator_program_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  full_name text NOT NULL,
  whatsapp text,
  tiktok_url text NOT NULL,
  video_url text,
  status text NOT NULL DEFAULT 'pending_video',
  grant_code text UNIQUE,
  granted_days integer DEFAULT 30,
  user_id uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  subscription_starts_at timestamptz,
  subscription_ends_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add unique constraint on email to prevent duplicate applications
CREATE UNIQUE INDEX idx_creator_program_applications_email ON public.creator_program_applications(email);

-- Enable RLS
ALTER TABLE public.creator_program_applications ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (public application form)
CREATE POLICY "Anyone can submit application" 
ON public.creator_program_applications 
FOR INSERT 
WITH CHECK (true);

-- Policy: Users can view their own application by email
CREATE POLICY "Users can view own application" 
ON public.creator_program_applications 
FOR SELECT 
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR user_id = auth.uid()
);

-- Policy: Founders can manage all applications
CREATE POLICY "Founders can manage applications" 
ON public.creator_program_applications 
FOR ALL 
USING (has_role(auth.uid(), 'founder'::app_role));

-- Policy: Service role can manage all
CREATE POLICY "Service role can manage applications" 
ON public.creator_program_applications 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Function to generate unique grant code
CREATE OR REPLACE FUNCTION public.generate_grant_code()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    -- Generate format: CREATOR-XXXXXX
    new_code := 'CREATOR-' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM public.creator_program_applications WHERE grant_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_creator_program_applications_updated_at
BEFORE UPDATE ON public.creator_program_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();