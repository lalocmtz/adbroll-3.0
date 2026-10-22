-- TikTok Shop PDP links may include a product slug before the exact ID.
-- Keep the host allowlist and require an ID boundary; never accept ID prefixes.
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
        substring(query from '(?:/product/|/pdp/(?:[^/?#]+/)?|[?&](?:id|product_id)=)([0-9]+)(?:[/?&#]|$)')
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
