-- Search the whole catalogue on the server. Only public commercial fields and
-- availability counters are exposed; premium analysis stays column-protected.
create or replace function public.catalog_search_text(value text)
returns text language sql immutable parallel safe set search_path=public as $$
  select translate(lower(coalesce(value,'')), 'áàäâãåéèëêíìïîóòöôõúùüûñç', 'aaaaaaeeeeiiiiooooouuuunc')
$$;
revoke all on function public.catalog_search_text(text) from public;
grant execute on function public.catalog_search_text(text) to anon,authenticated,service_role;

create table public.catalog_shops (
  market text not null check (market in ('mx','us')),
  shop_id text not null check (shop_id ~ '^[0-9]+$'),
  shop_name text not null check (nullif(btrim(shop_name),'') is not null),
  seller_type text,
  report_date_range text not null,
  is_hidden boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key(market,shop_id)
);
comment on table public.catalog_shops is 'Exact Kalodata shop identities. Seller type is source metadata, not a verified brand identity.';

create table public.catalog_shop_reports (
  market text not null,
  shop_id text not null,
  report_date_range text not null check (report_date_range ~ '^\d{4}-\d{2}-\d{2}~\d{4}-\d{2}-\d{2}$'),
  rank integer not null check (rank>0),
  revenue numeric check (revenue>=0),
  total_sales bigint check (total_sales>=0),
  average_unit_price numeric check (average_unit_price>=0),
  revenue_videos numeric check (revenue_videos>=0),
  revenue_live numeric check (revenue_live>=0),
  revenue_product_card numeric check (revenue_product_card>=0),
  revenue_affiliate numeric check (revenue_affiliate>=0),
  primary key(market,shop_id,report_date_range),
  foreign key(market,shop_id) references public.catalog_shops(market,shop_id)
);
create index catalog_shop_reports_market_period on public.catalog_shop_reports(market,report_date_range,rank);

create table public.catalog_shop_products (
  market text not null,
  shop_id text not null,
  product_id uuid not null references public.products(id) on delete cascade,
  source_tiktok_product_id text not null check (source_tiktok_product_id ~ '^[0-9]+$'),
  source_url text not null check (source_url ~ '^https://'),
  verified_at timestamptz not null default now(),
  primary key(market,shop_id,product_id),
  foreign key(market,shop_id) references public.catalog_shops(market,shop_id)
);
comment on table public.catalog_shop_products is 'Only explicit source shop/product IDs; no title, shop-name or brand-name inference.';

create or replace function public.validate_catalog_shop_product()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
  if not exists(select 1 from public.products p where p.id=new.product_id
    and p.market=new.market and p.tiktok_product_id=new.source_tiktok_product_id
    and p.identity_status is distinct from 'legacy_duplicate') then
    raise exception 'Shop product identity or market mismatch';
  end if;
  return new;
end $$;
revoke all on function public.validate_catalog_shop_product() from public,anon,authenticated;
create trigger validate_catalog_shop_product before insert or update on public.catalog_shop_products
for each row execute function public.validate_catalog_shop_product();

alter table public.catalog_shops enable row level security;
alter table public.catalog_shop_reports enable row level security;
alter table public.catalog_shop_products enable row level security;
revoke all on public.catalog_shops,public.catalog_shop_reports,public.catalog_shop_products from public,anon,authenticated;
grant select on public.catalog_shops,public.catalog_shop_reports,public.catalog_shop_products to anon,authenticated;
grant all on public.catalog_shops,public.catalog_shop_reports,public.catalog_shop_products to service_role;
create policy catalog_shops_read on public.catalog_shops for select to anon,authenticated using(not is_hidden);
create policy catalog_shop_reports_read on public.catalog_shop_reports for select to anon,authenticated using(
  exists(select 1 from public.catalog_shops s where s.market=catalog_shop_reports.market and s.shop_id=catalog_shop_reports.shop_id and not s.is_hidden));
create policy catalog_shop_products_read on public.catalog_shop_products for select to anon,authenticated using(
  exists(select 1 from public.catalog_shops s where s.market=catalog_shop_products.market and s.shop_id=catalog_shop_products.shop_id and not s.is_hidden)
  and exists(select 1 from public.products p where p.id=catalog_shop_products.product_id and p.market=catalog_shop_products.market
    and p.tiktok_product_id=catalog_shop_products.source_tiktok_product_id and p.is_hidden is not true and p.identity_status is distinct from 'legacy_duplicate'));

