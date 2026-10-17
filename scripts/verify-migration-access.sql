-- Run against the restored project. All attempted changes roll back.
BEGIN;
SELECT set_config('request.jwt.claim.sub', u.id::text, true),
       set_config('request.jwt.claims', json_build_object('sub',u.id,'role','authenticated','email',u.email)::text,true)
FROM auth.users u WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles r WHERE r.user_id=u.id AND r.role='founder'
) ORDER BY u.created_at LIMIT 1;
SET LOCAL ROLE authenticated;
DO $$
DECLARE changed integer;
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(),'founder') THEN
    RAISE EXCEPTION 'Fixture needs a non-founder account';
  END IF;
  IF EXISTS(SELECT 1 FROM public.profiles WHERE id<>auth.uid()) THEN
    RAISE EXCEPTION 'Another user profile is visible';
  END IF;
  IF EXISTS(SELECT 1 FROM public.affiliate_codes WHERE user_id<>auth.uid()) THEN
    RAISE EXCEPTION 'Another affiliate code record is visible';
  END IF;
  IF EXISTS(SELECT 1 FROM public.subscriptions WHERE user_id<>auth.uid()) THEN
    RAISE EXCEPTION 'Another subscription is visible';
  END IF;
  IF has_column_privilege(current_user,'public.videos','transcript','SELECT')
    OR has_column_privilege(current_user,'public.videos','analysis_json','SELECT')
    OR has_column_privilege(current_user,'public.videos','variants_json','SELECT') THEN
    RAISE EXCEPTION 'Premium video fields can bypass the entitlement RPC';
  END IF;
  UPDATE public.products SET rank=rank;
  GET DIAGNOSTICS changed=ROW_COUNT;
  IF changed<>0 THEN RAISE EXCEPTION 'Ordinary user can modify catalog'; END IF;
  BEGIN
    INSERT INTO public.creator_program_applications(email,full_name,tiktok_url,user_id,status)
    VALUES('restore-test@example.invalid','Restore policy test','https://www.tiktok.com/@restore-test',auth.uid(),'approved');
    RAISE EXCEPTION 'Ordinary user can grant free access';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;
ROLLBACK;
SELECT 'migration access boundaries verified' AS result;
