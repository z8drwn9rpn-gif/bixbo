import { readFileSync } from "node:fs";
import { describe, expect, it } from "bun:test";

const read = (path: string) => readFileSync(path, "utf8");

describe("10/10 release gates", () => {
  it("registers the app service worker independently of push permission", () => {
    const runtime = read("src/lib/appServiceWorker.ts");
    const consentRuntime = read("src/components/ConsentAwareCloudRuntime.tsx");

    expect(runtime).toContain('"serviceWorker" in navigator');
    expect(runtime).toContain('navigator.serviceWorker.register(APP_SERVICE_WORKER_URL');
    expect(runtime).not.toContain("Notification.requestPermission");
    expect(consentRuntime).toContain("ensureAppServiceWorker");
    expect(consentRuntime).toContain("void ensureAppServiceWorker();");
  });

  it("keeps push actions intact while importing a network-first offline runtime", () => {
    const worker = read("public/bixbo-push-sw.js");
    const offline = read("public/bixbo-offline-runtime.js");

    expect(worker).toContain('importScripts("/bixbo-offline-runtime.js")');
    expect(worker).toContain('const BIXBO_PUSH_SW_VERSION = "2026.08.19.3"');
    expect(worker).toContain('self.addEventListener("notificationclick"');
    expect(offline).toContain('self.addEventListener("fetch"');
    expect(offline).toContain("networkFirstNavigation");
    expect(offline).toContain("networkFirstAsset");
    expect(offline).toContain("url.origin === self.location.origin");
    expect(offline).not.toContain("supabase");
  });

  it("sets the stored UI language before React hydration", () => {
    const root = read("src/routes/__root.tsx");

    expect(root).toContain("LANGUAGE_BOOTSTRAP_SCRIPT");
    expect(root).toContain('document.documentElement.lang = storedLanguage === "sk" ? "sk" : "en"');
    expect(root.indexOf("LANGUAGE_BOOTSTRAP_SCRIPT")).toBeLessThan(root.indexOf("THEME_BOOTSTRAP_SCRIPT"));
  });

  it("uses a stable install identity and standalone manifest", () => {
    const manifest = JSON.parse(read("public/manifest.json")) as { id?: string; start_url?: string; scope?: string; display?: string };

    expect(manifest.id).toBe("/");
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.display).toBe("standalone");
  });

  it("captures browser failure evidence and runs every browser before failing CI", () => {
    const config = read("playwright.config.ts");
    const ci = read(".github/workflows/ci.yml");

    expect(config).toContain('serviceWorkers: "allow"');
    expect(config).toContain('screenshot: "only-on-failure"');
    expect(config).toContain('trace: "retain-on-failure"');
    expect(ci.match(/continue-on-error: true/g)?.length ?? 0).toBeGreaterThanOrEqual(6);
    expect(ci).toContain("actions/upload-artifact@v4");
    expect(ci).toContain("Enforce browser release gate");
    expect(ci).toContain("DESKTOP_OUTCOME");
    expect(ci).toContain("MOBILE_OUTCOME");
    expect(ci).toContain("WEBKIT_OUTCOME");
  });

  it("makes the quality result externally inspectable for every main/manual run", () => {
    const ci = read(".github/workflows/ci.yml");

    expect(ci).toContain("workflow_dispatch:");
    expect(ci).toContain("issues: write");
    expect(ci).toContain("Record quality gate status");
    expect(ci).toContain("issues/241");
    expect(ci).toContain("**Commit:** \\`${GITHUB_SHA}\\`");
    expect(ci).toContain("Browser release gate");
  });

  it("makes deployment success prove the live PWA contract and publish its exact SHA", () => {
    const deploy = read(".github/workflows/deploy-cloudflare.yml");

    expect(deploy).toContain("/manifest.json");
    expect(deploy).toContain("/bixbo-push-sw.js");
    expect(deploy).toContain("/bixbo-offline-runtime.js");
    expect(deploy).toContain("networkFirstNavigation");
    expect(deploy).toContain("x-content-type-options: nosniff");
    expect(deploy).toContain("content-security-policy");
    expect(deploy).toContain("Live PWA verify");
    expect(deploy).toContain("**Commit:** \\`${DEPLOY_SHA}\\`");
  });

  it("checks live PWA infrastructure again after production deploy", () => {
    const smoke = read(".github/workflows/production-smoke.yml");

    expect(smoke).toContain("/manifest.json");
    expect(smoke).toContain("/bixbo-push-sw.js");
    expect(smoke).toContain("/bixbo-offline-runtime.js");
    expect(smoke).toContain("x-content-type-options: nosniff");
    expect(smoke).toContain("content-security-policy");
    expect(smoke).toContain("icon-512.png");
  });
});
