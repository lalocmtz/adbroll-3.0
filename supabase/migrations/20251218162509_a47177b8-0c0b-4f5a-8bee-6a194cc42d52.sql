-- Create email_captures table for abandoned cart tracking
CREATE TABLE public.email_captures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  referral_code TEXT,
  source TEXT DEFAULT 'checkout_modal',
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index on email for faster lookups
CREATE INDEX idx_email_captures_email ON public.email_captures(email);

-- Create index for finding unconverted leads
CREATE INDEX idx_email_captures_unconverted ON public.email_captures(created_at) WHERE converted_at IS NULL;

-- Enable RLS
ALTER TABLE public.email_captures ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage all captures
CREATE POLICY "Service role can manage email captures"
ON public.email_captures
FOR ALL
USING (true)
WITH CHECK (true);

-- Allow public insert (for guest checkout before login)
CREATE POLICY "Anyone can insert email captures"
ON public.email_captures
FOR INSERT
WITH CHECK (true);