import { Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { ArrowLeft } from "@/components/icons/BixboExtraIcons";
import {
  buildHealthDetailPages,
  HealthReportDetailTable,
} from "@/components/health-report/HealthReportDetailParts";
import {
  DetailedTimelineTable,
  HealthReportHeatLegend,
  HealthReportHeatmap,
  HealthReportObservedPatterns,
  HealthReportPainTrend,
  packTimelineDays,
} from "@/components/health-report/HealthReportPdfParts";
import { useI18n } from "@/hooks/useI18n";
import { summarizeMedicationAdherence } from "@/lib/domain/meds";
import { painColor } from "@/lib/domain/pain";
import {
  average,
  countRecordedPrnUses,
  firstRecordedScheduledMedicationDate,
  hasMeaningfulReportDay,
  maxValue,
  minValue,
  mode,
  paginateReportDays,
  reportPeriodLevel,
  summarizeReportDay,
  type ReportDaySummary,
} from "@/lib/healthReport";
import { formatClockTime, formatWeight, unitPrefs, type UnitPreferences } from "@/lib/preferences";
import { BRISTOL, EMPTY, useBixbo, type BixboData } from "@/lib/storage";

type Preset = "7" | "30" | "90" | "365" | "custom";

const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const fromIso = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};
const addDays = (value: string, amount: number) => {
  const date = fromIso(value);
  date.setDate(date.getDate() + amount);
  return iso(date);
};
const dayCount = (start: string, end: string) => {
  let count = 0;
  for (let key = start; key <= end && count < 5000; key = addDays(key, 1)) count += 1;
  return Math.max(1, count);
};
const eachDate = (start: string, end: string) => Array.from({ length: dayCount(start, end) }, (_, index) => addDays(start, index));
const compactNumber = (value: number | undefined) => value == null || !Number.isFinite(value) ? "—" : value.toFixed(1).replace(/\.0$/, "");
const longDate = (key: string, locale: string) => fromIso(key).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
const shortDate = (key: string, locale: string) => fromIso(key).toLocaleDateString(locale, { day: "numeric", month: "short" });
const percentage = (count: number, total: number) => total ? Math.round((count / total) * 100) : 0;
function hasMedicationActivity(date: string, data: BixboData): boolean {
  if (Object.values(data.medLog[date] ?? {}).some(Boolean)) return true;
  if (Object.values(data.medLogItems?.[date] ?? {}).some((items) => items.length > 0)) return true;
  if (Object.values(data.medLogNotes?.[date] ?? {}).some((note) => note.trim().length > 0)) return true;
  return false;
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}

function Sheet({ number, title, subtitle, children }: { number: number; title: string; subtitle?: string; children: React.ReactNode }) {
  return <section className="pdf-sheet">
    <header className="hrHeader"><div><b>BIXBO</b><h1>{title}</h1>{subtitle ? <h3>{subtitle}</h3> : null}</div><span>Health report</span></header>
    {children}
    <footer><span>BIXBO · User-recorded health data</span><span>Page {number}</span></footer>
  </section>;
}

