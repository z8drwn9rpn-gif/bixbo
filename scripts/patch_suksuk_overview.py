from pathlib import Path

cycle = Path('src/features/logging/CycleForms.tsx')
text = cycle.read_text()

replacements = [
(
'''  const [kind, setKind] = useState<SexKind>(initial?.kind ?? "sex");
  const [protection, setProtection] = useState<string>(initial?.protection ?? "None");
  const initialFeeling = asArr(initial?.feelingAfter)[0] ?? "";
  const [feelingAfter, setFeelingAfter] = useState(initialFeeling);
  const [painOn, setPainOn] = useState(initial?.painful != null && initial.painful !== "no");
''',
'''  const [kind, setKind] = useState<SexKind | undefined>(initial?.kind);
  const [protection, setProtection] = useState<string>(initial?.protection ?? "");
  const initialFeeling = asArr(initial?.feelingAfter)[0] ?? "";
  const [feelingAfter, setFeelingAfter] = useState(initialFeeling);
  const [painOn, setPainOn] = useState<boolean | undefined>(initial ? initial.painful != null && initial.painful !== "no" : undefined);
'''),
(
'''  const [symptomsAfter, setSymptomsAfter] = useState<string[]>(asArr(initial?.symptomsAfter));
  const [orgasm, setOrgasm] = useState<"yes" | "no" | undefined>(initial?.orgasm === "yes" || initial?.orgasm === "no" ? initial.orgasm : undefined);
''',
'''  const [symptomsAfter, setSymptomsAfter] = useState<string[]>(asArr(initial?.symptomsAfter));
  const [symptomsNone, setSymptomsNone] = useState(false);
  const [orgasm, setOrgasm] = useState<"yes" | "no" | undefined>(initial?.orgasm === "yes" || initial?.orgasm === "no" ? initial.orgasm : undefined);
'''),
(
'''    const painful: PainfulWhen = !painOn ? "no" : painWhen === "after" ? "after" : "during";
''',
'''    const painful: PainfulWhen = painOn === true ? (painWhen === "after" ? "after" : "during") : "no";
'''),
(
'''      kind,
''',
'''      kind: kind ?? "sex",
'''),
(
'''      painWhenUi: painOn ? painWhen : undefined,
      painScale: painOn ? painScaleValue : undefined,
      painLocations: painOn && painLocations.length ? painLocations : undefined,
''',
'''      painWhenUi: painOn === true ? painWhen : undefined,
      painScale: painOn === true ? painScaleValue : undefined,
      painLocations: painOn === true && painLocations.length ? painLocations : undefined,
'''),
(
'''        <button type="button" onClick={() => setPainOn(false)} className={chipClass(!painOn)}><BixboSemanticIcon name="good" size={17} /> {t("No")}</button>
        <button type="button" onClick={() => setPainOn(true)} className={chipClass(painOn)}><BixboSemanticIcon name="painYes" size={17} /> {t("Yes")}</button>
''',
'''        <button type="button" onClick={() => setPainOn(false)} className={chipClass(painOn === false)}><BixboSemanticIcon name="good" size={17} /> {t("No")}</button>
        <button type="button" onClick={() => setPainOn(true)} className={chipClass(painOn === true)}><BixboSemanticIcon name="painYes" size={17} /> {t("Yes")}</button>
'''),
(
'''      {painOn && (
''',
'''      {painOn === true && (
'''),
(
'''            <button key={option.value} type="button" onClick={() => setSymptomsAfter((current) => toggleIn(current, option.value))} className={symptomChipClass(active)}>
''',
'''            <button key={option.value} type="button" onClick={() => { setSymptomsNone(false); setSymptomsAfter((current) => toggleIn(current, option.value)); }} className={symptomChipClass(active)}>
'''),
(
'''        <button type="button" onClick={() => setSymptomsAfter([])} className={symptomChipClass(symptomsAfter.length === 0)}>
          <BixboSemanticIcon name="none" size={15} /> {t("None")}
        </button>
''',
'''        <button type="button" onClick={() => { setSymptomsAfter([]); setSymptomsNone((current) => !current); }} className={symptomChipClass(symptomsNone)}>
          <BixboSemanticIcon name="none" size={15} /> {t("None")}
        </button>
'''),
]

for old, new in replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'CycleForms replacement expected once, got {count}: {old[:80]!r}')
    text = text.replace(old, new)
cycle.write_text(text)


