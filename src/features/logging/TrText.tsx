import { useI18n } from "@/hooks/useI18n";

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
