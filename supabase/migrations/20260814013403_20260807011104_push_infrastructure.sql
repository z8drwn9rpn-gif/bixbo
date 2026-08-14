-- ============================================================
-- BIXBO Web Push: devices, reminder profiles, delivery log
-- ============================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  expiration_time bigint,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_key
  ON public.push_subscriptions (endpoint);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
  ON public.push_subscriptions (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own push subscription" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users read own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users delete own push subscriptions" ON public.push_subscriptions;

CREATE POLICY "Owner reads push subscriptions" ON public.push_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner inserts push subscriptions" ON public.push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner updates push subscriptions" ON public.push_subscriptions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner deletes push subscriptions" ON public.push_subscriptions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_push_subscriptions_touch ON public.push_subscriptions;
CREATE TRIGGER trg_push_subscriptions_touch
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.push_reminder_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone text NOT NULL DEFAULT 'UTC',
  profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_reminder_profiles TO authenticated;
GRANT ALL ON public.push_reminder_profiles TO service_role;
ALTER TABLE public.push_reminder_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages reminder profile" ON public.push_reminder_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_push_reminder_profiles_touch ON public.push_reminder_profiles;
CREATE TRIGGER trg_push_reminder_profiles_touch
  BEFORE UPDATE ON public.push_reminder_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.push_delivery_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dedupe_key text NOT NULL,
  category text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS push_delivery_log_dedupe_key
  ON public.push_delivery_log (dedupe_key);
CREATE INDEX IF NOT EXISTS push_delivery_log_created_idx
  ON public.push_delivery_log (created_at);

-- Only the background sender touches this table.
GRANT ALL ON public.push_delivery_log TO service_role;
ALTER TABLE public.push_delivery_log ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_push_delivery_log_touch ON public.push_delivery_log;
CREATE TRIGGER trg_push_delivery_log_touch
  BEFORE UPDATE ON public.push_delivery_log
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Releases claims stuck in 'pending' for over 5 minutes and drops old rows.
CREATE OR REPLACE FUNCTION public.cleanup_push_delivery_log()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.push_delivery_log
  WHERE (status = 'pending' AND claimed_at < now() - interval '5 minutes')
     OR created_at < now() - interval '7 days';
$$;

REVOKE ALL ON FUNCTION public.cleanup_push_delivery_log() FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- Scheduling
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
DECLARE j record;
BEGIN
  FOR j IN SELECT jobname FROM cron.job
           WHERE jobname IN ('bixbo-send-due-push', 'bixbo-push-log-cleanup')
  LOOP
    PERFORM cron.unschedule(j.jobname);
  END LOOP;
END $$;

SELECT cron.schedule(
  'bixbo-send-due-push',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://zvpfzfofhalmwrtipcsp.supabase.co/functions/v1/send-due-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.bixbo_cron_secret', true)
    ),
    body := '{"source":"pg_cron"}'::jsonb,
    timeout_milliseconds := 25000
  );
  $$
);

SELECT cron.schedule(
  'bixbo-push-log-cleanup',
  '17 3 * * *',
  $$ SELECT public.cleanup_push_delivery_log(); $$
);
