-- Make intentionally server-only tables explicit to the database linter as well
-- as to runtime clients. These restrictive policies keep client access denied
-- even if a future grant is added accidentally.

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
