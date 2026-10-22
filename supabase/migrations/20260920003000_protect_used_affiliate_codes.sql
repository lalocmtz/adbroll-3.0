CREATE OR REPLACE FUNCTION public.update_affiliate_code(_new_code text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); a public.affiliates%rowtype; normalized text:=upper(trim(_new_code));
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 IF normalized IS NULL OR normalized !~ '^[A-Z0-9]{4,12}$' THEN RETURN json_build_object('success',false,'error','Usa 4–12 letras o números'); END IF;
 SELECT * INTO a FROM affiliates WHERE user_id=uid FOR UPDATE;
 IF NOT FOUND THEN RETURN json_build_object('success',false,'error','Crea tu cuenta de afiliado primero'); END IF;
 IF a.code_customized THEN RETURN json_build_object('success',false,'error','Ya personalizaste tu código'); END IF;
 IF EXISTS(SELECT 1 FROM profiles WHERE referral_code_used=a.ref_code) OR EXISTS(SELECT 1 FROM affiliate_payouts WHERE affiliate_code=a.ref_code) THEN
   RETURN json_build_object('success',false,'error','Tu código ya tiene referidos. Se conserva para proteger su atribución');
 END IF;
 IF EXISTS(SELECT 1 FROM affiliate_codes WHERE code=normalized AND user_id<>uid) THEN RETURN json_build_object('success',false,'error','Ese código ya está en uso'); END IF;
 UPDATE affiliate_codes SET code=normalized WHERE user_id=uid;
 UPDATE affiliates SET ref_code=normalized,code_customized=true WHERE id=a.id;
 RETURN json_build_object('success',true,'code',normalized);
EXCEPTION WHEN unique_violation THEN RETURN json_build_object('success',false,'error','Ese código ya está en uso');
END $$;
REVOKE ALL ON FUNCTION public.update_affiliate_code(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_affiliate_code(text) TO authenticated;
