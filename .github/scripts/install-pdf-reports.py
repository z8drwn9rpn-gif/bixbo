from pathlib import Path

reports = r'''import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft } from "@/components/icons/BixboIcons";
import { useI18n } from "@/hooks/useI18n";
import { EMPTY, periodLabel, todayKey, useBixbo, type BixboData, type DayLog } from "@/lib/storage";

type ReportStyle = "soft" | "dashboard" | "journal" | "clinical";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "PDF Reports — BIXBO" }] }),
  component: ReportsPage,
});

const styles: { id: ReportStyle; title: string; subtitle: string; badge: string }[] = [
  { id: "soft", title: "Soft Health Report", subtitle: "Elegant, readable and data-dense — best as the default PDF.", badge: "01" },
  { id: "dashboard", title: "Dashboard Report", subtitle: "Visual trend review with large metrics and charts.", badge: "02" },
  { id: "journal", title: "Journal Summary", subtitle: "A softer daily diary view with one compact card per day.", badge: "03" },
  { id: "clinical", title: "Clinical Export", subtitle: "A restrained doctor-facing report where data takes priority.", badge: "04" },
];

function monthStart(key: string) { return `${key.slice(0, 7)}-01`; }
function monthEnd(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m, 0).toISOString().slice(0, 10);
}
function fmtDate(key: string, locale: string, long = false) {
  const d = new Date(`${key}T12:00:00`);
  return new Intl.DateTimeFormat(locale, long ? { weekday: "short", day: "2-digit", month: "short", year: "numeric" } : { day: "2-digit", month: "short" }).format(d);
}
function rangeLabel(from: string, to: string, locale: string) {
  const a = new Date(`${from}T12:00:00`); const b = new Date(`${to}T12:00:00`);
  const f = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" });
  return `${f.format(a)} – ${f.format(b)}`;
}
function avg(values: number[]) { return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null; }
function hasAnyLog(day?: DayLog) {
  if (!day) return false;
  return Boolean((day.pain?.length ?? 0) || (day.tetany?.length ?? 0) || (day.panic?.length ?? 0) || (day.bowel?.length ?? 0) ||
    (day.workout?.length ?? 0) || (day.food?.length ?? 0) || (day.extraMeds?.length ?? 0) || day.period || day.periodInfo?.level ||
    day.sleepHours != null || day.temperature != null || day.weight != null || Object.values(day.customLogs ?? {}).some((entries) => entries.length));
}
function daySummary(day: DayLog, t: (s: string) => string) {
  const parts: string[] = [];
  const pain = day.pain?.at(-1);
  if (pain) parts.push(`${t("Pain")} ${pain.score}/10`);
  if (pain?.headache) parts.push(`${t("Headache")} ${pain.headacheIntensity ?? ""}/10`.trim());
  if (pain?.hotFlashesOn) parts.push(`${t("Hot flashes")} ${pain.hotFlashes ?? ""}/5`.trim());
  const bowel = day.bowel?.at(-1); if (bowel) parts.push(`${t("Bowel")} Type ${bowel.bristol}`);
  const workout = day.workout?.at(-1); if (workout) parts.push(`${t("Workout")}${workout.kind ? ` · ${t(workout.kind)}` : ""}`);
  if (day.periodInfo?.level || day.period) parts.push(`${t("Period")} · ${t(periodLabel(day.periodInfo?.level || day.period))}`);
  if (day.sleepHours != null) parts.push(`${t("Sleep")} ${day.sleepHours.toFixed(1)} h`);
  if (day.tetany?.length) parts.push(`${t("Tetany")} ${day.tetany.at(-1)?.intensity ?? ""}/5`);
  if (day.panic?.length) parts.push(`${t("Panic attack")} ${day.panic.at(-1)?.intensity ?? ""}/10`);
  return parts;
}

function buildReport(data: BixboData, from: string, to: string, t: (s: string) => string) {
  const keys = Object.keys(data.dayLogs).filter((k) => k >= from && k <= to).sort();
  const days = keys.map((key) => ({ key, day: data.dayLogs[key] })).filter((x) => hasAnyLog(x.day));
  const painScores = days.flatMap(({ day }) => (day.pain ?? []).map((p) => p.score));
  const sleep = days.map(({ day }) => day.sleepHours).filter((v): v is number => v != null);
  const headacheDays = days.filter(({ day }) => day.pain?.some((p) => p.headache)).length;
  const hotFlashDays = days.filter(({ day }) => day.pain?.some((p) => p.hotFlashesOn)).length;
  const bowelDays = days.filter(({ day }) => (day.bowel?.length ?? 0) > 0).length;
  const workoutDays = days.filter(({ day }) => (day.workout?.length ?? 0) > 0).length;
  const notesDays = days.filter(({ key }) => (data.dayNotes[key]?.length ?? 0) > 0).length;
  let medSlots = 0, medTaken = 0;
  const allDates: string[] = [];
  for (let d = new Date(`${from}T12:00:00`); d <= new Date(`${to}T12:00:00`); d.setDate(d.getDate() + 1)) allDates.push(d.toISOString().slice(0, 10));
  allDates.forEach((key) => data.meds.filter((m) => !m.asNeeded).forEach((m) => m.times.forEach((time) => { medSlots++; if (data.medLog[key]?.[`${m.id}@${time}`]) medTaken++; })));
  const adherence = medSlots ? Math.round((medTaken / medSlots) * 100) : null;
  const distribution = [
    [t("Pain"), days.filter(({ day }) => (day.pain?.length ?? 0) > 0).length],
    [t("Meds"), adherence == null ? 0 : Math.round(days.length * adherence / 100)],
    [t("Bowel"), bowelDays], [t("Workout"), workoutDays], [t("Notes"), notesDays],
  ].map(([label, count]) => ({ label: String(label), pct: days.length ? Math.round(Number(count) / days.length * 100) : 0 }));
  return { days, painAvg: avg(painScores), sleepAvg: avg(sleep), headacheDays, hotFlashDays, bowelDays, workoutDays, notesDays, adherence, distribution };
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="pdf-metric"><b>{value}</b><span>{label}</span>{detail ? <small>{detail}</small> : null}</div>;
}
function SectionTitle({ children }: { children: React.ReactNode }) { return <h2 className="pdf-section-title">{children}</h2>; }
function ReportHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return <header className="pdf-header"><div><div className="pdf-brand">BIXBO</div><h1>{title}</h1><p>{subtitle}</p></div><div className="pdf-mark">B</div></header>;
}
function NoteText({ data, date }: { data: BixboData; date: string }) {
  const notes = data.dayNotes[date] ?? [];
  const text = notes.map((n) => typeof n === "string" ? n : n.text).filter(Boolean).join(" · ");
  return text ? <p className="pdf-note">{text}</p> : null;
}

function SoftReport({ data, from, to, locale, t }: any) {
  const r = buildReport(data, from, to, t);
  return <div className="pdf-page pdf-soft">
    <ReportHeader title={`${new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" }).format(new Date(`${from}T12:00:00`)).toUpperCase()} ${t("HEALTH SUMMARY")}`} subtitle={rangeLabel(from, to, locale)} />
    <div className="pdf-hero"><div><span>{t("Monthly overview")}</span><h2>{t("A calm overview instead of an Excel grid")}</h2></div><div className="pdf-metrics two"><Metric label={t("average pain")} value={r.painAvg == null ? "—" : r.painAvg.toFixed(1)} /><Metric label={t("logged days")} value={String(r.days.length)} /></div></div>
    <div className="pdf-columns"><section><SectionTitle>{t("Symptoms")}</SectionTitle><div className="pdf-card-list">
      <div><span>{t("Pain")}</span><b>{r.painAvg == null ? "—" : `${r.painAvg.toFixed(1)} / 10`}</b></div>
      <div><span>{t("Headache days")}</span><b>{r.headacheDays}</b></div><div><span>{t("Hot-flash days")}</span><b>{r.hotFlashDays}</b></div><div><span>{t("Bowel days")}</span><b>{r.bowelDays}</b></div><div><span>{t("Sleep")}</span><b>{r.sleepAvg == null ? "—" : `${r.sleepAvg.toFixed(1)} h`}</b></div>
    </div></section><section><SectionTitle>{t("Medication")}</SectionTitle><div className="pdf-card-list">{data.meds.filter((m:any)=>!m.asNeeded).flatMap((m:any)=>m.times.map((time:string)=><div key={`${m.id}-${time}`}><span>{time}</span><b>{m.name}{m.dose ? ` · ${m.dose}` : ""}</b></div>))}{!data.meds.length && <p>—</p>}</div></section></div>
    <SectionTitle>{t("Daily log")}</SectionTitle><div className="pdf-table">{r.days.slice().reverse().map(({key,day}:any)=><div className="pdf-row" key={key}><b>{fmtDate(key,locale)}</b><span>{daySummary(day,t).join(" · ") || "—"}</span></div>)}</div>
  </div>;
}

function DashboardReport({ data, from, to, locale, t }: any) {
  const r = buildReport(data, from, to, t);
  const trend = r.days.map(({day}:any)=>avg((day.pain??[]).map((p:any)=>p.score)) ?? 0);
  const width=620,height=150; const points=trend.map((v:number,i:number)=>`${trend.length<=1?0:i/(trend.length-1)*width},${height-(v/10)*height}`).join(" ");
  return <div className="pdf-page pdf-dashboard"><ReportHeader title={t("Dashboard Report")} subtitle={rangeLabel(from,to,locale)} />
    <div className="pdf-metrics four"><Metric label={t("Pain")} value={r.painAvg==null?"—":r.painAvg.toFixed(1)} /><Metric label={t("Sleep")} value={r.sleepAvg==null?"—":`${r.sleepAvg.toFixed(1)} h`} /><Metric label={t("Logs")} value={String(r.days.length)} /><Metric label={t("Meds")} value={r.adherence==null?"—":`${r.adherence}%`} /></div>
    <section className="pdf-chart-card"><SectionTitle>{t("Pain trend")}</SectionTitle><p>{t("Large chart with BIXBO olive styling")}</p><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t("Pain trend")}><line x1="0" y1={height} x2={width} y2={height} className="axis"/><polyline points={points} className="trend" fill="none" /></svg></section>
    <section className="pdf-chart-card"><SectionTitle>{t("Log distribution")}</SectionTitle><p>{t("Quick visual summary of what was recorded")}</p><div className="pdf-bars">{r.distribution.map((item:any)=><div key={item.label}><div><span>{item.label}</span><b>{item.pct}%</b></div><i><em style={{width:`${item.pct}%`}} /></i></div>)}</div></section>
    <div className="pdf-callout"><b>{t("BIXBO note")}</b><span>{t("A dashboard-first PDF works well for monthly / yearly exports. Detailed raw rows can continue on later pages.")}</span></div>
  </div>;
}

function JournalReport({ data, from, to, locale, t }: any) {
  const r=buildReport(data,from,to,t);
  return <div className="pdf-page pdf-journal"><ReportHeader title={t("Journal Summary")} subtitle={t("Each day reads like a compact BIXBO diary.")} /><div className="pdf-journal-list">{r.days.slice().reverse().map(({key,day}:any)=><article key={key}><div className="datebox"><strong>{new Date(`${key}T12:00:00`).getDate()}</strong><span>{new Intl.DateTimeFormat(locale,{weekday:"short"}).format(new Date(`${key}T12:00:00`)).toUpperCase()}</span></div><div><small>{fmtDate(key,locale,true).toUpperCase()}</small><h3>{daySummary(day,t).join("   ·   ") || t("No structured logs")}</h3><NoteText data={data} date={key}/></div></article>)}</div></div>;
}

function ClinicalReport({ data, from, to, locale, t }: any) {
  const r=buildReport(data,from,to,t);
  return <div className="pdf-page pdf-clinical"><ReportHeader title={t("BIXBO Health Export")} subtitle={`${t("Reporting period")}: ${rangeLabel(from,to,locale)}`} />
    <SectionTitle>{t("Key metrics")}</SectionTitle><div className="pdf-clinical-grid"><div><span>{t("Pain avg")}</span><b>{r.painAvg==null?"—":`${r.painAvg.toFixed(1)} / 10`}</b></div><div><span>{t("Headache days")}</span><b>{r.headacheDays}</b></div><div><span>{t("Hot-flash days")}</span><b>{r.hotFlashDays}</b></div><div><span>{t("Logged days")}</span><b>{r.days.length}</b></div><div><span>{t("Medication")}</span><b>{r.adherence==null?"—":`${r.adherence}%`}</b></div><div><span>{t("Workout days")}</span><b>{r.workoutDays}</b></div></div>
    <SectionTitle>{t("Notes")}</SectionTitle><p className="pdf-clinical-note">{t("Concise free-text notes appear here without making the report look like Excel.")}</p>
    <SectionTitle>{t("Detailed records")}</SectionTitle><table className="pdf-clinical-table"><thead><tr><th>{t("Date")}</th><th>{t("Pain / symptoms")}</th><th>{t("Context")}</th></tr></thead><tbody>{r.days.slice().reverse().map(({key,day}:any)=><tr key={key}><td>{fmtDate(key,locale)}</td><td>{daySummary(day,t).filter((x:string)=>!/Workout|Meds/.test(x)).join("; ") || "—"}</td><td>{[(day.workout?.length? t("Workout"):""),(day.food?.length?t("Food"):""),(data.dayNotes[key]?.length?t("Notes"):"")].filter(Boolean).join("; ") || "—"}</td></tr>)}</tbody></table>
  </div>;
}

function ReportsPage() {
  const { data, hydrated }=useBixbo(); const view=hydrated?data:EMPTY; const {t,language}=useI18n(); const locale=language==="sk"?"sk-SK":"en-GB";
  const today=todayKey(); const [style,setStyle]=useState<ReportStyle>("soft"); const [from,setFrom]=useState(monthStart(today)); const [to,setTo]=useState(monthEnd(today));
  const report=useMemo(()=>({data:view,from,to,locale,t}),[view,from,to,locale,t]);
  const component=style==="soft"?<SoftReport {...report}/>:style==="dashboard"?<DashboardReport {...report}/>:style==="journal"?<JournalReport {...report}/>:<ClinicalReport {...report}/>;
  return <div className="report-screen min-h-screen bg-background text-foreground"><style>{PRINT_CSS}</style>
    <div className="report-controls sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur"><div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2"><Link to="/profile" className="mr-auto inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold"><ArrowLeft className="h-4 w-4"/>{t("PDF Reports")}</Link><label className="text-[10px] text-muted-foreground">{t("From")}<input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="ml-2 h-9 rounded-xl border border-input bg-background px-2 text-xs"/></label><label className="text-[10px] text-muted-foreground">{t("To")}<input type="date" value={to} onChange={e=>setTo(e.target.value)} className="ml-2 h-9 rounded-xl border border-input bg-background px-2 text-xs"/></label><button type="button" onClick={()=>window.print()} className="h-10 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground">{t("Print / Save PDF")}</button></div></div>
    <div className="report-controls mx-auto grid max-w-6xl grid-cols-2 gap-2 px-4 py-4 lg:grid-cols-4">{styles.map(s=><button key={s.id} onClick={()=>setStyle(s.id)} className={`rounded-2xl border p-3 text-left ${style===s.id?"border-primary bg-primary/10":"border-border bg-surface"}`}><span className="text-[10px] font-bold text-primary">{s.badge}</span><b className="mt-1 block text-xs">{t(s.title)}</b><small className="mt-1 block text-[10px] leading-relaxed text-muted-foreground">{t(s.subtitle)}</small></button>)}</div>
    <main className="report-preview mx-auto max-w-[920px] px-3 pb-20">{component}</main>
  </div>;
}

const PRINT_CSS = `
.pdf-page{--olive:#8f9b5a;--olive2:#dde3c7;--ink:#263128;--muted:#6e776e;--paper:#fffef9;--line:#dfe4d5;background:var(--paper);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,sans-serif;min-height:1120px;padding:42px 46px;margin:14px auto 40px;box-shadow:0 10px 35px rgba(42,52,36,.12);border-radius:24px}.pdf-header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid var(--line);padding-bottom:20px;margin-bottom:25px}.pdf-brand{font:700 12px/1 Inter;letter-spacing:.18em;color:var(--olive);margin-bottom:8px}.pdf-header h1{font:700 31px/1.05 'Instrument Serif',Georgia,serif;margin:0}.pdf-header p{font-size:11px;color:var(--muted);margin:7px 0 0}.pdf-mark{height:52px;width:52px;border-radius:18px;background:var(--olive2);color:var(--olive);display:grid;place-items:center;font:700 27px Georgia}.pdf-section-title{font:700 19px/1.1 'Instrument Serif',Georgia,serif;margin:24px 0 10px}.pdf-hero{display:flex;justify-content:space-between;gap:20px;align-items:center;background:linear-gradient(135deg,#eff2e4,#f9f4e8);border-radius:22px;padding:20px}.pdf-hero span,.pdf-chart-card p{font-size:10px;color:var(--muted)}.pdf-hero h2{font:700 22px/1.15 'Instrument Serif',Georgia,serif;margin:4px 0}.pdf-metrics{display:grid;gap:10px}.pdf-metrics.two{grid-template-columns:repeat(2,110px)}.pdf-metrics.four{grid-template-columns:repeat(4,1fr);margin-bottom:16px}.pdf-metric{background:#f2f4e9;border:1px solid #e1e6d2;border-radius:17px;padding:15px}.pdf-metric b{display:block;font:700 25px/1 'Instrument Serif',Georgia,serif}.pdf-metric span{display:block;font-size:10px;color:var(--muted);margin-top:6px}.pdf-metric small{font-size:9px;color:var(--muted)}.pdf-columns{display:grid;grid-template-columns:1fr 1fr;gap:18px}.pdf-card-list{border:1px solid var(--line);border-radius:18px;overflow:hidden}.pdf-card-list>div{display:flex;justify-content:space-between;gap:16px;padding:10px 12px;font-size:10px;border-top:1px solid var(--line)}.pdf-card-list>div:first-child{border-top:0}.pdf-card-list span{color:var(--muted)}.pdf-table{border:1px solid var(--line);border-radius:18px;overflow:hidden}.pdf-row{display:grid;grid-template-columns:90px 1fr;gap:12px;padding:10px 12px;font-size:10px;border-top:1px solid var(--line)}.pdf-row:first-child{border-top:0}.pdf-row:nth-child(even){background:#f6f7f1}.pdf-row b{color:var(--olive)}.pdf-chart-card{border:1px solid var(--line);border-radius:20px;padding:15px;margin-top:14px}.pdf-chart-card .pdf-section-title{margin:0 0 3px}.pdf-chart-card svg{width:100%;height:160px;margin-top:12px}.pdf-chart-card .axis{stroke:#d9dece;stroke-width:1}.pdf-chart-card .trend{stroke:var(--olive);stroke-width:5;stroke-linejoin:round;stroke-linecap:round}.pdf-bars{display:grid;gap:10px;margin-top:15px}.pdf-bars>div>div{display:flex;justify-content:space-between;font-size:10px;margin-bottom:4px}.pdf-bars i{display:block;height:9px;background:#eef0e8;border-radius:999px;overflow:hidden}.pdf-bars em{display:block;height:100%;background:var(--olive);border-radius:999px}.pdf-callout{display:flex;gap:14px;background:#f2f4e9;border-radius:16px;padding:13px;margin-top:14px;font-size:10px}.pdf-callout b{color:var(--olive);white-space:nowrap}.pdf-journal-list{display:grid;gap:12px}.pdf-journal-list article{display:grid;grid-template-columns:58px 1fr;gap:14px;align-items:center;background:#f5f6ef;border:1px solid var(--line);border-radius:20px;padding:14px}.datebox{height:58px;width:58px;border-radius:17px;background:#dfe5c9;display:grid;place-items:center;align-content:center}.datebox strong{font:700 25px/1 Georgia}.datebox span{font-size:8px;color:var(--olive);margin-top:4px}.pdf-journal-list small{font-size:8px;letter-spacing:.08em;color:var(--muted)}.pdf-journal-list h3{font-size:11px;margin:5px 0 0}.pdf-note{font:italic 10px/1.5 Georgia;color:var(--muted);margin:5px 0 0}.pdf-clinical{--olive:#75804e}.pdf-clinical-grid{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--line);border-radius:14px;overflow:hidden}.pdf-clinical-grid>div{padding:12px;border-left:1px solid var(--line);border-top:1px solid var(--line)}.pdf-clinical-grid>div:nth-child(-n+3){border-top:0}.pdf-clinical-grid>div:nth-child(3n+1){border-left:0}.pdf-clinical-grid span{display:block;font-size:9px;color:var(--muted)}.pdf-clinical-grid b{font-size:15px}.pdf-clinical-note{font-size:10px;color:var(--muted);max-width:520px}.pdf-clinical-table{width:100%;border-collapse:collapse;font-size:9px}.pdf-clinical-table th{text-align:left;background:#eef1e5;padding:9px;border-bottom:1px solid var(--line)}.pdf-clinical-table td{padding:9px;border-bottom:1px solid var(--line);vertical-align:top}.pdf-clinical-table tbody tr:nth-child(even){background:#f8f8f4}
@media(max-width:700px){.pdf-page{min-height:auto;padding:25px 20px;border-radius:18px}.pdf-columns{grid-template-columns:1fr}.pdf-metrics.four{grid-template-columns:repeat(2,1fr)}.pdf-metrics.two{grid-template-columns:repeat(2,minmax(0,1fr))}.pdf-hero{display:block}.pdf-hero .pdf-metrics{margin-top:14px}.pdf-clinical-grid{grid-template-columns:repeat(2,1fr)}.pdf-clinical-grid>div{border-top:1px solid var(--line)!important;border-left:1px solid var(--line)!important}.pdf-clinical-grid>div:nth-child(-n+2){border-top:0!important}.pdf-clinical-grid>div:nth-child(2n+1){border-left:0!important}}
@media print{@page{size:A4;margin:0}.report-controls{display:none!important}.report-screen{background:white!important}.report-preview{max-width:none!important;padding:0!important}.pdf-page{width:210mm;min-height:297mm;margin:0!important;padding:13mm 14mm;box-shadow:none!important;border-radius:0!important;print-color-adjust:exact;-webkit-print-color-adjust:exact}.pdf-row,.pdf-journal-list article,.pdf-chart-card,.pdf-metric{break-inside:avoid}.pdf-header{break-after:avoid}}
`;
'''
Path('src/routes/reports.tsx').write_text(reports, encoding='utf-8')

