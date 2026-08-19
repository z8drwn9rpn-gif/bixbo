import { useEffect, useMemo } from "react";
import { MonthCalendar } from "@/components/MonthCalendar";
import { useI18n } from "@/hooks/useI18n";
import { toKey, type BixboData, type EventEntry } from "@/lib/storage";

const EVENT_ROW_ATTR = "data-bixbo-calendar-event-row";

export function EditableMonthCalendar({
  month,
  data,
  selected,
  onSelect,
  onSwipeMonth,
  onEditEvent,
}: {
  month: Date;
  data: BixboData;
  selected: string;
  onSelect: (key: string) => void;
  onSwipeMonth?: (delta: -1 | 1) => void;
  onEditEvent: (event: EventEntry) => void;
}) {
  const { t } = useI18n();
  const monthStart = toKey(new Date(month.getFullYear(), month.getMonth(), 1));
  const monthEnd = toKey(new Date(month.getFullYear(), month.getMonth() + 1, 0));
  const monthEvents = useMemo(
    () => data.events
      .filter((event) => event.startDate <= monthEnd && event.endDate >= monthStart)
      .slice()
      .sort((a, b) => a.startDate.localeCompare(b.startDate) || (a.time ?? "").localeCompare(b.time ?? "") || a.title.localeCompare(b.title)),
    [data.events, monthEnd, monthStart],
  );

  useEffect(() => {
    const calendarEventDialog = (): HTMLElement | null =>
      Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]'))
        .find((dialog) => dialog.getAttribute("aria-label") === t("Calendar events")) ?? null;

    const rowsForDialog = (dialog: HTMLElement): HTMLElement[] =>
      Array.from(dialog.querySelectorAll<HTMLElement>("div.relative.grid"))
        .filter((candidate) => candidate.children.length === 3);

    const eventForRow = (row: HTMLElement, dialog: HTMLElement): EventEntry | undefined => {
      const rows = rowsForDialog(dialog);
      const index = rows.indexOf(row);
      return index >= 0 ? monthEvents[index] : undefined;
    };

    const openEventRow = (row: HTMLElement, dialog: HTMLElement): boolean => {
      const event = eventForRow(row, dialog);
      if (!event) return false;
      onEditEvent(event);
      dialog.querySelector<HTMLButtonElement>(`button[aria-label="${CSS.escape(t("Close"))}"]`)?.click();
      return true;
    };

    const decorateRows = () => {
      const dialog = calendarEventDialog();
      if (!dialog) return;
      rowsForDialog(dialog).forEach((row, index) => {
        const event = monthEvents[index];
        if (!event) return;
        row.setAttribute(EVENT_ROW_ATTR, "true");
        row.setAttribute("role", "button");
        row.setAttribute("tabindex", "0");
        row.setAttribute("aria-label", `${t("Edit")} ${event.title}`);
      });
    };

    const onPointerUp = (nativeEvent: PointerEvent) => {
      const target = nativeEvent.target;
      if (!(target instanceof HTMLElement)) return;
      const dialog = target.closest<HTMLElement>('[role="dialog"]');
      if (!dialog || dialog.getAttribute("aria-label") !== t("Calendar events")) return;

      const row = target.closest<HTMLElement>(`[${EVENT_ROW_ATTR}="true"], div.relative.grid`);
      if (!row || !dialog.contains(row)) return;
      if (!openEventRow(row, dialog)) return;

      nativeEvent.preventDefault();
    };

    const onKeyDown = (nativeEvent: KeyboardEvent) => {
      if (nativeEvent.key !== "Enter" && nativeEvent.key !== " ") return;
      const target = nativeEvent.target;
      if (!(target instanceof HTMLElement)) return;
      const row = target.closest<HTMLElement>(`[${EVENT_ROW_ATTR}="true"]`);
      if (!row) return;
      const dialog = row.closest<HTMLElement>('[role="dialog"]');
      if (!dialog || dialog.getAttribute("aria-label") !== t("Calendar events")) return;
      if (!openEventRow(row, dialog)) return;

      nativeEvent.preventDefault();
      nativeEvent.stopPropagation();
    };

    // The Calendar Events dialog is portal-owned inside MonthCalendar. Decorate
    // rows when that portal appears without observing text/keystroke mutations.
    const observer = new MutationObserver(decorateRows);
    observer.observe(document.body, { childList: true, subtree: true });
    decorateRows();

    document.addEventListener("pointerup", onPointerUp, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      observer.disconnect();
      document.removeEventListener("pointerup", onPointerUp, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [monthEvents, onEditEvent, t]);

  return (
    <MonthCalendar
      month={month}
      data={data}
      selected={selected}
      onSelect={onSelect}
      onSwipeMonth={onSwipeMonth}
    />
  );
}
