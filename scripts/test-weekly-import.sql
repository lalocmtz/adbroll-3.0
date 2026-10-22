-- Run ONLY against a disposable empty database. psql executes the relative
-- migration include below; a PGlite runner may replace that line with its text.
begin;
do $$ begin
  if to_regclass('public.products') is not null then
    raise exception 'Disposable empty database required; do not run against the app database';
  end if;
end $$;
create role anon;
create role authenticated;
create role service_role;
create table public.products (
  id uuid primary key default gen_random_uuid(), tiktok_product_id text unique,
  market text, producto_nombre text, precio_mxn numeric, total_ventas integer,
  total_ingresos_mxn numeric, identity_status text default 'catalog', rank integer,
  legacy_original_name text, updated_at timestamptz, last_import timestamptz,
  last_imported_from_kalodata_at timestamptz
);
create table public.creators (
  id uuid primary key default gen_random_uuid(), usuario_creador text,
  nombre_completo text, creator_handle text, country text, seguidores integer,
  total_ingresos_mxn numeric, promedio_visualizaciones numeric, avatar_url text,
  avatar_storage_url text, total_live_count integer, gmv_live_mxn numeric,
  revenue_live numeric, revenue_videos numeric, tiktok_url text, total_videos integer,
  total_ventas integer, views_30d integer, sales_30d integer, likes_30d integer,
  updated_at timestamptz, last_import timestamptz, last_imported_from_kalodata_at timestamptz
);
create table public.videos (
  id uuid primary key default gen_random_uuid(), tiktok_video_id text unique,
  video_url text unique, video_mp4_url text, transcript text, analysis_json jsonb,
  thumbnail_url text, tiktok_product_id text, country text,
  product_id uuid references public.products(id), product_price numeric,
  product_sales integer, product_revenue numeric, manual_match boolean default false,
  match_status text, match_method text, match_source text, match_confidence numeric,
  match_algorithm_version text, creator_id uuid, creator_name text, creator_handle text,
  imported_at timestamptz, snapshot_at timestamptz, snapshot_date_range text,
  revenue_mxn numeric, rank integer
);
create table public.imports (
  file_name text, market text, kind text, date_range text, total_rows integer,
  new_rows integer, updated_rows integer, videos_imported integer,
  products_imported integer, creators_imported integer, failed_rows integer,
  finished_at timestamptz, published_at timestamptz
);
create function public.catalog_creator_handle(p_handle text) returns text
language sql immutable strict as $$
  select nullif(lower(regexp_replace(btrim(p_handle),'^@','')),'')
$$;
\ir ../supabase/migrations/20261022011630_weekly_report_imports.sql

create function pg_temp.assert_true(ok boolean, message text) returns void
language plpgsql as $$ begin
  if ok is distinct from true then raise exception '%',message; end if;
end $$;
create function pg_temp.expect_import_error(kind text, period text, rows jsonb, expected text)
returns void language plpgsql as $$ begin
  begin
    perform public.import_kalodata_rows(kind,'mx',period,'invalid.xlsx',rows);
  exception when others then
    if sqlerrm !~ expected then raise; end if;
    return;
  end;
  raise exception 'Expected import rejection: %',expected;
end $$;

insert into products(tiktok_product_id,market,producto_nombre,rank,precio_mxn)
values ('1001','mx','Existing',1,10),('1002','mx','Old ranking',2,20);
insert into creators(usuario_creador,creator_handle,country,revenue_videos)
values ('old','old','mx',999999),('current','current','mx',1),('us_legacy','us_legacy','us',10);
insert into videos(tiktok_video_id,video_url,country,creator_handle,creator_id,video_mp4_url,
  transcript,analysis_json,tiktok_product_id,product_id,manual_match,product_price,snapshot_date_range)
select '2001','https://www.tiktok.com/@current/video/2001','mx','current',c.id,
  'owned.mp4','keep transcript','{"hook":"keep analysis"}', '1001',p.id,true,777,
  '2026-09-10~2026-10-09' from products p,creators c
where p.tiktok_product_id='1002' and c.usuario_creador='current';
insert into videos(tiktok_video_id,video_url,country,creator_id,video_mp4_url)
select case when country='mx' then '2002' else '2003' end,usuario_creador,country,id,'other.mp4'
from creators where usuario_creador in ('old','us_legacy');

-- A future staged source file must not block publication of the current report.
insert into kalodata_report_rows(kind,market,report_date_range,source_id,payload,source_filename)
values ('products','mx','2026-09-28~2026-10-27','1001','{}','future-staged.xlsx');
select import_kalodata_rows('products','mx','2026-09-21~2026-10-20','products.xlsx',
  '[{"tiktok_product_id":"1001","market":"mx","producto_nombre":"Existing","precio_mxn":30,"rank":1,"report_date_range":"1900-01-01~1900-01-30","source_row":{"Shop":"Exact source shop"}},
    {"tiktok_product_id":"1004","market":"mx","producto_nombre":"New","precio_mxn":40,"rank":2}]');
