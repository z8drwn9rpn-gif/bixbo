import type { Plugin } from "vite";

// Dev tooling (TanStack devtools) injects data-tsd-source attributes before this
// plugin runs, which breaks exact-string patching. Strip them first.
function stripInjectedAttrs(code: string) {
  return code
    .replace(/\s*data-tsd-source="[^"]*"/g, "")
    .replace(/\s*\/>/g, " />");
}

function replaceOnce(code: string, search: string, replacement: string, label: string) {
  const first = code.indexOf(search);
  if (first < 0) throw new Error(`[suksuk-fix] Missing ${label}`);
  if (code.indexOf(search, first + search.length) >= 0) throw new Error(`[suksuk-fix] Duplicate ${label}`);
  return code.slice(0, first) + replacement + code.slice(first + search.length);
}

function transformCycleForms(source: string) {
  const t = (value: string) => value;
  let code = source;

  code = replaceOnce(
    code,
    'import { Check, Ico, Plus, X } from "@/components/icons/BixboIcons";',
    'import { Check, Ico, Pencil, Plus, X } from "@/components/icons/BixboIcons";',
    "SukSuk Pencil import",
  );

  code = replaceOnce(
    code,
    '  const [kind, setKind] = useState<SexKind>(initial?.kind ?? "sex");\n  const [protection, setProtection] = useState<string>(initial?.protection ?? "None");',
    '  const [kind, setKind] = useState<SexKind | undefined>(initial?.kind);\n  const [protection, setProtection] = useState<string>(initial?.protection ?? "");',
    "new-entry type/protection defaults",
  );

  code = replaceOnce(
    code,
    '  const [painOn, setPainOn] = useState(initial?.painful != null && initial.painful !== "no");',
    '  const [painOn, setPainOn] = useState<boolean | undefined>(initial ? initial.painful != null && initial.painful !== "no" : undefined);',
    "new-entry pain default",
  );

  code = replaceOnce(
    code,
    '  const [symptomsAfter, setSymptomsAfter] = useState<string[]>(asArr(initial?.symptomsAfter));\n  const [orgasm, setOrgasm]',
    '  const [symptomsAfter, setSymptomsAfter] = useState<string[]>(asArr(initial?.symptomsAfter));\n  const [symptomsNone, setSymptomsNone] = useState(false);\n  const [orgasm, setOrgasm]',
    "symptoms none state",
  );

  code = replaceOnce(
    code,
    '  const [note, setNote] = useState(initial?.note ?? "");\n\n  const typeOptions:',
    `  const [note, setNote] = useState(initial?.note ?? "");
  const [customAddingKey, setCustomAddingKey] = useState<string | null>(null);
  const [customEditKey, setCustomEditKey] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");
  const suksukCustom = ((data.settings as typeof data.settings & { suksukCustom?: Record<string, string[]> }).suksukCustom ?? {});
  const customValues = (key: string) => suksukCustom[key] ?? [];
  const setCustomValues = (key: string, values: string[]) => update((current) => ({
    ...current,
    settings: {
      ...current.settings,
      suksukCustom: {
        ...((current.settings as typeof current.settings & { suksukCustom?: Record<string, string[]> }).suksukCustom ?? {}),
        [key]: values,
      },
    } as typeof current.settings & { suksukCustom?: Record<string, string[]> },
  }));
  const renderCustomControls = (key: string) => {
    const values = customValues(key);
    const adding = customAddingKey === key;
    const editing = customEditKey === key;
    return (
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {adding ? (
          <>
            <Input value={customText} onChange={(event) => setCustomText(event.target.value)} placeholder={t("Custom…")} className="h-8 min-w-[140px] flex-1 rounded-full" autoFocus />
            <button type="button" className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground" onClick={() => {
              const next = customText.trim();
              if (!next || values.includes(next)) return;
              setCustomValues(key, [...values, next]);
              setCustomText("");
              setCustomAddingKey(null);
            }}>{t("Add")}</button>
            <button type="button" className="rounded-full bg-tint px-3 py-1.5 text-xs font-semibold text-foreground" onClick={() => { setCustomText(""); setCustomAddingKey(null); }}>{t("Cancel")}</button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => { setCustomText(""); setCustomAddingKey(key); setCustomEditKey(null); }} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20"><Plus className="h-3 w-3" /> {t("Add custom")}</button>
            <button type="button" onClick={() => { setCustomAddingKey(null); setCustomEditKey(editing ? null : key); }} className={\`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium \${editing ? "bg-primary text-primary-foreground" : "bg-tint text-muted-foreground"}\`}><Pencil className="h-3 w-3" /> {editing ? t("Done") : t("Edit")}</button>
          </>
        )}
        {editing && values.map((value) => (
          <span key={value} className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-1 text-[11px] ring-1 ring-border">
            <span>{value}</span>
            <button type="button" aria-label={\`${t("Rename")} \${value}\`} onClick={() => {
              const next = prompt(\`${t("Rename")} “\${value}”\`, value)?.trim();
              if (next && next !== value && !values.includes(next)) setCustomValues(key, values.map((item) => item === value ? next : item));
            }}><Pencil className="h-3 w-3" /></button>
            <button type="button" aria-label={\`${t("Remove")} \${value}\`} onClick={() => setCustomValues(key, values.filter((item) => item !== value))}><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
    );
  };

  const typeOptions:`,
    "SukSuk custom controls",
  );

  code = replaceOnce(
    code,
    '    const painful: PainfulWhen = !painOn ? "no" : painWhen === "after" ? "after" : "during";',
    '    const painful: PainfulWhen = painOn === true ? (painWhen === "after" ? "after" : "during") : "no";',
    "pain save state",
  );

  code = replaceOnce(
    code,
    '      id: initial?.id ?? schema?.sourceEntryId ?? crypto.randomUUID(),\n      time: initial?.time ?? nowHHMM(),\n      kind,\n      orgasm,',
    '      id: initial?.id ?? schema?.sourceEntryId ?? crypto.randomUUID(),\n      time: initial?.time ?? nowHHMM(),\n      kind: kind ?? "sex",\n      orgasm,',
    "kind save fallback",
  );

  code = replaceOnce(
    code,
    '      painWhenUi: painOn ? painWhen : undefined,\n      painScale: painOn ? painScaleValue : undefined,\n      painLocations: painOn && painLocations.length ? painLocations : undefined,',
    '      painWhenUi: painOn === true ? painWhen : undefined,\n      painScale: painOn === true ? painScaleValue : undefined,\n      painLocations: painOn === true && painLocations.length ? painLocations : undefined,',
    "pain detail save state",
  );

  code = replaceOnce(
    code,
    '        <button type="button" onClick={() => setPainOn(false)} className={chipClass(!painOn)}><BixboSemanticIcon name="good" size={17} /> {t("No")}</button>\n        <button type="button" onClick={() => setPainOn(true)} className={chipClass(painOn)}><BixboSemanticIcon name="painYes" size={17} /> {t("Yes")}</button>',
    '        <button type="button" onClick={() => setPainOn(false)} className={chipClass(painOn === false)}><BixboSemanticIcon name="good" size={17} /> {t("No")}</button>\n        <button type="button" onClick={() => setPainOn(true)} className={chipClass(painOn === true)}><BixboSemanticIcon name="painYes" size={17} /> {t("Yes")}</button>',
    "pain chips",
  );

  code = replaceOnce(code, '      {painOn && (', '      {painOn === true && (', "pain detail visibility");

  code = replaceOnce(
    code,
    '            <button key={option.value} type="button" onClick={() => setSymptomsAfter((current) => toggleIn(current, option.value))} className={symptomChipClass(active)}>',
    '            <button key={option.value} type="button" onClick={() => { setSymptomsNone(false); setSymptomsAfter((current) => toggleIn(current, option.value)); }} className={symptomChipClass(active)}>',
    "symptom chip behavior",
  );

  code = replaceOnce(
    code,
    '        <button type="button" onClick={() => setSymptomsAfter([])} className={symptomChipClass(symptomsAfter.length === 0)}>\n          <BixboSemanticIcon name="none" size={15} /> {t("None")}\n        </button>',
    '        <button type="button" onClick={() => { setSymptomsAfter([]); setSymptomsNone((current) => !current); }} className={symptomChipClass(symptomsNone)}>\n          <BixboSemanticIcon name="none" size={15} /> {t("None")}\n        </button>',
    "symptoms none chip",
  );

  const headingReplacements: Array<[string, string, string]> = [
    ['<p className="mb-2 text-sm font-semibold text-foreground">1. {t("Type")}</p>', '<p className="mb-2 font-serif text-lg font-semibold text-foreground">1. {t("Type")}</p>\n      {renderCustomControls("type")}', "type heading"],
    ['<p className="mb-2 text-sm font-semibold text-foreground">2. {t("Protection")}</p>', '<p className="mb-2 font-serif text-lg font-semibold text-foreground">2. {t("Protection")}</p>\n      {renderCustomControls("protection")}', "protection heading"],
    ['<p className="mb-2 text-sm font-semibold text-foreground">3. {t("How I feel after")}</p>', '<p className="mb-2 font-serif text-lg font-semibold text-foreground">3. {t("How I feel after")}</p>\n      {renderCustomControls("feeling")}', "feeling heading"],
    ['<p className="mb-2 text-sm font-semibold text-foreground">4. {t("Pain")}</p>', '<p className="mb-2 font-serif text-lg font-semibold text-foreground">4. {t("Pain")}</p>', "pain heading"],
    ['<p className="mb-2 text-sm font-semibold text-foreground">5. {t("Symptoms after")}</p>', '<p className="mb-2 font-serif text-lg font-semibold text-foreground">5. {t("Symptoms after")}</p>\n      {renderCustomControls("symptoms")}', "symptoms heading"],
    ['<p className="mb-2 text-sm font-semibold text-foreground">6. {t("Orgasm")}</p>', '<p className="mb-2 font-serif text-lg font-semibold text-foreground">6. {t("Orgasm")}</p>', "orgasm heading"],
    ['<p className="mb-2 text-sm font-semibold text-foreground">7. {t("Note (optional)")}</p>', '<p className="mb-2 font-serif text-lg font-semibold text-foreground">7. {t("Note (optional)")}</p>', "note heading"],
  ];
  for (const [search, replacement, label] of headingReplacements) code = replaceOnce(code, search, replacement, label);

  code = replaceOnce(
    code,
    '<p className="mb-2 text-xs font-medium text-muted-foreground">{t("Where")}</p>',
    '<p className="mb-2 font-serif text-sm font-semibold text-foreground">{t("Where")}</p>\n            {renderCustomControls("where")}',
    "where heading",
  );

  code = replaceOnce(
    code,
    '        {typeOptions.map((option) => (\n          <button key={option.value} type="button" onClick={() => setKind(option.value)} className={chipClass(kind === option.value)}>\n            <BixboSemanticIcon name={option.icon} size={17} />\n            <span>{t(option.label ?? option.value)}</span>\n          </button>\n        ))}',
    '        {typeOptions.map((option) => (\n          <button key={option.value} type="button" onClick={() => setKind(option.value)} className={chipClass(kind === option.value)}>\n            <BixboSemanticIcon name={option.icon} size={17} />\n            <span>{t(option.label ?? option.value)}</span>\n          </button>\n        ))}\n        {customValues("type").map((value) => <button key={value} type="button" onClick={() => setKind(value as SexKind)} className={chipClass(kind === value)}><BixboSemanticIcon name="more" size={17} /><span>{value}</span></button>)}',
    "custom type chips",
  );

  code = replaceOnce(
    code,
    '        {protectionOptions.map((option) => (\n          <button key={option.value} type="button" onClick={() => setProtection(option.value)} className={chipClass(protection === option.value)}>\n            <BixboSemanticIcon name={option.icon} size={17} />\n            <span>{t(option.value)}</span>\n          </button>\n        ))}',
    '        {protectionOptions.map((option) => (\n          <button key={option.value} type="button" onClick={() => setProtection(option.value)} className={chipClass(protection === option.value)}>\n            <BixboSemanticIcon name={option.icon} size={17} />\n            <span>{t(option.value)}</span>\n          </button>\n        ))}\n        {customValues("protection").map((value) => <button key={value} type="button" onClick={() => setProtection(value)} className={chipClass(protection === value)}><BixboSemanticIcon name="shield" size={17} /><span>{value}</span></button>)}',
    "custom protection chips",
  );

  code = replaceOnce(
    code,
    '        {feelingOptions.map((option) => (\n          <button key={option.value} type="button" onClick={() => setFeelingAfter(feelingAfter === option.value ? "" : option.value)} className={chipClass(feelingAfter === option.value)}>\n            <BixboSemanticIcon name={option.icon} size={17} />\n            <span>{t(option.value)}</span>\n          </button>\n        ))}',
    '        {feelingOptions.map((option) => (\n          <button key={option.value} type="button" onClick={() => setFeelingAfter(feelingAfter === option.value ? "" : option.value)} className={chipClass(feelingAfter === option.value)}>\n            <BixboSemanticIcon name={option.icon} size={17} />\n            <span>{t(option.value)}</span>\n          </button>\n        ))}\n        {customValues("feeling").map((value) => <button key={value} type="button" onClick={() => setFeelingAfter(feelingAfter === value ? "" : value)} className={chipClass(feelingAfter === value)}><BixboSemanticIcon name="good" size={17} /><span>{value}</span></button>)}',
    "custom feeling chips",
  );

  code = replaceOnce(
    code,
    '              {painLocationOptions.map((option) => {\n                const active = painLocations.includes(option.value);\n                return (\n                  <button key={option.value} type="button" onClick={() => setPainLocations((current) => toggleIn(current, option.value))} className={chipClass(active)}>\n                    <BixboSemanticIcon name={option.icon} size={15} /> {t(option.value)}\n                  </button>\n                );\n              })}',
    '              {painLocationOptions.map((option) => {\n                const active = painLocations.includes(option.value);\n                return (\n                  <button key={option.value} type="button" onClick={() => setPainLocations((current) => toggleIn(current, option.value))} className={chipClass(active)}>\n                    <BixboSemanticIcon name={option.icon} size={15} /> {t(option.value)}\n                  </button>\n                );\n              })}\n              {customValues("where").map((value) => { const active = painLocations.includes(value); return <button key={value} type="button" onClick={() => setPainLocations((current) => toggleIn(current, value))} className={chipClass(active)}><BixboSemanticIcon name="pelvicPain" size={15} /> {value}</button>; })}',
    "custom location chips",
  );

  code = replaceOnce(
    code,
    '        <button type="button" onClick={() => { setSymptomsAfter([]); setSymptomsNone((current) => !current); }} className={symptomChipClass(symptomsNone)}>',
    '        {customValues("symptoms").map((value) => { const active = symptomsAfter.includes(value); return <button key={value} type="button" onClick={() => { setSymptomsNone(false); setSymptomsAfter((current) => toggleIn(current, value)); }} className={symptomChipClass(active)}><BixboSemanticIcon name="more" size={15} /><span>{value}</span>{active ? <Check className="h-3 w-3" /> : null}</button>; })}\n        <button type="button" onClick={() => { setSymptomsAfter([]); setSymptomsNone((current) => !current); }} className={symptomChipClass(symptomsNone)}>',
    "custom symptom chips",
  );

  return code;
}

