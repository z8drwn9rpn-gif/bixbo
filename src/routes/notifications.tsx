import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Bell, BellOff, ChevronLeft, Moon } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useBixbo } from "@/lib/storage";
import {
  NOTIF_CATEGORY_LABELS,
  disableRemotePush,
  enableRemotePush,
  notifPrefs,
  permissionState,
  requestNotificationPermission,
  saveNotifPrefs,
  runNotificationChecks,
  type NotifCategory,
} from "@/lib/notifications";

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
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm text-foreground">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
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

function NotificationsPage() {
  const { data, hydrated } = useBixbo();
  const prefs = notifPrefs(data);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    setPerm(permissionState());
  }, []);

  const enable = async () => {
    const result = await requestNotificationPermission();
    setPerm(result);
  };

  const toggleAll = async (enabled: boolean) => {
    try {
      if (enabled) {
        await enableRemotePush();
      } else {
        await disableRemotePush();
      }
    } catch (error) {
      console.error("BIXBO notification toggle failed", error);
    } finally {
      setPerm(permissionState());
    }
  };

  const denied = perm === "denied";
  const unsupported = perm === "unsupported";

  return (
    <AppShell title="Notifications">
      <div className="space-y-4 px-4 pt-4">
        <Link to="/settings" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="h-4 w-4" /> Settings
        </Link>

        <Card title="Push notifications" subtitle="Reminders arrive even when BIXBO is in the background.">
          {unsupported ? (
            <p className="flex items-center gap-2 text-xs text-destructive">
              <BellOff className="h-4 w-4" /> This browser doesn't support notifications.
            </p>
          ) : denied ? (
            <p className="text-xs text-destructive">
              Notifications are blocked in your browser settings. BIXBO won't ask again — re-allow them for this site to
              turn reminders back on.
            </p>
          ) : perm === "granted" ? (
            <ToggleRow
              label="All reminders"
              hint="Master switch for every category below."
              checked={Boolean(prefs.enabled)}
              onChange={(enabled) => void toggleAll(enabled)}
            />
          ) : (
            <button
              type="button"
              onClick={enable}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              <Bell className="h-4 w-4" /> Enable notifications
            </button>
          )}
          <p className="text-xs text-muted-foreground">
            When BIXBO is open, reminders appear as a soft in-app message instead of a system notification.
          </p>
        </Card>

        <Card title="Categories" subtitle="Pick exactly what you want to hear about.">
          {CATEGORIES.map(({ key, hint }) => (
            <ToggleRow
              key={key}
              label={NOTIF_CATEGORY_LABELS[key]}
              hint={hint}
              checked={Boolean(prefs[key])}
              onChange={(v) => saveNotifPrefs({ [key]: v })}
            />
          ))}
        </Card>

        <Card title="Times" subtitle="When the daily nudges are sent.">
          <TimeRow
            label="Symptom reminder"
            value={prefs.symptomTime}
            onChange={(v) => saveNotifPrefs({ symptomTime: v })}
          />
          <TimeRow
            label="Daily log reminder"
            value={prefs.dailyLogTime}
            onChange={(v) => saveNotifPrefs({ dailyLogTime: v })}
          />
          <TimeRow label="Mood check-in" value={prefs.moodTime} onChange={(v) => saveNotifPrefs({ moodTime: v })} />
          <TimeRow
            label="Hydration from"
            value={prefs.hydrationStart}
            onChange={(v) => saveNotifPrefs({ hydrationStart: v })}
          />
          <TimeRow
            label="Hydration until"
            value={prefs.hydrationEnd}
            onChange={(v) => saveNotifPrefs({ hydrationEnd: v })}
          />
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm text-foreground">Hydration every (hours)</span>
            <Input
              type="number"
              min={1}
              max={12}
              value={prefs.hydrationEveryHours}
              onChange={(e) => saveNotifPrefs({ hydrationEveryHours: Math.max(1, Number(e.target.value) || 3) })}
              className="h-11 w-[8.5rem] text-sm"
            />
          </label>
        </Card>

        <Card title="Quiet hours" subtitle="Only medication reminders are allowed to break quiet hours.">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Moon className="h-4 w-4 text-primary" /> Nothing else is sent between these times.
          </p>
          <TimeRow label="Start" value={prefs.quietStart} onChange={(v) => saveNotifPrefs({ quietStart: v })} />
          <TimeRow label="End" value={prefs.quietEnd} onChange={(v) => saveNotifPrefs({ quietEnd: v })} />
        </Card>

        <Card title="Test" subtitle="Run the reminder check right now.">
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
