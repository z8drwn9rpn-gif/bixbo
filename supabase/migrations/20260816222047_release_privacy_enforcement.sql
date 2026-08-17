-- Release privacy enforcement for BIXBO special-category cloud data.
--
-- 1. A withdrawn health-data consent blocks authenticated cloud health reads/writes.
-- 2. Partner sharing also fails closed when the data owner's consent is withdrawn.
-- 3. Content-free analytics stays allow-listed and is retained for at most 90 days.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.bixbo_health_consent_active(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_legal_consents consent
    where consent.user_id = target_user
      and consent.health_consent_withdrawn_at is null
  );
$$;

revoke all on function private.bixbo_health_consent_active(uuid) from public, anon;
grant execute on function private.bixbo_health_consent_active(uuid) to authenticated, service_role;

-- Complete private diary: owner only + active special-category consent.
drop policy if exists "Users manage own data" on public.user_data;
create policy "Users manage own data"
on public.user_data
for all to authenticated
using (
  (select auth.uid()) = user_id
  and private.bixbo_health_consent_active(user_id)
)
with check (
  (select auth.uid()) = user_id
  and private.bixbo_health_consent_active(user_id)
);

-- Narrow Couple projection: owner can manage only while consent is active;
-- linked partner can read only while the owner's consent remains active.
drop policy if exists "Owner manages partner shared data" on public.partner_shared_data;
drop policy if exists "Linked partner reads shared data" on public.partner_shared_data;
create policy "Owner manages partner shared data"
on public.partner_shared_data
for all to authenticated
using (
  (select auth.uid()) = user_id
  and private.bixbo_health_consent_active(user_id)
)
with check (
  (select auth.uid()) = user_id
  and private.bixbo_health_consent_active(user_id)
);
create policy "Linked partner reads shared data"
on public.partner_shared_data
for select to authenticated
using (
  public.is_partner_of(user_id)
  and private.bixbo_health_consent_active(user_id)
);

-- Backups contain the complete diary and therefore use the same consent gate.
drop policy if exists "Users can read own backups" on public.user_backups;
drop policy if exists "Users can create own backups" on public.user_backups;
drop policy if exists "Users can delete own backups" on public.user_backups;
create policy "Users can read own backups"
on public.user_backups for select to authenticated
using ((select auth.uid()) = user_id and private.bixbo_health_consent_active(user_id));
create policy "Users can create own backups"
on public.user_backups for insert to authenticated
with check ((select auth.uid()) = user_id and private.bixbo_health_consent_active(user_id));
create policy "Users can delete own backups"
on public.user_backups for delete to authenticated
using ((select auth.uid()) = user_id and private.bixbo_health_consent_active(user_id));

-- Push subscriptions/reminder profiles can reveal health-reminder usage. Stop
-- authenticated access when special-category cloud consent is withdrawn.
drop policy if exists "Owner reads push subscriptions" on public.push_subscriptions;
drop policy if exists "Owner inserts push subscriptions" on public.push_subscriptions;
drop policy if exists "Owner updates push subscriptions" on public.push_subscriptions;
drop policy if exists "Owner deletes push subscriptions" on public.push_subscriptions;
create policy "Owner reads push subscriptions"
on public.push_subscriptions for select to authenticated
using ((select auth.uid()) = user_id and private.bixbo_health_consent_active(user_id));
create policy "Owner inserts push subscriptions"
on public.push_subscriptions for insert to authenticated
with check ((select auth.uid()) = user_id and private.bixbo_health_consent_active(user_id));
create policy "Owner updates push subscriptions"
on public.push_subscriptions for update to authenticated
using ((select auth.uid()) = user_id and private.bixbo_health_consent_active(user_id))
with check ((select auth.uid()) = user_id and private.bixbo_health_consent_active(user_id));
create policy "Owner deletes push subscriptions"
on public.push_subscriptions for delete to authenticated
using ((select auth.uid()) = user_id and private.bixbo_health_consent_active(user_id));

drop policy if exists "Owner manages reminder profile" on public.push_reminder_profiles;
create policy "Owner manages reminder profile"
on public.push_reminder_profiles for all to authenticated
using ((select auth.uid()) = user_id and private.bixbo_health_consent_active(user_id))
with check ((select auth.uid()) = user_id and private.bixbo_health_consent_active(user_id));

-- Keep analytics content-free. These extra coarse events are usable only after
-- the existing user opt-in; there are still no paths, IDs, properties or health payloads.
alter table public.product_analytics_events
  drop constraint if exists product_analytics_events_event_name_check;
alter table public.product_analytics_events
  add constraint product_analytics_events_event_name_check
  check (event_name in (
    'onboarding_started',
    'onboarding_completed',
    'account_created',
    'first_log_created',
    'feature_area_opened'
  ));

drop policy if exists "authenticated_insert_content_free_product_event" on public.product_analytics_events;
create policy "authenticated_insert_content_free_product_event"
on public.product_analytics_events for insert to authenticated
with check (event_name in (
  'onboarding_started',
  'onboarding_completed',
  'account_created',
  'first_log_created',
  'feature_area_opened'
));

create or replace function private.cleanup_bixbo_product_analytics()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.product_analytics_events
  where occurred_at < now() - interval '90 days';
$$;
revoke all on function private.cleanup_bixbo_product_analytics() from public, anon, authenticated;
grant execute on function private.cleanup_bixbo_product_analytics() to service_role;

-- Apply the retention immediately and keep it automatic in production.
select private.cleanup_bixbo_product_analytics();

do $$
declare
  existing_job bigint;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    select jobid into existing_job
    from cron.job
    where jobname = 'bixbo-product-analytics-retention'
    limit 1;

    if existing_job is not null then
      perform cron.unschedule(existing_job);
    end if;

    perform cron.schedule(
      'bixbo-product-analytics-retention',
      '31 3 * * *',
      $cron$select private.cleanup_bixbo_product_analytics();$cron$
    );
  end if;
end $$;
