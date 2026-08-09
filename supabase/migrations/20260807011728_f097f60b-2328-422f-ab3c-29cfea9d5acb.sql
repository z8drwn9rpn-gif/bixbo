-- Private store for internal service secrets.
-- The cron secret is generated inside PostgreSQL so no reusable secret is
-- committed to the repository.
CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.service_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE private.service_config ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON private.service_config FROM PUBLIC, anon, authenticated;
GRANT ALL ON private.service_config TO service_role;

INSERT INTO private.service_config (key, value)
VALUES (
  'push_cron_secret',
  replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_push_cron_secret_for_service()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = private, public
AS $$
  SELECT value FROM private.service_config WHERE key = 'push_cron_secret';
$$;

REVOKE ALL ON FUNCTION public.get_push_cron_secret_for_service() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_push_cron_secret_for_service() TO service_role;

-- Repoint the every-minute scheduler at the database-held secret.
SELECT cron.unschedule('bixbo-send-due-push');

SELECT cron.schedule(
  'bixbo-send-due-push',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://zvpfzfofhalmwrtipcsp.supabase.co/functions/v1/send-due-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT value FROM private.service_config WHERE key = 'push_cron_secret')
    ),
    body := '{"source":"pg_cron"}'::jsonb,
    timeout_milliseconds := 25000
  );
  $$
);
