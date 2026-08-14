-- ============================================================
-- BIXBO SECURITY DEFINER hardening
--
-- Goal:
-- - no SECURITY DEFINER function remains callable from the exposed public API
--   by anon/authenticated roles;
-- - privilege-requiring implementations live in the non-exposed private schema;
-- - public RPC wrappers remain SECURITY INVOKER and preserve current app calls.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;

-- Authenticated users need schema USAGE only so the SECURITY INVOKER public
-- wrappers below can call the narrowly granted private implementations.
GRANT USAGE ON SCHEMA private TO authenticated;

-- ------------------------------------------------------------
-- 1) Helpers that do not need elevated privileges: SECURITY INVOKER
-- ------------------------------------------------------------
ALTER FUNCTION public.is_partner_of(uuid) SECURITY INVOKER;
ALTER FUNCTION public.ensure_profile(text) SECURITY INVOKER;
ALTER FUNCTION public.unlink_partner() SECURITY INVOKER;

REVOKE EXECUTE ON FUNCTION public.is_partner_of(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ensure_profile(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.unlink_partner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_partner_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_profile(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlink_partner() TO authenticated;

-- ------------------------------------------------------------
-- 2) Partner linking
--
-- Looking up another user's pairing code must bypass the owner-only profile
-- SELECT policy. Keep that elevated implementation out of the exposed public
-- schema and expose only an invoker wrapper.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.link_partner_by_code_impl(_code text)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $function$
DECLARE
  partner public.profiles;
  ua uuid;
  ub uuid;
  norm text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING errcode = '42501';
  END IF;
  IF _code IS NULL OR length(btrim(_code)) = 0 THEN
    RAISE EXCEPTION 'code required' USING errcode = '22023';
  END IF;

  norm := upper(btrim(_code));
  SELECT * INTO partner
  FROM public.profiles
  WHERE pairing_code = norm
  LIMIT 1;

  IF partner IS NULL THEN
    RAISE EXCEPTION 'code not found' USING errcode = 'P0002';
  END IF;
  IF partner.id = auth.uid() THEN
    RAISE EXCEPTION 'cannot link to yourself' USING errcode = '22023';
  END IF;

  IF auth.uid() < partner.id THEN
    ua := auth.uid();
    ub := partner.id;
  ELSE
    ua := partner.id;
    ub := auth.uid();
  END IF;

  INSERT INTO public.partner_links(a, b)
  VALUES (ua, ub)
  ON CONFLICT (a, b) DO NOTHING;

  RETURN partner;
END
$function$;

REVOKE ALL ON FUNCTION private.link_partner_by_code_impl(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.link_partner_by_code_impl(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.link_partner_by_code(_code text)
RETURNS public.profiles
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private
AS $$
  SELECT private.link_partner_by_code_impl(_code);
$$;

REVOKE EXECUTE ON FUNCTION public.link_partner_by_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_partner_by_code(text) TO authenticated;

-- ------------------------------------------------------------
-- 3) Global admin publishing
--
-- The write still requires the owner account + PIN, but the SECURITY DEFINER
-- implementation is moved out of the exposed API schema. The public RPC keeps
-- its existing name/signature and is SECURITY INVOKER.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.publish_global_admin_config_impl(_pin text, _config jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions
AS $$
DECLARE
  next_version bigint;
  caller_email text;
BEGIN
  caller_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  IF auth.uid() IS NULL OR caller_email <> 'luciapaulovicova2@gmail.com' THEN
    RAISE EXCEPTION 'Admin owner account required' USING errcode = '42501';
  END IF;

  IF encode(digest(coalesce(_pin, ''), 'sha256'), 'hex') <>
     'dc4bc886825c446e6ae02d4d0c6a8787af0395079effcc3afc0f8bdc40cbd161' THEN
    RAISE EXCEPTION 'Invalid admin PIN' USING errcode = '42501';
  END IF;

  INSERT INTO public.app_global_config (id, config, version, published_at)
  VALUES ('default', coalesce(_config, '{}'::jsonb), 1, now())
  ON CONFLICT (id) DO UPDATE
    SET config = excluded.config,
        version = public.app_global_config.version + 1,
        published_at = now()
  RETURNING version INTO next_version;

  RETURN next_version;
END;
$$;

REVOKE ALL ON FUNCTION private.publish_global_admin_config_impl(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.publish_global_admin_config_impl(text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.publish_global_admin_config(_pin text, _config jsonb)
RETURNS bigint
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private
AS $$
  SELECT private.publish_global_admin_config_impl(_pin, _config);
$$;

REVOKE ALL ON FUNCTION public.publish_global_admin_config(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_global_admin_config(text, jsonb) TO authenticated;

-- ------------------------------------------------------------
-- 4) Final exposed-schema safety net
--
-- Any remaining public SECURITY DEFINER function must not be callable by the
-- client roles. Existing service_role-only helpers remain usable.
-- ------------------------------------------------------------
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.signature);
  END LOOP;
END $$;

-- Re-grant only the public SECURITY INVOKER RPCs intentionally used by the app.
GRANT EXECUTE ON FUNCTION public.ensure_profile(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_partner_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlink_partner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_partner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_partner_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_global_admin_config(text, jsonb) TO authenticated;
