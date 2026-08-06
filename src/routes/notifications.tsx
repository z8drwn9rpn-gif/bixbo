import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Bell, BellOff, ChevronLeft, LoaderCircle, Moon } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useBixbo } from "@/lib/storage";
import {
  NOTIF_CATEGORY_LABELS,
  notifPrefs,
  permissionState,
  requestNotificationPermission,
  saveNotifPrefs,
  runNotificationChecks,
  type NotifCategory,
} from "@/lib/notifications";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
const PUSH_SUBSCRIPTION_URL =
  (import.meta.env.VITE_PUSH_SUBSCRIPTION_URL as string | undefined) ?? "/api/push/subscription";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notification settings — BIXBO" },
      {
        name: "description",
        content:
          "Choose which BIXBO reminders you receive: medication, cycle, daily log, appointments and quiet hours.",
      },
      { property: "og:title", content: "Notification settings — BIXBO" },
      {
        property: "og:description",
        content: "Fine-tune BIXBO reminders for meds, cycle, daily logs and appointments.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotificationsPage,
});

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm text-foreground">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

function TimeRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm text-foreground">{label}</span>
      <Input type="time" value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-[8.5rem] text-sm" />
    </label>
  );
}

const CATEGORIES: { key: NotifCategory; hint: string }[] = [
  { key: "meds", hint: "At every scheduled medication time you haven't ticked off." },
  { key: "period", hint: "The day before your predicted period." },
  { key: "ovulation", hint: "The day before your fertile window opens." },
  { key: "dailyLog", hint: "Only when nothing is logged that day — once daily." },
  { key: "symptom", hint: 'A gentle "how are you feeling?" nudge.' },
  { key: "appointments", hint: "24 hours and 2 hours before an appointment." },
  { key: "mood", hint: "An evening mood check-in." },
  { key: "hydration", hint: "Friendly water reminders during the day." },
  { key: "marketing", hint: "Occasional BIXBO news and tips. Off by default." },
];

function urlBase64ToUint8Array(value: string): Uint8Array {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

function pushSupported(): boolean {
  return (
    typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator && "PushManager" in window
  );
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;

  // Keep this path aligned with your actual public service-worker file.
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

async function saveSubscriptionOnServer(subscription: PushSubscription): Promise<void> {
  const response = await fetch(PUSH_SUBSCRIPTION_URL, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });

  if (!response.ok) {
    throw new Error((await response.text()) || "The server could not save this push subscription.");
  }
}

async function deleteSubscriptionOnServer(endpoint: string): Promise<void> {
  const response = await fetch(PUSH_SUBSCRIPTION_URL, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });

  if (!response.ok && response.status !== 404) {
    throw new Error((await response.text()) || "The server could not remove this push subscription.");
  }
}

async function subscribeToPush(): Promise<PushSubscription> {
  if (!VAPID_PUBLIC_KEY) {
    throw new Error("Missing VITE_VAPID_PUBLIC_KEY.");
  }

  const registration = await getRegistration();
  await navigator.serviceWorker.ready;

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  await saveSubscriptionOnServer(subscription);
  return subscription;
}

async function unsubscribeFromPush(): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  await deleteSubscriptionOnServer(subscription.endpoint);
  await subscription.unsubscribe();
}

