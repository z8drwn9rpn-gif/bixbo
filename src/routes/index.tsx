import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MonthCalendar, monthLabel } from "@/components/MonthCalendar";
import { useBixbo, todayKey, EMPTY } from "@/lib/storage";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BIXBO — Denník zdravia" },
      { name: "description", content: "BIXBO — sledovanie menštruácie, bolesti, liekov a poznámok v jednom mieste." },
      { property: "og:title", content: "BIXBO — Denník zdravia" },
      { property: "og:description", content: "Sledovanie menštruácie, bolesti, liekov a poznámok v jednom mieste." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data, hydrated } = useBixbo();
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  const view = hydrated ? data : EMPTY;
  const tKey = todayKey();
  const todayLog = view.dayLogs[tKey];
  const meds = view.meds;
  const takenToday = view.medLog[tKey] ?? {};
  const totalSlots = useMemo(
    () => meds.reduce((n, m) => n + (m.asNeeded ? 0 : m.times.length), 0),
    [meds],
  );
  const takenCount = useMemo(
    () => meds.reduce((n, m) => n + (m.asNeeded ? 0 : m.times.filter((t) => takenToday[`${m.id}@${t}`]).length), 0),
    [meds, takenToday],
  );

  return (
    <AppShell title="BIXBO">
      <div className="px-5 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-xl">{monthLabel(month)}</h2>
          <div className="flex items-center gap-1">
            <button
              className="rounded-full p-2 hover:bg-tint"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              aria-label="Predchádzajúci mesiac"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              className="rounded-full p-2 hover:bg-tint"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              aria-label="Nasledujúci mesiac"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <MonthCalendar month={month} data={view} />

      <div className="mt-6 px-5">
        <div className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Dnes</p>
              <p className="font-serif text-xl">
                {new Date().toLocaleDateString("sk-SK", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            <Link to="/day/$date" params={{ date: tKey }}>
              <Button size="sm" className="rounded-full">
                <Plus className="h-4 w-4" /> Zapísať
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Bolesť" value={todayLog?.pain != null ? `${todayLog.pain}/10` : "—"} />
            <Stat label="Perióda" value={todayLog?.period ? periodLabel(todayLog.period) : "—"} />
            <Stat label="Teplota" value={todayLog?.temperature != null ? `${todayLog.temperature}°` : "—"} />
          </div>
        </div>

        <Link to="/meds" className="mt-4 block">
          <div className="flex items-center justify-between rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Lieky dnes</p>
              <p className="font-serif text-lg">{takenCount} / {totalSlots}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary grid place-items-center">
              💊
            </div>
          </div>
        </Link>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-tint px-2 py-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-lg">{value}</p>
    </div>
  );
}

function periodLabel(p: string) {
  return { spotting: "Špinenie", light: "Slabá", medium: "Stredná", heavy: "Silná", veryheavy: "V. silná" }[p] ?? "—";
}
