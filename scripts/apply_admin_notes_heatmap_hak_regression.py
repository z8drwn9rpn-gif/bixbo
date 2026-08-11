from pathlib import Path


def replace_once(path: str, old: str, new: str):
    p = Path(path)
    s = p.read_text()
    assert old in s, f'anchor not found in {path}: {old[:120]!r}'
    s = s.replace(old, new, 1)
    p.write_text(s)

# 1) Year heatmap: do not match Jul spillover dates inside the Jan-Jun half-year grid.
replace_once(
    'src/routes/insights.tsx',
    '''    for (let halfIndex = 0; halfIndex < halfYearGrids.length; halfIndex++) {\n      const half = halfYearGrids[halfIndex];\n      for (let weekIndex = 0; weekIndex < half.weeks.length; weekIndex++) {''',
    '''    const activeDate = fromKey(active);\n    for (let halfIndex = 0; halfIndex < halfYearGrids.length; halfIndex++) {\n      const half = halfYearGrids[halfIndex];\n      if (activeDate.getMonth() < half.startMonth || activeDate.getMonth() > half.endMonth) continue;\n      for (let weekIndex = 0; weekIndex < half.weeks.length; weekIndex++) {''',
)

# 2) HAK: mark the real overlay root so the admin editor can reliably detect it.
replace_once(
    'src/routes/index.tsx',
    '''    <div\n      ref={overlayRef}\n      className="fixed inset-0 z-[900] flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground"''',
    '''    <div\n      ref={overlayRef}\n      data-bixbo-hak-root="1"\n      className="fixed inset-0 z-[900] flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground"''',
)

# 3) Notes: force one post-mount rerender (the same state transition that currently
# makes iOS editing start after Checklist), and avoid double touch priming.
replace_once(
    'src/routes/notes-editor.tsx',
    '''  const [tick, setTick] = useState(0);\n\n  const editorRef = useRef<HTMLDivElement | null>(null);''',
    '''  const [tick, setTick] = useState(0);\n  const [editorReady, setEditorReady] = useState(false);\n\n  const editorRef = useRef<HTMLDivElement | null>(null);''',
)
replace_once(
    'src/routes/notes-editor.tsx',
    '''  const contentRef = useRef(initialContentRef.current);\n  const firstRender = useRef(true);\n\n  useEffect(() => {''',
    '''  const contentRef = useRef(initialContentRef.current);\n  const firstRender = useRef(true);\n\n  useEffect(() => {\n    setEditorReady(false);\n    const frame = window.requestAnimationFrame(() => setEditorReady(true));\n    return () => window.cancelAnimationFrame(frame);\n  }, [note.id]);\n\n  useEffect(() => {''',
)
replace_once(
    'src/routes/notes-editor.tsx',
    '''            key={note.id}\n            ref={editorRef}''',
    '''            key={`${note.id}:${editorReady ? "ready" : "boot"}`}\n            ref={editorRef}''',
)
replace_once(
    'src/routes/notes-editor.tsx',
    '''            onPointerDown={(event) => {\n              if (event.pointerType === "touch") primeIOSKeyboard();\n            }}\n            onTouchStart={primeIOSKeyboard}\n            onInput={onInput}''',
    '''            onPointerDown={(event) => {\n              if (event.pointerType === "touch") primeIOSKeyboard();\n            }}\n            onInput={onInput}''',
)

# 4) Universal page editor: refresh when the actual page DOM mounts/changes, not only
# after a config change. Do not close merely because adminMode became active.
replace_once(
    'src/components/UniversalAdminPageEditor.tsx',
    '''  useEffect(() => {\n    if (!supported) return;\n    let queued = false;''',
    '''  useEffect(() => {\n    if (!supported) return;\n    let refreshQueued = false;\n    const refreshObserver = new MutationObserver(() => {\n      if (refreshQueued) return;\n      refreshQueued = true;\n      window.requestAnimationFrame(() => {\n        refreshQueued = false;\n        setRevision((value) => value + 1);\n      });\n    });\n    refreshObserver.observe(document.body, { childList: true, subtree: true });\n    return () => refreshObserver.disconnect();\n  }, [pathname, supported]);\n\n  useEffect(() => {\n    if (!supported) return;\n    let queued = false;''',
)
replace_once(
    'src/components/UniversalAdminPageEditor.tsx',
    '''  useEffect(() => {\n    setOpen(false);\n  }, [pathname, adminMode]);''',
    '''  useEffect(() => {\n    setOpen(false);\n  }, [pathname]);\n\n  useEffect(() => {\n    if (!adminMode) setOpen(false);\n  }, [adminMode]);''',
)

# 5) Universal text editor: refresh its visible-text inventory as the route DOM mounts.
replace_once(
    'src/components/UniversalTextAdminEditor.tsx',
    '''  useEffect(() => {\n    let queued = false;\n    const apply = () => {''',
    '''  useEffect(() => {\n    let refreshQueued = false;\n    const refreshObserver = new MutationObserver(() => {\n      if (refreshQueued) return;\n      refreshQueued = true;\n      window.requestAnimationFrame(() => {\n        refreshQueued = false;\n        setRevision((value) => value + 1);\n      });\n    });\n    refreshObserver.observe(document.body, { childList: true, subtree: true });\n    return () => refreshObserver.disconnect();\n  }, [pathname]);\n\n  useEffect(() => {\n    let queued = false;\n    const apply = () => {''',
)
replace_once(
    'src/components/UniversalTextAdminEditor.tsx',
    '''  useEffect(() => {\n    setOpen(false);\n  }, [pathname, adminMode]);''',
    '''  useEffect(() => {\n    setOpen(false);\n  }, [pathname]);\n\n  useEffect(() => {\n    if (!adminMode) setOpen(false);\n  }, [adminMode]);''',
)
replace_once(
    'src/components/UniversalTextAdminEditor.tsx',
    '''        <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-full bg-surface px-4 py-2 text-xs font-bold text-foreground shadow-lg ring-1 ring-border">''',
    '''        <button type="button" data-bixbo-admin-open="text" onClick={() => setOpen((value) => !value)} className="rounded-full bg-surface px-4 py-2 text-xs font-bold text-foreground shadow-lg ring-1 ring-border">''',
)

