-- Versioned, owner-only BIXBO snapshots. Live user_data remains sync state;
-- this table is the recoverable backup history.
create table if not exists public.user_backups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  schema_version integer not null default 3,
  data jsonb not null
);

create index if not exists user_backups_user_created_idx
  on public.user_backups (user_id, created_at desc);

alter table public.user_backups enable row level security;

revoke all on table public.user_backups from anon;
grant select, insert, delete on table public.user_backups to authenticated;

create policy "Users can read own backups"
  on public.user_backups for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can create own backups"
  on public.user_backups for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete own backups"
  on public.user_backups for delete
  to authenticated
  using (auth.uid() = user_id);
