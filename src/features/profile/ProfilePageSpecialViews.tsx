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
import { TrText, Section, Field, SelectField, ToggleRow, TagListField, DoctorForm, SummaryCard, SummaryStat, SummaryChips, formatProfileDate, ageFromBirthDate, HubRow, HealthHub, HealthSubpage, PreferenceOption } from "./shared";
import type { HealthView } from "./shared";
import type { ProfilePageModel } from "./useProfilePageModel";
import { ProfilePageMainView } from "./ProfilePageMainView";
import { PrivacyLegalControls } from "./PrivacyLegalControls";
export function ProfilePageSpecialViews({ model }: { model: ProfilePageModel }) { const { navigate, data, update, hydrated, language, setLanguage, t, view, profile, editing, setEditing, healthView, setHealthView, accountAuthBusy, setAccountAuthBusy, accountAuthError, setAccountAuthError, deviceAdminEnabled, trackingPrefs, setTrackingPrefs, painScale, setPainScale, units, setUnits, privacyPrefs, setPrivacyPrefs, backupPrefs, setBackupPrefs, reminderPrefs, setReminderPrefs, prefsLoaded, setPrefsLoaded, syncingPrefsFromStoreRef, prefsSignature, patch, setTheme, setTextSize, exportJson, startAccountOAuth, protectRestoreFromDeletedData, age, currentWeight, gender, pregnancyActive, postpartumActive, allergens, bmi, setEmergency, setCurrentWeight, setGender, reproductiveStatus, setReproductiveStatus, doctors, activeMedications, medicalTags, allergyTags, postpartumStatus, postpartumToday, pregnancyLabel, allDayLogs, totalPainLogs, totalBowelLogs, totalSleepLogs, totalTetanyLogs, trackedDates, firstTrackedDate, trackingDays } = model;
if (healthView === "hub") {
    return (
      <HealthHub
        onHome={() => navigate({ to: "/" })}
        onOpen={(next) => {
          setEditing(false);
          setHealthView(next);
        }}
        onNotifications={() => navigate({ to: "/notifications" as never })}
        onAdmin={deviceAdminEnabled ? () => navigate({ to: "/admin" as never }) : undefined}
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
                <span className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-tint text-primary ring-1 ring-border/50">
                  {item.icon}
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t(item.date)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{t(item.title)}</p>
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
                <p className="mt-1 text-xs font-semibold text-foreground">{t(item.label)}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {unlocked ? t("Unlocked") : `${Math.max(0, item.goal - item.value)} ${t("to go")}`}
                </p>
              </article>
            );
          })}
        </div>
      </HealthSubpage>
    );
  }

if (healthView === "statistics") {
    const painScores = allDayLogs.flatMap((day) => (day?.pain ?? []).filter((entry) => entry.entryKind !== "symptom-update").map((entry) => entry.score));
    const averagePain = painScores.length
      ? painScores.reduce((sum, value) => sum + value, 0) / painScores.length
      : null;
    const sleepValues = allDayLogs.map((day) => day?.sleepHours).filter((value): value is number => value != null);
    const averageSleep = sleepValues.length
      ? sleepValues.reduce((sum, value) => sum + value, 0) / sleepValues.length
      : null;
    const stats = [
      ["Tracking for", trackingDays ? `${trackingDays} ${t("days")}` : "—"],
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
              <span className="text-sm text-foreground">{t(label)}</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-primary"><TrText value={value} /></span>
            </div>
          ))}
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
          <p className="text-sm font-semibold text-foreground">{t("Home greeting name")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("This name is shown under BIXBO in the Hi greeting on Home.")}</p>
          <Input
            className="mt-3 h-11"
            value={view.settings.userName ?? ""}
            onChange={(event) =>
              update((d) => ({
                ...d,
                settings: { ...d.settings, userName: event.target.value },
              }))
            }
            placeholder={t("Name")}
            aria-label={t("Home greeting name")}
          />
        </section>

        <section className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80">
          <p className="text-sm font-semibold text-foreground">{t("Theme")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("Choose how BIXBO looks on this device.")}</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {themes.map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => setTheme(theme)}
                className={`min-h-11 rounded-xl border px-3 text-sm font-semibold capitalize ${(view.settings.theme ?? "system") === theme ? "border-primary bg-primary text-primary-foreground" : "border-border bg-tint"}`}
              >
                {t(theme)}
              </button>
            ))}
          </div>
        </section>
        <section className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80">
          <p className="text-sm font-semibold text-foreground">{t("Text size")}</p>
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
                <span className="mt-1 block text-[10px] text-muted-foreground">{t(size.label)}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80">
          <p className="text-sm font-semibold text-foreground">{t("profile.language.appLanguage")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("profile.language.subtitle")}</p>
          <select
            className="mt-4 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
            value={language}
            onChange={(event) => setLanguage(event.target.value as AppLanguage)}
            aria-label={t("profile.language.appLanguage")}
          >
            <option value="en">{t("profile.language.english")}</option>
            <option value="sk">{t("profile.language.slovak")}</option>
          </select>
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
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void navigate({ to: "/auth", search: { next: "/profile", mode: "in" } })}
              className="min-h-12 rounded-xl border border-input bg-background px-4 text-sm font-semibold text-foreground"
            >
              {t("Sign in")}
            </button>
            <button
              type="button"
              onClick={() => void navigate({ to: "/auth", search: { next: "/profile", mode: "up" } })}
              className="min-h-12 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              {t("Create account")}
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <span>{t("or")}</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            onClick={() => void startAccountOAuth("google")}
            disabled={accountAuthBusy != null}
            className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-input bg-background px-4 text-sm font-semibold text-foreground disabled:opacity-60"
          >
            <span className="text-base font-bold">G</span>
            {accountAuthBusy === "google" ? t("Opening Google…") : t("Continue with Google")}
          </button>

          {accountAuthError && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive ring-1 ring-destructive/20">
              {accountAuthError}
            </p>
          )}
        </Section>

        <PrivacyLegalControls
          analytics={privacyPrefs.analytics}
          onAnalyticsChange={(analytics) => setPrivacyPrefs((current) => ({ ...current, analytics }))}
        />

      </HealthSubpage>
    );
  }

