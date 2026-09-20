-- Install with the matching payout worker; the worker remains disabled by default.
CREATE UNIQUE INDEX IF NOT EXISTS one_pending_affiliate_withdrawal
ON public.withdrawal_history(affiliate_id) WHERE status='pending';

CREATE OR REPLACE FUNCTION public.reserve_affiliate_payout(p_affiliate_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.affiliates%rowtype; w public.withdrawal_history%rowtype; amount numeric;
BEGIN
 SELECT * INTO a FROM affiliates WHERE id=p_affiliate_id FOR UPDATE;
 IF NOT FOUND OR NOT coalesce(a.payouts_enabled,false) OR NOT coalesce(a.stripe_onboarding_complete,false) OR a.stripe_connect_id IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO w FROM withdrawal_history WHERE affiliate_id=a.id AND status='pending';
 IF NOT FOUND THEN
   amount := floor(coalesce(a.usd_available,0)*100)/100;
   IF amount < 50 THEN RETURN NULL; END IF;
   INSERT INTO withdrawal_history(affiliate_id,amount,status) VALUES(a.id,amount,'pending') RETURNING * INTO w;
   UPDATE affiliates SET usd_available=usd_available-amount WHERE id=a.id;
 END IF;
 RETURN jsonb_build_object('id',w.id,'amount',w.amount,'created_at',w.created_at,'destination',a.stripe_connect_id);
END $$;

CREATE OR REPLACE FUNCTION public.complete_affiliate_payout(p_withdrawal_id uuid,p_transfer_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE w public.withdrawal_history%rowtype; owner_id uuid;
BEGIN
 IF p_transfer_id IS NULL OR p_transfer_id NOT LIKE 'tr_%' THEN RAISE EXCEPTION 'Invalid transfer'; END IF;
 SELECT affiliate_id INTO owner_id FROM withdrawal_history WHERE id=p_withdrawal_id;
 IF owner_id IS NULL THEN RAISE EXCEPTION 'Withdrawal missing'; END IF;
 -- Same lock order as reservation and commission crediting.
 PERFORM id FROM affiliates WHERE id=owner_id FOR UPDATE;
 SELECT * INTO w FROM withdrawal_history WHERE id=p_withdrawal_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal missing'; END IF;
 IF w.status='completed' AND w.stripe_transfer_id=p_transfer_id THEN RETURN false; END IF;
 IF w.status<>'pending' THEN RAISE EXCEPTION 'Withdrawal requires reconciliation'; END IF;
 UPDATE withdrawal_history SET status='completed',stripe_transfer_id=p_transfer_id WHERE id=w.id;
 UPDATE affiliates SET usd_withdrawn=coalesce(usd_withdrawn,0)+w.amount,last_payout_at=now() WHERE id=owner_id;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.reserve_affiliate_payout(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.complete_affiliate_payout(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_affiliate_payout(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_affiliate_payout(uuid,text) TO service_role;