function ReportDocument({ days, data, range, locale, units }: { days: ReportDaySummary[]; data: BixboData; range: string; locale: string; units: UnitPreferences }) {
  const loggedDays = days.filter((day) => hasMeaningfulReportDay(day) || hasMedicationActivity(day.key, data) || Boolean(reportPeriodLevel(day.key, day.log, data.cycle)));
  const painValues = days.map((day) => day.pain);
  const headacheEpisodes = days.flatMap((day) => (day.log.pain ?? []).map((entry) => entry.headacheIntensity).filter((value): value is number => value != null && Number.isFinite(value)));
  const hotFlashEpisodes = days.flatMap((day) => (day.log.pain ?? []).map((entry) => entry.hotFlashes).filter((value): value is number => value != null && Number.isFinite(value)));
  const nauseaEpisodes = days.flatMap((day) => (day.log.pain ?? []).map((entry) => entry.nauseaSeverity).filter((value): value is number => value != null && Number.isFinite(value)));
  const tetanyEpisodes = days.flatMap((day) => (day.log.tetany ?? []).map((entry) => entry.intensity).filter(Number.isFinite));
  const panicEpisodes = days.flatMap((day) => (day.log.panic ?? []).map((entry) => entry.intensity).filter(Number.isFinite));
  const sleepValues = days.map((day) => day.sleep).filter((value): value is number => value != null);
  const bowelTypes = days.flatMap((day) => day.bowelTypes);
  const bowelLogs = days.reduce((total, day) => total + day.bowelTypes.length + day.noBowelMovementCount, 0);
  const noMovement = days.reduce((total, day) => total + day.noBowelMovementCount, 0);
  const commonBowel = mode(bowelTypes);
  const commonBowelLabel = commonBowel == null ? "—" : commonBowel === 0 ? "Type 0" : `Type ${commonBowel}`;

  const weightPoints = days.flatMap((day) => {
    const entries = day.log.weightEntries ?? [];
    if (entries.length) return entries.map((entry) => ({ key: day.key, time: entry.time, value: entry.value }));
    return day.log.weight != null ? [{ key: day.key, time: "", value: day.log.weight }] : [];
  }).filter((point) => Number.isFinite(point.value));
  const latestWeight = weightPoints.at(-1)?.value;

  const symptomFrequency = [
    { label: "Pain", count: days.filter((day) => day.pain != null).length },
    { label: "Headache", count: days.filter((day) => (day.log.pain ?? []).some((entry) => entry.headache || entry.headacheIntensity != null || (entry.headacheTypes?.length ?? 0) > 0)).length },
    { label: "Hot flashes", count: days.filter((day) => (day.log.pain ?? []).some((entry) => entry.hotFlashesOn || (entry.hotFlashes ?? 0) > 0)).length },
    { label: "Tetany", count: days.filter((day) => (day.log.tetany?.length ?? 0) > 0).length },
    { label: "Panic attack", count: days.filter((day) => (day.log.panic?.length ?? 0) > 0).length },
    { label: "Nausea", count: days.filter((day) => (day.log.pain ?? []).some((entry) => entry.nausea || entry.nauseaSeverity != null || (entry.nauseaTypes?.length ?? 0) > 0)).length },
  ];
  const symptomFrequencyDenominator = loggedDays.length;

  const detailPages = buildHealthDetailPages(days, data, units, locale);
  const timelinePages = packTimelineDays([...loggedDays].reverse());
  const timelinePageCount = Math.max(1, timelinePages.length);
  const trendPages = paginateReportDays(days, 30);
  const trendPageCount = Math.max(1, trendPages.length);
  const medicationPage = 2 + trendPageCount;
  const timelineStartPage = medicationPage + 1;
  const detailStartPage = timelineStartPage + timelinePageCount;

  const scheduled = data.meds.filter((med) => !med.asNeeded);
  const asNeeded = data.meds.filter((med) => med.asNeeded);
  const medLogItems = data.medLogItems ?? {};
  const dateKeys = days.map((day) => day.key);
  const extraCounts = new Map<string, { label: string; count: number }>();
  days.forEach((day) => (day.log.extraMeds ?? []).forEach((entry) => {
    const key = entry.name.trim().toLocaleLowerCase();
    const previous = extraCounts.get(key);
    extraCounts.set(key, { label: previous?.label ?? entry.name, count: (previous?.count ?? 0) + 1 });
  }));
  const knownPrnNames = new Set(asNeeded.map((med) => med.name.trim().toLocaleLowerCase()));

  return <div className="hrDoc">
    <Sheet number={1} title="Health Report" subtitle={range}>
      <div className="meta"><span>{loggedDays.length}/{days.length} days with recorded data</span><span>Generated {new Date().toLocaleDateString(locale)}</span></div>
      <h2>At a glance <small>audited calculations</small></h2>
      <div className="metrics ten">
        <Metric label="Pain" value={`${compactNumber(average(painValues))}/10`} note={`daily avg · range ${compactNumber(minValue(painValues))}–${compactNumber(maxValue(painValues))}`} />
        <Metric label="Headache" value={`${compactNumber(average(headacheEpisodes))}/10`} note={`${headacheEpisodes.length} recorded intensities · max ${compactNumber(maxValue(headacheEpisodes))}`} />
        <Metric label="Hot flashes" value={`${compactNumber(average(hotFlashEpisodes))}/5`} note={`${hotFlashEpisodes.length} recorded intensities · max ${compactNumber(maxValue(hotFlashEpisodes))}`} />
        <Metric label="Nausea" value={`${compactNumber(average(nauseaEpisodes))}/10`} note={`${nauseaEpisodes.length} recorded intensities · max ${compactNumber(maxValue(nauseaEpisodes))}`} />
        <Metric label="Tetany" value={`${compactNumber(average(tetanyEpisodes))}/5`} note={`${tetanyEpisodes.length} episodes · max ${compactNumber(maxValue(tetanyEpisodes))}`} />
        <Metric label="Panic" value={`${compactNumber(average(panicEpisodes))}/10`} note={`${panicEpisodes.length} episodes · max ${compactNumber(maxValue(panicEpisodes))}`} />
        <Metric label="Sleep" value={sleepValues.length ? `${compactNumber(average(sleepValues))} h` : "—"} note={`${sleepValues.length} days with hours recorded`} />
        <Metric label="Bowel" value={commonBowelLabel} note={`${bowelLogs} bowel logs · ${noMovement} no movement`} />
        <Metric label="Latest weight" value={latestWeight != null ? formatWeight(latestWeight, units) : "—"} note={`${weightPoints.length} measurements in range`} />
        <Metric label="Coverage" value={`${Math.round((loggedDays.length / Math.max(1, days.length)) * 100)}%`} note={`${loggedDays.length} of ${days.length} days`} />
      </div>
      <div className="overviewGrid">
        <div>
          <h2>Symptom timeline <small>(intensity heatmap)</small></h2>
          <HealthReportHeatmap days={days} locale={locale} data={data} />
          <HealthReportHeatLegend />
          <h2>Pain trend <small>(0–10) · daily average</small></h2>
          <HealthReportPainTrend days={days} locale={locale} />
        </div>
        <div>
          <h2>Symptom frequency <small>(recorded days)</small></h2>
          <div className="bars">{symptomFrequency.map((item) => {
            const pct = percentage(item.count, symptomFrequencyDenominator);
            return <div key={item.label}><span>{item.label}</span><i><b style={{ width: `${Math.max(item.count ? 2 : 0, pct)}%` }} /></i><strong>{item.count} ({pct}%)</strong></div>;
          })}</div>
          <HealthReportObservedPatterns days={days} recordedDayCount={symptomFrequencyDenominator} />
          <div className="coverage"><b>Data coverage</b><p>{days.length - loggedDays.length} of {days.length} days have no meaningful health log. No record is not treated as symptom-free.</p></div>
        </div>
      </div>
      <p className="subnote">Pain averages exclude symptom-only follow-ups. Panic and nausea use their current 1–10 scales; tetany and hot flashes use 1–5. Empty cells mean no recorded intensity, not zero.</p>
    </Sheet>

    {trendPages.map((trendDays, trendIndex) => <Sheet key={`trends-${trendIndex}`} number={2 + trendIndex} title="Trends" subtitle={trendPages.length > 1 ? `${range} · Part ${trendIndex + 1} of ${trendPages.length}` : range}>
      <h2>Pain by day <small>daily average of real pain measurements</small></h2>
      <div className="painBars">{trendDays.map((day) => {
        const value = day.pain;
        const width = value == null ? 0 : Math.max(0, Math.min(100, value * 10));
        const color = value == null ? "#eef0e7" : painColor(value);
        return <div key={day.key}><span>{shortDate(day.key, locale)}</span><i><b style={{ width: `${width}%`, background: color }} /></i><strong>{value == null ? "—" : compactNumber(value)}</strong></div>;
      })}</div>
      {trendIndex === 0 ? <>
        <h2>Bowel distribution <small>Type 0 is valid; no-movement is shown separately</small></h2>
        <div className="bowelBars">{Array.from({ length: 8 }, (_, type) => {
          const count = bowelTypes.filter((value) => value === type).length;
          const label = type === 0 ? "Type 0 — Mystery" : BRISTOL.find((item) => item.n === type)?.label ?? `Type ${type}`;
          const maxCount = Math.max(1, ...Array.from({ length: 8 }, (__, current) => bowelTypes.filter((value) => value === current).length));
          return <div key={type}><span>{label}</span><i><b style={{ width: `${(count / maxCount) * 100}%` }} /></i><strong>{count}</strong></div>;
        })}</div>
        <div className="miniMetrics one"><Metric label="No bowel movement" value={String(noMovement)} note="Recorded explicitly as no movement" /></div>
      </> : null}
    </Sheet>)}

    <Sheet number={medicationPage} title="Medication" subtitle={range}>
      <h2>Scheduled medication adherence <small>granular grouped-dose logic</small></h2>
      {scheduled.length ? <table className="adherenceTable"><thead><tr><th>Medication</th><th>Schedule</th><th>Taken / expected</th><th>Adherence</th></tr></thead><tbody>{scheduled.map((med) => {
        const trackingStart = firstRecordedScheduledMedicationDate(med, data.medLog, medLogItems);
        const adherenceDates = trackingStart ? dateKeys.filter((date) => date >= trackingStart) : dateKeys;
        const summary = summarizeMedicationAdherence(med, adherenceDates, data.medLog, medLogItems, new Date());
        return <tr key={med.id}><td><b>{med.name}</b>{med.dose ? <small>{med.dose}</small> : null}</td><td>{(med.times ?? []).map((time) => formatClockTime(time, units)).join(", ") || "—"}</td><td>{summary ? `${summary.taken} / ${summary.expected}` : "—"}</td><td>{summary ? `${summary.pct}%` : "—"}<div className="adhBar"><i><span style={{ width: `${summary?.pct ?? 0}%` }} /></i></div></td></tr>;
      })}</tbody></table> : <p className="emptyLine">No scheduled medication configured.</p>}
      <p className="adherenceNote">For grouped medication slots, each selected item is counted separately. Future/not-yet-due doses are not treated as missed. When history exists, adherence starts at the first recorded scheduled-medication date.</p>
      <h2>Extra / PRN uses</h2>
      <table className="prnTable"><thead><tr><th>Medication</th><th>Recorded uses</th><th>Source</th></tr></thead><tbody>
        {asNeeded.map((med) => <tr key={med.id}><td>{med.name}{med.dose ? ` · ${med.dose}` : ""}</td><td>{countRecordedPrnUses(med, dateKeys, data.dayLogs, data.medLog)}</td><td>PRN checkbox + matching extra-dose logs</td></tr>)}
        {[...extraCounts.entries()].filter(([key]) => !knownPrnNames.has(key)).map(([key, item]) => <tr key={key}><td>{item.label}</td><td>{item.count}</td><td>Extra-dose logs</td></tr>)}
        {!asNeeded.length && !extraCounts.size ? <tr><td colSpan={3}>No PRN / extra medication use recorded in this period.</td></tr> : null}
      </tbody></table>
    </Sheet>

    {timelinePages.length ? timelinePages.map((pageDays, pageIndex) => <Sheet key={`timeline-${pageIndex}`} number={timelineStartPage + pageIndex} title="Detailed timeline" subtitle={`${range} · Part ${pageIndex + 1} of ${timelinePages.length}`}><p className="subnote">Only days with meaningful recorded data are shown. Newest first.</p><DetailedTimelineTable days={pageDays} data={data} units={units} locale={locale} /></Sheet>) : <Sheet number={timelineStartPage} title="Detailed timeline" subtitle={range}><p className="subnote">Only days with meaningful recorded data are shown. Newest first.</p><DetailedTimelineTable days={[]} data={data} units={units} locale={locale} /></Sheet>}

    {detailPages.length ? detailPages.map((pageRows, pageIndex) => <Sheet key={`details-${pageIndex}`} number={detailStartPage + pageIndex} title="Recorded health details" subtitle={`${range} · Part ${pageIndex + 1} of ${detailPages.length}`}><HealthReportDetailTable rows={pageRows} /></Sheet>) : <Sheet number={detailStartPage} title="Recorded health details" subtitle={range}><div className="empty">No health values were recorded in this period.</div></Sheet>}

    <div className="sr-only">{trendPageCount + 1 + timelinePageCount + Math.max(1, detailPages.length)} report pages after the overview</div>
  </div>;
}