if (healthView === "backup") {
    const safetyBackup = getBixboSafetyBackup();

    const restoreSafetyBackup = () => {
      if (!safetyBackup) return;
      const confirmed = window.confirm(
        `Restore BIXBO safety copy from ${new Date(safetyBackup.createdAt).toLocaleString("en-GB")}? Your current state will first be preserved as another safety snapshot when possible.`,
      );
      if (!confirmed) return;

      createBixboSafetyBackup("before-safety-restore");
      const protectedRestore = protectRestoreFromDeletedData(safetyBackup.data);
      replaceBixbo(protectedRestore, "local");
      window.alert("BIXBO safety copy restored. Items you explicitly deleted later were kept deleted.");
    };

    const restoreBackup = async (file: File) => {
      try {
        const raw = await file.text();
        const parsed = JSON.parse(raw);
        const restored = normalizeBixboBackup(parsed);

        const confirmed = window.confirm(
          "Restore this BIXBO backup? BIXBO will first save a safety copy of your current data, then replace the local data with the selected backup."
        );
        if (!confirmed) return;

        createBixboSafetyBackup("before-manual-restore");
        try {
          await createCloudBackup(view);
        } catch (error) {
          console.warn("Pre-restore cloud backup unavailable; local safety backup is still kept.", error);
        }

        const protectedRestore = protectRestoreFromDeletedData(restored);
        replaceBixbo(protectedRestore, "local");
        window.alert("BIXBO backup restored successfully. Items you explicitly deleted later were kept deleted.");
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

        <Section
          title="Emergency safety copy"
          subtitle="BIXBO keeps a local recovery snapshot before migrations, restores and suspicious large data reductions when storage space allows."
        >
          {safetyBackup ? (
            <>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Available from {new Date(safetyBackup.createdAt).toLocaleString("en-GB")} · {safetyBackup.reason}
              </p>
              <button
                type="button"
                onClick={restoreSafetyBackup}
                className="min-h-11 w-full rounded-xl border border-input px-4 text-sm font-semibold"
              ><TrText value="Restore safety copy" /></button>
            </>
          ) : (
            <p className="text-xs leading-relaxed text-muted-foreground">{t("No local safety copy has been created yet.")}</p>
          )}
          <button
            type="button"
            onClick={() => {
              const ok = createBixboSafetyBackup("manual-safety-copy");
              window.alert(ok ? "Safety copy created." : "Safety copy could not be created (for example because local storage is full or the dataset is too large).");
            }}
            className="min-h-11 w-full rounded-xl border border-input px-4 text-sm font-semibold"
          ><TrText value="Create safety copy now" /></button>
        </Section>

        <Section title="Backup actions">
          <button
            type="button"
            onClick={runBackup}
            className="min-h-11 w-full rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
          ><TrText value="Back up now" /></button>

          <button
            type="button"
            onClick={exportJson}
            className="min-h-11 w-full rounded-xl border border-primary bg-primary/10 px-4 text-sm font-semibold text-primary"
          ><TrText value="Export complete JSON backup" /></button>

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
            <span className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-xl border border-input px-4 text-sm font-semibold"><TrText value="Restore backup" /></span>
          </label>

<Link
  to="/report"
  className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-input bg-primary/10 px-4 text-sm font-semibold text-primary"
>{t("PDF reports")}</Link>
        </Section>

        <Section
          title="Data & storage"
          subtitle="Manage the local copy of your BIXBO data from the same place as backup and sync."
        >
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("Export JSON downloads a complete copy of the data currently stored by BIXBO on this device.")}
          </p>
          <button
            type="button"
            onClick={exportJson}
            className="min-h-11 w-full rounded-xl border border-input px-4 text-sm font-semibold"
          ><TrText value="Download local data" /></button>
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
          <ToggleRow label="Tetany" checked={trackingPrefs.tetany} onChange={(value) => toggleTracking("tetany", value)} />
          <ToggleRow label="Panic attacks" checked={trackingPrefs.panic} onChange={(value) => toggleTracking("panic", value)} />
          <ToggleRow label="Bowel" checked={trackingPrefs.bowel} onChange={(value) => toggleTracking("bowel", value)} />
          <ToggleRow label="Cycle tracking" checked={trackingPrefs.cycle} onChange={(value) => toggleTracking("cycle", value)} />
        </Section>

        <Section title="Reproductive modes" subtitle="Pregnancy and postpartum cannot be active at the same time.">
          <ToggleRow label="Pregnancy mode" checked={pregnancyActive} onChange={(value) => toggleTracking("pregnancy", value)} />
          <ToggleRow label="Postpartum mode" checked={postpartumActive} onChange={(value) => toggleTracking("postpartum", value)} />
        </Section>

        <Section title="Default pain scale" subtitle="Choose whether pain can be logged in whole or half steps.">
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: "whole", label: "Whole numbers", detail: "0, 1, 2…" },
              { value: "half", label: "Half steps", detail: "0, 0.5, 1…" },
            ] as const).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPainScale(option.value)}
                className={`min-h-16 rounded-xl border p-3 text-left ${painScale === option.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-tint text-foreground"}`}
              >
                <span className="block text-sm font-semibold">{t(option.label)}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{option.detail}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Measurement units" subtitle="Choose how measurements are displayed across BIXBO.">
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">{t("Weight")}</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "kg", label: "Kilograms (kg)" },
                  { value: "lb", label: "Pounds (lb)" },
                ].map((option) => (
                  <button key={option.value} type="button" onClick={() => setUnits((current) => ({ ...current, weight: option.value as "kg" | "lb" }))} className={`min-h-12 rounded-xl border px-3 text-sm font-semibold ${units.weight === option.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-tint"}`}>{t(option.label)}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">{t("Temperature")}</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "c", label: "Celsius (°C)" },
                  { value: "f", label: "Fahrenheit (°F)" },
                ].map((option) => (
                  <button key={option.value} type="button" onClick={() => setUnits((current) => ({ ...current, temperature: option.value as "c" | "f" }))} className={`min-h-12 rounded-xl border px-3 text-sm font-semibold ${units.temperature === option.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-tint"}`}>{t(option.label)}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">{t("Volume")}</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "ml", label: "Millilitres (ml)" },
                  { value: "oz", label: "Fluid ounces (oz)" },
                ].map((option) => (
                  <button key={option.value} type="button" onClick={() => setUnits((current) => ({ ...current, volume: option.value as "ml" | "oz" }))} className={`min-h-12 rounded-xl border px-3 text-sm font-semibold ${units.volume === option.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-tint"}`}>{t(option.label)}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">{t("Time")}</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "24h", label: "24-hour" },
                  { value: "12h", label: "12-hour" },
                ].map((option) => (
                  <button key={option.value} type="button" onClick={() => setUnits((current) => ({ ...current, time: option.value as "24h" | "12h" }))} className={`min-h-12 rounded-xl border px-3 text-sm font-semibold ${units.time === option.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-tint"}`}>{t(option.label)}</button>
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
          <Link to="/meds" className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Manage medications & times</Link>
        </Section>
        <Section title="Notification controls">
          <Link to={"/notifications" as never} className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-input px-4 text-sm font-semibold">Open notification controls</Link>
        </Section>
        <Section title="Health reminders" subtitle="Choose which reminders BIXBO should show.">
          <ToggleRow label="Medication reminders" checked={reminderPrefs.medication} onChange={(value) => setReminder("medication", value)} />
          <ToggleRow label="Daily check-in" checked={reminderPrefs.dailyCheckIn} onChange={(value) => setReminder("dailyCheckIn", value)} />
          <ToggleRow label="Predicted period reminder" checked={reminderPrefs.periodPrediction} onChange={(value) => setReminder("periodPrediction", value)} />
          <ToggleRow label="Water reminder" checked={reminderPrefs.water} onChange={(value) => setReminder("water", value)} />
          <ToggleRow label="Sleep reminder" checked={reminderPrefs.sleep} onChange={(value) => setReminder("sleep", value)} />
          <ToggleRow label="Doctor appointment reminder" checked={reminderPrefs.doctorAppointments} onChange={(value) => setReminder("doctorAppointments", value)} />
        </Section>
        <Section title="Reminder timing">
          <Field label="Daily check-in time" htmlFor="reminder-daily-time"><Input id="reminder-daily-time" type="time" value={reminderPrefs.dailyTime} disabled={!reminderPrefs.dailyCheckIn} onChange={(event) => setReminder("dailyTime", event.target.value)} /></Field>
          <Field label="Water reminder interval" htmlFor="water-reminder-interval">
            <select id="water-reminder-interval" value={reminderPrefs.waterIntervalHours} disabled={!reminderPrefs.water} onChange={(event) => setReminder("waterIntervalHours", event.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50">
              <option value="1">{t("Every hour")}</option><option value="2">{t("Every 2 hours")}</option><option value="3">{t("Every 3 hours")}</option><option value="4">{t("Every 4 hours")}</option>
            </select>
          </Field>
        </Section>
        <Section title="Quiet hours" subtitle="Pause non-urgent reminders during this period.">
          <ToggleRow label="Enable quiet hours" checked={reminderPrefs.quietHours} onChange={(value) => setReminder("quietHours", value)} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="From" htmlFor="quiet-hours-start"><Input id="quiet-hours-start" type="time" value={reminderPrefs.quietStart} disabled={!reminderPrefs.quietHours} onChange={(event) => setReminder("quietStart", event.target.value)} /></Field>
            <Field label="To" htmlFor="quiet-hours-end"><Input id="quiet-hours-end" type="time" value={reminderPrefs.quietEnd} disabled={!reminderPrefs.quietHours} onChange={(event) => setReminder("quietEnd", event.target.value)} /></Field>
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
          <p className="mt-1 text-xs text-muted-foreground">{t("Health tracking application. Development build.")}</p>
        </section>
      </HealthSubpage>
    );
  }

if (healthView === "export") {
    const exportCsv = () => {
      const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
      const rows: string[][] = [["date", "pain_entries", "panic_episodes", "tetany_episodes", "bowel_entries", "sleep_hours", "temperature", "weight", "note"]];
      const dates = Array.from(new Set([...Object.keys(view.dayLogs), ...Object.keys(view.dayNotes)])).sort();
      dates.forEach((date) => {
        const day = view.dayLogs[date] ?? {};
        const notes = (view.dayNotes[date] ?? []).map((note) => typeof note === "string" ? note : note.text).join(" | ");
        rows.push([date,String(day.pain?.length ?? 0),String(day.panic?.length ?? 0),String(day.tetany?.length ?? 0),String(day.bowel?.length ?? 0),day.sleepHours == null ? "" : String(day.sleepHours),day.temperature == null ? "" : String(day.temperature),day.weight == null ? "" : String(day.weight),notes]);
      });
      const csv = rows.map((row) => row.map(escape).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `bixbo-health-${todayKey()}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    };

    return (
      <HealthSubpage title="Export" onBack={() => setHealthView("hub")}>
        <Section title="Health data export" subtitle="Download a portable copy without changing any saved data.">
          <button type="button" onClick={exportJson} className="min-h-11 w-full rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Export complete JSON backup</button>
          <button type="button" onClick={exportCsv} className="min-h-11 w-full rounded-xl border border-input bg-background px-4 text-sm font-semibold text-foreground">Export daily health CSV</button>
<Link to="/report" className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary/10 px-4 text-sm font-semibold text-primary ring-1 ring-primary/20">{t("PDF Reports")}</Link>
        </Section>
      </HealthSubpage>
    );
  }
return <ProfilePageMainView model={model} />;
}
