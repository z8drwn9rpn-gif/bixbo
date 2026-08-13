from pathlib import Path

# 1) Tailored descriptions for each symptom scale.
p = Path('src/lib/scaleDescriptions.ts')
s = p.read_text()
s = s.replace(
'export type ScaleKey = "pain" | "stress" | "tetany" | "panic" | "hotFlashes" | "headache";',
'export type ScaleKey = "pain" | "stress" | "tetany" | "panic" | "hotFlashes" | "headache" | "pressure" | "nausea";'
)

start = s.index('export const DEFAULT_HEADACHE_DESC')
end = s.index('export const SCALE_META')
new_defs = '''export const DEFAULT_PRESSURE_DESC: Record<number, string> = {
  1: "Barely noticeable — slight pressure, easy to ignore",
  2: "Mild — clear pressure but not distracting",
  3: "Noticeable — present often, still easy to function",
  4: "Persistent — harder to ignore during activity",
  5: "Moderate — clearly uncomfortable and distracting",
  6: "Moderate high — difficult to ignore, concentration affected",
  7: "Strong — pressure interferes with normal activity",
  8: "Very strong — activity is clearly limited",
  9: "Severe — difficult to function normally",
  10: "Extreme — strongest pressure you can imagine",
};

export const DEFAULT_NAUSEA_DESC: Record<number, string> = {
  1: "Very mild — barely noticeable nausea",
  2: "Mild — noticeable but easy to ignore",
  3: "Mild — uncomfortable with little effect on activity",
  4: "Mild to moderate — persistent but manageable",
  5: "Moderate — affects appetite or concentration",
  6: "Moderate high — hard to ignore",
  7: "Strong — activity is affected",
  8: "Severe — difficult to continue normal activities",
  9: "Very severe — near-vomiting feeling or major functional impact",
  10: "Extreme — worst nausea imaginable",
};

export const DEFAULT_HEADACHE_DESC: Record<number, string> = {
  1: "Barely noticeable — minimal head pain",
  2: "Mild — easy to ignore",
  3: "Mild — occasionally distracting",
  4: "Noticeable — still manageable",
  5: "Moderate — clearly affects comfort",
  6: "Moderate high — concentration is affected",
  7: "Strong — difficult to continue normal activity",
  8: "Severe — normal activity is very difficult",
  9: "Very severe — activity largely stops",
  10: "Worst imaginable — maximum headache intensity",
};

export const DEFAULT_TETANY_INTENSITY_DESC: Record<number, string> = {
  1: "Very mild — tingling or slight muscle tension",
  2: "Mild — clear tingling, numbness or mild twitching/cramping",
  3: "Moderate — repeated tingling, cramps or muscle tightness with noticeable impact",
  4: "Severe — strong cramps or spasms; affected muscles are difficult to use",
  5: "Very severe — major spasm or episode with substantial functional impairment",
};

export const DEFAULT_PANIC_INTENSITY_DESC: Record<number, string> = {
  1: "Very mild — symptoms are present but barely distressing",
  2: "Mild — noticeable symptoms, easy to manage",
  3: "Mild — some discomfort or anxiety",
  4: "Moderate low — clearly distressing but still controlled",
  5: "Moderate — significant symptoms; harder to focus",
  6: "Moderate high — strong physical or cognitive symptoms",
  7: "Severe — difficult to function normally",
  8: "Very severe — overwhelming symptoms; activity largely stops",
  9: "Extreme — very intense fear and physical symptoms; difficult to regain control",
  10: "Maximum intensity — most intense panic experience imaginable",
};

export const DEFAULT_STRESS_DESC: Record<number, string> = {
  0: "None — completely calm and relaxed",
  1: "Very low — barely any tension",
  2: "Low — slight background pressure",
  3: "Mild — a little on edge",
  4: "Moderate low — noticeable but manageable",
  5: "Moderate — clearly stressed, still coping",
  6: "Moderate high — tense, harder to focus",
  7: "High — irritable, body feels tight",
  8: "Very high — overwhelmed, hard to relax",
  9: "Severe — near breaking point",
  10: "Extreme — cannot cope, shutdown or panic",
};

export const DEFAULT_HOT_FLASHES_DESC: Record<number, string> = {
  1: "Very mild — brief warmth, barely bothersome",
  2: "Mild — clear warmth with little or no sweating; activity unaffected",
  3: "Moderate — noticeable heat and/or sweating; uncomfortable but activity continues",
  4: "Severe — strong heat and sweating; activity may need to pause",
  5: "Very severe — intense episode with major discomfort or interruption of activity/sleep",
};

'''
s = s[:start] + new_defs + s[end:]
s = s.replace(
'  headache:   { label: "Headache (1–10)",     from: 1, to: 10, defaults: DEFAULT_HEADACHE_DESC },\n',
'  headache:   { label: "Headache (1–10)",     from: 1, to: 10, defaults: DEFAULT_HEADACHE_DESC },\n  pressure:   { label: "Pressure intensity (1–10)", from: 1, to: 10, defaults: DEFAULT_PRESSURE_DESC },\n  nausea:     { label: "Nausea severity (1–10)", from: 1, to: 10, defaults: DEFAULT_NAUSEA_DESC },\n'
)
p.write_text(s)

