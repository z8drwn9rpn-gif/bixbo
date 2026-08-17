import { useEffect, useState, type ComponentProps } from "react";

import { LogSheet as LogSheetRoot } from "@/features/logging/LogSheetRoot";
import { PastDaySleepSheet } from "@/components/PastDaySleepSheet";

type LogSheetProps = ComponentProps<typeof LogSheetRoot>;

export function LogSheet(props: LogSheetProps) {
  const [targetDate, setTargetDate] = useState(props.date);
  const [formActive, setFormActive] = useState(Boolean(props.initial));
  const [formTitle, setFormTitle] = useState("");

  useEffect(() => {
    if (props.open) setTargetDate(props.date);
  }, [props.date, props.open]);

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

  const formKey = `${props.initial ?? "menu"}:${props.open ? "open" : "closed"}`;
  const normalizedTitle = formTitle.toLowerCase();

  // Calendar forms already have their own From/To or date field. A second
  // global picker would be redundant and can cover their tabs, so omit it.
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
        <div
          data-bixbo-log-date-control
          className="pointer-events-auto fixed left-1/2 top-[calc(env(safe-area-inset-top)+78px)] z-[260] -translate-x-1/2"
        >
          <label className="block leading-none">
            <span className="sr-only">Log date</span>
            <input
              type="date"
              value={targetDate}
              onChange={(event) => {
                if (event.target.value) setTargetDate(event.target.value);
              }}
              className="h-6 w-[82px] rounded-md border border-border/75 bg-background px-0.5 text-center text-[8px] font-bold leading-none text-foreground shadow-none"
              aria-label="Log date"
            />
          </label>
        </div>
      ) : null}
    </>
  );
}
