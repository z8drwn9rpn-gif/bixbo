-- Keep stored partner relationships unlinkable but hide relationship metadata
-- while either participant lacks current health-data consent. This prevents a
-- legacy partner link from exposing the other account UUID through direct table
-- reads before both sides have a current consent record.

drop policy if exists "Users see own partner link" on public.partner_links;
create policy "Users see own partner link"
on public.partner_links
for select to authenticated
using (
  ((select auth.uid()) = a or (select auth.uid()) = b)
  and private.bixbo_health_consent_active(a)
  and private.bixbo_health_consent_active(b)
);
