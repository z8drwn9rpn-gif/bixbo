import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Ico } from "@/components/icons/BixboIcons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  useBixbo,
  EMPTY,
  todayKey,
  addDays,
  fromKey,
  updateDayLog,
  type BixboData,
  type DayLog,
  type PostpartumDayLog,
  type PostpartumState,
  type PregnancyAppointment,
} from "@/lib/storage";
import { postpartumProgress, daysBetween, POSTPARTUM_MOODS, POSTPARTUM_SYMPTOMS } from "@/lib/health";

export const Route = createFileRoute("/postpartum")({
  head: () => ({
    meta: [
      { title: "Postpartum — BIXBO" },
      { name: "description", content: "Track your postpartum recovery, feeding, sleep and mood day by day." },
      { property: "og:title", content: "Postpartum — BIXBO" },
      { property: "og:description", content: "Postpartum recovery tracking for you and baby." },
    ],
  }),
  component: PostpartumPage,
});

const WD_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON_SHORT3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDay(k: string): string {
  const d = fromKey(k);
  return `${WD_SHORT[d.getDay()]} ${d.getDate()} ${MON_SHORT3[d.getMonth()]}`;
}
function uid(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}
function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const BLEEDING_LEVELS: { v: NonNullable<PostpartumDayLog["bleeding"]>; label: string; color: string }[] = [
  { v: "none", label: "None", color: "bg-muted" },
  { v: "spotting", label: "Spotting", color: "bg-primary/20" },
  { v: "light", label: "Light", color: "bg-primary/40" },
  { v: "medium", label: "Medium", color: "bg-primary/70" },
  { v: "heavy", label: "Heavy", color: "bg-destructive" },
];

