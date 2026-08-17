import { useEffect, useMemo } from "react";
import { MonthCalendar } from "@/components/MonthCalendar";
import { useI18n } from "@/hooks/useI18n";
import { toKey, type BixboData, type EventEntry } from "@/lib/storage";

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
    const onPointerUp = (nativeEvent: PointerEvent) => {
      const target = nativeEvent.target;
      if (!(target instanceof HTMLElement)) return;
      const dialog = target.closest<HTMLElement>('[role="dialog"]');
      if (!dialog || dialog.getAttribute("aria-label") !== t("Calendar events")) return;

      const row = target.closest<HTMLElement>("div.relative.grid");
      if (!row || !dialog.contains(row)) return;
      const rows = Array.from(dialog.querySelectorAll<HTMLElement>("div.relative.grid"))
        .filter((candidate) => candidate.children.length === 3);
      const index = rows.indexOf(row);
      const event = index >= 0 ? monthEvents[index] : undefined;
      if (!event) return;

      nativeEvent.preventDefault();
      onEditEvent(event);
      dialog.querySelector<HTMLButtonElement>(`button[aria-label="${CSS.escape(t("Close"))}"]`)?.click();
    };

    document.addEventListener("pointerup", onPointerUp, true);
    return () => document.removeEventListener("pointerup", onPointerUp, true);
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
