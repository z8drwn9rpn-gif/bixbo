
-- Helper: random pairing code
CREATE OR REPLACE FUNCTION public.gen_pairing_code() RETURNS text
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  out text := '';
  i int;
BEGIN
  FOR i IN 1..6 LOOP
    out := out || substr(chars, 1 + floor(random() * length(chars))::int, 1);
  END LOOP;
  RETURN out;
END $$;

-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  gender text,
  pairing_code text NOT NULL UNIQUE DEFAULT public.gen_pairing_code(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- partner_links (normalized a < b)
CREATE TABLE public.partner_links (
  a uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  b uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (a, b),
  CHECK (a < b)
);
GRANT SELECT, DELETE ON public.partner_links TO authenticated;
GRANT ALL ON public.partner_links TO service_role;
ALTER TABLE public.partner_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own partner link" ON public.partner_links
  FOR SELECT TO authenticated USING (auth.uid() = a OR auth.uid() = b);
CREATE POLICY "Users delete own partner link" ON public.partner_links
  FOR DELETE TO authenticated USING (auth.uid() = a OR auth.uid() = b);

-- is_partner_of helper
CREATE OR REPLACE FUNCTION public.is_partner_of(_owner uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.partner_links
    WHERE (a = auth.uid() AND b = _owner)
       OR (b = auth.uid() AND a = _owner)
  )
$$;

-- user_data
CREATE TABLE public.user_data (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_data TO authenticated;
GRANT ALL ON public.user_data TO service_role;
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own data" ON public.user_data
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Partners can read data" ON public.user_data
  FOR SELECT TO authenticated USING (public.is_partner_of(user_id));

-- RPC: bootstrap profile (idempotent)
CREATE OR REPLACE FUNCTION public.ensure_profile(_display_name text DEFAULT NULL)
RETURNS public.profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.profiles;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.profiles(id, display_name)
    VALUES (auth.uid(), _display_name)
    ON CONFLICT (id) DO UPDATE
    SET display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name)
    RETURNING * INTO p;
  RETURN p;
END $$;
GRANT EXECUTE ON FUNCTION public.ensure_profile(text) TO authenticated;

-- RPC: link partner by their pairing code
CREATE OR REPLACE FUNCTION public.link_partner_by_code(_code text)
RETURNS public.profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
END $$;
GRANT EXECUTE ON FUNCTION public.link_partner_by_code(text) TO authenticated;

-- RPC: unlink partner
CREATE OR REPLACE FUNCTION public.unlink_partner() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.partner_links WHERE a = auth.uid() OR b = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.unlink_partner() TO authenticated;

-- RPC: get partner profile + data
CREATE OR REPLACE FUNCTION public.get_partner() RETURNS TABLE(id uuid, display_name text, gender text, data jsonb, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.display_name, p.gender, COALESCE(ud.data, '{}'::jsonb), COALESCE(ud.updated_at, p.created_at)
  FROM public.partner_links pl
  JOIN public.profiles p
    ON p.id = CASE WHEN pl.a = auth.uid() THEN pl.b ELSE pl.a END
  LEFT JOIN public.user_data ud ON ud.user_id = p.id
  WHERE pl.a = auth.uid() OR pl.b = auth.uid()
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_partner() TO authenticated;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER trg_profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_user_data_touch BEFORE UPDATE ON public.user_data
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
