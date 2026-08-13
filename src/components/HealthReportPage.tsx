import { Link } from "@tanstack/react-router";
import { useMemo, useRef, useState, type CSSProperties } from "react";
import { AppShell } from "@/components/AppShell";
import { ArrowLeft } from "@/components/icons/BixboIcons";
import { BRISTOL, EMPTY, useBixbo, type DayLog, type Med } from "@/lib/storage";
import { useI18n } from "@/hooks/useI18n";
import { resolveScheduledDose, summarizeMedicationAdherence } from "@/lib/medicationAdherence";

type Preset = "7" | "30" | "90" | "365" | "custom";
type PickerTarget = "from" | "to";
type MedLog = Record<string, Record<string, boolean>>;
type MedLogItems = Record<string, Record<string, string[]>>;
type RDay = {
  key: string;
  log: DayLog;
  pain?: number;
  head?: number;
  flash?: number;
  nausea?: number;
  tetany?: number;
  panic?: number;
  bowelTypes: number[];
  sleep?: number;
  notes: string[];
};

type PainBar = { key: string; label: string; value?: number };

const PAIN_COLORS = [
  "#72C64A", "#91CD3A", "#B7D12F", "#DFD11F", "#F3C30D", "#F5A20B",
  "#F47B16", "#F05A28", "#EF4444", "#DC2626", "#B91C1C",
] as const;
const BRISTOL_MYSTERY = "linear-gradient(135deg,#ef4444,#f59e0b,#eab308,#22c55e,#3b82f6,#8b5cf6)";
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const fromIso = (s: string) => { const [y,m,d] = s.split("-").map(Number); return new Date(y,m-1,d); };
const add = (s: string, n: number) => { const d = fromIso(s); d.setDate(d.getDate()+n); return iso(d); };
const countDays = (a: string,b: string) => Math.max(1,Math.round((+fromIso(b)-+fromIso(a))/86400000)+1);
const avg = (a:number[]) => a.length ? a.reduce((x,y)=>x+y,0)/a.length : undefined;
const mx = (a:number[]) => a.length ? Math.max(...a) : undefined;
const fmt = (x:number|undefined) => x==null || !Number.isFinite(x) ? "—" : x.toFixed(1);
const pct = (a:number,b:number) => b ? Math.round(a/b*100) : 0;
const painColor = (value:number) => PAIN_COLORS[Math.max(0,Math.min(10,Math.round(value)))];
const longDate = (k:string,l:string) => new Intl.DateTimeFormat(l,{day:"2-digit",month:"short",year:"numeric"}).format(fromIso(k));
const shortDate = (k:string,l:string) => new Intl.DateTimeFormat(l,{day:"2-digit",month:"short"}).format(fromIso(k));
const monthLabel = (k:string,l:string) => new Intl.DateTimeFormat(l,{month:"short"}).format(fromIso(k));

function summarize(key:string, log:DayLog, raw:unknown):RDay {
  const p = log.pain ?? [];
  const notes = Array.isArray(raw) ? raw.map(x => typeof x === "string" ? x : typeof x === "object" && x && "text" in x ? String((x as {text?:unknown}).text ?? "") : "").filter(Boolean) : [];
  const scores = p.map(x=>Number(x.score)).filter(Number.isFinite);
  return {
    key, log, notes,
    pain: avg(scores),
    head: mx(p.map(x=>x.headacheIntensity).filter((x):x is number=>typeof x === "number")),
    flash: mx(p.map(x=>x.hotFlashes).filter((x):x is number=>typeof x === "number")),
    nausea: mx(p.map(x=>x.nauseaSeverity).filter((x):x is number=>typeof x === "number")),
    tetany: mx((log.tetany ?? []).map(x=>x.intensity)),
    panic: mx((log.panic ?? []).map(x=>x.intensity)),
    bowelTypes: (log.bowel ?? []).map(x=>Number(x.bristol)).filter(n=>Number.isInteger(n)&&n>=0&&n<=7),
    sleep: log.sleepHours,
  };
}

function facts(d:RDay) {
  const a:string[]=[];
  if(d.pain!=null)a.push(`Pain ${fmt(d.pain)}/10`);
  if(d.head!=null)a.push(`Headache ${fmt(d.head)}/10`);
  if(d.flash!=null)a.push(`Hot flash ${fmt(d.flash)}/5`);
  if(d.tetany!=null)a.push(`Tetany ${fmt(d.tetany)}/5`);
  if(d.panic!=null)a.push(`Panic ${fmt(d.panic)}/5`);
  if(d.nausea!=null)a.push(`Nausea ${fmt(d.nausea)}/5`);
  if(d.bowelTypes.length)a.push(`Bowel ${d.bowelTypes.map(n=>`T${n}`).join(", ")}`);
  return a;
}
function meaningful(d:RDay) {
  const l=d.log;
  return Boolean(facts(d).length||d.notes.length||l.heat?.length||l.food?.length||l.sex?.length||l.extraMeds?.length||l.workout?.length||l.period||l.periodInfo?.level||l.sleepHours!=null||l.temperature!=null||l.temperatureEntries?.length);
}
function Header({range,page}:{range:string;page:number}) {
  return <div className="hrHeader"><div><b>BIXBO</b>{page===1?<h1>Health Report</h1>:<h3>Health Report</h3>}</div><span>{range}</span></div>;
}
function Foot({page,total}:{page:number;total:number}) {
  return <footer><span>BIXBO Health Report · user-recorded health data</span><span>Page {page} of {total}</span></footer>;
}
function Metric({label,value,hint}:{label:string;value:string;hint?:string}) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong>{hint&&<small>{hint}</small>}</div>;
}

