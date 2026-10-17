-- Explicit creator invitations are separate from customer purchase attribution.
-- Historical v1/v2 invoices and balances retain their original policy.
CREATE TABLE public.affiliate_network_memberships (
  creator_user_id uuid PRIMARY KEY REFERENCES public.profiles(id),
  leader_user_id uuid NOT NULL REFERENCES public.profiles(id),
  consented_at timestamptz NOT NULL DEFAULT now(),
  terms_version text NOT NULL DEFAULT '2026-10-13',
  CHECK (creator_user_id <> leader_user_id)
);
CREATE INDEX affiliate_network_leader_idx ON public.affiliate_network_memberships(leader_user_id);
ALTER TABLE public.affiliate_network_memberships ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.affiliate_network_memberships FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.affiliate_network_memberships TO service_role;

ALTER TABLE public.affiliate_payouts
 ADD COLUMN IF NOT EXISTS direct_affiliate_user_id uuid REFERENCES public.profiles(id),
 ADD COLUMN IF NOT EXISTS leader_user_id uuid REFERENCES public.profiles(id),
 ADD COLUMN IF NOT EXISTS leader_commission_reversed numeric NOT NULL DEFAULT 0;
CREATE INDEX affiliate_payouts_leader_idx ON public.affiliate_payouts(leader_user_id) WHERE leader_user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.join_affiliate_network(p_leader_code text,p_accept_terms boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); leader uuid; existing_leader uuid; own_code text;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 IF p_accept_terms IS DISTINCT FROM true THEN RAISE EXCEPTION 'Explicit acceptance required'; END IF;
 -- Serialize graph mutations, including simultaneous inverse invitations.
 PERFORM pg_advisory_xact_lock(628401310);
 SELECT user_id INTO leader FROM public.affiliate_codes WHERE code=upper(trim(p_leader_code));
 IF leader IS NULL OR leader=uid THEN RAISE EXCEPTION 'Invalid leader code'; END IF;
 SELECT ref_code INTO own_code FROM public.affiliates WHERE user_id=uid;
 IF own_code IS NULL OR NOT EXISTS(SELECT 1 FROM public.affiliates WHERE user_id=leader) THEN
  RAISE EXCEPTION 'Affiliate account required';
 END IF;
 SELECT leader_user_id INTO existing_leader FROM public.affiliate_network_memberships WHERE creator_user_id=uid;
 IF existing_leader=leader THEN RETURN jsonb_build_object('success',true,'already_joined',true); END IF;
 IF existing_leader IS NOT NULL THEN RAISE EXCEPTION 'Leader already assigned'; END IF;
 IF EXISTS(SELECT 1 FROM public.affiliate_payouts WHERE affiliate_code=own_code OR direct_affiliate_user_id=uid) THEN
  RAISE EXCEPTION 'Join a leader before your first paid referral';
 END IF;
 IF EXISTS(WITH RECURSIVE ancestors AS (
   SELECT leader AS id UNION SELECT m.leader_user_id FROM public.affiliate_network_memberships m JOIN ancestors a ON m.creator_user_id=a.id
 ) SELECT 1 FROM ancestors WHERE id=uid) THEN RAISE EXCEPTION 'Invitation cycle not allowed'; END IF;
 INSERT INTO public.affiliate_network_memberships(creator_user_id,leader_user_id) VALUES(uid,leader);
 RETURN jsonb_build_object('success',true,'already_joined',false);
