from pathlib import Path

p = Path("src/features/logging/LogSheetRootV2.tsx")
s = p.read_text()

def rep(old: str, new: str) -> None:
    global s
    if old not in s:
        raise SystemExit(f"Expected block not found: {old[:180]!r}")
    s = s.replace(old, new, 1)

rep('type PlanTarget = "event" | "task" | "note" | null;\n', 'type PlanTarget = "event" | "task" | "note" | null;\ntype PainTarget = "pain" | "tetany" | "panic" | null;\n')

rep('  const [planTarget, setPlanTarget] = useState<PlanTarget>(\n    initial === "event" || initial === "task" || initial === "note" ? initial : null,\n  );\n', '  const [planTarget, setPlanTarget] = useState<PlanTarget>(\n    initial === "event" || initial === "task" || initial === "note" ? initial : null,\n  );\n  const [painTarget, setPainTarget] = useState<PainTarget>(\n    initial === "pain" || initial === "tetany" || initial === "panic" ? initial : null,\n  );\n')

rep('      setCat(initial ?? null);\n      setPlanTarget(initial === "event" || initial === "task" || initial === "note" ? initial : null);\n', '      setCat(initial ?? null);\n      setPlanTarget(initial === "event" || initial === "task" || initial === "note" ? initial : null);\n      setPainTarget(initial === "pain" || initial === "tetany" || initial === "panic" ? initial : null);\n')

rep('    setCustomEditEntry(undefined);\n    setPlanTarget(null);\n    onOpenChange(false);\n', '    setCustomEditEntry(undefined);\n    setPlanTarget(null);\n    setPainTarget(null);\n    onOpenChange(false);\n')

rep('  const active = cat ?? initial;\n  const renderActive: Category | undefined = active === "note" && planTarget ? planTarget : active;\n', '  const active = cat ?? initial;\n  const renderActive: Category | undefined = active === "pain"\n    ? (painTarget ?? undefined)\n    : active === "note" && planTarget\n      ? planTarget\n      : active;\n')

rep('    if (active === "note" && planTarget) {\n      setPlanTarget(null);\n      return;\n    }\n    if (initial) {\n', '    if (active === "note" && planTarget) {\n      setPlanTarget(null);\n      return;\n    }\n    if (active === "pain" && painTarget && !initial) {\n      setPainTarget(null);\n      return;\n    }\n    if (initial) {\n')

rep('    setCat(null);\n    setPlanTarget(null);\n  };\n', '    setCat(null);\n    setPlanTarget(null);\n    setPainTarget(null);\n  };\n')

rep('      .filter((category) => {\n        if (category.id === "event" || category.id === "task") return false;\n        if (!isRegistrySurfaceEnabled(data, category.id as RegistryFeatureId, "log")) return false;\n', '      .filter((category) => {\n        if (category.id === "event" || category.id === "task" || category.id === "tetany" || category.id === "panic") return false;\n        if (category.id === "pain") {\n          const anyPainLogEnabled = ["pain", "tetany", "panic"].some((id) =>\n            isRegistrySurfaceEnabled(data, id as RegistryFeatureId, "log"),\n          );\n          if (!anyPainLogEnabled) return false;\n        } else if (!isRegistrySurfaceEnabled(data, category.id as RegistryFeatureId, "log")) return false;\n')

rep('  const title = active === "note" && !planTarget\n    ? "Note & plan"\n    : renderActive === "tetany"\n', '  const title = active === "pain" && !painTarget\n    ? "Pain"\n    : active === "note" && !planTarget\n      ? "Note & plan"\n      : renderActive === "tetany"\n')

rep('                          setCat(c.id);\n                          setPlanTarget(null);\n', '                          setCat(c.id);\n                          setPlanTarget(null);\n                          setPainTarget(c.id === "pain" ? null : painTarget);\n')

rep('                {active === "note" && !planTarget && <PlanChooser onPick={setPlanTarget} />}\n                {renderActive === "postpartum" && <PostpartumSymptomsForm date={date} data={data} update={update} onDone={close} />}\n', '                {active === "pain" && !painTarget && <PainChooser data={data} onPick={setPainTarget} />}\n                {active === "note" && !planTarget && <PlanChooser onPick={setPlanTarget} />}\n                {renderActive === "postpartum" && <PostpartumSymptomsForm date={date} data={data} update={update} onDone={close} />}\n')

rep('                {activeAdminFields.length > 0 && renderActive !== "pain" && !active?.startsWith("custom:") && !(active === "note" && !planTarget) ? (\n', '                {activeAdminFields.length > 0 && renderActive !== "pain" && !active?.startsWith("custom:") && !(active === "note" && !planTarget) && !(active === "pain" && !painTarget) ? (\n')

marker = '\nfunction PlanChooser({ onPick }: { onPick: (target: Exclude<PlanTarget, null>) => void }) {'
chooser = '''
function PainChooser({ data, onPick }: { data: BixboData; onPick: (target: Exclude<PainTarget, null>) => void }) {
  const { t } = useI18n();
  const options = [
    { id: "pain" as const, icon: "🔥", title: "Pain", hint: "Pain level · body · symptoms" },
    { id: "tetany" as const, icon: "⭐", title: "Tetany", hint: "Tetany episode" },
    { id: "panic" as const, icon: "✨", title: "Panic attack", hint: "Panic attack episode" },
  ].filter((option) => isRegistrySurfaceEnabled(data, option.id as RegistryFeatureId, "log"));
  return <div className="mx-auto flex w-full max-w-md flex-col gap-3 py-5">
    <div className="px-1 pb-2 text-center"><h2 className="font-serif text-xl font-semibold">{t("Pain")}</h2><p className="mt-1 text-xs text-muted-foreground">{t("What would you like to log?")}</p></div>
    {options.map((option) => <button key={option.id} type="button" onClick={() => onPick(option.id)} className="flex items-center gap-3 rounded-3xl border border-border bg-surface p-4 text-left shadow-sm transition active:scale-[0.99]"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10"><Ico e={option.icon} size={26} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{t(option.title)}</span><span className="mt-0.5 block text-xs text-muted-foreground">{t(option.hint)}</span></span><span className="text-lg text-muted-foreground" aria-hidden="true">→</span></button>)}
  </div>;
}
'''
if marker not in s:
    raise SystemExit("PlanChooser marker not found")
s = s.replace(marker, "\n" + chooser + marker, 1)
p.write_text(s)
