-- Keep partner-shared health data behind one unambiguous consent-aware policy per action.
-- Older migrations created permissive owner/partner policies. Because PostgreSQL ORs
-- permissive policies for the same command, leaving those policies in place would
-- allow them to bypass the later health-consent predicate.

drop policy if exists "Owner manages partner shared data" on public.partner_shared_data;
drop policy if exists "Linked partner reads shared data" on public.partner_shared_data;
drop policy if exists "Owner or linked partner reads shared data" on public.partner_shared_data;
drop policy if exists "Owner inserts partner shared data" on public.partner_shared_data;
drop policy if exists "Owner updates partner shared data" on public.partner_shared_data;
drop policy if exists "Owner deletes partner shared data" on public.partner_shared_data;

create policy "Owner or linked partner reads shared data"
on public.partner_shared_data
for select to authenticated
using (
  ((select auth.uid()) = user_id or public.is_partner_of(user_id))
  and private.bixbo_health_consent_active(user_id)
);

create policy "Owner inserts partner shared data"
on public.partner_shared_data
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and private.bixbo_health_consent_active(user_id)
);

create policy "Owner updates partner shared data"
on public.partner_shared_data
for update to authenticated
using (
  (select auth.uid()) = user_id
  and private.bixbo_health_consent_active(user_id)
)
with check (
  (select auth.uid()) = user_id
  and private.bixbo_health_consent_active(user_id)
);

create policy "Owner deletes partner shared data"
on public.partner_shared_data
for delete to authenticated
using (
  (select auth.uid()) = user_id
  and private.bixbo_health_consent_active(user_id)
);
