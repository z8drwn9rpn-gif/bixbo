import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ArrowLeft } from "@/components/icons/BixboIcons";
import { EMPTY, useBixbo, type DayLog, type Med } from "@/lib/storage";
import { useI18n } from "@/hooks/useI18n";

export const Route = createFileRoute("/report")({ component: ReportPage });

type Preset = "7" | "30" | "90" | "365" | "custom";
type MedLog = Record<string, Record<string, boolean>>;
type RDay = {
  key: string;
  log: DayLog;
  pain?: number;
  head?: number;
  flash?: number;
  nausea?: number;
  tetany?: number;
  panic?: number;
  bowel?: number;
  sleep?: number;
  notes: string[];
};

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromIso = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const add = (s: string, n: number) => {
  const d = fromIso(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
const countDays = (a: string, b: string) =>
  Math.max(1, Math.round((fromIso(b).getTime() - fromIso(a).getTime()) / 86400000) + 1);
const avg = (x: number[]) => (x.length ? x.reduce((a, b) => a + b, 0) / x.length : undefined);
const mx = (x: number[]) => (x.length ? Math.max(...x) : undefined);
const num = (x: number | undefined) => (x == null || !Number.isFinite(x) ? "—" : x.toFixed(1));

function daySummary(key: string, log: DayLog, raw: unknown): RDay {
  const p = log.pain ?? [];
  const notes = Array.isArray(raw)
    ? raw
        .map((x) =>
          typeof x === "string"
            ? x
            : typeof x === "object" && x && "text" in x
              ? String((x as { text?: unknown }).text ?? "")
              : "",
        )
        .filter(Boolean)
    : [];
  const vals = p.map((x) => Number(x.score)).filter(Number.isFinite);
  const heads = p.map((x) => x.headacheIntensity).filter((x): x is number => typeof x === "number");
  const flashes = p.map((x) => x.hotFlashes).filter((x): x is number => typeof x === "number");
  const nausea = p.map((x) => x.nauseaSeverity).filter((x): x is number => typeof x === "number");
  return {
    key,
    log,
    pain: avg(vals),
    head: mx(heads),
    flash: mx(flashes),
    nausea: mx(nausea),
    tetany: mx((log.tetany ?? []).map((x) => x.intensity)),
    panic: mx((log.panic ?? []).map((x) => x.intensity)),
    bowel: log.bowel?.at(-1)?.bristol,
    sleep: log.sleepHours,
    notes,
  };
}

function date(k: string, l: string) {
  return new Intl.DateTimeFormat(l, { day: "2-digit", month: "short" }).format(fromIso(k));
}
function longDate(k: string, l: string) {
  return new Intl.DateTimeFormat(l, { day: "2-digit", month: "short", year: "numeric" }).format(fromIso(k));
}
function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <div className="hrMetric"><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div>;
}
function Header({ range, page }: { range: string; page: number }) {
  return <div className="hrHeader"><div><b>BIXBO</b>{page === 1 ? <h1>Health Report</h1> : <h3>Health Report</h3>}</div><span>{range}</span></div>;
}
function Foot({ page, total }: { page: number; total: number }) {
  return <footer><span>BIXBO Health Report · user-recorded health data</span><span>Page {page} of {total}</span></footer>;
}

function symptomFacts(d: RDay) {
  const a: string[] = [];
  if (d.pain != null) a.push(`Pain ${num(d.pain)}/10`);
  if (d.head != null) a.push(`Headache ${num(d.head)}/10`);
  if (d.flash != null) a.push(`Hot flash ${num(d.flash)}/5`);
  if (d.tetany != null) a.push(`Tetany ${num(d.tetany)}/5`);
  if (d.panic != null) a.push(`Panic ${num(d.panic)}/5`);
  if (d.nausea != null) a.push(`Nausea ${num(d.nausea)}/5`);
  if (d.bowel != null) a.push(`Bowel Type ${d.bowel}`);
  return a;
}
function Facts({ d }: { d: RDay }) {
  const a = symptomFacts(d);
  return <>{a.join(" · ") || "—"}</>;
}

function hasMeaningfulDay(d: RDay) {
  const l = d.log;
  return Boolean(
    symptomFacts(d).length ||
      d.notes.length ||
      l.heat?.length ||
      l.food?.length ||
      l.sex?.length ||
      l.extraMeds?.length ||
      l.workout?.length ||
      l.mood?.length ||
      l.energy?.length ||
      l.histamine?.length ||
      (l.customLogs && Object.values(l.customLogs).some((x) => x?.length)) ||
      (l.adminFields && Object.values(l.adminFields).some((x) => x?.length)) ||
      l.period ||
      l.periodInfo?.level ||
      l.sleepHours != null ||
      l.temperature != null ||
      l.temperatureEntries?.length ||
      l.weight != null ||
      l.weightEntries?.length
  );
}

function Heatmap({ days }: { days: RDay[] }) {
  const step = Math.max(1, Math.ceil(days.length / 31));
  const shown = days.filter((_, i) => i % step === 0).slice(0, 31);
  const rows: [string, (d: RDay) => number | undefined, number][] = [
    ["Period / spotting", (d) => (d.log.periodInfo?.level || d.log.period ? 1 : undefined), 1],
    ["Pain", (d) => d.pain, 10],
    ["Headache", (d) => d.head, 10],
    ["Hot flashes", (d) => d.flash, 5],
    ["Tetany", (d) => d.tetany, 5],
    ["Panic attack", (d) => d.panic, 5],
    ["Nausea", (d) => d.nausea, 5],
  ];
  return <div className="heat">
    <div className="heatRow heatHead"><span></span>{shown.map((d) => <b key={d.key}>{fromIso(d.key).getDate()}</b>)}</div>
    {rows.map(([name, get, scale], ri) => (
      <div className="heatRow" key={name}>
        <span>{name}</span>
        {shown.map((d) => {
          const v = get(d);
          const lev = v == null ? 0 : Math.max(1, Math.min(4, Math.ceil((v / scale) * 4)));
          return <i key={d.key} data-l={lev} data-period={ri === 0 && v != null ? "true" : undefined} />;
        })}
      </div>
    ))}
  </div>;
}

function Trend({ days, locale }: { days: RDay[]; locale: string }) {
  const pts = days
    .map((d, i) => (d.pain == null ? null : { i, v: d.pain, key: d.key }))
    .filter((x): x is { i: number; v: number; key: string } => !!x);
  if (pts.length < 2) return <div className="empty">Not enough pain data for a trend.</div>;
  const w = 660, h = 205, left = 38, right = 12, top = 22, bottom = 42, den = Math.max(1, days.length - 1);
  const x = (i: number) => left + (i / den) * (w - left - right);
  const y = (v: number) => h - bottom - (v / 10) * (h - top - bottom);
  const segments: typeof pts[] = [];
  let seg: typeof pts = [];
  pts.forEach((p, idx) => {
    if (idx && p.i !== pts[idx - 1].i + 1) {
      if (seg.length) segments.push(seg);
      seg = [];
    }
    seg.push(p);
  });
  if (seg.length) segments.push(seg);
  const tickEvery = Math.max(1, Math.ceil(days.length / 9));
  return <div>
    <svg viewBox={`0 0 ${w} ${h}`} className="chart" role="img" aria-label="Pain trend 0 to 10 over selected dates">
      {[0, 2, 4, 6, 8, 10].map((v) => (
        <g key={v}>
          <line x1={left} x2={w - right} y1={y(v)} y2={y(v)} />
          <text className="axisLabel" x={left - 8} y={y(v) + 3} textAnchor="end">{v}</text>
        </g>
      ))}
      {days.map((d, i) => (i % tickEvery === 0 || i === days.length - 1) ? (
        <g key={d.key}>
          <line className="tick" x1={x(i)} x2={x(i)} y1={h - bottom} y2={h - bottom + 4} />
          <text className="xLabel" x={x(i)} y={h - 14} textAnchor="middle">{date(d.key, locale)}</text>
        </g>
      ) : null)}
      {segments.map((s, i) => s.length > 1 ? <polyline key={i} points={s.map((p) => `${x(p.i)},${y(p.v)}`).join(" ")} /> : null)}
      {pts.map((p) => (
        <g key={p.key}>
          <circle cx={x(p.i)} cy={y(p.v)} r="3.4" />
          <text className="pointLabel" x={x(p.i)} y={y(p.v) - 8} textAnchor="middle">{num(p.v)}</text>
        </g>
      ))}
    </svg>
    <div className="trendLegend">
      <span><i className="lineKey" />Pain (daily value)</span>
      <span>Missing days = no recorded pain value, not zero</span>
    </div>
  </div>;
}

function tempText(d: RDay) {
  const vals = d.log.temperatureEntries?.map((x) => x.value).filter(Number.isFinite) ?? [];
  if (vals.length) return `Temperature ${vals.map((v) => `${v}°C`).join(", ")}`;
  return d.log.temperature != null ? `Temperature ${d.log.temperature}°C` : "";
}
function treatmentText(d: RDay, meds: Med[], medLog?: MedLog) {
  const out: string[] = [];
  const taken = medLog?.[d.key] ?? {};
  const names = meds.filter((m) => taken[m.id]).map((m) => m.name).filter(Boolean);
  if (names.length) out.push(`Taken: ${names.join(", ")}`);
  const extra = (d.log.extraMeds ?? []).map((x) => `${x.name}${x.dose ? ` ${x.dose}` : ""}`).filter(Boolean);
  if (extra.length) out.push(`Extra: ${extra.join(", ")}`);
  if (d.log.heat?.some((x) => x.kind === "tens")) out.push("TENS");
  return out.join(" · ") || "—";
}
function contextText(d: RDay) {
  const out: string[] = [];
  if (d.log.workout?.length) out.push(`Workout: ${d.log.workout.map((x) => `${x.kind}${x.minutes ? ` ${x.minutes} min` : ""}`).join(", ")}`);
  if (d.sleep != null) out.push(`Sleep ${num(d.sleep)} h`);
  const temp = tempText(d); if (temp) out.push(temp);
  if (d.log.periodInfo?.level || d.log.period) out.push(`Period / spotting: ${d.log.periodInfo?.level || d.log.period}`);
  if (d.log.food?.length) out.push(`Food logged (${d.log.food.length})`);
  if (d.notes.length) out.push(d.notes.join(" · "));
  return out.join(" · ") || "—";
}
function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function Report({ days, meds, medLog, range, locale }: { days: RDay[]; meds: Med[]; medLog?: MedLog; range: string; locale: string }) {
  const logged = days.filter(hasMeaningfulDay);
  const pain = days.filter((d) => d.pain != null), head = days.filter((d) => d.head != null), flash = days.filter((d) => d.flash != null);
  const tet = days.filter((d) => d.tetany != null), panic = days.filter((d) => d.panic != null), nausea = days.filter((d) => d.nausea != null);
  const sleep = days.filter((d) => d.sleep != null), bowel = days.filter((d) => d.bowel != null), period = days.filter((d) => d.log.periodInfo?.level || d.log.period);
  const pAvg = avg(pain.map((d) => d.pain!)), pMax = mx(pain.map((d) => d.pain!));
  const hAvg = avg(head.map((d) => d.head!)), hMax = mx(head.map((d) => d.head!));
  const fAvg = avg(flash.map((d) => d.flash!)), fMax = mx(flash.map((d) => d.flash!)), sAvg = avg(sleep.map((d) => d.sleep!));
  const common = bowel.length
    ? Object.entries(bowel.reduce((m, d) => { m[d.bowel!] = (m[d.bowel!] ?? 0) + 1; return m; }, {} as Record<number, number>))
        .sort((a, b) => b[1] - a[1])[0]?.[0]
    : undefined;
  const pct = (n: number) => days.length ? Math.round((n / days.length) * 100) : 0;
  const symptoms: [string, RDay[], number | undefined, number | undefined, string][] = [
    ["Pain", pain, pAvg, pMax, "/10"],
    ["Headache", head, hAvg, hMax, "/10"],
    ["Hot flashes", flash, fAvg, fMax, "/5"],
    ["Tetany", tet, avg(tet.map((d) => d.tetany!)), mx(tet.map((d) => d.tetany!)), "/5"],
    ["Panic attack", panic, undefined, mx(panic.map((d) => d.panic!)), "/5"],
    ["Nausea", nausea, avg(nausea.map((d) => d.nausea!)), mx(nausea.map((d) => d.nausea!)), "/5"],
  ];
  const scheduled = meds.filter((m) => m.times?.length);
  const extra = new Map<string, { n: number; dates: string[] }>();
  days.forEach((d) => (d.log.extraMeds ?? []).forEach((x) => {
    const k = x.name || "Extra medication", v = extra.get(k) ?? { n: 0, dates: [] };
    v.n++; v.dates.push(date(d.key, locale)); extra.set(k, v);
  }));
  const adherence = (m: Med) => {
    if (!medLog) return undefined;
    const trackedDays = days.filter((d) => medLog[d.key] && m.id in medLog[d.key]);
    if (!trackedDays.length) return undefined;
    const taken = trackedDays.filter((d) => medLog[d.key]?.[m.id]).length;
    return Math.round((taken / trackedDays.length) * 100);
  };
  const notable = [...logged].sort((a, b) => (b.pain ?? 0) + (b.head ?? 0) - (a.pain ?? 0) - (a.head ?? 0)).slice(0, 6);
  const patterns: string[] = [];
  if (head.length >= 2) patterns.push(`Headache was recorded on ${head.length} days; ${head.filter((d) => d.pain != null).length} overlapped with a pain record.`);
  if (flash.length >= 2) patterns.push(`Hot flashes were recorded on ${flash.length} days (${pct(flash.length)}% of this range).`);
  if (panic.length) patterns.push(`${panic.length} panic-attack day${panic.length === 1 ? "" : "s"} recorded.`);
  if (bowel.length) patterns.push(`Most common recorded bowel value: Type ${common}.`);

  const timelineRows = [...logged].reverse();
  const maxRowsPerDetailPage = 11;
  const timelinePages = chunk(timelineRows, maxRowsPerDetailPage);
  if (!timelinePages.length) timelinePages.push([]);
  const totalPages = 3 + timelinePages.length;

  return <div className="hrDoc">
    <section className="pdf-sheet">
      <Header range={range} page={1} />
      <div className="meta"><b>Generated</b><span>{new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(new Date())}</span><b>Logged days</b><span>{logged.length} of {days.length} ({pct(logged.length)}%)</span></div>
      <h2>At a glance</h2>
      <div className="metrics six">
        <Metric label="Pain" value={`${num(pAvg)} / 10`} hint={`Max ${num(pMax)} · ${pain.length} days`} />
        <Metric label="Headache" value={`${head.length} days`} hint={`Avg ${num(hAvg)} · max ${num(hMax)}`} />
        <Metric label="Hot flashes" value={`${flash.length} days`} hint={`Avg ${num(fAvg)} · max ${num(fMax)}`} />
        <Metric label="Other symptoms" value={`${tet.length + panic.length + nausea.length}`} hint="Tetany · panic · nausea" />
        <Metric label="Sleep" value={sAvg == null ? "—" : `${num(sAvg)} h`} hint={`${sleep.length} recorded days`} />
        <Metric label="Bowel" value={common ? `Type ${common}` : "—"} hint={`${bowel.length} records`} />
      </div>
      <div className="cols">
        <div>
          <h2>Symptom timeline <small>(intensity heatmap)</small></h2>
          <Heatmap days={days} />
          <div className="legend">
            <span><i data-l="0" />No data</span>
            <span><i data-l="1" />Mild</span>
            <span><i data-l="2" />Moderate</span>
            <span><i data-l="3" />Severe</span>
            <span><i data-l="4" />Very severe</span>
            <span><i data-period="true" />Period / spotting</span>
          </div>
          <h2>Pain trend <small>(0–10)</small></h2>
          <Trend days={days} locale={locale} />
        </div>
        <div>
          <h2>Symptom frequency <small>(days)</small></h2>
          <div className="bars">{symptoms.map(([name, a]) => <div key={name}><span>{name}</span><i><b style={{ width: `${Math.max(2, pct(a.length))}%` }} /></i><strong>{a.length} ({pct(a.length)}%)</strong></div>)}</div>
          <div className="call"><b>Data coverage</b><p>{days.length - logged.length} of {days.length} days have no meaningful health log. Absence of a record is not treated as absence of a symptom.</p></div>
          <h2>Observed patterns</h2>
          <div className="patterns">{patterns.length ? patterns.map((x, i) => <div key={i}><b>{String(i + 1).padStart(2, "0")}</b><span>{x}</span></div>) : <p className="muted">Not enough repeated data for descriptive patterns.</p>}</div>
        </div>
      </div>
      <Foot page={1} total={totalPages} />
    </section>

    <section className="pdf-sheet">
      <Header range={range} page={2} />
      <h2>Symptoms at a glance</h2>
      <table><thead><tr><th>Symptom</th><th>Recorded</th><th>Average</th><th>Maximum</th></tr></thead><tbody>{symptoms.map(([name, a, av, ma, u]) => <tr key={name}><td>{name}</td><td>{a.length} days</td><td>{av == null ? "—" : `${num(av)} ${u}`}</td><td>{ma == null ? "—" : `${num(ma)} ${u}`}</td></tr>)}</tbody></table>
      <h2>Cycle & hormonal tracking</h2>
      <div className="metrics three">
        <Metric label="Period / spotting" value={period.length ? `${period.length} days` : "No record"} hint={period.length ? `${date(period[0].key, locale)} – ${date(period.at(-1)!.key, locale)}` : undefined} />
        <Metric label="Cycle data" value={period.length ? "Tracked" : "—"} hint="Recorded data only" />
        <Metric label="Scheduled medication" value={String(scheduled.length)} hint="medications" />
      </div>
      <h3>Cycle overview</h3>
      <div className="cycle"><span>Period / spotting</span><div>{days.map((d) => <i key={d.key} data-on={Boolean(d.log.periodInfo?.level || d.log.period)} />)}</div></div>
      <h2>Medication</h2>
      <div className="cols equal">
        <div><h3>Regular medication</h3><table className="compact"><thead><tr><th>Medication</th><th>Schedule</th><th>Tracked adherence</th></tr></thead><tbody>{scheduled.length ? scheduled.map((m) => <tr key={m.id}><td>{m.name}{m.dose ? ` · ${m.dose}` : ""}</td><td>{m.times?.join(", ")}</td><td>{adherence(m) == null ? "Not tracked" : `${adherence(m)}%`}</td></tr>) : <tr><td colSpan={3}>No scheduled medication.</td></tr>}</tbody></table></div>
        <div><h3>PRN / extra medication</h3><table className="compact"><thead><tr><th>Medication</th><th>Uses</th><th>Dates</th></tr></thead><tbody>{extra.size ? [...extra].map(([name, x]) => <tr key={name}><td>{name}</td><td>{x.n}</td><td>{x.dates.slice(0, 6).join(", ")}{x.dates.length > 6 ? "…" : ""}</td></tr>) : <tr><td colSpan={3}>No PRN / extra medication records.</td></tr>}</tbody></table></div>
      </div>
      <Foot page={2} total={totalPages} />
    </section>

    <section className="pdf-sheet">
      <Header range={range} page={3} />
      <h2>Other health tracking</h2>
      <div className="metrics four">
        <Metric label="Sleep" value={sAvg == null ? "—" : `${num(sAvg)} h`} hint={`${sleep.length} recorded days`} />
        <Metric label="Bowel" value={common ? `Type ${common}` : "—"} hint={`${bowel.length} records`} />
        <Metric label="TENS" value={`${days.filter((d) => d.log.heat?.some((x) => x.kind === "tens")).length} days`} hint="treatment context" />
        <Metric label="Workout" value={`${days.filter((d) => d.log.workout?.length).length} days`} hint="activity context" />
      </div>
      <h2>Notable recorded days</h2>
      <table><thead><tr><th>Date</th><th>Symptoms</th><th>Treatment / context</th></tr></thead><tbody>{notable.map((d) => <tr key={d.key}><td>{date(d.key, locale)}</td><td><Facts d={d} /></td><td>{[treatmentText(d, meds, medLog), contextText(d)].filter((x) => x !== "—").join(" · ") || "—"}</td></tr>)}</tbody></table>
      <div className="call wide"><b>How to read this page</b><p>Notable days are selected from recorded symptom intensity to help locate dates worth reviewing. They are not diagnoses or alerts.</p></div>
      <h2>Recorded bowel distribution</h2>
      <div className="bowel">{[0, 1, 2, 3, 4, 5, 6, 7].map((v) => { const c = bowel.filter((d) => d.bowel === v).length; return <div key={v}><span>Type {v}</span><i><b style={{ width: `${bowel.length ? (c / bowel.length) * 100 : 0}%` }} /></i><strong>{c}</strong></div>; })}</div>
      <Foot page={3} total={totalPages} />
    </section>

    {timelinePages.map((rows, pageIndex) => {
      const page = 4 + pageIndex;
      return <section className="pdf-sheet detailSheet" key={`detail-${page}`}>
        <Header range={range} page={page} />
        <h2>Detailed timeline</h2>
        <p className="muted">Only days with meaningful recorded data are shown. Newest first.</p>
        <table className="detail">
          <thead><tr><th>Date</th><th>Pain & symptoms</th><th>Medication / treatment</th><th>Context / notes</th></tr></thead>
          <tbody>{rows.length ? rows.map((d) => <tr key={d.key}><td>{longDate(d.key, locale)}</td><td><Facts d={d} /></td><td>{treatmentText(d, meds, medLog)}</td><td>{contextText(d)}</td></tr>) : <tr><td colSpan={4}>No meaningful daily records in this range.</td></tr>}</tbody>
        </table>
        {pageIndex === timelinePages.length - 1 && <div className="disclaimer"><b>About this report</b><p>BIXBO Health Report summarizes user-recorded data. Empty dates mean no value was recorded and are not interpreted as symptom-free days. Observed patterns are descriptive and do not establish diagnosis or causation.</p></div>}
        <Foot page={page} total={totalPages} />
      </section>;
    })}
  </div>;
}

type PickerTarget = "from" | "to";
function CalendarPicker({
  value,
  target,
  min,
  max,
  locale,
  onCancel,
  onApply,
}: {
  value: string;
  target: PickerTarget;
  min?: string;
  max?: string;
  locale: string;
  onCancel: () => void;
  onApply: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const initial = fromIso(value);
  const [month, setMonth] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
  const y = month.getFullYear(), m = month.getMonth();
  const first = new Date(y, m, 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(y, m, 1 - mondayOffset);
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const monthTitle = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(month);
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const selectable = (key: string) => (!min || key >= min) && (!max || key <= max);
  return <div className="calendarOverlay" role="dialog" aria-modal="true" aria-label={`Choose ${target} date`}>
    <div className="calendarCard">
      <div className="calendarTop"><div><small>{target === "from" ? "From" : "To"}</small><strong>{longDate(draft, locale)}</strong></div><button type="button" onClick={onCancel}>×</button></div>
      <div className="calendarNav">
        <button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(y, m - 1, 1))}>‹</button>
        <strong>{monthTitle}</strong>
        <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(y, m + 1, 1))}>›</button>
      </div>
      <div className="calendarGrid calendarWeek">{weekday.map((w) => <span key={w}>{w}</span>)}</div>
      <div className="calendarGrid">{days.map((d) => {
        const key = iso(d), inMonth = d.getMonth() === m, active = key === draft, enabled = selectable(key);
        return <button
          key={key}
          type="button"
          disabled={!enabled}
          data-out={!inMonth}
          data-active={active}
          data-today={key === iso(new Date())}
          onClick={() => enabled && setDraft(key)}
        >{d.getDate()}</button>;
      })}</div>
      <div className="calendarActions"><button type="button" onClick={onCancel}>Cancel</button><button type="button" onClick={() => onApply(draft)}>Done</button></div>
    </div>
  </div>;
}

