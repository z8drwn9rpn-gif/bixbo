create or replace function public.get_partner()
returns table(id uuid, display_name text, gender text, data jsonb, updated_at timestamp with time zone)
language sql
stable
set search_path to ''
as $function$
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
  order by pl.created_at desc, coalesce(psd.updated_at, p.created_at) desc, p.id
  limit 1;
$function$;
