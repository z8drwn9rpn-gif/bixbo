-- Make Couple pairing fail closed unless both accounts have current health-data
-- consent. Preserve existing links so either participant can still unlink, but
-- stop direct browser inserts and block partner/profile reads while consent is
-- inactive or missing.

create or replace function public.is_partner_of(_owner uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and private.bixbo_health_consent_active((select auth.uid()))
    and private.bixbo_health_consent_active(_owner)
    and exists (
      select 1
      from public.partner_links
      where (a = (select auth.uid()) and b = _owner)
         or (b = (select auth.uid()) and a = _owner)
    );
$$;

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
  if _code is null or length(btrim(_code)) = 0 then
    raise exception 'code required' using errcode = '22023';
  end if;

  norm := upper(btrim(_code));
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

  return partner;
end;
$$;

revoke all on function private.link_partner_by_code_impl(text) from public, anon, authenticated;
grant execute on function private.link_partner_by_code_impl(text) to service_role;

create or replace function public.link_partner_by_code(_code text)
returns public.profiles
language sql
security definer
set search_path = ''
as $$
  select private.link_partner_by_code_impl(_code);
$$;

revoke all on function public.link_partner_by_code(text) from public, anon;
grant execute on function public.link_partner_by_code(text) to authenticated, service_role;

drop policy if exists "Users create own partner link" on public.partner_links;
revoke insert on public.partner_links from authenticated;

create or replace function public.get_partner()
returns table(id uuid, display_name text, gender text, data jsonb, updated_at timestamptz)
language sql
stable
set search_path = ''
as $$
  select
    p.id,
    p.display_name,
    p.gender,
    coalesce(psd.data, '{}'::jsonb),
    coalesce(psd.updated_at, p.created_at)
  from public.partner_links pl
  join public.profiles p
    on p.id = case when pl.a = (select auth.uid()) then pl.b else pl.a end
  left join public.partner_shared_data psd on psd.user_id = p.id
  where (pl.a = (select auth.uid()) or pl.b = (select auth.uid()))
    and public.is_partner_of(p.id)
  limit 1;
$$;

revoke all on function public.get_partner() from public, anon;
grant execute on function public.get_partner() to authenticated, service_role;
