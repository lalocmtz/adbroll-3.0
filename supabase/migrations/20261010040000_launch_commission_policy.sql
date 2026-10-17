-- New subscriptions only; the legacy RPC and historical balances remain unchanged.
ALTER TABLE public.affiliate_payouts ADD COLUMN IF NOT EXISTS commission_policy text NOT NULL DEFAULT 'legacy';
ALTER TABLE public.affiliate_payouts ADD COLUMN IF NOT EXISTS initial_reward boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS affiliate_initial_reward_once
  ON public.affiliate_payouts(user_id_referred) WHERE initial_reward;

CREATE OR REPLACE FUNCTION public.record_affiliate_commission_v2(
  p_referred_user_id uuid, p_code text, p_invoice_id text,
  p_amount_paid_cents integer, p_type text
) RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; affiliate_id uuid; inserted_id uuid; amount numeric; initial boolean;
BEGIN
  IF p_amount_paid_cents <= 0 THEN RETURN NULL; END IF;
  IF p_invoice_id IS NULL OR p_invoice_id = '' OR p_type NOT IN ('initial','recurring') THEN
    RAISE EXCEPTION 'Invalid commission';
  END IF;
  -- Serialize the initial reward per customer, even across repeated subscriptions.
  PERFORM 1 FROM profiles WHERE id=p_referred_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Referred profile missing'; END IF;
  SELECT user_id INTO owner_id FROM affiliate_codes WHERE code=upper(trim(p_code));
  IF owner_id IS NULL OR owner_id=p_referred_user_id THEN RETURN NULL; END IF;
  SELECT id INTO affiliate_id FROM affiliates WHERE user_id=owner_id FOR UPDATE;
  IF affiliate_id IS NULL THEN RAISE EXCEPTION 'Affiliate account missing'; END IF;
  initial := p_type='initial' AND NOT EXISTS (
    SELECT 1 FROM affiliate_payouts WHERE user_id_referred=p_referred_user_id AND (initial_reward OR type='initial')
  );
  amount := CASE WHEN initial THEN least(1500,p_amount_paid_cents)/100.0
                 ELSE round(p_amount_paid_cents*0.15)/100 END;
  INSERT INTO affiliate_payouts(user_id_referred,affiliate_code,month,amount_paid,
    commission_affiliate,commission_agency,type,stripe_invoice_id,status,commission_policy,initial_reward)
  VALUES(p_referred_user_id,upper(trim(p_code)),to_char(now(),'YYYY-MM'),p_amount_paid_cents/100.0,
    amount,0,CASE WHEN initial THEN 'initial' ELSE 'recurring' END,p_invoice_id,'pending','2026-10-10',initial)
  ON CONFLICT(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL DO NOTHING RETURNING id INTO inserted_id;
  IF inserted_id IS NULL THEN RETURN NULL; END IF;
  UPDATE affiliates SET usd_earned=coalesce(usd_earned,0)+amount,
    usd_available=coalesce(usd_available,0)+amount WHERE id=affiliate_id;
  RETURN amount;
END $$;
REVOKE ALL ON FUNCTION public.record_affiliate_commission_v2(uuid,text,text,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_affiliate_commission_v2(uuid,text,text,integer,text) TO service_role;
