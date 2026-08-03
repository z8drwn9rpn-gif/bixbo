import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Ico } from "@/components/icons/BixboIcons";
import {
  useBixbo, EMPTY, addDays, toKey, fromKey, todayKey, painColor, avgDayPain,
  type DayLog, type LabResult, type DocEntry, type Diagnosis, type Med,
} from "@/lib/storage";
import {
  avg, thisAndLastMonthPrefixes, daysOfMonth, historicCycles, phaseDays,
  phaseAvg, phaseFlowMode, negativeMoodCount, dayEnergy, dayHotFlash,
  dayBowelSymptoms, dayTetanyIntensity, dayPanicIntensity, dayHeadacheIntensity,
} from "@/lib/patterns";

export const Route = createFileRoute("/patterns")({
  head: () => ({
    meta: [
      { title: "Health of Bixbo — Patterns" },
      { name: "description", content: "Compare cycle phases, months, treatments and triggers to spot your patterns." },
      { property: "og:title", content: "Health of Bixbo — Patterns" },
      { property: "og:description", content: "Cycle, monthly, treatment, couple and trigger comparisons." },
    ],
  }),
  component: PatternsPage,
});

/* ------------------------------------------------------------ shared bits */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-surface p-5 ring-1 ring-border">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
      {children}
    </section>
  );
}

function Empty() {
  return <p className="mt-2 text-sm text-muted-foreground">Not enough data yet</p>;
}

function ThreeBarChart({ bars, max = 10, unit = "" }: {
  bars: { label: string; value: number | null; sub?: string }[]; max?: number; unit?: string;
}) {
  const hasData = bars.some((b) => b.value != null);
  if (!hasData) return <Empty />;
  return (
    <div className="mt-4 grid grid-cols-3 gap-3">
      {bars.map((b) => (
        <div key={b.label} className="flex flex-col items-center gap-1">
          <span className="text-sm font-semibold tabular-nums">{b.value != null ? b.value.toFixed(1) : "–"}{unit}</span>
          <div className="flex h-24 w-full items-end justify-center">
            <div className="w-8 rounded-t bg-primary"
              style={{ height: b.value != null ? `${Math.max(6, (Math.min(b.value, max) / max) * 100)}%` : "2%", opacity: b.value != null ? 1 : 0.2 }} />
          </div>
          <span className="text-[11px] text-center text-muted-foreground">{b.label}</span>
          {b.sub && <span className="text-[10px] text-muted-foreground">{b.sub}</span>}
        </div>
      ))}
    </div>
  );
}

