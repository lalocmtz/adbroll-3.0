-- =============================================================================
-- AFFILIATES COMPLETE: cierra el programa de afiliados a medias.
-- =============================================================================
-- CONTEXTO / ESQUEMA REAL (verificado contra migraciones previas y types.ts):
--   * `affiliates` (user_id, ref_code, usd_earned, usd_available, usd_withdrawn,
--     active_referrals_count, stripe_connect_id, stripe_onboarding_complete,
--     last_payout_at). NO existe `code`, `usd_paid`, ni `payouts_enabled`:
--     el equivalente real es `usd_withdrawn` y `stripe_onboarding_complete`.
--   * Tabla SEPARADA `affiliate_codes` (code, user_id) que el webhook usa para
--     resolver comisiones (calculateAffiliateCommission busca por affiliate_codes).
--   * `affiliate_payouts` (affiliate_code, user_id_referred, amount_paid,
--     commission_affiliate, commission_agency, month) = ledger de comisiones.
--   * `affiliate_referrals` (code_used, referred_user_id) registra quién usó qué.
--   * `withdrawal_history` (affiliate_id, amount, stripe_transfer_id, status) =
--     historial de retiros (NO affiliate_payouts).
--   * profiles.referral_code_used guarda el código con que se registró cada user.
--   * Ya existe trigger `on_auth_user_created_affiliate` -> handle_new_user_affiliate
--     que SOLO inserta en `affiliates` (genera ref_code) pero NO en
--     `affiliate_codes`. ESE es el bug raíz: el webhook no encontraba el código.
--
-- DECISIONES (donde el esquema difería de lo pedido):
--   * "usd_paid" -> se mapea a la columna real `usd_withdrawn`.
--   * "payouts_enabled" -> se mapea a `stripe_onboarding_complete` (ya existe).
--     Se agrega igualmente `payouts_enabled` como columna espejo por si se quiere
--     usar en el futuro, pero el dashboard lee `stripe_onboarding_complete`.
--   * La idempotencia de comisiones recurrentes se implementa sobre la tabla real
--     `affiliate_payouts` agregando `stripe_invoice_id` + `type` + `status`.
--
-- IDEMPOTENTE y DEFENSIVA: columnas con IF NOT EXISTS, índices IF NOT EXISTS,
-- inserts con ON CONFLICT, funciones con CREATE OR REPLACE, policies envueltas
-- en DO blocks que ignoran duplicados.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Columnas que falten en `affiliates`
-- -----------------------------------------------------------------------------
alter table public.affiliates
  add column if not exists stripe_connect_id text,
  add column if not exists stripe_onboarding_complete boolean default false,
  add column if not exists payouts_enabled boolean default false,
  add column if not exists usd_withdrawn numeric default 0,
  add column if not exists code_customized boolean default false;

-- -----------------------------------------------------------------------------
-- 2. Columnas para comisiones recurrentes idempotentes en `affiliate_payouts`
-- -----------------------------------------------------------------------------
alter table public.affiliate_payouts
  add column if not exists type text default 'recurring',      -- 'initial' | 'recurring'
  add column if not exists stripe_invoice_id text,
  add column if not exists status text default 'pending';      -- pending | paid | failed

-- IDEMPOTENCIA: un mismo invoice de Stripe nunca paga comisión dos veces.
-- Índice único PARCIAL (solo cuando stripe_invoice_id no es null, para no chocar
-- con filas históricas que se insertaron sin invoice).
create unique index if not exists uq_affiliate_payouts_invoice
  on public.affiliate_payouts (stripe_invoice_id)
  where stripe_invoice_id is not null;

