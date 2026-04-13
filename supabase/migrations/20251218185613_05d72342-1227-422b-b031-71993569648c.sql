-- Create page_views table for internal visitor tracking
CREATE TABLE public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path text NOT NULL,
  session_id text,
  user_id uuid,
  referrer text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Index for fast queries
CREATE INDEX idx_page_views_created_at ON public.page_views(created_at);
CREATE INDEX idx_page_views_session_id ON public.page_views(session_id);

-- Enable RLS
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Allow inserts from edge function (service role)
CREATE POLICY "Service role can manage page views"
ON public.page_views
FOR ALL
USING (true)
WITH CHECK (true);

-- Allow founders to view analytics
CREATE POLICY "Founders can view page views"
ON public.page_views
FOR SELECT
USING (public.has_role(auth.uid(), 'founder'));