END $$;
REVOKE ALL ON FUNCTION public.join_affiliate_network(text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.join_affiliate_network(text,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_affiliate_commission_v3(
 p_referred_user_id uuid,p_code text,p_invoice_id text,p_amount_paid_cents integer,p_type text
) RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE owner_id uuid; leader_id uuid; inserted_id uuid; direct_amount numeric; leader_amount numeric; initial boolean; attributed_code text;
BEGIN
 IF p_amount_paid_cents IS NULL THEN RAISE EXCEPTION 'Invalid commission amount'; END IF;
 IF p_amount_paid_cents <= 0 THEN RETURN NULL; END IF;
 IF p_invoice_id IS NULL OR trim(p_invoice_id)='' OR p_type IS NULL OR p_type NOT IN('initial','recurring','reactivation') THEN RAISE EXCEPTION 'Invalid commission'; END IF;
 -- Graph and first-sale locks prevent retrospective leader assignment.
 PERFORM pg_advisory_xact_lock(628401310);
 SELECT referral_code_used INTO attributed_code FROM public.profiles WHERE id=p_referred_user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Referred profile missing'; END IF;
 IF attributed_code IS DISTINCT FROM upper(trim(p_code)) THEN RETURN NULL; END IF;
 SELECT user_id INTO owner_id FROM public.affiliate_codes WHERE code=upper(trim(p_code));
 IF owner_id IS NULL OR owner_id=p_referred_user_id THEN RETURN NULL; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.affiliates WHERE user_id=owner_id) THEN RAISE EXCEPTION 'Affiliate account missing'; END IF;
 SELECT leader_user_id INTO leader_id FROM public.affiliate_network_memberships WHERE creator_user_id=owner_id;
 -- Never credit a customer for their own purchase, even through a creator.
 IF leader_id=p_referred_user_id THEN leader_id:=NULL; END IF;
 PERFORM id FROM public.affiliates WHERE user_id IN(owner_id,leader_id) ORDER BY id FOR UPDATE;
 initial:=p_type='initial' AND NOT EXISTS(SELECT 1 FROM public.affiliate_payouts WHERE user_id_referred=p_referred_user_id AND (initial_reward OR type='initial'));
 direct_amount:=CASE WHEN initial THEN least(1000,p_amount_paid_cents)/100.0 ELSE round(p_amount_paid_cents*0.15)/100 END;
 -- Only actual renewal events earn the indirect reward. Resubscription checkout isn't a renewal.
 leader_amount:=CASE WHEN p_type='recurring' AND leader_id IS NOT NULL THEN round(p_amount_paid_cents*0.05)/100 ELSE 0 END;
 INSERT INTO public.affiliate_payouts(user_id_referred,affiliate_code,month,amount_paid,commission_affiliate,commission_agency,type,stripe_invoice_id,status,commission_policy,initial_reward,direct_affiliate_user_id,leader_user_id)
 VALUES(p_referred_user_id,upper(trim(p_code)),to_char(now(),'YYYY-MM'),p_amount_paid_cents/100.0,direct_amount,leader_amount,CASE WHEN initial THEN 'initial' ELSE 'recurring' END,p_invoice_id,'pending','2026-10-13',initial,owner_id,leader_id)
 ON CONFLICT(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL DO NOTHING RETURNING id INTO inserted_id;
 IF inserted_id IS NULL THEN RETURN NULL; END IF;
 UPDATE public.affiliates SET usd_earned=coalesce(usd_earned,0)+direct_amount,usd_available=coalesce(usd_available,0)+direct_amount WHERE user_id=owner_id;
 IF leader_amount>0 THEN
  UPDATE public.affiliates SET usd_earned=coalesce(usd_earned,0)+leader_amount,usd_available=coalesce(usd_available,0)+leader_amount WHERE user_id=leader_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Leader account missing'; END IF;
 END IF;
 RETURN direct_amount;
END $$;
REVOKE ALL ON FUNCTION public.record_affiliate_commission_v3(uuid,text,text,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_affiliate_commission_v3(uuid,text,text,integer,text) TO service_role;

CREATE OR REPLACE FUNCTION public.reconcile_affiliate_refund(p_invoice_id text,p_refunded_cents integer,p_charged_cents integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE ledger public.affiliate_payouts%rowtype; owner_id uuid; direct_target numeric; indirect_target numeric; direct_delta numeric; indirect_delta numeric;
BEGIN
 IF p_charged_cents IS NULL OR p_refunded_cents IS NULL OR p_charged_cents<=0 OR p_refunded_cents<0 OR p_refunded_cents>p_charged_cents THEN RAISE EXCEPTION 'Invalid refund amounts'; END IF;
 SELECT * INTO ledger FROM public.affiliate_payouts WHERE stripe_invoice_id=p_invoice_id;
 IF NOT FOUND THEN RETURN false; END IF;
 SELECT coalesce(ledger.direct_affiliate_user_id,c.user_id) INTO owner_id FROM public.affiliate_codes c WHERE c.code=ledger.affiliate_code;
 owner_id:=coalesce(ledger.direct_affiliate_user_id,owner_id);
 PERFORM id FROM public.affiliates WHERE user_id IN(owner_id,ledger.leader_user_id) ORDER BY id FOR UPDATE;
 SELECT * INTO ledger FROM public.affiliate_payouts WHERE stripe_invoice_id=p_invoice_id FOR UPDATE;
 direct_target:=greatest(round(ledger.commission_affiliate*p_refunded_cents/p_charged_cents,2),ledger.commission_reversed);
 indirect_target:=greatest(round(ledger.commission_agency*p_refunded_cents/p_charged_cents,2),ledger.leader_commission_reversed);
 direct_delta:=direct_target-ledger.commission_reversed;
 indirect_delta:=indirect_target-ledger.leader_commission_reversed;
 IF direct_delta=0 AND indirect_delta=0 THEN RETURN false; END IF;
 UPDATE public.affiliate_payouts SET commission_reversed=direct_target,leader_commission_reversed=indirect_target WHERE id=ledger.id;
 UPDATE public.affiliates SET usd_available=coalesce(usd_available,0)-direct_delta,usd_earned=coalesce(usd_earned,0)-direct_delta WHERE user_id=owner_id;
 IF ledger.leader_user_id IS NOT NULL THEN
  UPDATE public.affiliates SET usd_available=coalesce(usd_available,0)-indirect_delta,usd_earned=coalesce(usd_earned,0)-indirect_delta WHERE user_id=ledger.leader_user_id;
 END IF;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.reconcile_affiliate_refund(text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_affiliate_refund(text,integer,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.hold_affiliate_invoice(p_invoice_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE ledger public.affiliate_payouts%rowtype; owner_id uuid;
BEGIN
 SELECT * INTO ledger FROM public.affiliate_payouts WHERE stripe_invoice_id=p_invoice_id;
 IF NOT FOUND THEN RETURN false; END IF;
 SELECT user_id INTO owner_id FROM public.affiliate_codes WHERE code=ledger.affiliate_code;
 UPDATE public.affiliates SET payout_hold=true WHERE user_id IN(coalesce(ledger.direct_affiliate_user_id,owner_id),ledger.leader_user_id);
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.hold_affiliate_invoice(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.hold_affiliate_invoice(text) TO service_role;

CREATE OR REPLACE FUNCTION public.get_affiliate_network()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); own_code text; result jsonb;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 SELECT ref_code INTO own_code FROM public.affiliates WHERE user_id=uid;
 IF own_code IS NULL THEN RAISE EXCEPTION 'Affiliate account required'; END IF;
 SELECT jsonb_build_object(
  'leader',(SELECT jsonb_build_object('code',c.code,'joined_at',m.consented_at) FROM public.affiliate_network_memberships m JOIN public.affiliate_codes c ON c.user_id=m.leader_user_id WHERE m.creator_user_id=uid),
  'can_join',NOT EXISTS(SELECT 1 FROM public.affiliate_network_memberships WHERE creator_user_id=uid) AND NOT EXISTS(SELECT 1 FROM public.affiliate_payouts WHERE affiliate_code=own_code OR direct_affiliate_user_id=uid),
  'direct_creators',(SELECT count(*) FROM public.affiliate_network_memberships WHERE leader_user_id=uid),
  'indirect_creators',(SELECT count(*) FROM public.affiliate_network_memberships m JOIN public.affiliate_network_memberships parent ON parent.creator_user_id=m.leader_user_id WHERE parent.leader_user_id=uid),
  'direct_customers',(SELECT count(*) FROM public.profiles WHERE referral_code_used=own_code),
  'direct_active_customers',(SELECT count(*) FROM public.profiles p WHERE p.referral_code_used=own_code AND EXISTS(SELECT 1 FROM public.subscriptions s WHERE s.user_id=p.id AND s.status='active' AND s.stripe_subscription_id IS NOT NULL AND s.price_usd>0)),
  'indirect_customers',(SELECT count(DISTINCT p.id) FROM public.profiles p JOIN public.affiliate_codes c ON c.code=p.referral_code_used JOIN public.affiliate_network_memberships m ON m.creator_user_id=c.user_id WHERE m.leader_user_id=uid AND p.id<>uid),
  'indirect_active_customers',(SELECT count(DISTINCT p.id) FROM public.profiles p JOIN public.affiliate_codes c ON c.code=p.referral_code_used JOIN public.affiliate_network_memberships m ON m.creator_user_id=c.user_id WHERE m.leader_user_id=uid AND p.id<>uid AND EXISTS(SELECT 1 FROM public.subscriptions s WHERE s.user_id=p.id AND s.status='active' AND s.stripe_subscription_id IS NOT NULL AND s.price_usd>0)),
  'direct_earned',(SELECT coalesce(sum(commission_affiliate-commission_reversed),0) FROM public.affiliate_payouts WHERE affiliate_code=own_code OR direct_affiliate_user_id=uid),
  'indirect_earned',(SELECT coalesce(sum(commission_agency-leader_commission_reversed),0) FROM public.affiliate_payouts WHERE leader_user_id=uid),
  'members',coalesce((SELECT jsonb_agg(jsonb_build_object('code',c.code,'email_masked',regexp_replace(coalesce(p.email,'usuario'),'(^.).*(@.*$)','\1***\2'),'joined_at',m.consented_at,
   'customers',(SELECT count(*) FROM public.profiles customer WHERE customer.referral_code_used=c.code AND customer.id<>uid),
   'active_customers',(SELECT count(*) FROM public.profiles customer WHERE customer.referral_code_used=c.code AND customer.id<>uid AND EXISTS(SELECT 1 FROM public.subscriptions s WHERE s.user_id=customer.id AND s.status='active' AND s.stripe_subscription_id IS NOT NULL AND s.price_usd>0)),
   'leader_earned',(SELECT coalesce(sum(ap.commission_agency-ap.leader_commission_reversed),0) FROM public.affiliate_payouts ap WHERE ap.leader_user_id=uid AND ap.direct_affiliate_user_id=m.creator_user_id)
  ) ORDER BY m.consented_at DESC) FROM public.affiliate_network_memberships m JOIN public.affiliate_codes c ON c.user_id=m.creator_user_id JOIN public.profiles p ON p.id=m.creator_user_id WHERE m.leader_user_id=uid),'[]'::jsonb),
  'indirect_commissions',coalesce((SELECT jsonb_agg(jsonb_build_object('amount',commission_agency-leader_commission_reversed,'type','leader_recurring','month',month,'status',status,'date',created_at) ORDER BY created_at DESC) FROM public.affiliate_payouts WHERE leader_user_id=uid AND commission_agency>0),'[]'::jsonb)
 ) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_affiliate_network() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_affiliate_network() TO authenticated;

-- Keep shared community links stable after the first creator joins.
CREATE OR REPLACE FUNCTION public.update_affiliate_code(_new_code text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); a public.affiliates%rowtype; normalized text:=upper(trim(_new_code));
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 IF normalized IS NULL OR normalized !~ '^[A-Z0-9]{4,12}$' THEN RETURN json_build_object('success',false,'error','Usa 4–12 letras o números'); END IF;
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
