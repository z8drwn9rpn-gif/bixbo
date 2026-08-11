from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)

# 1) Expand registry to cover every whole input block in linear Panic/Tetany forms.
p = Path("src/lib/appRegistry.ts")
s = p.read_text()
s = replace_once(
    s,
    '''  tetany: [
    { id: "intensity", label: "Intensity", kind: "scale", order: 10, scale: { min: 1, max: 5, step: 1 } },
    { id: "types", label: "Type", kind: "chips", order: 20 },
    { id: "location", label: "Location", kind: "chips", order: 30 },
    { id: "triggers", label: "Triggers", kind: "chips", order: 40 },
    { id: "helped", label: "What helped?", kind: "chips", order: 50 },
  ],
  panic: [
    { id: "intensity", label: "Intensity", kind: "scale", order: 10, scale: { min: 1, max: 10, step: 1 } },
    { id: "physical", label: "Physical symptoms", kind: "chips", order: 20 },
    { id: "cognitive", label: "Cognitive symptoms", kind: "chips", order: 30 },
    { id: "helped", label: "What helped?", kind: "chips", order: 40 },
  ],''',
    '''  tetany: [
    { id: "time", label: "Time", kind: "text", order: 10 },
    { id: "types", label: "Type", kind: "chips", order: 20 },
    { id: "location", label: "Location", kind: "chips", order: 30 },
    { id: "intensity", label: "Intensity", kind: "scale", order: 40, scale: { min: 1, max: 5, step: 1 } },
    { id: "duration", label: "Duration (min)", kind: "number", order: 50 },
    { id: "triggers", label: "Triggers", kind: "chips", order: 60 },
    { id: "helped", label: "What helped?", kind: "chips", order: 70 },
    { id: "rescueMed", label: "Rescue med (what you took)", kind: "text", order: 80 },
    { id: "note", label: "Note (optional)", kind: "text", order: 90 },
  ],
  panic: [
    { id: "time", label: "Time", kind: "text", order: 10 },
    { id: "duration", label: "Duration (min)", kind: "number", order: 20 },
    { id: "intensity", label: "Intensity", kind: "scale", order: 30, scale: { min: 1, max: 10, step: 1 } },
    { id: "physical", label: "Physical symptoms", kind: "chips", order: 40 },
    { id: "cognitive", label: "Cognitive symptoms", kind: "chips", order: 50 },
    { id: "trigger", label: "Trigger (or 'no obvious trigger')", kind: "text", order: 60 },
    { id: "place", label: "Place (optional)", kind: "text", order: 70 },
    { id: "hyperventilation", label: "Hyperventilation", kind: "chips", order: 80 },
    { id: "tetanyPresent", label: "Tetany present?", kind: "toggle", order: 90 },
    { id: "helped", label: "What helped?", kind: "chips", order: 100 },
    { id: "rescueMed", label: "Rescue med (what you took)", kind: "text", order: 110 },
    { id: "note", label: "Note (optional)", kind: "text", order: 120 },
  ],''',
    "expand panic/tetany registry",
)
p.write_text(s)