function NotificationsPage() {
  const { data, hydrated } = useBixbo();
  const prefs = notifPrefs(data);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadState = async () => {
      if (!pushSupported()) {
        if (!cancelled) setPerm("unsupported");
        return;
      }

      setPerm(permissionState());
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (!cancelled) setSubscribed(Boolean(subscription));
    };

    void loadState().catch((cause: unknown) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not read push notification status.");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const enable = async () => {
    setBusy(true);
    setError(null);

    try {
      const result = await requestNotificationPermission();
      setPerm(result);

      if (result !== "granted") {
        saveNotifPrefs({ enabled: false, promptAnswered: true });
        return;
      }

      await subscribeToPush();
      setSubscribed(true);
      saveNotifPrefs({ enabled: true, promptAnswered: true });
    } catch (cause: unknown) {
      setSubscribed(false);
      saveNotifPrefs({ enabled: false, promptAnswered: true });
      setError(cause instanceof Error ? cause.message : "Push notifications could not be enabled.");
    } finally {
      setBusy(false);
    }
  };

  const setAllReminders = async (enabled: boolean) => {
    setBusy(true);
    setError(null);

    try {
      if (enabled) {
        if (Notification.permission !== "granted") {
          await enable();
          return;
        }
        await subscribeToPush();
        setSubscribed(true);
      } else {
        await unsubscribeFromPush();
        setSubscribed(false);
      }

      saveNotifPrefs({ enabled });
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Could not update push notification settings.");
    } finally {
      setBusy(false);
    }
  };

  const denied = perm === "denied";
  const unsupported = perm === "unsupported";
  const pushEnabled = perm === "granted" && subscribed && Boolean(prefs.enabled);

  return (
    <AppShell title="Notifications">
      <div className="space-y-4 px-4 pt-4">
        <Link to="/settings" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="h-4 w-4" /> Settings
        </Link>

        <Card title="Push notifications" subtitle="Reminders can arrive even when BIXBO is completely closed.">
          {unsupported ? (
            <p className="flex items-center gap-2 text-xs text-destructive">
              <BellOff className="h-4 w-4" /> This browser doesn't support Web Push notifications.
            </p>
          ) : denied ? (
            <p className="text-xs text-destructive">
              Notifications are blocked in your browser settings. Re-allow them for this site before enabling reminders.
            </p>
          ) : perm === "granted" ? (
            <ToggleRow
              label="All reminders"
              hint={
                subscribed
                  ? "This device is registered for server push."
                  : "Permission is granted, but this device is not registered."
              }
              checked={pushEnabled}
              disabled={busy}
              onChange={(value) => void setAllReminders(value)}
            />
          ) : (
            <button
              type="button"
              onClick={() => void enable()}
              disabled={busy}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
              Enable notifications
            </button>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

          <p className="text-xs text-muted-foreground">
            Web Push requires HTTPS, an active service worker, the public VAPID key and a server-side subscription
            endpoint.
          </p>
        </Card>

        <Card title="Categories" subtitle="Pick exactly what you want to hear about.">
          {CATEGORIES.map(({ key, hint }) => (
            <ToggleRow
              key={key}
              label={NOTIF_CATEGORY_LABELS[key]}
              hint={hint}
              checked={Boolean(prefs[key])}
              onChange={(value) => saveNotifPrefs({ [key]: value })}
            />
          ))}
        </Card>

        <Card title="Times" subtitle="When the daily nudges are sent.">
          <TimeRow
            label="Symptom reminder"
            value={prefs.symptomTime}
            onChange={(value) => saveNotifPrefs({ symptomTime: value })}
          />
          <TimeRow
            label="Daily log reminder"
            value={prefs.dailyLogTime}
            onChange={(value) => saveNotifPrefs({ dailyLogTime: value })}
          />
          <TimeRow
            label="Mood check-in"
            value={prefs.moodTime}
            onChange={(value) => saveNotifPrefs({ moodTime: value })}
          />
          <TimeRow
            label="Hydration from"
            value={prefs.hydrationStart}
            onChange={(value) => saveNotifPrefs({ hydrationStart: value })}
          />
          <TimeRow
            label="Hydration until"
            value={prefs.hydrationEnd}
            onChange={(value) => saveNotifPrefs({ hydrationEnd: value })}
          />
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm text-foreground">Hydration every (hours)</span>
            <Input
              type="number"
              min={1}
              max={12}
              value={prefs.hydrationEveryHours}
              onChange={(event) =>
                saveNotifPrefs({ hydrationEveryHours: Math.min(12, Math.max(1, Number(event.target.value) || 3)) })
              }
              className="h-11 w-[8.5rem] text-sm"
            />
          </label>
        </Card>

        <Card title="Quiet hours" subtitle="Only medication reminders are allowed to break quiet hours.">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Moon className="h-4 w-4 text-primary" /> Nothing else is sent between these times.
          </p>
          <TimeRow label="Start" value={prefs.quietStart} onChange={(value) => saveNotifPrefs({ quietStart: value })} />
          <TimeRow label="End" value={prefs.quietEnd} onChange={(value) => saveNotifPrefs({ quietEnd: value })} />
        </Card>

        <Card title="Test" subtitle="Run the in-app reminder check right now.">
          <button
            type="button"
            onClick={() => void runNotificationChecks()}
            className="min-h-11 rounded-full border border-border px-4 text-sm font-medium text-foreground"
          >
            Check reminders now
          </button>
          {!hydrated && <p className="text-xs text-muted-foreground">Loading your preferences…</p>}
        </Card>
      </div>
    </AppShell>
  );
}
