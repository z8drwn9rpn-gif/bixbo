from pathlib import Path


def replace(path: str, old: str, new: str, count: int | None = None):
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise SystemExit(f'matcher not found in {path}: {old[:100]!r}')
    s = s.replace(old, new, count if count is not None else -1)
    p.write_text(s)

# Calendar Event/To-do: prevent iPhone two-column controls from overlapping.
p = Path('src/features/logging/CalendarForms.tsx')
s = p.read_text()
s = s.replace('className="grid grid-cols-2 gap-2"', 'className="grid min-w-0 grid-cols-2 gap-2 [&>*]:min-w-0"')
p.write_text(s)

# Period: match Pain chip sizing instead of wide tiles.
p = Path('src/features/logging/CycleForms.tsx')
s = p.read_text()
s = s.replace('className="mt-2 grid grid-cols-5 gap-1.5"', 'className="mt-2 flex flex-wrap gap-2"')
s = s.replace('className={`rounded-2xl p-2 text-[11px] font-medium ${level === L.v ? "text-white ring-2 ring-foreground" : "bg-tint text-foreground"}`}', 'className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${level === L.v ? "text-white shadow-sm ring-2 ring-foreground/70" : "bg-tint text-foreground ring-1 ring-border"}`}')

# Suksuk: all selectable choices use the same compact Pain pills.
s = s.replace('className="grid grid-cols-2 gap-2 sm:grid-cols-4"', 'className="flex flex-wrap gap-2"')
s = s.replace('className={`min-h-[68px] rounded-3xl border px-2 py-2 text-xs font-semibold transition ${kind === o.value ? "border-primary bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30" : "border-border bg-surface text-foreground"}`}', 'className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${kind === o.value ? "bg-primary text-primary-foreground shadow-md ring-2 ring-foreground/70 ring-offset-2 ring-offset-background" : "bg-tint text-foreground ring-1 ring-border"}`}')
s = s.replace('className="grid grid-cols-3 gap-2"', 'className="flex flex-wrap gap-2"', 1)
s = s.replace('className={`flex h-12 items-center justify-center gap-2 rounded-2xl border text-xs font-semibold ${orgasm === value ? "border-primary bg-primary text-primary-foreground ring-1 ring-primary/30" : "border-border bg-surface"}`}', 'className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${orgasm === value ? "bg-primary text-primary-foreground shadow-md ring-2 ring-foreground/70 ring-offset-2 ring-offset-background" : "bg-tint text-foreground ring-1 ring-border"}`}')
s = s.replace('className={`h-11 rounded-2xl border px-2 text-xs font-semibold ${protection === value ? "border-primary bg-primary/15 text-primary ring-1 ring-primary/30" : "border-border bg-surface"}`}', 'className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${protection === value ? "bg-primary text-primary-foreground shadow-md ring-2 ring-foreground/70 ring-offset-2 ring-offset-background" : "bg-tint text-foreground ring-1 ring-border"}`}')
s = s.replace('className="grid grid-cols-2 gap-2">\n        {symptomOptions.map', 'className="flex flex-wrap gap-2">\n        {symptomOptions.map')
s = s.replace('className={`min-h-10 rounded-2xl border px-2 text-[11px] font-medium ${symptomsAfter.includes(value) ? "border-primary bg-primary/15 text-primary ring-1 ring-primary/20" : "border-border bg-surface"}`}', 'className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${symptomsAfter.includes(value) ? "bg-primary text-primary-foreground shadow-md ring-2 ring-foreground/70 ring-offset-2 ring-offset-background" : "bg-tint text-foreground ring-1 ring-border"}`}')

# Suksuk time: remove the oversized nested card effect and use normal Pain-sized control.
s = s.replace('className="rounded-3xl bg-surface p-3 ring-1 ring-border/80"', 'className="border-b border-border/60 pb-3"', 1)
s = s.replace('className="h-12 rounded-2xl bg-background/35 text-base"', 'className="h-10 w-full rounded-xl text-sm"')

