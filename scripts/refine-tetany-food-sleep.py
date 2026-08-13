from pathlib import Path

# 1) Tetany form: make the first three fields match Panic: Time -> Duration -> Intensity.
p = Path('src/components/LogSheet.tsx')
s = p.read_text()
start = s.index('/* ------------------- TETANY episode ------------------- */')
end = s.index('/* ------------------- PERIOD (Blueberry) ------------------- */', start)
sec = s[start:end]
mark_type = '      <Field label="Type" schemaFieldId="types">'
mark_intensity = '      <Field label={`Intensity ${intensity}/5`} schemaFieldId="intensity">'
mark_duration = '      <DurationField minutes={minutes} setMinutes={setMinutes} ongoing={ongoing} setOngoing={setOngoing} schemaFieldId="duration" />'
mark_triggers = '      <Field label="Triggers" schemaFieldId="triggers">'
for marker in (mark_type, mark_intensity, mark_duration, mark_triggers):
    if marker not in sec:
        raise SystemExit(f'Missing Tetany marker: {marker}')
a = sec.index(mark_type)
b = sec.index(mark_intensity)
c = sec.index(mark_duration)
d = sec.index(mark_triggers)
if not (a < b < c < d):
    raise SystemExit('Unexpected Tetany field order')
type_location = sec[a:b]
intensity = sec[b:c]
duration = sec[c:d]
sec = sec[:a] + duration + '\n' + intensity + type_location + sec[d:]
s = s[:start] + sec + s[end:]
p.write_text(s)

# 2) Registry defaults: same canonical field order as the UI.
p = Path('src/lib/appRegistry.ts')
s = p.read_text()
start = s.index('  tetany: [')
end = s.index('  ],\n  panic: [', start)
sec = s[start:end]
replacements = {
    '{ id: "types", label: "Type", kind: "chips", order: 20 }': '{ id: "types", label: "Type", kind: "chips", order: 40 }',
    '{ id: "location", label: "Location", kind: "chips", order: 30 }': '{ id: "location", label: "Location", kind: "chips", order: 50 }',
    '{ id: "intensity", label: "Intensity", kind: "scale", order: 40, scale: { min: 1, max: 5, step: 1 } }': '{ id: "intensity", label: "Intensity", kind: "scale", order: 30, scale: { min: 1, max: 5, step: 1 } }',
    '{ id: "duration", label: "Duration (min)", kind: "number", order: 50 }': '{ id: "duration", label: "Duration (min)", kind: "number", order: 20 }',
}
for old, new in replacements.items():
    if old not in sec:
        raise SystemExit(f'Missing registry Tetany line: {old}')
    sec = sec.replace(old, new, 1)
s = s[:start] + sec + s[end:]
p.write_text(s)

# 3) Day Overview: make Food entries materially tighter and normalize Temp/Sleep/Weight.
p = Path('src/components/home/DayOverview.tsx')
s = p.read_text()
food_start = s.index('      {log?.food?.length ? (')
food_end = s.index('      {log?.bowel?.length ? (', food_start)
food = s[food_start:food_end]
food = food.replace('<ul className="space-y-2">', '<ul className="space-y-1">', 1)
food = food.replace('border-t border-border/60 pt-2', 'border-t border-border/60 pt-1.5')
food = food.replace('<p className="text-xs text-muted-foreground">{f.time}</p>', '<p className="text-[11px] leading-none text-muted-foreground">{f.time}</p>')
food = food.replace('<div className="my-1.5 border-t border-border/60" />', '<div className="my-1 border-t border-border/60" />')
food = food.replace('text-xs leading-relaxed text-muted-foreground', 'text-[11px] leading-tight text-muted-foreground')
food = food.replace('mt-1 text-xs leading-snug', 'mt-0.5 text-[11px] leading-tight')
food = food.replace('mt-1 whitespace-pre-line text-xs leading-snug', 'mt-0.5 whitespace-pre-line text-[11px] leading-tight')
food = food.replace('mt-0.5 text-[10px] text-primary', 'mt-0 text-[9px] leading-tight text-primary')
s = s[:food_start] + food + s[food_end:]

# Find the Temp/Sleep/Weight block independently, after Workout.
temp_start = s.index('      {(log?.temperature != null || log?.weight != null || log?.sleepHours != null || log?.sleepQuality) && (')
temp_end = s.index('      {tasks.length > 0 && (', temp_start)
temp_old = s[temp_start:temp_end]
temp_new = '''      {(log?.temperature != null || log?.weight != null || log?.sleepHours != null || log?.sleepQuality) && (\n        <Card title="Temp / Sleep / Weight" icon="🌡️">\n          <button onClick={() => onEdit?.("temp", undefined)} className="w-full text-left">\n            <div className="mb-1.5 border-t border-border/60" />\n            {log?.temperature != null && (\n              <p className="text-xs leading-snug text-muted-foreground">\n                <span className="font-semibold text-foreground">{t("Temperature")}:</span> {log.temperature}°C\n              </p>\n            )}\n            {log?.weight != null && (\n              <p className={`${log?.temperature != null ? "mt-1" : ""} text-xs leading-snug text-muted-foreground`}>\n                <span className="font-semibold text-foreground">{t("Weight")}:</span> {log.weight} kg\n              </p>\n            )}\n            {log?.sleepHours != null && (\n              <p className={`${log?.temperature != null || log?.weight != null ? "mt-1" : ""} text-xs leading-snug text-muted-foreground`}>\n                <span className="font-semibold text-foreground">{t("Sleep")}:</span> {log.sleepHours} h\n                {asArr(log.sleepQuality).length > 0 ? <> · <IcoText text={asArr(log.sleepQuality).map(t).join(", ")} size={13} /></> : null}\n              </p>\n            )}\n            {asArr(log?.sleepQuality).length > 0 && log?.sleepHours == null && (\n              <p className={`${log?.temperature != null || log?.weight != null ? "mt-1" : ""} text-xs leading-snug text-muted-foreground`}>\n                <span className="font-semibold text-foreground">{t("Sleep quality")}:</span>{" "}\n                <IcoText text={asArr(log.sleepQuality).map(t).join(", ")} size={13} />\n              </p>\n            )}\n            <p className="mt-0.5 text-[9px] leading-tight text-primary">{t("Tap to edit")}</p>\n          </button>\n        </Card>\n      )}\n\n'''
if '<Card title="Temp / Sleep / Weight" icon="🌡️">' not in temp_old:
    raise SystemExit('Temp/Sleep/Weight block not found')
s = s[:temp_start] + temp_new + s[temp_end:]
p.write_text(s)

# 4) Regression guard for the requested canonical Tetany order.
p = Path('src/lib/__tests__/panic-tetany-field-order.test.ts')
s = p.read_text()
needle = 'describe("Panic/Tetany built-in admin field order", () => {'
if needle not in s:
    raise SystemExit('Panic/Tetany test suite not found')
if 'keeps Tetany Time, Duration and Intensity first' not in s:
    insert = '''\n  it("keeps Tetany Time, Duration and Intensity first", () => {\n    expect((BIXBO_LOG_FIELDS.tetany ?? []).slice().sort((a, b) => a.order - b.order).slice(0, 3).map((field) => field.id)).toEqual([\n      "time",\n      "duration",\n      "intensity",\n    ]);\n  });\n'''
    pos = s.index(needle) + len(needle)
    s = s[:pos] + insert + s[pos:]
p.write_text(s)