function ReportPage() {
  const { data, hydrated } = useBixbo();
  const { t, language } = useI18n();
  const view = hydrated ? data : EMPTY;
  const locale = language === "sk" ? "sk-SK" : "en-GB";
  const today = iso(new Date());
  const [preset, setPreset] = useState<Preset>("30");
  const [customStart, setCustomStart] = useState(add(today, -29));
  const [customEnd, setCustomEnd] = useState(today);
  const [picker, setPicker] = useState<PickerTarget | null>(null);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const [start, end] = useMemo(
    () => preset === "custom" ? [customStart, customEnd] : [add(today, -(Number(preset) - 1)), today],
    [preset, customStart, customEnd, today],
  );
  const days = useMemo(
    () => Array.from({ length: countDays(start, end) }, (_, i) => {
      const key = add(start, i);
      return daySummary(key, view.dayLogs[key] ?? {}, view.dayNotes?.[key]);
    }),
    [start, end, view.dayLogs, view.dayNotes],
  );
  const range = `${longDate(start, locale)} – ${longDate(end, locale)} · ${days.length}-day report`;
  const medLog = (view as typeof view & { medLog?: MedLog }).medLog;
  const report = <Report days={days} meds={view.meds} medLog={medLog} range={range} locale={locale} />;

  const applyPicker = (value: string) => {
    if (picker === "from") {
      setCustomStart(value);
      if (value > customEnd) setCustomEnd(value);
    } else if (picker === "to") {
      setCustomEnd(value);
      if (value < customStart) setCustomStart(value);
    }
    setPicker(null);
  };

  const savePdf = async () => {
    if (busy || !previewRef.current) return;
    setBusy(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const sheets = [...previewRef.current.querySelectorAll<HTMLElement>(".pdf-sheet")];
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
      for (let i = 0; i < sheets.length; i++) {
        if (i) pdf.addPage("a4", "landscape");
        const c = await html2canvas(sheets[i], { scale: 2, backgroundColor: "#fff", useCORS: true, logging: false });
        const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
        const ratio = Math.min(pw / c.width, ph / c.height);
        const w = c.width * ratio, h = c.height * ratio;
        pdf.addImage(c.toDataURL("image/jpeg", 0.96), "JPEG", (pw - w) / 2, (ph - h) / 2, w, h, undefined, "FAST");
      }
      pdf.save(`BIXBO-Health-Report-${start}-${end}.pdf`);
    } finally {
      setBusy(false);
    }
  };

  return <AppShell title={<Link to="/profile" className="flex items-center gap-2"><ArrowLeft className="h-5 w-5" />{t("PDF reports")}</Link>}>
    <style>{CSS}</style>
    <div className="reportRoot px-4 pb-28 pt-3">
      <div className="controls">
        <section className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80">
          <p className="font-serif text-xl font-bold">Health Report</p>
          <p className="mt-1 text-xs text-muted-foreground">Doctor-friendly summary of your recorded health data.</p>
          <div className="presets">{(["7", "30", "90", "365", "custom"] as Preset[]).map((x) => <button key={x} type="button" data-active={preset === x} onClick={() => setPreset(x)}>{x === "365" ? "1 year" : x === "custom" ? "Custom" : `${x} days`}</button>)}</div>
          {preset === "custom" && <div className="custom">
            <div className="dateField">
              <label>From</label>
              <button type="button" className="datePickerButton" onClick={() => setPicker("from")}><span>{longDate(customStart, locale)}</span><b>Choose date</b></button>
            </div>
            <div className="dateField">
              <label>To</label>
              <button type="button" className="datePickerButton" onClick={() => setPicker("to")}><span>{longDate(customEnd, locale)}</span><b>Choose date</b></button>
            </div>
          </div>}
          <button type="button" onClick={() => setPreview(true)} className="mt-4 h-11 w-full rounded-2xl bg-primary text-sm font-semibold text-primary-foreground">Preview / Save PDF</button>
        </section>
      </div>
      <div className="screenPreview">{report}</div>
    </div>

    {picker && <CalendarPicker
      target={picker}
      value={picker === "from" ? customStart : customEnd}
      min={picker === "to" ? customStart : undefined}
      max={picker === "from" ? customEnd : undefined}
      locale={locale}
      onCancel={() => setPicker(null)}
      onApply={applyPicker}
    />}

    {preview && <div ref={previewRef} className="modal">
      <div className="toolbar">
        <button type="button" onClick={() => setPreview(false)}>← Back</button>
        <span>{range}</span>
        <button type="button" disabled={busy} onClick={savePdf}>{busy ? "Creating PDF…" : "Save PDF"}</button>
      </div>
      {report}
    </div>}
  </AppShell>;
}

