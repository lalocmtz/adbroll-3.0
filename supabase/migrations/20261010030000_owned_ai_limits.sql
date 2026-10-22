-- Server-only usage ledger and leases. Cached catalogue reads do not consume quota.
create table if not exists public.ai_daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_day date not null default (now() at time zone 'utc')::date,
  kind text not null check (kind in ('video', 'text')),
  calls integer not null check (calls >= 0),
  primary key(user_id, usage_day, kind)
);
create table if not exists public.ai_video_leases (
  video_id uuid primary key references public.videos(id) on delete cascade,
  token uuid not null,
  expires_at timestamptz not null
);
alter table public.ai_daily_usage enable row level security;
alter table public.ai_video_leases enable row level security;
revoke all on public.ai_daily_usage, public.ai_video_leases from public, anon, authenticated;
grant all on public.ai_daily_usage, public.ai_video_leases to service_role;

create or replace function public.reserve_ai_call(p_user_id uuid, p_kind text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_count integer; v_limit integer;
begin
  if not public.is_paid_user(p_user_id) then return false; end if;
  v_limit := case p_kind when 'video' then 5 when 'text' then 20 else 0 end;
  if v_limit = 0 then return false; end if;
  insert into public.ai_daily_usage(user_id, usage_day, kind, calls)
  values(p_user_id, (now() at time zone 'utc')::date, p_kind, 1)
  on conflict(user_id, usage_day, kind) do update
    set calls = ai_daily_usage.calls + 1
    where ai_daily_usage.calls < v_limit
  returning calls into v_count;
  return v_count is not null;
end $$;

create or replace function public.claim_ai_video(p_video_id uuid, p_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into public.ai_video_leases(video_id, token, expires_at)
  values(p_video_id, p_token, now() + interval '10 minutes')
  on conflict(video_id) do update set token = excluded.token, expires_at = excluded.expires_at
    where ai_video_leases.expires_at < now()
  returning video_id into v_id;
  return v_id is not null;
end $$;
revoke all on function public.reserve_ai_call(uuid,text), public.claim_ai_video(uuid,uuid) from public, anon, authenticated;
grant execute on function public.reserve_ai_call(uuid,text), public.claim_ai_video(uuid,uuid) to service_role;
