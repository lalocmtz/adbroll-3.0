-- Keep deterministic links and copied metrics consistent after every import.
-- One transaction per file; service-only entry point called after founder authentication.
create or replace function public.import_kalodata_rows(p_kind text,p_market text,p_period text,p_filename text,p_rows jsonb)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare item jsonb; allowed text[]; columns_sql text; values_sql text; updates_sql text;
  existing_id uuid; identities integer; existing_market text; name_value text;
  inserted integer:=0; updated integer:=0; linked integer:=0; key_column text; market_column text;
begin
  if p_kind not in ('videos','products','creators') or p_market not in ('mx','us')
    or p_period !~ '^\d{4}-\d{2}-\d{2}~\d{4}-\d{2}-\d{2}$'
    or jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 10000 then
    raise exception 'Invalid import';
  end if;
  perform pg_advisory_xact_lock(20261010);
  if p_kind='videos' then allowed=string_to_array('tiktok_video_id video_url tiktok_product_id source_product_url title creator_handle product_name category country duration revenue_mxn sales views roas rank snapshot_date_range imported_at snapshot_at',' ');
  elsif p_kind='products' then allowed=string_to_array('tiktok_product_id producto_nombre producto_url imagen_url categoria precio_mxn price currency total_ventas total_ingresos_mxn revenue_30d gmv_30d_mxn commission commission_amount creators_count creators_active_30d rating rank market identity_status legacy_original_name updated_at last_import last_imported_from_kalodata_at',' ');
  elsif p_kind='creators' then allowed=string_to_array('usuario_creador creator_handle nombre_completo country seguidores total_videos total_ventas total_ingresos_mxn revenue_live revenue_videos total_live_count gmv_live_mxn views_30d sales_30d tiktok_url updated_at last_import last_imported_from_kalodata_at',' ');
  end if;
  key_column=case p_kind when 'videos' then 'tiktok_video_id' when 'products' then 'tiktok_product_id' else 'usuario_creador' end;
  market_column=case p_kind when 'products' then 'market' else 'country' end;
  for item in select value from jsonb_array_elements(p_rows) loop
    if nullif(item->>key_column,'') is null or item->>market_column is distinct from p_market then raise exception 'Missing identity or wrong market'; end if;
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
    if p_kind<>'videos' then item=item||jsonb_build_object('updated_at',now(),'last_import',now(),'last_imported_from_kalodata_at',now()); end if;
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
  insert into imports(file_name,market,kind,date_range,total_rows,new_rows,updated_rows,videos_imported,products_imported,creators_imported,failed_rows,finished_at,published_at)
  values(p_filename,p_market,p_kind,p_period,inserted+updated,inserted,updated,
    case when p_kind='videos' then inserted+updated else 0 end,case when p_kind='products' then inserted+updated else 0 end,
    case when p_kind='creators' then inserted+updated else 0 end,0,now(),now());
  return jsonb_build_object('success',true,'processed',inserted+updated,'new_rows',inserted,'updated_rows',updated,'exact',linked,'period',p_period);
end $$;
revoke all on function public.import_kalodata_rows(text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.import_kalodata_rows(text,text,text,text,jsonb) to service_role;

