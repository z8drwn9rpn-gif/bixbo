import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useCloudSync } from "@/lib/cloudSync";
import {
  CLOUD_HEALTH_CONSENT_CHANGED_EVENT,
  cloudHealthConsentState,
  localCloudHealthConsentWithdrawn,
  type CloudHealthConsentState,
} from "@/lib/legalConsent";
import {
  ensurePushWorker,
  permissionState,
  pushSupported,
  runNotificationChecks,
  useNotificationRuntime,
} from "@/lib/notifications";
import { setPartner } from "@/lib/storage";

const LOCAL_NOTIFICATION_TICK_MS = 60_000;

function logLocalNotificationError(error: unknown): void {
  console.warn("BIXBO local notifications:", error);
}

/**
 * Local reminders do not require cloud-health consent because they are computed
 * from the diary already stored on this device. Keep those working while all
 * remote health processing remains fail-closed.
 */
function LocalOnlyNotificationRuntime() {
  useEffect(() => {
    if (typeof window === "undefined" || !pushSupported()) return;

    let stopped = false;
    const tick = () => {
      if (stopped) return;
      void runNotificationChecks().catch(logLocalNotificationError);
    };

    if (permissionState() === "granted") void ensurePushWorker();

    const first = window.setTimeout(tick, 4_000);
    const interval = window.setInterval(tick, LOCAL_NOTIFICATION_TICK_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearTimeout(first);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}

function ActiveCloudHealthRuntime() {
  useCloudSync();
  useNotificationRuntime();
  return null;
}

/**
 * Mount cloud diary sync and remote health-reminder sync only when the exact
 * current legal versions have active explicit health-data consent. Missing or
 * withdrawn consent therefore never reaches the RLS rejection path.
 */
export function ConsentAwareCloudRuntime() {
  const [consentState, setConsentState] = useState<CloudHealthConsentState>("signed-out");

  useEffect(() => {
    let cancelled = false;
    let generation = 0;

    const refresh = async () => {
      const currentGeneration = ++generation;

      if (localCloudHealthConsentWithdrawn()) {
        if (!cancelled && currentGeneration === generation) setConsentState("withdrawn");
        return;
      }

      try {
        const next = await cloudHealthConsentState();
        if (!cancelled && currentGeneration === generation) setConsentState(next);
      } catch (error) {
        // Fail closed on an uncertain legal state. A transient consent lookup
        // must never become permission to upload special-category health data.
        console.warn("BIXBO cloud consent check:", error);
        if (!cancelled && currentGeneration === generation) setConsentState("missing");
      }
    };

    void refresh();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      // Supabase recommends keeping auth callbacks lightweight. Defer the
      // follow-up consent query until the auth callback has returned.
      window.setTimeout(() => void refresh(), 0);
    });
    const onConsentChanged = () => void refresh();
    window.addEventListener(CLOUD_HEALTH_CONSENT_CHANGED_EVENT, onConsentChanged);

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
      window.removeEventListener(CLOUD_HEALTH_CONSENT_CHANGED_EVENT, onConsentChanged);
    };
  }, []);

  useEffect(() => {
    if (consentState !== "active") setPartner(undefined);
  }, [consentState]);

  return consentState === "active"
    ? <ActiveCloudHealthRuntime />
    : <LocalOnlyNotificationRuntime />;
}