# 2) Use popup guides and tailored data in the LogSheet.
p = Path('src/components/LogSheet.tsx')
s = p.read_text()

# Generic scale info: popup instead of inline content.
old = '''        {scaleInfoOpen && scaleProps?.descriptions && infoRange ? (\n          <ScaleLegend\n            max={infoRange.max}\n            from={infoRange.from}\n            descriptions={scaleProps.descriptions}\n            value={scaleProps.value}\n            title={scaleProps.legendTitle ?? `${displayLabel} scale`}\n          />\n        ) : null}'''
new = '''        {scaleInfoOpen && scaleProps?.descriptions && infoRange ? (\n          <div\n            className="fixed inset-0 z-[90] flex items-end justify-center bg-black/20 px-3 pb-[calc(12px+env(safe-area-inset-bottom))] backdrop-blur-[1px]"\n            role="presentation"\n            onClick={() => setScaleInfoOpen(false)}\n          >\n            <div\n              role="dialog"\n              aria-modal="true"\n              aria-label={t(scaleProps.legendTitle ?? `${displayLabel} scale`)}\n              className="max-h-[78dvh] w-full max-w-md overflow-y-auto rounded-[1.6rem] border border-border/70 bg-background p-4 shadow-2xl"\n              onClick={(e) => e.stopPropagation()}\n            >\n              <div className="mb-2 flex items-center justify-between gap-3">\n                <div className="flex items-center gap-2">\n                  <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary">i</span>\n                  <h3 className="font-serif text-lg font-semibold">{t(scaleProps.legendTitle ?? `${displayLabel} scale`)}</h3>\n                </div>\n                <button\n                  type="button"\n                  onClick={() => setScaleInfoOpen(false)}\n                  aria-label={t("Close")}\n                  className="grid h-8 w-8 place-items-center rounded-full bg-tint text-foreground ring-1 ring-border"\n                >\n                  <X className="h-4 w-4" />\n                </button>\n              </div>\n              <ScaleLegend\n                max={infoRange.max}\n                from={infoRange.from}\n                descriptions={scaleProps.descriptions}\n                value={scaleProps.value}\n                title={scaleProps.legendTitle ?? `${displayLabel} scale`}\n              />\n            </div>\n          </div>\n        ) : null}'''
if old not in s:
    raise SystemExit('generic scale legend block not found')
s = s.replace(old, new, 1)

# Pressure gets pressure-specific descriptions, not pain descriptions.
s = s.replace('descriptions={getScaleDesc(data, "pain")}\n                  legendTitle="Pressure intensity scale"', 'descriptions={getScaleDesc(data, "pressure")}\n                  legendTitle="Pressure intensity scale"', 1)

# Nausea uses the central tailored description set.
s = s.replace('descriptions={NAUSEA_SEVERITY_DESC}\n                  legendTitle="Nausea severity scale"', 'descriptions={getScaleDesc(data, "nausea")}\n                  legendTitle="Nausea severity scale"', 1)

# Blueberry cramp pain: use shared IntensityScale so its i popup is automatic; remove permanent legend.
old_blue = '''      <Field label={`${t("Cramp pain")} ${cramps ?? "—"} / 10`} schemaFieldId="cramps">\n        <div className="mt-2 flex flex-nowrap items-center justify-center gap-0.5 px-0">\n          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (\n            <button\n              key={n}\n              type="button"\n              onClick={() => setCramps(cramps === n ? undefined : n)}\n              title={`${n} — ${t(painDesc[n])}`}\n              aria-label={`${n} — ${t(painDesc[n])}`}\n              className={`h-7 w-7 shrink-0 rounded-full text-[10px] font-semibold transition ${\n                cramps === n ? "text-white ring-2 ring-foreground" : "text-foreground"\n              }`}\n              style={{ background: painColor(n) }}\n            >\n              {n}\n            </button>\n          ))}\n        </div>\n        <ScaleLegend\n          max={10}\n          from={1}\n          descriptions={painDesc}\n          value={cramps}\n          title={t("Pain scale (Mankosky)")}\n        />\n      </Field>'''
new_blue = '''      <Field label={`${t("Cramp pain")} ${cramps ?? "—"} / 10`} schemaFieldId="cramps">\n        <IntensityScale\n          value={cramps ?? -1}\n          onChange={(n) => setCramps(cramps === n ? undefined : n)}\n          max={10}\n          from={1}\n          step={1}\n          descriptions={painDesc}\n          legendTitle="Cramp pain scale"\n          compactSingleRow\n          schemaFieldId="cramps"\n        />\n      </Field>'''
if old_blue not in s:
    raise SystemExit('Blueberry cramp block not found')
s = s.replace(old_blue, new_blue, 1)

p.write_text(s)
