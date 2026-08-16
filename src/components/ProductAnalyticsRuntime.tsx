import { useEffect } from "react";
import { accountPrivacyPrefs } from "@/lib/preferences";
import { hasAnyLog, useBixbo } from "@/lib/storage";
import { trackProductEvent } from "@/lib/productAnalytics";

const FIRST_LOG_EVENT_KEY = "bixbo:analytics:first-log:v1";

/**
 * Emits the first health-log milestone only when analytics was already enabled.
 * Existing logs are marked as a baseline while analytics is off, so opting in
 * later never retroactively reports activity that happened before consent.
 */
export function ProductAnalyticsRuntime() {
  const { data, hydrated } = useBixbo();

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    const hasLoggedDay = Object.values(data.dayLogs ?? {}).some((day) => hasAnyLog(day));
    if (!hasLoggedDay || window.localStorage.getItem(FIRST_LOG_EVENT_KEY)) return;

    const analyticsEnabled = accountPrivacyPrefs(data).analytics;
    if (!analyticsEnabled) {
      window.localStorage.setItem(FIRST_LOG_EVENT_KEY, "baseline-before-opt-in");
      return;
    }

    window.localStorage.setItem(FIRST_LOG_EVENT_KEY, "sent");
    void trackProductEvent("first_log_created", true);
  }, [data, hydrated]);

  return null;
}
