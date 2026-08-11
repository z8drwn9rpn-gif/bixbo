from pathlib import Path
p = Path('src/components/HakAdminEditOverlay.tsx')
text = p.read_text()
needle = 'import { EMPTY, useBixbo } from "@/lib/storage";\n'
insert = needle + 'import { ADMIN_MODE_CHANGED, isGlobalAdminModeActive } from "@/components/GlobalAdminModeController";\n'
if needle not in text: raise SystemExit('import marker not found')
text = text.replace(needle, insert, 1)
needle = '  const [hakOpen, setHakOpen] = useState(false);\n  const [editorOpen, setEditorOpen] = useState(false);\n'
insert = '  const [hakOpen, setHakOpen] = useState(false);\n  const [adminMode, setAdminMode] = useState(() => isGlobalAdminModeActive());\n  const [editorOpen, setEditorOpen] = useState(false);\n'
if needle not in text: raise SystemExit('state marker not found')
text = text.replace(needle, insert, 1)
needle = '  useEffect(() => {\n    const refresh = () => {\n      setConfig(readConfig());\n'
insert = '''  useEffect(() => {\n    const syncAdminMode = () => setAdminMode(isGlobalAdminModeActive());\n    window.addEventListener(ADMIN_MODE_CHANGED, syncAdminMode);\n    return () => window.removeEventListener(ADMIN_MODE_CHANGED, syncAdminMode);\n  }, []);\n\n  useEffect(() => {\n    if (!adminMode) setEditorOpen(false);\n  }, [adminMode]);\n\n  useEffect(() => {\n    const refresh = () => {\n      setConfig(readConfig());\n'''
if needle not in text: raise SystemExit('effect marker not found')
text = text.replace(needle, insert, 1)
needle = '  if (!hakOpen || typeof window === "undefined" || !isAdminOwnerAccount()) return null;\n'
replace = '  if (!hakOpen || !adminMode || typeof window === "undefined" || !isAdminOwnerAccount()) return null;\n'
if needle not in text: raise SystemExit('return marker not found')
text = text.replace(needle, replace, 1)
p.write_text(text)

Path('src/lib/__tests__/hak-admin-mode-source.test.ts').write_text('''import { describe, expect, it } from "bun:test";\nimport { readFileSync } from "node:fs";\n\ndescribe("HAK admin overlay global mode gate", () => {\n  it("renders only while global Admin Mode is active", () => {\n    const source = readFileSync(new URL("../../components/HakAdminEditOverlay.tsx", import.meta.url), "utf8");\n    expect(source).toContain("isGlobalAdminModeActive");\n    expect(source).toContain("ADMIN_MODE_CHANGED");\n    expect(source).toContain("!adminMode");\n  });\n});\n''')
