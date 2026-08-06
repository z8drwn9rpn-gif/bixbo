import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";

import { useBixbo } from "@/lib/storage";
import {
  requestNotificationPermission,
  saveNotifPrefs,
  shouldAskForPermission,
  snoozePermissionPrompt,
} from "@/lib/notifications";

/**
 * Friendly permission card. It never appears on first launch — only after the
 * user has logged data on a few days, and it backs off for days when dismissed.
 */
export function NotificationPrompt() {
  const { data, hydrated } = useBixbo();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    setVisible(shouldAskForPermission(data));
  }, [hydrated, data]);

  if (!visible) return null;

  const enable = async () => {
    setBusy(true);
    try {
      const result = await requestNotificationPermission();
      if (result === "granted") saveNotifPrefs({ enabled: true, promptAnswered: true });
    } finally {
      setBusy(false);
      setVisible(false);
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
          <Link to="/notifications" className="ml-auto text-xs font-medium text-primary underline-offset-2 hover:underline">
            Settings
          </Link>
        </div>
      </div>
    </div>
  );
}
