-- Public catalogue coverage only. Does not read or expose scripts/analysis.
-- Explicit creator_id wins. A normalized exact handle is a fallback only when
-- the video has no creator_id, never a fuzzy name or substring association.
create or replace function public.catalog_creator_handle(p_handle text)
returns text language sql immutable strict parallel safe set search_path=public as $$
  select nullif(lower(regexp_replace(btrim(p_handle),'^@','')),'')
$$;
revoke all on function public.catalog_creator_handle(text) from public;
grant execute on function public.catalog_creator_handle(text) to anon,authenticated,service_role;

create index if not exists videos_creator_catalog_available on public.videos(country,creator_id)
  where nullif(btrim(video_mp4_url),'') is not null;
create index if not exists videos_handle_catalog_available on public.videos(country,public.catalog_creator_handle(creator_handle))
  where creator_id is null and nullif(btrim(video_mp4_url),'') is not null;

create or replace function public.get_creator_catalog_ranking(p_country text default 'mx')
returns jsonb language sql stable security invoker set search_path=public as $$
  with covered as (
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
  ), top_creators as (
    select * from covered order by revenue_videos desc nulls last,id limit 20
  )
  select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(t) order by t.revenue_videos desc nulls last,t.id) from top_creators t),'[]'::jsonb),
    'covered_creators',(select count(*) from covered),'limit',20)
$$;
revoke all on function public.get_creator_catalog_ranking(text) from public;
grant execute on function public.get_creator_catalog_ranking(text) to anon,authenticated,service_role;

create or replace function public.get_creator_catalog_videos(p_creator_id uuid,p_sort text default 'revenue',p_offset integer default 0)
returns jsonb language sql stable security invoker set search_path=public as $$
  with matched as (
    select v.id,v.video_url,v.video_mp4_url,v.thumbnail_url,v.title,v.creator_name,v.creator_handle,v.creator_id,
      v.product_name,v.product_id,v.sales,v.revenue_mxn,v.views,v.roas,v.category,v.country,v.rank,
      v.imported_at,v.processing_status,v.snapshot_date_range,
      case when p.id is not null then jsonb_build_object('id',p.id,'producto_nombre',p.producto_nombre,'imagen_url',p.imagen_url,
        'total_ingresos_mxn',p.total_ingresos_mxn,'commission',p.commission,'price',p.price,
        'precio_mxn',p.precio_mxn,'revenue_30d',p.revenue_30d,'producto_url',p.producto_url) end as product
    from public.creators c join public.videos v on v.country=c.country
      and (v.creator_id=c.id or (v.creator_id is null
        and public.catalog_creator_handle(coalesce(nullif(btrim(c.creator_handle),''),c.usuario_creador)) ~ '^[a-z0-9._]+$'
        and public.catalog_creator_handle(v.creator_handle)=public.catalog_creator_handle(coalesce(nullif(btrim(c.creator_handle),''),c.usuario_creador))))
    left join public.products p on p.id=v.product_id
    where c.id=p_creator_id
  ), available as (
    select * from matched where nullif(btrim(video_mp4_url),'') is not null
  ), ranked as (
    select a.*,row_number() over (order by
      case when p_sort='sales' then sales end desc nulls last,
      case when p_sort='views' then views end desc nulls last,
      revenue_mxn desc nulls last,id) as position from available a
  ), page as (
    select * from ranked where position<=50 order by position
    limit 20 offset greatest(0,least(coalesce(p_offset,0),40))
  )
  select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(p)-'position' order by p.position) from page p),'[]'::jsonb),
    'count',least(50,(select count(*) from available)),
    'total_available',(select count(*) from available),'identified_count',(select count(*) from matched))
$$;
revoke all on function public.get_creator_catalog_videos(uuid,text,integer) from public;
grant execute on function public.get_creator_catalog_videos(uuid,text,integer) to anon,authenticated,service_role;
