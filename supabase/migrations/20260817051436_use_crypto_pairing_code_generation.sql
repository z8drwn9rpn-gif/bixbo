-- Pairing codes are invitation secrets. Keep the existing six-character,
-- ambiguity-reduced alphabet while sourcing every future code from pgcrypto.
-- 31 does not divide 256, so bytes >= 248 are rejected to avoid modulo bias.

create or replace function public.gen_pairing_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  chars constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  out text := '';
  entropy bytea;
  b integer;
begin
  while pg_catalog.length(out) < 6 loop
    entropy := extensions.gen_random_bytes(1);
    b := pg_catalog.get_byte(entropy, 0);
    if b < 248 then
      out := out || pg_catalog.substr(chars, 1 + (b % 31), 1);
    end if;
  end loop;
  return out;
end;
$$;

revoke all on function public.gen_pairing_code() from public, anon;
grant execute on function public.gen_pairing_code() to authenticated, service_role;
