import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ArrowLeft } from "@/components/icons/BixboIcons";
import { EMPTY, useBixbo, type DayLog, type Med } from "@/lib/storage";
import { useI18n } from "@/hooks/useI18n";

export const Route = createFileRoute("/report")({ component: ReportPage });

type ReportStyle = "soft" | "dashboard" | "journal" | "clinical";

type ReportDay = {
  key: string;
  log: DayLog;
  painAvg?: number;
  headache?: number;
  hotFlash?: number;
  bowel?: number;
  sleep?: number;
  workout: boolean;
  notes: string[];
};

const STYLE_OPTIONS: { id: ReportStyle; title: string; subtitle: string }[] = [
  { id: "soft", title: "Soft Health Report", subtitle: "Elegant, readable and data-dense" },
  { id: "dashboard", title: "Dashboard Report", subtitle: "Visual trends and summary cards" },
  { id: "journal", title: "Journal Summary", subtitle: "Each day as a compact BIXBO diary" },
  { id: "clinical", title: "Clinical Export", subtitle: "Cleaner doctor-facing report" },
];

function n(v: number | undefined, digits = 1) {
  return v == null || !Number.isFinite(v) ? "—" : v.toFixed(digits);
}

function monthLabel(month: string, locale: string) {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
}

function dateLabel(key: string, locale: string, long = false) {
  const [y, m, d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, long ? { weekday: "short", day: "2-digit", month: "short" } : { day: "2-digit", month: "short" }).format(new Date(y, m - 1, d));
}

function summarizeDay(key: string, log: DayLog, dayNotes: unknown): ReportDay {
  const pains = log.pain ?? [];
  const painAvg = pains.length ? pains.reduce((sum, entry) => sum + (Number(entry.score) || 0), 0) / pains.length : undefined;
  const headaches = pains.map((entry) => entry.headacheIntensity).filter((value): value is number => typeof value === "number");
  const hotFlashes = pains.map((entry) => entry.hotFlashes).filter((value): value is number => typeof value === "number");
  const notes = Array.isArray(dayNotes)
    ? dayNotes.map((item) => typeof item === "string" ? item : typeof item === "object" && item && "text" in item ? String((item as { text?: unknown }).text ?? "") : "").filter(Boolean)
    : [];
  return {
    key,
    log,
    painAvg,
    headache: headaches.length ? Math.max(...headaches) : undefined,
    hotFlash: hotFlashes.length ? Math.max(...hotFlashes) : undefined,
    bowel: log.bowel?.at(-1)?.bristol,
    sleep: log.sleepHours,
    workout: Boolean(log.workout?.length),
    notes,
  };
}

function metricCard(label: string, value: string, hint?: string) {
  return <div className="pdf-metric"><span>{label}</span><strong>{value}</strong>{hint ? <small>{hint}</small> : null}</div>;
}

function medicationRows(meds: Med[]) {
  if (!meds.length) return <p className="pdf-muted">No scheduled medication.</p>;
  return <div className="pdf-list">{meds.map((med) => <div key={med.id} className="pdf-row"><strong>{med.times?.join(" · ") || "As needed"}</strong><span>{med.name}{med.dose ? ` · ${med.dose}` : ""}</span></div>)}</div>;
}

function DayFacts({ day }: { day: ReportDay }) {
  const facts: string[] = [];
  if (day.painAvg != null) facts.push(`Pain ${n(day.painAvg)}/10`);
  if (day.headache != null) facts.push(`Headache ${n(day.headache)}/10`);
  if (day.hotFlash != null) facts.push(`Hot flash ${n(day.hotFlash)}/5`);
  if (day.bowel != null) facts.push(`Bowel Type ${day.bowel}`);
  if (day.workout) facts.push("Workout");
  if (day.log.heat?.some((x) => x.kind === "tens")) facts.push("TENS");
  if (day.log.food?.length) facts.push("Food logged");
  if (day.log.extraMeds?.length) facts.push("Extra meds");
  if (day.log.periodInfo?.level) facts.push(`Period ${day.log.periodInfo.level}`);
  return <>{facts.length ? facts.join(" · ") : "Logged day"}</>;
}

