import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Bell, BellOff, ChevronLeft, Moon } from "@/components/icons/BixboIcons";

import { AppShell } from "@/components/AppShell";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useBixbo } from "@/lib/storage";
import { useSession } from "@/lib/cloudSync";
import { useI18n } from "@/hooks/useI18n";
import {
  NOTIF_CATEGORY_LABELS,
  disableRemotePush,
  enableRemotePush,
  notifPrefs,
  permissionState,
  runNotificationChecks,
  saveNotifPrefs,
  sendTestPush,
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
  const { t } = useI18n();
  return (
    <section className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80">
      <p className="text-sm font-semibold text-foreground">{t(title)}</p>
      {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{t(subtitle)}</p>}
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
  const { t } = useI18n();
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
  const { t } = useI18n();
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm text-foreground">{t(label)}</span>
      <Input type="time" value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-[8.5rem] text-sm" />
    </label>
  );
}

const CATEGORIES: { key: NotifCategory; hint: string }[] = [
  { key: "meds", hint: "At every scheduled medication time you haven't ticked off." },
  { key: "period", hint: "The day before your predicted period." },
  { key: "ovulation", hint: "The day before your predicted ovulation window." },
  { key: "dailyLog", hint: "Only when nothing is logged that day — once daily." },
  { key: "symptom", hint: 'A gentle "how are you feeling?" nudge.' },
  { key: "appointments", hint: "24 hours and 2 hours before an appointment." },
  { key: "mood", hint: "An evening mood check-in." },
  { key: "hydration", hint: "Friendly water reminders during the day." },
  { key: "marketing", hint: "Occasional BIXBO news and tips. Off by default." },
];

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function NotificationsPage() {
  const { t } = useI18n();
  const { data, hydrated } = useBixbo();
  const { session, ready } = useSession();
  const prefs = notifPrefs(data);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  const [busy, setBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPerm(permissionState());
  }, []);

  const enable = async () => {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await enableRemotePush();
      setMessage("Remote reminders are enabled on this device.");
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setPerm(permissionState());
      setBusy(false);
    }
  };

  const toggleAll = async (enabled: boolean) => {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      if (enabled) {
        await enableRemotePush();
        setMessage("Remote reminders are enabled on this device.");
      } else {
        await disableRemotePush();
        setMessage("Remote reminders are disabled on this device.");
      }
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setPerm(permissionState());
      setBusy(false);
    }
  };

  const remoteTest = async () => {
    setTestBusy(true);
    setMessage(null);
    setError(null);
    try {
      const result = await sendTestPush();
      setMessage(`Test push delivered to ${result.delivered} active device${result.delivered === 1 ? "" : "s"}.`);
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setTestBusy(false);
    }
  };

  const denied = perm === "denied";
  const unsupported = perm === "unsupported";
  const signedIn = Boolean(session);

  return (
    <AppShell title={t("Notifications")}>
      <div className="space-y-4 px-4 pb-24 pt-4">
        <Link to="/settings" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="h-4 w-4" /> {t("Settings")}
        </Link>

        <Card title={t("Push notifications")} subtitle={t("Reminders arrive even when BIXBO is fully closed.")}>
          {!ready ? (
            <p className="text-xs text-muted-foreground">{t("Checking your account…")}</p>
          ) : !signedIn ? (
            <p className="text-xs text-destructive">{t("Sign in to enable reminders when BIXBO is fully closed.")}</p>
          ) : unsupported ? (
            <p className="flex items-center gap-2 text-xs text-destructive">
              <BellOff className="h-4 w-4" /> This browser doesn't support Web Push.
            </p>
          ) : denied ? (
            <p className="text-xs text-destructive">
              Notifications are blocked in your browser settings. Re-allow them for this site before enabling reminders.
            </p>
          ) : perm === "granted" ? (
            <ToggleRow
              label={t("All reminders")}
              hint={t("Master switch for every category below.")}
              checked={Boolean(prefs.enabled)}
              disabled={busy}
              onChange={(enabled) => void toggleAll(enabled)}
            />
          ) : (
            <button
              type="button"
              onClick={() => void enable()}
              disabled={busy}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              <Bell className="h-4 w-4" /> {busy ? t("Enabling…") : t("Enable notifications")}
            </button>
          )}

          <p className="text-xs text-muted-foreground">
            When BIXBO is open, local reminder checks can also appear as a soft in-app message.
          </p>
          {message && <p className="rounded-xl bg-primary/10 px-3 py-2 text-xs text-foreground">{message}</p>}
          {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
        </Card>

        <Card title={t("Categories")} subtitle={t("Pick exactly what you want to hear about.")}>
          {CATEGORIES.map(({ key, hint }) => (
            <ToggleRow
              key={key}
              label={t(NOTIF_CATEGORY_LABELS[key])}
              hint={t(hint)}
              checked={Boolean(prefs[key])}
              onChange={(v) => saveNotifPrefs({ [key]: v })}
            />
          ))}
        </Card>

        <Card title={t("Times")} subtitle={t("When the daily nudges are sent.")}>
          <TimeRow
            label={t("Symptom reminder")}
            value={prefs.symptomTime}
            onChange={(v) => saveNotifPrefs({ symptomTime: v })}
          />
          <TimeRow
            label={t("Daily log reminder")}
            value={prefs.dailyLogTime}
            onChange={(v) => saveNotifPrefs({ dailyLogTime: v })}
          />
          <TimeRow label={t("Mood check-in")} value={prefs.moodTime} onChange={(v) => saveNotifPrefs({ moodTime: v })} />
          <TimeRow
            label={t("Hydration from")}
            value={prefs.hydrationStart}
            onChange={(v) => saveNotifPrefs({ hydrationStart: v })}
          />
          <TimeRow
            label={t("Hydration until")}
            value={prefs.hydrationEnd}
            onChange={(v) => saveNotifPrefs({ hydrationEnd: v })}
          />
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm text-foreground">{t("Hydration every (hours)")}</span>
            <Input
              type="number"
              min={1}
              max={12}
              value={prefs.hydrationEveryHours}
              onChange={(e) =>
                saveNotifPrefs({ hydrationEveryHours: Math.min(12, Math.max(1, Number(e.target.value) || 3)) })
              }
              className="h-11 w-[8.5rem] text-sm"
            />
          </label>
        </Card>

        <Card title={t("Quiet hours")} subtitle={t("Only medication reminders are allowed to break quiet hours.")}>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Moon className="h-4 w-4 text-primary" /> {t("Nothing else is sent between these times.")}
          </p>
          <TimeRow label={t("Start")} value={prefs.quietStart} onChange={(v) => saveNotifPrefs({ quietStart: v })} />
          <TimeRow label={t("End")} value={prefs.quietEnd} onChange={(v) => saveNotifPrefs({ quietEnd: v })} />
        </Card>

        <Card title={t("Tests")} subtitle={t("Local and server-originated tests are separate.")}>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void runNotificationChecks()}
              className="min-h-11 rounded-full border border-border px-4 text-sm font-medium text-foreground"
            >
              Check local reminders
            </button>
            <button
              type="button"
              onClick={() => void remoteTest()}
              disabled={testBusy || !signedIn || !prefs.enabled || perm !== "granted"}
              className="min-h-11 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {testBusy ? "Sending…" : "Send real test push"}
            </button>
          </div>
          {!hydrated && <p className="text-xs text-muted-foreground">{t("Loading your preferences…")}</p>}
          <p className="text-xs text-muted-foreground">
            For the real test, install BIXBO to the Home Screen on iPhone, close it completely, then tap the button
            before closing.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
