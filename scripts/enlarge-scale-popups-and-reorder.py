from pathlib import Path

p = Path('src/components/LogSheet.tsx')
s = p.read_text()

# 1) Make every generic scale popup substantially larger/readable.
s = s.replace(
    'className="max-h-[78dvh] w-full max-w-md overflow-y-auto rounded-[1.6rem] border border-border/70 bg-background p-4 shadow-2xl"',
    'className="max-h-[90dvh] w-[calc(100vw-16px)] max-w-lg overflow-y-auto rounded-[1.8rem] border border-border/70 bg-background p-5 shadow-2xl"',
    1,
)
s = s.replace(
    'className="mb-2 flex items-center justify-between gap-3"',
    'className="mb-3 flex items-center justify-between gap-3"',
    1,
)
s = s.replace(
    'className="grid h-7 w-7 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary"',
    'className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-base font-bold text-primary"',
    1,
)
s = s.replace(
    'className="font-serif text-lg font-semibold"',
    'className="font-serif text-xl font-semibold"',
    1,
)
s = s.replace(
    'className="grid h-8 w-8 place-items-center rounded-full bg-tint text-foreground ring-1 ring-border"',
    'className="grid h-10 w-10 place-items-center rounded-full bg-tint text-foreground ring-1 ring-border"',
    1,
)

# Scale legend is shared by all scale popups; make entries readable.
s = s.replace(
    'className="mt-2 rounded-xl border border-border/60 bg-surface/50 p-2.5"',
    'className="mt-2 rounded-2xl border border-border/60 bg-surface/50 p-4"',
    1,
)
s = s.replace(
    'className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"',
    'className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"',
    1,
)
s = s.replace(
    'className="space-y-1 text-[11px] leading-tight"',
    'className="space-y-2.5 text-sm leading-snug"',
    1,
)
s = s.replace(
    'className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"',
    'className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white"',
    1,
)

# 2) Pressure: intensity scale first, then type.
old_pressure = '''              <Field label="Type of pressure">
                <CustomChipList
                  base={PRESSURE_TYPES}
                  custom={data.custom.pressureTypes ?? []}
                  onAddCustom={(v) => addCustom("pressureTypes", v)}
                  onRemoveCustom={(v) => {
                    removeCustom("pressureTypes", v);
                    setPressureTypes((a) => a.filter((x) => x !== v));
                  }}
                  onRenameCustom={(o, n) => {
                    renameCustom("pressureTypes", o, n);
                    setPressureTypes((a) => a.map((x) => (x === o ? n : x)));
                  }}
                  selected={pressureTypes}
                  onToggle={(v) => setPressureTypes((a) => toggleIn(a, v))}
                />
              </Field>
              <Field label={`Pressure intensity ${pressureIntensity ?? "-"}/10`}>
                <IntensityScale
                  value={pressureIntensity ?? -1}
                  onChange={(n) => setPressureIntensity(pressureIntensity === n ? undefined : n)}
                  max={10}
                  from={1}
                  step={1}
                  descriptions={getScaleDesc(data, "pressure")}
                  legendTitle="Pressure intensity scale"
                  compactSingleRow
                />
              </Field>'''
new_pressure = '''              <Field label={`Pressure intensity ${pressureIntensity ?? "-"}/10`}>
                <IntensityScale
                  value={pressureIntensity ?? -1}
                  onChange={(n) => setPressureIntensity(pressureIntensity === n ? undefined : n)}
                  max={10}
                  from={1}
                  step={1}
                  descriptions={getScaleDesc(data, "pressure")}
                  legendTitle="Pressure intensity scale"
                  compactSingleRow
                />
              </Field>
              <Field label="Type of pressure">
                <CustomChipList
                  base={PRESSURE_TYPES}
                  custom={data.custom.pressureTypes ?? []}
                  onAddCustom={(v) => addCustom("pressureTypes", v)}
                  onRemoveCustom={(v) => {
                    removeCustom("pressureTypes", v);
                    setPressureTypes((a) => a.filter((x) => x !== v));
                  }}
                  onRenameCustom={(o, n) => {
                    renameCustom("pressureTypes", o, n);
                    setPressureTypes((a) => a.map((x) => (x === o ? n : x)));
                  }}
                  selected={pressureTypes}
                  onToggle={(v) => setPressureTypes((a) => toggleIn(a, v))}
                />
              </Field>'''
if old_pressure not in s:
    raise SystemExit('pressure block not found')
s = s.replace(old_pressure, new_pressure, 1)

# 3) Nausea: severity scale first inside the expanded nausea card.
old_nausea_type = '''              <Field label="Type of nausea">
                <CustomChipList
                  base={NAUSEA_TYPES}
                  custom={data.custom.nauseaTypes ?? []}
                  descriptions={NAUSEA_TYPE_DESC}
                  onAddCustom={(v) => addCustom("nauseaTypes", v)}
                  onRemoveCustom={(v) => {
                    removeCustom("nauseaTypes", v);
                    setNauseaTypes((a) => a.filter((x) => x !== v));
                  }}
                  onRenameCustom={(o, n) => {
                    renameCustom("nauseaTypes", o, n);
                    setNauseaTypes((a) => a.map((x) => (x === o ? n : x)));
                  }}
                  selected={nauseaTypes}
                  onToggle={(v) => setNauseaTypes((a) => toggleIn(a, v))}
                />
              </Field>
              <Field label={`Nausea severity ${nauseaSeverity ?? "-"}/10`}>
                <IntensityScale
                  value={nauseaSeverity ?? -1}
                  onChange={(n) => setNauseaSeverity(nauseaSeverity === n ? undefined : n)}
                  max={10}
                  from={1}
                  step={1}
                  descriptions={getScaleDesc(data, "nausea")}
                  legendTitle="Nausea severity scale"
                  compactSingleRow
                />
              </Field>'''
