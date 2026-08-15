import { useEffect, useMemo } from "react";
import { useBixbo } from "@/lib/storage";
import { normalizeLanguage, translate, type AppLanguage } from "@/lib/i18n";

/**
 * Repetitive helper/subtitle copy intentionally hidden from the visible UI.
 *
 * Keep real data, field labels, empty/error states, safety/legal copy and
 * action labels intact. This list is only for text that repeats what the
 * surrounding title, control or visual already communicates.
 */
const HIDDEN_HELPER_COPY = new Set([
  // Tap / interaction instructions.
  "Tap to edit",
  "Tap to close",
  "Tap any pain bar to see the exact value.",
  "Tap a bar to see its value.",
  "Tap a bar to see its value. Solid bars are yours; striped bars belong to",
  "Tap a point or bar to see the exact saved entry.",
  "Choose a metric, then tap a coloured day for its saved average/details.",
  "Tap to mark taken",
  "tap to mark taken",
  "tap to uncheck",
  "Tap to set your due date",
  "Tap the",
  "button below.",

  // Profile / hub subtitles that repeat the destination title.
  "Your health profile, journey, milestones and app preferences.",
  "Conditions, medications and your complete health profile",
  "A timeline of important health events",
  "Tracking milestones and streaks",
  "Your personal tracking numbers",
  "Export health data as JSON or CSV",
  "Privacy and data control",
  "Backup, restore, export and local data",
  "Tracking categories, pain scale and measurement units",
  "Medication schedule, reminders and notification settings",
  "Version, information and legal",
  "Your main profile details",
  "Important sensitivities",
  "Reproductive health",
  "Pregnancy, postpartum and hormonal status",
  "Daily health goals and habits",
  "Basic information about you.",
  "Diagnoses, conditions and history.",
  "Reproductive and hormonal status.",
  "Habits that affect your health.",
  "In case of emergency — contact and care team.",
  "Medication schedules are managed from the Medications page.",
  "This name is shown under BIXBO in the Hi greeting on Home.",
  "Choose how BIXBO looks on this device.",
  "profile.language.subtitle",

  // Settings subtitles whose heading/control is already self-explanatory.
  "Manage the local copy of your BIXBO data from the same place as backup and sync.",
  "Choose which categories you want available in BIXBO.",
  "Choose whether pain can be logged in whole or half steps.",
  "Choose how measurements are displayed across BIXBO.",
  "Choose which reminders BIXBO should show.",
  "Pause non-urgent reminders during this period.",
  "Download a portable copy without changing any saved data.",

  // Notification page copy that just repeats the control/card title.
  "Pick exactly what you want to hear about.",
  "When the daily nudges are sent.",
  "Local and server-originated tests are separate.",
  "When BIXBO is open, local reminder checks can also appear as a soft in-app message.",

  // Couple subtitles / legends that duplicate the visual encoding.
  "Only the explicitly shared categories for the selected month.",
  "Based only on shared pain, panic and tetany data during the selected month.",
  "Days when both of you logged pain, panic or tetany.",
  "Solid bars are yours. Striped bars belong to your partner.",
]);

/** UI brand naming only. Internal storage/domain keys stay `period` for compatibility. */
const BLUEBERRY_UI_NAMES: Record<string, string> = {
  Period: "Blueberry",
  period: "blueberry",
  "Period log": "Blueberry",
  "period log": "blueberry",
  "Period flow": "Blueberry flow",
  "period flow": "blueberry flow",
  "Period & cycle": "Blueberry & cycle",
  "period & cycle": "blueberry & cycle",
  "Period / cycle": "Blueberry / cycle",
  "period / cycle": "blueberry / cycle",
};

function blueberryUiName(key: string): string | null {
  if (BLUEBERRY_UI_NAMES[key]) return BLUEBERRY_UI_NAMES[key];
  // Catch visible compound labels such as "Log period", "Next period" or
  // Quick Tag builder copy without touching internal data keys.
  if (/\bPeriod\b/.test(key)) return key.replace(/\bPeriod\b/g, "Blueberry");
  if (/\bperiod\b/.test(key)) return key.replace(/\bperiod\b/g, "blueberry");
  return null;
}

export function useI18n() {
  const { data, hydrated, update } = useBixbo();
  const language: AppLanguage = normalizeLanguage(data.settings.language);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = language;
  }, [language]);

  const t = useMemo(
    () => (key: string) => {
      if (HIDDEN_HELPER_COPY.has(key)) return "";
      const blueberryName = blueberryUiName(key);
      if (blueberryName) return blueberryName;
      if (key === "missed (tap if taken)") return language === "sk" ? "vynechané" : "missed";
      if (key === "Hidden — tap to restore:") return language === "sk" ? "Skryté:" : "Hidden:";
      if (key === "No medications yet. Tap Add." || key === 'No medications yet. Tap "Add".') {
        return language === "sk" ? "Zatiaľ nemáš žiadne lieky." : "No medications yet.";
      }
      if (key === "Daily average pain. Tap a bar to see its value. Solid bars are yours; striped bars belong to Partner.") {
        return language === "sk" ? "Denný priemer bolesti." : "Daily average pain.";
      }
      return translate(language, key);
    },
    [language],
  );

  const setLanguage = (next: AppLanguage) => {
    if (!hydrated || next === language) return;
    update((current) => ({
      ...current,
      settings: {
        ...current.settings,
        language: next,
      },
    }));
  };

  return { language, setLanguage, t, hydrated };
}
