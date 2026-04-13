
CREATE TABLE public.creator_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT NOT NULL,
  tiktok_username TEXT,
  instagram_username TEXT,
  content_preferences TEXT[] DEFAULT '{}',
  comfortable_on_camera BOOLEAN DEFAULT false,
  campaign_tag TEXT NOT NULL DEFAULT 'Guadalajara',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a lead" ON public.creator_leads
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Founders can manage leads" ON public.creator_leads
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role));

CREATE POLICY "Users can view own leads" ON public.creator_leads
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
