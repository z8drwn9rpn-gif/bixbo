from pathlib import Path

# 1) layout registry
Path('src/lib/layoutRegistry.ts').write_text(r'''import type { BixboData } from "./storage";

export type LayoutPageId =
  | "home"
  | "insights"
  | "patterns.cycle"
  | "patterns.monthly"
  | "patterns.treatment"
  | "patterns.triggers"
  | "couple.overview"
  | "couple.compare"
  | "couple.health";

export interface LayoutSectionDefinition {
  id: string;
  label: string;
  order: number;
}

export const BIXBO_LAYOUT_SECTIONS: Record<LayoutPageId, LayoutSectionDefinition[]> = {
  home: [
    { id: "calendar", label: "Calendar", order: 10 },
    { id: "birthControl", label: "Birth control", order: 20 },
    { id: "pregnancy", label: "Pregnancy", order: 30 },
    { id: "postpartum", label: "Postpartum", order: 40 },
    { id: "nextPeriod", label: "Next period", order: 50 },
    { id: "vitals", label: "Vitals", order: 60 },
    { id: "quickLog", label: "Quick Log", order: 70 },
  ],
  insights: [
    { id: "heatmap", label: "Heatmap", order: 10 },
    { id: "pain", label: "Pain scale", order: 20 },
    { id: "hotFlashes", label: "Hot flashes", order: 30 },
    { id: "bowel", label: "Bowel", order: 40 },
    { id: "timeOfDay", label: "Pattern of day", order: 50 },
    { id: "meds", label: "Medication adherence", order: 60 },
  ],
  "patterns.cycle": [
    { id: "painFlow", label: "Pain & flow", order: 10 },
    { id: "bodyChanges", label: "Body changes", order: 20 },
  ],
  "patterns.monthly": [
    { id: "glance", label: "This month at a glance", order: 10 },
    { id: "panicTetany", label: "Panic & tetany", order: 20 },
    { id: "symptoms", label: "Symptoms", order: 30 },
    { id: "lifestyle", label: "Lifestyle & routines", order: 40 },
    { id: "hormones", label: "Hormones", order: 50 },
  ],
  "patterns.treatment": [
    { id: "comparison", label: "Treatment comparison", order: 10 },
    { id: "history", label: "Treatment history", order: 20 },
  ],
  "patterns.triggers": [
    { id: "correlations", label: "Smart correlations", order: 10 },
  ],
  "couple.overview": [
    { id: "similarity", label: "Health similarity", order: 10 },
    { id: "stats", label: "Health summary", order: 20 },
    { id: "blueberry", label: "Blueberry", order: 30 },
  ],
  "couple.compare": [
    { id: "painChart", label: "Pain comparison", order: 10 },
    { id: "healthComparison", label: "Health comparison", order: 20 },
  ],
  "couple.health": [
    { id: "partnerDetails", label: "Partner shared details", order: 10 },
    { id: "myDetails", label: "My shared details", order: 20 },
  ],
};

export function layoutOrder(
  data: Pick<BixboData, "settings">,
  page: LayoutPageId,
  sectionId: string,
  fallback = 999,
): number {
  const saved = data.settings.adminConfig?.layoutOrder?.[page];
  if (saved?.length) {
    const index = saved.indexOf(sectionId);
    if (index >= 0) return (index + 1) * 10;
  }
  return BIXBO_LAYOUT_SECTIONS[page]?.find((section) => section.id === sectionId)?.order ?? fallback;
}

export function orderedLayoutSections(data: Pick<BixboData, "settings">, page: LayoutPageId) {
  return [...(BIXBO_LAYOUT_SECTIONS[page] ?? [])].sort(
    (a, b) => layoutOrder(data, page, a.id, a.order) - layoutOrder(data, page, b.id, b.order),
  );
}
''')

