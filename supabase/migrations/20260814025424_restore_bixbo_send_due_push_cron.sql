-- Keep the automatic BIXBO reminder scheduler on the owned Supabase project.
-- This migration supersedes older cron migrations that referenced the former
-- Lovable-managed Supabase project URL.

DO $$
DECLARE
  existing_job bigint;
BEGIN
  SELECT jobid
  INTO existing_job
  FROM cron.job
  WHERE jobname = 'bixbo-send-due-push'
  LIMIT 1;

  IF existing_job IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job);
  END IF;

  PERFORM cron.schedule(
    'bixbo-send-due-push',
    '* * * * *',
    $cron$
      SELECT net.http_post(
        url := 'https://wgdydwttzsveevkljkmr.supabase.co/functions/v1/send-due-push',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', public.get_push_cron_secret_for_service()
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 10000
      );
    $cron$
  );
END $$;