function PostpartumPage() {
  const navigate = useNavigate();
  const { data, update, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const pp = view.postpartum;
  const today = todayKey();
  const log: PostpartumDayLog = view.dayLogs[today]?.postpartum ?? {};

  const updatePP = (patch: (p: PostpartumState) => PostpartumState) =>
    update((d) => ({ ...d, postpartum: patch(d.postpartum ?? { active: true, visits: [] }) }));

  const updateLog = (patch: (l: PostpartumDayLog) => PostpartumDayLog) =>
    updateDayLog(update, today, (l: DayLog) => ({ ...l, postpartum: patch(l.postpartum ?? {}) }));

  if (!hydrated) return null;

  if (!pp?.active) {
    return (
      <AppShell
        title={
          <button onClick={() => navigate({ to: "/" })} className="flex items-center gap-2">
            <ArrowLeft className="h-5 w-5" /> Postpartum
          </button>
        }
      >
        <div className="px-5 pt-4 pb-24">
          <p className="text-sm text-muted-foreground">
            Postpartum mode isn't active.{" "}
            {pp?.endedAt ? "It was ended on " + pp.endedAt + "." : "Turn it on below to start tracking your recovery."}
          </p>
          <Button
            className="mt-4"
            onClick={() => updatePP((p) => ({ ...p, active: true, endedAt: undefined, visits: p.visits ?? [] }))}
          >
            Start postpartum tracking
          </Button>
        </div>
      </AppShell>
    );
  }

  const progress = postpartumProgress(pp, today);
  const weeks = progress?.week ?? null;
  const days = progress?.days ?? (pp.birthDate ? daysBetween(pp.birthDate, today) : null);

  return (
    <AppShell
      title={
        <button onClick={() => navigate({ to: "/" })} className="flex items-center gap-2">
          <ArrowLeft className="h-5 w-5" /> Postpartum
        </button>
      }
    >
      <div className="space-y-4 px-5 pt-4 pb-24">
        {/* ---- Header / setup ---- */}
        <section className="rounded-3xl bg-surface p-4 ring-1 ring-border">
          {!pp.birthDate ? (
            <SetupForm pp={pp} updatePP={updatePP} />
          ) : (
            <>
              <p className="text-sm font-medium">{pp.babyName || "Baby"}</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-tint ring-1 ring-border/50">
                  <Ico name="baby" size={30} />
                </span>
                <div>
                  <p className="font-serif text-2xl font-bold">
                    {progress ? `Week ${progress.week} + ${progress.dayOfWeek}` : "Postpartum"}
                  </p>
                  <p className="text-xs text-muted-foreground">Postpartum recovery</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {days != null ? `${days} day${days === 1 ? "" : "s"} since birth` : ""}
                {pp.deliveryType ? ` · ${deliveryLabel(pp.deliveryType)}` : ""}
                {pp.babyBirthWeightKg ? ` · ${pp.babyBirthWeightKg} kg at birth` : ""}
              </p>
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-muted-foreground">Edit details</summary>
                <div className="mt-2">
                  <SetupForm pp={pp} updatePP={updatePP} compact />
                </div>
              </details>
            </>
          )}
        </section>

        {pp.birthDate && (
          <>
            <SymptomsSection log={log} updateLog={updateLog} />
            <BleedingSection view={view} log={log} updateLog={updateLog} today={today} />
            <RecoverySection pp={pp} log={log} updateLog={updateLog} />
            <MoodSection log={log} updateLog={updateLog} />
            <SleepSection view={view} log={log} updateLog={updateLog} today={today} />
            <FeedingSection log={log} updateLog={updateLog} />
            <DiaperSection log={log} updateLog={updateLog} />
            <VisitsSection pp={pp} updatePP={updatePP} />
            <NotesSection log={log} updateLog={updateLog} />

            <section className="rounded-3xl bg-surface p-4 ring-1 ring-border">
              <p className="text-sm font-medium">Finish postpartum mode</p>
              <p className="mt-1 text-xs text-muted-foreground">
                When you're ready, you can turn off postpartum tracking. Your history is kept.
              </p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => {
                  if (!window.confirm("Finish postpartum tracking? You can restart it any time.")) return;
                  updatePP((p) => ({ ...p, active: false, endedAt: today }));
                }}
              >
                Finish postpartum
              </Button>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

function deliveryLabel(t: NonNullable<PostpartumState["deliveryType"]>): string {
  return { vaginal: "Vaginal birth", csection: "C-section", assisted: "Assisted delivery", other: "Other" }[t];
}

function SetupForm({
  pp,
  updatePP,
  compact = false,
}: {
  pp: PostpartumState;
  updatePP: (p: (x: PostpartumState) => PostpartumState) => void;
  compact?: boolean;
}) {
  const types: { v: NonNullable<PostpartumState["deliveryType"]>; label: string }[] = [
    { v: "vaginal", label: "Vaginal" },
    { v: "csection", label: "C-section" },
    { v: "assisted", label: "Assisted" },
    { v: "other", label: "Other" },
  ];
  const feedings: { v: NonNullable<PostpartumState["feedingMode"]>; label: string }[] = [
    { v: "breast", label: "Breast" },
    { v: "bottle", label: "Bottle" },
    { v: "mixed", label: "Mixed" },
  ];
  return (
    <div className="space-y-3">
      {!compact && <p className="text-sm font-medium">Welcome — let's set things up</p>}
      <div>
        <label className="text-xs text-muted-foreground" htmlFor="pp-birthdate">
          Birth date
        </label>
        <Input
          id="pp-birthdate"
          type="date"
          className="mt-1"
          value={pp.birthDate ?? ""}
          onChange={(e) => updatePP((p) => ({ ...p, birthDate: e.target.value }))}
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground" htmlFor="pp-babyname">
          Baby's name
        </label>
        <Input
          id="pp-babyname"
          className="mt-1"
          value={pp.babyName ?? ""}
          onChange={(e) => updatePP((p) => ({ ...p, babyName: e.target.value }))}
          placeholder="Optional"
        />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Delivery type</p>
        <div className="mt-1 grid grid-cols-4 gap-2">
          {types.map(({ v, label }) => (
            <button
              key={v}
              type="button"
              onClick={() => updatePP((p) => ({ ...p, deliveryType: v }))}
              className={`min-h-11 rounded-xl border p-2 text-xs font-medium ${pp.deliveryType === v ? "border-primary bg-primary/10 text-primary dark:bg-primary dark:text-primary-foreground" : "border-border bg-tint"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground" htmlFor="pp-weight">
          Birth weight (kg)
        </label>
        <Input
          id="pp-weight"
          type="number"
          step="0.01"
          className="mt-1"
          value={pp.babyBirthWeightKg ?? ""}
          onChange={(e) =>
            updatePP((p) => ({ ...p, babyBirthWeightKg: e.target.value ? Number(e.target.value) : undefined }))
          }
          placeholder="e.g. 3.4"
        />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Feeding mode</p>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {feedings.map(({ v, label }) => (
            <button
              key={v}
              type="button"
              onClick={() => updatePP((p) => ({ ...p, feedingMode: v }))}
              className={`min-h-11 rounded-xl border p-2 text-xs font-medium ${pp.feedingMode === v ? "border-primary bg-primary/10 text-primary dark:bg-primary dark:text-primary-foreground" : "border-border bg-tint"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SymptomsSection({
  log,
  updateLog,
}: {
  log: PostpartumDayLog;
  updateLog: (patch: (value: PostpartumDayLog) => PostpartumDayLog) => void;
}) {
  const selected = log.symptoms ?? [];

  const toggle = (symptom: string) => {
    updateLog((current) => ({
      ...current,
      symptoms: selected.includes(symptom) ? selected.filter((item) => item !== symptom) : [...selected, symptom],
    }));
  };

  return (
    <section className="rounded-3xl bg-surface p-4 ring-1 ring-border">
      <div className="flex items-center gap-2">
        <Ico name="warning" size={22} />
        <div>
          <p className="text-sm font-medium">Symptoms today</p>
          <p className="text-xs text-muted-foreground">Select everything you noticed during recovery.</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {POSTPARTUM_SYMPTOMS.map((symptom) => {
          const active = selected.includes(symptom);

          return (
            <button
              key={symptom}
              type="button"
              onClick={() => toggle(symptom)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                active ? "bg-primary text-primary-foreground ring-primary" : "bg-tint text-foreground ring-border"
              }`}
            >
              {symptom}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function BleedingSection({
  view,
  log,
  updateLog,
  today,
}: {
  view: BixboData;
  log: PostpartumDayLog;
  updateLog: (p: (l: PostpartumDayLog) => PostpartumDayLog) => void;
  today: string;
}) {
  const trend = Array.from({ length: 42 }, (_, i) => addDays(today, i - 41));
  return (
    <section className="rounded-3xl bg-surface p-4 ring-1 ring-border">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Ico name="period" size={20} /> Bleeding (lochia)
      </p>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {BLEEDING_LEVELS.map(({ v, label, color }) => (
          <button
            key={v}
            type="button"
            onClick={() => updateLog((l) => ({ ...l, bleeding: l.bleeding === v ? "" : v }))}
            className={`flex min-h-11 flex-col items-center gap-1 rounded-xl border p-2 text-[10px] font-medium ${log.bleeding === v ? "border-primary bg-primary/10 text-primary dark:bg-primary dark:text-primary-foreground" : "border-border bg-tint"}`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
            {label}
          </button>
        ))}
      </div>
      <p className="mt-4 mb-1 text-xs uppercase tracking-wider text-muted-foreground">6-week trend</p>
      <div className="flex items-end gap-[2px]">
        {trend.map((k) => {
          const b = view.dayLogs[k]?.postpartum?.bleeding;
          const idx = BLEEDING_LEVELS.findIndex((x) => x.v === b);
          const color = idx >= 0 ? BLEEDING_LEVELS[idx].color : "bg-border";
          const h = idx >= 0 ? 6 + idx * 5 : 4;
          return <div key={k} title={fmtDay(k)} className={`w-1.5 rounded-sm ${color}`} style={{ height: h }} />;
        })}
      </div>
    </section>
  );
}

function LabeledSlider({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-xs text-muted-foreground" htmlFor={id}>
          {label}
        </label>
        <span className="text-xs font-medium">{value}/10</span>
      </div>
      <Slider id={id} className="mt-2" min={0} max={10} step={1} value={[value]} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

function RecoverySection({
  pp,
  log,
  updateLog,
}: {
  pp: PostpartumState;
  log: PostpartumDayLog;
  updateLog: (p: (l: PostpartumDayLog) => PostpartumDayLog) => void;
}) {
  return (
    <section className="rounded-3xl bg-surface p-4 ring-1 ring-border space-y-4">
      <p className="text-sm font-medium">Recovery</p>
      <LabeledSlider
        id="pp-recovery"
        label="Overall recovery"
        value={log.recovery ?? 5}
        onChange={(v) => updateLog((l) => ({ ...l, recovery: v }))}
      />
      {pp.deliveryType === "csection" && (
        <LabeledSlider
          id="pp-csection"
          label="C-section incision recovery"
          value={log.csectionRecovery ?? 5}
          onChange={(v) => updateLog((l) => ({ ...l, csectionRecovery: v }))}
        />
      )}
      {(pp.deliveryType === "vaginal" || pp.deliveryType === "assisted") && (
        <LabeledSlider
          id="pp-perineal"
          label="Perineal healing"
          value={log.perinealHealing ?? 5}
          onChange={(v) => updateLog((l) => ({ ...l, perinealHealing: v }))}
        />
      )}
    </section>
  );
}

function MoodSection({
  log,
  updateLog,
}: {
  log: PostpartumDayLog;
  updateLog: (p: (l: PostpartumDayLog) => PostpartumDayLog) => void;
}) {
  const [custom, setCustom] = useState("");
  const moods = log.mood ?? [];
  const toggle = (m: string) =>
    updateLog((l) => ({ ...l, mood: moods.includes(m) ? moods.filter((x) => x !== m) : [...moods, m] }));
  const addCustom = () => {
    const v = custom.trim();
    if (!v || moods.includes(v)) return;
    updateLog((l) => ({ ...l, mood: [...moods, v] }));
    setCustom("");
  };
  return (
    <section className="rounded-3xl bg-surface p-4 ring-1 ring-border">
      <p className="text-sm font-medium">Mood</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {POSTPARTUM_MOODS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => toggle(m)}
            className={`min-h-11 rounded-full border px-3 py-1.5 text-xs font-medium ${moods.includes(m) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-tint"}`}
          >
            {m}
          </button>
        ))}
        {moods
          .filter((m) => !POSTPARTUM_MOODS.includes(m))
          .map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => toggle(m)}
              className="min-h-11 rounded-full border border-primary bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
            >
              {m}
            </button>
          ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addCustom();
          }}
          placeholder="Add your own..."
        />
        <Button size="sm" onClick={addCustom}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Feeling persistently low, tearful, anxious or numb for more than two weeks is common but worth mentioning to
        your doctor or midwife — they can screen for postpartum depression (e.g. with an EPDS questionnaire). This note
        is not a diagnosis.
      </p>
    </section>
  );
}

function SleepSection({
  view,
  log,
  updateLog,
  today,
}: {
  view: BixboData;
  log: PostpartumDayLog;
  updateLog: (p: (l: PostpartumDayLog) => PostpartumDayLog) => void;
  today: string;
}) {
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  const maxH = Math.max(
    1,
    ...days.map((k) =>
      Math.max(view.dayLogs[k]?.postpartum?.sleepHours ?? 0, view.dayLogs[k]?.postpartum?.babySleepHours ?? 0),
    ),
  );
  return (
    <section className="rounded-3xl bg-surface p-4 ring-1 ring-border">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Ico name="sleep" size={20} /> Sleep
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground" htmlFor="pp-sleep-mom">
            Your sleep (hrs)
          </label>
          <Input
            id="pp-sleep-mom"
            type="number"
            step="0.5"
            className="mt-1"
            value={log.sleepHours ?? ""}
            onChange={(e) =>
              updateLog((l) => ({ ...l, sleepHours: e.target.value ? Number(e.target.value) : undefined }))
            }
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground" htmlFor="pp-sleep-baby">
            Baby's sleep (hrs)
          </label>
          <Input
            id="pp-sleep-baby"
            type="number"
            step="0.5"
            className="mt-1"
            value={log.babySleepHours ?? ""}
            onChange={(e) =>
              updateLog((l) => ({ ...l, babySleepHours: e.target.value ? Number(e.target.value) : undefined }))
            }
          />
        </div>
      </div>
      <p className="mt-4 mb-1 text-xs uppercase tracking-wider text-muted-foreground">Last 14 days</p>
      <div className="flex items-end gap-1" style={{ height: 60 }}>
        {days.map((k) => {
          const p = view.dayLogs[k]?.postpartum;
          const mh = p?.sleepHours ?? 0;
          const bh = p?.babySleepHours ?? 0;
          return (
            <div key={k} title={`${fmtDay(k)}: you ${mh}h · baby ${bh}h`} className="flex flex-1 items-end gap-[1px]">
              <div
                className="flex-1 rounded-t-sm bg-primary"
                style={{ height: `${(mh / maxH) * 100}%`, minHeight: mh ? 2 : 0 }}
              />
              <div
                className="flex-1 rounded-t-sm bg-accent-foreground/40"
                style={{ height: `${(bh / maxH) * 100}%`, minHeight: bh ? 2 : 0 }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-3 text-[10px] text-muted-foreground">
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-primary" />
          You
        </span>
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-accent-foreground/40" />
          Baby
        </span>
      </div>
    </section>
  );
}

function FeedingSection({
  log,
  updateLog,
}: {
  log: PostpartumDayLog;
  updateLog: (p: (l: PostpartumDayLog) => PostpartumDayLog) => void;
}) {
  const bf = log.breastfeeding ?? [];
  const pumping = log.pumping ?? [];
  const bottle = log.bottle ?? [];

  const [bfMin, setBfMin] = useState("");
  const [bfSide, setBfSide] = useState<"left" | "right" | "both">("both");
  const [pumpMl, setPumpMl] = useState("");
  const [pumpMin, setPumpMin] = useState("");
  const [bottleMl, setBottleMl] = useState("");

  const totalNursed = bf.reduce((s, x) => s + (x.minutes ?? 0), 0);
  const totalPumped = pumping.reduce((s, x) => s + (x.ml ?? 0), 0);
  const totalBottle = bottle.reduce((s, x) => s + (x.ml ?? 0), 0);

  return (
    <section className="rounded-3xl bg-surface p-4 ring-1 ring-border space-y-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Ico name="bottle" size={20} /> Feeding
      </p>
      <p className="text-xs text-muted-foreground">
        Today: {totalNursed} min nursed · {totalPumped} ml pumped · {totalBottle} ml bottle
      </p>

      <div>
        <p className="text-xs font-medium">Breastfeeding</p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <Input
            type="number"
            placeholder="Minutes"
            className="w-24"
            value={bfMin}
            onChange={(e) => setBfMin(e.target.value)}
          />
          <div className="flex gap-1">
            {(["left", "right", "both"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setBfSide(s)}
                className={`min-h-11 rounded-md border px-2 text-xs capitalize ${bfSide === s ? "border-primary bg-primary/10 text-primary dark:bg-primary dark:text-primary-foreground" : "border-border bg-tint"}`}
              >
                {s}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            onClick={() => {
              updateLog((l) => ({
                ...l,
                breastfeeding: [
                  ...(l.breastfeeding ?? []),
                  { id: uid(), time: nowHHMM(), minutes: bfMin ? Number(bfMin) : undefined, side: bfSide },
                ],
              }));
              setBfMin("");
            }}
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
        <ul className="mt-2 space-y-1">
          {bf.map((x) => (
            <li key={x.id} className="flex items-center justify-between rounded-lg bg-tint px-3 py-2 text-xs">
              <span>
                {x.time} · {x.minutes ?? "?"} min · {x.side}
              </span>
              <button
                aria-label="Delete breastfeeding entry"
                onClick={() =>
                  updateLog((l) => ({ ...l, breastfeeding: (l.breastfeeding ?? []).filter((y) => y.id !== x.id) }))
                }
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-xs font-medium">Pumping</p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <Input
            type="number"
            placeholder="ml"
            className="w-20"
            value={pumpMl}
            onChange={(e) => setPumpMl(e.target.value)}
          />
          <Input
            type="number"
            placeholder="Minutes"
            className="w-24"
            value={pumpMin}
            onChange={(e) => setPumpMin(e.target.value)}
          />
          <Button
            size="sm"
            onClick={() => {
              updateLog((l) => ({
                ...l,
                pumping: [
                  ...(l.pumping ?? []),
                  {
                    id: uid(),
                    time: nowHHMM(),
                    ml: pumpMl ? Number(pumpMl) : undefined,
                    minutes: pumpMin ? Number(pumpMin) : undefined,
                  },
                ],
              }));
              setPumpMl("");
              setPumpMin("");
            }}
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
        <ul className="mt-2 space-y-1">
          {pumping.map((x) => (
            <li key={x.id} className="flex items-center justify-between rounded-lg bg-tint px-3 py-2 text-xs">
              <span>
                {x.time} · {x.ml ?? "?"} ml · {x.minutes ?? "?"} min
              </span>
              <button
                aria-label="Delete pumping entry"
                onClick={() => updateLog((l) => ({ ...l, pumping: (l.pumping ?? []).filter((y) => y.id !== x.id) }))}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-xs font-medium">Bottle feeds</p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <Input
            type="number"
            placeholder="ml"
            className="w-20"
            value={bottleMl}
            onChange={(e) => setBottleMl(e.target.value)}
          />
          <Button
            size="sm"
            onClick={() => {
              updateLog((l) => ({
                ...l,
                bottle: [
                  ...(l.bottle ?? []),
                  { id: uid(), time: nowHHMM(), ml: bottleMl ? Number(bottleMl) : undefined },
                ],
              }));
              setBottleMl("");
            }}
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
        <ul className="mt-2 space-y-1">
          {bottle.map((x) => (
            <li key={x.id} className="flex items-center justify-between rounded-lg bg-tint px-3 py-2 text-xs">
              <span>
                {x.time} · {x.ml ?? "?"} ml
              </span>
              <button
                aria-label="Delete bottle entry"
                onClick={() => updateLog((l) => ({ ...l, bottle: (l.bottle ?? []).filter((y) => y.id !== x.id) }))}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function DiaperSection({
  log,
  updateLog,
}: {
  log: PostpartumDayLog;
  updateLog: (p: (l: PostpartumDayLog) => PostpartumDayLog) => void;
}) {
  const diapers = log.diapers ?? [];
  const wet = diapers.filter((d) => d.kind === "wet").length;
  const dirty = diapers.filter((d) => d.kind === "dirty").length;
  const both = diapers.filter((d) => d.kind === "both").length;

  const add = (kind: "wet" | "dirty" | "both") =>
    updateLog((l) => ({ ...l, diapers: [...(l.diapers ?? []), { id: uid(), time: nowHHMM(), kind }] }));

  return (
    <section className="rounded-3xl bg-surface p-4 ring-1 ring-border">
      <p className="text-sm font-medium">Diapers</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Button variant="outline" className="min-h-11" onClick={() => add("wet")}>
          Wet ({wet})
        </Button>
        <Button variant="outline" className="min-h-11" onClick={() => add("dirty")}>
          Dirty ({dirty})
        </Button>
        <Button variant="outline" className="min-h-11" onClick={() => add("both")}>
          Both ({both})
        </Button>
      </div>
      <ul className="mt-3 space-y-1">
        {diapers.map((x) => (
          <li key={x.id} className="flex items-center justify-between rounded-lg bg-tint px-3 py-2 text-xs capitalize">
            <span>
              {x.time} · {x.kind}
            </span>
            <button
              aria-label="Delete diaper entry"
              onClick={() => updateLog((l) => ({ ...l, diapers: (l.diapers ?? []).filter((y) => y.id !== x.id) }))}
            >
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function VisitsSection({
  pp,
  updatePP,
}: {
  pp: PostpartumState;
  updatePP: (p: (x: PostpartumState) => PostpartumState) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PregnancyAppointment | null>(null);
  const visits = pp.visits ?? [];
  const today = todayKey();
  const upcoming = visits.filter((v) => v.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past = visits.filter((v) => v.date < today).sort((a, b) => b.date.localeCompare(a.date));

  const save = (v: PregnancyAppointment) =>
    updatePP((p) => ({
      ...p,
      visits: p.visits.some((x) => x.id === v.id) ? p.visits.map((x) => (x.id === v.id ? v : x)) : [...p.visits, v],
    }));
  const remove = (id: string) => updatePP((p) => ({ ...p, visits: p.visits.filter((x) => x.id !== id) }));

  const openNew = () => {
    setEditing(null);
    setShowForm(true);
  };
  const openEdit = (v: PregnancyAppointment) => {
    setEditing(v);
    setShowForm(true);
  };

  return (
    <section className="rounded-3xl bg-surface p-4 ring-1 ring-border">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Doctor visits</p>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>

      {showForm && (
        <VisitForm
          initial={editing}
          onCancel={() => setShowForm(false)}
          onSave={(v) => {
            save(v);
            setShowForm(false);
          }}
        />
      )}

      <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">Upcoming</p>
      {upcoming.length === 0 && <p className="mt-1 text-xs text-muted-foreground">None scheduled.</p>}
      <ul className="mt-1 space-y-1">
        {upcoming.map((v) => (
          <VisitRow key={v.id} v={v} onEdit={() => openEdit(v)} onDelete={() => remove(v.id)} />
        ))}
      </ul>

      <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">Past</p>
      {past.length === 0 && <p className="mt-1 text-xs text-muted-foreground">None yet.</p>}
      <ul className="mt-1 space-y-1">
        {past.map((v) => (
          <VisitRow key={v.id} v={v} onEdit={() => openEdit(v)} onDelete={() => remove(v.id)} />
        ))}
      </ul>
    </section>
  );
}

function VisitRow({ v, onEdit, onDelete }: { v: PregnancyAppointment; onEdit: () => void; onDelete: () => void }) {
  return (
    <li className="flex items-center justify-between rounded-lg bg-tint px-3 py-2 text-xs">
      <button className="min-h-11 flex-1 text-left" onClick={onEdit}>
        <span className="font-medium">{v.title}</span> · {fmtDay(v.date)}
        {v.time ? ` ${v.time}` : ""}
        {v.doctor ? ` · ${v.doctor}` : ""}
      </button>
      <button aria-label="Delete visit" onClick={onDelete}>
        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </li>
  );
}

function VisitForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: PregnancyAppointment | null;
  onCancel: () => void;
  onSave: (v: PregnancyAppointment) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(initial?.date ?? todayKey());
  const [time, setTime] = useState(initial?.time ?? "");
  const [doctor, setDoctor] = useState(initial?.doctor ?? "");
  const [note, setNote] = useState(initial?.note ?? "");

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-border p-3">
      <Input placeholder="Title (e.g. 6-week checkup)" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="flex gap-2">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>
      <Input placeholder="Doctor / clinic" value={doctor} onChange={(e) => setDoctor(e.target.value)} />
      <Textarea placeholder="Notes" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={!title.trim()}
          onClick={() =>
            onSave({
              id: initial?.id ?? uid(),
              title: title.trim(),
              date,
              time: time || undefined,
              doctor: doctor || undefined,
              note: note || undefined,
              kind: initial?.kind ?? "checkup",
            })
          }
        >
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function NotesSection({
  log,
  updateLog,
}: {
  log: PostpartumDayLog;
  updateLog: (p: (l: PostpartumDayLog) => PostpartumDayLog) => void;
}) {
  return (
    <section className="rounded-3xl bg-surface p-4 ring-1 ring-border">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Ico name="pill" size={20} /> Medication & notes
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Track your postpartum vitamins or medications in{" "}
        <Link to="/meds" className="underline">
          Medications
        </Link>
        .
      </p>
      <Textarea
        className="mt-3"
        placeholder="How are you feeling today? Anything to remember..."
        value={log.note ?? ""}
        onChange={(e) => updateLog((l) => ({ ...l, note: e.target.value }))}
      />
    </section>
  );
}
