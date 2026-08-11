from pathlib import Path

# appRegistry.ts
path = Path('src/lib/appRegistry.ts')
text = path.read_text()
old = '''export interface RegistryFeatureOverride {
  label?: string;
  icon?: string;
  color?: string;
  enabled?: boolean;
  order?: number;
  surfaces?: Partial<Record<RegistrySurface, boolean>>;
  scale?: Partial<RegistryScaleDefinition>;
  fields?: Record<string, RegistryFieldOverride>;
}'''
new = '''export interface RegistryFeatureOverride {
  label?: string;
  icon?: string;
  color?: string;
  enabled?: boolean;
  order?: number;
  surfaces?: Partial<Record<RegistrySurface, boolean>>;
  scale?: Partial<RegistryScaleDefinition>;
  fields?: Record<string, RegistryFieldOverride>;
  /** Admin-created supplementary fields. Core calculations never depend on these. */
  customFields?: RegistryFieldDefinition[];
}'''
if old not in text: raise SystemExit('RegistryFeatureOverride anchor missing')
text = text.replace(old, new)
anchor = '''export function registryFieldsForFeature(data: Pick<BixboData, "settings">, featureId: RegistryFeatureId): RegistryFieldDefinition[] {
  return (BIXBO_LOG_FIELDS[featureId] ?? [])
    .map((field) => getRegistryField(data, featureId, field.id)!)
    .filter((field) => field.enabled !== false)
    .sort((a, b) => a.order - b.order);
}
'''
addition = anchor + '''
export function registryCustomFieldsForFeature(
  data: Pick<BixboData, "settings">,
  featureId: RegistryFeatureId,
): RegistryFieldDefinition[] {
  return [...(activeAdminConfig(data)?.features?.[featureId]?.customFields ?? [])]
    .filter((field) => field.enabled !== false)
    .sort((a, b) => a.order - b.order);
}
'''
if anchor not in text: raise SystemExit('registryFieldsForFeature anchor missing')
path.write_text(text.replace(anchor, addition))

# storage.ts
path = Path('src/lib/storage.ts')
text = path.read_text()
old = '''  /** Admin-created generic logs. Keys are stable custom-log IDs. */
  customLogs?: Record<string, CustomLogEntry[]>;
  /** Pregnancy-mode daily log (only used when pregnancy mode is on). */'''
new = '''  /** Admin-created generic logs. Keys are stable custom-log IDs. */
  customLogs?: Record<string, CustomLogEntry[]>;
  /** Supplementary values from admin-added fields on core logs. Keys are stable core feature IDs. */
  adminFields?: Record<string, CustomLogEntry[]>;
  /** Pregnancy-mode daily log (only used when pregnancy mode is on). */'''
if old not in text: raise SystemExit('DayLog customLogs anchor missing')
path.write_text(text.replace(old, new))

# AdminEditOverlay.tsx
path = Path('src/components/AdminEditOverlay.tsx')
text = path.read_text()
old = 'import { CustomLogBuilder } from "@/components/CustomLogBuilder";\n'
new = old + 'import { CoreFeatureCustomFieldBuilder } from "@/components/CoreFeatureCustomFieldBuilder";\n'
if old not in text: raise SystemExit('AdminEditOverlay import anchor missing')
text = text.replace(old, new, 1)
old = '''                  {(Object.keys(BIXBO_LOG_FIELDS) as RegistryFeatureId[]).map((featureId) => {
                    const feature = getRegistryFeature(adminView, featureId);
                    return (
                      <section key={featureId} className="rounded-2xl bg-surface p-3 ring-1 ring-border/80">'''
if old not in text: raise SystemExit('fields map anchor missing')
# We only need insertion after map; use closing sequence specific around section and fragment.
end = '''                  })}
                </>
              ) : null}

              {tab === "custom" ? <CustomLogBuilder data={adminView} update={deviceUpdate} /> : null}'''
replacement = '''                  })}
                  <CoreFeatureCustomFieldBuilder data={adminView} />
                </>
              ) : null}

              {tab === "custom" ? <CustomLogBuilder data={adminView} update={deviceUpdate} /> : null}'''
if end not in text: raise SystemExit('fields tab end anchor missing')
path.write_text(text.replace(end, replacement, 1))

