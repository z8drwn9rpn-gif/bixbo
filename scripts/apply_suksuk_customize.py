from pathlib import Path

# 1) Persist extra SukSuk custom lists.
types = Path('src/lib/storage/types.ts')
s = types.read_text()
needle = '''  sexTypes: string[];\n  bowelFeelings: string[];'''
repl = '''  sexTypes: string[];\n  sexProtection: string[];\n  sexPainWhen: string[];\n  sexPainLocations: string[];\n  sexSymptomsAfter: string[];\n  bowelFeelings: string[];'''
assert s.count(needle) == 1, 'CustomLists anchor changed'
s = s.replace(needle, repl)
types.write_text(s)

defaults = Path('src/lib/storage/defaults.ts')
s = defaults.read_text()
needle = '''    sexTypes: [],\n    bowelFeelings: [],'''
repl = '''    sexTypes: [],\n    sexProtection: [],\n    sexPainWhen: [],\n    sexPainLocations: [],\n    sexSymptomsAfter: [],\n    bowelFeelings: [],'''
assert s.count(needle) == 1, 'defaults anchor changed'
s = s.replace(needle, repl)
defaults.write_text(s)

# 2) Make the previous runtime SukSuk fix real source code first.
cycle = Path('src/features/logging/CycleForms.tsx')
s = cycle.read_text()
replacements = [
('  const [kind, setKind] = useState<SexKind>(initial?.kind ?? "sex");\n  const [protection, setProtection] = useState<string>(initial?.protection ?? "None");',
 '  const [kind, setKind] = useState<SexKind | undefined>(initial?.kind);\n  const [protection, setProtection] = useState<string>(initial?.protection ?? "");'),
('  const [painOn, setPainOn] = useState(initial?.painful != null && initial.painful !== "no");',
 '  const [painOn, setPainOn] = useState<boolean | undefined>(initial ? initial.painful != null && initial.painful !== "no" : undefined);'),
('  const [symptomsAfter, setSymptomsAfter] = useState<string[]>(asArr(initial?.symptomsAfter));\n  const [orgasm, setOrgasm]',
 '  const [symptomsAfter, setSymptomsAfter] = useState<string[]>(asArr(initial?.symptomsAfter));\n  const [symptomsNone, setSymptomsNone] = useState(false);\n  const [orgasm, setOrgasm]'),
('    const painful: PainfulWhen = !painOn ? "no" : painWhen === "after" ? "after" : "during";',
 '    const painful: PainfulWhen = painOn === true ? (painWhen === "after" ? "after" : "during") : "no";'),
('      id: initial?.id ?? schema?.sourceEntryId ?? crypto.randomUUID(),\n      time: initial?.time ?? nowHHMM(),\n      kind,\n      orgasm,',
 '      id: initial?.id ?? schema?.sourceEntryId ?? crypto.randomUUID(),\n      time: initial?.time ?? nowHHMM(),\n      kind: kind ?? "sex",\n      orgasm,'),
('      painWhenUi: painOn ? painWhen : undefined,\n      painScale: painOn ? painScaleValue : undefined,\n      painLocations: painOn && painLocations.length ? painLocations : undefined,',
 '      painWhenUi: painOn === true ? painWhen : undefined,\n      painScale: painOn === true ? painScaleValue : undefined,\n      painLocations: painOn === true && painLocations.length ? painLocations : undefined,'),
('        <button type="button" onClick={() => setPainOn(false)} className={chipClass(!painOn)}><BixboSemanticIcon name="good" size={17} /> {t("No")}</button>\n        <button type="button" onClick={() => setPainOn(true)} className={chipClass(painOn)}><BixboSemanticIcon name="painYes" size={17} /> {t("Yes")}</button>',
 '        <button type="button" onClick={() => setPainOn(false)} className={chipClass(painOn === false)}><BixboSemanticIcon name="good" size={17} /> {t("No")}</button>\n        <button type="button" onClick={() => setPainOn(true)} className={chipClass(painOn === true)}><BixboSemanticIcon name="painYes" size={17} /> {t("Yes")}</button>'),
('      {painOn && (', '      {painOn === true && ('),
('            <button key={option.value} type="button" onClick={() => setSymptomsAfter((current) => toggleIn(current, option.value))} className={symptomChipClass(active)}>',
 '            <button key={option.value} type="button" onClick={() => { setSymptomsNone(false); setSymptomsAfter((current) => toggleIn(current, option.value)); }} className={symptomChipClass(active)}>'),
('        <button type="button" onClick={() => setSymptomsAfter([])} className={symptomChipClass(symptomsAfter.length === 0)}>\n          <BixboSemanticIcon name="none" size={15} /> {t("None")}\n        </button>',
 '        <button type="button" onClick={() => { setSymptomsAfter([]); setSymptomsNone((current) => !current); }} className={symptomChipClass(symptomsNone)}>\n          <BixboSemanticIcon name="none" size={15} /> {t("None")}\n        </button>'),
]
for old, new in replacements:
    if old in s:
        assert s.count(old) == 1, f'duplicate CycleForms anchor: {old[:60]}'
        s = s.replace(old, new)

