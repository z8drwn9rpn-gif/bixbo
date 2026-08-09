-- ============================================================
-- BIXBO privacy hardening
-- - private user_data is readable only by its owner
-- - Couple reads only the narrow partner_shared_data projection
-- - get_partner() can no longer expose the complete health payload
-- - realtime publication includes the tables used by cloudSync
-- - the previously source-committed cron secret is rotated in-database
-- ============================================================

-- ------------------------------------------------------------
-- 1) Narrow partner sharing table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_shared_data (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_shared_data TO authenticated;
GRANT ALL ON public.partner_shared_data TO service_role;
ALTER TABLE public.partner_shared_data ENABLE ROW LEVEL SECURITY;

-- Remove any drifted/legacy policies first. Only the two explicit policies
-- below are allowed to survive on the shared projection.
DO $$
DECLARE policy_row record;
BEGIN
  FOR policy_row IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'partner_shared_data'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.partner_shared_data', policy_row.policyname);
  END LOOP;
END $$;

CREATE POLICY "Owner manages partner shared data"
  ON public.partner_shared_data
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Linked partner reads shared data"
  ON public.partner_shared_data
  FOR SELECT TO authenticated
  USING (public.is_partner_of(user_id));

DROP TRIGGER IF EXISTS trg_partner_shared_data_touch ON public.partner_shared_data;
CREATE TRIGGER trg_partner_shared_data_touch
  BEFORE UPDATE ON public.partner_shared_data
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ------------------------------------------------------------
-- 2) Make the complete health payload owner-only
-- ------------------------------------------------------------
-- Remove every existing user_data policy, including any legacy policy with a
-- different name, then recreate the single owner-only rule. service_role still
-- bypasses RLS for trusted backend work.
DO $$
DECLARE policy_row record;
BEGIN
  FOR policy_row IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_data'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_data', policy_row.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users manage own data"
  ON public.user_data
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 3) get_partner() returns only partner_shared_data
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_partner()
RETURNS TABLE(
  id uuid,
  display_name text,
  gender text,
  data jsonb,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.display_name,
    p.gender,
    COALESCE(psd.data, '{}'::jsonb),
    COALESCE(psd.updated_at, p.created_at)
  FROM public.partner_links pl
  JOIN public.profiles p
    ON p.id = CASE WHEN pl.a = auth.uid() THEN pl.b ELSE pl.a END
  LEFT JOIN public.partner_shared_data psd
    ON psd.user_id = p.id
  WHERE pl.a = auth.uid() OR pl.b = auth.uid()
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_partner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_partner() TO authenticated;

-- ------------------------------------------------------------
-- 4) Ensure realtime is enabled for the three tables cloudSync watches
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_data'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.user_data;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'partner_shared_data'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_shared_data;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'partner_links'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_links;
    END IF;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 5) Rotate the cron secret without storing it in source control
-- ------------------------------------------------------------
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
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = now();

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

-- Keep the existing scheduler name but make it read the freshly rotated value.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'bixbo-send-due-push') THEN
    PERFORM cron.unschedule('bixbo-send-due-push');
  END IF;
END $$;

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
