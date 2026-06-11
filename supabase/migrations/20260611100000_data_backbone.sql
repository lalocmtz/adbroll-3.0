-- =============================================================================
-- DATA BACKBONE (Ola 3): llaves naturales, snapshots, rankings diarios,
-- aliases de producto y soporte para el matching de 4 capas (match-videos).
-- =============================================================================
-- Bloques:
--   1.  videos.tiktok_video_id (llave natural TikTok) + backfill + índice único
--   2.  videos.match_source / suggested_product_id / match_reason + backfill
--   3.  products.tiktok_product_id: índice único parcial + backfill desde URL
--   4.  Tabla product_snapshots (histórico de métricas por import)
--   5.  Tabla daily_rankings (ranking del día por mercado)
--   6.  Tabla product_aliases (alias confirmados -> matching capa 0)
--   7.  Extensión pg_trgm + índice trigram sobre products.producto_nombre
--   8.  Función inmutable normalize_title(text)
--   9.  products.nombre_normalizado + trigger + backfill + índice trigram
--   10. RPCs: confirm_video_match / reject_video_match / find_similar_products
--   11. imports: columnas de telemetría (market, contadores, finished_at)
--   12. Grants de columna en videos (necesario por el lockdown 20260610120000,
--       que revocó el SELECT de tabla y concede columna por columna)
--
-- TODO el archivo es idempotente y defensivo (if not exists / or replace /
-- DO blocks que tragan excepciones), siguiendo el patrón de 20260610120000.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. videos.tiktok_video_id: llave natural extraída de la URL de TikTok.
--    El backfill es defensivo: elige UN solo dueño por id (distinct on) y no
--    pisa ids ya asignados, para nunca violar el índice único parcial.
-- -----------------------------------------------------------------------------
alter table public.videos add column if not exists tiktok_video_id text;

-- Limpia duplicados pre-existentes (conserva la fila importada más reciente)
-- para que la creación del índice único nunca falle.
with d as (
  select id,
         row_number() over (
           partition by tiktok_video_id
           order by imported_at desc nulls last, id
         ) as rn
  from public.videos
  where tiktok_video_id is not null
)
update public.videos v
set tiktok_video_id = null
from d
where v.id = d.id and d.rn > 1;

-- Backfill desde video_url (patrón .../video/<dígitos>), un solo row por id.
update public.videos v
set tiktok_video_id = c.tid
from (
  select distinct on (tid) id, tid
  from (
    select id, substring(video_url from '/video/(\d+)') as tid
    from public.videos
    where tiktok_video_id is null
      and video_url ~ '/video/\d+'
  ) s
  where s.tid is not null
    and not exists (
      select 1 from public.videos vx where vx.tiktok_video_id = s.tid
    )
  order by tid, id
) c
where v.id = c.id;

create unique index if not exists idx_videos_tiktok_video_id_unique
  on public.videos (tiktok_video_id)
  where tiktok_video_id is not null;


-- -----------------------------------------------------------------------------
-- 2. videos.match_source: procedencia del match video<->producto.
--    Valores: 'exact' | 'fuzzy' | 'ai' | 'review' | 'manual' | 'none' | null.
--    suggested_product_id / match_reason: cola de revisión de la capa IA
--    (confianza 0.6-0.9 -> el founder confirma o rechaza vía RPC).
-- -----------------------------------------------------------------------------
alter table public.videos add column if not exists match_source text;
alter table public.videos add column if not exists suggested_product_id uuid references public.products(id) on delete set null;
alter table public.videos add column if not exists match_reason text;

create index if not exists idx_videos_match_source on public.videos (match_source);
create index if not exists idx_videos_country_product on public.videos (country, product_id);

-- Backfill de match_source para filas históricas:
--   manual_match = true                          -> 'manual'
--   product_id + ai_match_confidence presentes   -> 'ai'
--   product_id sin confianza                     -> 'exact' (matching viejo determinista)
--   product_id null                              -> null (pendiente de procesar)
update public.videos set match_source = 'manual'
where match_source is null and manual_match = true;

update public.videos set match_source = 'ai'
where match_source is null and product_id is not null and ai_match_confidence is not null;

update public.videos set match_source = 'exact'
where match_source is null and product_id is not null;


