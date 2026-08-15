import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { postpartumProgress } from "@/lib/health";
import { ArrowLeft, Plus, X, Pencil, ChevronRight, Check } from "@/components/icons/BixboExtraIcons";
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
} from "@/components/icons/BixboExtraIcons";
import {
  useBixbo,
  getBixbo,
  EMPTY,
  todayKey,
  latestRecordedWeight,
  userAllergens,
  userGender,
  isPregnancyActive,
  isPostpartumActive,
  normalizeBixboBackup,
  replaceBixbo,
  createBixboSafetyBackup,
  getBixboSafetyBackup,
  type BixboData,
  type HealthProfile,
  type Doctor,
  type EmergencyContact,
} from "@/lib/storage";
import { mergeBixbo } from "@/lib/merge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { createCloudBackup } from "@/lib/cloudSync";
import { useI18n } from "@/hooks/useI18n";
import type { AppLanguage } from "@/lib/i18n";
import { isDeviceAdminEnabled } from "@/lib/deviceAdmin";

export function TrText({ value }: { value: unknown }) {
  const { t, language } = useI18n();
  const raw = String(value ?? "");
  const exact = t(raw);
  if (exact !== raw) return <>{exact}</>;
  if (language !== "sk") return <>{raw}</>;

  let out = raw;
  const exactSk: Record<string, string> = {
    Before: "Pred",
    During: "Počas",
    After: "Po",
    "Very-Heavy": "Veľmi silná",
    "Very heavy": "Veľmi silná",
    Heavy: "Silná",
    Medium: "Stredná",
    Light: "Slabá",
    Spotting: "Špinenie",
    "Overall improvement": "Celkové zlepšenie",
    "Overall worsening": "Celkové zhoršenie",
    "No clear change": "Bez jasnej zmeny",
    "High caffeine (≥200 mg)": "Vysoký príjem kofeínu (≥200 mg)",
    "Tetany episode": "Tetánická epizóda",
    "Hot flash": "Nával tepla",
    "Low energy": "Nízka energia",
    Headache: "Bolesť hlavy",
    "Daily adherence": "Denné dodržiavanie",
    doses: "dávok",
    "logged days": "zaznamenaných dní",
  };
  if (exactSk[out]) return <>{exactSk[out]}</>;

  out = out
    .replace(/^Panic attacks:/, "Panické záchvaty:")
    .replace(/^Medication adherence:/, "Dodržiavanie liekov:")
    .replace(/^Workouts:/, "Cvičenia:")
    .replace(/^Pain: improved/, "Bolesť: zlepšenie")
    .replace(/^Pain: worsened/, "Bolesť: zhoršenie")
    .replace(/^(\d+) logged days$/, "$1 zaznamenaných dní")
    .replace(/^Based on (\d+) logged days in (.+)$/i, "Na základe $1 zaznamenaných dní v $2")
    .replace(/^Based on (\d+) days before and (\d+) days after$/i, "Na základe $1 dní pred a $2 dní po")
    .replace(/^(\d+) before · (\d+) after$/, "$1 pred · $2 po")
    .replace(/^0× in this month$/, "0× v tomto mesiaci")
    .replace(/^(\d+)× in this month$/, "$1× v tomto mesiaci")
    .replace(/^The outcome was (.+) percentage points more common on days with this trigger\.$/, "Výsledok bol o $1 percentuálnych bodov častejší v dňoch s týmto spúšťačom.")
    .replace(/^Based on (\d+) days with and (\d+) days without the trigger\.$/, "Na základe $1 dní so spúšťačom a $2 dní bez spúšťača.")
    .replace(/^Correlations show associations in your logs\. They do not prove that one factor caused another\.$/, "Korelácie ukazujú súvislosti v tvojich záznamoch. Nedokazujú, že jeden faktor spôsobil druhý.")
    .replace(/^This shows an association in your logs, not proof that the selected trigger caused the outcome\.$/, "Toto ukazuje súvislosť v tvojich záznamoch, nie dôkaz, že vybraný spúšťač spôsobil výsledok.")
    .replace(/^Compare how often an outcome occurred on days with and without a possible trigger\.$/, "Porovnaj, ako často sa výsledok objavil v dňoch s možným spúšťačom a bez neho.")
    .replace(/^Automatically ranked associations calculated only from your own logs\.$/, "Automaticky zoradené súvislosti vypočítané iba z tvojich vlastných záznamov.");

  if (out.includes(" → ")) {
    const [a, b] = out.split(" → ");
    return <>{t(a)} → {t(b)}</>;
  }

  return <>{out}</>;
}

