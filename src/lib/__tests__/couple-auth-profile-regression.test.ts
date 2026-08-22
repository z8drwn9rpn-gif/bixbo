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

  it("uses one canonical auth storage chain and removes legacy refresh-token copies", () => {
    const client = readFileSync("src/integrations/supabase/client.ts", "utf8");

    expect(client).toContain("BIXBO_AUTH_STORAGE_KEY = 'bixbo:supabase-auth:v1'");
    expect(client).toContain("CANONICAL_LEGACY_AUTH_STORAGE_KEY");
    expect(client).toContain("createPersistentAuthStorage(SUPABASE_URL)");
    expect(client).toContain("storageKey: BIXBO_AUTH_STORAGE_KEY");
    expect(client).toContain("storedSessionExpiry");
    expect(client).toContain("clearLegacyKeys();");
    expect(client).toContain("if (freshest != null) storage.setItem(BIXBO_AUTH_STORAGE_KEY, freshest)");
    expect(client).not.toContain("for (const legacyKey of legacyKeys) storage.setItem(legacyKey, value)");
  });
});