-- -----------------------------------------------------------------------------
-- 3. products.tiktok_product_id: índice único parcial + backfill desde
--    producto_url (patrón .../product/<dígitos>, mismo regex que
--    extractTikTokProductId en supabase/functions/_shared/kalodata.ts).
-- -----------------------------------------------------------------------------
-- Limpia duplicados pre-existentes (conserva la fila más reciente).
with d as (
  select id,
         row_number() over (
           partition by tiktok_product_id
           order by updated_at desc nulls last, id
         ) as rn
  from public.products
  where tiktok_product_id is not null
)
update public.products p
set tiktok_product_id = null
from d
where p.id = d.id and d.rn > 1;

-- Backfill defensivo: un solo dueño por id extraído.
update public.products p
set tiktok_product_id = c.tid
from (
  select distinct on (tid) id, tid
  from (
    select id, substring(producto_url from '/product/(\d+)') as tid
    from public.products
    where tiktok_product_id is null
      and producto_url ~ '/product/\d+'
  ) s
  where s.tid is not null
    and not exists (
      select 1 from public.products px where px.tiktok_product_id = s.tid
    )
  order by tid, id
) c
where p.id = c.id;

create unique index if not exists idx_products_tiktok_product_id_unique
  on public.products (tiktok_product_id)
  where tiktok_product_id is not null;


-- -----------------------------------------------------------------------------
-- 4. product_snapshots: foto de métricas en cada import de productos.
--    Solo escribe service_role (sin policies de escritura). Lectura para
--    authenticated (la usará la UI de tendencias).
-- -----------------------------------------------------------------------------
create table if not exists public.product_snapshots (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  captured_at timestamptz not null default now(),
  revenue_30d numeric,
  gmv_30d_mxn numeric,
  creators_count int,
  total_ventas numeric,
  commission numeric,
  rank int
);

create index if not exists idx_product_snapshots_product_captured
  on public.product_snapshots (product_id, captured_at desc);

alter table public.product_snapshots enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'product_snapshots'
      and policyname = 'Authenticated can read product snapshots'
  ) then
    create policy "Authenticated can read product snapshots"
      on public.product_snapshots for select to authenticated using (true);
  end if;
end $$;


-- -----------------------------------------------------------------------------
-- 5. daily_rankings: ranking del día por mercado (histórico, no se resetea
--    como videos.rank). Único por (market, ranking_date, rank).
-- -----------------------------------------------------------------------------
create table if not exists public.daily_rankings (
  id uuid primary key default gen_random_uuid(),
  market text not null,
  ranking_date date not null default current_date,
  rank int not null,
  video_id uuid references public.videos(id) on delete set null,
  tiktok_video_id text,
  created_at timestamptz not null default now(),
  constraint daily_rankings_market_date_rank_key unique (market, ranking_date, rank)
);

create index if not exists idx_daily_rankings_market_date
  on public.daily_rankings (market, ranking_date desc);

alter table public.daily_rankings enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'daily_rankings'
      and policyname = 'Public can read daily rankings'
  ) then
    create policy "Public can read daily rankings"
      on public.daily_rankings for select to anon, authenticated using (true);
  end if;
end $$;


-- -----------------------------------------------------------------------------
-- 6. product_aliases: títulos de video confirmados manualmente que apuntan a
--    un producto. Es la capa 0 del matching: un alias confirmado convierte
--    futuros imports del mismo título en match exacto instantáneo.
--    Escritura SOLO vía RPC confirm_video_match o service_role.
-- -----------------------------------------------------------------------------
create table if not exists public.product_aliases (
  id uuid primary key default gen_random_uuid(),
  alias_normalized text not null,
  product_id uuid not null references public.products(id) on delete cascade,
  market text,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  constraint product_aliases_alias_market_key unique (alias_normalized, market)
);

create index if not exists idx_product_aliases_product on public.product_aliases (product_id);

alter table public.product_aliases enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'product_aliases'
      and policyname = 'Public can read product aliases'
  ) then
    create policy "Public can read product aliases"
      on public.product_aliases for select to anon, authenticated using (true);
  end if;
end $$;


-- -----------------------------------------------------------------------------
-- 7. pg_trgm: similitud trigram para la capa fuzzy del matching.
--    Defensivo: intenta instalar en el esquema `extensions` (convención de
--    Supabase) y cae a esquema por defecto si no existe.
-- -----------------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_extension where extname = 'pg_trgm') then
    begin
      create extension pg_trgm with schema extensions;
    exception when others then
      begin
        create extension pg_trgm;
      exception when others then null;
      end;
    end;
  end if;
end $$;