# 2) admin editor
Path('src/components/LayoutOrderEditor.tsx').write_text(r'''import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "@/components/icons/BixboIcons";
import { useI18n } from "@/hooks/useI18n";
import { BIXBO_LAYOUT_SECTIONS, orderedLayoutSections, type LayoutPageId } from "@/lib/layoutRegistry";
import type { BixboData } from "@/lib/storage";

type UpdateFn = (u: (d: BixboData) => BixboData) => void;

const PAGE_LABELS: Record<LayoutPageId, string> = {
  home: "Overview / Home",
  insights: "Insights",
  "patterns.cycle": "Patterns · Cycle",
  "patterns.monthly": "Patterns · Monthly",
  "patterns.treatment": "Patterns · Treatment",
  "patterns.triggers": "Patterns · Triggers",
  "couple.overview": "Couple · Overview",
  "couple.compare": "Couple · Compare",
  "couple.health": "Couple · Health",
};

export function LayoutOrderEditor({ data, update }: { data: BixboData; update: UpdateFn }) {
  const { t } = useI18n();
  const [page, setPage] = useState<LayoutPageId>("home");
  const [dragged, setDragged] = useState<string | null>(null);
  const sections = useMemo(() => orderedLayoutSections(data, page), [data, page]);

  const writeOrder = (ids: string[]) => update((current) => ({
    ...current,
    settings: {
      ...current.settings,
      adminConfig: {
        ...(current.settings.adminConfig ?? {}),
        enabled: true,
        layoutOrder: { ...(current.settings.adminConfig?.layoutOrder ?? {}), [page]: ids },
      },
    },
  }));

  const move = (id: string, delta: -1 | 1) => {
    const ids = sections.map((section) => section.id);
    const index = ids.indexOf(id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    writeOrder(ids);
  };

  const drop = (targetId: string) => {
    if (!dragged || dragged === targetId) return;
    const ids = sections.map((section) => section.id);
    const from = ids.indexOf(dragged);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const [item] = ids.splice(from, 1);
    ids.splice(to, 0, item);
    writeOrder(ids);
    setDragged(null);
  };

  const reset = () => update((current) => {
    const layoutOrder = { ...(current.settings.adminConfig?.layoutOrder ?? {}) };
    delete layoutOrder[page];
    return { ...current, settings: { ...current.settings, adminConfig: { ...(current.settings.adminConfig ?? {}), layoutOrder } } };
  });

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-primary/10 p-4 ring-1 ring-primary/20">
        <p className="font-serif text-lg font-bold">{t("Layout & order")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("Reorder whole sections without changing their data or source code.")}</p>
      </section>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {(Object.keys(PAGE_LABELS) as LayoutPageId[]).map((id) => (
          <button key={id} type="button" onClick={() => setPage(id)} className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold ${page === id ? "bg-primary text-primary-foreground" : "bg-tint text-muted-foreground ring-1 ring-border"}`}>
            {t(PAGE_LABELS[id])}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {sections.map((section, index) => (
          <div key={section.id} draggable onDragStart={() => setDragged(section.id)} onDragEnd={() => setDragged(null)} onDragOver={(event) => event.preventDefault()} onDrop={() => drop(section.id)} className={`flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-sm ring-1 ring-border/80 lg:cursor-grab ${dragged === section.id ? "opacity-60" : ""}`}>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-tint text-xs font-bold text-muted-foreground">{index + 1}</span>
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{t(section.label)}</p><p className="text-[9px] text-muted-foreground">ID: {section.id}</p></div>
            <button type="button" onClick={() => move(section.id, -1)} disabled={index === 0} className="grid h-9 w-9 place-items-center rounded-full bg-tint disabled:opacity-30" aria-label={t("Move up")}><ChevronLeft className="h-4 w-4 rotate-90" /></button>
            <button type="button" onClick={() => move(section.id, 1)} disabled={index === sections.length - 1} className="grid h-9 w-9 place-items-center rounded-full bg-tint disabled:opacity-30" aria-label={t("Move down")}><ChevronRight className="h-4 w-4 rotate-90" /></button>
          </div>
        ))}
      </div>

      <button type="button" onClick={reset} className="w-full rounded-2xl bg-tint px-4 py-2.5 text-xs font-semibold text-muted-foreground ring-1 ring-border">{t("Reset this page order")}</button>
    </div>
  );
}
''')

# 3) AdminConfig layoutOrder
p=Path('src/lib/appRegistry.ts'); s=p.read_text()
s=s.replace('  customLogs?: CustomLogDefinition[];\n}', '  customLogs?: CustomLogDefinition[];\n  /** Per-page whole-section ordering. IDs are stable layout section IDs. */\n  layoutOrder?: Record<string, string[]>;\n  /** Reserved for Google-account ownership once app authentication is enabled. */\n  ownerEmail?: string;\n}')
p.write_text(s)

