-- Base transcript + analysis are shared assets, prepared before publication.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;
alter table public.videos add column if not exists analysis_ready boolean not null default false;
grant select(analysis_ready) on public.videos to anon,authenticated;
create table public.catalog_analysis_settings (
 id boolean primary key default true check(id), enabled boolean not null default false,
 daily_attempt_limit integer not null default 200 check(daily_attempt_limit between 1 and 2000),
 max_concurrent integer not null default 2 check(max_concurrent between 1 and 2)
);
insert into public.catalog_analysis_settings(id) values(true);
create table public.catalog_analysis_jobs (
 video_id uuid primary key references public.videos(id) on delete cascade,
 source_url text not null, status text not null default 'pending' check(status in ('pending','dispatched','running','ready','failed')),
 attempts integer not null default 0, priority integer not null default 100000,
 next_attempt_at timestamptz not null default now(), lease_until timestamptz, token_hash text,
 last_error_code text, estimated_cost_usd numeric, input_tokens integer, output_tokens integer,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.catalog_analysis_attempts (
 id bigint generated always as identity primary key,video_id uuid not null,
 started_at timestamptz not null default now()
);
create index catalog_analysis_pending on public.catalog_analysis_jobs(status,next_attempt_at,priority);
create index catalog_analysis_attempt_day on public.catalog_analysis_attempts(started_at);
alter table public.catalog_analysis_settings enable row level security;
alter table public.catalog_analysis_jobs enable row level security;
alter table public.catalog_analysis_attempts enable row level security;
revoke all on public.catalog_analysis_settings,public.catalog_analysis_jobs,public.catalog_analysis_attempts from public,anon,authenticated;
grant all on public.catalog_analysis_settings,public.catalog_analysis_jobs,public.catalog_analysis_attempts to service_role;
grant usage,select on sequence public.catalog_analysis_attempts_id_seq to service_role;

create or replace function public.catalog_base_is_ready(p_transcript text,p_analysis jsonb,p_source text)
returns boolean language sql immutable set search_path=public as $$
 select p_source like 'https://tnqvvfpzkjwgllwdwvte.supabase.co/storage/v1/object/public/videos/%'
 and p_transcript is not null and jsonb_typeof(p_analysis)='object'
 and (
  (p_analysis->'_cache' is null and nullif(trim(p_transcript),'') is not null
   and p_analysis ?& array['hook','body','cta']
   and coalesce(jsonb_typeof(p_analysis->'hook'),'null') in ('string','null')
   and coalesce(jsonb_typeof(p_analysis->'body'),'null') in ('string','null')
   and coalesce(jsonb_typeof(p_analysis->'cta'),'null') in ('string','null')
   and coalesce(nullif(trim(p_analysis->>'hook'),''),nullif(trim(p_analysis->>'body'),''),nullif(trim(p_analysis->>'cta'),'')) is not null)
  or (jsonb_typeof(p_analysis->'hook')='string' and jsonb_typeof(p_analysis->'body')='string'
   and jsonb_typeof(p_analysis->'cta')='string' and jsonb_typeof(p_analysis->'segments')='array'
   and jsonb_typeof(p_analysis->'visual_observations')='array'
   and jsonb_typeof(p_analysis->'beginner_takeaways')='array' and jsonb_typeof(p_analysis->'uncertainties')='array'
   and (nullif(trim(p_transcript),'') is not null or case when jsonb_typeof(p_analysis->'visual_observations')='array' then jsonb_array_length(p_analysis->'visual_observations')>0 else false end))
 )
 and (p_analysis#>>'{_cache,source}' is null or p_analysis#>>'{_cache,source}'=p_source);
$$;
create or replace function public.mark_catalog_analysis_ready()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if TG_OP='UPDATE' and old.video_mp4_url is distinct from new.video_mp4_url
  and old.analysis_json is not distinct from new.analysis_json
  and jsonb_typeof(new.analysis_json)='object' and new.analysis_json->'_cache' is null
  and old.video_mp4_url is not null then
  -- Preserve legacy text, but bind its provenance before a media replacement.
  new.analysis_json:=jsonb_set(new.analysis_json,'{_cache}',jsonb_build_object('source',old.video_mp4_url,'prompt_version','legacy-source'));
 end if;
 new.analysis_ready:=coalesce(public.catalog_base_is_ready(new.transcript,new.analysis_json,new.video_mp4_url),false);
 return new;
end $$;
create trigger mark_catalog_analysis_ready before insert or update of video_mp4_url,transcript,analysis_json,analysis_ready on public.videos
for each row execute function public.mark_catalog_analysis_ready();
create or replace function public.enqueue_catalog_analysis()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if nullif(new.video_mp4_url,'') is null then
  delete from public.catalog_analysis_jobs where video_id=new.id;
  return new;
 end if;
 if new.video_mp4_url not like 'https://tnqvvfpzkjwgllwdwvte.supabase.co/storage/v1/object/public/videos/%' then return new; end if;
 insert into public.catalog_analysis_jobs(video_id,source_url,status,priority)
 values(new.id,new.video_mp4_url,case when new.analysis_ready then 'ready' else 'pending' end,
  case when right(new.snapshot_date_range,10)=(select max(right(snapshot_date_range,10)) from public.videos where snapshot_date_range ~ '^\d{4}-\d{2}-\d{2}~\d{4}-\d{2}-\d{2}$') then 0 else 10000 end+coalesce(new.rank,9999))
 on conflict(video_id) do update set
  source_url=excluded.source_url,
  status=case when excluded.status='ready' and catalog_analysis_jobs.status='running' then 'running' when excluded.status='ready' then 'ready' when catalog_analysis_jobs.source_url is distinct from excluded.source_url then 'pending' else catalog_analysis_jobs.status end,
  attempts=case when catalog_analysis_jobs.source_url is distinct from excluded.source_url then 0 else catalog_analysis_jobs.attempts end,
  token_hash=case when (excluded.status='ready' and catalog_analysis_jobs.status<>'running') or catalog_analysis_jobs.source_url is distinct from excluded.source_url then null else catalog_analysis_jobs.token_hash end,
  next_attempt_at=case when catalog_analysis_jobs.source_url is distinct from excluded.source_url then now() else catalog_analysis_jobs.next_attempt_at end,
  priority=excluded.priority,updated_at=now();
 return new;
end $$;
create trigger enqueue_catalog_analysis after insert or update of video_mp4_url,transcript,analysis_json on public.videos
for each row execute function public.enqueue_catalog_analysis();
-- Seed durable state; no provider requests are started by this migration.
update public.videos set analysis_ready=coalesce(public.catalog_base_is_ready(transcript,analysis_json,video_mp4_url),false);
insert into public.catalog_analysis_jobs(video_id,source_url,status,priority)
select id,video_mp4_url,case when analysis_ready then 'ready' else 'pending' end,
 case when right(snapshot_date_range,10)=(select max(right(snapshot_date_range,10)) from public.videos where snapshot_date_range ~ '^\d{4}-\d{2}-\d{2}~\d{4}-\d{2}-\d{2}$') then 0 else 10000 end+coalesce(rank,9999)
from public.videos where video_mp4_url like 'https://tnqvvfpzkjwgllwdwvte.supabase.co/storage/v1/object/public/videos/%'
on conflict(video_id) do nothing;

create or replace function public.claim_catalog_analysis_job(p_video_id uuid,p_token text)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare j public.catalog_analysis_jobs;
begin
 if length(p_token)<>64 then return null; end if;
 update public.catalog_analysis_jobs set status='running',updated_at=now()
 where video_id=p_video_id and status='dispatched' and lease_until>now()
 and token_hash=encode(extensions.digest(p_token,'sha256'),'hex') returning * into j;
 if not found then return null; end if;
 return jsonb_build_object('videoId',j.video_id,'sourceUrl',j.source_url,'attempt',j.attempts);
end $$;
create or replace function public.finish_catalog_analysis_job(p_video_id uuid,p_token text,p_success boolean,p_retryable boolean,p_error_code text,p_input_tokens integer default null,p_output_tokens integer default null)
returns boolean language plpgsql security definer set search_path=public,extensions as $$
begin
 update public.catalog_analysis_jobs set
 status=case when p_success then 'ready' when p_retryable and attempts<3 then 'pending' else 'failed' end,
 next_attempt_at=now()+make_interval(mins=>case when attempts=1 then 5 else 30 end),
 lease_until=null,token_hash=null,last_error_code=left(regexp_replace(coalesce(p_error_code,''),'[^A-Z0-9_:-]','','g'),80),
 input_tokens=p_input_tokens,output_tokens=p_output_tokens,
 estimated_cost_usd=case when p_input_tokens is not null and p_output_tokens is not null then (p_input_tokens*0.30+p_output_tokens*2.50)/1000000 else null end,updated_at=now()
 where video_id=p_video_id and token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and status='running';
 return found;
end $$;
create or replace function public.dispatch_catalog_analysis()
returns integer language plpgsql security definer set search_path=public,extensions as $$
declare settings public.catalog_analysis_settings; j record; secret_token text; available integer; dispatched integer:=0;
begin
 perform pg_advisory_xact_lock(2026101619);
 select * into settings from public.catalog_analysis_settings where id=true;
 if not settings.enabled then return 0; end if;
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
create or replace function public.get_catalog_processing_status()
returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not exists(select 1 from public.user_roles where user_id=auth.uid() and role='founder') then raise exception 'Founder access required'; end if;
 return jsonb_build_object('settings',(select to_jsonb(s) from public.catalog_analysis_settings s where id=true),
 'counts',(select jsonb_object_agg(status,n) from (select status,count(*) n from public.catalog_analysis_jobs group by status)s),
 'attemptsToday',(select count(*) from public.catalog_analysis_attempts where started_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'),
 'estimatedCostUsd',(select coalesce(sum(estimated_cost_usd),0) from public.catalog_analysis_jobs),
 'failures',(select jsonb_agg(s) from (select j.video_id,v.title,j.attempts,j.last_error_code,j.updated_at from public.catalog_analysis_jobs j join public.videos v on v.id=j.video_id where j.status='failed' order by j.updated_at desc limit 20)s));
end $$;
revoke all on function public.catalog_base_is_ready(text,jsonb,text),public.mark_catalog_analysis_ready(),public.enqueue_catalog_analysis(),public.claim_catalog_analysis_job(uuid,text),public.finish_catalog_analysis_job(uuid,text,boolean,boolean,text,integer,integer),public.dispatch_catalog_analysis() from public,anon,authenticated;
grant execute on function public.claim_catalog_analysis_job(uuid,text),public.finish_catalog_analysis_job(uuid,text,boolean,boolean,text,integer,integer),public.dispatch_catalog_analysis() to service_role;
revoke all on function public.get_catalog_processing_status() from public,anon;
grant execute on function public.get_catalog_processing_status() to authenticated;
select cron.schedule('tokxray-catalog-analysis','* * * * *','select public.dispatch_catalog_analysis();');
