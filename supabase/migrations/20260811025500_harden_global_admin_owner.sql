create extension if not exists pgcrypto;

create or replace function public.publish_global_admin_config(_pin text, _config jsonb)
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  next_version bigint;
  caller_email text;
begin
  caller_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  if auth.uid() is null or caller_email <> 'luciapaulovicova2@gmail.com' then
    raise exception 'Admin owner account required' using errcode = '42501';
  end if;

  if encode(digest(coalesce(_pin, ''), 'sha256'), 'hex') <> 'dc4bc886825c446e6ae02d4d0c6a8787af0395079effcc3afc0f8bdc40cbd161' then
    raise exception 'Invalid admin PIN' using errcode = '42501';
  end if;

  insert into public.app_global_config (id, config, version, published_at)
  values ('default', coalesce(_config, '{}'::jsonb), 1, now())
  on conflict (id) do update
    set config = excluded.config,
        version = public.app_global_config.version + 1,
        published_at = now()
  returning version into next_version;

  return next_version;
end;
$$;

revoke all on function public.publish_global_admin_config(text, jsonb) from public;
revoke execute on function public.publish_global_admin_config(text, jsonb) from anon;
grant execute on function public.publish_global_admin_config(text, jsonb) to authenticated;