-- Índice trigram sobre producto_nombre (búsquedas/similaridad sobre el nombre
-- crudo). El opclass se resuelve según dónde viva pg_trgm.
do $$ begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'idx_products_producto_nombre_trgm'
  ) then
    begin
      execute 'create index idx_products_producto_nombre_trgm on public.products using gin (producto_nombre gin_trgm_ops)';
    exception when others then
      begin
        execute 'create index idx_products_producto_nombre_trgm on public.products using gin (producto_nombre extensions.gin_trgm_ops)';
      exception when others then null;
      end;
    end;
  end if;
end $$;


-- -----------------------------------------------------------------------------
-- 8. normalize_title(text): normalización canónica de títulos para matching.
--    Pipeline (replicado 1:1 en TS dentro de match-videos/index.ts):
--      lower -> quita segmentos entre corchetes 【】[]()（） (ruido Kalodata)
--      -> quita hashtags (#palabra) -> translitera acentos áéíóúüñ...
--      -> elimina todo lo que no sea [a-z0-9 ] (incluye emojis)
--      -> colapsa espacios y recorta.
--    DECISIÓN: se usa translate() en lugar de unaccent() porque unaccent NO es
--    IMMUTABLE (depende de un diccionario mutable) y aquí necesitamos
--    inmutabilidad real para poder indexar / usar en triggers de forma segura.
-- -----------------------------------------------------------------------------
create or replace function public.normalize_title(_input text)
returns text
language sql
immutable
parallel safe
as $$
  select btrim(
    regexp_replace(
      regexp_replace(
        translate(
          regexp_replace(
            regexp_replace(
              lower(coalesce(_input, '')),
              '【[^】]*】|\[[^\]]*\]|\([^)]*\)|（[^）]*）', ' ', 'g'
            ),
            '#[^[:space:]]+', ' ', 'g'
          ),
          'áàâäãéèêëíìîïóòôöõúùûüñç',
          'aaaaaeeeeiiiiooooouuuunc'
        ),
        '[^a-z0-9 ]', ' ', 'g'
      ),
      '[[:space:]]+', ' ', 'g'
    )
  );
$$;

grant execute on function public.normalize_title(text) to anon, authenticated, service_role;


-- -----------------------------------------------------------------------------
-- 9. products.nombre_normalizado: columna normal + trigger (Postgres no acepta
--    columnas GENERATED con funciones custom en todas las versiones), índice
--    trigram y backfill.
-- -----------------------------------------------------------------------------
alter table public.products add column if not exists nombre_normalizado text;

create or replace function public.set_nombre_normalizado()
returns trigger
language plpgsql
as $$
begin
  new.nombre_normalizado := public.normalize_title(new.producto_nombre);
  return new;
end;
$$;

drop trigger if exists trg_products_nombre_normalizado on public.products;
create trigger trg_products_nombre_normalizado
  before insert or update of producto_nombre on public.products
  for each row
  execute function public.set_nombre_normalizado();

-- Backfill (solo filas desactualizadas; re-ejecutable sin coste).
update public.products
set nombre_normalizado = public.normalize_title(producto_nombre)
where nombre_normalizado is distinct from public.normalize_title(producto_nombre);

-- Índice para igualdad exacta (capa 0b)
create index if not exists idx_products_nombre_normalizado
  on public.products (nombre_normalizado);

-- Índice trigram para similarity() (capa 1 fuzzy)
do $$ begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'idx_products_nombre_normalizado_trgm'
  ) then
    begin
      execute 'create index idx_products_nombre_normalizado_trgm on public.products using gin (nombre_normalizado gin_trgm_ops)';
    exception when others then
      begin
        execute 'create index idx_products_nombre_normalizado_trgm on public.products using gin (nombre_normalizado extensions.gin_trgm_ops)';
      exception when others then null;
      end;
    end;
  end if;
end $$;


-- -----------------------------------------------------------------------------
-- 10a. find_similar_products: expone similarity() de pg_trgm a PostgREST
--      (PostgREST no permite llamar similarity directo desde el cliente).
--      Lo usa la capa 1 (fuzzy) y la capa 2 (candidatos para la IA).
-- -----------------------------------------------------------------------------
create or replace function public.find_similar_products(
  _title text,
  _market text,
  _limit int default 10
)
returns table(id uuid, producto_nombre text, score real)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select p.id,
         p.producto_nombre,
         similarity(p.nombre_normalizado, public.normalize_title(_title)) as score
  from public.products p
  where p.market = _market
    and p.nombre_normalizado is not null
    and p.nombre_normalizado <> ''
  order by score desc nulls last
  limit greatest(coalesce(_limit, 10), 1);