export function HealthReportPageAudited() {
  const { t, language } = useI18n();
  const { data, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const locale = language === "sk" ? "sk-SK" : "en-GB";
  const units = unitPrefs(view);
  const today = iso(new Date());
  const [preset, setPreset] = useState<Preset>("30");
  const [customStart, setCustomStart] = useState(addDays(today, -29));
  const [customEnd, setCustomEnd] = useState(today);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const [start, end] = useMemo(() => preset === "custom"
    ? [customStart <= customEnd ? customStart : customEnd, customStart <= customEnd ? customEnd : customStart]
    : [addDays(today, -(Number(preset) - 1)), today], [preset, customStart, customEnd, today]);
  const days = useMemo(() => eachDate(start, end).map((key) => summarizeReportDay(key, view.dayLogs[key] ?? {}, view.dayNotes?.[key])), [start, end, view.dayLogs, view.dayNotes]);
  const range = `${longDate(start, locale)} – ${longDate(end, locale)} · ${days.length}-day report`;
  const report = <ReportDocument days={days} data={view} range={range} locale={locale} units={units} />;

  const savePdf = async () => {
    if (busy || !previewRef.current) return;
    setBusy(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const sheets = [...previewRef.current.querySelectorAll<HTMLElement>(".pdf-sheet")];
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
      for (let index = 0; index < sheets.length; index += 1) {
        if (index) pdf.addPage("a4", "landscape");
        const canvas = await html2canvas(sheets[index], { scale: 2, backgroundColor: "#fff", useCORS: true, logging: false });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
        const width = canvas.width * ratio;
        const height = canvas.height * ratio;
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.96), "JPEG", (pageWidth - width) / 2, (pageHeight - height) / 2, width, height, undefined, "FAST");
      }
      pdf.save(`BIXBO-Health-Report-${start}-${end}.pdf`);
    } finally {
      setBusy(false);
    }
  };

  return <AppShell title={<Link to="/profile" className="flex items-center gap-2"><ArrowLeft className="h-5 w-5" />{t("PDF reports")}</Link>}>
    <style>{CSS}</style>
    <div className="reportRoot px-4 pb-28 pt-3">
      <div className="controls"><section className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80"><p className="font-serif text-xl font-bold">Health Report</p><p className="mt-1 text-xs text-muted-foreground">Doctor-friendly summary using the current BIXBO data model and audited calculations.</p>
        <div className="presets">{(["7", "30", "90", "365", "custom"] as Preset[]).map((option) => <button type="button" key={option} data-active={preset === option} onClick={() => setPreset(option)}>{option === "365" ? "1 year" : option === "custom" ? "Custom" : `${option} days`}</button>)}</div>
        {preset === "custom" ? <div className="custom"><label><b>From</b><input type="date" value={customStart} max={customEnd} onChange={(event) => setCustomStart(event.target.value || customStart)} /></label><label><b>To</b><input type="date" value={customEnd} min={customStart} onChange={(event) => setCustomEnd(event.target.value || customEnd)} /></label></div> : null}
        <button type="button" className="previewBtn" onClick={() => setPreview(true)}>Preview / Save PDF</button>
      </section></div>
      <div className="screenPreview">{report}</div>
    </div>
    {preview ? <div ref={previewRef} className="modal"><div className="toolbar"><button type="button" onClick={() => setPreview(false)}>← Back</button><span>{range}</span><button type="button" disabled={busy} onClick={savePdf}>{busy ? "Creating PDF…" : "Save PDF"}</button></div>{report}</div> : null}
  </AppShell>;
}