-- Explicit projection also forces unknown commercial metrics to NULL for
-- identities obtained from videos without a corresponding product report.
create view public.catalog_product_discovery with (security_invoker=true) as
select p.id,p.tiktok_product_id,p.producto_nombre,p.producto_url,p.imagen_url,p.categoria,p.market,p.currency,p.identity_status,
  case when p.identity_status is distinct from 'video_source' then p.rank end as rank,
  case when p.identity_status is distinct from 'video_source' then p.precio_mxn end as precio_mxn,
  case when p.identity_status is distinct from 'video_source' then p.price end as price,
  case when p.identity_status is distinct from 'video_source' then p.commission end as commission,
  case when p.identity_status is distinct from 'video_source' then p.commission_amount end as commission_amount,
  case when p.identity_status is distinct from 'video_source' then p.total_ventas end as total_ventas,
  case when p.identity_status is distinct from 'video_source' then p.total_ingresos_mxn end as total_ingresos_mxn,
  case when p.identity_status is distinct from 'video_source' then p.revenue_30d end as revenue_30d,
  case when p.identity_status is distinct from 'video_source' then p.creators_count end as creators_count,
  case when p.identity_status is distinct from 'video_source' then p.rating end as rating,
  case when p.identity_status is distinct from 'video_source' then p.report_date_range end as report_date_range,
  coalesce(available.available_video_count,0) as available_video_count,
  coalesce(available.analysis_ready_count,0) as analysis_ready_count
from public.products p
left join lateral (
  select count(*) as available_video_count,count(*) filter(where v.analysis_ready) as analysis_ready_count
  from public.videos v where v.product_id=p.id and v.country=p.market and nullif(btrim(v.video_mp4_url),'') is not null
    and (v.manual_match is true or v.tiktok_product_id=p.tiktok_product_id)
) available on true
where p.is_hidden is not true and p.identity_status is distinct from 'legacy_duplicate';
revoke all on public.catalog_product_discovery from public,anon,authenticated;
grant select on public.catalog_product_discovery to anon,authenticated,service_role;

create or replace function public.search_catalog_products(
  p_market text default 'mx',p_query text default null,p_sort text default 'ranking',p_category text default null,
  p_has_videos boolean default false,p_min_commission numeric default null,p_shop_id text default null,
  p_offset integer default 0,p_limit integer default 20
) returns jsonb language sql stable security invoker set search_path=public as $$
  with parameters as (
    select left(btrim(coalesce(p_query,'')),500) as query,
      case when p_sort in ('ranking','revenue_30d','commission','creators_count') then p_sort else 'ranking' end as sort
  ), current_report as (
    select p.report_date_range as period from public.products p where p.market=p_market and p.is_hidden is not true
      and p.identity_status is distinct from 'legacy_duplicate' and p.identity_status is distinct from 'video_source'
      and p.report_date_range is not null order by right(p.report_date_range,10) desc,p.report_date_range desc limit 1
  ), query_identity as (
    select parameters.*,case
      when query ~ '^[0-9]+$' then query
      when query ~* '^https?://([a-z0-9-]+\.)*(tiktok\.com|kalodata\.com)/' then
        substring(query from '(?:/product/|[?&](?:id|product_id)=)([0-9]+)')
      else null end as product_id
    from parameters
  ), scoped as materialized (
    select p.*,coalesce(p.report_date_range=(select period from current_report),false) as is_current_report
    from public.catalog_product_discovery p cross join query_identity q
    where p.market=p_market
      and (p.identity_status is distinct from 'video_source' or q.query<>'' or p_shop_id is not null)
      and (q.query='' or (q.product_id is not null and p.tiktok_product_id=q.product_id)
        or (q.product_id is null and strpos(public.catalog_search_text(p.producto_nombre),public.catalog_search_text(q.query))>0))
      and (p_shop_id is null or exists(select 1 from public.catalog_shop_products sp
        join public.catalog_shops s using(market,shop_id)
        where sp.market=p_market and sp.shop_id=p_shop_id and sp.product_id=p.id
          and sp.source_tiktok_product_id=p.tiktok_product_id and not s.is_hidden))
      and (q.query<>'' or p_shop_id is not null or q.sort<>'ranking'
        or (p.rank is not null and ((select period from current_report) is null or p.report_date_range=(select period from current_report))))
  ), filtered as (
    select * from scoped where (nullif(p_category,'') is null or categoria=p_category)
      and (not coalesce(p_has_videos,false) or available_video_count>0)
      and (p_min_commission is null or commission>=greatest(p_min_commission,0))
  ), page as (
    select * from filtered order by
      case when (select sort from parameters)='ranking' then is_current_report end desc,
      case when (select sort from parameters)='ranking' then rank end asc nulls last,
      case when (select sort from parameters)='commission' then commission end desc nulls last,
      case when (select sort from parameters)='creators_count' then creators_count end desc nulls last,
      coalesce(revenue_30d,total_ingresos_mxn) desc nulls last,id
    limit greatest(1,least(coalesce(p_limit,20),100)) offset greatest(0,least(coalesce(p_offset,0),1000000))
  ) select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb),
    'count',(select count(*) from filtered),'current_period',(select period from current_report),
    'categories',coalesce((select jsonb_agg(categoria order by categoria) from (select distinct categoria from scoped where nullif(categoria,'') is not null)c),'[]'::jsonb))