# 6) Custom Sections: keep looking for <main> until it exists; this removes the
# dependency on some unrelated later config change. Also expose a stable launcher id.
replace_once(
    'src/components/AdminCustomPageBlocks.tsx',
    '''  useEffect(() => {\n    setHost(pageHost());\n    setOpen(false);\n  }, [pathname]);''',
    '''  useEffect(() => {\n    setHost(pageHost());\n    setOpen(false);\n    const observer = new MutationObserver(() => {\n      const nextHost = pageHost();\n      setHost((current) => current === nextHost ? current : nextHost);\n      setRevision((value) => value + 1);\n    });\n    observer.observe(document.body, { childList: true, subtree: true });\n    return () => observer.disconnect();\n  }, [pathname]);''',
)
replace_once(
    'src/components/AdminCustomPageBlocks.tsx',
    '''            <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-full bg-surface px-4 py-2 text-xs font-bold text-foreground shadow-lg ring-1 ring-border">''',
    '''            <button type="button" data-bixbo-admin-open="sections" onClick={() => setOpen((value) => !value)} className="rounded-full bg-surface px-4 py-2 text-xs font-bold text-foreground shadow-lg ring-1 ring-border">''',
)

# 7) Navigation launcher stable id.
replace_once(
    'src/components/NavigationAdminEditor.tsx',
    '''        <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background shadow-lg ring-1 ring-border">''',
    '''        <button type="button" data-bixbo-admin-open="navigation" onClick={() => setOpen((value) => !value)} className="rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background shadow-lg ring-1 ring-border">''',
)

# 8) HAK editor should open as soon as the HAK overlay appears while Admin Mode is active.
replace_once(
    'src/components/HakAdminEditOverlay.tsx',
    '''  useEffect(() => {\n    if (!adminMode) setEditorOpen(false);\n  }, [adminMode]);''',
    '''  useEffect(() => {\n    if (!adminMode) {\n      setEditorOpen(false);\n      return;\n    }\n    if (hakOpen) setEditorOpen(true);\n  }, [adminMode, hakOpen]);''',
)

# 9) Global admin dock: one non-overlapping launcher row for every screen. Existing
# launcher buttons remain in code and are only hidden while this central dock is shown.
p = Path('src/components/GlobalAdminModeController.tsx')
s = p.read_text()
old = '''  const owner = typeof window !== "undefined" && isAdminOwnerAccount();\n\n  useEffect(() => {'''
new = '''  const owner = typeof window !== "undefined" && isAdminOwnerAccount();\n\n  const openAdminTool = (tool: "text" | "sections" | "navigation") => {\n    const button = document.querySelector<HTMLButtonElement>(`[data-bixbo-admin-open="${tool}"]`);\n    button?.click();\n  };\n\n  useEffect(() => {'''
assert old in s
s = s.replace(old, new, 1)
old = '''        html:not([data-bixbo-admin-mode="1"]) [data-bixbo-hak-admin-ui] {\n          display: none !important;\n        }\n      `}</style>'''
new = '''        html:not([data-bixbo-admin-mode="1"]) [data-bixbo-hak-admin-ui] {\n          display: none !important;\n        }\n        html[data-bixbo-admin-mode="1"] [data-bixbo-admin-open] {\n          display: none !important;\n        }\n      `}</style>'''
assert old in s
s = s.replace(old, new, 1)
old = '''          <button\n            type="button"\n            onClick={requestAdminCustomizeCurrentPage}\n            className="rounded-full bg-background/15 px-2.5 py-1 text-[9px] font-bold"\n          >\n            {t("Customize")}\n          </button>'''
new = '''          <div className="flex items-center gap-1">\n            <button type="button" onClick={requestAdminCustomizeCurrentPage} className="rounded-full bg-background/15 px-2 py-1 text-[9px] font-bold">{t("Page")}</button>\n            <button type="button" onClick={() => openAdminTool("text")} className="rounded-full bg-background/15 px-2 py-1 text-[9px] font-bold">Aa</button>\n            <button type="button" onClick={() => openAdminTool("sections")} className="rounded-full bg-background/15 px-2 py-1 text-[9px] font-bold">＋</button>\n            <button type="button" onClick={() => openAdminTool("navigation")} className="rounded-full bg-background/15 px-2 py-1 text-[9px] font-bold">☰</button>\n          </div>'''
assert old in s
s = s.replace(old, new, 1)
# Make the toolbar fit on iPhone without covering half the screen horizontally.
s = s.replace(
    'className="fixed left-1/2 top-[max(.6rem,env(safe-area-inset-top))] z-[10020] flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-3 py-2 text-background shadow-xl ring-1 ring-background/20"',
    'className="fixed left-1/2 top-[max(.55rem,env(safe-area-inset-top))] z-[10020] flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center gap-1.5 rounded-full bg-foreground px-2.5 py-2 text-background shadow-xl ring-1 ring-background/20"',
    1,
)
p.write_text(s)

print('admin/notes/heatmap/HAK regression patch applied')
