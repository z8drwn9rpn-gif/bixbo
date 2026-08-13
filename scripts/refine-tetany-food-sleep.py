from pathlib import Path

# Tetany UI must start exactly like Panic: Time -> Duration -> Intensity.
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
pos_type = sec.index(mark_type)
pos_intensity = sec.index(mark_intensity)
pos_duration = sec.index(mark_duration)
pos_triggers = sec.index(mark_triggers)
if pos_duration < pos_intensity < pos_type < pos_triggers:
    pass  # already correct
elif pos_type < pos_intensity < pos_duration < pos_triggers:
    type_location = sec[pos_type:pos_intensity]
    intensity = sec[pos_intensity:pos_duration]
    duration = sec[pos_duration:pos_triggers]
    sec = sec[:pos_type] + duration + '\n' + intensity + type_location + sec[pos_triggers:]
    s = s[:start] + sec + s[end:]
    p.write_text(s)
else:
    raise SystemExit('Unsupported Tetany field order')

# Canonical/Admin field order must mirror the visible Tetany flow.
p = Path('src/lib/appRegistry.ts')
s = p.read_text()
start = s.index('  tetany: [')
end = s.index('  ],\n  panic: [', start)
sec = s[start:end]
changes = [
    ('{ id: "types", label: "Type", kind: "chips", order: 20 }', '{ id: "types", label: "Type", kind: "chips", order: 40 }'),
    ('{ id: "location", label: "Location", kind: "chips", order: 30 }', '{ id: "location", label: "Location", kind: "chips", order: 50 }'),
    ('{ id: "intensity", label: "Intensity", kind: "scale", order: 40, scale: { min: 1, max: 5, step: 1 } }', '{ id: "intensity", label: "Intensity", kind: "scale", order: 30, scale: { min: 1, max: 5, step: 1 } }'),
    ('{ id: "duration", label: "Duration (min)", kind: "number", order: 50 }', '{ id: "duration", label: "Duration (min)", kind: "number", order: 20 }'),
]
for old, new in changes:
    if old in sec:
        sec = sec.replace(old, new, 1)
    elif new not in sec:
        raise SystemExit(f'Unexpected Tetany registry line: {old}')
s = s[:start] + sec + s[end:]
p.write_text(s)

# Day Overview: shrink Food further and keep Temp/Sleep/Weight compact + labelled.
p = Path('src/components/home/DayOverview.tsx')
s = p.read_text()
food_start = s.index('      {log?.food?.length ? (')
food_end = s.index('      {log?.bowel?.length ? (', food_start)
food = s[food_start:food_end]
food = food.replace('<ul className="space-y-2">', '<ul className="space-y-1">')
food = food.replace('<ul className="space-y-1.5">', '<ul className="space-y-1">')
food = food.replace('border-t border-border/60 pt-2', 'border-t border-border/60 pt-1')
food = food.replace('border-t border-border/60 pt-1.5', 'border-t border-border/60 pt-1')
food = food.replace('<p className="text-xs text-muted-foreground">{f.time}</p>', '<p className="text-[11px] leading-none text-muted-foreground">{f.time}</p>')
food = food.replace('<div className="my-1.5 border-t border-border/60" />', '<div className="my-1 border-t border-border/60" />')
food = food.replace('text-xs leading-relaxed text-muted-foreground', 'text-[11px] leading-tight text-muted-foreground')
food = food.replace('mt-0.5 text-xs leading-snug', 'mt-0.5 text-[11px] leading-tight')
food = food.replace('mt-1 text-xs leading-snug', 'mt-0.5 text-[11px] leading-tight')
food = food.replace('mt-0.5 whitespace-pre-line text-xs leading-snug', 'mt-0.5 whitespace-pre-line text-[11px] leading-tight')
food = food.replace('mt-1 whitespace-pre-line text-xs leading-snug', 'mt-0.5 whitespace-pre-line text-[11px] leading-tight')
food = food.replace('mt-0 text-[10px] text-primary', 'mt-0 text-[9px] leading-tight text-primary')
food = food.replace('mt-0.5 text-[10px] text-primary', 'mt-0 text-[9px] leading-tight text-primary')
s = s[:food_start] + food + s[food_end:]

temp_start = s.index('      {(log?.temperature != null || log?.weight != null || log?.sleepHours != null || log?.sleepQuality) && (')
temp_end = s.index('      {tasks.length > 0 && (', temp_start)
temp_new = '''      {(log?.temperature != null || log?.weight != null || log?.sleepHours != null || log?.sleepQuality) && (\n        <Card title="Temp / Sleep / Weight" icon="🌡️">\n          <button onClick={() => onEdit?.("temp", undefined)} className="w-full text-left">\n            <div className="mb-1 border-t border-border/60" />\n            {log?.temperature != null && (\n              <p className="text-[11px] leading-tight text-muted-foreground">\n                <span className="font-semibold text-foreground">{t("Temperature")}:</span> {log.temperature}°C\n              </p>\n            )}\n            {log?.weight != null && (\n              <p className={`${log?.temperature != null ? "mt-0.5 " : ""}text-[11px] leading-tight text-muted-foreground`}>\n                <span className="font-semibold text-foreground">{t("Weight")}:</span> {log.weight} kg\n              </p>\n            )}\n            {log?.sleepHours != null && (\n              <p className={`${log?.temperature != null || log?.weight != null ? "mt-0.5 " : ""}text-[11px] leading-tight text-muted-foreground`}>\n                <span className="font-semibold text-foreground">{t("Sleep")}:</span> {log.sleepHours} h\n                {asArr(log.sleepQuality).length ? <> · <IcoText text={asArr(log.sleepQuality).map(t).join(", ")} size={12} /></> : null}\n              </p>\n            )}\n            {asArr(log?.sleepQuality).length > 0 && log?.sleepHours == null && (\n              <p className={`${log?.temperature != null || log?.weight != null ? "mt-0.5 " : ""}text-[11px] leading-tight text-muted-foreground`}>\n                <span className="font-semibold text-foreground">{t("Sleep quality")}:</span>{" "}\n                <IcoText text={asArr(log.sleepQuality).map(t).join(", ")} size={12} />\n              </p>\n            )}\n            <p className="mt-0 text-[9px] leading-tight text-primary">{t("Tap to edit")}</p>\n          </button>\n        </Card>\n      )}\n\n'''
s = s[:temp_start] + temp_new + s[temp_end:]
p.write_text(s)

# Regression guard.
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
