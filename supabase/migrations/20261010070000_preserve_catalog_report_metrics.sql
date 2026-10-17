-- Preserve independent commercial windows when the same video is reimported.
-- An imported 7-day snapshot must not overwrite its saved 30-day figures.
create table public.video_report_metrics (
  video_id uuid not null references public.videos(id) on delete cascade,
  snapshot_date_range text not null,
  country text not null,
  rank integer, revenue_mxn numeric, sales integer, views integer, roas numeric,
  primary key(video_id,snapshot_date_range)
);
create index video_report_metrics_period on public.video_report_metrics(country,snapshot_date_range);
alter table public.video_report_metrics enable row level security;
revoke all on public.video_report_metrics from public,anon,authenticated;
grant select on public.video_report_metrics to anon,authenticated;
grant all on public.video_report_metrics to service_role;
create policy public_report_metrics_read on public.video_report_metrics for select to anon,authenticated using(true);

insert into public.video_report_metrics(video_id,snapshot_date_range,country,rank,revenue_mxn,sales,views,roas)
select id,snapshot_date_range,country,rank,revenue_mxn,sales,views,roas from public.videos
where country is not null and snapshot_date_range ~ '^\d{4}-\d{2}-\d{2}~\d{4}-\d{2}-\d{2}$';

create or replace function public.capture_video_report_metrics()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.country is not null and new.snapshot_date_range ~ '^\d{4}-\d{2}-\d{2}~\d{4}-\d{2}-\d{2}$' then
    insert into public.video_report_metrics(video_id,snapshot_date_range,country,rank,revenue_mxn,sales,views,roas)
    values(new.id,new.snapshot_date_range,new.country,new.rank,new.revenue_mxn,new.sales,new.views,new.roas)
    on conflict(video_id,snapshot_date_range) do update set
      country=excluded.country,rank=coalesce(excluded.rank,video_report_metrics.rank),
      revenue_mxn=excluded.revenue_mxn,sales=excluded.sales,views=excluded.views,roas=excluded.roas;
  end if;
  return new;
end $$;
revoke all on function public.capture_video_report_metrics() from public,anon,authenticated;
create trigger preserve_video_report_metrics after insert or update of snapshot_date_range,revenue_mxn,sales,views,roas,rank
on public.videos for each row execute function public.capture_video_report_metrics();

create or replace function public.get_catalog_report_periods(p_country text)
returns table(snapshot_date_range text) language sql stable security invoker set search_path=public as $$
  select distinct m.snapshot_date_range from public.video_report_metrics m where m.country=p_country
$$;

create or replace function public.get_catalog_videos(
  p_country text,p_report text default null,p_sort text default 'rank',p_category text default null,
  p_product text default null,p_creator text default null,p_offset integer default 0
) returns jsonb language sql stable security invoker set search_path=public as $$
  with snapshots as (
    select distinct on (m.video_id) m.* from public.video_report_metrics m
    where m.country=p_country and (p_report is null or m.snapshot_date_range=p_report)
    order by m.video_id,split_part(m.snapshot_date_range,'~',2) desc, m.snapshot_date_range desc
  ), filtered as (
    select v.id,v.video_url,v.video_mp4_url,v.thumbnail_url,v.title,v.creator_name,v.creator_handle,v.creator_id,
      v.product_name,v.product_id,m.sales,m.revenue_mxn,m.views,m.roas,v.category,m.country,m.rank,
      v.imported_at,v.processing_status,m.snapshot_date_range,
      m.revenue_mxn*coalesce(p.commission,0)/100 as estimated_earnings,
      jsonb_build_object('id',p.id,'producto_nombre',p.producto_nombre,'imagen_url',p.imagen_url,
        'total_ingresos_mxn',p.total_ingresos_mxn,'commission',p.commission,'price',p.price,
        'precio_mxn',p.precio_mxn,'categoria',p.categoria,'revenue_30d',p.revenue_30d,'producto_url',p.producto_url) as product
    from snapshots m join public.videos v on v.id=m.video_id join public.products p on p.id=v.product_id
    where nullif(v.video_mp4_url,'') is not null and v.country=p_country
      and (p_category is null or p.categoria=p_category)
      and (p_product is null or v.product_name ilike '%'||p_product||'%')
      and (p_creator is null or v.creator_name ilike '%'||p_creator||'%' or v.creator_handle ilike '%'||p_creator||'%')
  ), page as (
    select * from filtered order by
      case when p_sort='rank' then rank end asc nulls last,
      case when p_sort='sales' then sales end desc nulls last,
      case when p_sort='views' then views end desc nulls last,
      case when p_sort='earnings' then estimated_earnings end desc nulls last,
      revenue_mxn desc nulls last,id asc
    limit 20 offset greatest(0,least(coalesce(p_offset,0),1000000))
  )
  select jsonb_build_object('count',(select count(*) from filtered),'rows',coalesce((select jsonb_agg(to_jsonb(page)-'estimated_earnings') from page),'[]'::jsonb))
$$;
revoke all on function public.get_catalog_videos(text,text,text,text,text,text,integer) from public;
grant execute on function public.get_catalog_videos(text,text,text,text,text,text,integer) to anon,authenticated,service_role;