# 4) admin tab
p=Path('src/routes/admin.tsx'); s=p.read_text()
s=s.replace('import { CustomLogBuilder } from "@/components/CustomLogBuilder";', 'import { CustomLogBuilder } from "@/components/CustomLogBuilder";\nimport { LayoutOrderEditor } from "@/components/LayoutOrderEditor";')
s=s.replace('type AdminTab = "logs" | "fields" | "quick" | "calendar" | "insights";', 'type AdminTab = "logs" | "fields" | "quick" | "calendar" | "insights" | "layout";')
s=s.replace('  insights: "heatmap",\n};', '  insights: "heatmap",\n  layout: "log",\n};')
s=s.replace('  insights: "Insights & graphs",\n};', '  insights: "Insights & graphs",\n  layout: "Layout & order",\n};')
s=s.replace('lg:grid-cols-4', 'lg:grid-cols-6')
s=s.replace('{tab === "fields" && <CustomLogBuilder data={view} update={update} />}', '{tab === "fields" && <CustomLogBuilder data={view} update={update} />}\n        {tab === "layout" && <LayoutOrderEditor data={view} update={update} />}')
s=s.replace('<div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">\n          {features.map', '<div className={`space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0 ${tab === "layout" ? "hidden" : ""}`}>\n          {features.map')
p.write_text(s)

# 5) Home ordering
p=Path('src/routes/index.tsx'); s=p.read_text()
if 'layoutOrder' not in s.split('\n',80)[0:80]:
    # append near appRegistry import if present, otherwise after storage imports section
    insert='import { layoutOrder } from "@/lib/layoutRegistry";\n'
    first_import_end=s.find('\n\n', s.find('import '))
    s=s[:first_import_end+2]+insert+s[first_import_end+2:]
s=s.replace('<div className="min-w-0 lg:flex lg:flex-col">\n      <div className="px-5 pt-0.5 lg:order-1 lg:px-1">', '<div className="flex min-w-0 flex-col">\n      <div style={{ order: layoutOrder(view, "home", "calendar", 10) }}>\n      <div className="px-5 pt-0.5 lg:px-1">',1)
calendar_end='''      </div>\n\n      {!maleMode && ('''
s=s.replace(calendar_end,'''      </div>\n      </div>\n\n      {!maleMode && (''',1)
s=s.replace('<div className="lg:order-4">\n        <BirthControlSummaryCard', '<div style={{ order: layoutOrder(view, "home", "birthControl", 20) }}>\n        <BirthControlSummaryCard',1)
s=s.replace('className="focus-ring mx-5 mt-3 block rounded-3xl bg-tint px-4 py-4 text-left ring-1 ring-border transition hover:bg-surface lg:order-6 lg:mx-0"', 'className="focus-ring mx-5 mt-3 block rounded-3xl bg-tint px-4 py-4 text-left ring-1 ring-border transition hover:bg-surface lg:mx-0"\n            style={{ order: layoutOrder(view, "home", "pregnancy", 30) }}',1)
s=s.replace('className="focus-ring mx-5 mt-3 block rounded-3xl bg-primary/10 px-4 py-4 text-left ring-1 ring-primary/20 lg:order-6 lg:mx-0"', 'className="focus-ring mx-5 mt-3 block rounded-3xl bg-primary/10 px-4 py-4 text-left ring-1 ring-primary/20 lg:mx-0"\n              style={{ order: layoutOrder(view, "home", "postpartum", 40) }}',1)
s=s.replace('className="mx-5 mt-3 rounded-full px-4 py-2 text-center text-xs ring-1 lg:order-3 lg:mx-1"', 'className="mx-5 mt-3 rounded-full px-4 py-2 text-center text-xs ring-1 lg:mx-1"\n              style={{ order: layoutOrder(view, "home", "nextPeriod", 50),',1)
# above replacement introduces duplicate style={{ immediately following; collapse
s=s.replace('style={{ order: layoutOrder(view, "home", "nextPeriod", 50),\n              style={{', 'style={{ order: layoutOrder(view, "home", "nextPeriod", 50),')
s=s.replace('<div className="mt-3 grid grid-cols-5 gap-2 px-5 lg:order-5 lg:grid-cols-4 lg:px-1">', '<div className="mt-3 grid grid-cols-5 gap-2 px-5 lg:grid-cols-4 lg:px-1" style={{ order: layoutOrder(view, "home", "vitals", 60) }}>',1)
s=s.replace('<div className="px-5 lg:order-2 lg:mt-2 lg:px-1', '<div style={{ order: layoutOrder(view, "home", "quickLog", 70) }} className="px-5 lg:mt-2 lg:px-1',1)
p.write_text(s)

