from pathlib import Path

path = Path('src/routes/index.tsx')
s = path.read_text()

old = '''type VitalTrendPoint = {\n  key: string;\n  label: string;\n  heading: string;\n  value?: number;\n  details: string[];\n};'''
new = '''type VitalTrendPoint = {\n  key: string;\n  label: string;\n  heading: string;\n  value?: number;\n  details: string[];\n  /** Number of actual saved records represented by this plotted point. */\n  recordCount: number;\n};'''
assert old in s
s = s.replace(old, new, 1)

anchor = '''function monthlyVitalRecords(metric: VitalTrendMetric, start: Date, end: Date, data: BixboData) {'''
helper = '''function dailyVitalRecordCount(metric: VitalTrendMetric, key: string, data: BixboData): number {\n  const log = data.dayLogs[key];\n  if (!log) return 0;\n\n  if (metric === "sleep") {\n    const hours = log.sleepHours ?? log.pregnancy?.sleepHours ?? log.postpartum?.sleepHours;\n    return hours != null && Number.isFinite(hours) ? 1 : 0;\n  }\n\n  const entries = metric === "temperature" ? log.temperatureEntries ?? [] : log.weightEntries ?? [];\n  const validEntries = entries.filter((entry) => Number.isFinite(Number(entry.value)));\n  if (validEntries.length) return validEntries.length;\n\n  const legacy = metric === "temperature" ? log.temperature : log.weight;\n  return legacy != null && Number.isFinite(legacy) ? 1 : 0;\n}\n\n'''
assert anchor in s
s = s.replace(anchor, helper + anchor, 1)

old = '''          value: averageNumbers(records.values),\n          details: records.details,\n        };'''
new = '''          value: averageNumbers(records.values),\n          details: records.details,\n          recordCount: records.values.length,\n        };'''
assert old in s
s = s.replace(old, new, 1)

old = '''        value: dailyVitalTrendValue(metric, data.dayLogs[key]),\n        details: dailyVitalDetails(metric, key, data),\n      };'''
new = '''        value: dailyVitalTrendValue(metric, data.dayLogs[key]),\n        details: dailyVitalDetails(metric, key, data),\n        recordCount: dailyVitalRecordCount(metric, key, data),\n      };'''
assert old in s
s = s.replace(old, new, 1)

anchor = '''function SleepTrendBars({'''
tooltip = '''function VitalTrendTooltip({\n  point,\n  unit,\n  leftPct,\n  topPx,\n  annual,\n}: {\n  point: VitalTrendPoint;\n  unit: string;\n  leftPct: number;\n  topPx: number;\n  annual: boolean;\n}) {\n  if (point.value == null) return null;\n\n  const clamped = Math.max(0, Math.min(100, leftPct));\n  const position =\n    clamped < 18\n      ? { left: "6px", transform: "none" }\n      : clamped > 82\n        ? { right: "6px", transform: "none" }\n        : { left: `${clamped}%`, transform: "translateX(-50%)" };\n\n  return (\n    <div\n      className="pointer-events-none absolute z-30 w-[128px] rounded-xl bg-surface px-2.5 py-2 text-left shadow-lg ring-1 ring-primary/35"\n      style={{ ...position, top: Math.max(4, topPx) }}\n      data-bixbo-vital-tooltip\n    >\n      <p className="truncate text-[9px] font-semibold text-muted-foreground">{point.heading}</p>\n      <p className="mt-0.5 text-[12px] font-bold tabular-nums text-foreground">\n        {annual ? "Avg " : ""}{point.value.toFixed(1)} {unit}\n      </p>\n      {annual ? (\n        <p className="mt-0.5 text-[8px] text-muted-foreground">{point.recordCount} saved {point.recordCount === 1 ? "entry" : "entries"}</p>\n      ) : null}\n    </div>\n  );\n}\n\n'''
assert anchor in s
s = s.replace(anchor, tooltip + anchor, 1)

old = '''  const active = activeIndex != null ? points[activeIndex] : undefined;\n\n  return ('''
new = '''  const active = activeIndex != null ? points[activeIndex] : undefined;\n  const showDetailPanel = Boolean(active?.value != null && (period === "Y" || active.recordCount > 1));\n  const tooltipLeftPct = activeIndex == null\n    ? 50\n    : points.length <= 1\n      ? 50\n      : metric === "sleep"\n        ? ((activeIndex + 0.5) / Math.max(1, points.length)) * 100\n        : (xFor(activeIndex) / chartWidth) * 100;\n  const tooltipTopPx = active?.value == null\n    ? 4\n    : metric === "sleep"\n      ? Math.max(4, 118 - (Math.min(12, active.value) / 12) * 96 - 56)\n      : Math.max(4, yFor(active.value) - 62);\n\n  return ('''
assert old in s
s = s.replace(old, new, 1)

old = '''          <div className="mt-3 rounded-2xl bg-tint/70 p-2 ring-1 ring-border/50">'''
new = '''          <div className="relative mt-3 rounded-2xl bg-tint/70 p-2 ring-1 ring-border/50">'''
assert old in s
s = s.replace(old, new, 1)

# Add a real point/bar tooltip while retaining the existing chart and detail panel.
needle = '''                {active?.value != null ? (\n                  <div className="mt-2 rounded-2xl bg-surface/80 p-3 ring-1 ring-border/50">'''
replacement = '''                {active?.value != null ? (\n                  <VitalTrendTooltip\n                    point={active}\n                    unit={unit}\n                    leftPct={tooltipLeftPct}\n                    topPx={tooltipTopPx}\n                    annual={period === "Y"}\n                  />\n                ) : null}\n\n                {showDetailPanel && active?.value != null ? (\n                  <div className="mt-2 rounded-2xl bg-surface/80 p-3 ring-1 ring-border/50">'''
assert needle in s
s = s.replace(needle, replacement, 1)

old = '''                ) : (\n                  <p className="mt-2 text-center text-[10px] text-muted-foreground">{t("Tap a point or bar to see the exact saved entry.")}</p>\n                )}'''
new = '''                ) : active?.value == null ? (\n                  <p className="mt-2 text-center text-[10px] text-muted-foreground">{t("Tap a point or bar to see the exact saved entry.")}</p>\n                ) : null}'''
assert old in s
s = s.replace(old, new, 1)

# Make the annual detail wording explicit: the plotted value is the calculated average,
# while every underlying saved record stays listed in the existing detail panel.
old = '''{period === "Y" ? t("Monthly average from saved entries") : t("Saved entry")}'''
new = '''{period === "Y" ? `${t("Calculated average from")} ${active.recordCount} ${t("saved entries")}` : t("Saved entries")}'''
assert old in s
s = s.replace(old, new, 1)

path.write_text(s)