function Heatmap({days}:{days:RDay[]}) {
  const buckets = days.length<=31 ? days.map(d=>({key:d.key,label:String(fromIso(d.key).getDate()),days:[d]})) : (()=>{
    const m=new Map<string,RDay[]>();
    days.forEach(d=>{const x=fromIso(d.key),k=`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}`;m.set(k,[...(m.get(k)??[]),d]);});
    return [...m].slice(-12).map(([k,ds])=>({key:k,label:monthLabel(`${k}-01`,"en-GB"),days:ds}));
  })();
  const rows:[string,(d:RDay)=>number|undefined,number][]=[
    ["Period / spotting",d=>d.log.periodInfo?.level||d.log.period?1:undefined,1],
    ["Pain",d=>d.pain,10],["Headache",d=>d.head,10],["Hot flashes",d=>d.flash,5],["Tetany",d=>d.tetany,5],["Panic attack",d=>d.panic,5],["Nausea",d=>d.nausea,5],
  ];
  return <div className="heat" style={{"--cells":buckets.length} as CSSProperties}>
    <div className="heatRow heatHead"><span/>{buckets.map(b=><b key={b.key}>{b.label}</b>)}</div>
    {rows.map(([name,get,scale],ri)=><div className="heatRow" key={name}><span>{name}</span>{buckets.map(b=>{
      const v=avg(b.days.map(get).filter((x):x is number=>x!=null));
      if(v==null)return <i key={b.key}/>;
      if(ri===0)return <i key={b.key} className="periodCell"/>;
      if(name==="Pain")return <i key={b.key} style={{background:painColor(v)}}/>;
      const level=Math.max(1,Math.min(4,Math.ceil(v/scale*4)));
      return <i key={b.key} data-l={level}/>;
    })}</div>)}
  </div>;
}

function DailyPainTrend({days,locale}:{days:RDay[];locale:string}) {
  const pts=days.map((d,i)=>d.pain==null?null:{i,v:d.pain,key:d.key}).filter((x):x is {i:number;v:number;key:string}=>!!x);
  if(pts.length<2)return <div className="empty">Not enough pain data for a trend.</div>;
  const w=650,h=170,L=34,R=10,T=18,B=34,x=(i:number)=>L+i/Math.max(1,days.length-1)*(w-L-R),y=(v:number)=>h-B-v/10*(h-T-B),tick=Math.max(1,Math.ceil(days.length/10));
  const segs:{i:number;v:number;key:string}[][]=[];let seg:{i:number;v:number;key:string}[]=[];
  pts.forEach((p,i)=>{if(i&&p.i!==pts[i-1].i+1){if(seg.length)segs.push(seg);seg=[];}seg.push(p);});if(seg.length)segs.push(seg);
  return <><svg viewBox={`0 0 ${w} ${h}`} className="chart">{[0,2,4,6,8,10].map(v=><g key={v}><line x1={L} x2={w-R} y1={y(v)} y2={y(v)}/><text x={L-7} y={y(v)+3} textAnchor="end">{v}</text></g>)}{days.map((d,i)=>(i%tick===0||i===days.length-1)?<text key={d.key} className="xLabel" x={x(i)} y={h-9} textAnchor="middle">{shortDate(d.key,locale)}</text>:null)}{segs.map((s,i)=>s.length>1?<polyline key={i} points={s.map(p=>`${x(p.i)},${y(p.v)}`).join(" ")}/>:null)}{pts.map(p=><g key={p.key}><circle cx={x(p.i)} cy={y(p.v)} r="3.2" fill={painColor(p.v)}/><text className="pointLabel" x={x(p.i)} y={y(p.v)-7} textAnchor="middle">{fmt(p.v)}</text></g>)}</svg><div className="trendLegend"><span><i/>Pain daily average</span><span>Missing day = no recorded pain value, not zero</span></div></>;
}

function painBarsFor(days:RDay[],locale:string):{mode:"daily"|"monthly";bars:PainBar[]} {
  if(days.length>=300){
    const groups=new Map<string,RDay[]>();
    days.forEach(d=>{const x=fromIso(d.key),k=`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}`;groups.set(k,[...(groups.get(k)??[]),d]);});
    return {mode:"monthly",bars:[...groups].slice(-12).map(([k,ds])=>({key:k,label:monthLabel(`${k}-01`,locale),value:avg(ds.map(d=>d.pain).filter((x):x is number=>x!=null))}))};
  }
  return {mode:"daily",bars:days.map(d=>({key:d.key,label:shortDate(d.key,locale),value:d.pain}))};
}

