import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { createPortal } from "react-dom";

import { LogSheet as LogSheetRoot } from "@/features/logging/LogSheetRoot";
import { PastDaySleepSheet } from "@/components/PastDaySleepSheet";

type LogSheetProps = ComponentProps<typeof LogSheetRoot>;

export function LogSheet(props: LogSheetProps) {
  const [targetDate, setTargetDate] = useState(props.date);
  const [formActive, setFormActive] = useState(Boolean(props.initial));
  const [formTitle, setFormTitle] = useState("");
  const [formSurface, setFormSurface] = useState<HTMLElement | null>(null);
  const [dialogHost, setDialogHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (props.open) setTargetDate(props.date);
  }, [props.date, props.open]);

  useEffect(() => {
    if (!props.open) {
      setFormActive(false);
      setFormTitle("");
      setFormSurface(null);
      setDialogHost(null);
      return;
    }

    const sync = () => {
      const surface = document.querySelector<HTMLElement>("[data-bixbo-log-surface]");
      const dialog = surface?.closest<HTMLElement>("[role='dialog']") ?? null;
      setFormActive(Boolean(props.initial) || Boolean(surface));
      setFormSurface(surface);
      setDialogHost(dialog);
      const title = dialog?.querySelector("h2")?.textContent?.trim() ?? "";
      setFormTitle(title);
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [props.initial, props.open]);

  const formKey = `${props.initial ?? "menu"}:${props.open ? "open" : "closed"}`;
  const normalizedTitle = formTitle.toLowerCase();
  const hasOwnCalendarDate =
    props.initial === "event" ||
    props.initial === "task" ||
    props.initial === "note" ||
    normalizedTitle === "note & plan";
  const showDateControl = props.open && formActive && !hasOwnCalendarDate && Boolean(dialogHost);

  useEffect(() => {
    if (!formSurface) return;
    formSurface.style.paddingTop = showDateControl ? "36px" : "";
    return () => {
      formSurface.style.paddingTop = "";
    };
  }, [formSurface, showDateControl]);

  const dateLabel = useMemo(() => {
    const [year, month, day] = targetDate.split("-").map(Number);
    if (!year || !month || !day) return targetDate;
    try {
      return new Intl.DateTimeFormat(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(year, month - 1, day, 12, 0, 0));
    } catch {
      return targetDate;
    }
  }, [targetDate]);

  const dateControl = showDateControl && dialogHost ? createPortal(
    <div
      data-bixbo-log-date-control
      className="fixed left-0 right-0 top-[calc(env(safe-area-inset-top)+56px)] z-[260] flex h-9 items-center justify-center border-b border-border/60 bg-background/98"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <label className="relative flex h-7 min-w-[118px] items-center justify-center rounded-lg border border-border/80 bg-surface px-3 text-[11px] font-bold text-foreground shadow-sm">
        <span className="pointer-events-none whitespace-nowrap">{dateLabel}</span>
        <input
          type="date"
          value={targetDate}
          onChange={(event) => {
            if (event.target.value) setTargetDate(event.target.value);
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label="Log date"
        />
      </label>
    </div>,
    dialogHost,
  ) : null;

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

  return (
    <>
      <LogSheetRoot key={formKey} {...props} date={targetDate} />
      {dateControl}
    </>
  );
}