# Add Pencil import.
s = s.replace('import { Check, Ico, Plus, X } from "@/components/icons/BixboIcons";', 'import { Check, Ico, Pencil, Plus, X } from "@/components/icons/BixboIcons";')

# Add persistent custom-list helpers and a BIXBO-icon add/edit renderer inside SexForm.
anchor = '''  const [note, setNote] = useState(initial?.note ?? "");\n\n  const typeOptions: SemanticOption<SexKind>[] = ['''
insert = '''  const [note, setNote] = useState(initial?.note ?? "");\n\n  type SexCustomKey = "sexTypes" | "sexFeelings" | "sexProtection" | "sexPainWhen" | "sexPainLocations" | "sexSymptomsAfter";\n  const addSexCustom = (key: SexCustomKey, value: string) => update((current) => ({\n    ...current,\n    custom: { ...current.custom, [key]: [...(current.custom[key] ?? []), value] },\n  }));\n  const removeSexCustom = (key: SexCustomKey, value: string) => update((current) => ({\n    ...current,\n    custom: { ...current.custom, [key]: (current.custom[key] ?? []).filter((item) => item !== value) },\n    deletedCustom: { ...current.deletedCustom, [key]: [...(current.deletedCustom?.[key] ?? []), value] },\n  }));\n  const renameSexCustom = (key: SexCustomKey, oldValue: string, newValue: string) => update((current) => ({\n    ...current,\n    custom: { ...current.custom, [key]: (current.custom[key] ?? []).map((item) => item === oldValue ? newValue : item) },\n  }));\n\n  const typeOptions: SemanticOption<SexKind>[] = ['''
assert s.count(anchor) == 1, 'SexForm state anchor changed'
s = s.replace(anchor, insert)

# Insert reusable component after symptom classes.
anchor = '''  const symptomChipClass = (active: boolean) => `inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${\n    active\n      ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-foreground/75 ring-offset-1 ring-offset-background"\n      : "bg-tint text-foreground ring-1 ring-border"\n  }`;\n\n  const save = () => {'''
insert = '''  const symptomChipClass = (active: boolean) => `inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${\n    active\n      ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-foreground/75 ring-offset-1 ring-offset-background"\n      : "bg-tint text-foreground ring-1 ring-border"\n  }`;\n\n  const CustomControls = ({ customKey }: { customKey: SexCustomKey }) => {\n    const [adding, setAdding] = useState(false);\n    const [editing, setEditing] = useState(false);\n    const [value, setValue] = useState("");\n    const custom = data.custom[customKey] ?? [];\n    return <div className="mb-2 flex flex-wrap items-center gap-2">\n      {adding ? <>\n        <Input value={value} onChange={(event) => setValue(event.target.value)} placeholder={t("Custom…")} className="h-8 min-w-[150px] flex-1 rounded-full" autoFocus />\n        <button type="button" className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground" onClick={() => { const next = value.trim(); if (!next) return; addSexCustom(customKey, next); setValue(""); setAdding(false); }}>{t("Add")}</button>\n        <button type="button" className="rounded-full bg-tint px-3 py-1.5 text-xs font-semibold" onClick={() => { setValue(""); setAdding(false); }}>{t("Cancel")}</button>\n      </> : <>\n        <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"><Plus className="h-3 w-3" /> {t("Add custom")}</button>\n        <button type="button" onClick={() => setEditing((current) => !current)} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${editing ? "bg-primary text-primary-foreground" : "bg-tint text-muted-foreground"}`}><Pencil className="h-3 w-3" /> {editing ? t("Done") : t("Edit")}</button>\n      </>}\n      {editing && custom.map((item) => <span key={item} className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-1 text-[11px] ring-1 ring-border">\n        <span>{item}</span>\n        <button type="button" aria-label={`${t("Rename")} ${item}`} onClick={() => { const next = prompt(`${t("Rename")} “${item}”`, item); if (next?.trim() && next.trim() !== item) renameSexCustom(customKey, item, next.trim()); }}><Pencil className="h-3 w-3" /></button>\n        <button type="button" aria-label={`${t("Remove")} ${item}`} onClick={() => removeSexCustom(customKey, item)}><X className="h-3 w-3" /></button>\n      </span>)}\n    </div>;\n  };\n\n  const save = () => {'''
assert s.count(anchor) == 1, 'chip class anchor changed'
s = s.replace(anchor, insert)