# 2) Make real Field/Duration blocks honor registry order + hidden state, then tag all Panic/Tetany fields with stable IDs.
p = Path("src/components/LogSheet.tsx")
s = p.read_text()
s = replace_once(
    s,
    'import { getRegistryFeature, isRegistrySurfaceEnabled, registryCustomFieldsForFeature, registryFieldLabel, registryFieldOptions, registryFieldScale, registryOptionLabel, customLogDefinitions, type RegistryFeatureId } from "@/lib/appRegistry";',
    'import { getRegistryFeature, getRegistryField, isRegistrySurfaceEnabled, registryCustomFieldsForFeature, registryFieldLabel, registryFieldOptions, registryFieldScale, registryOptionLabel, customLogDefinitions, type RegistryFeatureId } from "@/lib/appRegistry";',
    "import getRegistryField",
)
s = replace_once(
    s,
    '''function Field({ label, children }: { label: string; children: ReactNode }) {
  const { t } = useI18n();
  const schema = useLogSchema();
  const fieldIdByLabel: Record<string, string> = { "Pain scale": "score", "Where does it hurt?": "parts", "How does it hurt?": "quality", "Other symptoms": "symptoms", "Intensity": "intensity", "Type": "types", "Location": "location", "Triggers": "triggers", "What helped?": "helped", "Bleeding": "flow", "Cramp pain": "cramps", "Discharge (optional)": "discharge", "Duration (minutes)": "minutes", "Intensity (RPE)": "rpe", "How you feel": "feel", "Urinary": "urinary" };
  const fieldId = fieldIdByLabel[label];
  const displayLabel = schema && fieldId ? registryFieldLabel(schema.data, schema.featureId, fieldId, label) : label;
  // Intentionally a <div>, not <label>. Wrapping chip/button groups in <label>
  // caused stray click activations on the first focusable descendant, which
  // manifested as chips getting "auto-selected" in the Pain wizard.
  return (
    <div className="block">
      <span className="text-xs font-medium text-muted-foreground">{t(displayLabel)}</span>
      <div className="mt-1">{children}</div>
    </div>
  );
}''',
    '''function Field({ label, children, schemaFieldId }: { label: string; children: ReactNode; schemaFieldId?: string }) {
  const { t } = useI18n();
  const schema = useLogSchema();
  const fieldIdByLabel: Record<string, string> = { "Pain scale": "score", "Where does it hurt?": "parts", "How does it hurt?": "quality", "Other symptoms": "symptoms", "Intensity": "intensity", "Type": "types", "Location": "location", "Triggers": "triggers", "What helped?": "helped", "Bleeding": "flow", "Cramp pain": "cramps", "Discharge (optional)": "discharge", "Duration (minutes)": "minutes", "Intensity (RPE)": "rpe", "How you feel": "feel", "Urinary": "urinary" };
  const fieldId = schemaFieldId ?? fieldIdByLabel[label];
  const configuredField = schema && fieldId ? getRegistryField(schema.data, schema.featureId, fieldId) : undefined;
  const displayLabel = configuredField?.label ?? (schema && fieldId ? registryFieldLabel(schema.data, schema.featureId, fieldId, label) : label);
  // Intentionally a <div>, not <label>. Wrapping chip/button groups in <label>
  // caused stray click activations on the first focusable descendant, which
  // manifested as chips getting "auto-selected" in the Pain wizard.
  return (
    <div className={configuredField?.enabled === false ? "hidden" : "block"} style={configuredField ? { order: configuredField.order } : undefined} data-bixbo-log-field-id={fieldId || undefined}>
      <span className="text-xs font-medium text-muted-foreground">{t(displayLabel)}</span>
      <div className="mt-1">{children}</div>
    </div>
  );
}''',
    "Field registry order",
)
s = replace_once(
    s,
    '''function DurationField({
  minutes,
  setMinutes,
  ongoing,
  setOngoing,
}: {
  minutes: string;
  setMinutes: (s: string) => void;
  ongoing: boolean;
  setOngoing: (b: boolean) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{t("Duration (min)")}</span>''',
    '''function DurationField({
  minutes,
  setMinutes,
  ongoing,
  setOngoing,
  schemaFieldId,
}: {
  minutes: string;
  setMinutes: (s: string) => void;
  ongoing: boolean;
  setOngoing: (b: boolean) => void;
  schemaFieldId?: string;
}) {
  const { t } = useI18n();
  const schema = useLogSchema();
  const configuredField = schema && schemaFieldId ? getRegistryField(schema.data, schema.featureId, schemaFieldId) : undefined;
  const displayLabel = configuredField?.label ?? "Duration (min)";
  return (
    <div className={configuredField?.enabled === false ? "hidden" : "space-y-1"} style={configuredField ? { order: configuredField.order } : undefined} data-bixbo-log-field-id={schemaFieldId || undefined}>
      <span className="text-xs font-medium text-muted-foreground">{t(displayLabel)}</span>''',
    "Duration registry order",
)

