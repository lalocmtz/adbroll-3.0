-- Manual transfers are made outside TokXray. Only record confirmed transfers here.
ALTER TABLE public.withdrawal_history ADD COLUMN IF NOT EXISTS manual_reference text;
ALTER TABLE public.withdrawal_history ADD COLUMN IF NOT EXISTS recorded_by uuid;
CREATE UNIQUE INDEX IF NOT EXISTS unique_manual_transfer_reference ON public.withdrawal_history (manual_reference) WHERE manual_reference IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_manual_affiliate_payment(p_affiliate_id uuid,p_amount numeric,p_reference text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.affiliates%rowtype; w public.withdrawal_history%rowtype; ref text := upper(trim(p_reference));
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'founder') THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF p_amount IS NULL OR p_amount::text IN ('NaN','Infinity','-Infinity') OR p_amount < 50 OR p_amount <> round(p_amount,2) THEN RAISE EXCEPTION 'Minimum payment is 50 USD; use two decimals'; END IF;
 IF ref IS NULL OR length(ref)<6 OR length(ref)>160 THEN RAISE EXCEPTION 'Provide the unique bank transfer reference (6-160 characters)'; END IF;
 SELECT * INTO a FROM public.affiliates WHERE id=p_affiliate_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Affiliate not found'; END IF;
 SELECT * INTO w FROM public.withdrawal_history WHERE manual_reference=ref;
 IF FOUND THEN
   IF w.affiliate_id=p_affiliate_id AND w.amount=p_amount AND w.status='completed' THEN RETURN w.id; END IF;
   RAISE EXCEPTION 'Reference already used for another payment';
 END IF;
 IF a.payout_hold THEN RAISE EXCEPTION 'Affiliate payments are on hold'; END IF;
 IF EXISTS(SELECT 1 FROM public.withdrawal_history WHERE affiliate_id=a.id AND status='pending') THEN RAISE EXCEPTION 'Reconcile pending withdrawal first'; END IF;
 IF p_amount > coalesce(a.usd_available,0) THEN RAISE EXCEPTION 'Insufficient available balance'; END IF;
 INSERT INTO public.withdrawal_history(affiliate_id,amount,status,manual_reference,recorded_by)
 VALUES(a.id,p_amount,'completed',ref,auth.uid()) RETURNING * INTO w;
 UPDATE public.affiliates SET usd_available=usd_available-p_amount,usd_withdrawn=coalesce(usd_withdrawn,0)+p_amount,last_payout_at=now() WHERE id=a.id;
 RETURN w.id;
END $$;
REVOKE ALL ON FUNCTION public.record_manual_affiliate_payment(uuid,numeric,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_manual_affiliate_payment(uuid,numeric,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_manual_affiliate_payments()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'founder') THEN RAISE EXCEPTION 'Not authorized'; END IF;
 RETURN jsonb_build_object('affiliates',coalesce((SELECT jsonb_agg(row_to_json(x)) FROM (
   SELECT a.id,a.ref_code,p.email,a.usd_available,a.usd_earned,a.usd_withdrawn,a.payout_hold,
   EXISTS(SELECT 1 FROM withdrawal_history w WHERE w.affiliate_id=a.id AND w.status='pending') AS pending_withdrawal
   FROM affiliates a LEFT JOIN profiles p ON p.id=a.user_id ORDER BY a.usd_available DESC NULLS LAST
 ) x),'[]'::jsonb),'payments',coalesce((SELECT jsonb_agg(row_to_json(x)) FROM (
   SELECT w.id,a.ref_code,w.amount,w.manual_reference,w.created_at,w.recorded_by FROM withdrawal_history w JOIN affiliates a ON a.id=w.affiliate_id WHERE w.manual_reference IS NOT NULL ORDER BY w.created_at DESC LIMIT 100
 ) x),'[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.get_manual_affiliate_payments() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_manual_affiliate_payments() TO authenticated;

-- This release uses manual payouts exclusively. Automated workers cannot reserve funds.
CREATE OR REPLACE FUNCTION public.reserve_affiliate_payout(p_affiliate_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN RETURN NULL; END $$;
REVOKE ALL ON FUNCTION public.reserve_affiliate_payout(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_affiliate_payout(uuid) TO service_role;
