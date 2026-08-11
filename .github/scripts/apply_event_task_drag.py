from pathlib import Path

registry = Path('src/lib/appRegistry.ts')
text = registry.read_text()
old = '''  bowel: [
    { id: "time", label: "Time", kind: "text", order: 10 },
    { id: "bristol", label: "Bristol stool scale", kind: "scale", order: 20, scale: { min: 0, max: 7, step: 1 } },
    { id: "urinary", label: "Urinary", kind: "chips", order: 30 },
    { id: "feelings", label: "How do you feel?", kind: "chips", order: 40 },
    { id: "symptoms", label: "Symptoms", kind: "chips", order: 50 },
    { id: "note", label: "Note (optional)", kind: "text", order: 60 },
  ],
};'''
new = '''  bowel: [
    { id: "time", label: "Time", kind: "text", order: 10 },
    { id: "bristol", label: "Bristol stool scale", kind: "scale", order: 20, scale: { min: 0, max: 7, step: 1 } },
    { id: "urinary", label: "Urinary", kind: "chips", order: 30 },
    { id: "feelings", label: "How do you feel?", kind: "chips", order: 40 },
    { id: "symptoms", label: "Symptoms", kind: "chips", order: 50 },
    { id: "note", label: "Note (optional)", kind: "text", order: 60 },
  ],
  event: [
    { id: "title", label: "Title", kind: "text", order: 10 },
    { id: "dates", label: "Dates", kind: "text", order: 20 },
    { id: "times", label: "Times", kind: "text", order: 30 },
    { id: "color", label: "Color", kind: "chips", order: 40 },
    { id: "note", label: "Note (optional)", kind: "text", order: 50 },
  ],
  task: [
    { id: "title", label: "Task", kind: "text", order: 10 },
    { id: "dates", label: "Dates", kind: "text", order: 20 },
    { id: "times", label: "Times", kind: "text", order: 30 },
    { id: "note", label: "Note (optional)", kind: "text", order: 40 },
  ],
};'''
assert old in text, 'bowel registry tail not found'
registry.write_text(text.replace(old, new))

admin = Path('src/components/AdminEditOverlay.tsx')
text = admin.read_text()
old = '''featureId === "period" || featureId === "workout") ? ('''
new = '''featureId === "period" || featureId === "workout" || featureId === "event" || featureId === "task") ? ('''
assert old in text, 'admin gate tail not found'
admin.write_text(text.replace(old, new))

log = Path('src/components/LogSheet.tsx')
text = log.read_text()

# Event section only.
event_start = text.index('function EventForm({')
task_start = text.index('function TaskForm({')
pre = text[:event_start]
event = text[event_start:task_start]
post = text[task_start:]
event = event.replace('<div className="space-y-3">', '<div className="flex flex-col gap-3">', 1)
event = event.replace('<Field label="Title">', '<Field label="Title" schemaFieldId="title">', 1)
event = event.replace('''      <div className="grid grid-cols-2 gap-2">\n        <Field label="From">''', '''      <RegistryFieldBlock fieldId="dates">\n      <div className="grid grid-cols-2 gap-2">\n        <Field label="From">''', 1)
event = event.replace('''        </Field>\n      </div>\n      <div className="grid grid-cols-2 gap-2">\n        <Field label="Time from">''', '''        </Field>\n      </div>\n      </RegistryFieldBlock>\n      <RegistryFieldBlock fieldId="times">\n      <div className="grid grid-cols-2 gap-2">\n        <Field label="Time from">''', 1)
event = event.replace('''        </Field>\n      </div>\n      <Field label="Color">''', '''        </Field>\n      </div>\n      </RegistryFieldBlock>\n      <Field label="Color" schemaFieldId="color">''', 1)
event = event.replace('<Field label="Note (optional)">', '<Field label="Note (optional)" schemaFieldId="note">', 1)

# Task section, bounded before NoteForm.
note_start_rel = post.index('function NoteForm(')
task = post[:note_start_rel]
rest = post[note_start_rel:]
task = task.replace('<div className="space-y-3">', '<div className="flex flex-col gap-3">', 1)
task = task.replace('<Field label="Task">', '<Field label="Task" schemaFieldId="title">', 1)
task = task.replace('''      <div className="grid grid-cols-2 gap-2">\n        <Field label="From">''', '''      <RegistryFieldBlock fieldId="dates">\n      <div className="grid grid-cols-2 gap-2">\n        <Field label="From">''', 1)
task = task.replace('''        </Field>\n      </div>\n      <div className="grid grid-cols-2 gap-2">\n        <Field label="Time from">''', '''        </Field>\n      </div>\n      </RegistryFieldBlock>\n      <RegistryFieldBlock fieldId="times">\n      <div className="grid grid-cols-2 gap-2">\n        <Field label="Time from">''', 1)
task = task.replace('''        </Field>\n      </div>\n      <Field label="Note (optional)">''', '''        </Field>\n      </div>\n      </RegistryFieldBlock>\n      <Field label="Note (optional)" schemaFieldId="note">''', 1)

log.write_text(pre + event + task + rest)

test = Path('src/lib/__tests__/event-task-field-order.test.ts')
test.write_text('''import { describe, expect, it } from "vitest";\nimport { BIXBO_LOG_FIELDS, registryFieldsForFeature } from "../appRegistry";\nimport { EMPTY } from "../storage";\n\ndescribe("Event and Task admin field order", () => {\n  it("registers stable block IDs", () => {\n    expect((BIXBO_LOG_FIELDS.event ?? []).map((f) => f.id)).toEqual(["title", "dates", "times", "color", "note"]);\n    expect((BIXBO_LOG_FIELDS.task ?? []).map((f) => f.id)).toEqual(["title", "dates", "times", "note"]);\n  });\n  it("respects admin order", () => {\n    const data = { ...EMPTY, settings: { ...EMPTY.settings, adminConfig: { enabled: true, features: {\n      event: { fields: { note: { order: 1 }, title: { order: 999 } } },\n      task: { fields: { times: { order: 1 }, title: { order: 999 } } },\n    } } } };\n    expect(registryFieldsForFeature(data, "event").map((f) => f.id)[0]).toBe("note");\n    expect(registryFieldsForFeature(data, "task").map((f) => f.id)[0]).toBe("times");\n  });\n});\n''')
