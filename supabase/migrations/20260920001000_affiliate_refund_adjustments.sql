ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS payout_hold boolean NOT NULL DEFAULT false;
ALTER TABLE public.affiliate_payouts ADD COLUMN IF NOT EXISTS commission_reversed numeric NOT NULL DEFAULT 0;
CREATE OR REPLACE FUNCTION public.reconcile_affiliate_refund(p_invoice_id text, p_refunded_cents integer, p_charged_cents integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE ledger public.affiliate_payouts%rowtype; affiliate_id uuid; target numeric; delta numeric;
BEGIN
 IF p_charged_cents <= 0 OR p_refunded_cents < 0 OR p_refunded_cents > p_charged_cents THEN RAISE EXCEPTION 'Invalid refund amounts'; END IF;
 SELECT a.id INTO affiliate_id FROM affiliate_payouts p JOIN affiliate_codes c ON c.code=p.affiliate_code JOIN affiliates a ON a.user_id=c.user_id WHERE p.stripe_invoice_id=p_invoice_id;
 IF affiliate_id IS NULL THEN RETURN false; END IF;
 PERFORM id FROM affiliates WHERE id=affiliate_id FOR UPDATE;
 SELECT * INTO ledger FROM affiliate_payouts WHERE stripe_invoice_id=p_invoice_id FOR UPDATE;
 target := round(ledger.commission_affiliate*p_refunded_cents/p_charged_cents,2);
 -- Refund totals are monotonic. Reordered deliveries cannot restore a refunded commission.
 target := greatest(target, ledger.commission_reversed);
 delta := target-ledger.commission_reversed;
 IF delta=0 THEN RETURN false; END IF;
 UPDATE affiliate_payouts SET commission_reversed=target WHERE id=ledger.id;
 -- Negative available balances offset future commissions when money was already withdrawn.
 UPDATE affiliates SET usd_available=coalesce(usd_available,0)-delta,usd_earned=coalesce(usd_earned,0)-delta WHERE id=affiliate_id;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.reconcile_affiliate_refund(text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_affiliate_refund(text,integer,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_affiliate_payout(p_affiliate_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.affiliates%rowtype; w public.withdrawal_history%rowtype; amount numeric;
BEGIN
 SELECT * INTO a FROM affiliates WHERE id=p_affiliate_id FOR UPDATE;
 IF NOT FOUND OR a.payout_hold OR NOT coalesce(a.payouts_enabled,false) OR NOT coalesce(a.stripe_onboarding_complete,false) OR a.stripe_connect_id IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO w FROM withdrawal_history WHERE affiliate_id=a.id AND status='pending';
 IF NOT FOUND THEN
   amount := floor(coalesce(a.usd_available,0)*100)/100;
   IF amount < 50 THEN RETURN NULL; END IF;
   INSERT INTO withdrawal_history(affiliate_id,amount,status) VALUES(a.id,amount,'pending') RETURNING * INTO w;
   UPDATE affiliates SET usd_available=usd_available-amount WHERE id=a.id;
 END IF;
 RETURN jsonb_build_object('id',w.id,'amount',w.amount,'created_at',w.created_at,'destination',a.stripe_connect_id);
END $$;


-- Derive referrals from the same attribution and subscription records used by billing.
create or replace function public.get_affiliate_dashboard()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_aff record;
  v_result json;
begin
  if v_uid is null then
    return json_build_object('error', 'No autenticado');
  end if;

  select * into v_aff from public.affiliates where user_id = v_uid;

  if v_aff is null then
    return json_build_object('error', 'Sin cuenta de afiliado');
  end if;

  select json_build_object(
    'code', v_aff.ref_code,
    'code_customized', coalesce(v_aff.code_customized, false),
    'link_ready', v_aff.ref_code is not null,
    'connect_ready', coalesce(v_aff.stripe_onboarding_complete, false) AND coalesce(v_aff.payouts_enabled, false),
    'payout_hold', coalesce(v_aff.payout_hold,false),
    'has_connect', v_aff.stripe_connect_id is not null,
    'usd_earned', coalesce(v_aff.usd_earned, 0),
    'usd_available', coalesce(v_aff.usd_available, 0),
    'usd_withdrawn', coalesce(v_aff.usd_withdrawn, 0),
    'active_referrals', (SELECT count(*) FROM public.profiles p JOIN public.subscriptions sub ON sub.user_id=p.id WHERE p.referral_code_used=v_aff.ref_code AND sub.status='active' AND sub.stripe_subscription_id IS NOT NULL AND sub.price_usd>0),
    'referrals', coalesce((
      select json_agg(json_build_object(
        'email_masked',
          case
            when pr.email is null then 'usuario'
            else regexp_replace(pr.email, '(^.).*(@.*$)', '\1***\2')
          end,
        'status', coalesce(sub.status,'pending'),
        'since', pr.created_at,
        'monthly_commission', coalesce((SELECT ap.commission_affiliate-ap.commission_reversed FROM public.affiliate_payouts ap WHERE ap.user_id_referred=pr.id AND ap.affiliate_code=v_aff.ref_code ORDER BY ap.created_at DESC LIMIT 1),0)
      ) order by pr.created_at desc)
      from public.profiles pr
      left join public.subscriptions sub on sub.user_id=pr.id
      where pr.referral_code_used = v_aff.ref_code
    ), '[]'::json),
    'payouts_history', coalesce((
      select json_agg(json_build_object(
        'amount', round(coalesce(w.amount, 0)::numeric, 2),
        'status', w.status,
        'date', w.created_at
      ) order by w.created_at desc)
      from public.withdrawal_history w
      where w.affiliate_id = v_aff.id
    ), '[]'::json),
    'commissions_history', coalesce((
      select json_agg(json_build_object(
        'amount', round((coalesce(ap.commission_affiliate, 0)-coalesce(ap.commission_reversed,0))::numeric, 2),
        'type', ap.type,
        'month', ap.month,
        'status', ap.status,
        'date', ap.created_at
      ) order by ap.created_at desc)
      from public.affiliate_payouts ap
      where ap.affiliate_code = v_aff.ref_code
    ), '[]'::json)
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.get_affiliate_dashboard() to authenticated;
REVOKE ALL ON FUNCTION public.get_affiliate_dashboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_affiliate_dashboard() TO authenticated;