# Panic root and field IDs
s = replace_once(s, '<div className="space-y-3">\n      <SaveBar onCancel={onDone} onSave={save} />\n      <Field label="Time">\n        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full" />\n      </Field>\n      <DurationField minutes={minutes} setMinutes={setMinutes} ongoing={ongoing} setOngoing={setOngoing} />', '<div className="flex flex-col gap-3">\n      <SaveBar onCancel={onDone} onSave={save} />\n      <Field label="Time" schemaFieldId="time">\n        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full" />\n      </Field>\n      <DurationField minutes={minutes} setMinutes={setMinutes} ongoing={ongoing} setOngoing={setOngoing} schemaFieldId="duration" />', "Panic root/time/duration")
s = replace_once(s, '<Field label={`Intensity ${intensity}/10`}>', '<Field label={`Intensity ${intensity}/10`} schemaFieldId="intensity">', "Panic intensity")
s = replace_once(s, '<Field label="Physical symptoms">\n        <CustomChipList', '<Field label="Physical symptoms" schemaFieldId="physical">\n        <CustomChipList', "Panic physical")
s = replace_once(s, '<Field label="Cognitive symptoms">\n        <CustomChipList', '<Field label="Cognitive symptoms" schemaFieldId="cognitive">\n        <CustomChipList', "Panic cognitive")
s = replace_once(s, '<Field label="Trigger (or \'no obvious trigger\')">\n        <Textarea rows={2} value={trigger}', '<Field label="Trigger (or \'no obvious trigger\')" schemaFieldId="trigger">\n        <Textarea rows={2} value={trigger}', "Panic trigger")
s = replace_once(s, '<Field label="Place (optional)">\n        <Input value={place}', '<Field label="Place (optional)" schemaFieldId="place">\n        <Input value={place}', "Panic place")
s = replace_once(s, '<Field label="Hyperventilation">\n        <div className="mt-2 flex flex-wrap gap-2">', '<Field label="Hyperventilation" schemaFieldId="hyperventilation">\n        <div className="mt-2 flex flex-wrap gap-2">', "Panic hyper")
s = replace_once(s, '<Field label="Tetany present?">\n        <div className="mt-2 flex gap-2">', '<Field label="Tetany present?" schemaFieldId="tetanyPresent">\n        <div className="mt-2 flex gap-2">', "Panic tetany present")
# First standalone PanicForm What helped occurrence after this area; replace only exact block with addHelped.
s = replace_once(s, '<Field label="What helped">\n        <CustomChipList\n          base={PANIC_HELPED_DEFAULT}\n          custom={data.custom.panicHelped}\n          onAddCustom={addHelped}', '<Field label="What helped" schemaFieldId="helped">\n        <CustomChipList\n          base={PANIC_HELPED_DEFAULT}\n          custom={data.custom.panicHelped}\n          onAddCustom={addHelped}', "Panic helped")
s = replace_once(s, '<Field label="Rescue med (what you took)">\n        <Input value={rescueMed} onChange={(e) => setRescueMed(e.target.value)} placeholder={t("e.g. Frontin 0.25 mg")}', '<Field label="Rescue med (what you took)" schemaFieldId="rescueMed">\n        <Input value={rescueMed} onChange={(e) => setRescueMed(e.target.value)} placeholder={t("e.g. Frontin 0.25 mg")}', "Panic rescue")
# Panic note directly following rescue block has identical generic structure elsewhere; anchor from closing rescue into note.
s = replace_once(s, '      </Field>\n      <Field label="Note (optional)">\n        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />\n      </Field>\n    </div>\n  );\n}\n\n/* ------------------- TETANY episode ------------------- */', '      </Field>\n      <Field label="Note (optional)" schemaFieldId="note">\n        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />\n      </Field>\n    </div>\n  );\n}\n\n/* ------------------- TETANY episode ------------------- */', "Panic note")

# Tetany root and IDs
s = replace_once(s, '<div className="space-y-3">\n      <SaveBar onCancel={onDone} onSave={save} />\n      <Field label="Time">\n        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />\n      </Field>\n      <Field label="Type">\n        <CustomChipList\n          base={TETANY_TYPES}', '<div className="flex flex-col gap-3">\n      <SaveBar onCancel={onDone} onSave={save} />\n      <Field label="Time" schemaFieldId="time">\n        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />\n      </Field>\n      <Field label="Type" schemaFieldId="types">\n        <CustomChipList\n          base={TETANY_TYPES}', "Tetany root/time/type")
s = replace_once(s, '<Field label="Location">\n        <CustomChipList\n          base={TETANY_LOCATIONS_DEFAULT}', '<Field label="Location" schemaFieldId="location">\n        <CustomChipList\n          base={TETANY_LOCATIONS_DEFAULT}', "Tetany location")
s = replace_once(s, '<Field label={`Intensity ${intensity}/5`}>', '<Field label={`Intensity ${intensity}/5`} schemaFieldId="intensity">', "Tetany intensity")
s = replace_once(s, '<DurationField minutes={minutes} setMinutes={setMinutes} ongoing={ongoing} setOngoing={setOngoing} />\n      <Field label="Triggers">\n        <CustomChipList\n          base={TETANY_TRIGGERS}', '<DurationField minutes={minutes} setMinutes={setMinutes} ongoing={ongoing} setOngoing={setOngoing} schemaFieldId="duration" />\n      <Field label="Triggers" schemaFieldId="triggers">\n        <CustomChipList\n          base={TETANY_TRIGGERS}', "Tetany duration/triggers")
s = replace_once(s, '<Field label="What helped">\n        <CustomChipList\n          base={TETANY_HELPED_DEFAULT}\n          custom={data.custom.tetanyHelped}', '<Field label="What helped" schemaFieldId="helped">\n        <CustomChipList\n          base={TETANY_HELPED_DEFAULT}\n          custom={data.custom.tetanyHelped}', "Tetany helped")
s = replace_once(s, '<Field label="Rescue med (what you took)">\n        <Input value={rescueMed} onChange={(e) => setRescueMed(e.target.value)} placeholder={t("e.g. Magnesium 400 mg")}', '<Field label="Rescue med (what you took)" schemaFieldId="rescueMed">\n        <Input value={rescueMed} onChange={(e) => setRescueMed(e.target.value)} placeholder={t("e.g. Magnesium 400 mg")}', "Tetany rescue")
s = replace_once(s, '      </Field>\n      <Field label="Note (optional)">\n        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />\n      </Field>\n    </div>\n  );\n}\n\n/* ------------------- PERIOD (Blueberry) ------------------- */', '      </Field>\n      <Field label="Note (optional)" schemaFieldId="note">\n        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />\n      </Field>\n    </div>\n  );\n}\n\n/* ------------------- PERIOD (Blueberry) ------------------- */', "Tetany note")
p.write_text(s)