function PainBars({days,locale}:{days:RDay[];locale:string}) {
  const {mode,bars}=painBarsFor(days,locale),w=980,h=250,L=38,R=12,T=30,B=44,plotW=w-L-R,plotH=h-T-B,maxBars=Math.max(1,bars.length),bw=Math.max(1.2,plotW/maxBars*.72),x=(i:number)=>L+(i+.5)/maxBars*plotW,y=(v:number)=>T+(10-v)/10*plotH,labelEvery=bars.length<=31?Math.max(1,Math.ceil(bars.length/10)):Math.max(1,Math.ceil(bars.length/12));
  return <div><h2>Pain trend <small>(0–10) · {mode==="monthly"?"monthly average":"daily values"}</small></h2><svg viewBox={`0 0 ${w} ${h}`} className="painBarSvg"><g>{[0,2,4,6,8,10].map(v=><g key={v}><line x1={L} x2={w-R} y1={y(v)} y2={y(v)}/><text x={L-8} y={y(v)+3} textAnchor="end">{v}</text></g>)}</g>{bars.map((b,i)=>b.value==null?<rect key={b.key} x={x(i)-bw/2} y={y(0)-2} width={bw} height={2} fill="#e7e9e1"/>:<g key={b.key}><rect x={x(i)-bw/2} y={y(b.value)} width={bw} height={Math.max(2,y(0)-y(b.value))} rx="1.5" fill={painColor(b.value)}/>{bars.length<=45?<text x={x(i)} y={y(b.value)-5} textAnchor="middle" className="barValue">{b.value.toFixed(1)}</text>:null}</g>)}{bars.map((b,i)=>(i%labelEvery===0||i===bars.length-1)?<text key={`${b.key}-l`} x={x(i)} y={h-14} textAnchor="middle" className="barLabel">{mode==="monthly"?b.label:String(fromIso(b.key).getDate())}</text>:null)}</svg><div className="painScaleLegend">{[[0,"0"],[2,"2"],[4,"4"],[6,"6"],[8,"8"],[10,"10"]].map(([v,l])=><span key={l}><i style={{background:painColor(Number(v))}}/>{l}</span>)}<span className="nodata">□ No data</span></div></div>;
}

function BowelChart({days}:{days:RDay[]}) {
  const counts=Array(8).fill(0) as number[];
  days.forEach(d=>d.bowelTypes.forEach(n=>{counts[n]=(counts[n]??0)+1;}));
  const max=Math.max(1,...counts),w=980,h=210,L=38,R=12,T=28,B=42,plotW=w-L-R,plotH=h-T-B,bw=plotW/8*.55,y=(v:number)=>T+(max-v)/max*plotH,x=(i:number)=>L+(i+.5)/8*plotW;
  return <div className="bowelSection"><h2>Bowel frequency <small>(Bristol type counts)</small></h2><svg viewBox={`0 0 ${w} ${h}`} className="bowelSvg"><defs><linearGradient id="bowel0" x1="0" x2="1"><stop offset="0%" stopColor="#ef4444"/><stop offset="20%" stopColor="#f59e0b"/><stop offset="40%" stopColor="#eab308"/><stop offset="60%" stopColor="#22c55e"/><stop offset="80%" stopColor="#3b82f6"/><stop offset="100%" stopColor="#8b5cf6"/></linearGradient></defs><line x1={L} x2={w-R} y1={y(0)} y2={y(0)} stroke="#dfe3d7"/>{counts.map((c,i)=>{const item=BRISTOL.find(b=>b.n===i);return <g key={i}><rect x={x(i)-bw/2} y={c?y(c):y(0)-2} width={bw} height={c?Math.max(2,y(0)-y(c)):2} rx="3" fill={i===0?"url(#bowel0)":item?.color??"#70A65B"}/><text x={x(i)} y={c?y(c)-7:y(0)-7} textAnchor="middle" className="bowelCount">{c}</text><text x={x(i)} y={h-14} textAnchor="middle" className="barLabel">T{i}</text></g>;})}</svg><div className="bowelLegend">{Array.from({length:8},(_,i)=>{const item=BRISTOL.find(b=>b.n===i);return <div key={i}><i style={{background:i===0?BRISTOL_MYSTERY:item?.color??"#70A65B"}}/><b>Type {i}</b><span>{i===0?"Unknown / mixed":item?.sub??"Bowel entry"}</span><strong>{counts[i]}×</strong></div>;})}</div></div>;
}

