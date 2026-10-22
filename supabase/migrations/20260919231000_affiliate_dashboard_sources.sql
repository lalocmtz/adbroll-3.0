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
        'monthly_commission', coalesce((SELECT ap.commission_affiliate FROM public.affiliate_payouts ap WHERE ap.user_id_referred=pr.id AND ap.affiliate_code=v_aff.ref_code ORDER BY ap.created_at DESC LIMIT 1),0)
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
        'amount', round(coalesce(ap.commission_affiliate, 0)::numeric, 2),
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
