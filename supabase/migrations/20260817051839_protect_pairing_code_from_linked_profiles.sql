-- A linked partner may read safe profile fields, but the pairing code is an
-- invitation secret and must remain visible only to its owner. Move own-profile
-- creation/read behind a private checked implementation, sanitize pairing RPC
-- output, and replace table-wide profile grants with column-level privileges.

create or replace function private.ensure_profile_impl(_display_name text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.profiles;
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  insert into public.profiles(id, display_name)
  values (caller_id, _display_name)
  on conflict (id) do update
    set display_name = coalesce(excluded.display_name, public.profiles.display_name)
  returning * into p;

  return p;
end;
$$;

revoke all on function private.ensure_profile_impl(text) from public, anon;
grant execute on function private.ensure_profile_impl(text) to authenticated, service_role;

create or replace function public.ensure_profile(_display_name text default null)
returns public.profiles
language sql
security invoker
set search_path = ''
as $$
  select private.ensure_profile_impl(_display_name);
$$;

revoke all on function public.ensure_profile(text) from public, anon;
grant execute on function public.ensure_profile(text) to authenticated, service_role;

create or replace function private.link_partner_by_code_impl(_code text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  partner public.profiles;
  caller_id uuid := auth.uid();
  ua uuid;
  ub uuid;
  norm text;
begin
  if caller_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if not private.bixbo_health_consent_active(caller_id) then
    raise exception 'current health-data consent is required' using errcode = '42501';
  end if;
  if _code is null or pg_catalog.length(pg_catalog.btrim(_code)) = 0 then
    raise exception 'code required' using errcode = '22023';
  end if;

  norm := pg_catalog.upper(pg_catalog.btrim(_code));
  select * into partner
  from public.profiles
  where pairing_code = norm
  limit 1;

  if partner is null or not private.bixbo_health_consent_active(partner.id) then
    raise exception 'partner is not available for pairing' using errcode = 'P0002';
  end if;
  if partner.id = caller_id then
    raise exception 'cannot link to yourself' using errcode = '22023';
  end if;

  if caller_id < partner.id then
    ua := caller_id;
    ub := partner.id;
  else
    ua := partner.id;
    ub := caller_id;
  end if;

  insert into public.partner_links(a, b)
  values (ua, ub)
  on conflict (a, b) do nothing;

  partner.pairing_code := '';
  return partner;
end;
$$;

revoke all on function private.link_partner_by_code_impl(text) from public, anon;
grant execute on function private.link_partner_by_code_impl(text) to authenticated, service_role;

revoke select, insert, update, delete on public.profiles from authenticated;
grant select (id, display_name, gender, created_at) on public.profiles to authenticated;
grant update (display_name, gender) on public.profiles to authenticated;
