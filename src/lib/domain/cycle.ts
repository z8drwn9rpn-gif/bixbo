/** Cycle-domain primitives that do not depend on persisted storage. */
export type PeriodLevel = "" | "spotting" | "light" | "medium" | "heavy" | "very-heavy";

export function periodLabel(level?: PeriodLevel | null): string {
  switch (level) {
    case "spotting": return "Spotting";
    case "light": return "Light";
    case "medium": return "Medium";
    case "heavy": return "Heavy";
    case "very-heavy": return "Very heavy";
    default: return "";
  }
}
