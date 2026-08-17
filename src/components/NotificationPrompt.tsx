import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "@/components/icons/BixboExtraIcons";

import { useBixbo } from "@/lib/storage";
import { useSession } from "@/lib/cloudSync";
import {
  CLOUD_HEALTH_CONSENT_CHANGED_EVENT,
  cloudHealthConsentState,
  localCloudHealthConsentWithdrawn,
} from "@/lib/legalConsent";
import { enableRemotePush, shouldAskForPermission, snoozePermissionPrompt } from "@/lib/notifications";

/**
 * Friendly permission card. It never appears on first launch — only after the
 * user has logged data on a few days, and it backs off for days when dismissed.
 */
export function NotificationPrompt() {
  const { data, hydrated } = useBixbo();
  const { session, ready } = useSession();
  const [visible, setVisible] = useState(false);
  const [consentActive, setConsentActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const refreshConsent = async () => {
      if (!ready || !session || localCloudHealthConsentWithdrawn()) {
        if (!cancelled) setConsentActive(false);
        return;
      }
      try {
        const state = await cloudHealthConsentState();
        if (!cancelled) setConsentActive(state === "active");
      } catch {
        if (!cancelled) setConsentActive(false);
      }
    };

    void refreshConsent();
    const onConsentChanged = () => void refreshConsent();
    window.addEventListener(CLOUD_HEALTH_CONSENT_CHANGED_EVENT, onConsentChanged);
    return () => {
      cancelled = true;
      window.removeEventListener(CLOUD_HEALTH_CONSENT_CHANGED_EVENT, onConsentChanged);
    };
  }, [ready, session]);

  useEffect(() => {
    if (!hydrated || !ready || !session || !consentActive) {
      setVisible(false);
      return;
    }
    setVisible(shouldAskForPermission(data));
  }, [hydrated, ready, session, consentActive, data]);

  if (!visible) return null;

  const enable = async () => {
    setBusy(true);
    setError(null);
    try {
      if ((await cloudHealthConsentState()) !== "active") {
        setConsentActive(false);
        setVisible(false);
        return;
      }
      await enableRemotePush();
      setVisible(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not enable notifications.");
    } finally {
      setBusy(false);
    }
  };

  const later = () => {
    snoozePermissionPrompt();
    setVisible(false);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 px-4">
      <div className="pointer-events-auto mx-auto max-w-[402px] rounded-3xl border border-border/70 bg-surface p-4 shadow-lg shadow-black/10 ring-1 ring-primary/15">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Bell className="h-4 w-4 text-primary" /> Stay on track with BIXBO
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          Enable notifications to receive medication reminders, cycle reminders and health alerts.
        </p>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={enable}
            disabled={busy}
            className="min-h-11 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            Enable notifications
          </button>
          <button
            type="button"
            onClick={later}
            className="min-h-11 rounded-full border border-border px-4 text-sm font-medium text-foreground"
          >
            Maybe later
          </button>
          <Link
            to="/notifications"
            className="ml-auto text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            Settings
          </Link>
        </div>
      </div>
    </div>
  );
}
