-- Persist the owned-project scheduled push sender in source control.
-- This migration mirrors the already-applied production migration history.

do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job
  from cron.job
  where jobname = 'bixbo-send-due-push'
  limit 1;

  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;

  perform cron.schedule(
    'bixbo-send-due-push',
    '* * * * *',
    $cron$
      select net.http_post(
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
end $$;
