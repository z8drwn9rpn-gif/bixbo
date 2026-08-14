-- Anonymous visitors do not need direct table access to private BIXBO health data.
-- Authentication, pairing, sync, backups and push registration all run as an
-- authenticated user or through trusted Edge Functions/service_role.

REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.partner_links FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.partner_shared_data FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.user_data FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.user_backups FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.push_subscriptions FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.push_reminder_profiles FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.push_delivery_log FROM anon;
