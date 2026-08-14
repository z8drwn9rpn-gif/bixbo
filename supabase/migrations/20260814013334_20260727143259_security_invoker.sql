-- Convert SECURITY DEFINER functions callable by authenticated users to SECURITY INVOKER.
-- Add supporting RLS policies so the invoker-permission execution still works.

-- 1) Profile visibility for pairing-code lookups (needed by link_partner_by_code)
DROP POLICY IF EXISTS "Lookup profile by pairing code" ON public.profiles;
CREATE POLICY "Lookup profile by pairing code"
  ON public.profiles FOR SELECT TO authenticated
  USING (pairing_code IS NOT NULL);

-- 2) Profile visibility for a linked partner (needed by get_partner)
DROP POLICY IF EXISTS "Users read linked partner profile" ON public.profiles;
CREATE POLICY "Users read linked partner profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_partner_of(id));

-- 3) ensure_profile → INVOKER
CREATE OR REPLACE FUNCTION public.ensure_profile(_display_name text DEFAULT NULL::text)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
DECLARE p public.profiles;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.profiles(id, display_name)
    VALUES (auth.uid(), _display_name)
    ON CONFLICT (id) DO UPDATE
    SET display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name)
    RETURNING * INTO p;
  RETURN p;
END $function$;

-- 4) unlink_partner → INVOKER
CREATE OR REPLACE FUNCTION public.unlink_partner()
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  DELETE FROM public.partner_links WHERE a = auth.uid() OR b = auth.uid();
$function$;

-- 5) is_partner_of → INVOKER (relies on partner_links SELECT policy)
CREATE OR REPLACE FUNCTION public.is_partner_of(_owner uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.partner_links
    WHERE (a = auth.uid() AND b = _owner)
       OR (b = auth.uid() AND a = _owner)
  )
$function$;

-- 6) link_partner_by_code → INVOKER (relies on pairing-code SELECT policy)
CREATE OR REPLACE FUNCTION public.link_partner_by_code(_code text)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
  partner public.profiles;
  ua uuid; ub uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO partner FROM public.profiles WHERE pairing_code = upper(_code);
  IF partner IS NULL THEN RAISE EXCEPTION 'code not found'; END IF;
  IF partner.id = auth.uid() THEN RAISE EXCEPTION 'cannot link to yourself'; END IF;

  IF auth.uid() < partner.id THEN ua := auth.uid(); ub := partner.id;
  ELSE ua := partner.id; ub := auth.uid(); END IF;

  INSERT INTO public.partner_links(a, b) VALUES (ua, ub)
    ON CONFLICT (a, b) DO NOTHING;
  RETURN partner;
END $function$;

-- 7) get_partner → INVOKER (relies on partner-read policies on profiles + user_data)
CREATE OR REPLACE FUNCTION public.get_partner()
RETURNS TABLE(id uuid, display_name text, gender text, data jsonb, updated_at timestamp with time zone)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT p.id, p.display_name, p.gender, COALESCE(ud.data, '{}'::jsonb), COALESCE(ud.updated_at, p.created_at)
  FROM public.partner_links pl
  JOIN public.profiles p
    ON p.id = CASE WHEN pl.a = auth.uid() THEN pl.b ELSE pl.a END
  LEFT JOIN public.user_data ud ON ud.user_id = p.id
  WHERE pl.a = auth.uid() OR pl.b = auth.uid()
  LIMIT 1;
$function$;