p=Path('src/routes/profile.tsx')
s=p.read_text(encoding='utf-8')
# add reports callback
s=s.replace('  onNotifications,\n  onAdmin,', '  onNotifications,\n  onReports,\n  onAdmin,',1)
s=s.replace('  onNotifications: () => void;\n  onAdmin?: () => void;', '  onNotifications: () => void;\n  onReports: () => void;\n  onAdmin?: () => void;',1)
# add PDF row before existing Export
needle='''          <HubRow\n            icon={<NoteIcon size={22} />}\n            title="Export"\n            subtitle="Export health data as JSON or CSV"\n            onClick={() => onOpen("export")}\n          />'''
insert='''          <HubRow\n            icon={<NoteIcon size={22} />}\n            title="PDF Reports"\n            subtitle="Create a BIXBO-style printable health report"\n            onClick={onReports}\n          />\n          <div className="ml-[4.5rem] border-t border-border/60" />\n''' + needle
assert needle in s, 'Export HubRow not found'
s=s.replace(needle,insert,1)
# pass callback
needle2='''        onNotifications={() => navigate({ to: "/notifications" as never })}\n        onAdmin={deviceAdminEnabled ? () => navigate({ to: "/admin" as never }) : undefined}'''
replace2='''        onNotifications={() => navigate({ to: "/notifications" as never })}\n        onReports={() => navigate({ to: "/reports" as never })}\n        onAdmin={deviceAdminEnabled ? () => navigate({ to: "/admin" as never }) : undefined}'''
assert needle2 in s, 'HealthHub invocation not found'
s=s.replace(needle2,replace2,1)
p.write_text(s,encoding='utf-8')
print('Installed BIXBO PDF reports route and Profile entry.')