# 6) Insights ordering, wrappers
p=Path('src/routes/insights.tsx'); s=p.read_text()
s=s.replace('import { customLogDefinitions, getRegistryFeature, isRegistrySurfaceEnabled, type RegistryFeatureId } from "@/lib/appRegistry";', 'import { customLogDefinitions, getRegistryFeature, isRegistrySurfaceEnabled, type RegistryFeatureId } from "@/lib/appRegistry";\nimport { layoutOrder } from "@/lib/layoutRegistry";')
s=s.replace('<div className="space-y-3 px-5 pt-2 pb-[calc(96px+env(safe-area-inset-bottom))] lg:grid lg:grid-cols-2 lg:items-start lg:gap-3 lg:space-y-0 lg:px-0 lg:pb-12 [&>*:first-child]:lg:col-span-2">', '<div className="flex flex-col gap-3 px-5 pt-2 pb-[calc(96px+env(safe-area-inset-bottom))] lg:grid lg:grid-cols-2 lg:items-start lg:px-0 lg:pb-12">',1)
s=s.replace('''        <YearHealthHeatmap\n          data={view}''','''        <div className="lg:col-span-2" style={{ order: layoutOrder(view, "insights", "heatmap", 10) }}>\n        <YearHealthHeatmap\n          data={view}''',1)
s=s.replace('''          onShiftPeriod={(period, delta) => shiftHeatmapPeriod(period, delta)}\n        />\n\n        <section className="rounded-3xl''','''          onShiftPeriod={(period, delta) => shiftHeatmapPeriod(period, delta)}\n        />\n        </div>\n\n        <section style={{ order: layoutOrder(view, "insights", "pain", 20) }} className="rounded-3xl''',1)
# second section hot flashes
first=s.find('style={{ order: layoutOrder(view, "insights", "pain", 20) }}')
pos=s.find('<section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">', first+10)
if pos!=-1:
    s=s[:pos]+s[pos:].replace('<section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">','<section style={{ order: layoutOrder(view, "insights", "hotFlashes", 30) }} className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">',1)
s=s.replace('''        <BristolChart\n          bowelCounts={bowelCounts}''','''        <div style={{ order: layoutOrder(view, "insights", "bowel", 40) }}>\n        <BristolChart\n          bowelCounts={bowelCounts}''',1)
s=s.replace('''          }\n        />\n\n        <TimeOfDayPatternChart''','''          }\n        />\n        </div>\n\n        <div style={{ order: layoutOrder(view, "insights", "timeOfDay", 50) }}>\n        <TimeOfDayPatternChart''',1)
s=s.replace('''          }\n        />\n\n        <MedsAdherence''','''          }\n        />\n        </div>\n\n        <div style={{ order: layoutOrder(view, "insights", "meds", 60) }}>\n        <MedsAdherence''',1)
s=s.replace('''          }\n        />\n        </div>\n      )}''','''          }\n        />\n        </div>\n        </div>\n      )}''',1)
p.write_text(s)

# 7) Patterns: order props on top-level Card/CollapsibleSection
p=Path('src/routes/patterns.tsx'); s=p.read_text()
# import
marker='import { useI18n } from "@/hooks/useI18n";'
if marker in s and 'layoutRegistry' not in s:
    s=s.replace(marker, marker+'\nimport { layoutOrder } from "@/lib/layoutRegistry";')
