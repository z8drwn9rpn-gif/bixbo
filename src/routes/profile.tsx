import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { postpartumProgress } from "@/lib/health";
import { ArrowLeft, Plus, X, Pencil, ChevronRight, Check } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  BabyIcon,
  CalendarIcon,
  ClockIcon,
  DropIcon,
  HeartIcon,
  LeafIcon,
  NoteIcon,
  PillIcon,
  PregnancyIcon,
  ProfileIcon,
  StarIcon,
  StethoscopeIcon,
  TaskIcon,
  WarningIcon,
  WeightIcon,
  WorkoutIcon,
} from "@/components/icons/BixboIcons";
import {
  useBixbo,
  EMPTY,
  todayKey,
  latestRecordedWeight,
  userAllergens,
  userGender,
  isPregnancyActive,
  isPostpartumActive,
  type HealthProfile,
  type Doctor,
  type EmergencyContact,
} from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Health profile — BIXBO" },
      {
        name: "description",
        content: "Your personal, medical, cycle, lifestyle, emergency and medication profile in BIXBO.",
      },
      { property: "og:title", content: "Health profile — BIXBO" },
      { property: "og:description", content: "Everything about you, in one editable place." },
    ],
  }),
  component: ProfilePage,
});

/* ------------------------------ small primitives ------------------------------ */

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-border/80">
      <p className="text-sm font-semibold">{title}</p>
      {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function SelectField({
  id,
  value,
  onChange,
  options,
  placeholder,
}: {
  id: string;
  value: string | undefined;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select
      id={id}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <option value="">{placeholder ?? "— Select —"}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex min-h-11 w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        checked
          ? "border-primary bg-primary/10 text-primary dark:bg-primary dark:text-primary-foreground"
          : "border-border bg-tint"
      }`}
    >
      {label}
      <span
        className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${checked ? "bg-primary justify-end" : "bg-muted justify-start"} p-0.5`}
      >
        <span className="h-4 w-4 rounded-full bg-background shadow" />
      </span>
    </button>
  );
}

