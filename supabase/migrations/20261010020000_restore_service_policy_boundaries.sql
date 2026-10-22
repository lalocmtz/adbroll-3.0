-- Older policies used a service-role name but applied to every visitor.
-- Restore the intended boundary before exposing the migrated database.
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT schemaname,tablename,policyname FROM pg_policies
    WHERE schemaname IN ('public','storage') AND policyname LIKE 'Service role%'
  LOOP
    EXECUTE format('ALTER POLICY %I ON %I.%I TO service_role',p.policyname,p.schemaname,p.tablename);
  END LOOP;
END $$;

-- The admin catalog editor previously depended on overly broad write policies.
CREATE POLICY "Founders manage catalog" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder')) WITH CHECK (public.has_role(auth.uid(),'founder'));
CREATE POLICY "Founders manage catalog" ON public.creators FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder')) WITH CHECK (public.has_role(auth.uid(),'founder'));
CREATE POLICY "Founders manage catalog" ON public.videos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder')) WITH CHECK (public.has_role(auth.uid(),'founder'));

-- Applying for the creator program must never grant a paid entitlement.
ALTER POLICY "Anyone can submit application" ON public.creator_program_applications
  WITH CHECK (
    status = 'pending_video' AND approved_by IS NULL AND approved_at IS NULL
    AND grant_code IS NULL AND granted_days = 30
    AND subscription_starts_at IS NULL AND subscription_ends_at IS NULL
    AND (user_id IS NULL OR user_id = auth.uid())
  );
ALTER POLICY "Users can view own application" ON public.creator_program_applications
  TO authenticated USING (user_id = auth.uid() OR email = (auth.jwt()->>'email'));

-- The legacy directory is public only after founder review.
ALTER POLICY "Anyone can insert application" ON public.creator_directory
  WITH CHECK (status = 'aplicado' AND verified IS NOT TRUE);