export function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <section className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-border/80">
      <p className="text-sm font-semibold">{t(title)}</p>
      {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{t(subtitle)}</p>}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-muted-foreground">
        {t(label)}
      </label>
      {children}
    </div>
  );
}

export function SelectField({
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
  const { t } = useI18n();
  return (
    <select
      id={id}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <option value="">{placeholder ? t(placeholder) : t("— Select —")}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {t(o.label)}
        </option>
      ))}
    </select>
  );
}

export function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const { t } = useI18n();
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
      {t(label)}
      <span
        className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${checked ? "bg-primary justify-end" : "bg-muted justify-start"} p-0.5`}
      >
        <span className="h-4 w-4 rounded-full bg-background shadow" />
      </span>
    </button>
  );
}

export function TagListField({
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
  const { t } = useI18n();
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
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{t(label)}</label>
      <div className="flex gap-2">
        <Input
          aria-label={`${t("Add")} ${t(label)}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={t(placeholder ?? "Type and press Add…")}
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
                aria-label={`${t("Remove")} ${v}`}
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

export function DoctorForm({
  title,
  value,
  onChange,
}: {
  title: string;
  value: Doctor | undefined;
  onChange: (next: Doctor) => void;
}) {
  const { t } = useI18n();
  const v = value ?? {};
  const set = (patch: Partial<Doctor>) => onChange({ ...v, ...patch });
  const idBase = title.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="mb-2 text-xs font-semibold text-foreground">{t(title)}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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

export function SummaryCard({
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
  const { t } = useI18n();
  return (
    <section className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-tint ring-1 ring-border/50">
          {icon}
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">{t(title)}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{t(subtitle)}</p>}
        </div>
      </div>

      <div className="mt-4">{children}</div>
    </section>
  );
}

export function SummaryStat({ icon, label, value }: { icon?: ReactNode; label: string; value: string }) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl bg-tint px-3 py-3 ring-1 ring-border/40">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        <span>{t(label)}</span>
      </div>
      <p className="mt-1 truncate text-sm font-semibold tabular-nums text-foreground"><TrText value={value || "—"} /></p>
    </div>
  );
}

export function SummaryChips({ values, emptyText = "Not added" }: { values: string[]; emptyText?: string }) {
  const { t } = useI18n();
  if (values.length === 0) {
    return <p className="text-sm text-muted-foreground">{t(emptyText)}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <span
          key={value}
          className="rounded-full bg-tint px-3 py-1.5 text-xs font-medium text-foreground ring-1 ring-border/50"
        ><TrText value={value} /></span>
      ))}
    </div>
  );
}

export function formatProfileDate(value?: string) {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(navigator.language?.startsWith("sk") ? "sk-SK" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ageFromBirthDate(birthDate?: string): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

export type HealthView =
  | "hub"
  | "summary"
  | "journey"
  | "achievements"
  | "statistics"
  | "export"
  | "appearance"
  | "privacy"
  | "backup"
  | "tracking"
  | "reminders"
  | "about";

export function HubRow({
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
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[68px] w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-tint ring-1 ring-border/50">
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{t(title)}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{t(subtitle)}</span>
      </span>

      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

export function HealthHub({
  onHome,
  onOpen,
  onNotifications,
  onAdmin,
}: {
  onHome: () => void;
  onOpen: (view: HealthView) => void;
  onNotifications: () => void;
  onAdmin?: () => void;
}) {
  const { t } = useI18n();

  return (
    <AppShell
      title={
        <button type="button" onClick={onHome} className="flex items-center gap-2">
          <ArrowLeft className="h-5 w-5" />
          {t("Health")}
        </button>
      }
    >
      <div className="space-y-5 px-5 pb-28 pt-4 lg:px-0 lg:pb-12">
        <div>
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t("Health & progress")}
          </p>

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
            subtitle="Export health data as JSON or CSV"
            onClick={() => onOpen("export")}
          />
          </section>
        </div>

        <div>
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t("Preferences & app")}
          </p>

          <section className="overflow-hidden rounded-3xl bg-surface shadow-sm ring-1 ring-border/80">
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
              title="Notifications"
              subtitle="All notification and reminder settings in one place"
              onClick={onNotifications}
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

export function HealthSubpage({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <AppShell
      title={
        <button type="button" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="h-5 w-5" />
          {t(title)}
        </button>
      }
    >
      <div className="space-y-4 px-5 pb-28 pt-4 lg:px-0 lg:pb-12">{children}</div>
    </AppShell>
  );
}

export function PreferenceOption({
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
  const { t } = useI18n();
  const content = (
    <>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-tint ring-1 ring-border/50">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{t(title)}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{t(subtitle)}</span>
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