# LogSheet.tsx
path = Path('src/components/LogSheet.tsx')
text = path.read_text()
old = 'import { CustomLogForm } from "@/components/CustomLogForm";\n'
new = old + 'import { CoreFeatureCustomFieldsForm } from "@/components/CoreFeatureCustomFieldsForm";\n'
if old not in text: raise SystemExit('LogSheet CustomLogForm import missing')
text = text.replace(old, new, 1)
old = 'import { getRegistryFeature, isRegistrySurfaceEnabled, registryFieldLabel, registryFieldOptions, registryFieldScale, registryOptionLabel, customLogDefinitions, type RegistryFeatureId } from "@/lib/appRegistry";'
new = 'import { getRegistryFeature, isRegistrySurfaceEnabled, registryCustomFieldsForFeature, registryFieldLabel, registryFieldOptions, registryFieldScale, registryOptionLabel, customLogDefinitions, type RegistryFeatureId } from "@/lib/appRegistry";'
if old not in text: raise SystemExit('LogSheet registry import missing')
text = text.replace(old, new, 1)
old = '  type PostpartumDayLog,\n  withCustomTombstones,'
new = '  type PostpartumDayLog,\n  type CustomLogValue,\n  withCustomTombstones,'
if old not in text: raise SystemExit('LogSheet storage type anchor missing')
text = text.replace(old, new, 1)
old = '''type LogSchemaContextValue = { data: BixboData; featureId: RegistryFeatureId } | null;
const LogSchemaContext = createContext<LogSchemaContextValue>(null);'''
new = '''type LogSchemaContextValue = {
  data: BixboData;
  featureId: RegistryFeatureId;
  adminFields: ReturnType<typeof registryCustomFieldsForFeature>;
  adminFieldValues: Record<string, CustomLogValue>;
  setAdminFieldValue: (fieldId: string, value: CustomLogValue) => void;
  saveAdminCustomFields: () => void;
} | null;
const LogSchemaContext = createContext<LogSchemaContextValue>(null);'''
if old not in text: raise SystemExit('LogSchemaContext type missing')
text = text.replace(old, new, 1)
old = '''  const active = cat ?? initial;
  const edit = editEntry;

  const cycleTrackingHidden = isCycleTrackingHidden(data);'''
new = '''  const active = cat ?? initial;
  const edit = editEntry;
  const [adminFieldValues, setAdminFieldValues] = useState<Record<string, CustomLogValue>>({});
  useEffect(() => setAdminFieldValues({}), [active, openToken]);

  const activeRegistryFeature = active && !active.startsWith("custom:") ? active as RegistryFeatureId : null;
  const activeAdminFields = activeRegistryFeature ? registryCustomFieldsForFeature(data, activeRegistryFeature) : [];
  const saveAdminCustomFields = () => {
    if (!activeRegistryFeature || !activeAdminFields.length) return;
    const allowed = new Set(activeAdminFields.map((field) => field.id));
    const values = Object.fromEntries(Object.entries(adminFieldValues).filter(([fieldId, value]) => allowed.has(fieldId) && value !== ""));
    if (!Object.keys(values).length) return;
    update((current) => {
      const day = current.dayLogs[date] ?? {};
      const adminFields = day.adminFields ?? {};
      const entry = {
        id: globalThis.crypto?.randomUUID?.() ?? `admin-field-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        time: nowHHMM(),
        values,
      };
      return {
        ...current,
        dayLogs: {
          ...current.dayLogs,
          [date]: {
            ...day,
            adminFields: {
              ...adminFields,
              [activeRegistryFeature]: [...(adminFields[activeRegistryFeature] ?? []), entry],
            },
          },
        },
      };
    });
  };

  const cycleTrackingHidden = isCycleTrackingHidden(data);'''
if old not in text: raise SystemExit('active anchor missing')
text = text.replace(old, new, 1)
old = '''            <LogSchemaContext.Provider value={active && !active.startsWith("custom:") ? { data, featureId: active as RegistryFeatureId } : null}>'''
new = '''            <LogSchemaContext.Provider value={activeRegistryFeature ? {
              data,
              featureId: activeRegistryFeature,
              adminFields: activeAdminFields,
              adminFieldValues,
              setAdminFieldValue: (fieldId, value) => setAdminFieldValues((current) => ({ ...current, [fieldId]: value })),
              saveAdminCustomFields,
            } : null}>'''
if old not in text: raise SystemExit('provider anchor missing')
text = text.replace(old, new, 1)
old = '''              {active === "note" && <NoteForm date={date} update={update} onDone={close} />}
            </div>'''
new = '''              {active === "note" && <NoteForm date={date} update={update} onDone={close} />}
              {activeRegistryFeature && activeAdminFields.length ? (
                <CoreFeatureCustomFieldsForm
                  fields={activeAdminFields}
                  values={adminFieldValues}
                  onChange={(fieldId, value) => setAdminFieldValues((current) => ({ ...current, [fieldId]: value }))}
                />
              ) : null}
            </div>'''
if old not in text: raise SystemExit('custom fields render anchor missing')
text = text.replace(old, new, 1)
old = '''function SaveBar({ onCancel, onSave, disabled }: { onCancel: () => void; onSave: () => void; disabled?: boolean }) {
  const { t } = useI18n();
  return ('''
new = '''function SaveBar({ onCancel, onSave, disabled }: { onCancel: () => void; onSave: () => void; disabled?: boolean }) {
  const { t } = useI18n();
  const schema = useLogSchema();
  return ('''
if old not in text: raise SystemExit('SaveBar function anchor missing')
text = text.replace(old, new, 1)
old = '        onClick={onSave}\n        disabled={disabled}'
new = '        onClick={() => { schema?.saveAdminCustomFields(); onSave(); }}\n        disabled={disabled}'
if old not in text: raise SystemExit('SaveBar click anchor missing')
text = text.replace(old, new, 1)
path.write_text(text)
