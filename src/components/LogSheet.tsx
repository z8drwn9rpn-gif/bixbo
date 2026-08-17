import { useEffect, useState, type ComponentProps } from "react";

import { LogSheet as LogSheetRoot } from "@/features/logging/LogSheetRoot";
import { PastDaySleepSheet } from "@/components/PastDaySleepSheet";

type LogSheetProps = ComponentProps<typeof LogSheetRoot>;

export function LogSheet(props: LogSheetProps) {
  const [targetDate, setTargetDate] = useState(props.date);

  // Every fresh open starts on the date selected in the calendar. The user can
  // then override it explicitly inside the logger, which makes backfilling any
  // category independent from iOS calendar-selection quirks.
  useEffect(() => {
    if (props.open) setTargetDate(props.date);
  }, [props.date, props.open]);

  // Sleep keeps its dedicated date-bound editor because it also handles stale
  // iOS/PWA draft state. It already exposes its own explicit date field.
  if (props.initial === "temp") {
    return (
      <PastDaySleepSheet
        key={`sleep:${props.date}:${props.open ? "open" : "closed"}`}
        open={props.open}
        onOpenChange={props.onOpenChange}
        date={props.date}
        data={props.data}
        update={props.update}
      />
    );
  }

  const formKey = `${targetDate}:${props.initial ?? "menu"}:${props.open ? "open" : "closed"}`;

  return (
    <>
      <LogSheetRoot key={formKey} {...props} date={targetDate} />
      {props.open ? (
        <div className="fixed left-1/2 top-[calc(env(safe-area-inset-top)+68px)] z-[260] -translate-x-1/2 rounded-2xl border border-border/70 bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
          <label className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground">
            <span className="whitespace-nowrap">Log date</span>
            <input
              type="date"
              value={targetDate}
              onChange={(event) => {
                if (event.target.value) setTargetDate(event.target.value);
              }}
              className="h-9 rounded-xl border border-border bg-surface px-2 text-xs font-semibold text-foreground"
              aria-label="Log date"
            />
          </label>
        </div>
      ) : null}
    </>
  );
}
