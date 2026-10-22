-- Read-only founder overview: aggregates before pagination, never exposes user data to visitors.
CREATE OR REPLACE FUNCTION public.get_founder_user_overview(
  p_search text DEFAULT '', p_filter text DEFAULT 'all', p_offset integer DEFAULT 0, p_limit integer DEFAULT 25
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'founder') THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF p_filter IS NULL OR p_filter NOT IN ('all','paid','unconfirmed','active_affiliates','ready_affiliates') THEN
    RAISE EXCEPTION 'Invalid filter';
  END IF;
  WITH subscription_state AS (
    SELECT s.user_id,
      bool_or(s.status = 'active' AND s.price_usd > 0 AND s.stripe_subscription_id ~ '^sub_'
        AND (s.renew_at IS NULL OR s.renew_at > now())) AS paid_active,
      bool_or(s.status = 'active' AND (s.price_usd = 0 OR s.stripe_subscription_id IS NULL OR s.stripe_subscription_id !~ '^sub_')
        AND (s.renew_at IS NULL OR s.renew_at > now())) AS complimentary_active,
      bool_or(s.status = 'trialing' AND (s.renew_at IS NULL OR s.renew_at > now())) AS trial_active
    FROM public.subscriptions s GROUP BY s.user_id
  ), users AS MATERIALIZED (
    SELECT u.id, coalesce(nullif(p.full_name,''), nullif(u.raw_user_meta_data->>'full_name',''), 'Sin nombre') AS full_name,
      u.email, u.created_at, u.email_confirmed_at IS NOT NULL AS email_confirmed,
      a.ref_code, p.referral_code_used,
      coalesce(s.paid_active,false) AS paid_active,
      coalesce(s.complimentary_active,false) OR EXISTS (
        SELECT 1 FROM public.creator_program_applications c WHERE c.user_id=u.id AND c.status='active'
          AND c.subscription_ends_at>=now()
      ) OR public.has_role(u.id,'founder') AS complimentary_active,
      coalesce(s.trial_active,false) AS trial_active
    FROM auth.users u LEFT JOIN public.profiles p ON p.id=u.id
    LEFT JOIN public.affiliates a ON a.user_id=u.id
    LEFT JOIN subscription_state s ON s.user_id=u.id
  ), referral_counts AS (
    -- Use the code owner, including historical aliases, just like the commission ledger.
    SELECT codes.user_id AS affiliate_user_id, count(*) AS registered, count(*) FILTER (WHERE u.paid_active) AS paid_active
    FROM users u JOIN public.affiliate_codes codes ON codes.code=u.referral_code_used
    WHERE codes.user_id<>u.id GROUP BY codes.user_id
  ), overview AS MATERIALIZED (
    SELECT u.*, coalesce(r.registered,0) AS referrals_registered, coalesce(r.paid_active,0) AS referrals_paid_active,
      CASE WHEN u.paid_active THEN 'paid' WHEN u.complimentary_active THEN 'complimentary'
           WHEN u.trial_active THEN 'trial' ELSE 'unsubscribed' END AS access_kind
    FROM users u LEFT JOIN referral_counts r ON r.affiliate_user_id=u.id
  ), filtered AS MATERIALIZED (
    SELECT * FROM overview o WHERE
      (coalesce(trim(p_search),'')='' OR position(lower(left(trim(p_search),200)) IN lower(concat_ws(' ',o.full_name,o.email,o.ref_code)))>0)
      AND (p_filter='all' OR (p_filter='paid' AND o.paid_active)
        OR (p_filter='unconfirmed' AND NOT o.email_confirmed)
        OR (p_filter='active_affiliates' AND o.ref_code IS NOT NULL AND o.referrals_paid_active>0)
        OR (p_filter='ready_affiliates' AND o.ref_code IS NOT NULL AND o.referrals_paid_active=0))
  ), page AS (
    SELECT * FROM filtered ORDER BY created_at DESC, id
    OFFSET greatest(coalesce(p_offset,0),0) LIMIT least(greatest(coalesce(p_limit,25),1),100)
  ) SELECT jsonb_build_object(
    'stats',(SELECT jsonb_build_object(
      'registered',count(*), 'email_confirmed',count(*) FILTER(WHERE email_confirmed),
      'paid_active',count(*) FILTER(WHERE paid_active),
      'complimentary_active',count(*) FILTER(WHERE complimentary_active AND NOT paid_active),
      'affiliate_codes',count(*) FILTER(WHERE ref_code IS NOT NULL),
      'active_affiliates',count(*) FILTER(WHERE ref_code IS NOT NULL AND referrals_paid_active>0)
    ) FROM overview),
    'total',(SELECT count(*) FROM filtered),
    'rows',coalesce((SELECT jsonb_agg(to_jsonb(page) ORDER BY created_at DESC,id) FROM page),'[]'::jsonb)
  ) INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_founder_user_overview(text,text,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_founder_user_overview(text,text,integer,integer) TO authenticated;
