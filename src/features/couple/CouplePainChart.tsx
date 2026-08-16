import type { PainEntry } from "@/lib/storage";
import type { CouplePeriod } from "./coupleUtils";

type CouplePainChartProps = {
  days: string[];
  mine: Record<string, { pain?: PainEntry[] }>;
  theirs: Record<string, { pain?: PainEntry[] }>;
  partnerName: string;
  periodLabel: string;
  period: CouplePeriod;
};

export function CouplePainChart(props: CouplePainChartProps) {
  void props;
  return null;
}