function doseSummary(m:Med,days:RDay[],medLog:MedLog,medLogItems:MedLogItems,now:Date) {
  return summarizeMedicationAdherence(m, days.map(d=>d.key), medLog, medLogItems, now);
}
function takenText(d:RDay,meds:Med[],medLog:MedLog,medLogItems:MedLogItems) {
  const counts=new Map<string,number>(),now=new Date(`${d.key}T23:59:59`);
  meds.filter(m=>!m.asNeeded).forEach(m=>(m.times??[]).forEach(time=>{
    const state=resolveScheduledDose(m,d.key,time,medLog,medLogItems,now);
    state.selectedItems.forEach(item=>counts.set(item,(counts.get(item)??0)+1));
  }));
  return [...counts].map(([name,count])=>`${name}${count>1?` ${count}x`:""}`).join(", ")||"—";
}
function extraText(d:RDay){return(d.log.extraMeds??[]).map(x=>`${x.name}${x.dose?` ${x.dose}`:""}`).join(", ")||"—";}
function tensText(d:RDay){const a=(d.log.heat??[]).filter(x=>x.kind==="tens");return a.length?a.map(x=>x.minutes?`${x.minutes} min`:"TENS").join(", "):"—";}
function contextText(d:RDay){const a:string[]=[];if(d.log.workout?.length)a.push(`Workout: ${d.log.workout.map(x=>`${x.kind}${x.minutes?` ${x.minutes} min`:""}`).join(", ")}`);if(d.sleep!=null)a.push(`Sleep ${fmt(d.sleep)} h`);const ts=d.log.temperatureEntries?.map(x=>x.value)??[];if(ts.length)a.push(`Temperature ${ts.map(v=>`${v}°C`).join(", ")}`);else if(d.log.temperature!=null)a.push(`Temperature ${d.log.temperature}°C`);if(d.log.food?.length)a.push(`Food logged (${d.log.food.length})`);if(d.notes.length)a.push(d.notes.join(" · "));return a.join(" · ")||"—";}
function packTimeline(rows:RDay[],meds:Med[],medLog:MedLog,medLogItems:MedLogItems){const pages:RDay[][]=[];let page:RDay[]=[];let budget=0;for(const d of rows){const text=[facts(d).join(" "),takenText(d,meds,medLog,medLogItems),extraText(d),tensText(d),contextText(d)].join(" ");const cost=Math.max(1,Math.ceil(text.length/170));if(page.length&&(budget+cost>30||page.length>=19)){pages.push(page);page=[];budget=0;}page.push(d);budget+=cost;}if(page.length)pages.push(page);if(!pages.length)pages.push([]);return pages;}

