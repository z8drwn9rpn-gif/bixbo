import { readFileSync } from "node:fs";
import { describe, expect, it } from "bun:test";

const read = (path: string) => readFileSync(path, "utf8");

describe("partner pairing consent hardening", () => {
  it("requires current health consent on both sides and removes direct link inserts", () => {
    const migration = read("supabase/migrations/20260817045512_harden_partner_pairing_consent.sql");

    expect(migration).toContain("private.bixbo_health_consent_active((select auth.uid()))");
    expect(migration).toContain("private.bixbo_health_consent_active(_owner)");
    expect(migration).toContain("private.bixbo_health_consent_active(caller_id)");
    expect(migration).toContain("private.bixbo_health_consent_active(partner.id)");
    expect(migration).toContain('drop policy if exists "Users create own partner link"');
    expect(migration).toContain("revoke insert on public.partner_links from authenticated");
    expect(migration).toContain("and public.is_partner_of(p.id)");
  });

  it("keeps the exposed pairing RPC invoker-only while the checked implementation stays private", () => {
    const migration = read("supabase/migrations/20260817045627_use_invoker_pairing_wrapper.sql");

    expect(migration).toContain("security invoker");
    expect(migration).toContain("select private.link_partner_by_code_impl(_code)");
    expect(migration).toContain("revoke all on function public.link_partner_by_code(text) from public, anon");
    expect(migration).toContain("grant execute on function public.link_partner_by_code(text) to authenticated, service_role");
  });

  it("hides stored partner-link metadata until both sides have current consent", () => {
    const migration = read("supabase/migrations/20260817051038_hide_partner_links_without_current_consent.sql");

    expect(migration).toContain('drop policy if exists "Users see own partner link"');
    expect(migration).toContain("private.bixbo_health_consent_active(a)");
    expect(migration).toContain("private.bixbo_health_consent_active(b)");
    expect(migration).not.toContain('drop policy if exists "Users delete own partner link"');
  });

  it("uses pgcrypto entropy without modulo bias for future pairing codes", () => {
    const migration = read("supabase/migrations/20260817051436_use_crypto_pairing_code_generation.sql");

    expect(migration).toContain("extensions.gen_random_bytes(1)");
    expect(migration).toContain("if b < 248 then");
    expect(migration).toContain("b % 31");
    expect(migration).not.toContain("random()");
    expect(migration).toContain("revoke all on function public.gen_pairing_code() from public, anon");
  });
});
