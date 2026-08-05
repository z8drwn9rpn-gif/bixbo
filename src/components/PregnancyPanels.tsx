import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Ico } from "@/components/icons/BixboIcons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  addDays,
  fromKey,
  toKey,
  type BixboData,
  type BloodPressureEntry,
  type BloodSugarEntry,
  type ChecklistItem,
  type Contraction,
  type KickSession,
  type PregnancyAppointment,
} from "@/lib/storage";

/* ------------------------------------------------------------------ */
/*  Small shared UI helpers                                            */
/* ------------------------------------------------------------------ */

export function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-surface p-4 ring-1 ring-border">
      <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        {icon && <Ico e={icon} size={16} />} {title}
      </p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-muted-foreground">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

export function Slider0to10({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums font-medium text-foreground">{value ?? 0}</span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={value ?? 0}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="mt-1 h-11 w-full accent-primary"
      />
    </div>
  );
}

export function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[44px] rounded-full px-3 py-2 text-xs font-medium ring-1 ${
        active ? "bg-primary text-primary-foreground ring-primary" : "bg-tint text-foreground ring-border"
      }`}
    >
      {label}
    </button>
  );
}

export function TagList({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const [text, setText] = useState("");
  const add = () => {
    const v = text.trim();
    if (!v || values.includes(v)) return;
    onChange([...values, v]);
    setText("");
  };
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={`Add ${label.toLowerCase()}…`}
          aria-label={label}
          className="h-11"
        />
        <Button type="button" className="h-11" onClick={add}>
          Add
        </Button>
      </div>
      {values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full bg-tint px-3 py-1.5 text-xs ring-1 ring-border"
            >
              {v}
              <button
                type="button"
                aria-label={`Remove ${v}`}
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="ml-1 -mr-1 rounded-full p-0.5 hover:bg-border/40"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </Field>
  );
}

/* ------------------------------------------------------------------ */
/*  Line chart — mirrors the insights.tsx look (padding/axis/tooltip)  */
/* ------------------------------------------------------------------ */

export function SimpleLineChart({
  points,
  unit,
  color = "var(--primary)",
}: {
  points: { key: string; label: string; value: number }[];
  unit: string;
  color?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const width = 320;
  const height = 160;
  const left = 30;
  const right = 10;
  const top = 12;
  const bottom = 22;

  if (points.length === 0) {
    return <p className="text-xs text-muted-foreground">No data yet.</p>;
  }

  const values = points.map((p) => p.value);
  const yMax = Math.max(...values);
  const yMin = Math.min(...values);
  const span = yMax - yMin || 1;
  const yMid = (yMax + yMin) / 2;

  const xFor = (i: number) =>
    points.length === 1 ? (width - left - right) / 2 + left : left + (i / (points.length - 1)) * (width - left - right);
  const yFor = (v: number) => top + (1 - (v - yMin) / span) * (height - top - bottom);

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)},${yFor(p.value).toFixed(1)}`).join(" ");

  return (
    <div className="overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full" role="img" aria-label="Line chart">
        {[yMax, yMid, yMin].map((y) => (
          <g key={y}>
            <line x1={left} x2={width - right} y1={yFor(y)} y2={yFor(y)} stroke="var(--border)" strokeWidth="1" />
            <text x={width - right + 2} y={yFor(y) + 3} fontSize="9" fill="var(--muted-foreground)" textAnchor="end">
              {y.toFixed(1)}
            </text>
          </g>
        ))}
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={p.key}>
            <circle cx={xFor(i)} cy={yFor(p.value)} r="3" fill="var(--surface)" stroke={color} strokeWidth="2" />
            <circle
              cx={xFor(i)}
              cy={yFor(p.value)}
              r="12"
              fill="transparent"
              style={{ cursor: "pointer" }}
              onClick={(e) => {
                e.stopPropagation();
                setActive(active === i ? null : i);
              }}
            />
          </g>
        ))}
        {points.map((p, i) => (
          <text key={`l-${p.key}`} x={xFor(i)} y={height - 6} textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">
            {p.label}
          </text>
        ))}
        {active != null &&
          (() => {
            const p = points[active];
            const text = `${p.label} · ${p.value} ${unit}`;
            const boxW = Math.max(50, text.length * 5.4);
            const x = Math.min(Math.max(xFor(active) - boxW / 2, 2), width - right - boxW - 2);
            const y = Math.max(yFor(p.value) - 28, 2);
            return (
              <g pointerEvents="none">
                <rect x={x} y={y} width={boxW} height="20" rx="6" fill="var(--foreground)" opacity="0.9" />
                <text x={x + boxW / 2} y={y + 14} textAnchor="middle" fontSize="9" fill="var(--background)">
                  {text}
                </text>
              </g>
            );
          })()}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Checklist                                                          */
