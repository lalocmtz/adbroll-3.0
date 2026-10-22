-- Weekly Kalodata imports publish a complete ranking report per kind/market.
-- Partial/category exports must be consolidated before calling this endpoint.
-- Raw source rows are private: they can include creator contact details.
alter table public.products add column if not exists report_date_range text;
alter table public.creators add column if not exists report_date_range text;

create table public.kalodata_report_rows (
  kind text not null check (kind in ('products','creators','videos','shops')),
  market text not null check (market in ('mx','us')),
  report_date_range text not null
    check (report_date_range ~ '^\d{4}-\d{2}-\d{2}~\d{4}-\d{2}-\d{2}$'),
  source_id text not null check (nullif(btrim(source_id),'') is not null),
  payload jsonb not null check (jsonb_typeof(payload)='object'),
  source_filename text not null,
  imported_at timestamptz not null default now(),
  published_at timestamptz,
  primary key (kind,market,report_date_range,source_id)
);
alter table public.kalodata_report_rows enable row level security;
revoke all on public.kalodata_report_rows from public,anon,authenticated;
grant all on public.kalodata_report_rows to service_role;
comment on table public.kalodata_report_rows is
  'Private exact-source staging/archive; published_at is NULL until applied by the importer. Shop rows stay staged; no brand or product association is inferred.';
comment on column public.products.report_date_range is
  'Commercial reporting window for the current metrics; NULL means legacy period not established.';
comment on column public.creators.report_date_range is
  'Commercial reporting window for the current metrics; NULL means legacy period not established.';

