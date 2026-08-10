from pathlib import Path

# MonthCalendar: registry controls icons beyond sex.
p = Path('src/components/MonthCalendar.tsx')
s = p.read_text()
s = s.replace('import { isRegistrySurfaceEnabled } from "@/lib/appRegistry";', 'import { getRegistryFeature, isRegistrySurfaceEnabled, type RegistryFeatureId } from "@/lib/appRegistry";', 1)
old = '''function iconsFor(log: DayLog | undefined, data: BixboData): string[] {
  // Month calendar shows only ŠukŠuk, controlled by the registry.
  if (!isRegistrySurfaceEnabled(data, "sex", "calendar")) return [];
  return log?.sex?.some((e) => isIntercourseKind(e.kind)) ? ["❤️"] : [];
}'''
new = '''function iconsFor(log: DayLog | undefined, data: BixboData): string[] {
  if (!log) return [];
  const out: string[] = [];
  const add = (id: RegistryFeatureId, present: boolean) => {
    if (present && isRegistrySurfaceEnabled(data, id, "calendar")) out.push(getRegistryFeature(data, id).icon);
  };
  add("sex", Boolean(log.sex?.some((entry) => isIntercourseKind(entry.kind))));
  add("tetany", Boolean(log.tetany?.length));
  add("panic", Boolean(log.panic?.length));
  add("bowel", Boolean(log.bowel?.length));
  add("workout", Boolean(log.workout?.length));
  add("food", Boolean(log.food?.length));
  add("heat", Boolean(log.heat?.length));
  add("meds", Boolean(log.extraMeds?.length));
  add("sleep", log.sleepHours != null);
  add("hotFlashes", Boolean(log.pain?.some((entry) => entry.hotFlashesOn || (entry.hotFlashes ?? 0) > 0)));
  add("headache", Boolean(log.pain?.some((entry) => entry.headache || entry.headacheIntensity != null)));
  return Array.from(new Set(out)).slice(0, 3);
}'''
if old not in s:
    raise SystemExit('iconsFor anchor missing')
s = s.replace(old, new, 1)
p.write_text(s)

# Insights: admin rename is reflected in heatmap metric selector.
p = Path('src/routes/insights.tsx')
s = p.read_text()
s = s.replace('import { isRegistrySurfaceEnabled } from "@/lib/appRegistry";', 'import { getRegistryFeature, isRegistrySurfaceEnabled } from "@/lib/appRegistry";', 1)
old = '''  const availableHeatmapOptions = useMemo(
    () => HEATMAP_OPTIONS.filter((option) => isRegistrySurfaceEnabled(data, option.id, "heatmap")),
    [data],
  );'''
new = '''  const availableHeatmapOptions = useMemo(
    () => HEATMAP_OPTIONS
      .filter((option) => isRegistrySurfaceEnabled(data, option.id, "heatmap"))
      .map((option) => ({ ...option, label: getRegistryFeature(data, option.id).label })),
    [data],
  );'''
if old not in s:
    raise SystemExit('heatmap registry options anchor missing')
s = s.replace(old, new, 1)
p.write_text(s)

# Add cloud merge persistence regression test.
p = Path('src/lib/__tests__/appRegistry.test.ts')
s = p.read_text()
if 'mergeBixbo' not in s:
    s = s.replace('import { EMPTY, type BixboData } from "../storage";', 'import { EMPTY, type BixboData } from "../storage";\nimport { mergeBixbo } from "../merge";', 1)
insert = '''

  it("preserves admin registry configuration through cloud merge", () => {
    const local = clone();
    const remote = clone();
    local.settings.adminConfig = { features: { pain: { label: "My pain", surfaces: { heatmap: false } } } };
    const merged = mergeBixbo(local, remote);
    expect(merged.settings.adminConfig?.features?.pain?.label).toBe("My pain");
    expect(merged.settings.adminConfig?.features?.pain?.surfaces?.heatmap).toBe(false);
  });
'''
idx = s.rfind('\n});')
if idx < 0:
    raise SystemExit('test suite end missing')
s = s[:idx] + insert + s[idx:]
p.write_text(s)

print('Admin registry hardening applied')