# Make section headings match Pain typography and add controls.
for num, label, key in [
    ('1', 'Type', 'sexTypes'),
    ('2', 'Protection', 'sexProtection'),
    ('3', 'How I feel after', 'sexFeelings'),
    ('5', 'Symptoms after', 'sexSymptomsAfter'),
]:
    old = f'<p className="mb-2 text-sm font-semibold text-foreground">{num}. {{t("{label}")}}</p>'
    new = f'<p className="mb-2 font-serif text-lg font-semibold text-foreground">{num}. {{t("{label}")}}</p>\n      <CustomControls customKey="{key}" />'
    assert s.count(old) == 1, f'heading {num} missing'
    s = s.replace(old, new)

# Pain and orgasm typography; pain custom controls are inside When/Where where customization is meaningful.
s = s.replace('<p className="mb-2 text-sm font-semibold text-foreground">4. {t("Pain")}</p>', '<p className="mb-2 font-serif text-lg font-semibold text-foreground">4. {t("Pain")}</p>')
s = s.replace('<p className="mb-2 text-sm font-semibold text-foreground">6. {t("Orgasm")}</p>', '<p className="mb-2 font-serif text-lg font-semibold text-foreground">6. {t("Orgasm")}</p>')
s = s.replace('<p className="mb-2 text-sm font-semibold text-foreground">7. {t("Note (optional)")}</p>', '<p className="mb-2 font-serif text-lg font-semibold text-foreground">7. {t("Note (optional)")}</p>')

# Add controls and custom option chips for fixed semantic groups.
s = s.replace('<p className="mb-2 text-xs font-medium text-muted-foreground">{t("When")}</p>', '<p className="mb-2 font-serif text-sm font-semibold text-foreground">{t("When")}</p>\n              <CustomControls customKey="sexPainWhen" />')
s = s.replace('<p className="mb-2 text-xs font-medium text-muted-foreground">{t("Where")}</p>', '<p className="mb-2 font-serif text-sm font-semibold text-foreground">{t("Where")}</p>\n            <CustomControls customKey="sexPainLocations" />')