overview = Path('src/components/home/DayOverview.tsx')
text = overview.read_text()
old = '''      {log?.sex?.length ? (\n        <Card title="ŠukŠuk!" icon="❤️" compact>\n          <ul className="space-y-1">\n            {log.sex.map((s: SexEntry, index) => (\n              <li key={s.id} className={`flex items-start gap-2 ${index ? "border-t border-border/60 pt-1.5" : ""}`}>\n                <button onClick={() => onEdit?.("sex", s)} className="min-w-0 flex-1 text-left">\n                  <p className="text-xs text-muted-foreground">{s.time}</p>\n                  <div className="my-1 border-t border-border/60" />\n                  <p className="text-xs leading-relaxed text-muted-foreground">\n                    <span className="font-semibold text-foreground">{t("Type")}:</span>{" "}\n                    {t(String(s.kind).replace(/_/g, " "))}\n                  </p>\n                  {asArr(s.feelingAfter).length ? (\n                    <p className="mt-1 text-xs leading-snug text-muted-foreground">\n                      <span className="font-semibold text-foreground">{t("Feeling after")}:</span>{" "}\n                      <IcoText text={asArr(s.feelingAfter).join(", ")} size={13} />\n                    </p>\n                  ) : null}\n                  {s.painful && s.painful !== "no" ? (\n                    <p className="mt-1 text-xs leading-snug text-muted-foreground">\n                      <span className="font-semibold text-foreground">{t("Painful")}:</span> {t(s.painful)}\n                    </p>\n                  ) : null}\n                  {s.note ? (\n                    <p className="mt-1 whitespace-pre-line text-xs leading-snug">\n                      <span className="font-semibold">{t("Note")}:</span> {s.note}\n                    </p>\n                  ) : null}\n                  <p className="mt-0.5 text-[10px] text-primary">{t("Tap to edit")}</p>\n                </button>\n                <DeleteBtn\n                  onClick={() =>\n                    update((d) => ({\n                      ...d,\n                      dayLogs: {\n                        ...d.dayLogs,\n                        [date]: { ...d.dayLogs[date], sex: (d.dayLogs[date]?.sex ?? []).filter((x) => x.id !== s.id) },\n                      },\n                    }))\n                  }\n                />\n              </li>\n            ))}\n          </ul>\n        </Card>\n      ) : null}\n'''
new = '''      {log?.sex?.length ? (\n        <Card title="ŠukŠuk!" icon="❤️" compact>\n          <ul className="space-y-1">\n            {log.sex.map((s: SexEntry, index) => {\n              const sx = s as SexEntry & { painWhenUi?: "during" | "after" | "both"; painScale?: number; painLocations?: string[] };\n              const hasPain = Boolean(sx.painful && sx.painful !== "no");\n              return (\n                <li key={sx.id} className={`flex items-start gap-2 ${index ? "border-t border-border/60 pt-1.5" : ""}`}>\n                  <button onClick={() => onEdit?.("sex", sx)} className="min-w-0 flex-1 text-left">\n                    <p className="text-xs text-muted-foreground">{sx.time}</p>\n                    <div className="my-1 border-t border-border/60" />\n                    <p className="text-xs leading-relaxed text-muted-foreground">\n                      <span className="font-semibold text-foreground">{t("Type")}:</span>{" "}\n                      {t(String(sx.kind).replace(/_/g, " "))}\n                    </p>\n                    {sx.protection ? (\n                      <p className="mt-1 text-xs leading-snug text-muted-foreground">\n                        <span className="font-semibold text-foreground">{t("Protection")}:</span> {t(sx.protection)}\n                      </p>\n                    ) : null}\n                    {asArr(sx.feelingAfter).length ? (\n                      <p className="mt-1 text-xs leading-snug text-muted-foreground">\n                        <span className="font-semibold text-foreground">{t("Feeling after")}:</span>{" "}\n                        <IcoText text={asArr(sx.feelingAfter).join(", ")} size={13} />\n                      </p>\n                    ) : null}\n                    <p className="mt-1 text-xs leading-snug text-muted-foreground">\n                      <span className="font-semibold text-foreground">{t("Pain")}:</span> {t(hasPain ? "Yes" : "No")}\n                      {hasPain && sx.painWhenUi ? ` · ${t(sx.painWhenUi)}` : ""}\n                      {hasPain && sx.painScale != null ? ` · ${sx.painScale}/10` : ""}\n                    </p>\n                    {hasPain && sx.painLocations?.length ? (\n                      <p className="mt-1 text-xs leading-snug text-muted-foreground">\n                        <span className="font-semibold text-foreground">{t("Where")}:</span> {sx.painLocations.map(t).join(", ")}\n                      </p>\n                    ) : null}\n                    {sx.symptomsAfter?.length ? (\n                      <p className="mt-1 text-xs leading-snug text-muted-foreground">\n                        <span className="font-semibold text-foreground">{t("Symptoms after")}:</span> {sx.symptomsAfter.map(t).join(", ")}\n                      </p>\n                    ) : null}\n                    {sx.orgasm ? (\n                      <p className="mt-1 text-xs leading-snug text-muted-foreground">\n                        <span className="font-semibold text-foreground">{t("Orgasm")}:</span> {t(sx.orgasm === "yes" ? "Yes" : "No")}\n                      </p>\n                    ) : null}\n                    {sx.note ? (\n                      <p className="mt-1 whitespace-pre-line text-xs leading-snug">\n                        <span className="font-semibold">{t("Note")}:</span> {sx.note}\n                      </p>\n                    ) : null}\n                    <p className="mt-0.5 text-[10px] text-primary">{t("Tap to edit")}</p>\n                  </button>\n                  <DeleteBtn\n                    onClick={() =>\n                      update((d) => ({\n                        ...d,\n                        dayLogs: {\n                          ...d.dayLogs,\n                          [date]: { ...d.dayLogs[date], sex: (d.dayLogs[date]?.sex ?? []).filter((x) => x.id !== sx.id) },\n                        },\n                      }))\n                    }\n                  />\n                </li>\n              );\n            })}\n          </ul>\n        </Card>\n      ) : null}\n'''
count = text.count(old)
if count != 1:
    raise SystemExit(f'DayOverview sex block expected once, got {count}')
text = text.replace(old, new)
overview.write_text(text)

print('SukSuk patch applied')
