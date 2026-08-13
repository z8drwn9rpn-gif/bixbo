import type { Plugin } from "vite";

function replaceOnce(code: string, search: string, replacement: string, label: string) {
  const first = code.indexOf(search);
  if (first < 0) throw new Error(`[suksuk-fix] Missing ${label}`);
  if (code.indexOf(search, first + search.length) >= 0) throw new Error(`[suksuk-fix] Duplicate ${label}`);
  return code.slice(0, first) + replacement + code.slice(first + search.length);
}

function transformCycleForms(source: string) {
  let code = source;

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
      if (normalized.endsWith("/src/features/logging/CycleForms.tsx")) return transformCycleForms(code);
      if (normalized.endsWith("/src/components/home/DayOverview.tsx")) return transformDayOverview(code);
      return null;
    },
  };
}