function PainTrend({ days }: { days: ReportDay[] }) {
  const pts = days.filter((day) => day.painAvg != null);
  if (pts.length < 2) return <div className="pdf-empty">Not enough pain data for a trend.</div>;
  const width = 640;
  const height = 170;
  const coords = pts.map((day, i) => ({
    x: 18 + (i / Math.max(1, pts.length - 1)) * (width - 36),
    y: height - 18 - ((day.painAvg ?? 0) / 10) * (height - 36),
  }));
  return <svg className="pdf-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Pain trend">
    {[0, 2, 4, 6, 8, 10].map((v) => <line key={v} x1="18" x2={width - 18} y1={height - 18 - (v / 10) * (height - 36)} y2={height - 18 - (v / 10) * (height - 36)} className="pdf-gridline" />)}
    <polyline points={coords.map((p) => `${p.x},${p.y}`).join(" ")} className="pdf-line" />
    {coords.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" className="pdf-dot" />)}
  </svg>;
}

function SoftReport({ title, days, meds, avgPain, loggedDays, locale }: { title: string; days: ReportDay[]; meds: Med[]; avgPain?: number; loggedDays: number; locale: string }) {
  const latest = [...days].reverse().slice(0, 6);
  return <div className="pdf-page pdf-soft">
    <header className="pdf-header"><div><div className="pdf-brand">BIXBO</div><h1>{title.toUpperCase()} HEALTH SUMMARY</h1><p>Monthly overview</p></div><span className="pdf-badge">Soft Health Report</span></header>
    <section><h2>Monthly overview</h2><p className="pdf-muted">A calm overview instead of an Excel grid</p><div className="pdf-metrics">{metricCard("average pain", n(avgPain))}{metricCard("logged days", String(loggedDays))}{metricCard("workout days", String(days.filter((d) => d.workout).length))}{metricCard("sleep avg", `${n(days.filter((d) => d.sleep != null).reduce((a, d) => a + (d.sleep ?? 0), 0) / Math.max(1, days.filter((d) => d.sleep != null).length))} h`)}</div></section>
    <section><h2>Symptoms</h2><p className="pdf-muted">Important values are shown as cards, not raw cells</p><div className="pdf-list">{latest.map((day) => <div key={day.key} className="pdf-row"><strong>{dateLabel(day.key, locale)}</strong><span><DayFacts day={day} /></span></div>)}</div></section>
    <section><h2>Medication</h2><p className="pdf-muted">Clean daily schedule summary</p>{medicationRows(meds)}</section>
    <section><h2>Daily log</h2><p className="pdf-muted">Rows are grouped visually so the PDF feels like the app rather than a spreadsheet.</p><div className="pdf-list">{[...days].reverse().map((day) => <div key={day.key} className="pdf-row"><strong>{dateLabel(day.key, locale)}</strong><span><DayFacts day={day} /></span></div>)}</div></section>
  </div>;
}

function DashboardReport({ title, days, avgPain, loggedDays }: { title: string; days: ReportDay[]; avgPain?: number; loggedDays: number }) {
  const sleepDays = days.filter((d) => d.sleep != null);
  const avgSleep = sleepDays.length ? sleepDays.reduce((a, d) => a + (d.sleep ?? 0), 0) / sleepDays.length : undefined;
  const pct = (count: number) => loggedDays ? `${Math.round(count / loggedDays * 100)}%` : "0%";
  return <div className="pdf-page pdf-dashboard">
    <header className="pdf-header"><div><div className="pdf-brand">BIXBO</div><h1>{title}</h1><p>Dashboard Report</p></div></header>
    <div className="pdf-metrics pdf-metrics-4">{metricCard("Pain", n(avgPain))}{metricCard("Sleep", avgSleep == null ? "—" : `${n(avgSleep)} h`)}{metricCard("Logs", String(loggedDays))}{metricCard("Workouts", String(days.filter((d) => d.workout).length))}</div>
    <section><h2>Pain trend</h2><p className="pdf-muted">Large chart with BIXBO olive styling</p><PainTrend days={days} /></section>
    <section><h2>Log distribution</h2><p className="pdf-muted">Quick visual summary of what was recorded</p><div className="pdf-bars">
      {[["Pain", days.filter((d) => d.painAvg != null).length],["Bowel", days.filter((d) => d.bowel != null).length],["Workout", days.filter((d) => d.workout).length],["Sleep", sleepDays.length],["Notes", days.filter((d) => d.notes.length).length]].map(([label, count]) => <div key={String(label)}><div className="pdf-bar-label"><span>{label}</span><strong>{pct(Number(count))}</strong></div><div className="pdf-bar-track"><i style={{ width: pct(Number(count)) }} /></div></div>)}
    </div></section>
    <section className="pdf-note"><strong>BIXBO note</strong><p>A dashboard-first PDF works well for monthly and yearly review. Detailed raw rows can continue on later pages.</p></section>
  </div>;
}

function JournalReport({ title, days, locale }: { title: string; days: ReportDay[]; locale: string }) {
  return <div className="pdf-page pdf-journal"><header className="pdf-header"><div><div className="pdf-brand">BIXBO</div><h1>{title}</h1><p>Journal Summary</p></div></header>
    <div className="pdf-journal-list">{[...days].reverse().map((day) => <article key={day.key} className="pdf-journal-day"><div className="pdf-datebox"><span>{dateLabel(day.key, locale, true).split(" ")[0]}</span><strong>{day.key.slice(-2)}</strong></div><div><h3>{dateLabel(day.key, locale, true)}</h3><p className="pdf-facts"><DayFacts day={day} /></p>{day.notes.length ? <p className="pdf-muted">{day.notes.join(" · ")}</p> : null}</div></article>)}</div>
  </div>;
}

function ClinicalReport({ title, days, meds, avgPain, loggedDays, locale }: { title: string; days: ReportDay[]; meds: Med[]; avgPain?: number; loggedDays: number; locale: string }) {
  return <div className="pdf-page pdf-clinical"><header className="pdf-header"><div><div className="pdf-brand">BIXBO</div><h1>BIXBO Health Export</h1><p>Reporting period: {title}</p></div><span className="pdf-badge">Clinical Export</span></header>
    <section><h2>Key metrics</h2><div className="pdf-metrics">{metricCard("Pain avg", `${n(avgPain)} / 10`)}{metricCard("Headache days", String(days.filter((d) => d.headache != null).length))}{metricCard("Hot-flash days", String(days.filter((d) => d.hotFlash != null).length))}{metricCard("Logged days", String(loggedDays))}</div></section>
    <section><h2>Medication</h2>{medicationRows(meds)}</section>
    <section><h2>Detailed records</h2><table className="pdf-table"><thead><tr><th>Date</th><th>Pain / symptoms</th><th>Context</th></tr></thead><tbody>{[...days].reverse().map((day) => <tr key={day.key}><td>{dateLabel(day.key, locale)}</td><td><DayFacts day={day} /></td><td>{day.notes.join(" · ") || (day.workout ? "Workout" : "—")}</td></tr>)}</tbody></table></section>
  </div>;
}

function ReportPage() {
  const { data, hydrated } = useBixbo();
  const { t, language } = useI18n();
  const view = hydrated ? data : EMPTY;
  const today = new Date();
  const [month, setMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`);
  const [style, setStyle] = useState<ReportStyle>("soft");
  const locale = language === "sk" ? "sk-SK" : "en-GB";

  const days = useMemo(() => Object.entries(view.dayLogs)
    .filter(([key]) => key.startsWith(month))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, log]) => summarizeDay(key, log, view.dayNotes?.[key])), [view.dayLogs, view.dayNotes, month]);

  const painValues = days.flatMap((day) => day.log.pain?.map((entry) => entry.score) ?? []).filter(Number.isFinite);
  const avgPain = painValues.length ? painValues.reduce((a, b) => a + b, 0) / painValues.length : undefined;
  const loggedDays = days.filter((day) => Object.keys(day.log).length > 0 || day.notes.length).length;
  const title = monthLabel(month, locale);

  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const printPreviewRef = useRef<HTMLDivElement | null>(null);

  const savePdf = async () => {
    const page = printPreviewRef.current?.querySelector<HTMLElement>(".pdf-page");
    if (!page || pdfBusy) return;
    setPdfBusy(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const canvas = await html2canvas(page, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = canvas.height * imgWidth / canvas.width;
      const image = canvas.toDataURL("image/jpeg", 0.92);
      let y = 0;
      let remaining = imgHeight;
      pdf.addImage(image, "JPEG", 0, y, imgWidth, imgHeight, undefined, "FAST");
      remaining -= pageHeight;
      while (remaining > 0) {
        y -= pageHeight;
        pdf.addPage();
        pdf.addImage(image, "JPEG", 0, y, imgWidth, imgHeight, undefined, "FAST");
        remaining -= pageHeight;
      }
      pdf.save(`BIXBO-${month}-${style}.pdf`);
    } finally {
      setPdfBusy(false);
    }
  };

  return <AppShell title={<Link to="/profile" className="flex items-center gap-2"><ArrowLeft className="h-5 w-5" />{t("PDF reports")}</Link>}>
    <style data-bixbo-pdf-styles>{`
      .pdf-report-root{--olive:#8f9f54;--olive-dark:#596532;--soft:#f3f5e8;--sand:#f7f2e8;--ink:#283020;--muted:#737a67}.pdf-page{background:#fff;color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,sans-serif;max-width:820px;margin:0 auto;padding:34px;border-radius:28px;box-shadow:0 12px 40px rgba(48,58,30,.08)}.pdf-header{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;border-bottom:1px solid #dfe4cb;padding-bottom:22px;margin-bottom:22px}.pdf-brand{font-size:13px;letter-spacing:.28em;font-weight:800;color:var(--olive-dark)}.pdf-header h1{font-family:"Instrument Serif",Georgia,serif;font-size:31px;line-height:1;margin:8px 0 4px}.pdf-header p,.pdf-muted{color:var(--muted);font-size:12px}.pdf-badge{border:1px solid #dce2c4;background:var(--soft);padding:8px 12px;border-radius:999px;font-size:10px;font-weight:700}.pdf-page section{margin:20px 0}.pdf-page h2{font-family:"Instrument Serif",Georgia,serif;font-size:21px;margin:0 0 3px}.pdf-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}.pdf-metrics-4{grid-template-columns:repeat(4,minmax(0,1fr))}.pdf-metric{background:var(--soft);border:1px solid #e0e6ca;border-radius:18px;padding:14px}.pdf-metric span{display:block;font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}.pdf-metric strong{display:block;font-family:"Instrument Serif",Georgia,serif;font-size:25px;margin-top:4px}.pdf-metric small{color:var(--muted)}.pdf-list{display:grid;gap:7px;margin-top:10px}.pdf-row{display:grid;grid-template-columns:110px 1fr;gap:14px;align-items:start;padding:10px 12px;border-radius:13px;background:#fafbf5}.pdf-row strong{font-size:11px}.pdf-row span{font-size:11px;color:#4c5540}.pdf-chart{display:block;width:100%;height:auto;background:#fbfcf7;border-radius:16px;margin-top:10px}.pdf-gridline{stroke:#e7eadc;stroke-width:1}.pdf-line{fill:none;stroke:var(--olive-dark);stroke-width:3}.pdf-dot{fill:var(--olive)}.pdf-empty{padding:30px;text-align:center;background:#fbfcf7;border-radius:16px;color:var(--muted);font-size:12px}.pdf-bars{display:grid;gap:12px;margin-top:12px}.pdf-bar-label{display:flex;justify-content:space-between;font-size:11px}.pdf-bar-track{height:9px;background:#edf0e3;border-radius:999px;overflow:hidden;margin-top:5px}.pdf-bar-track i{display:block;height:100%;background:var(--olive);border-radius:999px}.pdf-note{background:var(--soft);border-radius:18px;padding:16px}.pdf-note p{font-size:11px;color:var(--muted)}.pdf-journal-list{display:grid;gap:12px}.pdf-journal-day{display:grid;grid-template-columns:62px 1fr;gap:14px;padding:14px;border:1px solid #e1e5d3;border-radius:18px;background:#fbfcf7;break-inside:avoid}.pdf-datebox{display:grid;place-items:center;background:var(--soft);border-radius:14px;padding:7px}.pdf-datebox span{font-size:9px;text-transform:uppercase;color:var(--muted)}.pdf-datebox strong{font-family:"Instrument Serif",Georgia,serif;font-size:27px}.pdf-journal-day h3{font-size:11px;text-transform:uppercase;letter-spacing:.08em;margin:2px 0 7px}.pdf-facts{font-size:12px;font-weight:600}.pdf-table{width:100%;border-collapse:collapse;font-size:10px;margin-top:10px}.pdf-table th{text-align:left;padding:9px;background:var(--soft);color:var(--olive-dark)}.pdf-table td{padding:9px;border-bottom:1px solid #e8ebdf;vertical-align:top}.pdf-table tbody tr:nth-child(even){background:#fbfcf7}.pdf-clinical{border-radius:10px;box-shadow:none;border:1px solid #dfe3d2}.pdf-clinical .pdf-header h1{font-family:Inter,sans-serif;font-weight:700;font-size:25px}.pdf-controls{max-width:820px;margin:0 auto 16px;display:grid;gap:12px}.pdf-style-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.pdf-style-btn{border:1px solid hsl(var(--border));background:hsl(var(--surface));padding:12px;border-radius:16px;text-align:left}.pdf-style-btn[data-active="true"]{border-color:#8f9f54;background:#f3f5e8}.pdf-style-btn strong{display:block;font-size:12px}.pdf-style-btn span{display:block;font-size:10px;color:hsl(var(--muted-foreground));margin-top:2px}
      @media(max-width:640px){.pdf-page{padding:20px;border-radius:20px}.pdf-metrics-4{grid-template-columns:repeat(2,minmax(0,1fr))}.pdf-style-grid{grid-template-columns:1fr}.pdf-row{grid-template-columns:82px 1fr}.pdf-header{gap:12px}.pdf-badge{display:none}}
      @media print{body{background:#fff!important}.pdf-no-print,header,nav,.bottom-nav,.pdf-preview-toolbar{display:none!important}.pdf-print-preview{position:static!important;inset:auto!important;overflow:visible!important;background:#fff!important;padding:0!important}.pdf-print-preview>.pdf-page{display:block!important}.pdf-report-root:not(.pdf-print-preview){display:none!important}.pdf-report-root{position:absolute;inset:0;background:#fff!important}.pdf-page{max-width:none;width:100%;margin:0;padding:11mm;box-shadow:none;border-radius:0;border:none}.pdf-page section,.pdf-journal-day,.pdf-row{break-inside:avoid}.pdf-header{margin-top:0}@page{size:A4;margin:8mm}}
    `}</style>
    <div className="pdf-report-root px-4 pb-28 pt-3 lg:px-0">
      <div className="pdf-controls pdf-no-print">
        <section className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80">
          <p className="font-serif text-xl font-bold">{t("PDF reports")}</p><p className="mt-1 text-xs text-muted-foreground">{t("Choose a report style and month, then save or print as PDF.")}</p>
          <label className="mt-4 block text-xs font-semibold text-muted-foreground">{t("Reporting month")}<input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="mt-1 h-11 w-full rounded-2xl bg-tint px-3 text-sm ring-1 ring-border" /></label>
          <div className="pdf-style-grid mt-4">{STYLE_OPTIONS.map((option) => <button key={option.id} type="button" data-active={style === option.id} onClick={() => setStyle(option.id)} className="pdf-style-btn"><strong>{t(option.title)}</strong><span>{t(option.subtitle)}</span></button>)}</div>
          <button type="button" onClick={() => setPrintPreviewOpen(true)} className="mt-4 h-11 w-full rounded-2xl bg-primary text-sm font-semibold text-primary-foreground">{t("Save / Print PDF")}</button>
        </section>
      </div>
      {style === "soft" ? <SoftReport title={title} days={days} meds={view.meds} avgPain={avgPain} loggedDays={loggedDays} locale={locale} /> : null}
      {style === "dashboard" ? <DashboardReport title={title} days={days} avgPain={avgPain} loggedDays={loggedDays} /> : null}
      {style === "journal" ? <JournalReport title={title} days={days} locale={locale} /> : null}
      {style === "clinical" ? <ClinicalReport title={title} days={days} meds={view.meds} avgPain={avgPain} loggedDays={loggedDays} locale={locale} /> : null}
    </div>

    {printPreviewOpen ? (
      <div ref={printPreviewRef} className="pdf-print-preview fixed inset-0 z-[10050] overflow-y-auto bg-background px-3 pb-24 pt-[max(calc(env(safe-area-inset-top)+.75rem),4rem)]">
        <div className="pdf-preview-toolbar sticky top-0 z-10 mx-auto mb-3 flex max-w-[820px] items-center gap-2 rounded-2xl bg-background/95 p-2 shadow-lg ring-1 ring-border backdrop-blur">
          <button type="button" onClick={() => setPrintPreviewOpen(false)} className="h-10 rounded-xl bg-tint px-4 text-sm font-semibold ring-1 ring-border">← {t("Back")}</button>
          <div className="min-w-0 flex-1 text-center text-xs font-semibold text-muted-foreground">{title}</div>
          <button type="button" onClick={savePdf} disabled={pdfBusy} className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60">{pdfBusy ? t("Creating PDF…") : t("Save PDF")}</button>
        </div>
        {style === "soft" ? <SoftReport title={title} days={days} meds={view.meds} avgPain={avgPain} loggedDays={loggedDays} locale={locale} /> : null}
        {style === "dashboard" ? <DashboardReport title={title} days={days} avgPain={avgPain} loggedDays={loggedDays} /> : null}
        {style === "journal" ? <JournalReport title={title} days={days} locale={locale} /> : null}
        {style === "clinical" ? <ClinicalReport title={title} days={days} meds={view.meds} avgPain={avgPain} loggedDays={loggedDays} locale={locale} /> : null}
      </div>
    ) : null}
  </AppShell>;
}