new_nausea_type = '''              <Field label={`Nausea severity ${nauseaSeverity ?? "-"}/10`}>
                <IntensityScale
                  value={nauseaSeverity ?? -1}
                  onChange={(n) => setNauseaSeverity(nauseaSeverity === n ? undefined : n)}
                  max={10}
                  from={1}
                  step={1}
                  descriptions={getScaleDesc(data, "nausea")}
                  legendTitle="Nausea severity scale"
                  compactSingleRow
                />
              </Field>
              <Field label="Type of nausea">
                <CustomChipList
                  base={NAUSEA_TYPES}
                  custom={data.custom.nauseaTypes ?? []}
                  descriptions={NAUSEA_TYPE_DESC}
                  onAddCustom={(v) => addCustom("nauseaTypes", v)}
                  onRemoveCustom={(v) => {
                    removeCustom("nauseaTypes", v);
                    setNauseaTypes((a) => a.filter((x) => x !== v));
                  }}
                  onRenameCustom={(o, n) => {
                    renameCustom("nauseaTypes", o, n);
                    setNauseaTypes((a) => a.map((x) => (x === o ? n : x)));
                  }}
                  selected={nauseaTypes}
                  onToggle={(v) => setNauseaTypes((a) => toggleIn(a, v))}
                />
              </Field>'''
if old_nausea_type not in s:
    raise SystemExit('nausea block not found')
s = s.replace(old_nausea_type, new_nausea_type, 1)

# 4) Headache: intensity scale first, then headache type.
old_headache = '''                <Field label="Headache type">
                  <CustomChipList
                    base={HEADACHE_TYPES}
                    custom={data.custom.headacheTypes ?? []}
                    descriptions={HEADACHE_TYPE_DESC}
                    onAddCustom={(v) => addCustom("headacheTypes", v)}
                    onRemoveCustom={(v) => {
                      removeCustom("headacheTypes", v);
                      setHeadacheTypes((a) => a.filter((x) => x !== v));
                    }}
                    onRenameCustom={(o, n) => {
                      renameCustom("headacheTypes", o, n);
                      setHeadacheTypes((a) => a.map((x) => (x === o ? n : x)));
                    }}
                    selected={headacheTypes}
                    onToggle={(v) => setHeadacheTypes((a) => toggleIn(a, v))}
                  />
                </Field>
                <Field label={`Headache intensity ${headacheIntensity ?? "-"}/10`}>
                  <IntensityScale
                    value={headacheIntensity ?? 0}
                    onChange={(n) => setHeadacheIntensity(headacheIntensity === n ? undefined : n)}
                    max={10}
                    from={1}
                    step={1}
                    descriptions={getScaleDesc(data, "headache")}
                    legendTitle="Headache scale"
                    compactSingleRow
                  />
                </Field>'''
new_headache = '''                <Field label={`Headache intensity ${headacheIntensity ?? "-"}/10`}>
                  <IntensityScale
                    value={headacheIntensity ?? 0}
                    onChange={(n) => setHeadacheIntensity(headacheIntensity === n ? undefined : n)}
                    max={10}
                    from={1}
                    step={1}
                    descriptions={getScaleDesc(data, "headache")}
                    legendTitle="Headache scale"
                    compactSingleRow
                  />
                </Field>
                <Field label="Headache type">
                  <CustomChipList
                    base={HEADACHE_TYPES}
                    custom={data.custom.headacheTypes ?? []}
                    descriptions={HEADACHE_TYPE_DESC}
                    onAddCustom={(v) => addCustom("headacheTypes", v)}
                    onRemoveCustom={(v) => {
                      removeCustom("headacheTypes", v);
                      setHeadacheTypes((a) => a.filter((x) => x !== v));
                    }}
                    onRenameCustom={(o, n) => {
                      renameCustom("headacheTypes", o, n);
                      setHeadacheTypes((a) => a.map((x) => (x === o ? n : x)));
                    }}
                    selected={headacheTypes}
                    onToggle={(v) => setHeadacheTypes((a) => toggleIn(a, v))}
                  />
                </Field>'''
if old_headache not in s:
    raise SystemExit('headache block not found')
s = s.replace(old_headache, new_headache, 1)

# 5) Main pain info popup should be large/readable too.
s = s.replace(
    'className="w-full max-w-md rounded-[1.6rem] border border-border/70 bg-background p-4 shadow-2xl"',
    'className="max-h-[90dvh] w-[calc(100vw-16px)] max-w-lg overflow-y-auto rounded-[1.8rem] border border-border/70 bg-background p-5 shadow-2xl"',
    1,
)

p.write_text(s)