$$;
revoke all on function public.search_catalog_products(text,text,text,text,boolean,numeric,text,integer,integer) from public;
grant execute on function public.search_catalog_products(text,text,text,text,boolean,numeric,text,integer,integer) to anon,authenticated,service_role;

create or replace function public.get_catalog_product(p_market text,p_product_id uuid)
returns jsonb language sql stable security invoker set search_path=public as $$
  select to_jsonb(p)||jsonb_build_object('is_current_report',coalesce(p.report_date_range=(
    select x.report_date_range from public.products x where x.market=p_market and x.is_hidden is not true
      and x.identity_status not in ('video_source','legacy_duplicate') and x.report_date_range is not null
      order by right(x.report_date_range,10) desc,x.report_date_range desc limit 1),false))
  from public.catalog_product_discovery p where p.market=p_market and p.id=p_product_id
$$;
revoke all on function public.get_catalog_product(text,uuid) from public;
grant execute on function public.get_catalog_product(text,uuid) to anon,authenticated,service_role;

create view public.catalog_shop_discovery with (security_invoker=true) as
select s.market,s.shop_id,s.shop_name,s.seller_type,r.report_date_range,r.rank,r.revenue,r.total_sales,
  r.average_unit_price,r.revenue_videos,r.revenue_live,r.revenue_product_card,r.revenue_affiliate,
  case when s.market='mx' then 'MXN' else 'USD' end as currency,
  linked.verified_product_count,linked.available_video_count
from public.catalog_shops s join public.catalog_shop_reports r using(market,shop_id)
cross join lateral (
  select count(*) as verified_product_count,coalesce(sum(p.available_video_count),0) as available_video_count
  from public.catalog_shop_products sp join public.catalog_product_discovery p on p.id=sp.product_id
    and p.market=sp.market and p.tiktok_product_id=sp.source_tiktok_product_id
  where sp.market=s.market and sp.shop_id=s.shop_id
) linked
where not s.is_hidden and r.report_date_range=(select rr.report_date_range from public.catalog_shop_reports rr
  where rr.market=s.market order by right(rr.report_date_range,10) desc,rr.report_date_range desc limit 1);
revoke all on public.catalog_shop_discovery from public,anon,authenticated;
grant select on public.catalog_shop_discovery to anon,authenticated,service_role;

create or replace function public.get_catalog_shops(p_market text default 'mx',p_query text default null,p_offset integer default 0,p_limit integer default 20)
returns jsonb language sql stable security invoker set search_path=public as $$
  with filtered as (select * from public.catalog_shop_discovery s where s.market=p_market
    and (nullif(btrim(p_query),'') is null or s.shop_id=btrim(p_query)
      or strpos(public.catalog_search_text(s.shop_name),public.catalog_search_text(left(btrim(p_query),500)))>0)),
  page as (select * from filtered order by rank,revenue desc nulls last,shop_id
    limit greatest(1,least(coalesce(p_limit,20),100)) offset greatest(0,least(coalesce(p_offset,0),1000000)))
  select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb),'count',(select count(*) from filtered),
    'current_period',(select report_date_range from public.catalog_shop_discovery where market=p_market limit 1))
$$;
create or replace function public.get_catalog_shop(p_market text,p_shop_id text)
returns jsonb language sql stable security invoker set search_path=public as $$
  select to_jsonb(s) from public.catalog_shop_discovery s where s.market=p_market and s.shop_id=p_shop_id
$$;
revoke all on function public.get_catalog_shops(text,text,integer,integer),public.get_catalog_shop(text,text) from public;
grant execute on function public.get_catalog_shops(text,text,integer,integer),public.get_catalog_shop(text,text) to anon,authenticated,service_role;

