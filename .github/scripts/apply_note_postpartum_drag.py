from pathlib import Path

registry = Path('src/lib/appRegistry.ts')
text = registry.read_text()
old = '''  temp: [
    { id: "temperature", label: "New temperature measurement", kind: "number", order: 10 },
    { id: "weight", label: "New weight measurement", kind: "number", order: 20 },
    { id: "sleepHours", label: "Sleep (hours)", kind: "number", order: 30 },
    { id: "sleepQuality", label: "How I slept", kind: "chips", order: 40 },
  ],
};'''
new = '''  temp: [
    { id: "temperature", label: "New temperature measurement", kind: "number", order: 10 },
    { id: "weight", label: "New weight measurement", kind: "number", order: 20 },
    { id: "sleepHours", label: "Sleep (hours)", kind: "number", order: 30 },
    { id: "sleepQuality", label: "How I slept", kind: "chips", order: 40 },
  ],
  note: [
    { id: "time", label: "Time (optional)", kind: "text", order: 10 },
    { id: "text", label: "Anything about today…", kind: "text", order: 20 },
  ],
  postpartum: [
    { id: "symptoms", label: "Symptoms today", kind: "chips", order: 10 },
    { id: "note", label: "Recovery note (optional)", kind: "text", order: 20 },
  ],
};'''
assert old in text, 'temp registry tail not found'
registry.write_text(text.replace(old, new))

admin = Path('src/components/AdminEditOverlay.tsx')
text = admin.read_text()
old = '''featureId === "food" || featureId === "temp") ? ('''
new = '''featureId === "food" || featureId === "temp" || featureId === "note" || featureId === "postpartum") ? ('''
assert old in text, 'admin note/postpartum gate anchor not found'
admin.write_text(text.replace(old, new))

log = Path('src/components/LogSheet.tsx')
text = log.read_text()

# Note form: two true input blocks. Text rename is reflected via placeholder without adding a new visual label.
start = text.index('function NoteForm(')
end = text.index('function PostpartumSymptomsForm(')
pre = text[:start]
section = text[start:end]
post = text[end:]
section = section.replace('''  const { t } = useI18n();\n  const [text, setText] = useState("");''', '''  const { t } = useI18n();\n  const schema = useLogSchema();\n  const noteTextPlaceholder = schema ? (getRegistryField(schema.data, schema.featureId, "text")?.label ?? "Anything about today…") : "Anything about today…";\n  const [text, setText] = useState("");''', 1)
section = section.replace('''    <div className="space-y-3">\n      <SaveBar onCancel={onDone} onSave={save} disabled={!text.trim()} />\n      <Field label="Time (optional)">''', '''    <div className="space-y-3">\n      <SaveBar onCancel={onDone} onSave={save} disabled={!text.trim()} />\n      <div className="flex flex-col gap-3">\n      <Field label="Time (optional)" schemaFieldId="time">''', 1)
old_textarea = '''      <Textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("Anything about today…")} />\n    </div>'''
new_textarea = '''      <RegistryFieldBlock fieldId="text">\n        <Textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={t(noteTextPlaceholder)} />\n      </RegistryFieldBlock>\n      </div>\n    </div>'''
assert old_textarea in section, 'Note textarea anchor not found'
section = section.replace(old_textarea, new_textarea, 1)
text = pre + section + post

# Postpartum: reorder only the two data-entry fields inside an inner flex container; intro and clear control keep their original positions.
start = text.index('function PostpartumSymptomsForm(')
section = text[start:]
old = '''      </div>\n\n      <Field label={t("Symptoms today")}>'''
new = '''      </div>\n\n      <div className="flex flex-col gap-5">\n      <Field label={t("Symptoms today")} schemaFieldId="symptoms">'''
assert old in section, 'postpartum symptoms anchor not found'
section = section.replace(old, new, 1)
old = '''      <Field label={t("Recovery note (optional)")}>'''
new = '''      <Field label={t("Recovery note (optional)")} schemaFieldId="note">'''
assert old in section, 'postpartum note anchor not found'
section = section.replace(old, new, 1)
old = '''      </Field>\n\n      {current.symptoms?.length || current.note ? ('''
new = '''      </Field>\n      </div>\n\n      {current.symptoms?.length || current.note ? ('''
assert old in section, 'postpartum inner flex end anchor not found'
section = section.replace(old, new, 1)
text = text[:start] + section
log.write_text(text)

test = Path('src/lib/__tests__/note-postpartum-field-order.test.ts')
test.write_text('''import { describe, expect, it } from "vitest";\nimport { BIXBO_LOG_FIELDS, registryFieldsForFeature } from "../appRegistry";\nimport { EMPTY } from "../storage";\n\ndescribe("Note and Postpartum admin field order", () => {\n  it("registers stable input IDs", () => {\n    expect((BIXBO_LOG_FIELDS.note ?? []).map((f) => f.id)).toEqual(["time", "text"]);\n    expect((BIXBO_LOG_FIELDS.postpartum ?? []).map((f) => f.id)).toEqual(["symptoms", "note"]);\n  });\n  it("respects admin order", () => {\n    const data = { ...EMPTY, settings: { ...EMPTY.settings, adminConfig: { enabled: true, features: {\n      note: { fields: { text: { order: 1 }, time: { order: 999 } } },\n      postpartum: { fields: { note: { order: 1 }, symptoms: { order: 999 } } },\n    } } } };\n    expect(registryFieldsForFeature(data, "note").map((f) => f.id)[0]).toBe("text");\n    expect(registryFieldsForFeature(data, "postpartum").map((f) => f.id)[0]).toBe("note");\n  });\n});\n''')
