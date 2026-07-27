
-- 1) Add INSERT policy for partner_links so authenticated users can create their own link
CREATE POLICY "Users create own partner link"
ON public.partner_links
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = a OR auth.uid() = b);

-- 2) Fix mutable search_path on touch_updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$ BEGIN NEW.updated_at = now(); RETURN NEW; END $function$;

-- 3) Revoke EXECUTE from anon and public for SECURITY DEFINER functions;
--    keep grant only for authenticated (each function still checks auth.uid()).
REVOKE EXECUTE ON FUNCTION public.link_partner_by_code(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.unlink_partner() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ensure_profile(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_partner_of(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_partner() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.gen_pairing_code() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.link_partner_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlink_partner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_profile(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_partner_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_partner() TO authenticated;