function Report({days,meds,medLog,medLogItems,range,locale}:{days:RDay[];meds:Med[];medLog:MedLog;medLogItems:MedLogItems;range:string;locale:string}) {
  const logged=days.filter(meaningful),pain=days.filter(d=>d.pain!=null),head=days.filter(d=>d.head!=null),flash=days.filter(d=>d.flash!=null),tet=days.filter(d=>d.tetany!=null),panic=days.filter(d=>d.panic!=null),nausea=days.filter(d=>d.nausea!=null),sleep=days.filter(d=>d.sleep!=null);
  const allBowel=days.flatMap(d=>d.bowelTypes),pAvg=avg(pain.map(d=>d.pain!)),pMax=mx(pain.map(d=>d.pain!)),pMin=pain.length?Math.min(...pain.map(d=>d.pain!)):undefined,hAvg=avg(head.map(d=>d.head!)),hMax=mx(head.map(d=>d.head!)),fAvg=avg(flash.map(d=>d.flash!)),fMax=mx(flash.map(d=>d.flash!)),sAvg=avg(sleep.map(d=>d.sleep!));
  const common=allBowel.length?Object.entries(allBowel.reduce((m,n)=>{m[n]=(m[n]??0)+1;return m;},{} as Record<number,number>)).sort((a,b)=>b[1]-a[1])[0]?.[0]:undefined;
  const symptoms:[string,RDay[]][]=[["Pain",pain],["Headache",head],["Hot flashes",flash],["Tetany",tet],["Panic attack",panic],["Nausea",nausea]];
  const patterns:string[]=[];if(head.length>=2)patterns.push(`Headache was recorded on ${head.length} days; ${head.filter(d=>d.pain!=null).length} overlapped with pain.`);if(flash.length>=2)patterns.push(`Hot flashes were recorded on ${flash.length} days (${pct(flash.length,days.length)}% of range).`);if(panic.length)patterns.push(`${panic.length} panic-attack day${panic.length===1?"":"s"} recorded.`);if(common!=null)patterns.push(`Most common recorded bowel value: Type ${common}.`);
  const scheduled=meds.filter(m=>!m.asNeeded&&(m.times?.length??0)>0),prn=meds.filter(m=>m.asNeeded),detailPages=packTimeline([...logged].reverse(),meds,medLog,medLogItems),total=3+detailPages.length,now=new Date();
  return <div className="hrDoc">
    <section className="pdf-sheet"><Header range={range} page={1}/><div className="meta"><span><b>Generated</b> {longDate(iso(new Date()),locale)}</span><span><b>Logged days</b> {logged.length} of {days.length} ({pct(logged.length,days.length)}%)</span></div><h2>At a glance</h2><div className="metrics six"><Metric label="Pain" value={`${fmt(pAvg)} / 10`} hint={`Min ${fmt(pMin)} · Max ${fmt(pMax)}`}/><Metric label="Headache" value={`${head.length} days`} hint={`Avg ${fmt(hAvg)} · Max ${fmt(hMax)}`}/><Metric label="Hot flashes" value={`${flash.length} days`} hint={`Avg ${fmt(fAvg)} · Max ${fmt(fMax)}`}/><Metric label="Other symptoms" value={`${tet.length+panic.length+nausea.length}`} hint="Tetany · panic · nausea"/><Metric label="Sleep" value={sAvg==null?"—":`${fmt(sAvg)} h`} hint={`${sleep.length} recorded days`}/><Metric label="Bowel" value={common!=null?`Type ${common}`:"—"} hint={`${allBowel.length} records`}/></div><div className="overviewGrid"><div><h2>Symptom timeline <small>(intensity heatmap)</small></h2><Heatmap days={days}/><div className="heatLegend"><span><i className="pain0"/>Pain low</span><span><i className="pain4"/>Pain moderate</span><span><i className="pain7"/>Pain high</span><span><i className="pain10"/>Pain severe</span><span><i className="periodKey"/>Period / spotting</span></div><h2>Pain trend <small>(0–10) · daily average</small></h2><DailyPainTrend days={days} locale={locale}/></div><div><h2>Symptom frequency <small>(days)</small></h2><div className="bars">{symptoms.map(([name,a])=><div key={name}><span>{name}</span><i><b style={{width:`${Math.max(2,pct(a.length,days.length))}%`}}/></i><strong>{a.length} ({pct(a.length,days.length)}%)</strong></div>)}</div><div className="coverage"><b>Data coverage</b><p>{days.length-logged.length} of {days.length} days have no meaningful health log. No record is not treated as symptom-free.</p></div><h2>Observed patterns</h2><div className="patterns">{patterns.map((x,i)=><div key={x}><b>{String(i+1).padStart(2,"0")}</b><span>{x}</span></div>)}</div></div></div><Foot page={1} total={total}/></section>

    <section className="pdf-sheet chartsSheet"><Header range={range} page={2}/><PainBars days={days} locale={locale}/><BowelChart days={days}/><Foot page={2} total={total}/></section>

    <section className="pdf-sheet medsSheet"><Header range={range} page={3}/><h2>Medication & supplement adherence</h2><table className="adherenceTable"><thead><tr><th>Medication / supplement</th><th>Schedule</th><th>Taken / expected</th><th>Adherence</th><th>%</th></tr></thead><tbody>{scheduled.length?scheduled.map(m=>{const a=doseSummary(m,days,medLog,medLogItems,now);return <tr key={m.id}><td><b>{m.name}</b>{m.dose?<small>{m.dose}</small>:null}</td><td>{m.times.join(", ")}</td><td>{a?`${a.taken} / ${a.expected}`:"No eligible doses"}</td><td>{a?<div className="adhBar"><i><span style={{width:`${a.pct}%`}}/></i></div>:"—"}</td><td>{a?`${a.pct}%`:"—"}</td></tr>}):<tr><td colSpan={5}>No scheduled medication.</td></tr>}</tbody></table>{prn.length?<><h2>As-needed medication</h2><table className="prnTable"><thead><tr><th>Medication</th><th>Recorded uses</th></tr></thead><tbody>{prn.map(m=>{const uses=days.reduce((n,d)=>n+(d.log.extraMeds??[]).filter(x=>x.name.toLowerCase()===m.name.toLowerCase()).length,0);return <tr key={m.id}><td>{m.name}</td><td>{uses}</td></tr>})}</tbody></table></>:null}<p className="adherenceNote">Expected doses follow the app schedule. Future doses and today’s not-yet-due doses are excluded; taken doses count immediately.</p><Foot page={3} total={total}/></section>

    {detailPages.map((rows,i)=>{const page=4+i;return <section className="pdf-sheet detailSheet" key={page}><Header range={range} page={page}/><h2>Detailed timeline</h2><p className="subnote">Only days with meaningful recorded data are shown. Newest first.</p><table className="detail"><thead><tr><th>Date</th><th>Pain & symptoms</th><th>Taken meds</th><th>Extra meds / PRN</th><th>TENS</th><th>Context / notes</th></tr></thead><tbody>{rows.length?rows.map(d=><tr key={d.key}><td><b>{longDate(d.key,locale)}</b></td><td>{facts(d).join(" · ")||"—"}</td><td>{takenText(d,meds,medLog,medLogItems)}</td><td>{extraText(d)}</td><td>{tensText(d)}</td><td>{contextText(d)}</td></tr>):<tr><td colSpan={6}>No meaningful daily records in this range.</td></tr>}</tbody></table><Foot page={page} total={total}/></section>;})}
  </div>;
}