/* ------------------------------------------------------------------ */

export function Checklist({
  items,
  onChange,
  defaults,
}: {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
  defaults: string[];
}) {
  const [text, setText] = useState("");
  const add = () => {
    const v = text.trim();
    if (!v) return;
    onChange([...items, { id: crypto.randomUUID(), text: v, done: false }]);
    setText("");
  };
  const seed = () => {
    onChange([...items, ...defaults.map((t) => ({ id: crypto.randomUUID(), text: t, done: false }))]);
  };
  return (
    <div>
      {items.length === 0 && (
        <Button type="button" variant="outline" size="sm" onClick={seed} className="mb-3">
          Add suggested items
        </Button>
      )}
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add item…"
          aria-label="Add checklist item"
          className="h-11"
        />
        <Button type="button" className="h-11" onClick={add}>
          Add
        </Button>
      </div>
      <ul className="mt-3 space-y-1">
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-2 rounded-xl bg-tint px-3 py-2 ring-1 ring-border/40">
            <button
              type="button"
              aria-label={it.done ? `Mark ${it.text} not done` : `Mark ${it.text} done`}
              onClick={() =>
                onChange(items.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)))
              }
              className="flex h-11 w-11 shrink-0 items-center justify-center"
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-md ring-1 ring-border ${it.done ? "bg-primary text-primary-foreground" : "bg-background"}`}
              >
                {it.done ? "✓" : ""}
              </span>
            </button>
            <span className={`flex-1 text-sm ${it.done ? "text-muted-foreground line-through" : ""}`}>{it.text}</span>
            <button
              type="button"
              aria-label={`Remove ${it.text}`}
              onClick={() => onChange(items.filter((x) => x.id !== it.id))}
              className="flex h-11 w-11 shrink-0 items-center justify-center text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Blood pressure / sugar                                             */
/* ------------------------------------------------------------------ */

export function BloodPressureForm({ onAdd }: { onAdd: (e: BloodPressureEntry) => void }) {
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [pulse, setPulse] = useState("");
  const submit = () => {
    const s = Number(systolic);
    const d = Number(diastolic);
    if (!s || !d) return;
    onAdd({
      id: crypto.randomUUID(),
      time: new Date().toTimeString().slice(0, 5),
      systolic: s,
      diastolic: d,
      pulse: pulse ? Number(pulse) : undefined,
    });
    setSystolic("");
    setDiastolic("");
    setPulse("");
  };
  return (
    <div className="grid grid-cols-3 gap-2">
      <Field label="Systolic">
        <Input inputMode="numeric" className="h-11" value={systolic} onChange={(e) => setSystolic(e.target.value)} />
      </Field>
      <Field label="Diastolic">
        <Input inputMode="numeric" className="h-11" value={diastolic} onChange={(e) => setDiastolic(e.target.value)} />
      </Field>
      <Field label="Pulse (opt.)">
        <Input inputMode="numeric" className="h-11" value={pulse} onChange={(e) => setPulse(e.target.value)} />
      </Field>
      <Button type="button" className="col-span-3 h-11" onClick={submit}>
        Log blood pressure
      </Button>
    </div>
  );
}

export function BloodSugarForm({ onAdd }: { onAdd: (e: BloodSugarEntry) => void }) {
  const [value, setValue] = useState("");
  const [context, setContext] = useState<BloodSugarEntry["context"]>("fasting");
  const submit = () => {
    const v = Number(value);
    if (!v) return;
    onAdd({ id: crypto.randomUUID(), time: new Date().toTimeString().slice(0, 5), value: v, context });
    setValue("");
  };
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Value (mmol/L)">
          <Input inputMode="decimal" className="h-11" value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
        <Field label="Context">
          <select
            className="h-11 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={context}
            onChange={(e) => setContext(e.target.value as BloodSugarEntry["context"])}
          >
            <option value="fasting">Fasting</option>
            <option value="before-meal">Before meal</option>
            <option value="after-meal">After meal</option>
            <option value="bedtime">Bedtime</option>
          </select>
        </Field>
      </div>
      <Button type="button" className="h-11 w-full" onClick={submit}>
        Log blood sugar
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Kick counter                                                       */
/* ------------------------------------------------------------------ */

export function KickCounter({
  sessions,
  onSave,
  onDelete,
}: {
  sessions: KickSession[];
  onSave: (s: KickSession) => void;
  onDelete: (id: string) => void;
}) {
  const [active, setActive] = useState<{ startedAt: number; count: number } | null>(null);
  const [, forceTick] = useState(0);

  useMemo(() => {
    if (!active) return;
    const t = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [active]);

  const elapsedSec = active ? Math.floor((Date.now() - active.startedAt) / 1000) : 0;

  const start = () => setActive({ startedAt: Date.now(), count: 0 });
  const tap = () => setActive((a) => (a ? { ...a, count: a.count + 1 } : a));
  const save = () => {
    if (!active) return;
    onSave({
      id: crypto.randomUUID(),
      time: new Date().toTimeString().slice(0, 5),
      count: active.count,
      minutes: Math.max(1, Math.round(elapsedSec / 60)),
    });
    setActive(null);
  };
  const cancel = () => setActive(null);

  return (
    <div>
      {!active ? (
        <Button type="button" className="h-11 w-full" onClick={start}>
          Start kick session
        </Button>
      ) : (
        <div className="rounded-2xl bg-tint p-4 text-center ring-1 ring-border/40">
          <p className="text-xs text-muted-foreground">
            {Math.floor(elapsedSec / 60)}:{String(elapsedSec % 60).padStart(2, "0")} elapsed
          </p>
          <button
            type="button"
            aria-label="Tap to count a kick"
            onClick={tap}
            className="mx-auto mt-3 flex h-32 w-32 items-center justify-center rounded-full bg-primary text-4xl font-serif text-primary-foreground shadow-lg active:scale-95"
          >
            {active.count}
          </button>
          <div className="mt-4 flex gap-2">
            <Button type="button" variant="outline" className="h-11 flex-1" onClick={cancel}>
              Cancel
            </Button>
            <Button type="button" className="h-11 flex-1" onClick={save}>
              Save session
            </Button>
          </div>
        </div>
      )}
      {sessions.length > 0 && (
        <ul className="mt-3 space-y-1">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between rounded-xl bg-tint px-3 py-2 text-sm ring-1 ring-border/40">
              <span>
                {s.time} · {s.count} kicks{s.minutes ? ` in ${s.minutes} min` : ""}
              </span>
              <button type="button" aria-label="Delete session" onClick={() => onDelete(s.id)} className="flex h-11 w-11 items-center justify-center text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Contraction timer                                                  */
/* ------------------------------------------------------------------ */

export function ContractionTimer({
  contractions,
  onAdd,
  onDelete,
}: {
  contractions: Contraction[];
  onAdd: (c: Contraction) => void;
  onDelete: (id: string) => void;
}) {
  const [runningStart, setRunningStart] = useState<number | null>(null);
  const [, forceTick] = useState(0);

  useMemo(() => {
    if (!runningStart) return;
    const t = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [runningStart]);

  const elapsedSec = runningStart ? Math.floor((Date.now() - runningStart) / 1000) : 0;

  const start = () => setRunningStart(Date.now());
  const stop = () => {
    if (!runningStart) return;
    onAdd({
      id: crypto.randomUUID(),
      start: new Date(runningStart).toISOString(),
      durationSec: Math.max(1, Math.floor((Date.now() - runningStart) / 1000)),
    });
    setRunningStart(null);
  };

  const sorted = [...contractions].sort((a, b) => a.start.localeCompare(b.start));
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    intervals.push((new Date(sorted[i].start).getTime() - new Date(sorted[i - 1].start).getTime()) / 60000);
  }
  const avgDuration = sorted.length ? sorted.reduce((a, b) => a + b.durationSec, 0) / sorted.length : 0;
  const avgInterval = intervals.length ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0;

  return (
    <div>
      {!runningStart ? (
        <Button type="button" className="h-11 w-full" onClick={start}>
          Start contraction
        </Button>
      ) : (
        <Button type="button" variant="destructive" className="h-11 w-full" onClick={stop}>
          Stop — {elapsedSec}s
        </Button>
      )}
      {sorted.length > 0 && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-tint p-2 ring-1 ring-border/40">
              <p className="text-[10px] uppercase text-muted-foreground">Avg duration</p>
              <p className="font-serif text-lg">{Math.round(avgDuration)}s</p>
            </div>
            <div className="rounded-xl bg-tint p-2 ring-1 ring-border/40">
              <p className="text-[10px] uppercase text-muted-foreground">Avg interval</p>
              <p className="font-serif text-lg">{avgInterval ? `${avgInterval.toFixed(1)}m` : "—"}</p>
            </div>
          </div>
          <ul className="mt-3 space-y-1">
            {sorted
              .slice()
              .reverse()
              .map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-xl bg-tint px-3 py-2 text-sm ring-1 ring-border/40">
                  <span>
                    {new Date(c.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {c.durationSec}s
                  </span>
                  <button type="button" aria-label="Delete contraction" onClick={() => onDelete(c.id)} className="flex h-11 w-11 items-center justify-center text-muted-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
          </ul>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Appointments                                                       */
/* ------------------------------------------------------------------ */

const KIND_LABELS: Record<PregnancyAppointment["kind"], string> = {
  checkup: "Checkup",
  ultrasound: "Ultrasound",
  test: "Test",
  class: "Class",
  other: "Other",
};

export function AppointmentForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: PregnancyAppointment;
  onSave: (a: PregnancyAppointment) => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState<PregnancyAppointment["kind"]>(initial?.kind ?? "checkup");
  const [date, setDate] = useState(initial?.date ?? toKey(new Date()));
  const [time, setTime] = useState(initial?.time ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [doctor, setDoctor] = useState(initial?.doctor ?? "");
  const [result, setResult] = useState(initial?.result ?? "");
  const [note, setNote] = useState(initial?.note ?? "");

  const submit = () => {
    if (!title.trim()) return;
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      kind,
      date,
      time: time || undefined,
      title: title.trim(),
      doctor: doctor || undefined,
      result: result || undefined,
      note: note || undefined,
    });
  };

  return (
    <div className="space-y-2 rounded-2xl bg-tint p-3 ring-1 ring-border/40">
      <Field label="Kind">
        <select
          className="h-11 w-full rounded-md border border-input bg-background px-2 text-sm"
          value={kind}
          onChange={(e) => setKind(e.target.value as PregnancyAppointment["kind"])}
        >
          {Object.entries(KIND_LABELS).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Date">
          <Input type="date" className="h-11" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Time">
          <Input type="time" className="h-11" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>
      <Field label="Title">
        <Input className="h-11" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="20-week scan" />
      </Field>
      <Field label="Doctor">
        <Input className="h-11" value={doctor} onChange={(e) => setDoctor(e.target.value)} />
      </Field>
      {kind === "ultrasound" && (
        <Field label="Result / measurements">
          <Textarea value={result} onChange={(e) => setResult(e.target.value)} />
        </Field>
      )}
      <Field label="Note">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="h-11 flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" className="h-11 flex-1" onClick={submit}>
          Save
        </Button>
      </div>
    </div>
  );
}

export function AppointmentList({
  appointments,
  onEdit,
  onDelete,
}: {
  appointments: PregnancyAppointment[];
  onEdit: (a: PregnancyAppointment) => void;
  onDelete: (id: string) => void;
}) {
  const todayK = toKey(new Date());
  const upcoming = appointments.filter((a) => a.date >= todayK).sort((a, b) => a.date.localeCompare(b.date));
  const past = appointments.filter((a) => a.date < todayK).sort((a, b) => b.date.localeCompare(a.date));

  const Row = ({ a }: { a: PregnancyAppointment }) => (
    <li className="rounded-xl bg-tint px-3 py-2 ring-1 ring-border/40">
      <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => onEdit(a)}>
        <span className="text-sm">
          <span className="font-medium">{a.title}</span>{" "}
          <span className="text-xs text-muted-foreground">
            ({KIND_LABELS[a.kind]}) · {fromKey(a.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            {a.time ? ` ${a.time}` : ""}
          </span>
        </span>
      </button>
      {(a.doctor || a.result || a.note) && (
        <p className="mt-1 text-xs text-muted-foreground">
          {[a.doctor, a.result, a.note].filter(Boolean).join(" · ")}
        </p>
      )}
      <div className="mt-1 flex justify-end">
        <button
          type="button"
          aria-label={`Delete ${a.title}`}
          onClick={() => onDelete(a.id)}
          className="flex h-11 w-11 items-center justify-center text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </li>
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1 text-xs font-semibold text-foreground">Upcoming</p>
        {upcoming.length === 0 ? (
          <p className="text-xs text-muted-foreground">No upcoming appointments.</p>
        ) : (
          <ul className="space-y-1.5">
            {upcoming.map((a) => (
              <Row key={a.id} a={a} />
            ))}
          </ul>
        )}
      </div>
      {past.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold text-foreground">Past</p>
          <ul className="space-y-1.5">
            {past.map((a) => (
              <Row key={a.id} a={a} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function exportTimeline(data: BixboData): string {
  const p = data.pregnancy;
  const lines: string[] = ["# Pregnancy timeline", ""];
  if (p?.lmp) lines.push(`LMP: ${p.lmp}`);
  if (p?.dueDate) lines.push(`Due date: ${p.dueDate}`);
  lines.push("");
  lines.push("## Appointments");
  (p?.appointments ?? [])
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((a) => {
      lines.push(`- ${a.date}${a.time ? ` ${a.time}` : ""} — ${a.title} (${a.kind})${a.doctor ? ` w/ ${a.doctor}` : ""}${a.result ? ` — ${a.result}` : ""}`);
    });
  lines.push("");
  lines.push("## Weight & symptoms by day");
  Object.entries(data.dayLogs)
    .filter(([, l]) => l.pregnancy)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([k, l]) => {
      const pl = l.pregnancy!;
      const bits: string[] = [];
      if (pl.weightKg) bits.push(`weight ${pl.weightKg}kg`);
      if (pl.symptoms?.length) bits.push(`symptoms: ${pl.symptoms.join(", ")}`);
      if (pl.note) bits.push(`note: ${pl.note}`);
      if (bits.length) lines.push(`- ${k}: ${bits.join(" · ")}`);
    });
  return lines.join("\n");
}

export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export { addDays };
