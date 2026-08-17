import { LogSheet } from "@/components/LogSheet";
import type { BixboData } from "@/lib/storage";

type UpdateFn = (updater: (data: BixboData) => BixboData) => void;

export type QuickVitalMetric = "sleep" | "temperature" | "weight";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metric: QuickVitalMetric;
  date: string;
  data: BixboData;
  update: UpdateFn;
};

/**
 * Home keeps one lightweight entry point for the three vital tiles, but all of
 * them intentionally open the canonical Body & Recovery logger. This avoids a
 * second, competing Sleep/Temp/Weight editor with different fields and save
 * semantics.
 */
export function QuickVitalSheet({ open, onOpenChange, date, data, update }: Props) {
  return (
    <LogSheet
      open={open}
      onOpenChange={onOpenChange}
      date={date}
      data={data}
      update={update}
      initial="temp"
    />
  );
}
