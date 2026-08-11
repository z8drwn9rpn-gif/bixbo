from pathlib import Path

# appRegistry: add exported type and config field
p = Path('src/lib/appRegistry.ts')
text = p.read_text()
needle = 'export type RegistryCorrelationThreshold = { operator: "gte" | "lte"; value: number };\n\n'
insert = 'export type RegistryCorrelationThreshold = { operator: "gte" | "lte"; value: number };\n\nexport type AdminPageBlock = {\n  id: string;\n  title: string;\n  body: string;\n  order: number;\n  hidden?: boolean;\n};\n\n'
if needle not in text:
    raise SystemExit('appRegistry threshold marker not found')
text = text.replace(needle, insert, 1)
needle2 = '  /** Route-scoped visible text overrides. BIXBO brand strings are rejected by the editor runtime. */\n  textOverrides?: Record<string, { label?: string; hidden?: boolean }>;\n'
insert2 = needle2 + '  /** Route-scoped admin-created content blocks. These never participate in health calculations. */\n  pageBlocks?: Record<string, AdminPageBlock[]>;\n'
if needle2 not in text:
    raise SystemExit('appRegistry textOverrides marker not found')
text = text.replace(needle2, insert2, 1)
p.write_text(text)

# effectiveAdminConfig: route-wise local override of page block arrays
p = Path('src/lib/effectiveAdminConfig.ts')
text = p.read_text()
needle = '    textOverrides: mergeTextOverrides(globalConfig, localConfig),\n'
insert = needle + '    pageBlocks: {\n      ...(globalConfig.pageBlocks ?? {}),\n      ...(localConfig.pageBlocks ?? {}),\n    },\n'
if needle not in text:
    raise SystemExit('effectiveAdminConfig marker not found')
text = text.replace(needle, insert, 1)
p.write_text(text)

# root: mount component globally
p = Path('src/routes/__root.tsx')
text = p.read_text()
needle = 'import { UniversalTextAdminEditor } from "../components/UniversalTextAdminEditor";\n'
insert = needle + 'import { AdminCustomPageBlocks } from "../components/AdminCustomPageBlocks";\n'
if needle not in text:
    raise SystemExit('root import marker not found')
text = text.replace(needle, insert, 1)
needle2 = '      <UniversalTextAdminEditor />\n'
insert2 = needle2 + '      <AdminCustomPageBlocks />\n'
if needle2 not in text:
    raise SystemExit('root mount marker not found')
text = text.replace(needle2, insert2, 1)
p.write_text(text)

# tests
Path('src/lib/__tests__/admin-page-blocks.test.ts').write_text('''import { describe, expect, it } from "bun:test";\nimport { mergeAdminConfigs } from "../effectiveAdminConfig";\n\ndescribe("admin custom page blocks", () => {\n  it("uses local route blocks while preserving unrelated global routes", () => {\n    const merged = mergeAdminConfigs(\n      { pageBlocks: { "/a": [{ id: "global", title: "A", body: "", order: 10 }], "/b": [{ id: "b", title: "B", body: "", order: 10 }] } },\n      { pageBlocks: { "/a": [{ id: "local", title: "Local A", body: "Text", order: 10 }] } },\n    );\n    expect(merged.pageBlocks?.["/a"]?.map((block) => block.id)).toEqual(["local"]);\n    expect(merged.pageBlocks?.["/b"]?.map((block) => block.id)).toEqual(["b"]);\n  });\n});\n''')