function transformDayOverview(source: string) {
  const startMarker = '      {log?.sex?.length ? (';
  const endMarker = '      {log?.heat?.length ? (';
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error("[suksuk-fix] Could not locate SukSuk overview block");

  const block = `      {log?.sex?.length ? (
        <Card title="ŠukŠuk!" icon="❤️" compact>
          <ul className="space-y-1">
            {log.sex.map((s: SexEntry, index) => {
              const sx = s as SexEntry & {
                painWhenUi?: "during" | "after" | "both";
                painScale?: number;
                painLocations?: string[];
              };
              const hasPain = Boolean(sx.painful && sx.painful !== "no");
              return (
                <li key={sx.id} className={\`flex items-start gap-2 \${index ? "border-t border-border/60 pt-1.5" : ""}\`}>
                  <button onClick={() => onEdit?.("sex", sx)} className="min-w-0 flex-1 text-left">
                    <p className="text-xs text-muted-foreground">{sx.time}</p>
                    <div className="my-1 border-t border-border/60" />
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground">{t("Type")}:</span>{" "}
                      {t(String(sx.kind).replace(/_/g, " "))}
                    </p>
                    {sx.protection ? (
                      <p className="mt-1 text-xs leading-snug text-muted-foreground">
                        <span className="font-semibold text-foreground">{t("Protection")}:</span> {t(sx.protection)}
                      </p>
                    ) : null}
                    {asArr(sx.feelingAfter).length ? (
                      <p className="mt-1 text-xs leading-snug text-muted-foreground">
                        <span className="font-semibold text-foreground">{t("Feeling after")}:</span>{" "}
                        <IcoText text={asArr(sx.feelingAfter).join(", ")} size={13} />
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs leading-snug text-muted-foreground">
                      <span className="font-semibold text-foreground">{t("Pain")}:</span> {t(hasPain ? "Yes" : "No")}
                      {hasPain && sx.painWhenUi ? \` · \${t(sx.painWhenUi)}\` : ""}
                      {hasPain && sx.painScale != null ? \` · \${sx.painScale}/10\` : ""}
                    </p>
                    {hasPain && sx.painLocations?.length ? (
                      <p className="mt-1 text-xs leading-snug text-muted-foreground">
                        <span className="font-semibold text-foreground">{t("Where")}:</span> {sx.painLocations.map(t).join(", ")}
                      </p>
                    ) : null}
                    {sx.symptomsAfter?.length ? (
                      <p className="mt-1 text-xs leading-snug text-muted-foreground">
                        <span className="font-semibold text-foreground">{t("Symptoms after")}:</span> {sx.symptomsAfter.map(t).join(", ")}
                      </p>
                    ) : null}
                    {sx.orgasm ? (
                      <p className="mt-1 text-xs leading-snug text-muted-foreground">
                        <span className="font-semibold text-foreground">{t("Orgasm")}:</span> {t(sx.orgasm === "yes" ? "Yes" : "No")}
                      </p>
                    ) : null}
                    {sx.note ? (
                      <p className="mt-1 whitespace-pre-line text-xs leading-snug">
                        <span className="font-semibold">{t("Note")}:</span> {sx.note}
                      </p>
                    ) : null}
                    <p className="mt-0.5 text-[10px] text-primary">{t("Tap to edit")}</p>
                  </button>
                  <DeleteBtn
                    onClick={() =>
                      update((d) => ({
                        ...d,
                        dayLogs: {
                          ...d.dayLogs,
                          [date]: { ...d.dayLogs[date], sex: (d.dayLogs[date]?.sex ?? []).filter((x) => x.id !== sx.id) },
                        },
                      }))
                    }
                  />
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

`;

  return source.slice(0, start) + block + source.slice(end);
}

export function suksukFixPlugin(): Plugin {
  return {
    name: "bixbo-suksuk-fix",
    enforce: "pre",
    transform(code, id) {
      const normalized = id.replace(/\\/g, "/").split("?")[0];
      if (normalized.endsWith("/src/features/logging/CycleForms.tsx")) return transformCycleForms(stripInjectedAttrs(code));
      if (normalized.endsWith("/src/components/home/DayOverview.tsx")) return transformDayOverview(stripInjectedAttrs(code));
      return null;
    },
  };
}
