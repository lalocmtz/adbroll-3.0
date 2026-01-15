-- Create creator_directory table for the public creator directory
CREATE TABLE public.creator_directory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  tiktok_username TEXT NOT NULL,
  avatar_url TEXT,
  email TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'mx',
  niche TEXT[] NOT NULL DEFAULT '{}',
  content_type TEXT[] NOT NULL DEFAULT '{}',
  tiktok_url TEXT,
  status TEXT NOT NULL DEFAULT 'aplicado',
  terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  terms_accepted_at TIMESTAMP WITH TIME ZONE,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraint for status values
ALTER TABLE public.creator_directory 
  ADD CONSTRAINT creator_directory_status_check 
  CHECK (status IN ('aplicado', 'publico', 'circulo_interno'));

-- Create index for faster queries
CREATE INDEX idx_creator_directory_status ON public.creator_directory(status);
CREATE INDEX idx_creator_directory_country ON public.creator_directory(country);
CREATE INDEX idx_creator_directory_niche ON public.creator_directory USING GIN(niche);

-- Enable RLS
ALTER TABLE public.creator_directory ENABLE ROW LEVEL SECURITY;

-- Anyone can view public creators
CREATE POLICY "Anyone can view public creators" ON public.creator_directory
  FOR SELECT USING (status = 'publico');

-- Anyone can insert application (no auth required for applications)
CREATE POLICY "Anyone can insert application" ON public.creator_directory
  FOR INSERT WITH CHECK (true);

-- Founders have full access
CREATE POLICY "Founders full access" ON public.creator_directory
  FOR ALL USING (public.has_role(auth.uid(), 'founder'));

-- Trigger for updated_at
CREATE TRIGGER update_creator_directory_updated_at
  BEFORE UPDATE ON public.creator_directory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();