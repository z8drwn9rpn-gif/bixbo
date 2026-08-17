-- Emergency production hardening captured in migration history.
-- Keep this file in source control so fresh databases reproduce the exact
-- production migration sequence before the consolidated normalization step.

drop policy if exists "Owner deletes partner shared data" on public.partner_shared_data;
drop policy if exists "Owner inserts partner shared data" on public.partner_shared_data;
drop policy if exists "Owner updates partner shared data" on public.partner_shared_data;
drop policy if exists "Owner or linked partner reads shared data" on public.partner_shared_data;