# Append custom chips to each relevant base chip group.
anchors = [
('''        {typeOptions.map((option) => (\n          <button key={option.value} type="button" onClick={() => setKind(option.value)} className={chipClass(kind === option.value)}>\n            <BixboSemanticIcon name={option.icon} size={17} />\n            <span>{t(option.label ?? option.value)}</span>\n          </button>\n        ))}''',
 '''        {typeOptions.map((option) => (\n          <button key={option.value} type="button" onClick={() => setKind(option.value)} className={chipClass(kind === option.value)}>\n            <BixboSemanticIcon name={option.icon} size={17} />\n            <span>{t(option.label ?? option.value)}</span>\n          </button>\n        ))}\n        {data.custom.sexTypes.map((value) => <button key={value} type="button" onClick={() => setKind(value as SexKind)} className={chipClass(kind === value)}><BixboSemanticIcon name="more" size={17} /><span>{value}</span></button>)}'''),
('''        {protectionOptions.map((option) => (\n          <button key={option.value} type="button" onClick={() => setProtection(option.value)} className={chipClass(protection === option.value)}>\n            <BixboSemanticIcon name={option.icon} size={17} />\n            <span>{t(option.value)}</span>\n          </button>\n        ))}''',
 '''        {protectionOptions.map((option) => (\n          <button key={option.value} type="button" onClick={() => setProtection(option.value)} className={chipClass(protection === option.value)}>\n            <BixboSemanticIcon name={option.icon} size={17} />\n            <span>{t(option.value)}</span>\n          </button>\n        ))}\n        {data.custom.sexProtection.map((value) => <button key={value} type="button" onClick={() => setProtection(value)} className={chipClass(protection === value)}><BixboSemanticIcon name="shield" size={17} /><span>{value}</span></button>)}'''),
('''        {feelingOptions.map((option) => (\n          <button key={option.value} type="button" onClick={() => setFeelingAfter(feelingAfter === option.value ? "" : option.value)} className={chipClass(feelingAfter === option.value)}>\n            <BixboSemanticIcon name={option.icon} size={17} />\n            <span>{t(option.value)}</span>\n          </button>\n        ))}''',
 '''        {feelingOptions.map((option) => (\n          <button key={option.value} type="button" onClick={() => setFeelingAfter(feelingAfter === option.value ? "" : option.value)} className={chipClass(feelingAfter === option.value)}>\n            <BixboSemanticIcon name={option.icon} size={17} />\n            <span>{t(option.value)}</span>\n          </button>\n        ))}\n        {data.custom.sexFeelings.map((value) => <button key={value} type="button" onClick={() => setFeelingAfter(feelingAfter === value ? "" : value)} className={chipClass(feelingAfter === value)}><BixboSemanticIcon name="good" size={17} /><span>{value}</span></button>)}'''),
]
for old, new in anchors:
    assert s.count(old) == 1, 'base option group anchor missing'
    s = s.replace(old, new)

# Pain When custom values map safely to the existing three supported states; display custom values as selectable labels only if they match.
# Pain locations and symptoms can store arbitrary strings, so append true custom chips.
needle = '''                {painLocationOptions.map((option) => {\n                const active = painLocations.includes(option.value);\n                return (\n                  <button key={option.value} type="button" onClick={() => setPainLocations((current) => toggleIn(current, option.value))} className={chipClass(active)}>\n                    <BixboSemanticIcon name={option.icon} size={15} /> {t(option.value)}\n                  </button>\n                );\n              })}'''
repl = needle + '''\n              {data.custom.sexPainLocations.map((value) => { const active = painLocations.includes(value); return <button key={value} type="button" onClick={() => setPainLocations((current) => toggleIn(current, value))} className={chipClass(active)}><BixboSemanticIcon name="pelvicPain" size={15} /> {value}</button>; })}'''
assert s.count(needle) == 1, 'pain location group missing'
s = s.replace(needle, repl)

needle = '''        {symptomOptions.map((option) => {\n          const active = symptomsAfter.includes(option.value);'''
assert s.count(needle) == 1, 'symptom map missing'
# append custom chips immediately before None button
anchor = '''        <button type="button" onClick={() => { setSymptomsAfter([]); setSymptomsNone((current) => !current); }} className={symptomChipClass(symptomsNone)}>'''
insert = '''        {data.custom.sexSymptomsAfter.map((value) => { const active = symptomsAfter.includes(value); return <button key={value} type="button" onClick={() => { setSymptomsNone(false); setSymptomsAfter((current) => toggleIn(current, value)); }} className={symptomChipClass(active)}><BixboSemanticIcon name="more" size={15} /><span>{value}</span>{active ? <Check className="h-3 w-3" /> : null}</button>; })}\n        <button type="button" onClick={() => { setSymptomsAfter([]); setSymptomsNone((current) => !current); }} className={symptomChipClass(symptomsNone)}>'''
assert s.count(anchor) == 1, 'None symptom anchor missing'
s = s.replace(anchor, insert)

