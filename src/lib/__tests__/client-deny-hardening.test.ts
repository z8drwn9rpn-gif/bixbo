import { readFileSync } from "node:fs";
import { describe, expect, it } from "bun:test";

const read = (path: string) => readFileSync(path, "utf8");

describe("server-only table hardening", () => {
  it("keeps service config and push delivery logs explicitly denied to browser roles", () => {
    const migration = read("supabase/migrations/20260817051146_explicit_deny_client_only_tables.sql");

    expect(migration).toContain('create policy "Deny client access to service config"');
    expect(migration).toContain('create policy "Deny client access to push delivery log"');
    expect(migration.match(/as restrictive/g)).toHaveLength(2);
    expect(migration.match(/to anon, authenticated/g)).toHaveLength(2);
    expect(migration.match(/using \(false\)/g)).toHaveLength(2);
    expect(migration.match(/with check \(false\)/g)).toHaveLength(2);
  });
});
