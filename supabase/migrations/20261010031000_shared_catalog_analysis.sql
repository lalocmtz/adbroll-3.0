create or replace function public.get_video_analysis(_video_id uuid)
returns jsonb language sql stable security definer set search_path=public as $$
  select case when public.is_paid_user(auth.uid()) then v.analysis_json else null end
  from public.videos v where v.id=_video_id;
$$;
revoke all on function public.get_video_analysis(uuid) from public,anon;
grant execute on function public.get_video_analysis(uuid) to authenticated;
