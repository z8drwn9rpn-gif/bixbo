-- Keep the privileged pairing implementation in the private schema and expose
-- only a SECURITY INVOKER wrapper through the public API. The private function
-- remains consent-aware, while the exposed function no longer triggers the
-- public SECURITY DEFINER advisory.

grant usage on schema private to authenticated;
grant execute on function private.link_partner_by_code_impl(text) to authenticated, service_role;

create or replace function public.link_partner_by_code(_code text)
returns public.profiles
language sql
security invoker
set search_path = ''
as $$
  select private.link_partner_by_code_impl(_code);
$$;

revoke all on function public.link_partner_by_code(text) from public, anon;
grant execute on function public.link_partner_by_code(text) to authenticated, service_role;
