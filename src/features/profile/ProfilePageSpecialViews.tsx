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
          <p className="text-sm font-semibold text-foreground">BIXBO</p>
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
          <button
            type="button"
            onClick={() => void startAccountOAuth("google")}
            disabled={accountAuthBusy != null}
            className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-input bg-background px-4 text-sm font-semibold text-foreground disabled:opacity-60"
          >
            <span className="text-base font-bold">G</span>
            {accountAuthBusy === "google" ? t("Opening Google…") : t("Continue with Google")}
          </button>

          <button
            type="button"
            onClick={() => {
              void (async () => {
                setAccountAuthError(null);
                const { error } = await supabase.auth.signOut();
                if (error) {
                  setAccountAuthError(error.message);
                  return;
                }
                window.alert(t("Signed out successfully."));
              })();
            }}
            disabled={accountAuthBusy != null}
            className="flex min-h-12 w-full items-center justify-center rounded-xl border border-destructive/40 bg-destructive/10 px-4 text-sm font-semibold text-destructive disabled:opacity-60"
          >
            {t("Log out")}
          </button>

          {accountAuthError && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive ring-1 ring-destructive/20">
              {accountAuthError}
            </p>
          )}

          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("Sign-in opens the configured OAuth provider directly. If a provider is not enabled in Supabase, BIXBO will show the provider error here.")}
          </p>
        </Section>

        <PrivacyLegalControls
          analytics={privacyPrefs.analytics}
          onAnalyticsChange={(analytics) => setPrivacyPrefs((current) => ({ ...current, analytics }))}
        />

      </HealthSubpage>
    );
  }

return <ProfilePageMainView model={model} />;
}