# Heat / Cold / TENS: compact the repeated option tiles while keeping therapy type as the three-icon row.
s = s.replace('className={`h-9 rounded-xl border px-1 text-[11px] font-semibold ${!ongoing && Number(minutes) === value ? "border-primary bg-primary text-primary-foreground ring-1 ring-primary/30" : "border-border bg-surface text-foreground"}`}', 'className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${!ongoing && Number(minutes) === value ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-foreground/60" : "bg-tint text-foreground ring-1 ring-border"}`}')
s = s.replace('className="grid grid-cols-2 gap-1.5">{bodyAreas.map', 'className="flex flex-wrap gap-2">{bodyAreas.map')
s = s.replace('className={`h-9 rounded-xl border px-2 text-[11px] font-medium ${bodyArea === value ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/20" : "border-border bg-surface"}`}', 'className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${bodyArea === value ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-foreground/60" : "bg-tint text-foreground ring-1 ring-border"}`}')
s = s.replace('className="grid grid-cols-3 gap-1.5">{(["low", "medium", "high"] as const).map', 'className="flex flex-wrap gap-2">{(["low", "medium", "high"] as const).map')
s = s.replace('className={`h-9 rounded-xl border px-2 text-[11px] font-medium capitalize ${level === value ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/20" : "border-border bg-surface"}`}', 'className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition ${level === value ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-foreground/60" : "bg-tint text-foreground ring-1 ring-border"}`}')
s = s.replace('className="grid grid-cols-5 gap-1">{([ ["not-yet"', 'className="flex flex-wrap gap-2">{([ ["not-yet"')
s = s.replace('className={`flex h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border px-0.5 text-[9px] font-medium ${effectiveness === value ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/20" : "border-border bg-surface"}`}', 'className={`inline-flex items-center justify-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ${effectiveness === value ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-foreground/60" : "bg-tint text-foreground ring-1 ring-border"}`}')
p.write_text(s)

# Shared visual constraints: real iPhone-safe layout, Pain-size fields and no overlap.
p = Path('src/styles.css')
css = p.read_text()
marker = '/* BIXBO true Pain-style log sizing */'
if marker not in css:
    css += r'''

/* BIXBO true Pain-style log sizing */
.bixbo-unified-log {
  overflow-x: hidden;
}

.bixbo-unified-log *,
.bixbo-unified-log *::before,
.bixbo-unified-log *::after {
  box-sizing: border-box;
}

/* Grid children must be allowed to shrink on iPhone; otherwise date/time inputs overlap. */
.bixbo-unified-log .grid > * {
  min-width: 0;
  max-width: 100%;
}

.bixbo-unified-log input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),
.bixbo-unified-log select {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 40px;
  height: 40px;
  border-radius: 14px;
  padding-inline: 12px;
  font-size: 14px;
}

.bixbo-unified-log textarea {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 72px;
  border-radius: 16px;
  padding: 10px 12px;
  font-size: 14px;
}

/* Keep section rhythm close to Pain instead of large card stacks. */
.bixbo-unified-log section {
  min-width: 0;
}

.bixbo-unified-log section[class*="border-t"] {
  padding-top: 12px;
}

/* Compact selectable buttons that already use pill semantics. */
.bixbo-unified-log button.rounded-full {
  min-height: 30px;
  max-width: 100%;
  white-space: normal;
  line-height: 1.15;
}

/* Information cards can stay cards, but never exceed the viewport. */
.bixbo-unified-log .rounded-3xl,
.bixbo-unified-log .rounded-2xl,
.bixbo-unified-log .rounded-xl {
  max-width: 100%;
}

/* Medication rows and other compound controls may contain inputs: force them to shrink instead of overlap. */
.bixbo-unified-log [class*="grid-cols-"] input,
.bixbo-unified-log [class*="grid-cols-"] textarea,
.bixbo-unified-log [class*="grid-cols-"] select {
  min-width: 0;
  max-width: 100%;
}

@media (max-width: 430px) {
  .bixbo-unified-log {
    padding-inline: 16px;
  }

  .bixbo-unified-log .gap-4 { gap: 12px; }
  .bixbo-unified-log .gap-3 { gap: 10px; }
}
'''
p.write_text(css)
