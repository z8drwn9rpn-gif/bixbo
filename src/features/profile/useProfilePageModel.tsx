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
import { accountAuth } from "@/integrations/auth/account";
import { createCloudBackup } from "@/lib/cloudSync";
import { useI18n } from "@/hooks/useI18n";
import type { AppLanguage } from "@/lib/i18n";
import { isDeviceAdminEnabled } from "@/lib/deviceAdmin";
import { TrText, Section, Field, SelectField, ToggleRow, TagListField, DoctorForm, SummaryCard, SummaryStat, SummaryChips, formatProfileDate, ageFromBirthDate, HubRow, HealthHub, HealthSubpage, PreferenceOption } from "./shared";
import type { HealthView } from "./shared";

export function useProfilePageModel() {
const navigate = useNavigate();

const { data, update, hydrated } = useBixbo();

const { language, setLanguage, t } = useI18n();

const view = hydrated ? data : EMPTY;

const profile: HealthProfile = view.profile ?? {};

const [editing, setEditing] = useState(false);

const [healthView, setHealthView] = useState<HealthView>("hub");

const [accountAuthBusy, setAccountAuthBusy] = useState<"google" | "apple" | null>(null);

const [accountAuthError, setAccountAuthError] = useState<string | null>(null);

const [deviceAdminEnabled] = useState(() => isDeviceAdminEnabled());

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

const syncingPrefsFromStoreRef = useRef(false);

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

    // Prevent the autosave effect below from writing stale local form values
    // back over a just-restored/cloud-synced settings snapshot.
    syncingPrefsFromStoreRef.current = true;

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
  }, [hydrated, prefsSignature, view.postpartum?.active, view.pregnancy?.active, view.settings.backup, view.settings.notif, view.settings.privacy, view.settings.tracking, view.settings.units]);

useEffect(() => {
    if (!prefsLoaded) return;
    if (syncingPrefsFromStoreRef.current) {
      syncingPrefsFromStoreRef.current = false;
      return;
    }

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

const startAccountOAuth = async (provider: "google" | "apple") => {
    setAccountAuthBusy(provider);
    setAccountAuthError(null);

    try {
      const result = await accountAuth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });

      if (result.error) throw result.error;
      if (result.redirected) return;
      setAccountAuthBusy(null);
    } catch (error) {
      setAccountAuthError(error instanceof Error ? error.message : String(error));
      setAccountAuthBusy(null);
    }
  };

const protectRestoreFromDeletedData = (candidate: BixboData): BixboData => {
    const current = getBixbo();

    // Build a deletion-only local shield. It contains no current health values,
    // only durable tombstones. Merging this shield over an old backup prevents
    // intentionally deleted entries/fields/options from being resurrected,
    // while still allowing the rest of the backup to restore normally.
    const deletionShield: BixboData = {
      ...EMPTY,
      deletedIds: [...(current.deletedIds ?? [])],
      deletedCustom: { ...(current.deletedCustom ?? {}) },
      syncMeta: {
        updatedAt: {},
        deletedAt: { ...(current.syncMeta?.deletedAt ?? {}) },
      },
    };

    return mergeBixbo(deletionShield, candidate, { legacyLocalCanonical: false });
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

return { navigate, data, update, hydrated, language, setLanguage, t, view, profile, editing, setEditing, healthView, setHealthView, accountAuthBusy, setAccountAuthBusy, accountAuthError, setAccountAuthError, deviceAdminEnabled, trackingPrefs, setTrackingPrefs, painScale, setPainScale, units, setUnits, privacyPrefs, setPrivacyPrefs, backupPrefs, setBackupPrefs, reminderPrefs, setReminderPrefs, prefsLoaded, setPrefsLoaded, syncingPrefsFromStoreRef, prefsSignature, patch, setTheme, setTextSize, exportJson, startAccountOAuth, protectRestoreFromDeletedData, age, currentWeight, gender, pregnancyActive, postpartumActive, allergens, bmi, setEmergency, setCurrentWeight, setGender, reproductiveStatus, setReproductiveStatus, doctors, activeMedications, medicalTags, allergyTags, postpartumStatus, postpartumToday, pregnancyLabel, allDayLogs, totalPainLogs, totalBowelLogs, totalSleepLogs, totalTetanyLogs, trackedDates, firstTrackedDate, trackingDays };
}

export type ProfilePageModel = ReturnType<typeof useProfilePageModel>;
