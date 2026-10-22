-- Apply only with the corresponding webhook deployment. No funds are transferred.
CREATE UNIQUE INDEX IF NOT EXISTS affiliate_payouts_invoice_once
  ON public.affiliate_payouts(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_affiliate_commission(
  p_referred_user_id uuid, p_code text, p_invoice_id text,
  p_amount_paid_cents integer, p_type text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; affiliate_id uuid; inserted_id uuid; amount numeric;
BEGIN
  IF p_amount_paid_cents <= 0 THEN RETURN false; END IF;
  IF p_invoice_id IS NULL OR p_invoice_id = '' OR p_type NOT IN ('initial','recurring') THEN
    RAISE EXCEPTION 'Invalid commission';
  END IF;
  SELECT user_id INTO owner_id FROM affiliate_codes WHERE code = upper(trim(p_code));
  IF owner_id IS NULL OR owner_id = p_referred_user_id THEN RETURN false; END IF;
  SELECT id INTO affiliate_id FROM affiliates WHERE user_id = owner_id FOR UPDATE;
  IF affiliate_id IS NULL THEN RAISE EXCEPTION 'Affiliate account missing'; END IF;
  amount := round(p_amount_paid_cents * 0.30) / 100;
  INSERT INTO affiliate_payouts(user_id_referred, affiliate_code, month, amount_paid,
    commission_affiliate, commission_agency, type, stripe_invoice_id, status)
  VALUES (p_referred_user_id, upper(trim(p_code)), to_char(now(),'YYYY-MM'),
    p_amount_paid_cents / 100.0, amount, 0, p_type, p_invoice_id, 'pending')
  ON CONFLICT (stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL DO NOTHING RETURNING id INTO inserted_id;
  IF inserted_id IS NULL THEN RETURN false; END IF;
  UPDATE affiliates SET usd_earned = coalesce(usd_earned,0) + amount,
    usd_available = coalesce(usd_available,0) + amount WHERE id = affiliate_id;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.record_affiliate_commission(uuid,text,text,integer,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_affiliate_commission(uuid,text,text,integer,text) TO service_role;