# shared components accept order
s=s.replace('function Card({ title, description, children }: { title: string; description?: string; children: ReactNode }) {', 'function Card({ title, description, children, layoutOrderValue }: { title: string; description?: string; children: ReactNode; layoutOrderValue?: number }) {')
s=s.replace('<section className="overflow-hidden rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">', '<section style={{ order: layoutOrderValue }} className="overflow-hidden rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">',1)
s=s.replace('  defaultOpen = false,\n}: {\n  title: string;\n  subtitle?: string;\n  children: ReactNode;\n  defaultOpen?: boolean;\n}) {', '  defaultOpen = false,\n  layoutOrderValue,\n}: {\n  title: string;\n  subtitle?: string;\n  children: ReactNode;\n  defaultOpen?: boolean;\n  layoutOrderValue?: number;\n}) {',1)
# find CollapsibleSection section occurrence after its function
idx=s.find('function CollapsibleSection')
pos=s.find('<section className="overflow-hidden rounded-3xl bg-surface shadow-sm ring-1 ring-border/80">', idx)
if pos!=-1:
    s=s[:pos]+s[pos:].replace('<section className="overflow-hidden rounded-3xl bg-surface shadow-sm ring-1 ring-border/80">','<section style={{ order: layoutOrderValue }} className="overflow-hidden rounded-3xl bg-surface shadow-sm ring-1 ring-border/80">',1)
# active wrapper blocks to flex mobile
s=s.replace('<div className="space-y-3 lg:contents">','<div className="flex flex-col gap-3 lg:contents">')
# top-level substitutions by exact title; first occurrences expected in active blocks
repls=[
('''<CollapsibleSection\n              title="Pain & flow"''','''<CollapsibleSection\n              layoutOrderValue={layoutOrder(view, "patterns.cycle", "painFlow", 10)}\n              title="Pain & flow"'''),
('''<CollapsibleSection\n              title="Body changes"''','''<CollapsibleSection\n              layoutOrderValue={layoutOrder(view, "patterns.cycle", "bodyChanges", 20)}\n              title="Body changes"'''),
('''<Card title="This month at a glance"''','''<Card layoutOrderValue={layoutOrder(view, "patterns.monthly", "glance", 10)} title="This month at a glance"'''),
('''<CollapsibleSection\n              title="Panic & tetany"''','''<CollapsibleSection\n              layoutOrderValue={layoutOrder(view, "patterns.monthly", "panicTetany", 20)}\n              title="Panic & tetany"'''),
('''<CollapsibleSection\n              title="Symptoms"''','''<CollapsibleSection\n              layoutOrderValue={layoutOrder(view, "patterns.monthly", "symptoms", 30)}\n              title="Symptoms"'''),
('''<CollapsibleSection\n              title="Lifestyle & routines"''','''<CollapsibleSection\n              layoutOrderValue={layoutOrder(view, "patterns.monthly", "lifestyle", 40)}\n              title="Lifestyle & routines"'''),
('''<CollapsibleSection\n              title="Hormones"''','''<CollapsibleSection\n              layoutOrderValue={layoutOrder(view, "patterns.monthly", "hormones", 50)}\n              title="Hormones"'''),
('''<Card title="Treatment comparison"''','''<Card layoutOrderValue={layoutOrder(view, "patterns.treatment", "comparison", 10)} title="Treatment comparison"'''),
('''<CollapsibleSection title="Treatment history"''','''<CollapsibleSection layoutOrderValue={layoutOrder(view, "patterns.treatment", "history", 20)} title="Treatment history"'''),
('''<Card title="Smart correlations"''','''<Card layoutOrderValue={layoutOrder(view, "patterns.triggers", "correlations", 10)} title="Smart correlations"'''),
]
for a,b in repls: s=s.replace(a,b,1)
p.write_text(s)

# 8) Couple wrappers
p=Path('src/routes/couple.tsx'); s=p.read_text()
# import helper
first_import_end=s.find('\n\n', s.find('import '))
if 'layoutRegistry' not in s[:2500]:
    s=s[:first_import_end+2]+'import { layoutOrder } from "@/lib/layoutRegistry";\n'+s[first_import_end+2:]