select pg_temp.assert_true((select rank is null from products where tiktok_product_id='1002'),'Old product rank remains');
select pg_temp.assert_true((select count(*)=2 from products where rank is not null),'Current ranking not isolated');
select pg_temp.assert_true((select count(*)=2 from products where report_date_range='2026-09-21~2026-10-20'),'Period not bound to p_period');
select pg_temp.assert_true((select payload#>>'{source_row,Shop}'='Exact source shop' and published_at is not null
  from kalodata_report_rows where kind='products' and report_date_range='2026-09-21~2026-10-20' and source_id='1001'),'Private source archive missing');
select pg_temp.assert_true((select published_at is null from kalodata_report_rows where report_date_range='2026-09-28~2026-10-27'),'Staged row published prematurely');

select import_kalodata_rows('creators','mx','2026-09-21~2026-10-20','creators.xlsx',
  '[{"usuario_creador":"current","creator_handle":"current","country":"mx","nombre_completo":"Current","revenue_videos":50}]');
select pg_temp.assert_true(jsonb_array_length(get_creator_catalog_ranking('mx')->'rows')=1
  and get_creator_catalog_ranking('mx')#>>'{rows,0,usuario_creador}'='current','Creator ranking mixes old periods');
select pg_temp.assert_true(get_creator_catalog_ranking('us')#>>'{rows,0,usuario_creador}'='us_legacy','US legacy fallback changed');
select import_kalodata_rows('videos','mx','2026-09-21~2026-10-20','videos.xlsx',
  '[{"tiktok_video_id":"2001","video_url":"https://www.tiktok.com/@current/video/2001","country":"mx","tiktok_product_id":"1001","revenue_mxn":456,"rank":1,"video_mp4_url":"untrusted.mp4","transcript":"replace","analysis_json":{},"manual_match":false,"source_row":{"raw":"retained"}}]');
select pg_temp.assert_true((select video_mp4_url='owned.mp4' and transcript='keep transcript'
  and analysis_json='{"hook":"keep analysis"}'::jsonb and manual_match and product_price=777
  and product_id=(select id from products where tiktok_product_id='1002') and revenue_mxn=456
  from videos where tiktok_video_id='2001'),'Media, analysis or manual link changed');
-- Republishing the same report updates a source row rather than duplicating it.
select import_kalodata_rows('videos','mx','2026-09-21~2026-10-20','videos-repeat.xlsx',
  '[{"tiktok_video_id":"2001","video_url":"https://www.tiktok.com/@current/video/2001","country":"mx","revenue_mxn":457,"rank":1}]');
select pg_temp.assert_true((select count(*)=1 and max((payload->>'revenue_mxn')::int)=457
  from kalodata_report_rows where kind='videos'),'Report reimport duplicated archive rows');

select pg_temp.expect_import_error('products','2026-09-10~2026-10-09',
  '[{"tiktok_product_id":"1001","market":"mx"}]','older report');
select pg_temp.expect_import_error('creators','2026-09-10~2026-10-09',
  '[{"usuario_creador":"current","country":"mx"}]','older report');
select pg_temp.expect_import_error('videos','2026-09-10~2026-10-09',
  '[{"tiktok_video_id":"2001","country":"mx"}]','older report');
select pg_temp.expect_import_error('products','2026-10-14~2026-10-20',
  '[{"tiktok_product_id":"1001","market":"mx"}]','Invalid report period');
select pg_temp.expect_import_error('videos','2026-02-30~2026-03-10',
  '[{"tiktok_video_id":"2001","country":"mx"}]','date/time field value out of range');
select pg_temp.expect_import_error('videos','2026-09-21~2026-10-20',
  '[{"tiktok_video_id":"2001","country":"mx"},{"tiktok_video_id":"2001","country":"mx"}]','Duplicate identities');
select pg_temp.expect_import_error('creators','2026-09-21~2026-10-20',
  '[{"usuario_creador":"@Current","country":"mx"}]','non-canonical identity');
select pg_temp.assert_true((select revenue_mxn=457 from videos where tiktok_video_id='2001'),'Rejected import changed metrics');
select pg_temp.assert_true(not has_table_privilege('anon','public.kalodata_report_rows','SELECT')
  and not has_table_privilege('authenticated','public.kalodata_report_rows','SELECT'),'Private raw source rows exposed');
select pg_temp.assert_true((select relrowsecurity from pg_class where oid='public.kalodata_report_rows'::regclass),'Archive RLS disabled');
select pg_temp.assert_true(not has_function_privilege('anon','public.import_kalodata_rows(text,text,text,text,jsonb)','EXECUTE')
  and not has_function_privilege('authenticated','public.import_kalodata_rows(text,text,text,text,jsonb)','EXECUTE'),'Import callable by client roles');
select 'PASS: complete rankings, source archive, staging isolation, preservation, period validation and privacy' as result;
rollback;
