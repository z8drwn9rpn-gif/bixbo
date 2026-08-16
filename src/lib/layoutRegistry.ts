import type { BixboData } from "./storage";

export type LayoutPageId =
  | "home"
  | "insights"
  | "patterns.cycle"
  | "patterns.monthly"
  | "patterns.treatment"
  | "patterns.triggers"
  | "couple.overview"
  | "couple.compare"
  | "couple.health";

export interface LayoutSectionDefinition {
  id: string;
  label: string;
  order: number;
}

export const BIXBO_LAYOUT_SECTIONS: Record<LayoutPageId, LayoutSectionDefinition[]> = {
  home: [
    { id: "calendar", label: "Calendar", order: 10 },
    { id: "birthControl", label: "Birth control", order: 20 },
    { id: "pregnancy", label: "Pregnancy", order: 30 },
    { id: "postpartum", label: "Postpartum", order: 40 },
    { id: "nextPeriod", label: "Next period", order: 50 },
    { id: "vitals", label: "Vitals", order: 60 },
    { id: "quickLog", label: "Quick Log", order: 70 },
  ],
  insights: [
    { id: "heatmap", label: "Heatmap", order: 10 },
    { id: "pain", label: "Pain scale", order: 20 },
    { id: "hotFlashes", label: "Hot flashes", order: 30 },
    { id: "bowel", label: "Bowel", order: 40 },
    { id: "timeOfDay", label: "Pattern of day", order: 50 },
    { id: "meds", label: "Medication adherence", order: 60 },
  ],
  "patterns.cycle": [
    { id: "painFlow", label: "Pain & flow", order: 10 },
    { id: "bodyChanges", label: "Body changes", order: 20 },
    { id: "customMetrics", label: "Custom metrics", order: 30 },
  ],
  "patterns.monthly": [
    { id: "glance", label: "This month at a glance", order: 10 },
    { id: "panicTetany", label: "Panic & tetany", order: 20 },
    { id: "symptoms", label: "Symptoms", order: 30 },
    { id: "lifestyle", label: "Lifestyle & routines", order: 40 },
    { id: "hormones", label: "Hormones", order: 50 },
    { id: "customMetrics", label: "Custom metrics", order: 60 },
  ],
  "patterns.treatment": [
    { id: "comparison", label: "Treatment comparison", order: 10 },
    { id: "customMetrics", label: "Custom metrics", order: 20 },
    { id: "history", label: "Treatment history", order: 30 },
  ],
  "patterns.triggers": [{ id: "correlations", label: "Smart correlations", order: 10 }],
  "couple.overview": [
    { id: "similarity", label: "Health similarity", order: 10 },
    { id: "stats", label: "Health summary", order: 20 },
    { id: "blueberry", label: "Partner's cycle calendar", order: 30 },
  ],
  "couple.compare": [
    { id: "painChart", label: "Pain comparison", order: 10 },
    { id: "healthComparison", label: "Health comparison", order: 20 },
  ],
  "couple.health": [
    { id: "partnerDetails", label: "Partner shared details", order: 10 },
    { id: "myDetails", label: "My shared details", order: 20 },
  ],
};

export function layoutOrder(
  data: Pick<BixboData, "settings">,
  page: LayoutPageId,
  sectionId: string,
  fallback = 999,
): number {
  void data;
  return BIXBO_LAYOUT_SECTIONS[page]?.find((section) => section.id === sectionId)?.order ?? fallback;
}

export function orderedLayoutSections(data: Pick<BixboData, "settings">, page: LayoutPageId) {
  void data;
  return [...(BIXBO_LAYOUT_SECTIONS[page] ?? [])].sort((a, b) => a.order - b.order);
}
