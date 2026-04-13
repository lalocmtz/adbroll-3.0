-- Fix RLS policies to allow edge function inserts via service role
-- Drop the restrictive policy
DROP POLICY IF EXISTS "No direct modifications" ON public.daily_feed;

-- Create new policies that allow service role (edge functions) to insert/update/delete
-- but still prevent regular users from direct modifications
CREATE POLICY "Service role can manage daily feed"
  ON public.daily_feed
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can only read daily feed"
  ON public.daily_feed
  FOR SELECT
  TO authenticated
  USING (true);