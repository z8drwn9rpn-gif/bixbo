from pathlib import Path

p = Path('src/routes/insights.tsx')
s = p.read_text()

def once(old: str, new: str, label: str):
    global s
    if old not in s:
        raise SystemExit(f'{label}: target not found')
    s = s.replace(old, new, 1)

once(
'''  const [overviewView, setOverviewView] = useState<"insights" | "patterns">("insights");''',
'''  const [overviewView, setOverviewView] = useState<"insights" | "patterns">("insights");
  const [insightsFilter, setInsightsFilter] = useState<
    "all" | "overview" | "pain" | "symptoms" | "bowel" | "meds"
  >("all");''',
'add insights filter state',
)

marker = '''      {overviewView === "patterns" ? (
        <PatternsContent />
      ) : ('''
insert = '''      {overviewView === "insights" ? (
        <div className="px-5 pt-2 lg:px-0">
          <div
            className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="group"
            aria-label={t("Insights sections")}
          >
            {([
              ["all", "All"],
              ["overview", "Overview"],
              ["pain", "Pain"],
              ["symptoms", "Symptoms"],
              ["bowel", "Bowel"],
              ["meds", "Meds"],
            ] as const).map(([id, label]) => {
              const selected = insightsFilter === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setInsightsFilter(id)}
                  aria-pressed={selected}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                    selected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-surface text-muted-foreground ring-1 ring-border/70 hover:text-foreground"
                  }`}
                >
                  {t(label)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {overviewView === "patterns" ? (
        <PatternsContent />
      ) : ('''
once(marker, insert, 'add insights category nav')

once(
'''        <div className="lg:col-span-2" style={{ order: layoutOrder(view, "insights", "heatmap", 10) }}>''',
'''        <div
          className={insightsFilter === "all" || insightsFilter === "overview" ? "lg:col-span-2" : "hidden"}
          style={{ order: layoutOrder(view, "insights", "heatmap", 10) }}
        >''',
'filter heatmap',
)

once(
'''        <section style={{ order: layoutOrder(view, "insights", "pain", 20) }} className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">''',
'''        <section
          style={{ order: layoutOrder(view, "insights", "pain", 20) }}
          className={`${insightsFilter === "all" || insightsFilter === "pain" ? "" : "hidden "}rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80`}
        >''',
'filter pain',
)

once(
'''        <section style={{ order: layoutOrder(view, "insights", "hotFlashes", 30) }} className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">''',
'''        <section
          style={{ order: layoutOrder(view, "insights", "hotFlashes", 30) }}
          className={`${insightsFilter === "all" || insightsFilter === "symptoms" ? "" : "hidden "}rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80`}
        >''',
'filter hot flashes',
)

once(
'''        <div style={{ order: layoutOrder(view, "insights", "bowel", 40) }}>''',
'''        <div
          className={insightsFilter === "all" || insightsFilter === "bowel" ? "" : "hidden"}
          style={{ order: layoutOrder(view, "insights", "bowel", 40) }}
        >''',
'filter bowel',
)

once(
'''        <div style={{ order: layoutOrder(view, "insights", "timeOfDay", 50) }}>''',
'''        <div
          className={insightsFilter === "all" || insightsFilter === "symptoms" ? "" : "hidden"}
          style={{ order: layoutOrder(view, "insights", "timeOfDay", 50) }}
        >''',
'filter time of day',
)

once(
'''        <div style={{ order: layoutOrder(view, "insights", "meds", 60) }}>''',
'''        <div
          className={insightsFilter === "all" || insightsFilter === "meds" ? "" : "hidden"}
          style={{ order: layoutOrder(view, "insights", "meds", 60) }}
        >''',
'filter meds',
)

# Make the repeated Week / Month / Year controls fit mobile cards without squeezing titles.
s = s.replace(
    'className="grid h-8 w-[210px] grid-cols-3 rounded-xl bg-tint p-0.5 ring-1 ring-border/60"',
    'className="grid h-8 w-full grid-cols-3 rounded-xl bg-tint p-0.5 ring-1 ring-border/60 sm:w-[210px]"',
)
s = s.replace(
    'className="grid h-8 w-[210px] grid-cols-[32px_minmax(0,1fr)_32px] items-center rounded-xl bg-background/70 p-0.5 ring-1 ring-border/60"',
    'className="grid h-8 w-full grid-cols-[32px_minmax(0,1fr)_32px] items-center rounded-xl bg-background/70 p-0.5 ring-1 ring-border/60 sm:w-[210px]"',
)
s = s.replace(
    'className="flex shrink-0 flex-col items-end gap-1"',
    'className="flex w-full shrink-0 flex-col gap-1 sm:w-auto sm:items-end"',
)
s = s.replace(
    'className="flex items-start justify-between gap-3"',
    'className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3"',
)
s = s.replace(
    'className="flex items-start gap-3"',
    'className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3"',
)

p.write_text(s)
