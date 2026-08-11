from pathlib import Path

p = Path('src/components/AdminEditOverlay.tsx')
s = p.read_text()

anchor = '''type EditorTab = "page" | "features" | "fields" | "custom" | "publish";\n'''
insert = '''type EditorTab = "page" | "features" | "fields" | "custom" | "publish";\n\nconst REQUIRED_CORE_FIELDS = new Set<string>([\n  "event:title",\n  "task:title",\n  "note:text",\n]);\n\nfunction isRequiredCoreField(featureId: RegistryFeatureId, fieldId: string): boolean {\n  return REQUIRED_CORE_FIELDS.has(`${featureId}:${fieldId}`);\n}\n'''
if anchor not in s:
    raise SystemExit('editor tab marker not found')
s = s.replace(anchor, insert, 1)

old = '''                                  <button type="button" onClick={() => patchField(featureId, baseField.id, { enabled: field.enabled === false })} className="rounded-full bg-background px-2 py-1 text-[9px] ring-1 ring-border">{field.enabled === false ? t("Hidden") : t("Shown")}</button>'''
new = '''                                  {isRequiredCoreField(featureId, baseField.id) ? (\n                                    <span title={t("Required to save this log")} className="rounded-full bg-primary/10 px-2 py-1 text-[9px] font-bold text-primary ring-1 ring-primary/20">{t("Required")}</span>\n                                  ) : (\n                                    <button type="button" onClick={() => patchField(featureId, baseField.id, { enabled: field.enabled === false })} className="rounded-full bg-background px-2 py-1 text-[9px] ring-1 ring-border">{field.enabled === false ? t("Hidden") : t("Shown")}</button>\n                                  )}'''
if old not in s:
    raise SystemExit('core shown hidden marker not found')
s = s.replace(old, new, 1)

p.write_text(s)
print('protected truly required core fields from hide')
