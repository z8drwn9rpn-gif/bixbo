import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pill, Bell, Download, Upload } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MonthCalendar, monthLabel } from "@/components/MonthCalendar";
import { LogSheet } from "@/components/LogSheet";
import { useBixbo, todayKey, EMPTY } from "@/lib/storage";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BIXBO — Health diary" },
      { name: "description", content: "Track your cycle, pain, meds and notes in one calm place." },
      { property: "og:title", content: "BIXBO — Health diary" },
      { property: "og:description", content: "Track your cycle, pain, meds and notes in one calm place." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data, update, replace, hydrated } = useBixbo();
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

  // Med notifications while the app is open
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | "unsupported">("default");
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) { setNotifPerm("unsupported"); return; }
    setNotifPerm(Notification.permission);
  }, []);
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const now = new Date();
    for (const m of meds) {
      if (m.asNeeded) continue;
      for (const t of m.times) {
        const [h, mi] = t.split(":").map(Number);
        const when = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, mi, 0);
        const delta = when.getTime() - now.getTime();
        if (delta > 0 && delta < 24 * 60 * 60 * 1000) {
          timers.push(setTimeout(() => {
            try { new Notification(`Time for ${m.name}`, { body: `${t}${m.dose ? ` · ${m.dose}` : ""}` }); } catch {}
          }, delta));
        }
      }
    }
    return () => timers.forEach(clearTimeout);
  }, [meds]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(view, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `bixbo-backup-${tKey}.json`; a.click();
    URL.revokeObjectURL(url);
  };
  const importJson = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      replace({ ...EMPTY, ...parsed });
    } catch {
      alert("Could not read that file.");
    }
  };

  const painCount = todayLog?.pain?.length ?? 0;
  const maxPain = todayLog?.pain?.reduce((m, p) => Math.max(m, p.score), 0);

  return (
    <AppShell title="BIXBO">
      <div className="px-5 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-xl">{monthLabel(month)}</h2>
          <div className="flex items-center gap-1">
            <button
              className="rounded-full p-2 hover:bg-tint"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              className="rounded-full p-2 hover:bg-tint"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <MonthCalendar month={month} data={view} />

      <div className="mt-6 space-y-4 px-5">
        <div className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Today</p>
              <p className="font-serif text-xl">
                {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            <Link to="/day/$date" params={{ date: tKey }}>
              <Button size="sm" variant="outline" className="rounded-full">Details</Button>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Pain" value={maxPain != null ? `${maxPain}/10` : "—"} sub={painCount > 1 ? `${painCount} logs` : undefined} />
            <Stat label="Period" value={todayLog?.period ? periodLabel(todayLog.period) : "—"} />
            <Stat label="Meds" value={`${takenCount}/${totalSlots}`} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-lg">💊</span>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Medications</p>
              <p className="text-sm">Manage your regimen</p>
            </div>
          </div>
          <Link to="/meds"><Button size="sm" variant="outline" className="rounded-full"><Pill className="h-3.5 w-3.5" /> Manage</Button></Link>
        </div>

        {notifPerm === "default" && (
          <button
            onClick={() => Notification.requestPermission().then(setNotifPerm)}
            className="flex w-full items-center gap-2 rounded-2xl bg-primary/10 p-3 text-left text-sm text-primary"
          >
            <Bell className="h-4 w-4" /> Turn on medication reminders
          </button>
        )}

        <div className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Backup</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Your data lives on this device only. Export a backup you can import on another device.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" onClick={exportJson}><Download className="h-3.5 w-3.5" /> Export</Button>
            <label className="inline-flex">
              <input
                type="file" accept="application/json" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.currentTarget.value = ""; }}
              />
              <span className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent">
                <Upload className="h-3.5 w-3.5" /> Import
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Floating "Log" button */}
      <div className="pointer-events-none fixed bottom-24 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 px-5">
        <div className="pointer-events-auto flex justify-end">
          <LogSheet date={tKey} data={view} update={update} />
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-tint px-2 py-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-lg leading-tight">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function periodLabel(p: string) {
  return { spotting: "Spot", light: "Light", medium: "Medium", heavy: "Heavy", veryheavy: "V. heavy" }[p] ?? "—";
}
