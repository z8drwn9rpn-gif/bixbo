-- BIXBO owned Supabase: RLS and FK index optimization.
-- Keeps the same authorization model while avoiding per-row auth.uid()
-- evaluation and duplicate permissive SELECT policies.

create index if not exists partner_links_b_idx on public.partner_links (b);
create index if not exists push_delivery_log_user_id_idx on public.push_delivery_log (user_id);

-- profiles: one SELECT policy for owner or linked partner, owner-only writes.
drop policy if exists "Users read own profile" on public.profiles;
drop policy if exists "Users read linked partner profile" on public.profiles;
drop policy if exists "Users insert own profile" on public.profiles;
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users read own or linked partner profile"
  on public.profiles for select to authenticated
  using (((select auth.uid()) = id) or public.is_partner_of(id));
create policy "Users insert own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy "Users update own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- partner links: same semantics, but cache auth.uid() once per statement.
drop policy if exists "Users create own partner link" on public.partner_links;
drop policy if exists "Users delete own partner link" on public.partner_links;
drop policy if exists "Users see own partner link" on public.partner_links;
create policy "Users create own partner link"
  on public.partner_links for insert to authenticated
  with check (((select auth.uid()) = a) or ((select auth.uid()) = b));
create policy "Users delete own partner link"
  on public.partner_links for delete to authenticated
  using (((select auth.uid()) = a) or ((select auth.uid()) = b));
create policy "Users see own partner link"
  on public.partner_links for select to authenticated
  using (((select auth.uid()) = a) or ((select auth.uid()) = b));

-- Complete private health payload remains owner-only.
drop policy if exists "Users manage own data" on public.user_data;
create policy "Users manage own data"
  on public.user_data for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Push subscriptions remain owner-only for authenticated clients.
drop policy if exists "Owner reads push subscriptions" on public.push_subscriptions;
drop policy if exists "Owner inserts push subscriptions" on public.push_subscriptions;
drop policy if exists "Owner updates push subscriptions" on public.push_subscriptions;
drop policy if exists "Owner deletes push subscriptions" on public.push_subscriptions;
create policy "Owner reads push subscriptions"
  on public.push_subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Owner inserts push subscriptions"
  on public.push_subscriptions for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Owner updates push subscriptions"
  on public.push_subscriptions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Owner deletes push subscriptions"
  on public.push_subscriptions for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Reminder profile remains owner-only for authenticated clients.
drop policy if exists "Owner manages reminder profile" on public.push_reminder_profiles;
create policy "Owner manages reminder profile"
  on public.push_reminder_profiles for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Partner projection: one SELECT path, owner-only writes.
drop policy if exists "Owner manages partner shared data" on public.partner_shared_data;
drop policy if exists "Linked partner reads shared data" on public.partner_shared_data;
create policy "Owner or linked partner reads shared data"
  on public.partner_shared_data for select to authenticated
  using (((select auth.uid()) = user_id) or public.is_partner_of(user_id));
create policy "Owner inserts partner shared data"
  on public.partner_shared_data for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Owner updates partner shared data"
  on public.partner_shared_data for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Owner deletes partner shared data"
  on public.partner_shared_data for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Cloud backups remain owner-only.
drop policy if exists "Users can read own backups" on public.user_backups;
drop policy if exists "Users can create own backups" on public.user_backups;
drop policy if exists "Users can delete own backups" on public.user_backups;
create policy "Users can read own backups"
  on public.user_backups for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create own backups"
  on public.user_backups for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can delete own backups"
  on public.user_backups for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Avoid per-row auth.uid() evaluation inside partner lookup helper.
create or replace function public.is_partner_of(_owner uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.partner_links
    where (a = (select auth.uid()) and b = _owner)
       or (b = (select auth.uid()) and a = _owner)
  )
$$;
