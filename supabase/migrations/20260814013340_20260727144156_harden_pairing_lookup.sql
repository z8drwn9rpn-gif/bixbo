-- Remove overly broad policy that exposed all profiles to any authenticated user
DROP POLICY IF EXISTS "Lookup profile by pairing code" ON public.profiles;

-- Harden link_partner_by_code: run as definer so it can look up the single matching profile
-- without needing a broad SELECT policy on profiles. Strict checks inside.
CREATE OR REPLACE FUNCTION public.link_partner_by_code(_code text)
 RETURNS public.profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  partner public.profiles;
  ua uuid; ub uuid;
  norm text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _code IS NULL OR length(btrim(_code)) = 0 THEN RAISE EXCEPTION 'code required'; END IF;
  norm := upper(btrim(_code));

  SELECT * INTO partner FROM public.profiles WHERE pairing_code = norm LIMIT 1;
  IF partner IS NULL THEN RAISE EXCEPTION 'code not found'; END IF;
  IF partner.id = auth.uid() THEN RAISE EXCEPTION 'cannot link to yourself'; END IF;

  IF auth.uid() < partner.id THEN ua := auth.uid(); ub := partner.id;
  ELSE ua := partner.id; ub := auth.uid(); END IF;

  INSERT INTO public.partner_links(a, b) VALUES (ua, ub)
    ON CONFLICT (a, b) DO NOTHING;
  RETURN partner;
END $function$;

REVOKE EXECUTE ON FUNCTION public.link_partner_by_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_partner_by_code(text) TO authenticated;