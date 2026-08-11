from pathlib import Path

for file_name, marker in [
    ('src/components/AdminEditOverlay.tsx', 'AdminEditOverlay'),
    ('src/components/CoupleAdminEditOverlay.tsx', 'CoupleAdminEditOverlay'),
]:
    p = Path(file_name)
    text = p.read_text()
    import_marker = 'import { EMPTY, useBixbo, type BixboData } from "@/lib/storage";\n'
    import_line = 'import { ADMIN_MODE_CHANGED, isGlobalAdminModeActive } from "@/components/GlobalAdminModeController";\n'
    if import_line not in text:
        if import_marker not in text:
            raise SystemExit(f'{marker}: import marker not found')
        text = text.replace(import_marker, import_marker + import_line, 1)

    if marker == 'AdminEditOverlay':
        state_marker = '  const [revision, setRevision] = useState(0);\n  const [open, setOpen] = useState(false);\n'
        state_repl = '  const [revision, setRevision] = useState(0);\n  const [adminMode, setAdminMode] = useState(() => isGlobalAdminModeActive());\n  const [open, setOpen] = useState(false);\n'
        return_marker = '  if (!page || typeof window === "undefined" || !isAdminOwnerAccount()) return null;\n'
        return_repl = '  if (!page || !adminMode || typeof window === "undefined" || !isAdminOwnerAccount()) return null;\n'
    else:
        state_marker = '  const [page, setPage] = useState<LayoutPageId>("couple.overview");\n  const [revision, setRevision] = useState(0);\n  const [open, setOpen] = useState(false);\n'
        state_repl = '  const [page, setPage] = useState<LayoutPageId>("couple.overview");\n  const [revision, setRevision] = useState(0);\n  const [adminMode, setAdminMode] = useState(() => isGlobalAdminModeActive());\n  const [open, setOpen] = useState(false);\n'
        return_marker = '  if (!pathname.startsWith("/couple") || typeof window === "undefined" || !isAdminOwnerAccount()) return null;\n'
        return_repl = '  if (!pathname.startsWith("/couple") || !adminMode || typeof window === "undefined" || !isAdminOwnerAccount()) return null;\n'

    if state_marker not in text:
        raise SystemExit(f'{marker}: state marker not found')
    text = text.replace(state_marker, state_repl, 1)

    effect_marker = '  useEffect(() => {\n    const refresh = () => setRevision((value) => value + 1);\n'
    effect_insert = '''  useEffect(() => {\n    const syncAdminMode = () => setAdminMode(isGlobalAdminModeActive());\n    window.addEventListener(ADMIN_MODE_CHANGED, syncAdminMode);\n    return () => window.removeEventListener(ADMIN_MODE_CHANGED, syncAdminMode);\n  }, []);\n\n  useEffect(() => {\n    if (!adminMode) setOpen(false);\n  }, [adminMode]);\n\n  useEffect(() => {\n    const refresh = () => setRevision((value) => value + 1);\n'''
    if effect_marker not in text:
        raise SystemExit(f'{marker}: effect marker not found')
    text = text.replace(effect_marker, effect_insert, 1)

    if return_marker not in text:
        raise SystemExit(f'{marker}: return marker not found')
    text = text.replace(return_marker, return_repl, 1)
    p.write_text(text)

Path('src/lib/__tests__/strict-admin-gates-source.test.ts').write_text('''import { describe, expect, it } from "bun:test";\nimport { readFileSync } from "node:fs";\n\nfor (const file of ["AdminEditOverlay.tsx", "CoupleAdminEditOverlay.tsx", "HakAdminEditOverlay.tsx"]) {\n  describe(`${file} global Admin Mode gate`, () => {\n    it("uses the shared session mode instead of relying only on CSS hiding", () => {\n      const source = readFileSync(new URL(`../../components/${file}`, import.meta.url), "utf8");\n      expect(source).toContain("isGlobalAdminModeActive");\n      expect(source).toContain("ADMIN_MODE_CHANGED");\n      expect(source).toContain("!adminMode");\n    });\n  });\n}\n''')