# 3) AdminEditOverlay: show fields in effective order and give Panic/Tetany whole-field touch drag.
p = Path("src/components/AdminEditOverlay.tsx")
s = p.read_text()
s = replace_once(
    s,
    '  const [draggedOption, setDraggedOption] = useState<{ featureId: RegistryFeatureId; fieldId: string; value: string } | null>(null);',
    '  const [draggedOption, setDraggedOption] = useState<{ featureId: RegistryFeatureId; fieldId: string; value: string } | null>(null);\n  const [draggedField, setDraggedField] = useState<{ featureId: RegistryFeatureId; fieldId: string } | null>(null);',
    "Admin field drag state",
)
insert_after = '''  const moveDraggedOptionByPointer = (event: ReactPointerEvent<HTMLElement>, featureId: RegistryFeatureId, fieldId: string, baseOptions: string[]) => {
    if (!draggedOption) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-admin-option-sort-value]");
    const targetValue = target?.dataset.adminOptionSortValue;
    if (targetValue && target?.dataset.adminOptionFeature === featureId && target?.dataset.adminOptionField === fieldId && targetValue !== draggedOption.value) {
      dropFieldOption(featureId, fieldId, baseOptions, targetValue);
    }
  };'''
replacement = insert_after + '''

  const orderedBuiltinFields = (featureId: RegistryFeatureId) =>
    [...(BIXBO_LOG_FIELDS[featureId] ?? [])].sort((a, b) =>
      (getRegistryField(adminView, featureId, a.id)?.order ?? a.order) -
      (getRegistryField(adminView, featureId, b.id)?.order ?? b.order),
    );

  const writeBuiltinFieldOrder = (featureId: RegistryFeatureId, ids: string[]) => {
    const config = getDeviceAdminConfig();
    const feature = config.features?.[featureId] ?? {};
    const fields = { ...(feature.fields ?? {}) };
    ids.forEach((fieldId, index) => {
      fields[fieldId] = { ...(fields[fieldId] ?? {}), order: (index + 1) * 10 };
    });
    persist({
      ...config,
      enabled: true,
      features: { ...(config.features ?? {}), [featureId]: { ...feature, fields } },
    });
  };

  const dropBuiltinField = (featureId: RegistryFeatureId, targetId: string) => {
    if (!draggedField || draggedField.featureId !== featureId || draggedField.fieldId === targetId) return;
    const ids = orderedBuiltinFields(featureId).map((field) => field.id);
    const from = ids.indexOf(draggedField.fieldId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const [item] = ids.splice(from, 1);
    ids.splice(to, 0, item);
    writeBuiltinFieldOrder(featureId, ids);
  };

  const moveDraggedFieldByPointer = (event: ReactPointerEvent<HTMLElement>, featureId: RegistryFeatureId) => {
    if (!draggedField || draggedField.featureId !== featureId) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-admin-field-sort-id]");
    const targetId = target?.dataset.adminFieldSortId;
    if (targetId && target?.dataset.adminFieldFeature === featureId && targetId !== draggedField.fieldId) {
      dropBuiltinField(featureId, targetId);
    }
  };'''
