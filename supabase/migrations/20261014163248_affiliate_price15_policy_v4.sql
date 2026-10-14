-- New $15 subscriptions only: $5 initial reward; 15% direct / 5% one-hop renewal.
-- Versioned separately: never recalculate historical v1/v2/v3 invoices or subscriptions.
CREATE OR REPLACE FUNCTION public.record_affiliate_commission_v4(
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
 direct_amount:=CASE WHEN initial THEN least(500,p_amount_paid_cents)/100.0 ELSE round(p_amount_paid_cents*0.15)/100 END;
 -- Only actual renewal events earn the indirect reward. Resubscription checkout isn't a renewal.
 leader_amount:=CASE WHEN p_type='recurring' AND leader_id IS NOT NULL THEN round(p_amount_paid_cents*0.05)/100 ELSE 0 END;
 INSERT INTO public.affiliate_payouts(user_id_referred,affiliate_code,month,amount_paid,commission_affiliate,commission_agency,type,stripe_invoice_id,status,commission_policy,initial_reward,direct_affiliate_user_id,leader_user_id)
 VALUES(p_referred_user_id,upper(trim(p_code)),to_char(now(),'YYYY-MM'),p_amount_paid_cents/100.0,direct_amount,leader_amount,CASE WHEN initial THEN 'initial' ELSE 'recurring' END,p_invoice_id,'pending','2026-10-14',initial,owner_id,leader_id)
 ON CONFLICT(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL DO NOTHING RETURNING id INTO inserted_id;
 IF inserted_id IS NULL THEN RETURN NULL; END IF;
 UPDATE public.affiliates SET usd_earned=coalesce(usd_earned,0)+direct_amount,usd_available=coalesce(usd_available,0)+direct_amount WHERE user_id=owner_id;
 IF leader_amount>0 THEN
  UPDATE public.affiliates SET usd_earned=coalesce(usd_earned,0)+leader_amount,usd_available=coalesce(usd_available,0)+leader_amount WHERE user_id=leader_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Leader account missing'; END IF;
 END IF;
 RETURN direct_amount;
END $$;
REVOKE ALL ON FUNCTION public.record_affiliate_commission_v4(uuid,text,text,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_affiliate_commission_v4(uuid,text,text,integer,text) TO service_role;
