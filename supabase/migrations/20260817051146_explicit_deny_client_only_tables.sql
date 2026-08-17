create policy "Deny client access to service config"
on private.service_config
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

create policy "Deny client access to push delivery log"
on public.push_delivery_log
as restrictive
for all
to anon, authenticated
using (false)
with check (false);