CREATE OR REPLACE FUNCTION public.import_kalodata_rows(p_kind text, p_market text, p_period text, p_filename text, p_rows jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
declare item jsonb; allowed text[]; columns_sql text; values_sql text; updates_sql text;
  existing_id uuid; identities integer; existing_market text; name_value text;
  report_start date; report_end date; latest_end text;
  inserted integer:=0; updated integer:=0; linked integer:=0; key_column text; market_column text;
begin
  if p_kind is null or p_kind not in ('videos','products','creators')
    or p_market is null or p_market not in ('mx','us')
    or p_period is null or p_period !~ '^\d{4}-\d{2}-\d{2}~\d{4}-\d{2}-\d{2}$'
    or p_rows is null or jsonb_typeof(p_rows) is distinct from 'array'
    or nullif(btrim(p_filename),'') is null then
    raise exception 'Invalid import';
  end if;
  if jsonb_array_length(p_rows) not between 1 and 10000 then
    raise exception 'Invalid import row count';
  end if;
  -- Casts reject impossible calendar dates instead of normalizing them.
  report_start := split_part(p_period,'~',1)::date;
  report_end := split_part(p_period,'~',2)::date;
  if report_end < report_start
    or (p_kind in ('products','creators') and report_end-report_start+1 <> 30) then
    raise exception 'Invalid report period';
  end if;
  perform pg_advisory_xact_lock(20261010);
  -- This endpoint publishes a COMPLETE ranking report for one kind/market.
  -- Do not send pages, category exports or incremental subsets separately.
  -- Equal end dates are allowed: videos may have distinct 7/30-day windows.
  select max(period_end) into latest_end from (
    -- Staged private rows must not advance the currently published period.
    select right(i.date_range,10) as period_end from public.imports i
      where i.kind=p_kind and i.market=p_market
        and i.date_range ~ '^\d{4}-\d{2}-\d{2}~\d{4}-\d{2}-\d{2}$'
    union all
    select right(p.report_date_range,10) from public.products p
      where p_kind='products' and p.market=p_market and p.report_date_range is not null
    union all
    select right(c.report_date_range,10) from public.creators c
      where p_kind='creators' and c.country=p_market and c.report_date_range is not null
    union all
    select right(v.snapshot_date_range,10) from public.videos v
      where p_kind='videos' and v.country=p_market
        and v.snapshot_date_range ~ '^\d{4}-\d{2}-\d{2}~\d{4}-\d{2}-\d{2}$'
  ) latest;
  if latest_end is not null and right(p_period,10) < latest_end then
    raise exception 'An older report cannot replace current metrics';
  end if;
  if p_kind='videos' then allowed=string_to_array('tiktok_video_id video_url tiktok_product_id source_product_url title creator_handle product_name category country duration revenue_mxn sales views roas rank snapshot_date_range imported_at snapshot_at',' ');
  elsif p_kind='products' then allowed=string_to_array('tiktok_product_id producto_nombre producto_url imagen_url categoria precio_mxn price currency total_ventas total_ingresos_mxn revenue_30d gmv_30d_mxn commission commission_amount creators_count creators_active_30d rating rank market identity_status legacy_original_name report_date_range updated_at last_import last_imported_from_kalodata_at',' ');
  elsif p_kind='creators' then allowed=string_to_array('usuario_creador creator_handle nombre_completo country seguidores total_videos total_ventas total_ingresos_mxn revenue_live revenue_videos total_live_count gmv_live_mxn views_30d sales_30d tiktok_url report_date_range updated_at last_import last_imported_from_kalodata_at',' ');
  end if;
  key_column=case p_kind when 'videos' then 'tiktok_video_id' when 'products' then 'tiktok_product_id' else 'usuario_creador' end;
  market_column=case p_kind when 'products' then 'market' else 'country' end;
  -- Reject missing/non-canonical identities and duplicates before any writes.
  -- IDs stay text; creator handles use the same normalized key as the parser.
  if exists(select 1 from jsonb_array_elements(p_rows) x
    where jsonb_typeof(x) is distinct from 'object'
      or nullif(btrim(x->>key_column),'') is null
      or x->>market_column is distinct from p_market
      or (p_kind in ('products','videos') and (x->>key_column) !~ '^[0-9]+$')
      or (p_kind='creators' and (x->>key_column) !~ '^[a-z0-9._]+$')) then
    raise exception 'Missing or non-canonical identity, or wrong market';
  end if;
  if exists(select 1 from jsonb_array_elements(p_rows) x
    group by x->>key_column having count(*)>1)
    or (p_kind='videos' and exists(select 1 from jsonb_array_elements(p_rows) x
      where nullif(btrim(x->>'video_url'),'') is not null
      group by x->>'video_url' having count(*)>1)) then
    raise exception 'Duplicate identities in report';
  end if;
  for item in select value from jsonb_array_elements(p_rows) loop
    if p_kind='videos' then
      select count(*),(array_agg(id))[1],(array_agg(country))[1] into identities,existing_id,existing_market
      from videos where tiktok_video_id=item->>'tiktok_video_id' or video_url=item->>'video_url';
      item=item||jsonb_build_object('imported_at',now(),'snapshot_at',now(),'snapshot_date_range',p_period);
    elsif p_kind='products' then
      select count(*),(array_agg(id))[1],(array_agg(market))[1] into identities,existing_id,existing_market
      from products where tiktok_product_id=item->>'tiktok_product_id';
      name_value=item->>'producto_nombre';
      if exists(select 1 from products where producto_nombre=name_value and market=p_market and id is distinct from existing_id)
        or exists(select 1 from jsonb_array_elements(p_rows) x where x->>'producto_nombre'=name_value and x->>'tiktok_product_id'<>item->>'tiktok_product_id') then
        item=item||jsonb_build_object('legacy_original_name',name_value,'producto_nombre',name_value||' [ID:'||(item->>'tiktok_product_id')||']');
      end if;
    else
      select count(*),(array_agg(id))[1],(array_agg(country))[1] into identities,existing_id,existing_market
      from creators where lower(ltrim(usuario_creador,'@'))=item->>'usuario_creador';
    end if;
    if identities>1 or (existing_market is not null and existing_market<>p_market) then raise exception 'Ambiguous or cross-market identity'; end if;
    if p_kind<>'videos' then item=item||jsonb_build_object('report_date_range',p_period,'updated_at',now(),'last_import',now(),'last_imported_from_kalodata_at',now()); end if;
    select string_agg(format('%I',key),','),string_agg(format('s.%I',key),','),string_agg(format('%I=s.%I',key,key),',')
      into columns_sql,values_sql,updates_sql from jsonb_object_keys(item) key where key=any(allowed);
    if existing_id is null then
      execute format('insert into public.%I(%s) select %s from jsonb_populate_record(null::public.%I,$1) s',p_kind,columns_sql,values_sql,p_kind) using item;
      inserted=inserted+1;
    else
      execute format('update public.%I t set %s from jsonb_populate_record(null::public.%I,$1) s where t.id=$2',p_kind,updates_sql,p_kind) using item,existing_id;
      updated=updated+1;
    end if;
  end loop;
  if p_kind='products' then
    update public.products p set rank=null
    where p.market=p_market and p.rank is not null
      and not exists(select 1 from jsonb_array_elements(p_rows) x
        where x->>'tiktok_product_id'=p.tiktok_product_id);
  end if;
  -- Exact source SKU only. Preserve explicit manual assignments and all media/analysis.
  -- Refresh copied product metrics even when identity is unchanged (for example
  -- a video_source identity gains its first verified product export).
  update videos v set product_id=p.id,match_status='matched',match_method='tiktok_product_id',match_source='exact',match_confidence=1,match_algorithm_version='v6-id-only',product_price=p.verified_price,product_sales=p.verified_sales,product_revenue=p.verified_revenue
  from (select id,market,tiktok_product_id,
    case when identity_status='video_source' then null else precio_mxn end as verified_price,
    case when identity_status='video_source' then null else total_ventas end as verified_sales,
    case when identity_status='video_source' then null else total_ingresos_mxn end as verified_revenue
    from products) p
  where v.country=p_market and p.market=p_market and p.tiktok_product_id=v.tiktok_product_id and coalesce(v.manual_match,false)=false
    and (v.product_id is distinct from p.id or v.match_method is distinct from 'tiktok_product_id'
      or v.product_price is distinct from p.verified_price or v.product_sales is distinct from p.verified_sales
      or v.product_revenue is distinct from p.verified_revenue);
  get diagnostics linked=row_count;
  -- A newer video export can identify a different SKU absent from our product
  -- catalog. Never retain the previous product or its copied commercial metrics.
  update videos v set product_id=null,product_price=null,product_sales=null,product_revenue=null,
    match_status='identified_outside_catalog',match_method=null,match_source='none',match_confidence=0,match_algorithm_version='v6-id-only'
  where v.country=p_market and coalesce(v.manual_match,false)=false
    and v.tiktok_product_id is not null and v.product_id is not null
    and not exists(select 1 from products p where p.market=p_market and p.tiktok_product_id=v.tiktok_product_id);
  update videos v set creator_id=c.id,creator_name=c.nombre_completo from creators c
  where v.country=p_market and c.country=p_market and lower(ltrim(c.usuario_creador,'@'))=lower(ltrim(v.creator_handle,'@'))
    and (v.creator_id is distinct from c.id or v.creator_name is distinct from c.nombre_completo);
  -- Preserve the full normalized source payload (including optional source_row)
  -- privately. Extra fields never enter operational columns via the whitelist.
  insert into public.kalodata_report_rows(kind,market,report_date_range,source_id,payload,source_filename,imported_at,published_at)
  select p_kind,p_market,p_period,x->>key_column,x,p_filename,now(),now()
  from jsonb_array_elements(p_rows) x
  on conflict(kind,market,report_date_range,source_id) do update set
    payload=excluded.payload,source_filename=excluded.source_filename,
    imported_at=excluded.imported_at,published_at=excluded.published_at;
  insert into imports(file_name,market,kind,date_range,total_rows,new_rows,updated_rows,videos_imported,products_imported,creators_imported,failed_rows,finished_at,published_at)
  values(p_filename,p_market,p_kind,p_period,inserted+updated,inserted,updated,
    case when p_kind='videos' then inserted+updated else 0 end,case when p_kind='products' then inserted+updated else 0 end,
    case when p_kind='creators' then inserted+updated else 0 end,0,now(),now());
  return jsonb_build_object('success',true,'processed',inserted+updated,'new_rows',inserted,'updated_rows',updated,'exact',linked,'period',p_period);
end $function$;
revoke all on function public.import_kalodata_rows(text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.import_kalodata_rows(text,text,text,text,jsonb) to service_role;

-- A country keeps its legacy ranking until its first dated creator report.
create or replace function public.get_creator_catalog_ranking(p_country text default 'mx')
returns jsonb language sql stable security invoker set search_path=public as $$
  with current_report as (
    select max(report_date_range) as period from public.creators where country=p_country
  ), covered as (
    select c.id,c.usuario_creador,c.nombre_completo,c.creator_handle,c.seguidores,
      c.total_ingresos_mxn,c.promedio_visualizaciones,c.avatar_url,c.avatar_storage_url,
      c.total_live_count,c.gmv_live_mxn,c.revenue_live,c.revenue_videos,c.tiktok_url,
      c.country,c.total_videos,c.total_ventas,c.views_30d,c.sales_30d,c.likes_30d,
      available.available_video_count
    from public.creators c
    cross join lateral (
      select count(*) as available_video_count from public.videos v
      where v.country=c.country and nullif(btrim(v.video_mp4_url),'') is not null
        and (v.creator_id=c.id or (v.creator_id is null
          and public.catalog_creator_handle(coalesce(nullif(btrim(c.creator_handle),''),c.usuario_creador)) ~ '^[a-z0-9._]+$'
          and public.catalog_creator_handle(v.creator_handle)=public.catalog_creator_handle(coalesce(nullif(btrim(c.creator_handle),''),c.usuario_creador))))
    ) available
    where c.country=p_country and available.available_video_count>0
      and ((select period from current_report) is null
        or c.report_date_range=(select period from current_report))
  ), top_creators as (
    select * from covered order by revenue_videos desc nulls last,id limit 20
  )
  select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(t) order by t.revenue_videos desc nulls last,t.id) from top_creators t),'[]'::jsonb),
    'covered_creators',(select count(*) from covered),'limit',20)
$$;
revoke all on function public.get_creator_catalog_ranking(text) from public;
grant execute on function public.get_creator_catalog_ranking(text) to anon,authenticated,service_role;
