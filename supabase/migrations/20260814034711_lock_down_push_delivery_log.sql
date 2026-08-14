-- Server-only delivery log: clients must never access this table directly.
REVOKE ALL PRIVILEGES ON TABLE public.push_delivery_log FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.push_delivery_log TO service_role;
