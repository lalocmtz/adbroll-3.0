-- =============================================================================
-- SECURITY LOCKDOWN: Premium columns (transcript / variants / analysis / guion)
-- =============================================================================
-- PROBLEM: The paywall was CSS-only. Premium columns of `videos`
-- (transcript, variants_json, analysis_json) and `daily_feed`
-- (transcripcion_original, guion_ia, ai_variants) were shipped to ANY client
-- through the PostgREST REST API regardless of subscription status.
--
-- This migration blinds those columns at the DATABASE level:
--   1. Helper `is_paid_user(uuid)` (SECURITY DEFINER) to know if a user pays.
--   2. Column-level REVOKE on the premium columns for `anon` + `authenticated`.
--      PostgREST honors column privileges, so the REST API can no longer read
--      them. Card metadata (sales, views, thumbnails, etc.) stays readable.
--   3. Gated RPC `get_video_script(uuid)` (SECURITY DEFINER) that is the ONLY
--      sanctioned way to obtain a script:
--        - paid user            -> transcript + variants_json (full)
--        - free user, rank <= 5 -> transcript only, variants_json = null
--        - free user, rank > 5  -> locked = true, everything null
--   4. RLS hardening so the (now non-premium) card columns keep loading.
--
-- IMPORTANT: `service_role` is NOT affected by column REVOKEs (it bypasses
-- column privileges), so the admin ingestion/transcription pipeline that runs
-- through edge functions with the service key continues to write and read
-- these columns normally.
--
-- This migration is IDEMPOTENT and DEFENSIVE: every column REVOKE is wrapped in
-- its own exception-swallowing DO block so a missing column never aborts it.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Helper: is_paid_user(_uid)
-- -----------------------------------------------------------------------------
create or replace function public.is_paid_user(_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = _uid and s.status in ('active', 'trialing')
  ) or exists (
    select 1 from public.user_roles r
    where r.user_id = _uid and r.role = 'founder'
  ) or exists (
    select 1 from public.creator_program_applications c
    where c.user_id = _uid
      and c.status = 'approved'
      and (c.subscription_ends_at is null or c.subscription_ends_at > now())
  );
$$;

grant execute on function public.is_paid_user(uuid) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. Revoke column-level SELECT on premium columns for anon + authenticated.
--    service_role is intentionally untouched (admin pipeline).
--    Each column is isolated so a missing column cannot abort the migration.
-- -----------------------------------------------------------------------------
do $$ begin
  begin revoke select (transcript) on public.videos from anon, authenticated; exception when others then null; end;
  begin revoke select (variants_json) on public.videos from anon, authenticated; exception when others then null; end;
  begin revoke select (analysis_json) on public.videos from anon, authenticated; exception when others then null; end;

  begin revoke select (transcripcion_original) on public.daily_feed from anon, authenticated; exception when others then null; end;
  begin revoke select (guion_ia) on public.daily_feed from anon, authenticated; exception when others then null; end;
  begin revoke select (ai_variants) on public.daily_feed from anon, authenticated; exception when others then null; end;
end $$;

-- -----------------------------------------------------------------------------
-- 3. Gated RPC: get_video_script(_video_id)
--    The ONLY supported path for the client to obtain a script.
-- -----------------------------------------------------------------------------
create or replace function public.get_video_script(_video_id uuid)
returns table(locked boolean, transcript text, variants_json jsonb)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _paid boolean;
  _rank int;
begin
  _paid := public.is_paid_user(auth.uid());

  select v.rank into _rank
  from public.videos v
  where v.id = _video_id;

  if _paid then
    -- Paying user: full script + variants.
    return query
      select false, v.transcript, v.variants_json::jsonb
      from public.videos v
      where v.id = _video_id;
  elsif _rank is not null and _rank <= 5 then
    -- Free user, Top 5 of its market: transcript only, no AI variants.
    return query
      select false, v.transcript, null::jsonb
      from public.videos v
      where v.id = _video_id;
  else
    -- Free user, rank > 5 (or unknown): fully locked.
    return query select true, null::text, null::jsonb;
  end if;
