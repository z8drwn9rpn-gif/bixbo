create extension if not exists pgcrypto;

create table if not exists public.app_global_config (
  id text primary key,
  config jsonb not null default '{}'::jsonb,
  version bigint not null default 1,
  published_at timestamptz not null default now()
);

insert into public.app_global_config (id, config)
values ('default', '{}'::jsonb)
on conflict (id) do nothing;

alter table public.app_global_config enable row level security;

drop policy if exists "Global app config is readable" on public.app_global_config;
create policy "Global app config is readable"
on public.app_global_config
for select
to anon, authenticated
using (true);

revoke insert, update, delete on public.app_global_config from anon, authenticated;
grant select on public.app_global_config to anon, authenticated;

create or replace function public.publish_global_admin_config(_pin text, _config jsonb)
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  next_version bigint;
begin
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
grant execute on function public.publish_global_admin_config(text, jsonb) to anon, authenticated;
