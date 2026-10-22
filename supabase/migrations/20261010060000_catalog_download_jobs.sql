-- Only service_role can create or poll jobs. One durable reservation per TikTok ID
-- prevents duplicate paid runs even when the provider response is lost.
create table public.catalog_download_jobs (
  tiktok_video_id text primary key check (tiktok_video_id ~ '^[0-9]{15,22}$'),
  requested_by uuid references auth.users(id) on delete set null,
  source_url text not null,
  video_id uuid references public.videos(id) on delete set null,
  status text not null default 'starting' check (status in ('starting','running','ready','failed','unknown')),
  run_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  poll_token uuid,
  poll_after timestamptz not null default now(),
  failure_message text
);
create index catalog_download_jobs_created on public.catalog_download_jobs(created_at);
alter table public.catalog_download_jobs enable row level security;
revoke all on public.catalog_download_jobs from public,anon,authenticated;
grant all on public.catalog_download_jobs to service_role;
create or replace function public.reserve_catalog_download(p_user_id uuid,p_tiktok_id text,p_source_url text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_job public.catalog_download_jobs; v_day timestamptz := date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
begin
  if not public.is_paid_user(p_user_id) then return jsonb_build_object('denied',true); end if;
  if p_tiktok_id !~ '^[0-9]{15,22}$' or p_source_url !~ ('^https://www[.]tiktok[.]com/@[a-zA-Z0-9._-]{1,100}/video/'||p_tiktok_id||'$') then raise exception 'Invalid source'; end if;
  perform pg_advisory_xact_lock(786459205);
  select * into v_job from public.catalog_download_jobs where tiktok_video_id=p_tiktok_id;
  if found then return jsonb_build_object('started',false,'job',to_jsonb(v_job)); end if;
  if (select count(*) from public.catalog_download_jobs where created_at>=v_day and requested_by=p_user_id)>=5
     or (select count(*) from public.catalog_download_jobs where created_at>=v_day)>=100 then
    return jsonb_build_object('limited',true);
  end if;
  insert into public.catalog_download_jobs(tiktok_video_id,requested_by,source_url)
  values(p_tiktok_id,p_user_id,p_source_url) returning * into v_job;
  return jsonb_build_object('started',true,'job',to_jsonb(v_job));
end $$;
create or replace function public.claim_catalog_download_poll(p_tiktok_id text,p_token uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_id text;
begin
  update public.catalog_download_jobs set poll_token=p_token,poll_after=now()+interval '90 seconds'
  where tiktok_video_id=p_tiktok_id and status='running' and poll_after<=now()
  returning tiktok_video_id into v_id;
  return v_id is not null;
end $$;
revoke all on function public.reserve_catalog_download(uuid,text,text),public.claim_catalog_download_poll(text,uuid) from public,anon,authenticated;
grant execute on function public.reserve_catalog_download(uuid,text,text),public.claim_catalog_download_poll(text,uuid) to service_role;