end;
$$;

grant execute on function public.get_video_script(uuid) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. RLS hardening: keep the non-premium card columns readable.
--    The real protection is the column-level REVOKE above, NOT row access.
--    These policies are created only if absent, so existing policies survive.
-- -----------------------------------------------------------------------------
alter table public.videos enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'videos'
      and policyname = 'Public can read video cards'
  ) then
    create policy "Public can read video cards"
      on public.videos for select to anon, authenticated using (true);
  end if;
end $$;

-- products / product_opportunities have NO revoked columns; just make sure RLS
-- is enabled and a public read policy exists so cards keep loading.
do $$ begin
  begin alter table public.products enable row level security; exception when others then null; end;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'products'
      and policyname = 'Public can read products'
  ) then
    begin
      create policy "Public can read products"
        on public.products for select to anon, authenticated using (true);
    exception when others then null;
    end;
  end if;
end $$;

-- creators: same treatment (used by creator cards / related videos views).
do $$ begin
  begin alter table public.creators enable row level security; exception when others then null; end;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'creators'
      and policyname = 'Public can read creators'
  ) then
    begin
      create policy "Public can read creators"
        on public.creators for select to anon, authenticated using (true);
    exception when others then null;
    end;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 5. Founder-only admin readers for the premium columns.
--    The column-level REVOKE above also blinds the FOUNDER (who is just another
--    `authenticated` user via the anon key). The admin panel still needs the
--    full rows (transcript / variants_json / analysis_json, etc.), so we expose
--    them ONLY through these SECURITY DEFINER RPCs gated by the `founder` role.
--    Non-founders calling these get an exception, so no premium data leaks.
-- -----------------------------------------------------------------------------

-- Lectura premium para el panel admin (solo founders). SECURITY DEFINER + chequeo de rol.
create or replace function public.get_videos_admin(_ids uuid[] default null)
returns setof public.videos language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'founder') then
    raise exception 'not authorized';
  end if;
  return query select * from public.videos v
    where (_ids is null or v.id = any(_ids));
end; $$;
revoke all on function public.get_videos_admin(uuid[]) from public, anon;
grant execute on function public.get_videos_admin(uuid[]) to authenticated;

create or replace function public.get_daily_feed_admin(_ids uuid[] default null)
returns setof public.daily_feed language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'founder') then
    raise exception 'not authorized';
  end if;
  return query select * from public.daily_feed d where (_ids is null or d.id = any(_ids));
end; $$;
revoke all on function public.get_daily_feed_admin(uuid[]) from public, anon;
grant execute on function public.get_daily_feed_admin(uuid[]) to authenticated;

-- -----------------------------------------------------------------------------
-- 6. FIX CRÍTICO (aplicado en producción el 2026-06-10): en Postgres los
--    privilegios de COLUMNA son aditivos al privilegio de TABLA. El REVOKE de
--    columnas de la sección 2 no surte efecto si anon/authenticated conservan
--    SELECT a nivel tabla (default de Supabase). La solución correcta:
--    quitar el SELECT de tabla y conceder SELECT columna por columna
--    (dinámicamente, excluyendo las premium).
-- -----------------------------------------------------------------------------
revoke select on public.videos from anon, authenticated;
revoke select on public.daily_feed from anon, authenticated;

do $$
declare col text;
begin
  for col in
    select column_name from information_schema.columns
    where table_schema='public' and table_name='videos'
      and column_name not in ('transcript','variants_json','analysis_json')
  loop
    execute format('grant select (%I) on public.videos to anon, authenticated', col);
  end loop;

  for col in
    select column_name from information_schema.columns
    where table_schema='public' and table_name='daily_feed'
      and column_name not in ('transcripcion_original','guion_ia','ai_variants')
  loop
    execute format('grant select (%I) on public.daily_feed to anon, authenticated', col);
  end loop;
end $$;
