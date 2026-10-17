-- Registration can validate a code without exposing its owner's identity or ledger.
create or replace function public.validate_referral_code(p_code text)
returns boolean language sql stable security definer set search_path=public as $$
  select case when upper(trim(p_code)) ~ '^[A-Z0-9]{4,32}$' then
    exists(select 1 from public.affiliate_codes c where c.code=upper(trim(p_code)))
  else false end;
$$;
revoke all on function public.validate_referral_code(text) from public;
grant execute on function public.validate_referral_code(text) to anon, authenticated;
