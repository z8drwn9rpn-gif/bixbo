from pathlib import Path


def replace_once(path: str, old: str, new: str):
    p = Path(path)
    s = p.read_text()
    assert old in s, f"anchor not found in {path}: {old[:140]!r}"
    p.write_text(s.replace(old, new, 1))

# Admin feature picker must render the branded BIXBO icon family, never native OS emoji.
replace_once(
    "src/components/AdminEditOverlay.tsx",
    'import { CoreFeatureCustomFieldBuilder } from "@/components/CoreFeatureCustomFieldBuilder";\n',
    'import { CoreFeatureCustomFieldBuilder } from "@/components/CoreFeatureCustomFieldBuilder";\nimport { Ico } from "@/components/icons/BixboIcons";\n',
)
replace_once(
    "src/components/AdminEditOverlay.tsx",
    '''                          <select value={feature.icon} onChange={(event) => patchFeature(feature.id, { icon: event.target.value })} className="h-9 w-14 rounded-xl bg-tint px-1 text-lg ring-1 ring-border">\n                            {[...new Set([feature.icon, ...ICONS])].map((icon) => <option key={icon}>{icon}</option>)}\n                          </select>''',
    '''                          <details className="group relative shrink-0">\n                            <summary\n                              className="grid h-9 w-11 cursor-pointer list-none place-items-center rounded-xl bg-tint ring-1 ring-border [&::-webkit-details-marker]:hidden"\n                              aria-label={t("Choose BIXBO icon")}\n                            >\n                              <Ico e={feature.icon} size={24} />\n                            </summary>\n                            <div className="absolute left-0 top-11 z-30 grid w-[184px] grid-cols-5 gap-1 rounded-2xl bg-background p-2 shadow-xl ring-1 ring-border">\n                              {[...new Set([feature.icon, ...ICONS])].map((icon) => (\n                                <button\n                                  key={icon}\n                                  type="button"\n                                  onClick={(event) => {\n                                    patchFeature(feature.id, { icon });\n                                    event.currentTarget.closest("details")?.removeAttribute("open");\n                                  }}\n                                  className="grid h-8 w-8 place-items-center rounded-lg bg-tint ring-1 ring-border/60 transition hover:bg-primary/10"\n                                  aria-label={`${t("Use icon")} ${icon}`}\n                                >\n                                  <Ico e={icon} size={21} />\n                                </button>\n                              ))}\n                            </div>\n                          </details>''',
)
replace_once(
    "src/components/AdminEditOverlay.tsx",
    '''                        <p className="text-xs font-bold">{feature.icon} {feature.label}</p>''',
    '''                        <p className="flex items-center gap-1.5 text-xs font-bold"><Ico e={feature.icon} size={16} /><span>{feature.label}</span></p>''',
)

# Make the central Admin dock self-explanatory and route HAK text/section editing to
# the dedicated HAK editor instead of editing the hidden Home page behind the portal.
replace_once(
    "src/components/GlobalAdminModeController.tsx",
    '''  const openAdminTool = (tool: "text" | "sections" | "navigation") => {\n    const button = document.querySelector<HTMLButtonElement>(`[data-bixbo-admin-open="${tool}"]`);\n    button?.click();\n  };''',
    '''  const openAdminTool = (tool: "text" | "sections" | "navigation") => {\n    const hakOpen = Boolean(document.querySelector("[data-bixbo-hak-root]"));\n    if (hakOpen && tool !== "navigation") {\n      requestAdminCustomizeCurrentPage();\n      return;\n    }\n    const button = document.querySelector<HTMLButtonElement>(`[data-bixbo-admin-open="${tool}"]`);\n    button?.click();\n  };''',
)
replace_once(
    "src/components/GlobalAdminModeController.tsx",
    '''<button type="button" onClick={() => openAdminTool("text")} className="rounded-full bg-background/15 px-2 py-1 text-[9px] font-bold">Aa</button>''',
    '''<button type="button" onClick={() => openAdminTool("text")} className="rounded-full bg-background/15 px-2 py-1 text-[9px] font-bold">{t("Text")}</button>''',
)
replace_once(
    "src/components/GlobalAdminModeController.tsx",
    '''<button type="button" onClick={() => openAdminTool("sections")} className="rounded-full bg-background/15 px-2 py-1 text-[9px] font-bold">＋</button>''',
    '''<button type="button" onClick={() => openAdminTool("sections")} className="rounded-full bg-background/15 px-2 py-1 text-[9px] font-bold">{t("Sections")}</button>''',
)
replace_once(
    "src/components/GlobalAdminModeController.tsx",
    '''<button type="button" onClick={() => openAdminTool("navigation")} className="rounded-full bg-background/15 px-2 py-1 text-[9px] font-bold">☰</button>''',
    '''<button type="button" onClick={() => openAdminTool("navigation")} className="rounded-full bg-background/15 px-2 py-1 text-[9px] font-bold">{t("Nav")}</button>''',
)

# Add regression guards for the two user-visible failures.
Path("src/lib/__tests__/admin-bixbo-icons-hak-regression.test.ts").write_text('''import { describe, expect, it } from "vitest";\nimport { readFileSync } from "node:fs";\nimport { resolve } from "node:path";\n\nconst read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");\n\ndescribe("Admin BIXBO icons and HAK overlay regressions", () => {\n  it("renders branded BIXBO icons in the feature icon picker", () => {\n    const source = read("src/components/AdminEditOverlay.tsx");\n    expect(source).toContain('import { Ico } from "@/components/icons/BixboIcons"');\n    expect(source).toContain("<Ico e={feature.icon} size={24} />");\n    expect(source).not.toContain("<select value={feature.icon}");\n  });\n\n  it("marks HAK as an admin-editable root and routes HAK tools to its editor", () => {\n    const index = read("src/routes/index.tsx");\n    const admin = read("src/components/GlobalAdminModeController.tsx");\n    expect(index).toContain('data-bixbo-hak-root="1"');\n    expect(admin).toContain('document.querySelector("[data-bixbo-hak-root]")');\n    expect(admin).toContain('if (hakOpen && tool !== "navigation")');\n  });\n});\n''')

print("BIXBO icon picker + HAK admin routing patch applied")
