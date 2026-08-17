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

  // Event / To do / Note already expose their own date controls. Never render a
  // second global backfill date picker on those screens.
  const hasOwnCalendarDate =
    props.initial === "event" ||
    props.initial === "task" ||
    props.initial === "note" ||
    normalizedTitle === "note & plan";

  const showDateControl = props.open && formActive && !hasOwnCalendarDate;

  // Keep the picker inside the narrow action strip and away from each form's
  // own Back/Save/Next/progress controls. Pain needs a slight left bias because
  // its progress bar occupies the left side; Meds stays exactly centered.
  const placement = normalizedTitle === "pain"
    ? "left-[44%]"
    : "left-1/2";

  return (
    <>
      <LogSheetRoot key={formKey} {...props} date={targetDate} />
      {showDateControl ? (
        <div
          data-bixbo-log-date-control
          className={`fixed ${placement} top-[calc(env(safe-area-inset-top)+76px)] z-[260] -translate-x-1/2`}
        >
          <label className="block leading-none">
            <span className="sr-only">Log date</span>
            <input
              type="date"
              value={targetDate}
              onChange={(event) => {
                if (event.target.value) setTargetDate(event.target.value);
              }}
              className="h-[26px] w-[94px] rounded-lg border border-border/80 bg-background px-1 text-center text-[9px] font-bold leading-none text-foreground shadow-sm"
              aria-label="Log date"
            />
          </label>
        </div>
      ) : null}
    </>
  );
}