# container flex mobile so order works for direct content wrappers but controls are also direct; give controls fixed negative orders
s=s.replace('<div className="space-y-3 px-5 pb-[calc(96px+env(safe-area-inset-bottom))] pt-2 lg:grid', '<div className="flex flex-col gap-3 px-5 pb-[calc(96px+env(safe-area-inset-bottom))] pt-2 lg:grid',1)
# top three controls fixed before reordered content
s=s.replace('<div\n          className="mx-auto grid w-full max-w-[340px]', '<div\n          style={{ order: -30 }}\n          className="mx-auto grid w-full max-w-[340px]',1)
s=s.replace('<nav\n            aria-label={t("Couple sections")}', '<nav\n            style={{ order: -20 }}\n            aria-label={t("Couple sections")}',1)
s=s.replace('<div className="flex items-center justify-between">\n          <button\n            type="button"\n            onClick={goPrev}', '<div style={{ order: -10 }} className="flex items-center justify-between">\n          <button\n            type="button"\n            onClick={goPrev}',1)
# overview similarity
s=s.replace('{activeTab === "overview" ? <SimilarityCard score={similarityScore} partnerName={t(partnerName)} /> : null}', '{activeTab === "overview" ? <div style={{ order: layoutOrder(view, "couple.overview", "similarity", 10) }}><SimilarityCard score={similarityScore} partnerName={t(partnerName)} /></div> : null}',1)
# stats div first occurrence following overview condition
s=s.replace('{activeTab === "overview" && hasPartnerComparisonData ? (\n              <div className="grid grid-cols-2 gap-2">', '{activeTab === "overview" && hasPartnerComparisonData ? (\n              <div style={{ order: layoutOrder(view, "couple.overview", "stats", 20) }} className="grid grid-cols-2 gap-2">',1)
# blueberry wrap component by adding div
s=s.replace('''{activeTab === "overview" && partner.gender !== "male" ? (\n              <BlueberrySection''','''{activeTab === "overview" && partner.gender !== "male" ? (\n              <div style={{ order: layoutOrder(view, "couple.overview", "blueberry", 30) }}>\n              <BlueberrySection''',1)
s=s.replace('''                isCurrentMonth={isCurrentMonth}\n              />\n            ) : null}''','''                isCurrentMonth={isCurrentMonth}\n              />\n              </div>\n            ) : null}''',1)
# compare fragment to flex contents-like wrappers: fragment children direct in outer flex/grid already; wrap each
s=s.replace('''                <CouplePainChart\n                  days={painMonthDays}''','''                <div style={{ order: layoutOrder(view, "couple.compare", "painChart", 10) }}>\n                <CouplePainChart\n                  days={painMonthDays}''',1)
s=s.replace('''                  period="M"\n                />\n\n                <SectionCard\n                  title="Health comparison"''','''                  period="M"\n                />\n                </div>\n\n                <div style={{ order: layoutOrder(view, "couple.compare", "healthComparison", 20) }}>\n                <SectionCard\n                  title="Health comparison"''',1)
# close compare section wrapper before fragment close - target first end after Medication doses block
needle='''                  </div>\n                </SectionCard>\n              </>\n            ) : null}'''
s=s.replace(needle,'''                  </div>\n                </SectionCard>\n                </div>\n              </>\n            ) : null}''',1)
# health cards wrappers
s=s.replace('''{activeTab === "health" ? (\n              <SectionCard\n                title={`${t(partnerName)} — ${t("shared details")}`}''','''{activeTab === "health" ? (\n              <div style={{ order: layoutOrder(view, "couple.health", "partnerDetails", 10) }}>\n              <SectionCard\n                title={`${t(partnerName)} — ${t("shared details")}`}''',1)
# first health close
healthneedle='''                </div>\n              </SectionCard>\n            ) : null}\n\n            {activeTab === "health" ? ('''
s=s.replace(healthneedle,'''                </div>\n              </SectionCard>\n              </div>\n            ) : null}\n\n            {activeTab === "health" ? (''',1)
s=s.replace('''{activeTab === "health" ? (\n              <SectionCard\n                title="My shared details"''','''{activeTab === "health" ? (\n              <div style={{ order: layoutOrder(view, "couple.health", "myDetails", 20) }}>\n              <SectionCard\n                title="My shared details"''',1)
# last health close before fragment
last='''                </div>\n              </SectionCard>\n            ) : null}\n          </>'''
s=s.replace(last,'''                </div>\n              </SectionCard>\n              </div>\n            ) : null}\n          </>''',1)
p.write_text(s)

print('layout order install complete')
