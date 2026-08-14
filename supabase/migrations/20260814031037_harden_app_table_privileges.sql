-- Remove non-DML privileges that the browser/API roles never need.
-- RLS protects row-level SELECT/INSERT/UPDATE/DELETE, but TRUNCATE is a
-- table-level operation and is outside the normal PostgREST/RLS data path.
-- Keeping REFERENCES/TRIGGER off the client roles also reduces unnecessary
-- database capabilities without changing BIXBO's normal CRUD behavior.

REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.profiles FROM anon, authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.partner_links FROM anon, authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.partner_shared_data FROM anon, authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.user_data FROM anon, authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.push_subscriptions FROM anon, authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.push_reminder_profiles FROM anon, authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.push_delivery_log FROM anon, authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.user_backups FROM anon, authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.app_global_config FROM anon, authenticated;