function TagListField({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const add = () => {
    const v = text.trim();
    if (!v) return;
    if (values.includes(v)) {
      setText("");
      return;
    }
    onChange([...values, v]);
    setText("");
  };
  const remove = (v: string) => onChange(values.filter((x) => x !== v));

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex gap-2">
        <Input
          aria-label={`Add ${label}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder ?? "Type and press Add…"}
          className="h-11"
        />
        <Button type="button" size="sm" onClick={add} className="h-11 min-w-11 px-3">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full bg-tint px-2.5 py-1 text-xs font-medium text-foreground ring-1 ring-border"
            >
              {v}
              <button
                type="button"
                aria-label={`Remove ${v}`}
                onClick={() => remove(v)}
                className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function DoctorForm({
  title,
  value,
  onChange,
}: {
  title: string;
  value: Doctor | undefined;
  onChange: (next: Doctor) => void;
}) {
  const v = value ?? {};
  const set = (patch: Partial<Doctor>) => onChange({ ...v, ...patch });
  const idBase = title.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="mb-2 text-xs font-semibold text-foreground">{title}</p>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Name" htmlFor={`${idBase}-name`}>
          <Input
            id={`${idBase}-name`}
            className="h-11"
            value={v.name ?? ""}
            onChange={(e) => set({ name: e.target.value })}
          />
        </Field>
        <Field label="Clinic" htmlFor={`${idBase}-clinic`}>
          <Input
            id={`${idBase}-clinic`}
            className="h-11"
            value={v.clinic ?? ""}
            onChange={(e) => set({ clinic: e.target.value })}
          />
        </Field>
        <Field label="Phone" htmlFor={`${idBase}-phone`}>
          <Input
            id={`${idBase}-phone`}
            className="h-11"
            type="tel"
            value={v.phone ?? ""}
            onChange={(e) => set({ phone: e.target.value })}
          />
        </Field>
        <Field label="Email" htmlFor={`${idBase}-email`}>
          <Input
            id={`${idBase}-email`}
            className="h-11"
            type="email"
            value={v.email ?? ""}
            onChange={(e) => set({ email: e.target.value })}
          />
        </Field>
      </div>
      <div className="mt-2">
        <Field label="Note" htmlFor={`${idBase}-note`}>
          <Textarea id={`${idBase}-note`} value={v.note ?? ""} onChange={(e) => set({ note: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}

/* ------------------------------ summary primitives ------------------------------ */

function SummaryCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-tint ring-1 ring-border/50">
          {icon}
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>

      <div className="mt-4">{children}</div>
    </section>
  );
}

function SummaryStat({ icon, label, value }: { icon?: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-tint px-3 py-3 ring-1 ring-border/40">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 truncate text-sm font-semibold tabular-nums text-foreground">{value || "—"}</p>
    </div>
  );
}

function SummaryChips({ values, emptyText = "Not added" }: { values: string[]; emptyText?: string }) {
  if (values.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <span
          key={value}
          className="rounded-full bg-tint px-3 py-1.5 text-xs font-medium text-foreground ring-1 ring-border/50"
        >
          {value}
        </span>
      ))}
    </div>
  );
}

function formatProfileDate(value?: string) {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ------------------------------ page ------------------------------ */

function ageFromBirthDate(birthDate?: string): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

type HealthView =
  | "hub"
  | "summary"
  | "journey"
  | "achievements"
  | "statistics"
  | "export"
  | "language"
  | "appearance"
  | "notifications"
  | "privacy"
  | "backup"
  | "tracking"
  | "reminders"
  | "units"
  | "data"
  | "about";

function HubRow({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-tint"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-tint ring-1 ring-border/50">
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{subtitle}</span>
      </span>

      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function HealthHub({ onHome, onOpen }: { onHome: () => void; onOpen: (view: HealthView) => void }) {
  return (
    <AppShell
      title={
        <button type="button" onClick={onHome} className="flex items-center gap-2">
          <ArrowLeft className="h-5 w-5" />
          Health
        </button>
      }
    >
      <div className="space-y-5 px-5 pb-28 pt-4">
        <section className="overflow-hidden rounded-3xl bg-primary/10 p-5 ring-1 ring-primary/20">
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl bg-surface ring-1 ring-border/60">
              <ProfileIcon size={38} />
            </span>

            <div className="min-w-0">
              <p className="font-serif text-2xl font-bold text-foreground">Your health hub</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Your health profile, journey, milestones and app preferences.
              </p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl bg-surface shadow-sm ring-1 ring-border/80">
          <HubRow
            icon={<StethoscopeIcon size={23} />}
            title="Health Summary"
            subtitle="Conditions, medications and your complete health profile"
            onClick={() => onOpen("summary")}
          />
          <div className="ml-[4.5rem] border-t border-border/60" />
          <HubRow
            icon={<ClockIcon size={22} />}
            title="Health Journey"
            subtitle="A timeline of important health events"
            onClick={() => onOpen("journey")}
          />
          <div className="ml-[4.5rem] border-t border-border/60" />
          <HubRow
            icon={<StarIcon size={22} />}
            title="Achievements"
            subtitle="Tracking milestones and streaks"
            onClick={() => onOpen("achievements")}
          />
          <div className="ml-[4.5rem] border-t border-border/60" />
          <HubRow
            icon={<TaskIcon size={22} />}
            title="My Statistics"
            subtitle="Your personal tracking numbers"
            onClick={() => onOpen("statistics")}
          />
          <div className="ml-[4.5rem] border-t border-border/60" />
          <HubRow
            icon={<NoteIcon size={22} />}
            title="Export"
            subtitle="Reports for your doctor — coming later"
            onClick={() => onOpen("export")}
          />
        </section>

        <div>
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Preferences
          </p>

          <section className="overflow-hidden rounded-3xl bg-surface shadow-sm ring-1 ring-border/80">
            <HubRow
              icon={<NoteIcon size={22} />}
              title="Language"
              subtitle="App language"
              onClick={() => onOpen("language")}
            />
            <div className="ml-[4.5rem] border-t border-border/60" />
            <HubRow
              icon={<LeafIcon size={22} />}
              title="Appearance"
              subtitle="Theme and display"
              onClick={() => onOpen("appearance")}
            />
            <div className="ml-[4.5rem] border-t border-border/60" />
            <HubRow
              icon={<HeartIcon size={22} />}
              title="Privacy"
              subtitle="Privacy and data control"
              onClick={() => onOpen("privacy")}
            />
            <div className="ml-[4.5rem] border-t border-border/60" />
            <HubRow
              icon={<DropIcon size={22} />}
              title="Backup, Sync & Storage"
              subtitle="Backup, restore, export and local data"
              onClick={() => onOpen("backup")}
            />
            <div className="ml-[4.5rem] border-t border-border/60" />

            <HubRow
              icon={<TaskIcon size={22} />}
              title="Tracking & Units"
              subtitle="Tracking categories, pain scale and measurement units"
              onClick={() => onOpen("tracking")}
            />
            <div className="ml-[4.5rem] border-t border-border/60" />

            <HubRow
              icon={<ClockIcon size={22} />}
              title="Medications & Reminders"
              subtitle="Medication schedule, reminders and notification settings"
              onClick={() => onOpen("reminders")}
            />
            <div className="ml-[4.5rem] border-t border-border/60" />

            <HubRow
              icon={<ProfileIcon size={22} />}
              title="About BIXBO"
              subtitle="Version, information and legal"
              onClick={() => onOpen("about")}
            />
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function HealthSubpage({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  return (
    <AppShell
      title={
        <button type="button" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="h-5 w-5" />
          {title}
        </button>
      }
    >
      <div className="space-y-4 px-5 pb-28 pt-4">{children}</div>
    </AppShell>
  );
}

function PreferenceOption({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-tint ring-1 ring-border/50">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{subtitle}</span>
      </span>
      {onClick ? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
    </>
  );

  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-tint"
    >
      {content}
    </button>
  ) : (
    <div className="flex w-full items-center gap-3 px-4 py-3">{content}</div>
  );
}

function ProfilePage() {
  const navigate = useNavigate();
  const { data, update, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const profile: HealthProfile = view.profile ?? {};
  const [editing, setEditing] = useState(false);
  const [healthView, setHealthView] = useState<HealthView>("hub");

  const [trackingPrefs, setTrackingPrefs] = useState({
    pain: true,
    tetany: true,
    panic: true,
    bowel: true,
    cycle: true,
    pregnancy: false,
    postpartum: false,
  });
  const [painScale, setPainScale] = useState<"whole" | "half">("half");
  const [units, setUnits] = useState({
    weight: "kg" as "kg" | "lb",
    temperature: "c" as "c" | "f",
    volume: "ml" as "ml" | "oz",
    time: "24h" as "24h" | "12h",
  });
  const [privacyPrefs, setPrivacyPrefs] = useState({
    analytics: false,
    crashReports: true,
  });
  const [backupPrefs, setBackupPrefs] = useState({
    autoBackup: false,
    lastBackup: "",
  });
  const [reminderPrefs, setReminderPrefs] = useState({
    medication: true,
    dailyCheckIn: false,
    periodPrediction: true,
    water: false,
    sleep: false,
    doctorAppointments: true,
    quietHours: false,
    dailyTime: "20:00",
    waterIntervalHours: "3",
    quietStart: "22:00",
    quietEnd: "08:00",
  });
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const prefsSignature = JSON.stringify({
    tracking: view.settings.tracking,
    units: view.settings.units,
    privacy: view.settings.privacy,
    backup: view.settings.backup,
    notif: view.settings.notif,
    pregnancyActive: Boolean(view.pregnancy?.active),
    postpartumActive: Boolean(view.postpartum?.active),
  });

  useEffect(() => {
    if (!hydrated) return;

    // Main BIXBO settings are the single source of truth for Profile preferences.
    const tracking = view.settings.tracking;
    const canonicalUnits = view.settings.units;
    const privacy = view.settings.privacy;
    const backup = view.settings.backup;
    const notif = view.settings.notif;

    setTrackingPrefs((current) => ({
      ...current,
      pain: tracking?.pain ?? true,
      tetany: tracking?.tetany ?? true,
      panic: tracking?.panic ?? true,
      bowel: tracking?.bowel ?? true,
      cycle: tracking?.cycle ?? true,
      pregnancy: Boolean(view.pregnancy?.active),
      postpartum: Boolean(view.postpartum?.active),
    }));
    setPainScale(tracking?.painScale ?? "half");
    setUnits({
      weight: canonicalUnits?.weight ?? "kg",
      temperature: canonicalUnits?.temperature ?? "c",
      volume: canonicalUnits?.volume ?? "ml",
      time: canonicalUnits?.time ?? "24h",
    });
    setPrivacyPrefs({
      analytics: privacy?.analytics ?? false,
      crashReports: privacy?.crashReports ?? true,
    });
    setBackupPrefs({
      autoBackup: backup?.autoBackup ?? false,
      lastBackup: backup?.lastBackupAt ?? "",
    });
    setReminderPrefs((current) => ({
      ...current,
      medication: notif?.meds ?? true,
      dailyCheckIn: notif?.dailyLog ?? false,
      periodPrediction: notif?.period ?? true,
      water: notif?.hydration ?? false,
      sleep: notif?.sleep ?? false,
      doctorAppointments: notif?.appointments ?? true,
      quietHours: notif?.quietHoursEnabled ?? false,
      dailyTime: notif?.dailyLogTime ?? "20:00",
      waterIntervalHours: String(notif?.hydrationEveryHours ?? 3),
      quietStart: notif?.quietStart ?? "22:00",
      quietEnd: notif?.quietEnd ?? "08:00",
    }));
    setPrefsLoaded(true);
  }, [hydrated, prefsSignature]);

  useEffect(() => {
    if (!prefsLoaded) return;

    // Every Profile change is written back to the canonical synced Settings
    // model so Home, Calendar, Insights and logs immediately see the same value.
    update((d) => ({
      ...d,
      settings: {
        ...d.settings,
        tracking: {
          ...(d.settings.tracking ?? { pain: true, tetany: true, panic: true, bowel: true, cycle: true, painScale: "half" }),
          pain: trackingPrefs.pain,
          tetany: trackingPrefs.tetany,
          panic: trackingPrefs.panic,
          bowel: trackingPrefs.bowel,
          cycle: trackingPrefs.cycle,
          painScale,
        },
        units: { ...units },
        privacy: {
          analytics: privacyPrefs.analytics,
          crashReports: privacyPrefs.crashReports,
        },
        backup: {
          autoBackup: backupPrefs.autoBackup,
          lastBackupAt: backupPrefs.lastBackup || undefined,
        },
        notif: {
          ...(d.settings.notif ?? {}),
          meds: reminderPrefs.medication,
          dailyLog: reminderPrefs.dailyCheckIn,
          period: reminderPrefs.periodPrediction,
          hydration: reminderPrefs.water,
          sleep: reminderPrefs.sleep,
          appointments: reminderPrefs.doctorAppointments,
          quietHoursEnabled: reminderPrefs.quietHours,
          dailyLogTime: reminderPrefs.dailyTime || undefined,
          hydrationEveryHours: Math.min(12, Math.max(1, Number(reminderPrefs.waterIntervalHours) || 3)),
          quietStart: reminderPrefs.quietStart || undefined,
          quietEnd: reminderPrefs.quietEnd || undefined,
        },
        pregnantSince: undefined,
      },
    }));
  }, [prefsLoaded, trackingPrefs, painScale, units, privacyPrefs, backupPrefs, reminderPrefs, update]);

  const patch = (p: Partial<HealthProfile>) => update((d) => ({ ...d, profile: { ...d.profile, ...p } }));
  const setTheme = (theme: "light" | "dark" | "system") =>
    update((d) => ({ ...d, settings: { ...d.settings, theme } }));
  const setTextSize = (textSize: "sm" | "md" | "lg" | "xl") =>
    update((d) => ({ ...d, settings: { ...d.settings, textSize } }));
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(view, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `bixbo-backup-${todayKey()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const age = ageFromBirthDate(profile.birthDate);
  const currentWeight = latestRecordedWeight(view);
  const gender = userGender(view);
  const pregnancyActive = isPregnancyActive(view);
  const postpartumActive = isPostpartumActive(view);
  const allergens = userAllergens(view);

  useEffect(() => {
    setTrackingPrefs((current) => ({
      ...current,
      pregnancy: pregnancyActive,
      postpartum: postpartumActive,
    }));
  }, [pregnancyActive, postpartumActive]);

  const bmi =
    profile.heightCm && currentWeight && profile.heightCm > 0
      ? currentWeight / ((profile.heightCm / 100) * (profile.heightCm / 100))
      : null;

  const setEmergency = (p: Partial<EmergencyContact>) =>
    patch({ emergencyContact: { ...profile.emergencyContact, ...p } });

  const setCurrentWeight = (value: number | undefined) =>
    update((d) => {
      const date = todayKey();
      const current = d.dayLogs[date] ?? {};
      const existingEntries = current.weightEntries ?? [];
      const profileEntryId = `${date}-profile-weight`;
      const weightEntries =
        value == null
          ? existingEntries.filter((entry) => entry.id !== profileEntryId)
          : [
              ...existingEntries.filter((entry) => entry.id !== profileEntryId),
              {
                id: profileEntryId,
                time: new Date().toTimeString().slice(0, 5),
                value,
              },
            ].sort((a, b) => a.time.localeCompare(b.time));

      return {
        ...d,
        dayLogs: {
          ...d.dayLogs,
          [date]: {
            ...current,
            weight: value,
            weightEntries,
          },
        },
      };
    });

  const setGender = (value: "female" | "male") =>
    update((d) => ({
      ...d,
      settings: {
        ...d.settings,
        gender: value,
      },
      profile: {
        ...(d.profile ?? {}),
        gender: undefined,
      },
    }));

  const reproductiveStatus: NonNullable<HealthProfile["pregnancyStatus"]> = pregnancyActive
    ? "pregnant"
    : postpartumActive
      ? "postpartum"
      : (profile.pregnancyStatus ?? "none");

  const setReproductiveStatus = (value: NonNullable<HealthProfile["pregnancyStatus"]>) =>
    update((d) => {
      const today = todayKey();
      const wasPregnant = Boolean(d.pregnancy?.active);
      const wasPostpartum = Boolean(d.postpartum?.active);
      const nextPregnant = value === "pregnant";
      const nextPostpartum = value === "postpartum";

      return {
        ...d,
        pregnancy: {
          ...(d.pregnancy ?? EMPTY.pregnancy!),
          active: nextPregnant,
          endedAt: nextPregnant ? undefined : wasPregnant ? today : d.pregnancy?.endedAt,
        },
        postpartum: {
          ...(d.postpartum ?? EMPTY.postpartum!),
          active: nextPostpartum,
          endedAt: nextPostpartum ? undefined : wasPostpartum ? today : d.postpartum?.endedAt,
        },
        settings: {
          ...d.settings,
          pregnantSince: undefined,
        },
        profile: {
          ...(d.profile ?? {}),
          pregnancyStatus: nextPregnant || nextPostpartum || value === "none" ? "none" : value,
          postpartum: undefined,
        },
      };
    });

  const doctors = [
    { label: "GP", value: profile.gp },
    { label: "Gynecologist", value: profile.gynecologist },
    { label: "Neurologist", value: profile.neurologist },
    { label: "Endocrinologist", value: profile.endocrinologist },
    { label: "Therapist", value: profile.therapist },
  ].filter((doctor) => doctor.value?.name || doctor.value?.clinic || doctor.value?.phone || doctor.value?.email);

  const activeMedications = view.meds.filter((med) => med.name.trim().length > 0);

  const medicalTags = [...(profile.diagnoses ?? []), ...(profile.chronicIllnesses ?? [])];

  const allergyTags = [...allergens, ...(profile.intolerances ?? [])];

  const postpartumStatus = postpartumProgress(view.postpartum);
  const postpartumToday = view.dayLogs[todayKey()]?.postpartum;

  const pregnancyLabel = pregnancyActive
    ? "Active pregnancy"
    : postpartumActive
      ? "Postpartum"
      : reproductiveStatus !== "none"
        ? reproductiveStatus.charAt(0).toUpperCase() + reproductiveStatus.slice(1)
        : "Not active";

  const allDayLogs = Object.values(view.dayLogs);
  const totalPainLogs = allDayLogs.reduce((sum, day) => sum + (day?.pain?.length ?? 0), 0);
  const totalBowelLogs = allDayLogs.reduce((sum, day) => sum + (day?.bowel?.length ?? 0), 0);
  const totalSleepLogs = allDayLogs.filter((day) => day?.sleepHours != null).length;
  const totalTetanyLogs = allDayLogs.reduce((sum, day) => sum + (day?.tetany?.length ?? 0), 0);
  const trackedDates = Object.keys(view.dayLogs).filter((date) => {
    const day = view.dayLogs[date];
    return Boolean(
      (day?.pain?.length ?? 0) ||
      (day?.bowel?.length ?? 0) ||
      (day?.tetany?.length ?? 0) ||
      (day?.panic?.length ?? 0) ||
      day?.sleepHours != null ||
      day?.temperature != null ||
      day?.weight != null,
    );
  });
  const firstTrackedDate = trackedDates.slice().sort()[0];
  const trackingDays = firstTrackedDate
    ? Math.max(1, Math.floor((Date.now() - new Date(`${firstTrackedDate}T00:00:00`).getTime()) / 86400000) + 1)
    : 0;

  if (healthView === "hub") {
    return (
      <HealthHub
        onHome={() => navigate({ to: "/" })}
        onOpen={(next) => {
          setEditing(false);
          setHealthView(next);
        }}
      />
    );
  }

  if (healthView === "journey") {
    const journeyItems = [
      firstTrackedDate
        ? {
            date: formatProfileDate(firstTrackedDate),
            title: "Started tracking with BIXBO",
            icon: <CalendarIcon size={20} />,
          }
        : null,
      medicalTags.length
        ? {
            date: "Health profile",
            title: `${medicalTags.length} saved condition${medicalTags.length === 1 ? "" : "s"}`,
            icon: <HeartIcon size={20} />,
          }
        : null,
      activeMedications.length
        ? {
            date: "Medication",
            title: `${activeMedications.length} active medication${activeMedications.length === 1 ? "" : "s"}`,
            icon: <PillIcon size={20} />,
          }
        : null,
      pregnancyActive ? { date: "Current", title: "Pregnancy mode active", icon: <PregnancyIcon size={20} /> } : null,
      postpartumActive ? { date: "Current", title: "Postpartum mode active", icon: <BabyIcon size={20} /> } : null,
      { date: "Today", title: "Continuing your health journey", icon: <HeartIcon size={20} /> },
    ].filter((item) => item != null);

    return (
      <HealthSubpage title="Health Journey" onBack={() => setHealthView("hub")}>
        <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
          <div className="relative space-y-5">
            <span className="absolute bottom-4 left-5 top-4 w-px bg-border" aria-hidden />
            {journeyItems.map((item, index) => (
              <div key={`${item.date}-${item.title}-${index}`} className="relative flex gap-4">
                <span className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-tint text-primary ring-1 ring-border/60">
                  {item.icon}
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {item.date}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{item.title}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </HealthSubpage>
    );
  }

  if (healthView === "achievements") {
    const achievements = [
      { icon: <HeartIcon size={24} />, value: totalPainLogs, label: "Pain logs", goal: 100 },
      { icon: <CalendarIcon size={24} />, value: trackedDates.length, label: "Days tracked", goal: 365 },
      {
        icon: <PillIcon size={24} />,
        value: Object.values(view.medLog).reduce(
          (sum, day) => sum + Object.values(day ?? {}).filter(Boolean).length,
          0,
        ),
        label: "Medication doses",
        goal: 365,
      },
      { icon: <ClockIcon size={24} />, value: totalSleepLogs, label: "Sleep logs", goal: 100 },
      { icon: <StarIcon size={24} />, value: totalTetanyLogs, label: "Tetany logs", goal: 50 },
      { icon: <TaskIcon size={24} />, value: totalBowelLogs, label: "Bowel logs", goal: 50 },
    ];

    return (
      <HealthSubpage title="Achievements" onBack={() => setHealthView("hub")}>
        <div className="grid grid-cols-2 gap-3">
          {achievements.map((item) => {
            const unlocked = item.value >= item.goal;
            return (
              <article
                key={item.label}
                className="rounded-3xl bg-surface p-4 text-center shadow-sm ring-1 ring-border/80"
              >
                <span
                  className={`mx-auto grid h-12 w-12 place-items-center rounded-2xl ring-1 ring-border/50 ${unlocked ? "bg-primary/15 text-primary" : "bg-tint text-muted-foreground"}`}
                >
                  {item.icon}
                </span>
                <p className="mt-3 font-serif text-3xl font-bold tabular-nums">{item.value}</p>
                <p className="mt-1 text-xs font-semibold text-foreground">{item.label}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {unlocked ? "Unlocked" : `${Math.max(0, item.goal - item.value)} to go`}
                </p>
              </article>
            );
          })}
        </div>
      </HealthSubpage>
    );
  }

  if (healthView === "statistics") {
    const painScores = allDayLogs.flatMap((day) => (day?.pain ?? []).map((entry) => entry.score));
    const averagePain = painScores.length
      ? painScores.reduce((sum, value) => sum + value, 0) / painScores.length
      : null;
    const sleepValues = allDayLogs.map((day) => day?.sleepHours).filter((value): value is number => value != null);
    const averageSleep = sleepValues.length
      ? sleepValues.reduce((sum, value) => sum + value, 0) / sleepValues.length
      : null;
    const stats = [
      ["Tracking for", trackingDays ? `${trackingDays} days` : "—"],
      ["Days with logs", String(trackedDates.length)],
      ["Pain logs", String(totalPainLogs)],
      ["Average pain", averagePain != null ? `${averagePain.toFixed(1)} / 10` : "—"],
      ["Sleep logs", String(totalSleepLogs)],
      ["Average sleep", averageSleep != null ? `${averageSleep.toFixed(1)} h` : "—"],
      ["Bowel logs", String(totalBowelLogs)],
      ["Tetany logs", String(totalTetanyLogs)],
      ["Active medications", String(activeMedications.length)],
      ["Saved conditions", String(medicalTags.length)],
    ];

    return (
      <HealthSubpage title="My Statistics" onBack={() => setHealthView("hub")}>
        <section className="overflow-hidden rounded-3xl bg-surface shadow-sm ring-1 ring-border/80">
          {stats.map(([label, value], index) => (
            <div
              key={label}
              className={`flex items-center justify-between gap-4 px-4 py-3 ${index ? "border-t border-border/60" : ""}`}
            >
              <span className="text-sm text-foreground">{label}</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-primary">{value}</span>
            </div>
          ))}
        </section>
      </HealthSubpage>
    );
  }

  if (healthView === "language") {
    return (
      <HealthSubpage title="Language" onBack={() => setHealthView("hub")}>
        <section className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80">
          <p className="text-sm font-semibold text-foreground">App language</p>
          <p className="mt-1 text-xs text-muted-foreground">
            English is currently active. More languages will be added with translation.
          </p>
          <select
            className="mt-4 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
            value="en"
            disabled
          >
            <option value="en">English</option>
          </select>
        </section>
      </HealthSubpage>
    );
  }

  if (healthView === "appearance") {
    const themes = ["light", "dark", "system"] as const;
    const sizes = [
      { value: "sm" as const, label: "Small", px: 13 },
      { value: "md" as const, label: "Medium", px: 15 },
      { value: "lg" as const, label: "Large", px: 17 },
      { value: "xl" as const, label: "Extra", px: 19 },
    ];
    return (
      <HealthSubpage title="Appearance" onBack={() => setHealthView("hub")}>
        <section className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80">
          <p className="text-sm font-semibold text-foreground">Theme</p>
          <p className="mt-1 text-xs text-muted-foreground">Choose how BIXBO looks on this device.</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {themes.map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => setTheme(theme)}
                className={`min-h-11 rounded-xl border px-3 text-sm font-semibold capitalize ${(view.settings.theme ?? "system") === theme ? "border-primary bg-primary text-primary-foreground" : "border-border bg-tint"}`}
              >
                {theme}
              </button>
            ))}
          </div>
        </section>
        <section className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80">
          <p className="text-sm font-semibold text-foreground">Text size</p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {sizes.map((size) => (
              <button
                key={size.value}
                type="button"
                onClick={() => setTextSize(size.value)}
                className={`min-h-16 rounded-xl border p-2 ${(view.settings.textSize ?? "md") === size.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-tint"}`}
              >
                <span className="block font-semibold" style={{ fontSize: size.px }}>
                  Aa
                </span>
                <span className="mt-1 block text-[10px] text-muted-foreground">{size.label}</span>
              </button>
            ))}
          </div>
        </section>
      </HealthSubpage>
    );
  }

  if (healthView === "notifications") {
    return (
      <HealthSubpage title="Notifications" onBack={() => setHealthView("hub")}>
        <section className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80">
          <p className="text-sm font-semibold text-foreground">Reminders and alerts</p>
          <p className="mt-1 text-xs text-muted-foreground">Manage medication, period and app reminders.</p>
          <Link
            to={"/notifications" as never}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Open notification controls
          </Link>
        </section>
        <section className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80">
          <p className="text-sm font-semibold text-foreground">Medication reminders</p>
          <Link
            to={"/meds" as never}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-input px-4 text-sm font-semibold"
          >
            Manage medication times
          </Link>
        </section>
      </HealthSubpage>
    );
  }

  if (healthView === "privacy") {
    return (
      <HealthSubpage title="Privacy" onBack={() => setHealthView("hub")}>
        <Section
          title="Account"
          subtitle="Sign in to connect your BIXBO account and cloud data."
        >
          <Link
            to={"/auth" as never}
            className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-input bg-background px-4 text-sm font-semibold text-foreground"
          >
            <span className="text-base font-bold">G</span>
            Continue with Google
          </Link>

          <Link
            to={"/auth" as never}
            className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-input bg-background px-4 text-sm font-semibold text-foreground"
          >
            <span className="text-lg leading-none"></span>
            Continue with Apple / iCloud
          </Link>

          <p className="text-xs leading-relaxed text-muted-foreground">
            These buttons open BIXBO&apos;s existing sign-in screen. Provider-specific OAuth remains handled by the auth flow.
          </p>
        </Section>

        <Section
          title="Diagnostics"
          subtitle="Optional technical data that can help improve app stability."
        >
          <ToggleRow
            label="Anonymous analytics"
            checked={privacyPrefs.analytics}
            onChange={(value) => setPrivacyPrefs((current) => ({ ...current, analytics: value }))}
          />
          <ToggleRow
            label="Crash reports"
            checked={privacyPrefs.crashReports}
            onChange={(value) => setPrivacyPrefs((current) => ({ ...current, crashReports: value }))}
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Crash reports contain technical error information when the app fails. They are not your health diary entries.
          </p>
        </Section>
      </HealthSubpage>
    );
  }

  if (healthView === "backup") {
    const restoreBackup = async (file: File) => {
      try {
        const raw = await file.text();
        JSON.parse(raw);
        window.alert("Backup file is valid. Restore/merge can now be connected to the existing import logic.");
      } catch {
        window.alert("This is not a valid BIXBO JSON backup.");
      }
    };

    const runBackup = () => {
      exportJson();
      setBackupPrefs((current) => ({ ...current, lastBackup: new Date().toISOString() }));
    };

    return (
      <HealthSubpage title="Backup, Sync & Storage" onBack={() => setHealthView("hub")}>
        <Section title="Automatic backup">
          <ToggleRow
            label="Auto backup"
            checked={backupPrefs.autoBackup}
            onChange={(value) => setBackupPrefs((current) => ({ ...current, autoBackup: value }))}
          />
          <p className="text-xs text-muted-foreground">
            Last backup:{" "}
            <span className="font-semibold text-foreground">
              {backupPrefs.lastBackup ? new Date(backupPrefs.lastBackup).toLocaleString("en-GB") : "Never"}
            </span>
          </p>
        </Section>

        <Section title="Backup actions">
          <button
            type="button"
            onClick={runBackup}
            className="min-h-11 w-full rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Back up now
          </button>

          <label className="block">
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void restoreBackup(file);
                event.currentTarget.value = "";
              }}
            />
            <span className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-xl border border-input px-4 text-sm font-semibold">
              Restore backup
            </span>
          </label>

          <button
            type="button"
            onClick={exportJson}
            className="min-h-11 w-full rounded-xl border border-input px-4 text-sm font-semibold"
          >
            Export JSON
          </button>
        </Section>

        <Section
          title="Data & storage"
          subtitle="Manage the local copy of your BIXBO data from the same place as backup and sync."
        >
          <p className="text-xs leading-relaxed text-muted-foreground">
            Export JSON downloads a complete copy of the data currently stored by BIXBO on this device.
          </p>
          <button
            type="button"
            onClick={exportJson}
            className="min-h-11 w-full rounded-xl border border-input px-4 text-sm font-semibold"
          >
            Download local data
          </button>
        </Section>
      </HealthSubpage>
    );
  }

  if (healthView === "tracking") {
    const toggleTracking = (key: keyof typeof trackingPrefs, enabled: boolean) => {
      setTrackingPrefs((current) => ({ ...current, [key]: enabled }));

      if (key === "pregnancy") {
        setReproductiveStatus(enabled ? "pregnant" : "none");
      }
      if (key === "postpartum") {
        setReproductiveStatus(enabled ? "postpartum" : "none");
      }
    };

    return (
      <HealthSubpage title="Tracking & Units" onBack={() => setHealthView("hub")}>
        <Section title="Tracked categories" subtitle="Choose which categories you want available in BIXBO.">
          <ToggleRow label="Pain" checked={trackingPrefs.pain} onChange={(value) => toggleTracking("pain", value)} />
          <ToggleRow
            label="Tetany"
            checked={trackingPrefs.tetany}
            onChange={(value) => toggleTracking("tetany", value)}
          />
          <ToggleRow
            label="Panic attacks"
            checked={trackingPrefs.panic}
            onChange={(value) => toggleTracking("panic", value)}
          />
          <ToggleRow label="Bowel" checked={trackingPrefs.bowel} onChange={(value) => toggleTracking("bowel", value)} />
          <ToggleRow
            label="Cycle tracking"
            checked={trackingPrefs.cycle}
            onChange={(value) => toggleTracking("cycle", value)}
          />
        </Section>

        <Section title="Reproductive modes" subtitle="Pregnancy and postpartum cannot be active at the same time.">
          <ToggleRow
            label="Pregnancy mode"
            checked={pregnancyActive}
            onChange={(value) => toggleTracking("pregnancy", value)}
          />
          <ToggleRow
            label="Postpartum mode"
            checked={postpartumActive}
            onChange={(value) => toggleTracking("postpartum", value)}
          />
        </Section>

        <Section title="Default pain scale" subtitle="Choose whether pain can be logged in whole or half steps.">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: "whole", label: "Whole numbers", detail: "0, 1, 2…" },
                { value: "half", label: "Half steps", detail: "0, 0.5, 1…" },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPainScale(option.value)}
                className={`min-h-16 rounded-xl border p-3 text-left ${
                  painScale === option.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-tint text-foreground"
                }`}
              >
                <span className="block text-sm font-semibold">{option.label}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{option.detail}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Temperature unit">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: "c", label: "Celsius", symbol: "°C" },
                { value: "f", label: "Fahrenheit", symbol: "°F" },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setUnits((current) => ({ ...current, temperature: option.value }))}
                className={`min-h-14 rounded-xl border p-3 ${
                  units.temperature === option.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-tint"
                }`}
              >
                <span className="block text-sm font-semibold">{option.label}</span>
                <span className="text-xs opacity-75">{option.symbol}</span>
              </button>
            ))}
          </div>
        </Section>
        <Section title="Measurement units" subtitle="Choose how measurements are displayed across BIXBO.">
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Weight</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "kg", label: "Kilograms (kg)" },
                  { value: "lb", label: "Pounds (lb)" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setUnits((current) => ({ ...current, weight: option.value as "kg" | "lb" }))}
                    className={`min-h-12 rounded-xl border px-3 text-sm font-semibold ${
                      units.weight === option.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-tint"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Temperature</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "c", label: "Celsius (°C)" },
                  { value: "f", label: "Fahrenheit (°F)" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setUnits((current) => ({ ...current, temperature: option.value as "c" | "f" }))}
                    className={`min-h-12 rounded-xl border px-3 text-sm font-semibold ${
                      units.temperature === option.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-tint"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Volume</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "ml", label: "Millilitres (ml)" },
                  { value: "oz", label: "Fluid ounces (oz)" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setUnits((current) => ({ ...current, volume: option.value as "ml" | "oz" }))}
                    className={`min-h-12 rounded-xl border px-3 text-sm font-semibold ${
                      units.volume === option.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-tint"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Time</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "24h", label: "24-hour" },
                  { value: "12h", label: "12-hour" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setUnits((current) => ({ ...current, time: option.value as "24h" | "12h" }))}
                    className={`min-h-12 rounded-xl border px-3 text-sm font-semibold ${
                      units.time === option.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-tint"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>
      </HealthSubpage>
    );
  }

  if (healthView === "reminders") {
    const setReminder = <K extends keyof typeof reminderPrefs>(key: K, value: (typeof reminderPrefs)[K]) =>
      setReminderPrefs((current) => ({ ...current, [key]: value }));

    return (
      <HealthSubpage title="Medications & Reminders" onBack={() => setHealthView("hub")}>
        <Section title="Medication">
          <Link
            to="/meds"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Manage medications & times
          </Link>
        </Section>

        <Section title="Notification controls">
          <Link
            to={"/notifications" as never}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-input px-4 text-sm font-semibold"
          >
            Open notification controls
          </Link>
        </Section>

        <Section title="Health reminders" subtitle="Choose which reminders BIXBO should show.">
          <ToggleRow
            label="Medication reminders"
            checked={reminderPrefs.medication}
            onChange={(value) => setReminder("medication", value)}
          />
          <ToggleRow
            label="Daily check-in"
            checked={reminderPrefs.dailyCheckIn}
            onChange={(value) => setReminder("dailyCheckIn", value)}
          />
          <ToggleRow
            label="Predicted period reminder"
            checked={reminderPrefs.periodPrediction}
            onChange={(value) => setReminder("periodPrediction", value)}
          />
          <ToggleRow
            label="Water reminder"
            checked={reminderPrefs.water}
            onChange={(value) => setReminder("water", value)}
          />
          <ToggleRow
            label="Sleep reminder"
            checked={reminderPrefs.sleep}
            onChange={(value) => setReminder("sleep", value)}
          />
          <ToggleRow
            label="Doctor appointment reminder"
            checked={reminderPrefs.doctorAppointments}
            onChange={(value) => setReminder("doctorAppointments", value)}
          />
        </Section>

        <Section title="Reminder timing">
          <Field label="Daily check-in time" htmlFor="reminder-daily-time">
            <Input
              id="reminder-daily-time"
              type="time"
              value={reminderPrefs.dailyTime}
              disabled={!reminderPrefs.dailyCheckIn}
              onChange={(event) => setReminder("dailyTime", event.target.value)}
            />
          </Field>

          <Field label="Water reminder interval" htmlFor="water-reminder-interval">
            <select
              id="water-reminder-interval"
              value={reminderPrefs.waterIntervalHours}
              disabled={!reminderPrefs.water}
              onChange={(event) => setReminder("waterIntervalHours", event.target.value)}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
            >
              <option value="1">Every hour</option>
              <option value="2">Every 2 hours</option>
              <option value="3">Every 3 hours</option>
              <option value="4">Every 4 hours</option>
            </select>
          </Field>
        </Section>

        <Section title="Quiet hours" subtitle="Pause non-urgent reminders during this period.">
          <ToggleRow
            label="Enable quiet hours"
            checked={reminderPrefs.quietHours}
            onChange={(value) => setReminder("quietHours", value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Field label="From" htmlFor="quiet-hours-start">
              <Input
                id="quiet-hours-start"
                type="time"
                value={reminderPrefs.quietStart}
                disabled={!reminderPrefs.quietHours}
                onChange={(event) => setReminder("quietStart", event.target.value)}
              />
            </Field>
            <Field label="To" htmlFor="quiet-hours-end">
              <Input
                id="quiet-hours-end"
                type="time"
                value={reminderPrefs.quietEnd}
                disabled={!reminderPrefs.quietHours}
                onChange={(event) => setReminder("quietEnd", event.target.value)}
              />
            </Field>
          </div>
        </Section>
      </HealthSubpage>
    );
  }

  if (healthView === "about") {
    return (
      <HealthSubpage title="About BIXBO" onBack={() => setHealthView("hub")}>
        <section className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80">
          <p className="text-sm font-semibold text-foreground">BIXBO</p>
          <p className="mt-1 text-xs text-muted-foreground">Health tracking application. Development build.</p>
        </section>
      </HealthSubpage>
    );
  }

  if (healthView === "export") {
    return (
      <HealthSubpage title="Export" onBack={() => setHealthView("hub")}>
        <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-tint ring-1 ring-border/50">
              <NoteIcon size={22} />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Health reports</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                PDF and CSV export will be completed later.
              </p>
            </div>
          </div>
        </section>
      </HealthSubpage>
    );
  }

  return (
    <AppShell
      title={
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setHealthView("hub");
          }}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-5 w-5" /> Health Summary
        </button>
      }
      right={
        <button
          type="button"
          onClick={() => setEditing((current) => !current)}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-primary transition hover:bg-tint"
        >
          {editing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          {editing ? "Done" : "Edit"}
        </button>
      }
    >
      {editing ? (
        <div className="space-y-4 px-5 pt-4 pb-28">
          {/* ---------------- Personal ---------------- */}
          <Section title="Personal" subtitle="Basic information about you.">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name" htmlFor="p-name">
                <Input
                  id="p-name"
                  className="h-11"
                  value={profile.name ?? ""}
                  onChange={(e) => patch({ name: e.target.value })}
                />
              </Field>
              <Field label="Nickname" htmlFor="p-nickname">
                <Input
                  id="p-nickname"
                  className="h-11"
                  value={profile.nickname ?? ""}
                  onChange={(e) => patch({ nickname: e.target.value })}
                />
              </Field>
              <Field label="Birth date" htmlFor="p-birthdate">
                <Input
                  id="p-birthdate"
                  type="date"
                  className="h-11"
                  value={profile.birthDate ?? ""}
                  onChange={(e) => patch({ birthDate: e.target.value })}
                />
              </Field>
              <Field label="Age">
                <div className="flex h-11 items-center rounded-md border border-input bg-tint px-3 text-sm text-muted-foreground">
                  {age !== null ? `${age} years` : "—"}
                </div>
              </Field>
              <Field label="Height (cm)" htmlFor="p-height">
                <Input
                  id="p-height"
                  type="number"
                  inputMode="decimal"
                  className="h-11"
                  value={profile.heightCm ?? ""}
                  onChange={(e) => patch({ heightCm: e.target.value === "" ? undefined : Number(e.target.value) })}
                />
              </Field>
              <Field label="Current weight (kg)" htmlFor="p-weight">
                <Input
                  id="p-weight"
                  type="number"
                  inputMode="decimal"
                  className="h-11"
                  value={currentWeight ?? ""}
                  onChange={(e) => setCurrentWeight(e.target.value === "" ? undefined : Number(e.target.value))}
                />
                <p className="mt-1 text-[10px] text-muted-foreground">Saved as today&apos;s dated weight entry.</p>
              </Field>
              <Field label="Target weight (kg)" htmlFor="p-target-weight">
                <Input
                  id="p-target-weight"
                  type="number"
                  inputMode="decimal"
                  className="h-11"
                  value={profile.targetWeightKg ?? ""}
                  onChange={(e) =>
                    patch({ targetWeightKg: e.target.value === "" ? undefined : Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="BMI">
                <div className="flex h-11 items-center rounded-md border border-input bg-tint px-3 text-sm text-muted-foreground">
                  {bmi ? bmi.toFixed(1) : "—"}
                </div>
              </Field>
              <Field label="Gender" htmlFor="p-gender">
                <SelectField
                  id="p-gender"
                  value={gender}
                  onChange={(value) => setGender(value as "female" | "male")}
                  options={[
                    { value: "female", label: "Female" },
                    { value: "male", label: "Male" },
                  ]}
                />
              </Field>
              <Field label="Pronouns" htmlFor="p-pronouns">
                <Input
                  id="p-pronouns"
                  className="h-11"
                  value={profile.pronouns ?? ""}
                  onChange={(e) => patch({ pronouns: e.target.value })}
                />
              </Field>
            </div>
          </Section>

          {/* ---------------- Medical ---------------- */}
          <Section title="Medical" subtitle="Diagnoses, conditions and history.">
            <TagListField
              label="Diagnosed conditions"
              values={profile.diagnoses ?? []}
              onChange={(v) => patch({ diagnoses: v })}
            />
            <TagListField
              label="Chronic illnesses"
              values={profile.chronicIllnesses ?? []}
              onChange={(v) => patch({ chronicIllnesses: v })}
            />
            <TagListField
              label="Allergies"
              values={allergens}
              onChange={(values) =>
                update((d) => ({
                  ...d,
                  profile: {
                    ...(d.profile ?? {}),
                    allergies: values,
                  },
                  settings: {
                    ...d.settings,
                    allergens: undefined,
                  },
                }))
              }
            />
            <TagListField
              label="Intolerances"
              values={profile.intolerances ?? []}
              onChange={(v) => patch({ intolerances: v })}
            />
            <TagListField
              label="Surgeries"
              values={profile.surgeries ?? []}
              onChange={(v) => patch({ surgeries: v })}
            />
            <TagListField
              label="Pregnancies"
              values={profile.pregnancies ?? []}
              onChange={(v) => patch({ pregnancies: v })}
            />
            <TagListField
              label="Disabilities"
              values={profile.disabilities ?? []}
              onChange={(v) => patch({ disabilities: v })}
            />
          </Section>

          {/* ---------------- Cycle ---------------- */}
          <Section title="Cycle" subtitle="Reproductive and hormonal status.">
            <Field label="Reproductive status" htmlFor="p-preg-status">
              <SelectField
                id="p-preg-status"
                value={reproductiveStatus}
                onChange={(value) => setReproductiveStatus(value as NonNullable<HealthProfile["pregnancyStatus"]>)}
                options={[
                  { value: "none", label: "None" },
                  { value: "pregnant", label: "Pregnant" },
                  { value: "postpartum", label: "Postpartum" },
                  { value: "trying", label: "Trying" },
                  { value: "unsure", label: "Unsure" },
                ]}
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                Pregnancy and postpartum modes are synchronized across the whole app.
              </p>
            </Field>
            <div className="grid grid-cols-1 gap-2">
              <ToggleRow
                label="Trying to conceive"
                checked={!!profile.tryingToConceive}
                onChange={(value) => patch({ tryingToConceive: value })}
              />
              <ToggleRow
                label="Breastfeeding"
                checked={!!profile.breastfeeding}
                onChange={(value) => patch({ breastfeeding: value })}
              />
            </div>
            <Field label="Menopause" htmlFor="p-menopause">
              <SelectField
                id="p-menopause"
                value={profile.menopause}
                onChange={(v) => patch({ menopause: v as HealthProfile["menopause"] })}
                options={[
                  { value: "no", label: "No" },
                  { value: "peri", label: "Perimenopause" },
                  { value: "post", label: "Postmenopause" },
                ]}
              />
            </Field>
            <Field label="Birth control" htmlFor="p-birth-control">
              <Input
                id="p-birth-control"
                className="h-11"
                value={profile.birthControl ?? ""}
                onChange={(e) => patch({ birthControl: e.target.value })}
              />
            </Field>
            <Field label="Fertility goals" htmlFor="p-fertility-goals">
              <Input
                id="p-fertility-goals"
                className="h-11"
                value={profile.fertilityGoals ?? ""}
                onChange={(e) => patch({ fertilityGoals: e.target.value })}
              />
            </Field>
          </Section>

          {/* ---------------- Lifestyle ---------------- */}
          <Section title="Lifestyle" subtitle="Habits that affect your health.">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Smoking" htmlFor="p-smoker">
                <SelectField
                  id="p-smoker"
                  value={profile.smoker}
                  onChange={(v) => patch({ smoker: v as HealthProfile["smoker"] })}
                  options={[
                    { value: "no", label: "No" },
                    { value: "occasionally", label: "Occasionally" },
                    { value: "daily", label: "Daily" },
                    { value: "quit", label: "Quit" },
                  ]}
                />
              </Field>
              <Field label="Alcohol" htmlFor="p-alcohol">
                <SelectField
                  id="p-alcohol"
                  value={profile.alcohol}
                  onChange={(v) => patch({ alcohol: v as HealthProfile["alcohol"] })}
                  options={[
                    { value: "none", label: "None" },
                    { value: "rarely", label: "Rarely" },
                    { value: "weekly", label: "Weekly" },
                    { value: "daily", label: "Daily" },
                  ]}
                />
              </Field>
              <Field label="Caffeine" htmlFor="p-caffeine">
                <SelectField
                  id="p-caffeine"
                  value={profile.caffeine}
                  onChange={(v) => patch({ caffeine: v as HealthProfile["caffeine"] })}
                  options={[
                    { value: "none", label: "None" },
                    { value: "low", label: "Low" },
                    { value: "medium", label: "Medium" },
                    { value: "high", label: "High" },
                  ]}
                />
              </Field>
              <Field label="Exercise" htmlFor="p-exercise">
                <SelectField
                  id="p-exercise"
                  value={profile.exercise}
                  onChange={(v) => patch({ exercise: v as HealthProfile["exercise"] })}
                  options={[
                    { value: "none", label: "None" },
                    { value: "light", label: "Light" },
                    { value: "moderate", label: "Moderate" },
                    { value: "intense", label: "Intense" },
                  ]}
                />
              </Field>
              <Field label="Sleep goal (hours)" htmlFor="p-sleep-goal">
                <Input
                  id="p-sleep-goal"
                  type="number"
                  inputMode="decimal"
                  className="h-11"
                  value={profile.sleepGoalHours ?? ""}
                  onChange={(e) =>
                    patch({ sleepGoalHours: e.target.value === "" ? undefined : Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Hydration goal (ml)" htmlFor="p-hydration-goal">
                <Input
                  id="p-hydration-goal"
                  type="number"
                  inputMode="numeric"
                  className="h-11"
                  value={profile.hydrationGoalMl ?? ""}
                  onChange={(e) =>
                    patch({ hydrationGoalMl: e.target.value === "" ? undefined : Number(e.target.value) })
                  }
                />
              </Field>
            </div>
          </Section>

          {/* ---------------- Emergency ---------------- */}
          <Section title="Emergency" subtitle="In case of emergency — contact and care team.">
            <Field label="Blood type" htmlFor="p-blood-type">
              <SelectField
                id="p-blood-type"
                value={profile.bloodType}
                onChange={(v) => patch({ bloodType: v })}
                options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((v) => ({ value: v, label: v }))}
              />
            </Field>

            <div className="rounded-xl border border-border p-3">
              <p className="mb-2 text-xs font-semibold text-foreground">Emergency contact</p>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Name" htmlFor="p-ec-name">
                  <Input
                    id="p-ec-name"
                    className="h-11"
                    value={profile.emergencyContact?.name ?? ""}
                    onChange={(e) => setEmergency({ name: e.target.value })}
                  />
                </Field>
                <Field label="Relation" htmlFor="p-ec-relation">
                  <Input
                    id="p-ec-relation"
                    className="h-11"
                    value={profile.emergencyContact?.relation ?? ""}
                    onChange={(e) => setEmergency({ relation: e.target.value })}
                  />
                </Field>
                <Field label="Phone" htmlFor="p-ec-phone">
                  <Input
                    id="p-ec-phone"
                    type="tel"
                    className="h-11"
                    value={profile.emergencyContact?.phone ?? ""}
                    onChange={(e) => setEmergency({ phone: e.target.value })}
                  />
                </Field>
              </div>
            </div>

            <DoctorForm title="GP" value={profile.gp} onChange={(v) => patch({ gp: v })} />
            <DoctorForm
              title="Gynecologist"
              value={profile.gynecologist}
              onChange={(v) => patch({ gynecologist: v })}
            />
            <DoctorForm title="Neurologist" value={profile.neurologist} onChange={(v) => patch({ neurologist: v })} />
            <DoctorForm
              title="Endocrinologist"
              value={profile.endocrinologist}
              onChange={(v) => patch({ endocrinologist: v })}
            />
            <DoctorForm title="Therapist" value={profile.therapist} onChange={(v) => patch({ therapist: v })} />
          </Section>

          {/* ---------------- Medication ---------------- */}
          <Section title="Medication" subtitle="Medication schedules are managed from the Medications page.">
            <Button type="button" variant="outline" onClick={() => navigate({ to: "/meds" })} className="w-full">
              <PillIcon size={18} />
              Manage medications and reminder times
            </Button>

            <Field label="Pharmacy" htmlFor="p-pharmacy">
              <Input
                id="p-pharmacy"
                className="h-11"
                value={profile.pharmacy ?? ""}
                onChange={(e) => patch({ pharmacy: e.target.value })}
              />
            </Field>

            <Field label="General medication notes" htmlFor="p-med-notes">
              <Textarea
                id="p-med-notes"
                value={profile.medicationNotes ?? ""}
                onChange={(e) => patch({ medicationNotes: e.target.value })}
              />
            </Field>
          </Section>
        </div>
      ) : (
        <div className="space-y-4 px-5 pb-28 pt-4">
          <section className="overflow-hidden rounded-3xl bg-primary/10 p-5 ring-1 ring-primary/20">
            <div className="flex items-center gap-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl bg-surface text-primary ring-1 ring-border/60">
                <ProfileIcon size={36} />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Health profile
                </p>
                <h1 className="mt-1 truncate font-serif text-2xl font-bold text-foreground">
                  {profile.name?.trim() || view.settings.userName?.trim() || "Your profile"}
                </h1>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {profile.nickname?.trim() ? `@${profile.nickname.trim()}` : "Personal health summary"}
                </p>
              </div>
            </div>
          </section>

          <SummaryCard icon={<ProfileIcon size={24} />} title="Personal" subtitle="Your main profile details">
            <div className="grid grid-cols-2 gap-2">
              <SummaryStat
                icon={<CalendarIcon size={16} />}
                label="Birth date"
                value={formatProfileDate(profile.birthDate)}
              />
              <SummaryStat label="Age" value={age !== null ? `${age} years` : "—"} />
              <SummaryStat
                icon={<ProfileIcon size={16} />}
                label="Height"
                value={profile.heightCm != null ? `${profile.heightCm} cm` : "—"}
              />
              <SummaryStat
                icon={<WeightIcon size={16} />}
                label="Weight"
                value={currentWeight != null ? `${currentWeight} kg` : "—"}
              />
              <SummaryStat
                icon={<WeightIcon size={16} />}
                label="Goal"
                value={profile.targetWeightKg != null ? `${profile.targetWeightKg} kg` : "—"}
              />
              <SummaryStat label="BMI" value={bmi != null ? bmi.toFixed(1) : "—"} />
              <SummaryStat label="Gender" value={gender.charAt(0).toUpperCase() + gender.slice(1)} />
              <SummaryStat label="Pronouns" value={profile.pronouns || "—"} />
            </div>
          </SummaryCard>

          <SummaryCard
            icon={<HeartIcon size={24} />}
            title="Medical"
            subtitle={`${medicalTags.length} saved condition${medicalTags.length === 1 ? "" : "s"}`}
          >
            <SummaryChips values={medicalTags} emptyText="No diagnosed or chronic conditions added." />

            {(profile.surgeries?.length ?? 0) > 0 && (
              <div className="mt-4 border-t border-border/60 pt-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Surgeries
                </p>
                <SummaryChips values={profile.surgeries ?? []} />
              </div>
            )}
          </SummaryCard>

          <SummaryCard
            icon={<WarningIcon size={24} />}
            title="Allergies & intolerances"
            subtitle="Important sensitivities"
          >
            <SummaryChips values={allergyTags} emptyText="No allergies or intolerances added." />
          </SummaryCard>

          <SummaryCard
            icon={<PillIcon size={24} />}
            title="Medication"
            subtitle={`${activeMedications.length} active medication${activeMedications.length === 1 ? "" : "s"}`}
          >
            {activeMedications.length > 0 ? (
              <div className="space-y-2">
                {activeMedications.slice(0, 4).map((med) => (
                  <div
                    key={med.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-tint px-3 py-2.5 ring-1 ring-border/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{med.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[med.dose, med.times?.join(", ")].filter(Boolean).join(" · ") || "No schedule"}
                      </p>
                    </div>
                    <PillIcon size={18} className="shrink-0" />
                  </div>
                ))}

                {activeMedications.length > 4 && (
                  <p className="px-1 text-xs text-muted-foreground">
                    +{activeMedications.length - 4} more medication{activeMedications.length - 4 === 1 ? "" : "s"}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No medications added.</p>
            )}
          </SummaryCard>

          <SummaryCard
            icon={pregnancyActive ? <PregnancyIcon size={24} /> : <BabyIcon size={24} />}
            title="Reproductive health"
            subtitle="Pregnancy, postpartum and hormonal status"
          >
            <div className="grid grid-cols-2 gap-2">
              <SummaryStat label="Status" value={pregnancyLabel} />
              {postpartumActive ? (
                <>
                  <SummaryStat
                    label="Postpartum"
                    value={
                      postpartumStatus
                        ? `Week ${postpartumStatus.week} + ${postpartumStatus.dayOfWeek}`
                        : "Birth date missing"
                    }
                  />
                  <SummaryStat label="Symptoms today" value={`${postpartumToday?.symptoms?.length ?? 0}`} />
                  <SummaryStat
                    label="Feeding today"
                    value={`${(postpartumToday?.breastfeeding?.length ?? 0) + (postpartumToday?.pumping?.length ?? 0) + (postpartumToday?.bottle?.length ?? 0)}`}
                  />
                </>
              ) : (
                <>
                  <SummaryStat label="Birth control" value={profile.birthControl || "—"} />
                  <SummaryStat label="Breastfeeding" value={profile.breastfeeding ? "Yes" : "No"} />
                  <SummaryStat
                    label="Menopause"
                    value={
                      profile.menopause ? profile.menopause.charAt(0).toUpperCase() + profile.menopause.slice(1) : "—"
                    }
                  />
                </>
              )}
            </div>
          </SummaryCard>

          <SummaryCard
            icon={<StethoscopeIcon size={24} />}
            title="Doctors"
            subtitle={`${doctors.length} saved doctor${doctors.length === 1 ? "" : "s"}`}
          >
            {doctors.length > 0 ? (
              <div className="space-y-2">
                {doctors.map((doctor) => (
                  <div
                    key={doctor.label}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-tint px-3 py-2.5 ring-1 ring-border/40"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">{doctor.label}</p>
                      <p className="truncate text-sm font-semibold text-foreground">
                        {doctor.value?.name || doctor.value?.clinic || "Saved"}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No doctors added.</p>
            )}
          </SummaryCard>

          <SummaryCard
            icon={<WarningIcon size={24} />}
            title="Emergency"
            subtitle={profile.bloodType ? `Blood type ${profile.bloodType}` : "Emergency contact and blood type"}
          >
            {profile.emergencyContact?.name || profile.emergencyContact?.phone || profile.emergencyContact?.relation ? (
              <div className="rounded-2xl bg-tint px-4 py-3 ring-1 ring-border/40">
                <p className="text-sm font-semibold text-foreground">
                  {profile.emergencyContact?.name || "Emergency contact"}
                </p>
                {profile.emergencyContact?.relation && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{profile.emergencyContact.relation}</p>
                )}
                {profile.emergencyContact?.phone && (
                  <p className="mt-2 text-sm font-medium tabular-nums text-primary">{profile.emergencyContact.phone}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No emergency contact added.</p>
            )}
          </SummaryCard>

          <SummaryCard icon={<WorkoutIcon size={24} />} title="Lifestyle" subtitle="Daily health goals and habits">
            <div className="grid grid-cols-2 gap-2">
              <SummaryStat label="Exercise" value={profile.exercise || "—"} />
              <SummaryStat
                label="Sleep goal"
                value={profile.sleepGoalHours != null ? `${profile.sleepGoalHours} h` : "—"}
              />
              <SummaryStat
                label="Hydration"
                value={profile.hydrationGoalMl != null ? `${profile.hydrationGoalMl} ml` : "—"}
              />
              <SummaryStat label="Caffeine" value={profile.caffeine || "—"} />
            </div>
          </SummaryCard>

          <Button
            type="button"
            onClick={() => setEditing(true)}
            className="h-12 w-full rounded-2xl text-base font-semibold"
          >
            <Pencil className="h-4 w-4" />
            Edit health profile
          </Button>
        </div>
      )}
    </AppShell>
  );
}

