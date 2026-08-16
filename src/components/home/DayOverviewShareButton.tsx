import { Share2 } from "@/components/icons/BixboExtraIcons";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";
import { asArr, fromKey, PAIN_DESCRIPTIONS, type BixboData } from "@/lib/storage";

export const stripEmoji = (value: string) =>
  value.replace(/^(?:\p{Extended_Pictographic}|\u200d|\ufe0f|\p{Emoji_Modifier})+\s*/u, "").trim();

export function ShareDayButton({ date, view }: { date: string; view: BixboData }) {
  const { t, language } = useI18n();
  const flowLabel = (level?: string | null): string => {
    switch (level) {
      case "spotting":
        return t("Spotting");
      case "light":
        return t("Light");
      case "medium":
        return t("Medium");
      case "heavy":
        return t("Heavy");
      case "very-heavy":
        return t("Very heavy");
      default:
        return "";
    }
  };

  const share = async () => {
    const log = view.dayLogs[date] ?? {};
    const dateLabel = fromKey(date).toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const lines: string[] = [`BIXBO — ${dateLabel}`, ""];

    if (log.pain?.length) {
      const avg = log.pain.reduce((sum, entry) => sum + entry.score, 0) / log.pain.length;
      lines.push(
        `${t("Pain")} — ${t("avg")} ${avg.toFixed(1)}/10 · ${log.pain.length} ${log.pain.length === 1 ? t("entry") : t("entries")}`,
      );
      for (const entry of log.pain) {
        const bits = [`${entry.time}`, `${entry.score}/10 (${t(PAIN_DESCRIPTIONS[Math.round(entry.score)])})`];
        if (entry.parts.length) bits.push(entry.parts.join(", "));
        if (entry.quality.length) bits.push(`[${entry.quality.map(t).join(", ")}]`);
        lines.push(`  • ${bits.join(" · ")}`);
        if (entry.note) lines.push(`    "${entry.note}"`);
      }
      lines.push("");
    }
    if (log.panic?.length) {
      lines.push(`${t("Panic episode")} — ${log.panic.length}`);
      for (const entry of log.panic)
        lines.push(
          `  • ${entry.time} · ${entry.intensity}/10 · ${entry.minutes == null ? t("ongoing") : `${entry.minutes}min`}${entry.trigger ? ` — ${entry.trigger}` : ""}`,
        );
      lines.push("");
    }
    if (log.tetany?.length) {
      lines.push(`${t("Tetany episode")} — ${log.tetany.length}`);
      for (const entry of log.tetany)
        lines.push(
          `  • ${entry.time} · ${entry.types.map(t).join(", ")} · ${entry.intensity}/5 · ${entry.minutes == null ? t("ongoing") : `${entry.minutes}min`}`,
        );
      lines.push("");
    }
    if (log.periodInfo?.level || log.period)
      lines.push(`${t("Period")}: ${flowLabel(log.periodInfo?.level ?? log.period!)}`);
    if (log.sleepHours != null)
      lines.push(`${t("Sleep")}: ${log.sleepHours}h ${asArr(log.sleepQuality).map(stripEmoji).join(", ")}`);
    if (log.temperature != null) lines.push(`${t("Temperature")}: ${log.temperature}°C`);
    if (log.weight != null) lines.push(`${t("Weight")}: ${log.weight}kg`);
    if (log.food?.length) lines.push(`${t("Food")}: ${log.food.length} ${t("entries")}`);
    if (log.workout?.length)
      lines.push(`${t("Workout")}: ${log.workout.map((entry) => `${stripEmoji(entry.kind)} ${entry.minutes}min`).join(", ")}`);

    lines.push("", "— sent from BIXBO");
    const text = lines.join("\n");
    if (navigator.share) {
      try {
        await navigator.share({ title: `${t("How I feel")} · ${dateLabel}`, text });
        return;
      } catch {
        // Share cancellation/failure falls back to clipboard below.
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      alert(t("Copied to clipboard"));
    } catch {
      alert(text);
    }
  };

  return (
    <Button size="sm" variant="outline" className="rounded-full" onClick={share}>
      <Share2 className="h-3.5 w-3.5" /> {t("Share day")}
    </Button>
  );
}
