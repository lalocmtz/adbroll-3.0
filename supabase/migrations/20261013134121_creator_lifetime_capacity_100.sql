-- First 100 approved creators only. A registration, preview or submission does not reserve a place.
-- Serialize the backfill against approvals so no existing entitlement is omitted.
LOCK TABLE public.creator_program_applications IN ACCESS EXCLUSIVE MODE;

CREATE TABLE public.creator_lifetime_capacity_state (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  claimed integer NOT NULL DEFAULT 0 CHECK (claimed BETWEEN 0 AND 100)
);
CREATE TABLE public.creator_lifetime_places (
  place_number integer PRIMARY KEY CHECK (place_number BETWEEN 1 AND 100),
  application_id uuid NOT NULL UNIQUE,
  user_id uuid UNIQUE,
  claimed_at timestamptz NOT NULL DEFAULT now()
);
-- Deliberately no foreign keys: removing an account/application must not reopen a place.
ALTER TABLE public.creator_lifetime_capacity_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_lifetime_places ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.creator_lifetime_capacity_state, public.creator_lifetime_places FROM PUBLIC, anon, authenticated, service_role;

DO $$ BEGIN
  IF (SELECT count(*) FROM public.creator_program_applications
      WHERE access_kind='lifetime' AND (approved_at IS NOT NULL OR status IN ('approved','active')))>100 THEN
    RAISE EXCEPTION 'Ya existen más de 100 aprobaciones vitalicias. Requiere revisión antes de activar el cupo.';
  END IF;
END $$;
INSERT INTO public.creator_lifetime_places(place_number,application_id,user_id,claimed_at)
  SELECT row_number() OVER (ORDER BY coalesce(approved_at,created_at),id)::integer,id,user_id,coalesce(approved_at,created_at,now())
  FROM public.creator_program_applications
  WHERE access_kind='lifetime' AND (approved_at IS NOT NULL OR status IN ('approved','active'));
INSERT INTO public.creator_lifetime_capacity_state(singleton,claimed)
  SELECT true,count(*)::integer FROM public.creator_lifetime_places;

CREATE OR REPLACE FUNCTION public.prevent_creator_lifetime_place_removal()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Las plazas vitalicias asignadas son permanentes; no pueden reabrirse.';
END $$;
REVOKE ALL ON FUNCTION public.prevent_creator_lifetime_place_removal() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER creator_lifetime_places_immutable BEFORE UPDATE OR DELETE ON public.creator_lifetime_places
  FOR EACH ROW EXECUTE FUNCTION public.prevent_creator_lifetime_place_removal();
CREATE TRIGGER creator_lifetime_places_no_truncate BEFORE TRUNCATE ON public.creator_lifetime_places
  FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_creator_lifetime_place_removal();
CREATE TRIGGER creator_lifetime_state_no_delete BEFORE DELETE ON public.creator_lifetime_capacity_state
  FOR EACH ROW EXECUTE FUNCTION public.prevent_creator_lifetime_place_removal();
CREATE TRIGGER creator_lifetime_state_no_truncate BEFORE TRUNCATE ON public.creator_lifetime_capacity_state
  FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_creator_lifetime_place_removal();

CREATE OR REPLACE FUNCTION public.enforce_creator_lifetime_counter_growth()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.singleton IS DISTINCT FROM OLD.singleton OR NEW.claimed<>OLD.claimed+1 THEN
    RAISE EXCEPTION 'El contador de plazas vitalicias solo puede avanzar una plaza.';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_creator_lifetime_counter_growth() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER creator_lifetime_counter_monotonic BEFORE UPDATE ON public.creator_lifetime_capacity_state
  FOR EACH ROW EXECUTE FUNCTION public.enforce_creator_lifetime_counter_growth();

-- The database boundary also covers legacy redemption and trusted service writes, not just the UI RPC.
CREATE OR REPLACE FUNCTION public.claim_creator_lifetime_place()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_place public.creator_lifetime_places%ROWTYPE; v_number integer;
BEGIN
  IF NEW.access_kind<>'lifetime' OR (NEW.approved_at IS NULL AND NEW.status NOT IN ('approved','active')) THEN RETURN NEW; END IF;
  SELECT * INTO v_place FROM public.creator_lifetime_places WHERE application_id=NEW.id;
  IF FOUND THEN
    IF v_place.user_id IS NOT NULL AND NEW.user_id IS NOT NULL AND v_place.user_id<>NEW.user_id THEN
      RAISE EXCEPTION 'La plaza vitalicia no puede transferirse a otra cuenta.';
    END IF;
    RETURN NEW;
  END IF;
  -- PostgreSQL rechecks this predicate after a concurrent updater releases the row lock.
  -- The counter, ledger insertion and approval commit together; failures consume no place.
  UPDATE public.creator_lifetime_capacity_state SET claimed=claimed+1 WHERE singleton AND claimed<100 RETURNING claimed INTO v_number;
  IF NOT FOUND THEN RAISE EXCEPTION 'Se agotaron los 100 lugares de acceso vitalicio. Las solicitudes pendientes no reservan plaza.'; END IF;
  INSERT INTO public.creator_lifetime_places(place_number,application_id,user_id,claimed_at)
    VALUES(v_number,NEW.id,NEW.user_id,coalesce(NEW.approved_at,now()));
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.claim_creator_lifetime_place() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER creator_lifetime_claim_place BEFORE INSERT OR UPDATE ON public.creator_program_applications
  FOR EACH ROW EXECUTE FUNCTION public.claim_creator_lifetime_place();

CREATE OR REPLACE FUNCTION public.get_creator_lifetime_capacity()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('limit',100,'claimed',claimed,'remaining',100-claimed,'is_open',claimed<100)
    FROM public.creator_lifetime_capacity_state WHERE singleton;
$$;
REVOKE ALL ON FUNCTION public.get_creator_lifetime_capacity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_creator_lifetime_capacity() TO anon,authenticated,service_role;

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
  -- Lock the shared capacity row after the application, matching the approval lock order.
  -- Existing claimed applications may be corrected without requesting another place.
  IF NOT EXISTS(SELECT 1 FROM public.creator_lifetime_places WHERE application_id=v_application.id) THEN
    PERFORM 1 FROM public.creator_lifetime_capacity_state WHERE singleton AND claimed<100 FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Se agotaron los 100 lugares de acceso vitalicio. Las solicitudes pendientes no reservan plaza.'; END IF;
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

