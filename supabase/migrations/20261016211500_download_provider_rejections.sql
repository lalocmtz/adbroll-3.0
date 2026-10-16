-- A definite provider rejection never started a paid run. Ambiguous starts keep
-- their durable reservation and cannot be retried automatically.
alter table public.catalog_download_jobs drop constraint catalog_download_jobs_status_check;
alter table public.catalog_download_jobs add constraint catalog_download_jobs_status_check
  check (status in ('starting','running','ready','failed','unknown','rejected'));

create or replace function public.reserve_catalog_download(p_user_id uuid,p_tiktok_id text,p_source_url text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_job public.catalog_download_jobs; v_day timestamptz := date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'; v_retry boolean := false;
begin
  if not public.is_paid_user(p_user_id) then return jsonb_build_object('denied',true); end if;
  if p_tiktok_id !~ '^[0-9]{15,22}$' or p_source_url !~ ('^https://www[.]tiktok[.]com/@[a-zA-Z0-9._-]{1,100}/video/'||p_tiktok_id||'$') then raise exception 'Invalid source'; end if;
  perform pg_advisory_xact_lock(786459205);
  select * into v_job from public.catalog_download_jobs where tiktok_video_id=p_tiktok_id;
  if found then
    if v_job.status <> 'rejected' or v_job.run_id is not null or v_job.updated_at > now()-interval '60 seconds' then
      return jsonb_build_object('started',false,'job',to_jsonb(v_job));
    end if;
    v_retry := true;
  end if;
  -- The rejected reservation is the same video, not an extra daily download.
  if (select count(*) from public.catalog_download_jobs where created_at>=v_day and requested_by=p_user_id and tiktok_video_id<>p_tiktok_id)>=5
     or (select count(*) from public.catalog_download_jobs where created_at>=v_day and tiktok_video_id<>p_tiktok_id)>=100 then
    return jsonb_build_object('limited',true);
  end if;
  if v_retry then
    update public.catalog_download_jobs set status='starting',requested_by=p_user_id,source_url=p_source_url,
      created_at=now(),updated_at=now(),failure_message=null,poll_token=null,poll_after=now()
    where tiktok_video_id=p_tiktok_id returning * into v_job;
  else
    insert into public.catalog_download_jobs(tiktok_video_id,requested_by,source_url)
    values(p_tiktok_id,p_user_id,p_source_url) returning * into v_job;
  end if;
  return jsonb_build_object('started',true,'job',to_jsonb(v_job));
end $$;
revoke all on function public.reserve_catalog_download(uuid,text,text) from public,anon,authenticated;
grant execute on function public.reserve_catalog_download(uuid,text,text) to service_role;