function TwoPointLine({ prev, curr, decimals = 1, higherIsWorse = true, unit = "" }: {
  prev: number | null; curr: number | null; decimals?: number; higherIsWorse?: boolean; unit?: string;
}) {
  if (prev == null && curr == null) return <Empty />;
  const p = prev ?? curr ?? 0;
  const c = curr ?? prev ?? 0;
  const max = Math.max(p, c, 0.001);
  const min = Math.min(p, c, 0);
  const span = Math.max(0.001, max - min);
  const yFor = (v: number) => 50 - ((v - min) / span) * 40 - 5;
  const delta = curr != null && prev != null ? curr - prev : null;
  const improved = delta == null ? null : (higherIsWorse ? delta < 0 : delta > 0);
  const trendColor = improved == null ? "var(--muted-foreground)" : improved ? "#22c55e" : delta === 0 ? "var(--muted-foreground)" : "#ef4444";
  return (
    <div className="mt-2 flex items-center gap-3">
      <svg viewBox="0 0 120 60" className="h-14 w-28 shrink-0">
        <line x1="20" y1={yFor(p)} x2="100" y2={yFor(c)} stroke={trendColor} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="20" cy={yFor(p)} r="4" fill="var(--muted-foreground)" />
        <circle cx="100" cy={yFor(c)} r="4" fill={trendColor} />
      </svg>
      <div className="text-xs">
        <p className="text-muted-foreground">Last month: <span className="font-medium text-foreground">{prev != null ? prev.toFixed(decimals) : "–"}{unit}</span></p>
        <p className="text-muted-foreground">This month: <span className="font-medium text-foreground">{curr != null ? curr.toFixed(decimals) : "–"}{unit}</span></p>
        {delta != null && (
          <p className="mt-0.5 font-medium" style={{ color: trendColor }}>
            {delta === 0 ? "— unchanged" : improved ? "▼ improved" : "▲ worsened"} ({delta > 0 ? "+" : ""}{delta.toFixed(decimals)}{unit})
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ page */

function PatternsPage() {
  const { data, update, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const dayLogs = view.dayLogs;

  const cycles = useMemo(() => historicCycles(view), [view]);
  const buckets = useMemo(() => phaseDays(cycles), [cycles]);

  /* ---- 1) Cycle phase: pain & flow ---- */
  const painBars = [
    { label: "Before", value: phaseAvg(buckets.before, dayLogs, (l) => avgDayPain(l) ?? null) },
    { label: "During", value: phaseAvg(buckets.during, dayLogs, (l) => avgDayPain(l) ?? null) },
    { label: "After", value: phaseAvg(buckets.after, dayLogs, (l) => avgDayPain(l) ?? null) },
  ];
  const flowMode = phaseFlowMode(buckets.during, dayLogs);

  /* ---- 2 & 3) Monthly comparisons ---- */
  const [curPrefix, lastPrefix] = thisAndLastMonthPrefixes();
  const curDays = daysOfMonth(curPrefix).filter((k) => k <= todayKey());
  const lastDays = daysOfMonth(lastPrefix);

  function countAndAvg(days: string[], countFn: (l: DayLog) => number, intensityFn: (l: DayLog) => number | null) {
    let count = 0; const intensities: number[] = [];
    days.forEach((k) => {
      const l = dayLogs[k]; if (!l) return;
      count += countFn(l);
      const i = intensityFn(l); if (i != null) intensities.push(i);
    });
    return { count, intensity: avg(intensities) };
  }

  const panicCur = countAndAvg(curDays, (l) => l.panic?.length ?? 0, dayPanicIntensity);
  const panicLast = countAndAvg(lastDays, (l) => l.panic?.length ?? 0, dayPanicIntensity);
  const tetanyCur = countAndAvg(curDays, (l) => l.tetany?.length ?? 0, dayTetanyIntensity);
  const tetanyLast = countAndAvg(lastDays, (l) => l.tetany?.length ?? 0, dayTetanyIntensity);

  const hfCur = countAndAvg(curDays, (l) => (l.pain ?? []).filter((p) => p.hotFlashesOn).length, dayHotFlash);
  const hfLast = countAndAvg(lastDays, (l) => (l.pain ?? []).filter((p) => p.hotFlashesOn).length, dayHotFlash);
  const hAcheCur = countAndAvg(curDays, (l) => (l.pain ?? []).filter((p) => p.headache).length, dayHeadacheIntensity);
  const hAcheLast = countAndAvg(lastDays, (l) => (l.pain ?? []).filter((p) => p.headache).length, dayHeadacheIntensity);

  const sleepAvg = (days: string[]) => avg(days.map((k) => dayLogs[k]?.sleepHours).filter((v): v is number => v != null));
  const weightAvg = (days: string[]) => avg(days.map((k) => dayLogs[k]?.weight).filter((v): v is number => v != null));

  const medAdherence = (days: string[]) => {
    const scheduled = view.meds.filter((m) => !m.asNeeded);
    let expected = 0, taken = 0;
    days.forEach((k) => scheduled.forEach((m) => m.times.forEach((t) => {
      expected++; if (view.medLog[k]?.[`${m.id}@${t}`]) taken++;
    })));
    return expected ? (taken / expected) * 100 : null;
  };

  const workoutStats = (days: string[]) => {
    let count = 0, minutes = 0;
    days.forEach((k) => (dayLogs[k]?.workout ?? []).forEach((w) => { count++; minutes += w.minutes || 0; }));
    return { count, minutes };
  };
  const workoutCur = workoutStats(curDays), workoutLast = workoutStats(lastDays);

  const pcosFreq = (days: string[]) => days.reduce((s, k) => s + (dayLogs[k]?.pain ?? []).reduce((n, p) => n + (p.pcosSymptoms?.length ?? 0), 0), 0);
  const histamineFreq = (days: string[]) => days.reduce((s, k) => s + (dayLogs[k]?.food ?? []).filter((f) => f.histamineFlare).length, 0);

  /* ---- 4) Cycle phase: other ---- */
  const moodBars = [
    { label: "Before", value: phaseAvg(buckets.before, dayLogs, negativeMoodCount) },
    { label: "During", value: phaseAvg(buckets.during, dayLogs, negativeMoodCount) },
    { label: "After", value: phaseAvg(buckets.after, dayLogs, negativeMoodCount) },
  ];
  const energyBars = [
    { label: "Before", value: phaseAvg(buckets.before, dayLogs, dayEnergy) },
    { label: "During", value: phaseAvg(buckets.during, dayLogs, dayEnergy) },
    { label: "After", value: phaseAvg(buckets.after, dayLogs, dayEnergy) },
  ];
  const hfPhaseBars = [
    { label: "Before", value: phaseAvg(buckets.before, dayLogs, dayHotFlash) },
    { label: "During", value: phaseAvg(buckets.during, dayLogs, dayHotFlash) },
    { label: "After", value: phaseAvg(buckets.after, dayLogs, dayHotFlash) },
  ];
  const bowelBars = [
    { label: "Before", value: phaseAvg(buckets.before, dayLogs, dayBowelSymptoms) },
    { label: "During", value: phaseAvg(buckets.during, dayLogs, dayBowelSymptoms) },
    { label: "After", value: phaseAvg(buckets.after, dayLogs, dayBowelSymptoms) },
  ];

  /* ---- 5) Treatment comparison ---- */
  const [treatDate, setTreatDate] = useState("");
  const treatWindow = (before: boolean) => {
    if (!treatDate) return [] as string[];
    const days: string[] = [];
    for (let i = 1; i <= 28; i++) days.push(before ? addDays(treatDate, -i) : addDays(treatDate, i - 1));
    return days;
  };
  const beforeDays = treatWindow(true), afterDays = treatWindow(false);
  const treatMetric = (fn: (l: DayLog) => number | null) => ({
    before: avg(beforeDays.map((k) => fn(dayLogs[k] ?? {})).filter((v): v is number => v != null)),
    after: avg(afterDays.map((k) => fn(dayLogs[k] ?? {})).filter((v): v is number => v != null)),
  });
  const tPain = treatMetric((l) => avgDayPain(l) ?? null);
  const tTetany = treatMetric(dayTetanyIntensity);
  const tPanic = treatMetric(dayPanicIntensity);
  const tMood = treatMetric((l) => negativeMoodCount(l));

  /* ---- 6) Couple comparison ---- */
  const partner = view.partner;
  const coupleDays = useMemo(() => {
    const days: string[] = []; const end = new Date();
    for (let i = 29; i >= 0; i--) { const d = new Date(end); d.setDate(end.getDate() - i); days.push(toKey(d)); }
    return days;
  }, []);
  const youTetanyCount = coupleDays.reduce((s, k) => s + (dayLogs[k]?.tetany?.length ?? 0), 0);
  const youPanicCount = coupleDays.reduce((s, k) => s + (dayLogs[k]?.panic?.length ?? 0), 0);
  const partnerTetanyCount = partner ? coupleDays.reduce((s, k) => s + (partner.dayLogs[k]?.tetany?.length ?? 0), 0) : 0;
  const partnerPanicCount = partner ? coupleDays.reduce((s, k) => s + (partner.dayLogs[k]?.panic?.length ?? 0), 0) : 0;

  /* ---- 7) Trigger comparison ---- */
  const A_OPTIONS = [
    { id: "highCaffeine", label: "High caffeine (≥200mg)" },
    { id: "alcohol", label: "Alcohol" },
    { id: "workout", label: "Workout" },
    { id: "highHistamine", label: "High-histamine food" },
    { id: "poorSleep", label: "Poor sleep (<6h)" },
    ...view.custom.foodQuickAdd.map((f) => ({ id: `food:${f}`, label: `Ate "${f}"` })),
  ];
  const B_OPTIONS = [
    { id: "tetany", label: "Tetany episode" },
    { id: "panic", label: "Panic attack" },
    { id: "pain", label: "Pain ≥5" },
    { id: "hotflash", label: "Hot flash" },
    { id: "headache", label: "Headache" },
  ];
  const [triggerA, setTriggerA] = useState(A_OPTIONS[0]?.id ?? "");
  const [triggerB, setTriggerB] = useState(B_OPTIONS[0]?.id ?? "");

  const hasA = (l: DayLog | undefined, a: string): boolean => {
    if (!l) return false;
    if (a === "highCaffeine") return (l.food ?? []).some((f) => (f.caffeineMg ?? 0) >= 200);
    if (a === "alcohol") return (l.food ?? []).some((f) => (f.alcoholDrinks ?? 0) > 0);
    if (a === "workout") return (l.workout?.length ?? 0) > 0;
    if (a === "highHistamine") return (l.food ?? []).some((f) => f.highHistamine);
    if (a === "poorSleep") return l.sleepHours != null && l.sleepHours < 6;
    if (a.startsWith("food:")) return (l.food ?? []).some((f) => f.what === a.slice(5));
    return false;
  };
  const hasB = (l: DayLog | undefined, b: string): boolean => {
    if (!l) return false;
    if (b === "tetany") return (l.tetany?.length ?? 0) > 0;
    if (b === "panic") return (l.panic?.length ?? 0) > 0;
    if (b === "pain") return (avgDayPain(l) ?? 0) >= 5;
    if (b === "hotflash") return (l.pain ?? []).some((p) => p.hotFlashesOn);
    if (b === "headache") return (l.pain ?? []).some((p) => p.headache);
    return false;
  };
  const allDayKeys = useMemo(() => Object.keys(dayLogs), [dayLogs]);
  const withA = allDayKeys.filter((k) => hasA(dayLogs[k], triggerA));
  const withoutA = allDayKeys.filter((k) => !hasA(dayLogs[k], triggerA));
  const pctWith = withA.length ? (withA.filter((k) => hasB(dayLogs[k], triggerB)).length / withA.length) * 100 : null;
  const pctWithout = withoutA.length ? (withoutA.filter((k) => hasB(dayLogs[k], triggerB)).length / withoutA.length) * 100 : null;
  const aLabel = A_OPTIONS.find((o) => o.id === triggerA)?.label ?? triggerA;
  const bLabel = B_OPTIONS.find((o) => o.id === triggerB)?.label ?? triggerB;

  const saveTrigger = () => update((d) => ({
    ...d,
    settings: {
      ...d.settings,
      savedTriggers: [...(d.settings.savedTriggers ?? []), { id: `${Date.now()}`, a: triggerA, b: triggerB }],
    },
  }));
  const removeTrigger = (id: string) => update((d) => ({
    ...d, settings: { ...d.settings, savedTriggers: (d.settings.savedTriggers ?? []).filter((t) => t.id !== id) },
  }));

  /* ---- 8) Labs / docs / diagnoses ---- */
  const [labForm, setLabForm] = useState({ test: "", value: "", unit: "", refLow: "", refHigh: "", date: todayKey() });
  const addLab = () => {
    if (!labForm.test || !labForm.value) return;
    const entry: LabResult = {
      id: `${Date.now()}`, test: labForm.test, value: Number(labForm.value), unit: labForm.unit || undefined,
      refLow: labForm.refLow ? Number(labForm.refLow) : undefined,
      refHigh: labForm.refHigh ? Number(labForm.refHigh) : undefined,
      date: labForm.date,
    };
    update((d) => ({
      ...d,
      labs: [...(d.labs ?? []), entry],
      custom: { ...d.custom, labTests: Array.from(new Set([...(d.custom.labTests ?? []), entry.test])) },
    }));
    setLabForm({ test: "", value: "", unit: "", refLow: "", refHigh: "", date: todayKey() });
  };
  const removeLab = (id: string) => update((d) => ({ ...d, labs: (d.labs ?? []).filter((l) => l.id !== id) }));

  const labsByTest = useMemo(() => {
    const map = new Map<string, LabResult[]>();
    (view.labs ?? []).forEach((l) => {
      const arr = map.get(l.test) ?? []; arr.push(l); map.set(l.test, arr);
    });
    map.forEach((arr) => arr.sort((a, b) => a.date.localeCompare(b.date)));
    return map;
  }, [view.labs]);

  const [docForm, setDocForm] = useState({ name: "", date: todayKey(), labId: "" });
  const [docWarn, setDocWarn] = useState("");
  const [docDataUrl, setDocDataUrl] = useState<{ url: string; mime: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const onDocFile = (file: File) => {
    if (file.size > 1.5 * 1024 * 1024) setDocWarn("This file is larger than 1.5 MB — it may slow down sync.");
    else setDocWarn("");
    const reader = new FileReader();
    reader.onload = () => setDocDataUrl({ url: String(reader.result), mime: file.type });
    reader.readAsDataURL(file);
  };
  const addDoc = () => {
    if (!docForm.name || !docDataUrl) return;
    const entry: DocEntry = {
      id: `${Date.now()}`, name: docForm.name, date: docForm.date, mime: docDataUrl.mime,
      dataUrl: docDataUrl.url, labId: docForm.labId || undefined,
    };
    update((d) => ({ ...d, docs: [...(d.docs ?? []), entry] }));
    setDocForm({ name: "", date: todayKey(), labId: "" });
    setDocDataUrl(null); setDocWarn("");
    if (fileRef.current) fileRef.current.value = "";
  };
  const removeDoc = (id: string) => update((d) => ({ ...d, docs: (d.docs ?? []).filter((x) => x.id !== id) }));
  const sortedDocs = useMemo(() => [...(view.docs ?? [])].sort((a, b) => b.date.localeCompare(a.date)), [view.docs]);

  const [diagForm, setDiagForm] = useState<{ id?: string; name: string; date: string; doctor: string; note: string; docId: string }>(
    { name: "", date: "", doctor: "", note: "", docId: "" },
  );
  const saveDiag = () => {
    if (!diagForm.name) return;
    const entry: Diagnosis = {
      id: diagForm.id ?? `${Date.now()}`, name: diagForm.name, date: diagForm.date || undefined,
      doctor: diagForm.doctor || undefined, note: diagForm.note || undefined, docId: diagForm.docId || undefined,
    };
    update((d) => ({
      ...d,
      diagnoses: diagForm.id
        ? (d.diagnoses ?? []).map((x) => x.id === diagForm.id ? entry : x)
        : [...(d.diagnoses ?? []), entry],
    }));
    setDiagForm({ name: "", date: "", doctor: "", note: "", docId: "" });
  };
  const editDiag = (dg: Diagnosis) => setDiagForm({ id: dg.id, name: dg.name, date: dg.date ?? "", doctor: dg.doctor ?? "", note: dg.note ?? "", docId: dg.docId ?? "" });
  const removeDiag = (id: string) => update((d) => ({ ...d, diagnoses: (d.diagnoses ?? []).filter((x) => x.id !== id) }));

  const inRange = (l: LabResult) => (l.refLow == null || l.value >= l.refLow) && (l.refHigh == null || l.value <= l.refHigh);

  return (
    <AppShell title="Patterns">
      <div className="px-5 pt-2 pb-24 space-y-4">

        <Card title="Cycle phase — pain & flow">
          <ThreeBarChart bars={painBars} unit="/10" />
          {cycles.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Based on {cycles.length} historic cycle{cycles.length === 1 ? "" : "s"}. Most common flow during period: {flowMode ? flowMode : "—"}
            </p>
          )}
        </Card>

        <Card title="Monthly comparison — panic & tetany">
          <p className="mt-2 text-xs text-muted-foreground">Panic attacks</p>
          <TwoPointLine prev={panicLast.count} curr={panicCur.count} decimals={0} unit=" count" />
          <p className="mt-3 text-xs text-muted-foreground">Panic intensity (avg)</p>
          <TwoPointLine prev={panicLast.intensity} curr={panicCur.intensity} unit="/10" />
          <p className="mt-3 text-xs text-muted-foreground">Tetany episodes</p>
          <TwoPointLine prev={tetanyLast.count} curr={tetanyCur.count} decimals={0} unit=" count" />
          <p className="mt-3 text-xs text-muted-foreground">Tetany intensity (avg)</p>
          <TwoPointLine prev={tetanyLast.intensity} curr={tetanyCur.intensity} unit="/5" />
        </Card>

        <Card title="Monthly comparison — other">
          <div className="mt-3 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Hot flashes (count / intensity)</p>
              <TwoPointLine prev={hfLast.count} curr={hfCur.count} decimals={0} />
              <TwoPointLine prev={hfLast.intensity} curr={hfCur.intensity} unit="/5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Headaches (count / intensity)</p>
              <TwoPointLine prev={hAcheLast.count} curr={hAcheCur.count} decimals={0} />
              <TwoPointLine prev={hAcheLast.intensity} curr={hAcheCur.intensity} unit="/10" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sleep (avg hours)</p>
              <TwoPointLine prev={sleepAvg(lastDays)} curr={sleepAvg(curDays)} higherIsWorse={false} unit="h" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Weight</p>
              <TwoPointLine prev={weightAvg(lastDays)} curr={weightAvg(curDays)} higherIsWorse={false} unit="kg" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Med adherence</p>
              <TwoPointLine prev={medAdherence(lastDays)} curr={medAdherence(curDays)} decimals={0} higherIsWorse={false} unit="%" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Workout (count / minutes)</p>
              <TwoPointLine prev={workoutLast.count} curr={workoutCur.count} decimals={0} higherIsWorse={false} />
              <TwoPointLine prev={workoutLast.minutes} curr={workoutCur.minutes} decimals={0} higherIsWorse={false} unit="min" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">PCOS symptoms (frequency)</p>
              <TwoPointLine prev={pcosFreq(lastDays)} curr={pcosFreq(curDays)} decimals={0} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Histamine flares</p>
              <TwoPointLine prev={histamineFreq(lastDays)} curr={histamineFreq(curDays)} decimals={0} />
            </div>
          </div>
        </Card>

        <Card title="Cycle phase — other">
          <div className="mt-2 space-y-4">
            <div>
              <p className="text-[11px] text-muted-foreground">Mood (negative tags/day)</p>
              <ThreeBarChart bars={moodBars} max={3} />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Energy (body battery)</p>
              <ThreeBarChart bars={energyBars} max={5} unit="/5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Hot flashes</p>
              <ThreeBarChart bars={hfPhaseBars} max={5} unit="/5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Bowel symptoms</p>
              <ThreeBarChart bars={bowelBars} max={3} />
            </div>
          </div>
        </Card>

        <Card title="Treatment comparison">
          <label className="mt-2 block text-xs text-muted-foreground">
            Treatment start date {view.meds.length > 0 && <span className="text-[10px]">(meds: {view.meds.map((m: Med) => m.name).join(", ")})</span>}
          </label>
          <input type="date" value={treatDate} onChange={(e) => setTreatDate(e.target.value)}
            className="mt-1 w-full rounded-xl bg-tint px-3 py-2 text-sm ring-1 ring-border" />
          {!treatDate ? <Empty /> : (
            <div className="mt-3 space-y-3">
              {([
                ["Pain", tPain, "/10"],
                ["Tetany intensity", tTetany, "/5"],
                ["Panic intensity", tPanic, "/10"],
                ["Negative mood tags/day", tMood, ""],
              ] as const).map(([label, m, unit]) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label} — 4 weeks before vs after</p>
                  <TwoPointLine prev={m.before} curr={m.after} unit={unit} />
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground">Marker: {treatDate} (start of treatment)</p>
            </div>
          )}
        </Card>

        <Card title="Couple comparison">
          {!partner ? <Empty /> : (
            <>
              <p className="mt-1 text-[11px] text-muted-foreground">Last 30 days · you vs {partner.name || "partner"}</p>
              <div className="mt-3 space-y-3">
                {[
                  { label: "Tetany", you: youTetanyCount, them: partnerTetanyCount },
                  { label: "Panic", you: youPanicCount, them: partnerPanicCount },
                ].map((r) => {
                  const max = Math.max(1, r.you, r.them);
                  return (
                    <div key={r.label}>
                      <p className="text-xs text-muted-foreground">{r.label}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="w-16 shrink-0 text-[10px] text-muted-foreground">You ({r.you})</span>
                        <div className="h-3 flex-1 overflow-hidden rounded-full bg-tint">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${(r.you / max) * 100}%` }} />
                        </div>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="w-16 shrink-0 text-[10px] text-muted-foreground">{(partner.name || "Partner").slice(0, 10)} ({r.them})</span>
                        <div className="h-3 flex-1 overflow-hidden rounded-full bg-tint">
                          <div className="h-full rounded-full bg-accent" style={{ width: `${(r.them / max) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex gap-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> You</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-accent" /> {partner.name || "Partner"}</span>
              </div>
            </>
          )}
        </Card>

        <Card title="Trigger comparison">
          <div className="mt-2 grid grid-cols-1 gap-2">
            <select value={triggerA} onChange={(e) => setTriggerA(e.target.value)} className="rounded-xl bg-tint px-3 py-2 text-sm ring-1 ring-border">
              {A_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <select value={triggerB} onChange={(e) => setTriggerB(e.target.value)} className="rounded-xl bg-tint px-3 py-2 text-sm ring-1 ring-border">
              {B_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {[{ label: `Days with A (${withA.length})`, pct: pctWith }, { label: `Days without A (${withoutA.length})`, pct: pctWithout }].map((b) => (
              <div key={b.label} className="flex flex-col items-center gap-1">
                <span className="text-sm font-semibold tabular-nums">{b.pct != null ? `${b.pct.toFixed(0)}%` : "–"}</span>
                <div className="flex h-20 w-full items-end justify-center">
                  <div className="w-8 rounded-t bg-primary" style={{ height: b.pct != null ? `${Math.max(4, b.pct)}%` : "2%", opacity: b.pct != null ? 1 : 0.2 }} />
                </div>
                <span className="text-center text-[10px] text-muted-foreground">{b.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Days with {aLabel.toLowerCase()}: {bLabel.toLowerCase()} on {pctWith != null ? `${pctWith.toFixed(0)}%` : "–"} of days. Days without: {pctWithout != null ? `${pctWithout.toFixed(0)}%` : "–"}.
          </p>
          <button onClick={saveTrigger} className="mt-3 w-full rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">
            ★ Save this combo
          </button>
          {(view.settings.savedTriggers ?? []).length > 0 && (
            <div className="mt-3 space-y-1.5">
              {(view.settings.savedTriggers ?? []).map((t) => (
                <div key={t.id} className="flex items-center gap-2 rounded-xl bg-tint px-3 py-2 text-xs">
                  <button className="flex-1 text-left" onClick={() => { setTriggerA(t.a); setTriggerB(t.b); }}>
                    {A_OPTIONS.find((o) => o.id === t.a)?.label ?? t.a} → {B_OPTIONS.find((o) => o.id === t.b)?.label ?? t.b}
                  </button>
                  <button onClick={() => removeTrigger(t.id)} className="text-muted-foreground">✕</button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Lab results">
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input list="lab-tests" placeholder="Test name" value={labForm.test}
              onChange={(e) => setLabForm({ ...labForm, test: e.target.value })}
              className="col-span-2 rounded-xl bg-tint px-3 py-2 text-sm ring-1 ring-border" />
            <datalist id="lab-tests">{view.custom.labTests.map((t) => <option key={t} value={t} />)}</datalist>
            <input type="number" placeholder="Value" value={labForm.value} onChange={(e) => setLabForm({ ...labForm, value: e.target.value })} className="rounded-xl bg-tint px-3 py-2 text-sm ring-1 ring-border" />
            <input placeholder="Unit" value={labForm.unit} onChange={(e) => setLabForm({ ...labForm, unit: e.target.value })} className="rounded-xl bg-tint px-3 py-2 text-sm ring-1 ring-border" />
            <input type="number" placeholder="Ref low" value={labForm.refLow} onChange={(e) => setLabForm({ ...labForm, refLow: e.target.value })} className="rounded-xl bg-tint px-3 py-2 text-sm ring-1 ring-border" />
            <input type="number" placeholder="Ref high" value={labForm.refHigh} onChange={(e) => setLabForm({ ...labForm, refHigh: e.target.value })} className="rounded-xl bg-tint px-3 py-2 text-sm ring-1 ring-border" />
            <input type="date" value={labForm.date} onChange={(e) => setLabForm({ ...labForm, date: e.target.value })} className="col-span-2 rounded-xl bg-tint px-3 py-2 text-sm ring-1 ring-border" />
          </div>
          <button onClick={addLab} className="mt-2 w-full rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">+ Add lab result</button>

          {labsByTest.size === 0 ? <Empty /> : (
            <div className="mt-4 space-y-4">
              {Array.from(labsByTest.entries()).map(([test, entries]) => (
                <div key={test} className="rounded-2xl bg-tint p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{test}</p>
                    <span className="text-[10px] text-muted-foreground">{entries.length} entr{entries.length === 1 ? "y" : "ies"}</span>
                  </div>
                  {entries.length >= 2 && (
                    <LabTrendChart entries={entries} />
                  )}
                  <ul className="mt-2 space-y-1 text-xs">
                    {entries.slice().reverse().map((l) => (
                      <li key={l.id} className="flex items-center justify-between">
                        <span className={inRange(l) ? "" : "font-semibold"} style={{ color: inRange(l) ? undefined : (l.refHigh != null && l.value > l.refHigh ? "#ef4444" : "#f97316") }}>
                          {l.date} — {l.value}{l.unit ?? ""}
                          {l.refLow != null || l.refHigh != null ? <span className="text-muted-foreground"> (ref {l.refLow ?? "–"}–{l.refHigh ?? "–"})</span> : null}
                        </span>
                        <button onClick={() => removeLab(l.id)} className="text-muted-foreground">✕</button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Documents">
          <div className="mt-2 space-y-2">
            <input placeholder="Document name" value={docForm.name} onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
              className="w-full rounded-xl bg-tint px-3 py-2 text-sm ring-1 ring-border" />
            <input type="date" value={docForm.date} onChange={(e) => setDocForm({ ...docForm, date: e.target.value })}
              className="w-full rounded-xl bg-tint px-3 py-2 text-sm ring-1 ring-border" />
            {(view.labs ?? []).length > 0 && (
              <select value={docForm.labId} onChange={(e) => setDocForm({ ...docForm, labId: e.target.value })} className="w-full rounded-xl bg-tint px-3 py-2 text-sm ring-1 ring-border">
                <option value="">Link to lab result (optional)</option>
                {(view.labs ?? []).map((l) => <option key={l.id} value={l.id}>{l.test} — {l.date}</option>)}
              </select>
            )}
            <input ref={fileRef} type="file" accept="image/*,application/pdf"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onDocFile(f); }}
              className="w-full text-xs" />
            {docWarn && <p className="text-xs" style={{ color: "#f97316" }}>{docWarn}</p>}
            <button onClick={addDoc} disabled={!docForm.name || !docDataUrl}
              className="w-full rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-40">
              + Add document
            </button>
          </div>
          {sortedDocs.length === 0 ? <Empty /> : (
            <ul className="mt-3 space-y-2">
              {sortedDocs.map((doc) => (
                <li key={doc.id} className="flex items-center gap-3 rounded-2xl bg-tint p-3">
                  {doc.mime?.startsWith("image/") && doc.dataUrl
                    ? <img src={doc.dataUrl} alt={doc.name} className="h-12 w-12 rounded-lg object-cover" />
                    : <span className="grid h-12 w-12 place-items-center rounded-lg bg-surface text-lg">📄</span>}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{doc.date}</p>
                  </div>
                  <button onClick={() => removeDoc(doc.id)} className="text-muted-foreground">✕</button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="My diagnoses">
          <div className="mt-2 space-y-2">
            <input placeholder="Diagnosis name" value={diagForm.name} onChange={(e) => setDiagForm({ ...diagForm, name: e.target.value })} className="w-full rounded-xl bg-tint px-3 py-2 text-sm ring-1 ring-border" />
            <input type="date" value={diagForm.date} onChange={(e) => setDiagForm({ ...diagForm, date: e.target.value })} className="w-full rounded-xl bg-tint px-3 py-2 text-sm ring-1 ring-border" />
            <input placeholder="Doctor / clinic" value={diagForm.doctor} onChange={(e) => setDiagForm({ ...diagForm, doctor: e.target.value })} className="w-full rounded-xl bg-tint px-3 py-2 text-sm ring-1 ring-border" />
            <textarea placeholder="Note" value={diagForm.note} onChange={(e) => setDiagForm({ ...diagForm, note: e.target.value })} className="w-full rounded-xl bg-tint px-3 py-2 text-sm ring-1 ring-border" />
            {(view.docs ?? []).length > 0 && (
              <select value={diagForm.docId} onChange={(e) => setDiagForm({ ...diagForm, docId: e.target.value })} className="w-full rounded-xl bg-tint px-3 py-2 text-sm ring-1 ring-border">
                <option value="">Link to document (optional)</option>
                {(view.docs ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            )}
            <button onClick={saveDiag} className="w-full rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">
              {diagForm.id ? "Update diagnosis" : "+ Add diagnosis"}
            </button>
          </div>
          {(view.diagnoses ?? []).length === 0 ? <Empty /> : (
            <ul className="mt-3 space-y-2">
              {(view.diagnoses ?? []).map((dg) => (
                <li key={dg.id} className="rounded-2xl bg-tint p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{dg.name}</p>
                      <p className="text-xs text-muted-foreground">{[dg.date, dg.doctor].filter(Boolean).join(" · ")}</p>
                      {dg.note && <p className="mt-1 text-xs whitespace-pre-line">{dg.note}</p>}
                    </div>
                    <div className="flex shrink-0 gap-2 text-xs">
                      <button onClick={() => editDiag(dg)} className="text-primary">Edit</button>
                      <button onClick={() => removeDiag(dg.id)} className="text-muted-foreground">Delete</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

      </div>
    </AppShell>
  );
}

function LabTrendChart({ entries }: { entries: LabResult[] }) {
  const width = 300, height = 110, left = 10, right = 10, top = 10, bottom = 20;
  const chartW = width - left - right, chartH = height - top - bottom;
  const vals = entries.map((e) => e.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = Math.max(0.001, max - min);
  const denom = Math.max(1, entries.length - 1);
  const xFor = (i: number) => left + (i / denom) * chartW;
  const yFor = (v: number) => top + ((max - v) / span) * chartH;
  const path = entries.map((e, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)},${yFor(e.value).toFixed(1)}`).join(" ");
  const dotColor = (e: LabResult) => {
    if (e.refLow != null && e.value < e.refLow) return "#f97316";
    if (e.refHigh != null && e.value > e.refHigh) return "#ef4444";
    return "var(--primary)";
  };
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 h-24 w-full">
      <path d={path} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {entries.map((e, i) => (
        <circle key={e.id} cx={xFor(i)} cy={yFor(e.value)} r="3.5" fill={dotColor(e)}>
          <title>{`${e.date}: ${e.value}${e.unit ?? ""}`}</title>
        </circle>
      ))}
    </svg>
  );
}