-- Publishing is a service-only operation over the private exact-source archive.
-- Unknown fields and raw exports never become publicly readable.
create or replace function public.publish_catalog_shops_from_report(p_market text,p_report text)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare item record; source jsonb; field text; number_text text; total integer:=0;
begin
  if p_market is null or p_market not in ('mx','us') or p_report is null
    or p_report !~ '^\d{4}-\d{2}-\d{2}~\d{4}-\d{2}-\d{2}$'
    or split_part(p_report,'~',2)::date-split_part(p_report,'~',1)::date<>29 then
    raise exception 'Invalid shop report';
  end if;
  perform pg_advisory_xact_lock(20261010);
  for item in select * from public.kalodata_report_rows where kind='shops' and market=p_market and report_date_range=p_report loop
    source:=item.payload->'source_row';
    if item.source_id !~ '^[0-9]+$' or item.payload->>'shop_id' is distinct from item.source_id
      or item.payload->>'market' is distinct from p_market or jsonb_typeof(source) is distinct from 'object'
      or nullif(btrim(item.payload->>'shop_name'),'') is null or source->>'Rango de fechas' is distinct from p_report
      or coalesce(item.payload->>'rank','') !~ '^[1-9][0-9]*$' then
      raise exception 'Invalid shop identity, rank or period';
    end if;
    foreach field in array array['Ingresos(M$)','Ventas','Precio medio por unidad (M$)','Ingresos por vídeos(M$)',
      'Ingresos en vivo(M$)','Ingresos de la Ficha de Producto','Ingresos por afiliados (M$)'] loop
      number_text:=nullif(btrim(source->>field),'');
      if number_text is not null and (number_text !~ '^[0-9]+(\.[0-9]+)?$'
        or (field='Ventas' and number_text::numeric<>trunc(number_text::numeric))) then
        raise exception 'Invalid shop metric: %',field;
      end if;
    end loop;
    insert into public.catalog_shops(market,shop_id,shop_name,seller_type,report_date_range)
    values(p_market,item.source_id,btrim(item.payload->>'shop_name'),source->>'Tipo de vendedor',p_report)
    on conflict(market,shop_id) do update set shop_name=excluded.shop_name,seller_type=excluded.seller_type,
      report_date_range=excluded.report_date_range,updated_at=now()
      where right(catalog_shops.report_date_range,10)<=right(excluded.report_date_range,10);
    insert into public.catalog_shop_reports(market,shop_id,report_date_range,rank,revenue,total_sales,average_unit_price,
      revenue_videos,revenue_live,revenue_product_card,revenue_affiliate)
    values(p_market,item.source_id,p_report,(item.payload->>'rank')::integer,
      nullif(btrim(source->>'Ingresos(M$)'),'')::numeric,nullif(btrim(source->>'Ventas'),'')::numeric::bigint,
      nullif(btrim(source->>'Precio medio por unidad (M$)'),'')::numeric,
      nullif(btrim(source->>'Ingresos por vídeos(M$)'),'')::numeric,nullif(btrim(source->>'Ingresos en vivo(M$)'),'')::numeric,
      nullif(btrim(source->>'Ingresos de la Ficha de Producto'),'')::numeric,nullif(btrim(source->>'Ingresos por afiliados (M$)'),'')::numeric)
    on conflict(market,shop_id,report_date_range) do update set rank=excluded.rank,revenue=excluded.revenue,total_sales=excluded.total_sales,
      average_unit_price=excluded.average_unit_price,revenue_videos=excluded.revenue_videos,revenue_live=excluded.revenue_live,
      revenue_product_card=excluded.revenue_product_card,revenue_affiliate=excluded.revenue_affiliate;
    total:=total+1;
  end loop;
  if total=0 then raise exception 'No staged shop rows for this report'; end if;
  update public.kalodata_report_rows set published_at=now()
    where kind='shops' and market=p_market and report_date_range=p_report;
  return jsonb_build_object('published',total,'market',p_market,'report_date_range',p_report);
end $$;
revoke all on function public.publish_catalog_shops_from_report(text,text) from public,anon,authenticated;
grant execute on function public.publish_catalog_shops_from_report(text,text) to service_role;

-- Publish only the most recent staged report per market; no hardcoded shop IDs.
do $$ declare report record; begin
  for report in select distinct on (market) market,report_date_range from public.kalodata_report_rows
    where kind='shops' order by market,right(report_date_range,10) desc,report_date_range desc
  loop perform public.publish_catalog_shops_from_report(report.market,report.report_date_range); end loop;
end $$;
