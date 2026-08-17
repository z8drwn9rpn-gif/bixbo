import { useEffect, useState, type ComponentProps } from "react";

import { LogSheet as LogSheetRoot } from "@/features/logging/LogSheetRoot";
import { PastDaySleepSheet } from "@/components/PastDaySleepSheet";

type LogSheetProps = ComponentProps<typeof LogSheetRoot>;

export function LogSheet(props: LogSheetProps) {
  const [targetDate, setTargetDate] = useState(props.date);
  const [formActive, setFormActive] = useState(Boolean(props.initial));

  // Every fresh open starts on the date selected in the calendar. The user can
  // then override it explicitly inside a concrete logger, which makes
  // backfilling independent from iOS calendar-selection quirks.
  useEffect(() => {
    if (props.open) setTargetDate(props.date);
  }, [props.date, props.open]);

  // The main Log button opens the category menu first, so props.initial is null.
  // Watch the actual log surface instead: the date control appears only after a
  // concrete category is opened, and disappears again when returning to menu.
  useEffect(() => {
    if (!props.open) {
      setFormActive(false);
      return;
    }

    const sync = () => {
      setFormActive(Boolean(props.initial) || Boolean(document.querySelector("[data-bixbo-log-surface]")));
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [props.initial, props.open]);

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

  // Do not remount the entire LogSheet when only the log date changes. A full
  // remount would throw the user back to the category menu. All active forms
  // receive the new date prop immediately and save against that date.
  const formKey = `${props.initial ?? "menu"}:${props.open ? "open" : "closed"}`;
  const showDateControl = props.open && formActive;

  return (
    <>
      <LogSheetRoot key={formKey} {...props} date={targetDate} />
      {showDateControl ? (
        <div className="fixed left-1/2 top-[calc(env(safe-area-inset-top)+71px)] z-[260] -translate-x-1/2 rounded-xl border border-border/70 bg-background/95 px-2 py-1 shadow-sm backdrop-blur">
          <label className="flex items-center gap-1.5 text-[9px] font-bold leading-none text-muted-foreground">
            <span className="whitespace-nowrap">Date</span>
            <input
              type="date"
              value={targetDate}
              onChange={(event) => {
                if (event.target.value) setTargetDate(event.target.value);
              }}
              className="h-7 w-[112px] rounded-lg border border-border bg-surface px-1.5 text-[10px] font-semibold text-foreground"
              aria-label="Log date"
            />
          </label>
        </div>
      ) : null}
    </>
  );
}