const CSS = String.raw`
.pdf-sheet .heatLegend,
.pdf-sheet .heatLegend span,
.pdf-sheet .trendLegend,
.pdf-sheet .trendLegend span {
  color: #20261d !important;
}
.reportRoot{--olive:#7f8950;--ink:#20261d;--muted:#707668;--line:#dde1cf;--pale:#f7f8f2;--pink:#f29aa5}.controls{max-width:1120px;margin:0 auto 16px}.presets{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin-top:14px}.presets button{height:42px;border:1px solid hsl(var(--border));border-radius:14px;background:hsl(var(--surface));font-size:12px;font-weight:700}.presets button[data-active=true]{background:#f0f3e6;border-color:#90995f;color:#596238}.custom{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.custom label{display:flex;align-items:center;gap:10px;min-height:54px;padding:8px 12px;border:1px solid hsl(var(--border));border-radius:14px;background:hsl(var(--surface));font-size:12px}.custom input{margin-left:auto;min-height:38px;max-width:170px;background:transparent}.previewBtn{margin-top:14px;width:100%;height:44px;border-radius:16px;background:hsl(var(--primary));color:hsl(var(--primary-foreground));font-weight:700}.screenPreview{max-width:1120px;margin:auto;overflow:auto}.hrDoc{display:grid;gap:18px}.pdf-sheet{position:relative;box-sizing:border-box;width:1120px;height:792px;margin:auto;background:#fff;color:var(--ink);padding:28px 40px 42px;font-family:Inter,Arial,sans-serif;box-shadow:0 10px 34px #0001;overflow:hidden}.hrHeader{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:8px}.hrHeader b{font-size:11px;letter-spacing:.36em}.hrHeader h1{font-family:"Instrument Serif",Georgia,serif;font-size:38px;line-height:1;margin:7px 0 0}.hrHeader h3{font-family:"Instrument Serif",Georgia,serif;font-size:14px;margin:3px 0}.hrHeader>span{font-size:8px}.pdf-sheet h2{font-family:"Instrument Serif",Georgia,serif;font-size:19px;margin:10px 0 6px}.pdf-sheet h2 small{font:500 8px Inter;color:var(--olive)}.meta{display:flex;justify-content:flex-end;gap:22px;font-size:8px}.metrics{display:grid;gap:5px}.metrics.ten{grid-template-columns:repeat(10,minmax(0,1fr))}.metric{border:1px solid var(--line);border-radius:9px;padding:7px 8px;min-height:62px;min-width:0}.metric span{font-size:6px;font-weight:700;text-transform:uppercase}.metric strong{display:block;font-family:"Instrument Serif",Georgia,serif;font-size:17px;margin-top:4px;white-space:nowrap}.metric small{display:block;font-size:5.7px;color:var(--muted);margin-top:3px;line-height:1.2}.overviewGrid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(220px,.45fr);gap:22px}.heat{border:1px solid var(--line)}.heatRow{display:grid;grid-template-columns:90px repeat(var(--cells),1fr)}.heatRow span{font-size:6.5px;padding:3px;border-top:1px solid #eef0e7}.heatHead b{font-size:5.8px;text-align:center;padding:2px;color:var(--muted)}.heatRow i{min-height:16px;border-left:1px solid #eef0e7;border-top:1px solid #eef0e7;background:#fff}.heatRow i[data-l="1"]{background:#e5e8d5}.heatRow i[data-l="2"]{background:#c8cda5}.heatRow i[data-l="3"]{background:#a5ad73}.heatRow i[data-l="4"]{background:#5f6b32}.periodCell,.periodKey{background:var(--pink)!important}.heatLegend{display:flex;gap:9px;flex-wrap:wrap;margin:6px 0 2px;font-size:6.2px;color:var(--muted)}.heatLegend span{display:flex;align-items:center;gap:4px}.heatLegend i{width:10px;height:10px;border:1px solid var(--line);display:inline-block}.heatNone{background:#fff}.heatLevel1{background:#e5e8d5}.heatLevel2{background:#c8cda5}.heatLevel3{background:#a5ad73}.heatLevel4{background:#5f6b32}.observedPatterns h2{font-size:14px;margin:9px 0 4px}.chart{width:100%;height:146px;overflow:visible}.chart line{stroke:#e9ecdf}.chart polyline{fill:none;stroke:#7f8950;stroke-width:1.8}.chart text{font-size:7px;fill:#4c5445}.chart .pointLabel{font-weight:700}.trendLegend{display:flex;justify-content:space-between;font-size:6.2px;color:var(--muted)}.trendLegend span:first-child{display:flex;align-items:center;gap:4px}.trendLegend i{width:22px;height:2px;background:var(--olive);display:inline-block}.emptyTrend{height:120px;display:grid;place-items:center;color:var(--muted);font-size:8px}.bars{display:grid;gap:7px}.bars>div{display:grid;grid-template-columns:68px 1fr 48px;gap:6px;align-items:center;font-size:7px}.bars i{height:7px;background:#f0f2e9;border-radius:99px;overflow:hidden}.bars i b{display:block;height:100%;background:#8f9859}.bars strong{text-align:right;white-space:nowrap}.coverage{margin-top:12px;font-size:7px}.coverage p{color:var(--muted);line-height:1.35}.subnote,.adherenceNote{font-size:7.2px;color:var(--muted);margin:7px 0}.miniMetrics{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.miniMetrics.one{grid-template-columns:1fr}.painBars,.bowelBars{display:grid;gap:4px}.painBars{grid-template-columns:repeat(2,minmax(0,1fr));column-gap:22px;max-height:360px;overflow:hidden}.painBars>div,.bowelBars>div{display:grid;grid-template-columns:74px 1fr 28px;gap:6px;align-items:center;font-size:7px}.painBars i,.bowelBars i{display:block;height:7px;background:#f0f2e9;border-radius:99px;overflow:hidden}.painBars i b,.bowelBars i b{display:block;height:100%}.bowelBars i b{background:#8f9859}.painBars strong,.bowelBars strong{text-align:right}.adherenceTable,.prnTable,.detail,.timeline{width:100%;border-collapse:collapse;table-layout:fixed}.adherenceTable,.prnTable{font-size:8.5px}.adherenceTable th,.prnTable th,.detail th,.timeline th{background:#f1f3e9;border:1px solid var(--line);text-align:left}.adherenceTable th,.prnTable th{padding:8px}.adherenceTable td,.prnTable td{padding:9px 8px;border:1px solid var(--line);vertical-align:middle}.adherenceTable td small{display:block;color:var(--muted)}.adhBar i{display:block;height:7px;background:#f0f2e9;margin-top:4px}.adhBar span{display:block;height:100%;background:#6f783d}.prnTable{margin-top:2px}.detail{font-size:7.5px}.detail th{padding:6px}.detail td{padding:6px;border:1px solid var(--line);vertical-align:top;line-height:1.28;overflow-wrap:anywhere}.detail tbody tr:nth-child(even),.timeline tbody tr:nth-child(even){background:#fafbf6}.detail th:nth-child(1){width:12%}.detail th:nth-child(2){width:20%}.detail th:nth-child(3){width:68%}.timeline{font-size:7.2px}.timeline th,.timeline td{padding:6px;border:1px solid var(--line);vertical-align:top;line-height:1.28;overflow-wrap:anywhere}.timeline th:nth-child(1){width:11%}.timeline th:nth-child(2){width:22%}.timeline th:nth-child(3){width:17%}.timeline th:nth-child(4){width:17%}.timeline th:nth-child(5){width:9%}.timeline th:nth-child(6){width:24%}.empty{height:500px;display:grid;place-items:center;color:var(--muted)}.emptyLine{font-size:9px;color:var(--muted);padding:12px 0}footer{position:absolute;left:40px;right:40px;bottom:18px;border-top:1px solid var(--line);padding-top:6px;display:flex;justify-content:space-between;font-size:6px;color:#8b9084}.modal{position:fixed;inset:0;z-index:10050;overflow:auto;background:#eceee8;padding:72px 14px 28px}.toolbar{position:fixed;z-index:10060;top:max(env(safe-area-inset-top),10px);left:50%;transform:translateX(-50%);width:min(760px,calc(100% - 24px));display:flex;align-items:center;gap:8px;padding:8px;border-radius:16px;background:#fffffff5;box-shadow:0 8px 30px #0002}.toolbar span{flex:1;text-align:center;font-size:9px}.toolbar button{height:38px;border-radius:11px;padding:0 13px;background:#eef1e5;font-size:10px;font-weight:700}.toolbar button:last-child{background:#7f8950;color:#fff}@media(max-width:700px){.presets{grid-template-columns:repeat(3,1fr)}.custom{grid-template-columns:1fr}}@media print{.controls,.toolbar{display:none!important}.screenPreview{display:none!important}.modal{position:static!important;padding:0;background:#fff}.pdf-sheet{box-shadow:none;break-after:page;width:297mm;height:210mm}@page{size:A4 landscape;margin:0}}
`;
