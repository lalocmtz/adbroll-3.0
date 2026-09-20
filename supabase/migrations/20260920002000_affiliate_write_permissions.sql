-- Policies named "Service role..." in legacy migrations omitted TO service_role.
-- Limit those policies to their intended role before enabling real payments.
DO $$ DECLARE policy record; BEGIN
 FOR policy IN SELECT tablename,policyname FROM pg_policies
 WHERE schemaname='public' AND policyname LIKE 'Service role can manage%'
 AND tablename IN ('affiliates','affiliate_payouts','withdrawal_history','referrals','subscriptions','affiliate_discounts','affiliate_agencies','affiliate_agency_assignments')
 LOOP EXECUTE format('ALTER POLICY %I ON public.%I TO service_role',policy.policyname,policy.tablename); END LOOP;
END $$;
REVOKE INSERT, UPDATE, DELETE ON public.affiliates, public.affiliate_payouts, public.withdrawal_history, public.subscriptions, public.affiliate_codes FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.ensure_affiliate()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid := auth.uid(); code_value text;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 PERFORM id FROM profiles WHERE id=uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Profile missing'; END IF;
 SELECT code INTO code_value FROM affiliate_codes WHERE user_id=uid;
 IF code_value IS NULL THEN
   code_value := generate_affiliate_code();
   INSERT INTO affiliate_codes(user_id,code) VALUES(uid,code_value);
 END IF;
 INSERT INTO affiliates(user_id,ref_code) VALUES(uid,code_value) ON CONFLICT(user_id) DO NOTHING;
 RETURN jsonb_build_object('code',code_value);
END $$;
REVOKE ALL ON FUNCTION public.ensure_affiliate() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ensure_affiliate() TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_profile_billing_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF current_user IN ('anon','authenticated') AND
 (NEW.referral_code_used IS DISTINCT FROM OLD.referral_code_used OR
 NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id OR
 NEW.plan_tier IS DISTINCT FROM OLD.plan_tier) THEN
   RAISE EXCEPTION 'Billing and attribution are managed by the server';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS protect_profile_billing ON public.profiles;
CREATE TRIGGER protect_profile_billing BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_billing_fields();
