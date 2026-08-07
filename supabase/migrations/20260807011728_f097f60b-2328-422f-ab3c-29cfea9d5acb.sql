-- Private store for internal service secrets (no Data API access at all).
CREATE TABLE IF NOT EXISTS private.service_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE private.service_config ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON private.service_config FROM anon, authenticated;
GRANT ALL ON private.service_config TO service_role;

INSERT INTO private.service_config (key, value)
VALUES ('push_cron_secret', '7353385207c8143b01ed1b5aa54fcbe463c80993116e8055a11cf8a0a08e3116')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Repoint the every-minute scheduler at the stored secret.
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