cycle.write_text(s)

# 3) Make the richer overview real source code (copied from the previous Vite transform).
overview = Path('src/components/home/DayOverview.tsx')
s = overview.read_text()
start_marker = '      {log?.sex?.length ? ('
end_marker = '      {log?.heat?.length ? ('
start = s.index(start_marker)
end = s.index(end_marker, start)
block = r'''      {log?.sex?.length ? (
        <Card title="ŠukŠuk!" icon="❤️" compact>
          <ul className="space-y-1">
            {log.sex.map((s: SexEntry, index) => {
              const sx = s as SexEntry & { painWhenUi?: "during" | "after" | "both"; painScale?: number; painLocations?: string[] };
              const hasPain = Boolean(sx.painful && sx.painful !== "no");
              return (
                <li key={sx.id} className={`flex items-start gap-2 ${index ? "border-t border-border/60 pt-1.5" : ""}`}>
                  <button onClick={() => onEdit?.("sex", sx)} className="min-w-0 flex-1 text-left">
                    <p className="text-xs text-muted-foreground">{sx.time}</p>
                    <div className="my-1 border-t border-border/60" />
                    <p className="text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Type")}:</span>{" "}{t(String(sx.kind).replace(/_/g, " "))}</p>
                    {sx.protection ? <p className="mt-1 text-xs leading-snug text-muted-foreground"><span className="font-semibold text-foreground">{t("Protection")}:</span> {t(sx.protection)}</p> : null}
                    {asArr(sx.feelingAfter).length ? <p className="mt-1 text-xs leading-snug text-muted-foreground"><span className="font-semibold text-foreground">{t("Feeling after")}:</span>{" "}<IcoText text={asArr(sx.feelingAfter).join(", ")} size={13} /></p> : null}
                    <p className="mt-1 text-xs leading-snug text-muted-foreground"><span className="font-semibold text-foreground">{t("Pain")}:</span> {t(hasPain ? "Yes" : "No")}{hasPain && sx.painWhenUi ? ` · ${t(sx.painWhenUi)}` : ""}{hasPain && sx.painScale != null ? ` · ${sx.painScale}/10` : ""}</p>
                    {hasPain && sx.painLocations?.length ? <p className="mt-1 text-xs leading-snug text-muted-foreground"><span className="font-semibold text-foreground">{t("Where")}:</span> {sx.painLocations.map(t).join(", ")}</p> : null}
                    {sx.symptomsAfter?.length ? <p className="mt-1 text-xs leading-snug text-muted-foreground"><span className="font-semibold text-foreground">{t("Symptoms after")}:</span> {sx.symptomsAfter.map(t).join(", ")}</p> : null}
                    {sx.orgasm ? <p className="mt-1 text-xs leading-snug text-muted-foreground"><span className="font-semibold text-foreground">{t("Orgasm")}:</span> {t(sx.orgasm === "yes" ? "Yes" : "No")}</p> : null}
                    {sx.note ? <p className="mt-1 whitespace-pre-line text-xs leading-snug"><span className="font-semibold">{t("Note")}:</span> {sx.note}</p> : null}
                    <p className="mt-0.5 text-[10px] text-primary">{t("Tap to edit")}</p>
                  </button>
                  <DeleteBtn onClick={() => update((d) => ({ ...d, dayLogs: { ...d.dayLogs, [date]: { ...d.dayLogs[date], sex: (d.dayLogs[date]?.sex ?? []).filter((x) => x.id !== sx.id) } } }))} />
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

'''
s = s[:start] + block + s[end:]
overview.write_text(s)

# 4) Remove the temporary build-time transform from Vite.
vite = Path('vite.config.ts')
s = vite.read_text()
s = s.replace('import { suksukFixPlugin } from "./src/build/suksukFixPlugin";\n', '')
s = s.replace('  plugins: [suksukFixPlugin()],\n', '')
vite.write_text(s)

print('Applied SukSuk customization + typography source patch')
