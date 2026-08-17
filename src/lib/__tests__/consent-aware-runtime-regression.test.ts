import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("consent-aware cloud runtime", () => {
  it("keeps health cloud writes unmounted until explicit consent is active", () => {
    const root = readFileSync("src/routes/__root.tsx", "utf8");
    const runtime = readFileSync("src/components/ConsentAwareCloudRuntime.tsx", "utf8");
    const consent = readFileSync("src/lib/legalConsent.ts", "utf8");
    const prompt = readFileSync("src/components/NotificationPrompt.tsx", "utf8");

    expect(root).toContain("<ConsentAwareCloudRuntime />");
    expect(root).not.toContain("useCloudSync();");
    expect(root).not.toContain("useNotificationRuntime();");

    expect(runtime).toContain('consentState === "active"');
    expect(runtime).toContain("useCloudSync();");
    expect(runtime).toContain("useNotificationRuntime();");
    expect(runtime).toContain("LocalOnlyNotificationRuntime");
    expect(runtime).toContain("runNotificationChecks()");
    expect(runtime).not.toContain("syncPushState");
    expect(runtime).toContain('setPartner(undefined)');

    expect(consent).toContain('CLOUD_HEALTH_CONSENT_CHANGED_EVENT');
    expect(consent).toContain('notifyCloudHealthConsentChanged()');

    expect(prompt).toContain('cloudHealthConsentState()');
    expect(prompt).toContain('state === "active"');
    expect(prompt).toContain('!consentActive');
  });
});

describe("forensic false-positive filtering", () => {
  it("does not treat navigation links as slow local controls", () => {
    const visual = readFileSync("src/lib/appVisualForensics.ts", "utf8");
    expect(visual).toContain('node.closest<HTMLAnchorElement>("a[href]")');
    expect(visual).toContain('if (navigationDestination) {');
    expect(visual).toContain('measureNavigationTap(pointerAt, label, navigationDestination)');
    expect(visual).toContain('Navigation tap-to-paint latency was about');
  });

  it("removes short reload-aborted fetches while preserving ordinary network failures", () => {
    const guard = readFileSync("src/lib/forensicLifecycleGuard.ts", "utf8");
    expect(guard).toContain('FAST_LIFECYCLE_ABORT_MS = 1_500');
    expect(guard).toContain('navigation=reload');
    expect(guard).toContain('request · GET \\/');
    expect(guard).toContain('hiddenOrLeaving || reloadOrLegacyPoll');
    expect(guard).toContain('isLegacyNavigationTapIssue');
  });
});
