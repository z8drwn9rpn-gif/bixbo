import { useEffect, useState, type ComponentProps } from "react";

import { LogSheet as LogSheetRoot } from "@/features/logging/LogSheetRoot";
import { PastDaySleepSheet } from "@/components/PastDaySleepSheet";

type LogSheetProps = ComponentProps<typeof LogSheetRoot>;

export function LogSheet(props: LogSheetProps) {
  const [targetDate, setTargetDate] = useState(props.date);
  const [formActive, setFormActive] = useState(Boolean(props.initial));
  const [formTitle, setFormTitle] = useState("");

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
      setFormTitle("");
      return;
    }

    const sync = () => {
      const surface = document.querySelector<HTMLElement>("[data-bixbo-log-surface]");
      setFormActive(Boolean(props.initial) || Boolean(surface));

      const dialog = surface?.closest<HTMLElement>("[role='dialog']");
      const title = dialog?.querySelector("h2")?.textContent?.trim() ?? "";
      setFormTitle(title);
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
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
  const normalizedTitle = formTitle.toLowerCase();
  const hasOwnCalendarDate =
    props.initial === "event" ||
    props.initial === "task" ||
    props.initial === "note" ||
    normalizedTitle === "note & plan";
  const showDateControl = props.open && formActive && !hasOwnCalendarDate;

  return (
    <>
      <LogSheetRoot key={formKey} {...props} date={targetDate} />
      {showDateControl ? (
        <div className="fixed left-1/2 top-[calc(env(safe-area-inset-top)+72px)] z-[260] -translate-x-1/2 rounded-lg border border-border/70 bg-background/95 p-0.5 shadow-sm backdrop-blur">
          <label className="block leading-none">
            <span className="sr-only">Log date</span>
            <input
              type="date"
              value={targetDate}
              onChange={(event) => {
                if (event.target.value) setTargetDate(event.target.value);
              }}
              className="h-6 w-[96px] rounded-md border border-border bg-surface px-1 text-center text-[9px] font-semibold leading-none text-foreground"
              aria-label="Log date"
            />
          </label>
        </div>
      ) : null}
    </>
  );
}
