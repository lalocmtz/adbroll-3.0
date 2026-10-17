-- Creator access is an explicit, reviewed entitlement. NULL expiry alone never grants access.
ALTER TABLE public.creator_program_applications
  ADD COLUMN access_kind text NOT NULL DEFAULT 'limited' CHECK (access_kind IN ('limited','lifetime')),
  ADD COLUMN video_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN ad_permission_at timestamptz,
  ADD COLUMN ad_license_months integer CHECK (ad_license_months = 12),
  ADD COLUMN ad_license_ends_at timestamptz;

-- All changes go through bounded RPCs. Prevent applicant self-approval/forged consent timestamps.
REVOKE INSERT, UPDATE, DELETE ON public.creator_program_applications FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_creator_lifetime_application(
  p_full_name text, p_whatsapp text, p_tiktok_url text, p_video_urls text[], p_ad_permission boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user auth.users%ROWTYPE; v_application public.creator_program_applications%ROWTYPE; v_urls text[];
BEGIN
  SELECT * INTO v_user FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL;
  IF v_user.id IS NULL THEN RAISE EXCEPTION 'Confirma tu correo e inicia sesión para solicitar acceso.' USING ERRCODE='42501'; END IF;
  IF length(trim(p_full_name)) NOT BETWEEN 2 AND 100 OR length(trim(p_whatsapp)) NOT BETWEEN 10 AND 20
    OR p_full_name IS NULL OR p_whatsapp IS NULL THEN RAISE EXCEPTION 'Revisa tu nombre y WhatsApp.'; END IF;
  IF p_tiktok_url IS NULL OR length(p_tiktok_url)>500 OR p_tiktok_url !~ '^https://(www\.)?tiktok\.com/@[^/?#[:space:]]+' THEN
    RAISE EXCEPTION 'Ingresa el enlace HTTPS de tu perfil de TikTok.';
  END IF;
  SELECT array_agg(trim(u)) INTO v_urls FROM unnest(p_video_urls) u;
  IF cardinality(v_urls) IS DISTINCT FROM 3 OR (SELECT count(DISTINCT split_part(split_part(u,'?',1),'#',1)) FROM unnest(v_urls) u)<>3
    OR EXISTS(SELECT 1 FROM unnest(v_urls) u WHERE u IS NULL OR length(u)>1000 OR
      u !~ '^https://((www\.)?tiktok\.com/@[^/[:space:]]+/video/[0-9]+|(vm|vt)\.tiktok\.com/[^/?#[:space:]]+|(www\.)?instagram\.com/(reel|p)/[^/?#[:space:]]+|(www\.)?youtube\.com/shorts/[^/?#[:space:]]+)([/?#].*)?$') THEN
    RAISE EXCEPTION 'Incluye tres enlaces distintos a videos publicados en TikTok, Instagram o YouTube Shorts.';
  END IF;
  IF p_ad_permission IS DISTINCT FROM true THEN RAISE EXCEPTION 'Debes autorizar el uso de tus tres videos en pauta durante 12 meses.'; END IF;
  -- Serialize even first-time submissions, and bind the application to a verified account email.
  PERFORM 1 FROM auth.users WHERE id=v_user.id FOR UPDATE;
  SELECT * INTO v_application FROM public.creator_program_applications WHERE lower(email)=lower(v_user.email) FOR UPDATE;
  IF FOUND AND v_application.access_kind='lifetime' AND v_application.status IN ('approved','active') THEN
    RAISE EXCEPTION 'Tu acceso ya fue aprobado. Contáctanos si necesitas modificarlo.';
  END IF;
  IF v_application.id IS NULL THEN
    INSERT INTO public.creator_program_applications(email,full_name,whatsapp,tiktok_url,user_id,status,video_urls,video_url,ad_permission_at,ad_license_months)
      VALUES(lower(v_user.email),trim(p_full_name),trim(p_whatsapp),trim(p_tiktok_url),v_user.id,'pending_review',v_urls,v_urls[1],now(),12)
      RETURNING * INTO v_application;
  ELSE
    UPDATE public.creator_program_applications SET full_name=trim(p_full_name),whatsapp=trim(p_whatsapp),tiktok_url=trim(p_tiktok_url),user_id=v_user.id,
      status='pending_review',video_urls=v_urls,video_url=v_urls[1],ad_permission_at=now(),ad_license_months=12
      WHERE id=v_application.id RETURNING * INTO v_application;
  END IF;
  RETURN jsonb_build_object('id',v_application.id,'status',v_application.status);
END $$;
REVOKE ALL ON FUNCTION public.submit_creator_lifetime_application(text,text,text,text[],boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_creator_lifetime_application(text,text,text,text[],boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_creator_lifetime_application(p_application_id uuid,p_approve boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_application public.creator_program_applications%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'founder') THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_application FROM public.creator_program_applications WHERE id=p_application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitud no encontrada.'; END IF;
  IF p_approve IS NULL THEN RAISE EXCEPTION 'Elige aprobar o rechazar.'; END IF;
  IF p_approve AND v_application.status='active' AND v_application.access_kind='lifetime' THEN
    RETURN jsonb_build_object('status','active','access_kind','lifetime','grant_code',v_application.grant_code);
  END IF;
  IF v_application.status NOT IN ('pending_review','pending_video','rejected') THEN RAISE EXCEPTION 'La solicitud ya fue revisada.'; END IF;
  IF NOT p_approve THEN
    UPDATE public.creator_program_applications SET status='rejected' WHERE id=p_application_id;
    RETURN jsonb_build_object('status','rejected');
  END IF;
  IF v_application.status<>'pending_review' OR cardinality(v_application.video_urls)<>3 OR v_application.ad_permission_at IS NULL
    OR v_application.ad_license_months IS DISTINCT FROM 12 OR v_application.user_id IS NULL
    OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=v_application.user_id AND email_confirmed_at IS NOT NULL AND lower(email)=lower(v_application.email)) THEN
    RAISE EXCEPTION 'Faltan tres videos, autorización de pauta o correo verificado del creador.';
  END IF;
  UPDATE public.creator_program_applications SET status='active',access_kind='lifetime',approved_by=auth.uid(),approved_at=now(),
    grant_code=coalesce(grant_code,public.generate_grant_code()),subscription_starts_at=now(),subscription_ends_at=NULL,
    ad_license_ends_at=now()+interval '12 months'
    WHERE id=p_application_id RETURNING * INTO v_application;
  RETURN jsonb_build_object('status',v_application.status,'access_kind',v_application.access_kind,'grant_code',v_application.grant_code);
END $$;
REVOKE ALL ON FUNCTION public.review_creator_lifetime_application(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_creator_lifetime_application(uuid,boolean) TO authenticated;

-- Legacy issued codes remain usable, but redemption is now atomic and email-bound.
CREATE OR REPLACE FUNCTION public.redeem_creator_access(p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user auth.users%ROWTYPE; v_application public.creator_program_applications%ROWTYPE;
BEGIN
  SELECT * INTO v_user FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL;
  IF v_user.id IS NULL THEN RAISE EXCEPTION 'Confirma tu correo e inicia sesión.' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_application FROM public.creator_program_applications WHERE grant_code=upper(trim(p_code)) FOR UPDATE;
  IF NOT FOUND OR lower(v_application.email)<>lower(v_user.email) OR (v_application.user_id IS NOT NULL AND v_application.user_id<>v_user.id)
    OR v_application.status NOT IN ('approved','active') THEN RAISE EXCEPTION 'Código no disponible para esta cuenta.' USING ERRCODE='42501'; END IF;
  IF v_application.status='approved' THEN
    UPDATE public.creator_program_applications SET user_id=v_user.id,status='active',subscription_starts_at=now(),
      subscription_ends_at=CASE WHEN access_kind='lifetime' AND approved_at IS NOT NULL THEN NULL
        ELSE now()+make_interval(days=>greatest(coalesce(granted_days,30),1)) END
      WHERE id=v_application.id RETURNING * INTO v_application;
  END IF;
  IF (v_application.access_kind='limited' AND (v_application.subscription_ends_at IS NULL OR v_application.subscription_ends_at<=now()))
    OR (v_application.access_kind='lifetime' AND v_application.approved_at IS NULL) THEN
    RAISE EXCEPTION 'Este acceso ya no está disponible. Contacta a TokXray.';
  END IF;
  RETURN jsonb_build_object('access_kind',v_application.access_kind,'subscription_ends_at',v_application.subscription_ends_at);
END $$;
REVOKE ALL ON FUNCTION public.redeem_creator_access(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.redeem_creator_access(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_paid_user(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.subscriptions s WHERE s.user_id=_uid AND s.status IN ('active','trialing')
      AND (s.renew_at IS NULL OR s.renew_at>now()))
    OR EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=_uid AND r.role='founder')
    OR EXISTS(SELECT 1 FROM public.creator_program_applications c WHERE c.user_id=_uid
      AND ((c.status='active' AND c.access_kind='lifetime' AND c.approved_at IS NOT NULL AND c.subscription_ends_at IS NULL)
        OR (c.status IN ('active','approved','pending_review','rejected') AND c.access_kind='limited' AND c.subscription_ends_at>now())));
$$;

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
        SELECT 1 FROM public.creator_program_applications c WHERE c.user_id=u.id AND c.status IN ('active','approved','pending_review','rejected')
          AND ((c.status='active' AND c.access_kind='lifetime' AND c.approved_at IS NOT NULL AND c.subscription_ends_at IS NULL) OR (c.access_kind='limited' AND c.subscription_ends_at>now()))
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

REVOKE ALL ON FUNCTION public.is_paid_user(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.is_paid_user(uuid) TO service_role;

-- Invited creators can record their deliverables without first purchasing Pro.
-- Only a founder can grant/extend this finite preview to an already verified account.
CREATE OR REPLACE FUNCTION public.grant_creator_preview(p_email text,p_days integer DEFAULT 7)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user auth.users%ROWTYPE; v_application public.creator_program_applications%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'founder') THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
  IF p_days IS NULL OR p_days NOT BETWEEN 1 AND 30 THEN RAISE EXCEPTION 'El acceso de prueba debe durar de 1 a 30 días.'; END IF;
  SELECT * INTO v_user FROM auth.users WHERE lower(email)=lower(trim(p_email)) AND email_confirmed_at IS NOT NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El creador debe crear su cuenta y confirmar ese correo primero.'; END IF;
  SELECT * INTO v_application FROM public.creator_program_applications WHERE lower(email)=lower(v_user.email) FOR UPDATE;
  IF FOUND AND v_application.access_kind='lifetime' AND v_application.status='active' THEN RAISE EXCEPTION 'La cuenta ya tiene acceso vitalicio.'; END IF;
  IF v_application.id IS NULL THEN
    INSERT INTO public.creator_program_applications(email,full_name,whatsapp,tiktok_url,user_id,status,access_kind,granted_days,approved_by,approved_at,subscription_starts_at,subscription_ends_at)
      VALUES(lower(v_user.email),coalesce(nullif(v_user.raw_user_meta_data->>'full_name',''),'Creador invitado'),NULL,'',v_user.id,'active','limited',p_days,auth.uid(),now(),now(),now()+make_interval(days=>p_days))
      RETURNING * INTO v_application;
  ELSE
    UPDATE public.creator_program_applications SET user_id=v_user.id,
      status=CASE WHEN status IN ('pending_review','rejected') THEN status ELSE 'active' END,
      access_kind='limited',granted_days=p_days,approved_by=auth.uid(),approved_at=now(),
      subscription_starts_at=coalesce(subscription_starts_at,now()),
      subscription_ends_at=greatest(subscription_ends_at,now()+make_interval(days=>p_days))
      WHERE id=v_application.id RETURNING * INTO v_application;
  END IF;
  RETURN jsonb_build_object('id',v_application.id,'subscription_ends_at',v_application.subscription_ends_at,'access_kind','limited');
END $$;
REVOKE ALL ON FUNCTION public.grant_creator_preview(text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.grant_creator_preview(text,integer) TO authenticated;