function CalendarPicker({value,target,min,max,locale,onCancel,onApply}:{value:string;target:PickerTarget;min?:string;max?:string;locale:string;onCancel:()=>void;onApply:(v:string)=>void}) {
  const initial=fromIso(value),[month,setMonth]=useState(new Date(initial.getFullYear(),initial.getMonth(),1));const y=month.getFullYear(),m=month.getMonth(),first=new Date(y,m,1),off=(first.getDay()+6)%7,start=new Date(y,m,1-off),cells=Array.from({length:42},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d;}),title=new Intl.DateTimeFormat(locale,{month:"long",year:"numeric"}).format(month),week=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],ok=(k:string)=>(!min||k>=min)&&(!max||k<=max);
  return <div className="calendarOverlay" role="dialog" aria-modal="true" onClick={onCancel}><div className="calendarCard" onClick={e=>e.stopPropagation()}><div className="calendarTop"><div><small>Select date · {target==="from"?"From":"To"}</small><strong>{longDate(value,locale)}</strong></div><button aria-label="Close" onClick={onCancel}>×</button></div><div className="calendarNav"><button onClick={()=>setMonth(new Date(y,m-1,1))}>‹</button><strong>{title}</strong><button onClick={()=>setMonth(new Date(y,m+1,1))}>›</button></div><div className="calendarGrid calendarWeek">{week.map(w=><span key={w}>{w}</span>)}</div><div className="calendarGrid">{cells.map(d=>{const k=iso(d),enabled=ok(k);return <button key={k} disabled={!enabled} data-out={d.getMonth()!==m} data-active={k===value} onClick={()=>{if(enabled)onApply(k);}}>{d.getDate()}</button>;})}</div><p className="pickerHint">Tap a date to select it. Selection is applied immediately.</p></div></div>;
}

export function HealthReportPage() {
  const {data,hydrated}=useBixbo();const{t,language}=useI18n();const view=hydrated?data:EMPTY,locale=language==="sk"?"sk-SK":"en-GB",today=iso(new Date());
  const[preset,setPreset]=useState<Preset>("30"),[customStart,setCustomStart]=useState(add(today,-29)),[customEnd,setCustomEnd]=useState(today),[picker,setPicker]=useState<PickerTarget|null>(null),[preview,setPreview]=useState(false),[busy,setBusy]=useState(false),previewRef=useRef<HTMLDivElement|null>(null);
  const[start,end]=useMemo(()=>preset==="custom"?[customStart,customEnd]:[add(today,-(Number(preset)-1)),today],[preset,customStart,customEnd,today]);
  const days=useMemo(()=>Array.from({length:countDays(start,end)},(_,i)=>{const k=add(start,i);return summarize(k,view.dayLogs[k]??{},view.dayNotes?.[k]);}),[start,end,view.dayLogs,view.dayNotes]);
  const range=`${longDate(start,locale)} – ${longDate(end,locale)} · ${days.length}-day report`,report=<Report days={days} meds={view.meds} medLog={view.medLog} medLogItems={view.medLogItems??{}} range={range} locale={locale}/>;
  const apply=(v:string)=>{if(picker==="from"){setCustomStart(v);if(v>customEnd)setCustomEnd(v);}else if(picker==="to"){setCustomEnd(v);if(v<customStart)setCustomStart(v);}setPicker(null);};
  const savePdf=async()=>{if(busy||!previewRef.current)return;setBusy(true);try{const[{default:html2canvas},{jsPDF}]=await Promise.all([import("html2canvas"),import("jspdf")]);const sheets=[...previewRef.current.querySelectorAll<HTMLElement>(".pdf-sheet")],pdf=new jsPDF({orientation:"landscape",unit:"mm",format:"a4",compress:true});for(let i=0;i<sheets.length;i++){if(i)pdf.addPage("a4","landscape");const c=await html2canvas(sheets[i],{scale:2,backgroundColor:"#fff",useCORS:true,logging:false}),pw=pdf.internal.pageSize.getWidth(),ph=pdf.internal.pageSize.getHeight(),r=Math.min(pw/c.width,ph/c.height),w=c.width*r,h=c.height*r;pdf.addImage(c.toDataURL("image/jpeg",.96),"JPEG",(pw-w)/2,(ph-h)/2,w,h,undefined,"FAST");}pdf.save(`BIXBO-Health-Report-${start}-${end}.pdf`);}finally{setBusy(false);}};
  return <AppShell title={<Link to="/profile" className="flex items-center gap-2"><ArrowLeft className="h-5 w-5"/>{t("PDF reports")}</Link>}><style>{CSS}</style><div className="reportRoot px-4 pb-28 pt-3"><div className="controls"><section className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80"><p className="font-serif text-xl font-bold">Health Report</p><p className="mt-1 text-xs text-muted-foreground">Doctor-friendly summary of your recorded health data.</p><div className="presets">{(["7","30","90","365","custom"] as Preset[]).map(x=><button key={x} data-active={preset===x} onClick={()=>setPreset(x)}>{x==="365"?"1 year":x==="custom"?"Custom":`${x} days`}</button>)}</div>{preset==="custom"&&<div className="custom"><button onClick={()=>setPicker("from")}><b>From</b><span>{longDate(customStart,locale)}</span></button><button onClick={()=>setPicker("to")}><b>To</b><span>{longDate(customEnd,locale)}</span></button></div>}<button className="previewBtn" onClick={()=>setPreview(true)}>Preview / Save PDF</button></section></div><div className="screenPreview">{report}</div></div>{picker&&<CalendarPicker target={picker} value={picker==="from"?customStart:customEnd} min={picker==="to"?customStart:undefined} max={picker==="from"?customEnd:undefined} locale={locale} onCancel={()=>setPicker(null)} onApply={apply}/>} {preview&&<div ref={previewRef} className="modal"><div className="toolbar"><button onClick={()=>setPreview(false)}>← Back</button><span>{range}</span><button disabled={busy} onClick={savePdf}>{busy?"Creating PDF…":"Save PDF"}</button></div>{report}</div>}</AppShell>;
}