-- -----------------------------------------------------------------------------
-- 3. generate_affiliate_code(_seed): código legible a partir de nombre/email
-- -----------------------------------------------------------------------------
-- Acepta semilla OPCIONAL (default ''). Limpia no-alfanuméricos, recorta a 6
-- chars y agrega 2-3 dígitos aleatorios. Garantiza unicidad contra
-- affiliate_codes. El default '' permite que callers existentes que la invocan
-- sin argumentos (useReferralCode.ts) sigan funcionando: cae al fallback aleatorio.
-- NOTA: ya existía un public.generate_affiliate_code() sin args. Lo eliminamos
-- para evitar ambigüedad de sobrecarga al llamar sin argumentos.
drop function if exists public.generate_affiliate_code();

create or replace function public.generate_affiliate_code(_seed text default '')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  base_part text;
  candidate text;
  exists_code boolean;
  attempts int := 0;
begin
  -- Limpia: solo A-Z0-9, mayúsculas, toma los primeros 6 chars del seed.
  base_part := upper(regexp_replace(coalesce(_seed, ''), '[^a-zA-Z0-9]', '', 'g'));
  base_part := substring(base_part from 1 for 6);

  -- Si el seed quedó muy corto (o vacío), rellena con base aleatoria.
  if length(base_part) < 3 then
    base_part := base_part || upper(substring(md5(random()::text) from 1 for 4));
    base_part := substring(base_part from 1 for 6);
  end if;

  loop
    -- 2-3 dígitos aleatorios (10-999) -> total 5-9 chars (dentro de 4-12).
    candidate := base_part || (floor(random() * 990 + 10))::int::text;
    candidate := substring(candidate from 1 for 12);
    select exists(select 1 from public.affiliate_codes where code = candidate) into exists_code;
    exit when not exists_code;
    attempts := attempts + 1;
    if attempts > 25 then
      -- Fallback ultra-seguro: aleatorio puro.
      candidate := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    end if;
  end loop;

  return candidate;
end;
$$;

grant execute on function public.generate_affiliate_code(text) to authenticated, anon, service_role;

-- -----------------------------------------------------------------------------
-- 4. Trigger: al crear usuario, sembrar affiliates + affiliate_codes
-- -----------------------------------------------------------------------------
-- NO duplicamos el handle_new_user existente. Reemplazamos la función del trigger
-- de afiliados ya existente (handle_new_user_affiliate) para que TAMBIÉN cree la
-- fila en affiliate_codes con el MISMO código, que es lo que el webhook necesita.
create or replace function public.handle_new_user_affiliate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seed text;
  v_code text;
begin
  -- Semilla legible: full_name si existe, si no la parte local del email.
  v_seed := coalesce(
    nullif(new.raw_user_meta_data->>'full_name', ''),
    split_part(coalesce(new.email, ''), '@', 1),
    'AFF'
  );
  v_code := public.generate_affiliate_code(v_seed);

  -- affiliates: idempotente por user_id.
  insert into public.affiliates (user_id, ref_code)
  values (new.id, v_code)
  on conflict (user_id) do nothing;

  -- affiliate_codes: idempotente por user_id, mismo código que affiliates.
  -- Reusa el ref_code real por si la fila de affiliates ya existía con otro código.
  insert into public.affiliate_codes (user_id, code)
  select new.id, a.ref_code
  from public.affiliates a
  where a.user_id = new.id
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- El trigger `on_auth_user_created_affiliate` ya existe y apunta a esta función.
-- Lo recreamos defensivamente por si no existiera en algún entorno.
drop trigger if exists on_auth_user_created_affiliate on auth.users;
create trigger on_auth_user_created_affiliate
  after insert on auth.users
  for each row execute function public.handle_new_user_affiliate();

-- -----------------------------------------------------------------------------
-- 5. Backfill: usuarios existentes sin fila de affiliates / affiliate_codes
-- -----------------------------------------------------------------------------
-- 5a. affiliates faltantes (usa email/profile como semilla).
insert into public.affiliates (user_id, ref_code)
select u.id, public.generate_affiliate_code(
         coalesce(nullif(p.full_name, ''), split_part(coalesce(u.email, ''), '@', 1), 'AFF')
       )
from auth.users u
left join public.profiles p on p.id = u.id
where not exists (select 1 from public.affiliates a where a.user_id = u.id);

