-- Provider quotas are shared: stop the background batch briefly so it does not
-- consume every video's retry budget or compete with interactive variants.
-- This does not enable the batch or increase any daily/concurrency limit.
alter table public.catalog_analysis_settings add column cooldown_until timestamptz;

create or replace function public.finish_catalog_analysis_job(p_video_id uuid,p_token text,p_success boolean,p_retryable boolean,p_error_code text,p_input_tokens integer default null,p_output_tokens integer default null)
returns boolean language plpgsql security definer set search_path=public,extensions as $$
declare quota_limited boolean := not p_success and p_error_code like 'GEMINI_429_%';
begin
 update public.catalog_analysis_jobs set
 status=case when quota_limited then 'pending' when p_success then 'ready' when p_retryable and attempts<3 then 'pending' else 'failed' end,
 next_attempt_at=now()+make_interval(mins=>case when quota_limited then 15 when attempts=1 then 5 else 30 end),
 attempts=case when quota_limited then greatest(attempts-1,0) else attempts end,
 lease_until=null,token_hash=null,last_error_code=left(regexp_replace(coalesce(p_error_code,''),'[^A-Z0-9_:-]','','g'),80),
 input_tokens=p_input_tokens,output_tokens=p_output_tokens,
 estimated_cost_usd=case when p_input_tokens is not null and p_output_tokens is not null then (p_input_tokens*0.30+p_output_tokens*2.50)/1000000 else null end,updated_at=now()
 where video_id=p_video_id and token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and status='running';
 if not found then return false; end if;
 if quota_limited then
  update public.catalog_analysis_settings set cooldown_until=greatest(coalesce(cooldown_until,now()),now()+interval '15 minutes') where id=true;
 end if;
 return true;
end $$;
create or replace function public.dispatch_catalog_analysis()
returns integer language plpgsql security definer set search_path=public,extensions as $$
declare settings public.catalog_analysis_settings; j record; secret_token text; available integer; dispatched integer:=0;
begin
 perform pg_advisory_xact_lock(2026101619);
 select * into settings from public.catalog_analysis_settings where id=true;
 if not settings.enabled or settings.cooldown_until>now() then return 0; end if;
 update public.catalog_analysis_jobs q set status=case when exists(select 1 from public.videos v where v.id=q.video_id and v.analysis_ready and v.video_mp4_url=q.source_url) then 'ready' when attempts>=3 then 'failed' else 'pending' end,
 token_hash=null,lease_until=null,next_attempt_at=now()+interval '5 minutes',last_error_code='WORKER_TIMEOUT',updated_at=now()
 where status in ('dispatched','running') and lease_until<now();
 available:=least(settings.max_concurrent-(select count(*) from public.catalog_analysis_jobs where status in ('dispatched','running')),
 settings.daily_attempt_limit-(select count(*) from public.catalog_analysis_attempts where started_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'));
 for j in select q.video_id from public.catalog_analysis_jobs q join public.videos v on v.id=q.video_id
 where q.status='pending' and q.next_attempt_at<=now() and q.attempts<3 and not v.analysis_ready and q.source_url=v.video_mp4_url
 order by case when v.snapshot_date_range ~ '^\d{4}-\d{2}-\d{2}~\d{4}-\d{2}-\d{2}$' then right(v.snapshot_date_range,10) end desc nulls last,coalesce(v.rank,99999),q.priority,q.created_at limit greatest(available,0) for update of q skip locked loop
  secret_token:=encode(extensions.gen_random_bytes(32),'hex');
  update public.catalog_analysis_jobs set status='dispatched',attempts=attempts+1,token_hash=encode(extensions.digest(secret_token,'sha256'),'hex'),lease_until=now()+interval '10 minutes',updated_at=now() where video_id=j.video_id;
  insert into public.catalog_analysis_attempts(video_id) values(j.video_id);
  perform net.http_post(url:='https://tnqvvfpzkjwgllwdwvte.supabase.co/functions/v1/process-catalog-analysis',headers:='{"Content-Type":"application/json"}'::jsonb,
   body:=jsonb_build_object('videoId',j.video_id,'token',secret_token),timeout_milliseconds:=300000);
  dispatched:=dispatched+1;
 end loop;
 return dispatched;
end $$;

-- Recover only items stranded by a provider quota, preserving completed content.
-- They remain subject to enabled=false, the cooldown and the existing daily cap.
update public.catalog_analysis_jobs q set status='pending',attempts=0,
 next_attempt_at=now()+interval '15 minutes',updated_at=now()
where q.status='failed' and q.last_error_code like 'GEMINI_429_%'
 and exists(select 1 from public.videos v where v.id=q.video_id and not v.analysis_ready and v.video_mp4_url=q.source_url);

revoke all on function public.finish_catalog_analysis_job(uuid,text,boolean,boolean,text,integer,integer),public.dispatch_catalog_analysis() from public,anon,authenticated;
grant execute on function public.finish_catalog_analysis_job(uuid,text,boolean,boolean,text,integer,integer),public.dispatch_catalog_analysis() to service_role;
