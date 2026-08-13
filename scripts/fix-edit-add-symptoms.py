from pathlib import Path
p=Path('src/components/LogSheet.tsx')
s=p.read_text()
s=s.replace('''  const [quickSymptomUpdate, setQuickSymptomUpdate] = useState(false);\n  const [copiedFromTime, setCopiedFromTime] = useState<string | undefined>();\n  const [copiedFromId, setCopiedFromId] = useState<string | undefined>();''','''  const editingSymptomUpdate = initialEntry?.entryKind === "symptom-update";\n  const [quickSymptomUpdate, setQuickSymptomUpdate] = useState(editingSymptomUpdate);\n  const sourcePainForEdit = editingSymptomUpdate\n    ? (data.dayLogs[date]?.pain ?? []).find((entry) => entry.id === initialEntry?.sourcePainId)\n    : undefined;\n  const [copiedFromTime, setCopiedFromTime] = useState<string | undefined>(sourcePainForEdit?.time);\n  const [copiedFromId, setCopiedFromId] = useState<string | undefined>(initialEntry?.sourcePainId);\n\n  useEffect(() => {\n    if (editingSymptomUpdate && symptomsStepIndex >= 0) setStep(symptomsStepIndex);\n  }, [editingSymptomUpdate, symptomsStepIndex]);''',1)
s=s.replace('''      entryKind: quickSymptomUpdate ? "symptom-update" : undefined,\n      sourcePainId: quickSymptomUpdate ? copiedFromId : undefined,''','''      entryKind: quickSymptomUpdate || editingSymptomUpdate ? "symptom-update" : undefined,\n      sourcePainId: quickSymptomUpdate || editingSymptomUpdate ? (copiedFromId ?? initialEntry?.sourcePainId) : undefined,''',1)
s=s.replace('''          <span className="text-xs text-muted-foreground">{t("New entry ·")} {time}</span>''','''          <span className="text-xs text-muted-foreground">{t(editingSymptomUpdate ? "Editing ·" : "New entry ·")} {time}</span>''',1)
p.write_text(s)

t=Path('src/lib/__tests__/pain-symptom-update-regression.test.ts')
text=t.read_text()
append='''\n\ntest("editing an Add symptoms entry preserves symptom-update identity", () => {\n  const source = readFileSync(new URL("../../components/LogSheet.tsx", import.meta.url), "utf8");\n  expect(source).toContain('const editingSymptomUpdate = initialEntry?.entryKind === "symptom-update";');\n  expect(source).toContain('useState(editingSymptomUpdate)');\n  expect(source).toContain('if (editingSymptomUpdate && symptomsStepIndex >= 0) setStep(symptomsStepIndex);');\n  expect(source).toContain('entryKind: quickSymptomUpdate || editingSymptomUpdate ? "symptom-update" : undefined');\n  expect(source).toContain('(copiedFromId ?? initialEntry?.sourcePainId)');\n});\n'''
if 'editing an Add symptoms entry preserves symptom-update identity' not in text:
    t.write_text(text+append)