const CSS=String.raw`
.reportRoot{--olive:#7f8950;--ink:#20261d;--muted:#707668;--line:#dde1cf;--pale:#f7f8f2;--pink:#f29aa5}.controls{max-width:1120px;margin:0 auto 16px}.presets{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin-top:14px}.presets button,.custom button{height:42px;border:1px solid hsl(var(--border));border-radius:14px;background:hsl(var(--surface));font-size:12px;font-weight:700}.presets button[data-active=true]{background:#f0f3e6;border-color:#90995f;color:#596238}.custom{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.custom button{height:54px;display:flex;justify-content:space-between;align-items:center;padding:0 14px}.previewBtn{margin-top:14px;width:100%;height:44px;border-radius:16px;background:hsl(var(--primary));color:hsl(var(--primary-foreground));font-weight:700}.screenPreview{max-width:1120px;margin:auto;overflow:auto}.hrDoc{display:grid;gap:18px}.pdf-sheet{position:relative;box-sizing:border-box;width:1120px;height:792px;margin:auto;background:#fff;color:var(--ink);padding:28px 40px 42px;font-family:Inter,Arial,sans-serif;box-shadow:0 10px 34px #0001;overflow:hidden}.hrHeader{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:8px}.hrHeader b{font-size:11px;letter-spacing:.36em}.hrHeader h1{font-family:"Instrument Serif",Georgia,serif;font-size:38px;line-height:1;margin:7px 0 0}.hrHeader h3{font-family:"Instrument Serif",Georgia,serif;font-size:14px;margin:3px 0}.hrHeader>span{font-size:8px}.pdf-sheet h2{font-family:"Instrument Serif",Georgia,serif;font-size:19px;margin:10px 0 6px}.pdf-sheet h2 small{font:500 8px Inter;color:var(--olive)}.meta{display:flex;justify-content:flex-end;gap:22px;font-size:8px}.metrics{display:grid;gap:8px}.metrics.six{grid-template-columns:repeat(6,1fr)}.metric{border:1px solid var(--line);border-radius:9px;padding:9px 11px;min-height:72px}.metric span{font-size:6.5px;font-weight:700;text-transform:uppercase}.metric strong{display:block;font-family:"Instrument Serif",Georgia,serif;font-size:22px;margin-top:7px}.metric small{display:block;font-size:6.5px;color:var(--muted);margin-top:5px}.overviewGrid{display:grid;grid-template-columns:1.55fr .45fr;gap:26px}.heat{border:1px solid var(--line)}.heatRow{display:grid;grid-template-columns:90px repeat(var(--cells),1fr)}.heatRow span{font-size:6.5px;padding:3px;border-top:1px solid #eef0e7}.heatHead b{font-size:5.8px;text-align:center;padding:2px;color:var(--muted)}.heatRow i{min-height:16px;border-left:1px solid #eef0e7;border-top:1px solid #eef0e7;background:#fff}.heatRow i[data-l="1"]{background:#e5e8d5}.heatRow i[data-l="2"]{background:#c8cda5}.heatRow i[data-l="3"]{background:#a5ad73}.heatRow i[data-l="4"]{background:#5f6b32}.periodCell,.periodKey{background:var(--pink)!important}.heatLegend{display:flex;gap:10px;flex-wrap:wrap;margin:6px 0;font-size:6.5px}.heatLegend span{display:flex;align-items:center;gap:4px}.heatLegend i{width:10px;height:10px;border:1px solid var(--line);display:inline-block}.pain0{background:#72C64A}.pain4{background:#F3C30D}.pain7{background:#F05A28}.pain10{background:#B91C1C}.chart{width:100%;height:154px;overflow:visible}.chart line,.painBarSvg line{stroke:#e9ecdf}.chart polyline{fill:none;stroke:#7f8950;stroke-width:1.8}.chart text,.painBarSvg text,.bowelSvg text{font-size:7px;fill:#4c5445}.chart .pointLabel,.barValue,.bowelCount{font-weight:700}.trendLegend{display:flex;justify-content:space-between;font-size:6.5px;color:var(--muted)}.trendLegend i{width:22px;height:2px;background:var(--olive);display:inline-block}.bars{display:grid;gap:7px}.bars>div{display:grid;grid-template-columns:70px 1fr 44px;gap:6px;align-items:center;font-size:7px}.bars i{height:7px;background:#f0f2e9;border-radius:99px;overflow:hidden}.bars i b{display:block;height:100%;background:#8f9859}.coverage{margin-top:12px;font-size:7px}.coverage p{color:var(--muted)}.patterns{display:grid;gap:7px}.patterns>div{display:grid;grid-template-columns:18px 1fr;gap:6px;font-size:7px}.chartsSheet h2{margin-top:7px}.painBarSvg{width:100%;height:245px}.barLabel{font-size:6.5px!important}.painScaleLegend{display:flex;gap:12px;align-items:center;font-size:7px;color:var(--muted);margin:2px 0 7px}.painScaleLegend span{display:flex;align-items:center;gap:4px}.painScaleLegend i{width:12px;height:8px;border-radius:2px}.painScaleLegend .nodata{margin-left:auto}.bowelSection{border-top:1px solid var(--line);padding-top:3px}.bowelSvg{width:100%;height:190px}.bowelLegend{display:grid;grid-template-columns:repeat(4,1fr);gap:5px 10px;margin-top:0}.bowelLegend>div{display:grid;grid-template-columns:14px 36px 1fr 24px;gap:4px;align-items:center;font-size:6.5px}.bowelLegend i{width:12px;height:9px;border-radius:2px}.bowelLegend strong{text-align:right}.adherenceTable,.prnTable{width:100%;border-collapse:collapse;font-size:8.5px;table-layout:fixed}.adherenceTable th,.prnTable th{background:#f1f3e9;padding:9px;border:1px solid var(--line);text-align:left}.adherenceTable td,.prnTable td{padding:11px 9px;border:1px solid var(--line);vertical-align:middle}.adherenceTable td small{display:block;color:var(--muted)}.adhBar i{display:block;height:9px;background:#f0f2e9}.adhBar span{display:block;height:100%;background:#6f783d}.adherenceNote{font-size:7.5px;color:var(--muted);margin-top:16px}.prnTable{width:55%}.detail{width:100%;border-collapse:collapse;font-size:7.8px;table-layout:fixed}.detail th{background:#f1f3e9;text-align:left;padding:7px;border:1px solid var(--line)}.detail td{padding:7px;border:1px solid var(--line);vertical-align:top;line-height:1.3;overflow-wrap:anywhere}.detail tbody tr:nth-child(even){background:#fafbf6}.detail th:nth-child(1){width:11%}.detail th:nth-child(2){width:22%}.detail th:nth-child(3){width:17%}.detail th:nth-child(4){width:17%}.detail th:nth-child(5){width:9%}.detail th:nth-child(6){width:24%}.subnote{font-size:7px;color:var(--muted);margin:0 0 7px}.empty{height:120px;display:grid;place-items:center;color:var(--muted)}footer{position:absolute;left:40px;right:40px;bottom:18px;border-top:1px solid var(--line);padding-top:6px;display:flex;justify-content:space-between;font-size:6px;color:#8b9084}.modal{position:fixed;inset:0;z-index:10050;overflow:auto;background:#eceee8;padding:72px 14px 28px}.toolbar{position:fixed;z-index:10060;top:max(env(safe-area-inset-top),10px);left:50%;transform:translateX(-50%);width:min(760px,calc(100% - 24px));display:flex;align-items:center;gap:8px;padding:8px;border-radius:16px;background:#fffffff5;box-shadow:0 8px 30px #0002}.toolbar span{flex:1;text-align:center;font-size:9px}.toolbar button{height:38px;border-radius:11px;padding:0 13px;background:#eef1e5;font-size:10px;font-weight:700}.toolbar button:last-child{background:#7f8950;color:#fff}.calendarOverlay{position:fixed;inset:0;z-index:2147483000;background:rgba(20,25,15,.58);display:flex;align-items:flex-end}.calendarCard{width:min(430px,100%);margin:0 auto 84px;background:#fff;border-radius:24px;padding:16px;color:#20261d;box-shadow:0 30px 80px #0007}.calendarTop{display:flex;justify-content:space-between;align-items:flex-start}.calendarTop small{display:block;color:#707668}.calendarTop strong{display:block;font-size:18px;margin-top:3px}.calendarTop button,.calendarNav button{padding:8px 12px;border-radius:12px;background:#f2f3ed;font-weight:700}.calendarNav{display:grid;grid-template-columns:44px 1fr 44px;align-items:center;margin-top:12px}.calendarNav strong{text-align:center}.calendarGrid{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin-top:7px}.calendarWeek span{text-align:center;font-size:10px;color:#777}.calendarGrid button{aspect-ratio:1;border-radius:50%;background:#f7f8f2;font-weight:700}.calendarGrid button[data-active=true]{background:#7f8950;color:#fff}.calendarGrid button[data-out=true]{opacity:.35}.calendarGrid button:disabled{opacity:.15}.pickerHint{text-align:center;margin-top:10px;font-size:10px;color:#707668}@media(max-width:700px){.presets{grid-template-columns:repeat(3,1fr)}.custom{grid-template-columns:1fr}.calendarCard{margin-bottom:84px}}@media print{.controls,.toolbar,.calendarOverlay{display:none!important}.screenPreview{display:none!important}.modal{position:static!important;padding:0;background:#fff}.pdf-sheet{box-shadow:none;break-after:page;width:297mm;height:210mm}@page{size:A4 landscape;margin:0}}
`;
