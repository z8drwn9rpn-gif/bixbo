from pathlib import Path
p = Path('src/components/AdminEditOverlay.tsx')
text = p.read_text()
needle = '''  const resetFeature = (id: RegistryFeatureId) => {
    const config = getDeviceAdminConfig();
    const featuresCopy = { ...(config.features ?? {}) };
    delete featuresCopy[id];
    persist({ ...config, features: featuresCopy });
  };

'''
insert = needle + '''  const moveFeature = (featureId: RegistryFeatureId, delta: number) => {
    const ids = features.map((feature) => feature.id);
    const from = ids.indexOf(featureId);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];

    const config = getDeviceAdminConfig();
    const featureOverrides = { ...(config.features ?? {}) };
    ids.forEach((id, index) => {
      featureOverrides[id] = { ...(featureOverrides[id] ?? {}), order: (index + 1) * 10 };
    });
    persist({ ...config, enabled: true, features: featureOverrides });
  };

'''
if needle not in text: raise SystemExit('resetFeature marker not found')
text = text.replace(needle, insert, 1)
needle = '''                  {features.map((feature) => {
                    const local = localConfig.features?.[feature.id];
                    const enabled = isRegistryFeatureEnabled(adminView, feature.id);
                    return (
'''
replace = '''                  {features.map((feature, featureIndex) => {
                    const local = localConfig.features?.[feature.id];
                    const enabled = isRegistryFeatureEnabled(adminView, feature.id);
                    return (
'''
if needle not in text: raise SystemExit('features map marker not found')
text = text.replace(needle, replace, 1)
needle = '''                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {SURFACES.map((surface) => {
'''
replace = '''                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <button type="button" disabled={featureIndex === 0} onClick={() => moveFeature(feature.id, -1)} className="rounded-full bg-tint px-2.5 py-1 text-[9px] font-semibold ring-1 ring-border disabled:opacity-25" aria-label={`${t("Move up")} ${feature.label}`}>↑</button>
                          <button type="button" disabled={featureIndex === features.length - 1} onClick={() => moveFeature(feature.id, 1)} className="rounded-full bg-tint px-2.5 py-1 text-[9px] font-semibold ring-1 ring-border disabled:opacity-25" aria-label={`${t("Move down")} ${feature.label}`}>↓</button>
                          {SURFACES.map((surface) => {
'''
if needle not in text: raise SystemExit('surface row marker not found')
text = text.replace(needle, replace, 1)
p.write_text(text)

Path('src/lib/__tests__/admin-feature-order.test.ts').write_text('''import { describe, expect, it } from "bun:test";\nimport { registryFeaturesForSurface } from "../appRegistry";\nimport type { BixboData } from "../storage";\n\ndescribe("admin feature order", () => {\n  it("sorts registry surface features by stable admin order", () => {\n    const data = { settings: { adminConfig: { features: { pain: { order: 30 }, tetany: { order: 10 }, panic: { order: 20 } } } } } as unknown as Pick<BixboData, \"settings\">;\n    const ids = registryFeaturesForSurface(data, \"log\").map((feature) => feature.id);\n    expect(ids.indexOf(\"tetany\")).toBeLessThan(ids.indexOf(\"panic\"));\n    expect(ids.indexOf(\"panic\")).toBeLessThan(ids.indexOf(\"pain\"));\n  });\n});\n''')
