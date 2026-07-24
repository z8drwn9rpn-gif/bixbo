import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MonthCalendar, monthLabel } from "@/components/MonthCalendar";
import { useBixbo, EMPTY } from "@/lib/storage";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Kalendár — BIXBO" },
      { name: "description", content: "Mesačný kalendár tvojich symptómov a poznámok." },
      { property: "og:title", content: "Kalendár — BIXBO" },
      { property: "og:description", content: "Mesačný kalendár tvojich symptómov a poznámok." },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const { data, hydrated } = useBixbo();
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  return (
    <AppShell title="Kalendár">
      <div className="px-5 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-xl">{monthLabel(month)}</h2>
          <div className="flex items-center gap-1">
            <button className="rounded-full p-2 hover:bg-tint" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Predchádzajúci">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="rounded-full p-2 hover:bg-tint" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Nasledujúci">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      <MonthCalendar month={month} data={hydrated ? data : EMPTY} />

      <div className="mt-6 px-5">
        <Legend />
      </div>
    </AppShell>
  );
}

function Legend() {
  const items: [string, string][] = [
    ["Špinenie", "var(--period-spotting)"],
    ["Slabá", "var(--period-light)"],
    ["Stredná", "var(--period-medium)"],
    ["Silná", "var(--period-heavy)"],
    ["Veľmi silná", "var(--period-veryheavy)"],
  ];
  const pain: [string, string][] = [
    ["Bolesť 1–3", "var(--pain-low)"],
    ["Bolesť 4–6", "var(--pain-mid)"],
    ["Bolesť 7–10", "var(--pain-high)"],
  ];
  return (
    <div className="rounded-3xl bg-surface p-4 ring-1 ring-border">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">Legenda</p>
      <div className="mt-3 flex flex-wrap gap-3">
        {items.map(([l, c]) => (
          <div key={l} className="flex items-center gap-1.5 text-xs">
            <span className="inline-block h-4 w-4 rounded-full" style={{ background: c }} />{l}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-3">
        {pain.map(([l, c]) => (
          <div key={l} className="flex items-center gap-1.5 text-xs">
            <span className="inline-block h-4 w-4 rounded-full" style={{ boxShadow: `inset 0 0 0 2.5px ${c}` }} />{l}
          </div>
        ))}
      </div>
    </div>
  );
}