-- 5b. affiliate_codes faltantes: copia el ref_code real de affiliates.
insert into public.affiliate_codes (user_id, code)
select a.user_id, a.ref_code
from public.affiliates a
where not exists (select 1 from public.affiliate_codes c where c.user_id = a.user_id);

-- -----------------------------------------------------------------------------
-- 6. RPC update_affiliate_code(_new_code): cambiar el código UNA sola vez
-- -----------------------------------------------------------------------------
create or replace function public.update_affiliate_code(_new_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_clean text;
  v_already boolean;
  v_taken boolean;
begin
  if v_uid is null then
    return json_build_object('success', false, 'error', 'No autenticado');
  end if;

  -- Normaliza: mayúsculas, solo alfanumérico.
  v_clean := upper(regexp_replace(coalesce(_new_code, ''), '[^a-zA-Z0-9]', '', 'g'));

  if length(v_clean) < 4 or length(v_clean) > 12 then
    return json_build_object('success', false, 'error', 'El código debe tener 4-12 caracteres alfanuméricos');
  end if;

  -- ¿Ya personalizó su código antes?
  select code_customized into v_already from public.affiliates where user_id = v_uid;
  if v_already is true then
    return json_build_object('success', false, 'error', 'Ya personalizaste tu código');
  end if;

  -- ¿El código está tomado por OTRO usuario?
  select exists(
    select 1 from public.affiliate_codes where code = v_clean and user_id <> v_uid
  ) into v_taken;
  if v_taken then
    return json_build_object('success', false, 'error', 'Ese código ya está en uso');
  end if;

  -- Actualiza ambas tablas + marca como personalizado.
  update public.affiliate_codes set code = v_clean where user_id = v_uid;
  update public.affiliates
    set ref_code = v_clean, code_customized = true
    where user_id = v_uid;

  return json_build_object('success', true, 'code', v_clean);
end;
$$;

grant execute on function public.update_affiliate_code(text) to authenticated;

-- -----------------------------------------------------------------------------
-- 7. RPC get_affiliate_dashboard(): snapshot completo para auth.uid()
-- -----------------------------------------------------------------------------
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
    'connect_ready', coalesce(v_aff.stripe_onboarding_complete, false),
    'has_connect', v_aff.stripe_connect_id is not null,
    'usd_earned', coalesce(v_aff.usd_earned, 0),
    'usd_available', coalesce(v_aff.usd_available, 0),
    'usd_withdrawn', coalesce(v_aff.usd_withdrawn, 0),
    'active_referrals', coalesce(v_aff.active_referrals_count, 0),
    'referrals', coalesce((
      select json_agg(json_build_object(
        'email_masked',
          case
            when pr.email is null then 'usuario'
            else regexp_replace(pr.email, '(^.).*(@.*$)', '\1***\2')
          end,
        'status', r.status,
        'since', r.date,
        'monthly_commission', round(coalesce(r.earned_usd, 0)::numeric, 2)
      ) order by r.date desc)
      from public.referrals r
      left join public.profiles pr on pr.id = r.referred_user_id
      where r.affiliate_id = v_aff.id
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

-- -----------------------------------------------------------------------------
-- 8. RLS: el afiliado lee SU fila y SUS comisiones. (idempotente)
-- -----------------------------------------------------------------------------
-- affiliates: policy SELECT por user_id ya existe ("Users can view own affiliate
-- data"). withdrawal_history y referrals también ya tienen SELECT por join.
-- Falta affiliate_payouts: hoy solo tiene policy de service_role. Agregamos
-- SELECT para que el afiliado vea sus comisiones (via su ref_code).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'affiliate_payouts'
      and policyname = 'Affiliates can view own commissions'
  ) then
    create policy "Affiliates can view own commissions"
      on public.affiliate_payouts
      for select
      using (
        exists (
          select 1 from public.affiliates a
          where a.ref_code = affiliate_payouts.affiliate_code
            and a.user_id = auth.uid()
        )
      );
  end if;
end$$;