$$;

revoke all on function public.find_similar_products(text, text, int) from public, anon;
grant execute on function public.find_similar_products(text, text, int) to authenticated, service_role;


-- -----------------------------------------------------------------------------
-- 10b. confirm_video_match: el founder confirma un match (cola de revisión o
--      corrección manual). Setea product_id + metadata manual y, opcionalmente,
--      crea un alias para que futuros imports matcheen en capa 0.
-- -----------------------------------------------------------------------------
create or replace function public.confirm_video_match(
  _video_id uuid,
  _product_id uuid,
  _create_alias boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _vname text;
  _vmarket text;
  _norm text;
begin
  if not exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'founder'
  ) then
    raise exception 'not authorized';
  end if;

  select v.product_name, v.country into _vname, _vmarket
  from public.videos v
  where v.id = _video_id;

  if not found then
    raise exception 'video not found';
  end if;

  update public.videos
  set product_id = _product_id,
      match_source = 'manual',
      manual_match = true,
      manual_matched_at = now(),
      manual_matched_by = auth.uid(),
      suggested_product_id = null,
      match_reason = null
  where id = _video_id;

  if _create_alias then
    _norm := public.normalize_title(_vname);
    if _norm is not null and length(_norm) > 0 then
      insert into public.product_aliases (alias_normalized, product_id, market, source)
      values (_norm, _product_id, _vmarket, 'manual')
      on conflict (alias_normalized, market) do nothing;
    end if;
  end if;
end;
$$;

revoke all on function public.confirm_video_match(uuid, uuid, boolean) from public, anon;
grant execute on function public.confirm_video_match(uuid, uuid, boolean) to authenticated;


-- -----------------------------------------------------------------------------
-- 10c. reject_video_match: el founder rechaza un match/sugerencia.
--      Deja el video fuera de la cola ('none') y sin producto.
-- -----------------------------------------------------------------------------
create or replace function public.reject_video_match(_video_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'founder'
  ) then
    raise exception 'not authorized';
  end if;

  update public.videos
  set product_id = null,
      match_source = 'none',
      suggested_product_id = null,
      match_reason = null
  where id = _video_id;
end;
$$;

revoke all on function public.reject_video_match(uuid) from public, anon;
grant execute on function public.reject_video_match(uuid) to authenticated;


-- -----------------------------------------------------------------------------
-- 11. imports: telemetría por import (mercado y contadores) para el panel admin.
-- -----------------------------------------------------------------------------
alter table public.imports add column if not exists market text;
alter table public.imports add column if not exists new_rows int;
alter table public.imports add column if not exists updated_rows int;
alter table public.imports add column if not exists failed_rows int;
alter table public.imports add column if not exists finished_at timestamptz;


-- -----------------------------------------------------------------------------
-- 12. Grants de columna en videos. La migración 20260610120000 revocó el
--     SELECT a nivel TABLA de videos y concede SELECT columna por columna;
--     cualquier columna nueva nace invisible para anon/authenticated hasta
--     que se le concede explícitamente. Ninguna de estas columnas es premium.
-- -----------------------------------------------------------------------------
do $$ begin
  begin grant select (tiktok_video_id) on public.videos to anon, authenticated; exception when others then null; end;
  begin grant select (match_source) on public.videos to anon, authenticated; exception when others then null; end;
  begin grant select (suggested_product_id) on public.videos to anon, authenticated; exception when others then null; end;
  begin grant select (match_reason) on public.videos to anon, authenticated; exception when others then null; end;
end $$;

comment on function public.normalize_title(text) is
  'Normalización canónica de títulos (lower, sin corchetes/hashtags/acentos/emojis, espacios colapsados). IMMUTABLE: replicada en TS en match-videos/index.ts.';
comment on table public.product_snapshots is
  'Foto de métricas de producto en cada import de Kalodata (tendencias).';
comment on table public.daily_rankings is
  'Ranking histórico por (market, ranking_date, rank); videos.rank solo refleja el último import.';
comment on table public.product_aliases is
  'Alias normalizados confirmados que mapean títulos de video a productos (capa 0 del matching).';
comment on column public.videos.match_source is
  'Procedencia del match: exact | fuzzy | ai | review | manual | none | null (pendiente).';
