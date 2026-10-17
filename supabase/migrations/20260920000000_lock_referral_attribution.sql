-- Existing attribution is immutable. Only the authenticated account may apply a code.
CREATE OR REPLACE FUNCTION public.apply_referral_code(p_user_id uuid, p_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; existing_code text; normalized text := upper(trim(p_code));
BEGIN
 IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF normalized IS NULL OR normalized !~ '^[A-Z0-9]{4,32}$' THEN RETURN false; END IF;
 SELECT user_id INTO owner_id FROM affiliate_codes WHERE code=normalized;
 IF owner_id IS NULL OR owner_id=p_user_id THEN RETURN false; END IF;
 PERFORM id FROM affiliates WHERE user_id=owner_id AND ref_code=normalized FOR SHARE;
 IF NOT FOUND THEN RETURN false; END IF;
 SELECT referral_code_used INTO existing_code FROM profiles WHERE id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Profile missing'; END IF;
 IF existing_code IS NOT NULL THEN RETURN existing_code=normalized; END IF;
 IF EXISTS(SELECT 1 FROM subscriptions WHERE user_id=p_user_id AND stripe_subscription_id IS NOT NULL) THEN RETURN false; END IF;
 UPDATE profiles SET referral_code_used=normalized WHERE id=p_user_id;
 INSERT INTO affiliate_referrals(code_used,referred_user_id) VALUES(normalized,p_user_id)
 ON CONFLICT(referred_user_id) DO NOTHING;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.apply_referral_code(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.apply_referral_code(uuid,text) TO authenticated;