s = replace_once(s, insert_after, replacement, "Admin field drag helpers")
s = replace_once(
    s,
    '''                          {(BIXBO_LOG_FIELDS[featureId] ?? []).map((baseField) => {''',
    '''                          {orderedBuiltinFields(featureId).map((baseField) => {''',
    "Admin effective field order",
)
s = replace_once(
    s,
    '''                              <div key={baseField.id} className="rounded-xl bg-tint p-2 ring-1 ring-border/70">''',
    '''                              <div key={baseField.id} data-admin-field-sort-id={baseField.id} data-admin-field-feature={featureId} className={`rounded-xl bg-tint p-2 ring-1 ring-border/70 ${draggedField?.featureId === featureId && draggedField.fieldId === baseField.id ? "opacity-60" : ""}`}>''',
    "Admin field sortable attr",
)
s = replace_once(
    s,
    '''                                <div className="flex items-center gap-2">
                                  <input value={field.label} onChange={(event) => patchField(featureId, baseField.id, { label: event.target.value })} className="h-8 min-w-0 flex-1 rounded-lg bg-background px-2 text-[11px] font-semibold ring-1 ring-border" />
                                  <button type="button" onClick={() => patchField(featureId, baseField.id, { enabled: field.enabled === false })} className="rounded-full bg-background px-2 py-1 text-[9px] ring-1 ring-border">{field.enabled === false ? t("Hidden") : t("Shown")}</button>
                                </div>''',
    '''                                <div className="flex items-center gap-2">
                                  {(featureId === "panic" || featureId === "tetany") ? (
                                    <button type="button" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDraggedField({ featureId, fieldId: baseField.id }); }} onPointerMove={(event) => moveDraggedFieldByPointer(event, featureId)} onPointerUp={() => setDraggedField(null)} onPointerCancel={() => setDraggedField(null)} style={{ touchAction: "none" }} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-background px-2 text-[9px] font-semibold text-muted-foreground ring-1 ring-border cursor-grab active:cursor-grabbing" aria-label={t("Drag to reorder")}><span className="text-sm">⋮⋮</span>{t("Drag")}</button>
                                  ) : null}
                                  <input value={field.label} onChange={(event) => patchField(featureId, baseField.id, { label: event.target.value })} className="h-8 min-w-0 flex-1 rounded-lg bg-background px-2 text-[11px] font-semibold ring-1 ring-border" />
                                  <button type="button" onClick={() => patchField(featureId, baseField.id, { enabled: field.enabled === false })} className="rounded-full bg-background px-2 py-1 text-[9px] ring-1 ring-border">{field.enabled === false ? t("Hidden") : t("Shown")}</button>
                                </div>''',
    "Admin field drag button",
)
p.write_text(s)

# 4) Tests: prove registry ordering + full field coverage for the two linear forms.
p = Path("src/lib/__tests__/panic-tetany-field-order.test.ts")
p.write_text('''import { describe, expect, it } from "vitest";\n\nimport { BIXBO_LOG_FIELDS, registryFieldsForFeature } from "../appRegistry";\nimport { EMPTY } from "../storage";\n\ndescribe("Panic/Tetany built-in admin field order", () => {\n  it("registers every linear panic field with a stable ID", () => {\n    expect((BIXBO_LOG_FIELDS.panic ?? []).map((field) => field.id)).toEqual([\n      "time", "duration", "intensity", "physical", "cognitive", "trigger", "place",\n      "hyperventilation", "tetanyPresent", "helped", "rescueMed", "note",\n    ]);\n  });\n\n  it("registers every linear tetany field with a stable ID", () => {\n    expect((BIXBO_LOG_FIELDS.tetany ?? []).map((field) => field.id)).toEqual([\n      "time", "types", "location", "intensity", "duration", "triggers", "helped", "rescueMed", "note",\n    ]);\n  });\n\n  it("sorts real form fields by admin override order", () => {\n    const data = {\n      ...EMPTY,\n      settings: {\n        ...EMPTY.settings,\n        adminConfig: {\n          enabled: true,\n          features: { panic: { fields: { note: { order: 1 }, time: { order: 999 } } } },\n        },\n      },\n    };\n    const ids = registryFieldsForFeature(data, "panic").map((field) => field.id);\n    expect(ids[0]).toBe("note");\n    expect(ids.at(-1)).toBe("time");\n  });\n});\n''')

print("Applied real Panic/Tetany whole-field ordering with stable registry IDs and admin touch drag.")
