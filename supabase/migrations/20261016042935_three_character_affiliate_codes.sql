-- Permit 3-character creator codes while preserving all attribution and community locks.
-- Definitions checked against production before this additive migration; no account data is changed.

CREATE OR REPLACE FUNCTION public.update_affiliate_code(_new_code text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); a public.affiliates%rowtype; normalized text:=upper(trim(_new_code));
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 IF normalized IS NULL OR normalized !~ '^[A-Z0-9]{3,12}$' THEN RETURN json_build_object('success',false,'error','Usa 3–12 letras o números'); END IF;
 PERFORM pg_advisory_xact_lock(628401310);
 SELECT * INTO a FROM affiliates WHERE user_id=uid FOR UPDATE;
 IF NOT FOUND THEN RETURN json_build_object('success',false,'error','Crea tu cuenta de afiliado primero'); END IF;
 IF a.code_customized THEN RETURN json_build_object('success',false,'error','Ya personalizaste tu código'); END IF;
 IF EXISTS(SELECT 1 FROM public.affiliate_network_memberships WHERE leader_user_id=uid) OR EXISTS(SELECT 1 FROM profiles WHERE referral_code_used=a.ref_code) OR EXISTS(SELECT 1 FROM affiliate_payouts WHERE affiliate_code=a.ref_code) THEN
   RETURN json_build_object('success',false,'error','Tu código ya tiene referidos o creadores invitados. Se conserva para proteger su atribución');
 END IF;
 IF EXISTS(SELECT 1 FROM affiliate_codes WHERE code=normalized AND user_id<>uid) THEN RETURN json_build_object('success',false,'error','Ese código ya está en uso'); END IF;
 UPDATE affiliate_codes SET code=normalized WHERE user_id=uid;
 UPDATE affiliates SET ref_code=normalized,code_customized=true WHERE id=a.id;
 RETURN json_build_object('success',true,'code',normalized);
EXCEPTION WHEN unique_violation THEN RETURN json_build_object('success',false,'error','Ese código ya está en uso');
END $$;
REVOKE ALL ON FUNCTION public.update_affiliate_code(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_affiliate_code(text) TO authenticated;

-- Registration can validate a code without exposing its owner's identity or ledger.
create or replace function public.validate_referral_code(p_code text)
returns boolean language sql stable security definer set search_path=public as $$
  select case when upper(trim(p_code)) ~ '^[A-Z0-9]{3,32}$' then
    exists(select 1 from public.affiliate_codes c where c.code=upper(trim(p_code)))
  else false end;
$$;
revoke all on function public.validate_referral_code(text) from public;
grant execute on function public.validate_referral_code(text) to anon, authenticated;

-- Existing attribution is immutable. Only the authenticated account may apply a code.
CREATE OR REPLACE FUNCTION public.apply_referral_code(p_user_id uuid, p_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; existing_code text; normalized text := upper(trim(p_code));
BEGIN
 IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF normalized IS NULL OR normalized !~ '^[A-Z0-9]{3,32}$' THEN RETURN false; END IF;
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