const CSS = String.raw`
.reportRoot{--olive:#90995f;--ink:#20261d;--muted:#707668;--line:#dde1cf;--pale:#f7f8f2;--pink:#e8a49e}
.controls{max-width:1120px;margin:0 auto 16px}
.presets{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin-top:14px}
.presets button{height:42px;border:1px solid hsl(var(--border));border-radius:14px;background:hsl(var(--surface));font-size:12px;font-weight:700}
.presets button[data-active=true]{background:#f0f3e6;border-color:#90995f;color:#596238}
.custom{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
.dateField label{display:block;margin-bottom:5px;font-size:11px;font-weight:700;color:hsl(var(--foreground))}
.datePickerButton{width:100%;min-height:52px;display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid hsl(var(--border));border-radius:14px;padding:0 14px;background:hsl(var(--tint));color:hsl(var(--foreground));text-align:left}
.datePickerButton span{font-size:15px}
.datePickerButton b{font-size:11px;color:hsl(var(--primary));white-space:nowrap}
.calendarOverlay{position:fixed;inset:0;z-index:12000;display:grid;place-items:center;background:rgba(20,25,15,.42);padding:18px}
.calendarCard{width:min(390px,100%);border-radius:24px;background:hsl(var(--surface-elevated));padding:16px;box-shadow:0 24px 70px rgba(0,0,0,.28);border:1px solid hsl(var(--border))}
.calendarTop{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.calendarTop small{display:block;font-size:11px;color:hsl(var(--muted-foreground))}
.calendarTop strong{display:block;margin-top:2px;font-size:18px}
.calendarTop>button{width:38px;height:38px;border-radius:999px;background:hsl(var(--tint));font-size:22px}
.calendarNav{display:grid;grid-template-columns:44px 1fr 44px;align-items:center;gap:8px;margin-top:14px}
.calendarNav button{height:40px;border-radius:12px;background:hsl(var(--tint));font-size:24px}
.calendarNav strong{text-align:center;font-size:14px;text-transform:capitalize}
.calendarGrid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-top:6px}
.calendarWeek span{text-align:center;font-size:10px;color:hsl(var(--muted-foreground));padding:5px 0}
.calendarGrid button{aspect-ratio:1;border-radius:10px;background:hsl(var(--tint));font-size:12px;font-weight:700;color:hsl(var(--foreground))}
.calendarGrid button[data-out=true]{opacity:.45}
.calendarGrid button[data-active=true]{background:hsl(var(--primary));color:hsl(var(--primary-foreground))}
.calendarGrid button[data-today=true]:not([data-active=true]){box-shadow:inset 0 0 0 2px hsl(var(--primary))}
.calendarGrid button:disabled{opacity:.2}
.calendarActions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}
.calendarActions button{height:44px;border-radius:13px;background:hsl(var(--tint));font-size:12px;font-weight:800}
.calendarActions button:last-child{background:hsl(var(--primary));color:hsl(var(--primary-foreground))}
.screenPreview{max-width:1120px;margin:auto;overflow:auto}
.hrDoc{display:grid;gap:18px}
.pdf-sheet{position:relative;box-sizing:border-box;width:1120px;min-height:792px;margin:auto;background:#fff;color:var(--ink);padding:30px 42px 40px;font-family:Inter,ui-sans-serif,system-ui,sans-serif;box-shadow:0 10px 34px rgba(45,55,30,.08);overflow:hidden}
.hrHeader{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid var(--line);padding-bottom:12px;margin-bottom:12px}
.hrHeader b{font-size:12px;letter-spacing:.36em}
.hrHeader h1{font-family:"Instrument Serif",Georgia,serif;font-size:39px;line-height:1;margin:7px 0 0}
.hrHeader h3{font-family:"Instrument Serif",Georgia,serif;font-size:22px;margin:5px 0 0}
.hrHeader>span{font-size:9px;color:var(--olive);padding-top:6px}
.pdf-sheet h2{font-family:"Instrument Serif",Georgia,serif;font-size:20px;margin:12px 0 7px}
.pdf-sheet h2 small{font:500 9px Inter,sans-serif;color:var(--muted)}
.pdf-sheet h3{font-size:10px;margin:9px 0 5px}
.meta{display:flex;justify-content:flex-end;gap:9px;font-size:8px}
.meta b{color:var(--olive);margin-left:12px}
.metrics{display:grid;gap:8px}
.metrics.six{grid-template-columns:repeat(6,1fr)}
.metrics.four{grid-template-columns:repeat(4,1fr)}
.metrics.three{grid-template-columns:repeat(3,1fr)}
.hrMetric{border:1px solid var(--line);background:linear-gradient(#fff,var(--pale));border-radius:13px;padding:10px 11px;min-height:70px}
.hrMetric span{display:block;color:var(--olive);font-size:7px;font-weight:800;text-transform:uppercase}
.hrMetric strong{display:block;font-family:"Instrument Serif",Georgia,serif;font-size:22px;margin-top:5px}
.hrMetric small{display:block;font-size:7px;color:var(--muted);margin-top:3px}
.cols{display:grid;grid-template-columns:1.2fr .8fr;gap:27px}
.cols.equal{grid-template-columns:1fr 1fr}
.heat{border:1px solid var(--line)}
.heatRow{display:grid;grid-template-columns:86px repeat(31,1fr)}
.heatRow span{font-size:7px;padding:4px;border-top:1px solid #eef0e7}
.heatHead b{font-size:6px;text-align:center;padding:3px;color:var(--muted)}
.heatRow i{min-height:18px;border-left:1px solid #eef0e7;border-top:1px solid #eef0e7;background:#fff}
.heatRow i[data-l="1"],.legend i[data-l="1"]{background:#e5e8d5}
.heatRow i[data-l="2"],.legend i[data-l="2"]{background:#c8cda5}
.heatRow i[data-l="3"],.legend i[data-l="3"]{background:#a5ad73}
.heatRow i[data-l="4"],.legend i[data-l="4"]{background:#707b40}
.heatRow i[data-period="true"],.legend i[data-period="true"]{background:var(--pink)!important}
.legend{display:flex;flex-wrap:wrap;align-items:center;gap:8px 13px;font-size:8px;color:#555d4d;margin:7px 0 2px}
.legend span{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
.legend i{width:11px;height:11px;border:1px solid var(--line);background:#fff}
.chart{width:100%;height:185px;overflow:visible}
.chart line{stroke:#e9ecdf}
.chart .tick{stroke:#8c927f}
.chart polyline{fill:none;stroke:#7f8950;stroke-width:2.7}
.chart circle{fill:#7f8950}
.chart text{font-family:Inter,Arial,sans-serif;fill:#51594a}
.chart .axisLabel{font-size:8px;font-weight:600}
.chart .xLabel{font-size:7.3px}
.chart .pointLabel{font-size:7.5px;font-weight:800;fill:#4f5931}
.trendLegend{display:flex;justify-content:space-between;gap:12px;margin-top:2px;font-size:7.5px;color:var(--muted)}
.trendLegend span{display:flex;align-items:center;gap:5px}
.lineKey{display:inline-block;width:20px;height:2px;background:#7f8950}
.empty{height:120px;display:grid;place-items:center;background:var(--pale);font-size:9px;color:var(--muted)}
.bars,.bowel{display:grid;gap:8px}
.bars>div,.bowel>div{display:grid;grid-template-columns:82px 1fr 55px;gap:7px;align-items:center;font-size:8px}
.bars i,.bowel i{height:8px;background:#f0f2e9;border-radius:99px;overflow:hidden}
.bars i b,.bowel i b{display:block;height:100%;background:#929c61}
.call{background:var(--pale);border:1px solid var(--line);border-radius:11px;padding:9px;margin-top:12px;font-size:8px}
.call p{margin:2px 0 0;color:var(--muted)}
.call.wide{margin:14px 0}
.patterns{display:grid;gap:6px}
.patterns>div{display:grid;grid-template-columns:20px 1fr;gap:7px;border:1px solid var(--line);border-radius:9px;padding:7px;font-size:8px}
.patterns b{color:var(--olive)}
table{width:100%;border-collapse:collapse;font-size:8px;table-layout:fixed}
th{background:#f1f3e9;color:#596238;text-align:left;padding:6px;border:1px solid var(--line)}
td{padding:6px;border:1px solid var(--line);vertical-align:top;overflow-wrap:anywhere;line-height:1.28}
tbody tr:nth-child(even){background:#fafbf6}
.compact{font-size:7.5px}
.detail{font-size:9px}
.detail th{font-size:8.5px;padding:8px}
.detail td{padding:8px;line-height:1.35}
.detail th:nth-child(1){width:13%}
.detail th:nth-child(2){width:27%}
.detail th:nth-child(3){width:27%}
.detail th:nth-child(4){width:33%}
.detailSheet .muted{font-size:8.5px;margin-bottom:8px}
.cycle{display:grid;grid-template-columns:90px 1fr;gap:8px;align-items:center;font-size:8px}
.cycle>div{display:grid;grid-template-columns:repeat(auto-fit,minmax(3px,1fr));gap:1px}
.cycle i{height:13px;background:#f2f3ed}
.cycle i[data-on=true]{background:var(--pink)}
.muted{color:var(--muted);font-size:8px}
.disclaimer{position:absolute;left:42px;right:42px;bottom:54px;background:var(--pale);border:1px solid var(--line);border-radius:11px;padding:9px;font-size:8px}
.disclaimer p{margin:2px 0 0;color:var(--muted)}
footer{position:absolute;left:42px;right:42px;bottom:18px;border-top:1px solid var(--line);padding-top:6px;display:flex;justify-content:space-between;font-size:6.5px;color:#8b9084}
.modal{position:fixed;inset:0;z-index:10050;overflow:auto;background:#eceee8;padding:72px 14px 28px}
.toolbar{position:fixed;z-index:10060;top:max(env(safe-area-inset-top),10px);left:50%;transform:translateX(-50%);width:min(760px,calc(100% - 24px));display:flex;align-items:center;gap:8px;padding:8px;border-radius:16px;background:#fffffff5;box-shadow:0 8px 30px #0002}
.toolbar span{flex:1;text-align:center;font-size:9px;color:#6d7466}
.toolbar button{height:38px;border-radius:11px;padding:0 13px;background:#eef1e5;font-size:10px;font-weight:700}
.toolbar button:last-child{background:#7f8950;color:#fff}
.toolbar button:disabled{opacity:.55}
@media(max-width:700px){
  .presets{grid-template-columns:repeat(3,1fr)}
  .custom{grid-template-columns:1fr}
  .screenPreview{overflow:auto}
  .datePickerButton{min-height:56px}
}
@media print{
  .controls,.toolbar,header,nav,.bottom-nav,.calendarOverlay{display:none!important}
  .screenPreview{display:none!important}
  .modal{position:static!important;padding:0;background:#fff}
  .pdf-sheet{box-shadow:none;break-after:page;width:297mm;min-height:210mm}
  @page{size:A4 landscape;margin:0}
}
`;
