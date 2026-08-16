import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("BIXBO app diagnostics", () => {
  it("keeps full scanner coverage and runtime error capture wired into the app", () => {
    const diagnostics = readFileSync("src/lib/appDiagnostics.ts", "utf8");
    const route = readFileSync("src/routes/diagnostics.tsx", "utf8");
    const root = readFileSync("src/routes/__root.tsx", "utf8");

    expect(diagnostics).toContain('window.addEventListener("error", onError)');
    expect(diagnostics).toContain('window.addEventListener("unhandledrejection", onUnhandledRejection)');
    expect(diagnostics).toContain('window.localStorage.setItem(RUNTIME_ERROR_KEY');
    expect(diagnostics).toContain('fetchCheck("/manifest.json"');
    expect(diagnostics).toContain('fetchCheck("/bixbo-push-sw.js"');
    expect(diagnostics).toContain('supabase.auth.getSession()');
    expect(diagnostics).toContain('dataIntegrityCheck()');
    expect(diagnostics).toContain('storageCheck()');

    for (const path of [
      "/",
      "/profile",
      "/notifications",
      "/meds",
      "/insights",
      "/patterns",
      "/notes",
      "/couple",
      "/report",
      "/settings",
      "/pregnancy",
      "/postpartum",
      "/auth",
      "/admin",
    ]) {
      expect(diagnostics).toContain(`"${path}"`);
    }

    expect(route).toContain('createFileRoute("/diagnostics")');
    expect(route).toContain("BIXBO App Scanner");
    expect(route).toContain("Run scan");
    expect(route).toContain("Recorded app errors");

    expect(root).toContain("installRuntimeDiagnostics");
    expect(root).toContain("BIXBO detected an app error");
    expect(root).toContain('window.location.assign("/diagnostics")');
    expect(root).toContain('href="/diagnostics"');
  });
});
