import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("couple sync, auth persistence and Profile recovery controls", () => {
  it("keeps Couple partner data on a narrow realtime path", () => {
    const consentRuntime = readFileSync("src/components/ConsentAwareCloudRuntime.tsx", "utf8");
    const partnerRuntime = readFileSync("src/lib/partnerRealtimeRuntime.ts", "utf8");

    expect(consentRuntime).toContain("usePartnerRealtimeRefresh();");
    expect(partnerRuntime).toContain('table: "partner_shared_data"');
    expect(partnerRuntime).toContain('table: "partner_links"');
    expect(partnerRuntime).toContain("fetchPartner()");
    expect(partnerRuntime).toContain("setPartner(partner ?? undefined)");
    expect(partnerRuntime).toContain("supabase.removeChannel(channel)");
  });

  it("restores a real manual Resync app control instead of a page reload", () => {
    const profile = readFileSync("src/features/profile/ProfilePage.tsx", "utf8");
    const resync = readFileSync("src/lib/manualCloudResync.ts", "utf8");

    expect(profile).toContain('aria-label="Resync app"');
    expect(profile).toContain("resyncAppFromCloud()");
    expect(profile).toContain('top: "calc(max(0.65rem, env(safe-area-inset-top)) + 2.75rem)"');
    expect(profile).toContain("HUB_PRIMARY_ACTION_CLASS");
    expect(profile).not.toContain("backdrop-blur");

    expect(resync).toContain("supabase.auth.refreshSession()");
    expect(resync).toContain("pullMyData()");
    expect(resync).toContain("mergeBixbo(localBefore, remote");
    expect(resync).toContain("pushMyData(reconciled)");
    expect(resync).toContain("fetchPartner()");
    expect(resync).toContain("setPartner(partner ?? undefined)");
  });

  it("keeps old and new BIXBO versions in one Supabase refresh-token coordination domain", () => {
    const client = readFileSync("src/integrations/supabase/client.ts", "utf8");

    expect(client).toContain("BIXBO_AUTH_STORAGE_KEY = 'sb-wgdydwttzsveevkljkmr-auth-token'");
    expect(client).toContain("INTERIM_BIXBO_AUTH_STORAGE_KEY = 'bixbo:supabase-auth:v1'");
    expect(client).toContain("defaultAuthStorageKey");
    expect(client).toContain("migrationAuthStorageKeys");
    expect(client).toContain("createPersistentAuthStorage(SUPABASE_URL)");
    expect(client).toContain("storageKey: authStorageKey");
    expect(client).toContain("storedSessionExpiry");
    expect(client).toContain("clearMigrationKeys();");
    expect(client).toContain("if (freshest != null) storage.setItem(canonicalKey, freshest)");
    expect(client).not.toContain("storageKey: BIXBO_AUTH_STORAGE_KEY");
    expect(client).not.toContain("storage.setItem(INTERIM_BIXBO_AUTH_STORAGE_KEY, value)");
  });

  it("asks supported browsers to keep BIXBO origin storage durable", () => {
    const consentRuntime = readFileSync("src/components/ConsentAwareCloudRuntime.tsx", "utf8");

    expect(consentRuntime).toContain("requestDurableBrowserStorage");
    expect(consentRuntime).toContain("navigator.storage.persisted()");
    expect(consentRuntime).toContain("navigator.storage.persist()");
  });
});
