from pathlib import Path


def replace(path: str, old: str, new: str, count: int = 1):
    p = Path(path)
    s = p.read_text()
    actual = s.count(old)
    if actual < count:
        raise SystemExit(f"{path}: expected at least {count} occurrences, found {actual}: {old[:100]!r}")
    s = s.replace(old, new, count)
    p.write_text(s)

# 1. The toolbar request is an event, never a DOM-click heuristic.
Path("src/lib/adminCustomizeEvents.ts").write_text('''export const ADMIN_CUSTOMIZE_REQUESTED = "bixbo:admin-customize-requested";\n\nexport function requestAdminCustomizeCurrentPage() {\n  if (typeof window === "undefined") return;\n  window.dispatchEvent(new CustomEvent(ADMIN_CUSTOMIZE_REQUESTED));\n}\n''')

# 2. Main editor: direct event listener + correct active Patterns sub-page.
p = "src/components/AdminEditOverlay.tsx"
replace(p,
'import { publishGlobalAdminConfig } from "@/lib/globalAdminConfig";\n',
'import { publishGlobalAdminConfig } from "@/lib/globalAdminConfig";\nimport { ADMIN_CUSTOMIZE_REQUESTED } from "@/lib/adminCustomizeEvents";\n')
replace(p,
'''function pageFromPath(pathname: string): LayoutPageId | null {\n  if (pathname === "/") return "home";\n  if (pathname.startsWith("/insights")) return "insights";\n  if (pathname.startsWith("/patterns")) return "patterns.monthly";\n  return null;\n}\n''',
'''function activePatternsPage(): LayoutPageId {\n  if (typeof document === "undefined") return "patterns.monthly";\n  const selected = document.querySelector<HTMLElement>('[data-bixbo-pattern-tab][aria-selected="true"]');\n  const tab = selected?.dataset.bixboPatternTab;\n  if (tab === "cycle" || tab === "monthly" || tab === "treatment" || tab === "triggers") {\n    return `patterns.${tab}` as LayoutPageId;\n  }\n  return "patterns.monthly";\n}\n\nfunction pageFromPath(pathname: string): LayoutPageId | null {\n  if (pathname === "/") return "home";\n  if (pathname.startsWith("/insights")) return "insights";\n  if (pathname.startsWith("/patterns")) return activePatternsPage();\n  return null;\n}\n''')
anchor = '''  useEffect(() => {\n    const syncAdminMode = () => setAdminMode(isGlobalAdminModeActive());\n    window.addEventListener(ADMIN_MODE_CHANGED, syncAdminMode);\n    return () => window.removeEventListener(ADMIN_MODE_CHANGED, syncAdminMode);\n  }, []);\n'''
insert = anchor + '''\n  useEffect(() => {\n    const openCurrentPageEditor = () => {\n      if (!adminMode || !page) return;\n      if (pathname === "/" && document.querySelector("[data-bixbo-hak-root]")) return;\n      setTab("page");\n      setOpen(true);\n    };\n    window.addEventListener(ADMIN_CUSTOMIZE_REQUESTED, openCurrentPageEditor);\n    return () => window.removeEventListener(ADMIN_CUSTOMIZE_REQUESTED, openCurrentPageEditor);\n  }, [adminMode, page, pathname]);\n\n  useEffect(() => {\n    if (!pathname.startsWith("/patterns")) return;\n    const refreshPatternsPage = () => setRevision((value) => value + 1);\n    const observer = new MutationObserver(refreshPatternsPage);\n    observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ["aria-selected"] });\n    return () => observer.disconnect();\n  }, [pathname]);\n'''
replace(p, anchor, insert)

# 3. Patterns exposes a stable selected-tab marker.
p = "src/routes/patterns.tsx"
replace(p,
'''            role="tab"\n            aria-selected={selected}\n            onClick={() => onChange(tab.id)}\n''',
'''            role="tab"\n            aria-selected={selected}\n            data-bixbo-pattern-tab={tab.id}\n            onClick={() => onChange(tab.id)}\n''')

# 4. Couple: direct Customize listener + real touch drag.
p = "src/components/CoupleAdminEditOverlay.tsx"
replace(p,
'import { useEffect, useMemo, useRef, useState } from "react";\n',
'import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";\n')
replace(p,
'import { ADMIN_MODE_CHANGED, isGlobalAdminModeActive } from "@/components/GlobalAdminModeController";\n',
'import { ADMIN_MODE_CHANGED, isGlobalAdminModeActive } from "@/components/GlobalAdminModeController";\nimport { ADMIN_CUSTOMIZE_REQUESTED } from "@/lib/adminCustomizeEvents";\n')
replace(p,
'  const [open, setOpen] = useState(false);\n  const undoStack = useRef<string[]>([]);\n',
'  const [open, setOpen] = useState(false);\n  const [draggedSection, setDraggedSection] = useState<string | null>(null);\n  const undoStack = useRef<string[]>([]);\n')
anchor = '''  useEffect(() => {\n    const syncAdminMode = () => setAdminMode(isGlobalAdminModeActive());\n    window.addEventListener(ADMIN_MODE_CHANGED, syncAdminMode);\n    return () => window.removeEventListener(ADMIN_MODE_CHANGED, syncAdminMode);\n  }, []);\n'''
insert = anchor + '''\n  useEffect(() => {\n    const openCurrentPageEditor = () => {\n      if (adminMode && pathname.startsWith("/couple")) setOpen(true);\n    };\n    window.addEventListener(ADMIN_CUSTOMIZE_REQUESTED, openCurrentPageEditor);\n    return () => window.removeEventListener(ADMIN_CUSTOMIZE_REQUESTED, openCurrentPageEditor);\n  }, [adminMode, pathname]);\n'''
replace(p, anchor, insert)
anchor2 = '''  const moveSection = (sectionId: string, delta: number) => {\n    const ids = sections.map((section) => section.id);\n    const index = ids.indexOf(sectionId);\n    const target = index + delta;\n    if (index < 0 || target < 0 || target >= ids.length) return;\n    [ids[index], ids[target]] = [ids[target], ids[index]];\n    writeOrder(ids);\n  };\n'''
insert2 = anchor2 + '''\n  const dropSection = (targetId: string) => {\n    if (!draggedSection || draggedSection === targetId) return;\n    const ids = sections.map((section) => section.id);\n    const from = ids.indexOf(draggedSection);\n    const to = ids.indexOf(targetId);\n    if (from < 0 || to < 0) return;\n    const [item] = ids.splice(from, 1);\n    ids.splice(to, 0, item);\n    writeOrder(ids);\n  };\n\n  const moveDraggedSectionByPointer = (event: ReactPointerEvent<HTMLElement>) => {\n    if (!draggedSection) return;\n    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-admin-couple-section-sort-id]");\n    const targetId = target?.dataset.adminCoupleSectionSortId;\n    if (targetId && targetId !== draggedSection) dropSection(targetId);\n  };\n'''
replace(p, anchor2, insert2)
replace(p,
'<section key={section.id} className="rounded-2xl bg-surface p-3 ring-1 ring-border/80">',
'<section key={section.id} data-admin-couple-section-sort-id={section.id} className={`rounded-2xl bg-surface p-3 ring-1 ring-border/80 ${draggedSection === section.id ? "opacity-60" : ""}`}>')
replace(p,
'''                      <button type="button" disabled={index === sections.length - 1} onClick={() => moveSection(section.id, 1)} className="rounded-full bg-tint px-3 py-1.5 text-[10px] font-semibold ring-1 ring-border disabled:opacity-30">↓</button>\n                      <span className="min-w-0 flex-1 truncate text-[9px] text-muted-foreground">ID: {section.id}</span>\n''',
'''                      <button type="button" disabled={index === sections.length - 1} onClick={() => moveSection(section.id, 1)} className="rounded-full bg-tint px-3 py-1.5 text-[10px] font-semibold ring-1 ring-border disabled:opacity-30">↓</button>\n                      <button type="button" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDraggedSection(section.id); }} onPointerMove={moveDraggedSectionByPointer} onPointerUp={() => setDraggedSection(null)} onPointerCancel={() => setDraggedSection(null)} style={{ touchAction: "none" }} className="inline-flex h-7 items-center gap-1 rounded-full bg-tint px-2.5 text-[9px] font-semibold text-muted-foreground ring-1 ring-border cursor-grab active:cursor-grabbing" aria-label={t("Drag to reorder")}><span className="text-sm">⋮⋮</span>{t("Drag")}</button>\n                      <span className="min-w-0 flex-1 truncate text-[9px] text-muted-foreground">ID: {section.id}</span>\n''')

# 5. HAK direct Customize event. Reset is shown only for a local override.
p = "src/components/HakAdminEditOverlay.tsx"
replace(p,
'import { ADMIN_MODE_CHANGED, isGlobalAdminModeActive } from "@/components/GlobalAdminModeController";\n',
'import { ADMIN_MODE_CHANGED, isGlobalAdminModeActive } from "@/components/GlobalAdminModeController";\nimport { ADMIN_CUSTOMIZE_REQUESTED } from "@/lib/adminCustomizeEvents";\n')
anchor = '''  useEffect(() => {\n    const syncAdminMode = () => setAdminMode(isGlobalAdminModeActive());\n    window.addEventListener(ADMIN_MODE_CHANGED, syncAdminMode);\n    return () => window.removeEventListener(ADMIN_MODE_CHANGED, syncAdminMode);\n  }, []);\n'''
insert = anchor + '''\n  useEffect(() => {\n    const openHakEditor = () => {\n      if (adminMode && hakOpen) setEditorOpen(true);\n    };\n    window.addEventListener(ADMIN_CUSTOMIZE_REQUESTED, openHakEditor);\n    return () => window.removeEventListener(ADMIN_CUSTOMIZE_REQUESTED, openHakEditor);\n  }, [adminMode, hakOpen]);\n'''
replace(p, anchor, insert)
replace(p,
'''                const hidden = override.hidden === true;\n                return (\n''',
'''                const hidden = override.hidden === true;\n                const hasLocalOverride = Boolean(getDeviceAdminConfig().hak?.items?.[definition.id]);\n                return (\n''')
replace(p,
'''                      <button type="button" onClick={() => reset(definition.id)} className="text-[9px] font-semibold text-primary">{t("Reset")}</button>\n''',
'''                      {hasLocalOverride ? <button type="button" onClick={() => reset(definition.id)} className="text-[9px] font-semibold text-primary">{t("Reset")}</button> : null}\n''')

# 6. Universal page editor: effective runtime config, event listener, touch drag, truthful Reset.
p = "src/components/UniversalAdminPageEditor.tsx"
replace(p,
'import { useEffect, useMemo, useRef, useState } from "react";\n',
'import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";\n') if Path(p).read_text().startswith('import { useEffect, useMemo, useRef, useState }') else None
# Current file has no useRef in some revisions; normalize either form.
s = Path(p).read_text()
if 'import { useEffect, useMemo, useRef, useState } from "react";' not in s:
    replace(p, 'import { useEffect, useMemo, useState } from "react";\n', 'import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";\n')
else:
    replace(p, 'import { useEffect, useMemo, useRef, useState } from "react";\n', 'import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";\n')
replace(p,
'import { ADMIN_MODE_CHANGED, isGlobalAdminModeActive } from "@/components/GlobalAdminModeController";\n',
'import { ADMIN_MODE_CHANGED, isGlobalAdminModeActive } from "@/components/GlobalAdminModeController";\nimport { ADMIN_CUSTOMIZE_REQUESTED } from "@/lib/adminCustomizeEvents";\nimport { getEffectiveAdminConfig } from "@/lib/effectiveAdminConfig";\n')
replace(p,
'''function pageConfig(pathname: string): UniversalPageConfig {\n  return readExtendedConfig().universalPages?.[pathname] ?? {};\n}\n''',
'''function pageConfig(pathname: string): UniversalPageConfig {\n  return (getEffectiveAdminConfig() as ExtendedAdminConfig).universalPages?.[pathname] ?? {};\n}\n\nfunction localPageConfig(pathname: string): UniversalPageConfig {\n  return readExtendedConfig().universalPages?.[pathname] ?? {};\n}\n''')
replace(p,
'  const [revision, setRevision] = useState(0);\n',
'  const [revision, setRevision] = useState(0);\n  const [draggedBlock, setDraggedBlock] = useState<string | null>(null);\n')
anchor = '''  useEffect(() => {\n    const sync = () => {\n      setAdminMode(isGlobalAdminModeActive());\n      setRevision((value) => value + 1);\n    };\n    window.addEventListener(ADMIN_MODE_CHANGED, sync);\n    window.addEventListener(DEVICE_ADMIN_CONFIG_CHANGED, sync);\n    return () => {\n      window.removeEventListener(ADMIN_MODE_CHANGED, sync);\n      window.removeEventListener(DEVICE_ADMIN_CONFIG_CHANGED, sync);\n    };\n  }, []);\n'''
insert = anchor + '''\n  useEffect(() => {\n    const openCurrentPageEditor = () => {\n      if (adminMode && supported) setOpen(true);\n    };\n    window.addEventListener(ADMIN_CUSTOMIZE_REQUESTED, openCurrentPageEditor);\n    return () => window.removeEventListener(ADMIN_CUSTOMIZE_REQUESTED, openCurrentPageEditor);\n  }, [adminMode, supported]);\n'''
replace(p, anchor, insert)
anchor2 = '''  const move = (key: string, delta: number) => {\n    const ordered = [...blocks];\n    const index = ordered.findIndex((block) => block.key === key);\n    const target = index + delta;\n    if (index < 0 || target < 0 || target >= ordered.length) return;\n    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];\n    const current = pageConfig(pathname);\n    const nextBlocks = { ...(current.blocks ?? {}) };\n    ordered.forEach((block, orderIndex) => {\n      nextBlocks[block.key] = { ...(nextBlocks[block.key] ?? {}), order: orderIndex };\n    });\n    persist({ ...current, blocks: nextBlocks });\n  };\n'''
insert2 = '''  const writeOrder = (ordered: BlockSnapshot[]) => {\n    const current = localPageConfig(pathname);\n    const nextBlocks = { ...(current.blocks ?? {}) };\n    ordered.forEach((block, orderIndex) => {\n      nextBlocks[block.key] = { ...(nextBlocks[block.key] ?? {}), order: orderIndex };\n    });\n    persist({ ...current, blocks: nextBlocks });\n  };\n\n''' + anchor2.replace('    const current = pageConfig(pathname);\n    const nextBlocks = { ...(current.blocks ?? {}) };\n    ordered.forEach((block, orderIndex) => {\n      nextBlocks[block.key] = { ...(nextBlocks[block.key] ?? {}), order: orderIndex };\n    });\n    persist({ ...current, blocks: nextBlocks });\n', '    writeOrder(ordered);\n') + '''\n  const dropBlock = (targetKey: string) => {\n    if (!draggedBlock || draggedBlock === targetKey) return;\n    const ordered = [...blocks];\n    const from = ordered.findIndex((block) => block.key === draggedBlock);\n    const to = ordered.findIndex((block) => block.key === targetKey);\n    if (from < 0 || to < 0) return;\n    const [item] = ordered.splice(from, 1);\n    ordered.splice(to, 0, item);\n    writeOrder(ordered);\n  };\n\n  const moveDraggedBlockByPointer = (event: ReactPointerEvent<HTMLElement>) => {\n    if (!draggedBlock) return;\n    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-universal-page-sort-key]");\n    const targetKey = target?.dataset.universalPageSortKey;\n    if (targetKey && targetKey !== draggedBlock) dropBlock(targetKey);\n  };\n'''
replace(p, anchor2, insert2)
replace(p,
'                <section key={block.key} className="rounded-2xl bg-surface p-3 ring-1 ring-border/80">',
'                <section key={block.key} data-universal-page-sort-key={block.key} className={`rounded-2xl bg-surface p-3 ring-1 ring-border/80 ${draggedBlock === block.key ? "opacity-60" : ""}`}>')
replace(p,
'''                    <button type="button" disabled={index === blocks.length - 1} onClick={() => move(block.key, 1)} className="rounded-full bg-tint px-3 py-1.5 text-[10px] font-semibold ring-1 ring-border disabled:opacity-30">↓</button>\n                    <span className="min-w-0 flex-1 truncate text-[8px] text-muted-foreground">{block.key}</span>\n                    <button type="button" onClick={() => resetBlock(block.key)} className="rounded-full bg-tint px-3 py-1.5 text-[9px] font-semibold text-muted-foreground ring-1 ring-border">{t("Reset")}</button>\n''',
'''                    <button type="button" disabled={index === blocks.length - 1} onClick={() => move(block.key, 1)} className="rounded-full bg-tint px-3 py-1.5 text-[10px] font-semibold ring-1 ring-border disabled:opacity-30">↓</button>\n                    <button type="button" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDraggedBlock(block.key); }} onPointerMove={moveDraggedBlockByPointer} onPointerUp={() => setDraggedBlock(null)} onPointerCancel={() => setDraggedBlock(null)} style={{ touchAction: "none" }} className="inline-flex h-7 items-center gap-1 rounded-full bg-tint px-2.5 text-[9px] font-semibold text-muted-foreground ring-1 ring-border cursor-grab active:cursor-grabbing" aria-label={t("Drag to reorder")}><span className="text-sm">⋮⋮</span>{t("Drag")}</button>\n                    <span className="min-w-0 flex-1 truncate text-[8px] text-muted-foreground">{block.key}</span>\n                    {Boolean(localPageConfig(pathname).blocks?.[block.key]) ? <button type="button" onClick={() => resetBlock(block.key)} className="rounded-full bg-tint px-3 py-1.5 text-[9px] font-semibold text-muted-foreground ring-1 ring-border">{t("Reset")}</button> : null}\n''')
replace(p,
'''              <button type="button" onClick={resetPage} className="w-full rounded-2xl bg-tint px-4 py-2.5 text-xs font-semibold text-muted-foreground ring-1 ring-border">\n                {t("Reset this page")}\n              </button>\n''',
'''              {Boolean(readExtendedConfig().universalPages?.[pathname]) ? <button type="button" onClick={resetPage} className="w-full rounded-2xl bg-tint px-4 py-2.5 text-xs font-semibold text-muted-foreground ring-1 ring-border">\n                {t("Reset this page")}\n              </button> : null}\n''')

# 7. Navigation: pointer drag + only truthful local Reset.
p = "src/components/NavigationAdminEditor.tsx"
replace(p,
'import { useEffect, useMemo, useState } from "react";\n',
'import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";\n')
replace(p,
'  const [revision, setRevision] = useState(0);\n',
'  const [revision, setRevision] = useState(0);\n  const [draggedItem, setDraggedItem] = useState<NavigationItemId | null>(null);\n')
anchor = '''  const move = (id: NavigationItemId, delta: number) => {\n    const ordered = [...items];\n    const index = ordered.findIndex((item) => item.id === id);\n    const target = index + delta;\n    if (index < 0 || target < 0 || target >= ordered.length) return;\n    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];\n    const config = getDeviceAdminConfig() as NavAdminConfig;\n    const nextItems = { ...(config.navigation?.items ?? {}) };\n    ordered.forEach((item, orderIndex) => {\n      nextItems[item.id] = { ...(nextItems[item.id] ?? {}), order: (orderIndex + 1) * 10 };\n    });\n    setDeviceAdminConfig({\n      ...config,\n      enabled: true,\n      navigation: { ...(config.navigation ?? {}), items: nextItems },\n    } as AdminConfig);\n    setRevision((value) => value + 1);\n  };\n'''
insert = anchor + '''\n  const dropItem = (targetId: NavigationItemId) => {\n    if (!draggedItem || draggedItem === targetId) return;\n    const ordered = [...items];\n    const from = ordered.findIndex((item) => item.id === draggedItem);\n    const to = ordered.findIndex((item) => item.id === targetId);\n    if (from < 0 || to < 0) return;\n    const [item] = ordered.splice(from, 1);\n    ordered.splice(to, 0, item);\n    const config = getDeviceAdminConfig() as NavAdminConfig;\n    const nextItems = { ...(config.navigation?.items ?? {}) };\n    ordered.forEach((navItem, orderIndex) => {\n      nextItems[navItem.id] = { ...(nextItems[navItem.id] ?? {}), order: (orderIndex + 1) * 10 };\n    });\n    setDeviceAdminConfig({ ...config, enabled: true, navigation: { ...(config.navigation ?? {}), items: nextItems } } as AdminConfig);\n    setRevision((value) => value + 1);\n  };\n\n  const moveDraggedItemByPointer = (event: ReactPointerEvent<HTMLElement>) => {\n    if (!draggedItem) return;\n    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-admin-nav-sort-id]");\n    const targetId = target?.dataset.adminNavSortId as NavigationItemId | undefined;\n    if (targetId && targetId !== draggedItem) dropItem(targetId);\n  };\n'''
replace(p, anchor, insert)
replace(p,
'<section key={item.id} className="rounded-2xl bg-surface p-3 ring-1 ring-border/80">',
'<section key={item.id} data-admin-nav-sort-id={item.id} className={`rounded-2xl bg-surface p-3 ring-1 ring-border/80 ${draggedItem === item.id ? "opacity-60" : ""}`}>')
replace(p,
'''                      <button type="button" disabled={index === items.length - 1} onClick={() => move(item.id, 1)} className="rounded-full bg-tint px-3 py-1.5 text-[10px] font-semibold ring-1 ring-border disabled:opacity-30">↓</button>\n                      <span className="min-w-0 flex-1 truncate text-[8px] text-muted-foreground">ID: {item.id}</span>\n                      {override ? <button type="button" onClick={() => resetItem(item.id)} className="rounded-full bg-tint px-3 py-1.5 text-[9px] font-semibold ring-1 ring-border">{t("Reset")}</button> : null}\n''',
'''                      <button type="button" disabled={index === items.length - 1} onClick={() => move(item.id, 1)} className="rounded-full bg-tint px-3 py-1.5 text-[10px] font-semibold ring-1 ring-border disabled:opacity-30">↓</button>\n                      <button type="button" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDraggedItem(item.id); }} onPointerMove={moveDraggedItemByPointer} onPointerUp={() => setDraggedItem(null)} onPointerCancel={() => setDraggedItem(null)} style={{ touchAction: "none" }} className="inline-flex h-7 items-center gap-1 rounded-full bg-tint px-2.5 text-[9px] font-semibold text-muted-foreground ring-1 ring-border cursor-grab active:cursor-grabbing" aria-label={t("Drag to reorder")}><span className="text-sm">⋮⋮</span>{t("Drag")}</button>\n                      <span className="min-w-0 flex-1 truncate text-[8px] text-muted-foreground">ID: {item.id}</span>\n                      {Boolean((getDeviceAdminConfig() as NavAdminConfig).navigation?.items?.[item.id]) ? <button type="button" onClick={() => resetItem(item.id)} className="rounded-full bg-tint px-3 py-1.5 text-[9px] font-semibold ring-1 ring-border">{t("Reset")}</button> : null}\n''')

# 8. Text reset must only advertise a local reset.
p = "src/components/UniversalTextAdminEditor.tsx"
replace(p,
'                const hasOverride = Boolean(getEffectiveAdminConfig().textOverrides?.[item.key]);\n',
'                const hasOverride = Boolean(getDeviceAdminConfig().textOverrides?.[item.key]);\n')

# 9. Custom page blocks get pointer drag.
p = "src/components/AdminCustomPageBlocks.tsx"
replace(p,
'import { useEffect, useMemo, useState } from "react";\n',
'import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";\n')
replace(p,
'  const [revision, setRevision] = useState(0);\n',
'  const [revision, setRevision] = useState(0);\n  const [draggedBlock, setDraggedBlock] = useState<string | null>(null);\n')
anchor = '''  const moveBlock = (id: string, delta: -1 | 1) => {\n    const blocks = editableBlocks();\n    const from = blocks.findIndex((block) => block.id === id);\n    const to = from + delta;\n    if (from < 0 || to < 0 || to >= blocks.length) return;\n    const [item] = blocks.splice(from, 1);\n    blocks.splice(to, 0, item);\n    persist(blocks);\n  };\n'''
insert = anchor + '''\n  const dropBlock = (targetId: string) => {\n    if (!draggedBlock || draggedBlock === targetId) return;\n    const blocks = editableBlocks();\n    const from = blocks.findIndex((block) => block.id === draggedBlock);\n    const to = blocks.findIndex((block) => block.id === targetId);\n    if (from < 0 || to < 0) return;\n    const [item] = blocks.splice(from, 1);\n    blocks.splice(to, 0, item);\n    persist(blocks);\n  };\n\n  const moveDraggedBlockByPointer = (event: ReactPointerEvent<HTMLElement>) => {\n    if (!draggedBlock) return;\n    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-admin-page-block-sort-id]");\n    const targetId = target?.dataset.adminPageBlockSortId;\n    if (targetId && targetId !== draggedBlock) dropBlock(targetId);\n  };\n'''
replace(p, anchor, insert)
replace(p,
'<section key={block.id} className="rounded-2xl bg-surface p-3 ring-1 ring-border/80">',
'<section key={block.id} data-admin-page-block-sort-id={block.id} className={`rounded-2xl bg-surface p-3 ring-1 ring-border/80 ${draggedBlock === block.id ? "opacity-60" : ""}`}>')
replace(p,
'''                        <button type="button" disabled={index === effectiveBlocks.length - 1} onClick={() => moveBlock(block.id, 1)} className="rounded-full bg-tint px-3 py-1.5 text-[10px] font-semibold ring-1 ring-border disabled:opacity-30">↓</button>\n                        <button type="button" onClick={() => patchBlock(block.id, { hidden: block.hidden !== true })} className={`rounded-full px-3 py-1.5 text-[9px] font-bold ${block.hidden ? "bg-tint text-muted-foreground ring-1 ring-border" : "bg-primary text-primary-foreground"}`}>{block.hidden ? t("Hidden") : t("Shown")}</button>\n''',
'''                        <button type="button" disabled={index === effectiveBlocks.length - 1} onClick={() => moveBlock(block.id, 1)} className="rounded-full bg-tint px-3 py-1.5 text-[10px] font-semibold ring-1 ring-border disabled:opacity-30">↓</button>\n                        <button type="button" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDraggedBlock(block.id); }} onPointerMove={moveDraggedBlockByPointer} onPointerUp={() => setDraggedBlock(null)} onPointerCancel={() => setDraggedBlock(null)} style={{ touchAction: "none" }} className="inline-flex h-7 items-center gap-1 rounded-full bg-tint px-2.5 text-[9px] font-semibold text-muted-foreground ring-1 ring-border cursor-grab active:cursor-grabbing" aria-label={t("Drag to reorder")}><span className="text-sm">⋮⋮</span>{t("Drag")}</button>\n                        <button type="button" onClick={() => patchBlock(block.id, { hidden: block.hidden !== true })} className={`rounded-full px-3 py-1.5 text-[9px] font-bold ${block.hidden ? "bg-tint text-muted-foreground ring-1 ring-border" : "bg-primary text-primary-foreground"}`}>{block.hidden ? t("Hidden") : t("Shown")}</button>\n''')

# 10. Regression contract test: event listeners, effective universal config and pointer drag must stay wired.
Path("src/lib/__tests__/admin-button-wiring.test.ts").write_text('''import { describe, expect, it } from "bun:test";\nimport { readFileSync } from "node:fs";\n\nconst src = (path: string) => readFileSync(path, "utf8");\n\ndescribe("admin button wiring regression guards", () => {\n  it("routes Customize through explicit listeners instead of DOM button clicking", () => {\n    const events = src("src/lib/adminCustomizeEvents.ts");\n    expect(events).toContain("ADMIN_CUSTOMIZE_REQUESTED");\n    expect(events).not.toContain("querySelectorAll");\n    expect(events).not.toContain("button?.click");\n    for (const path of [\n      "src/components/AdminEditOverlay.tsx",\n      "src/components/CoupleAdminEditOverlay.tsx",\n      "src/components/HakAdminEditOverlay.tsx",\n      "src/components/UniversalAdminPageEditor.tsx",\n    ]) expect(src(path)).toContain("ADMIN_CUSTOMIZE_REQUESTED");\n  });\n\n  it("keeps Patterns page editing tied to the active sub-tab", () => {\n    expect(src("src/routes/patterns.tsx")).toContain("data-bixbo-pattern-tab");\n    expect(src("src/components/AdminEditOverlay.tsx")).toContain("patterns.${tab}");\n  });\n\n  it("keeps touch drag wired on every reorder editor", () => {\n    for (const path of [\n      "src/components/AdminEditOverlay.tsx",\n      "src/components/CoupleAdminEditOverlay.tsx",\n      "src/components/HakAdminEditOverlay.tsx",\n      "src/components/UniversalAdminPageEditor.tsx",\n      "src/components/NavigationAdminEditor.tsx",\n      "src/components/AdminCustomPageBlocks.tsx",\n      "src/components/LayoutOrderEditor.tsx",\n    ]) {\n      const text = src(path);\n      expect(text).toContain("onPointerDown");\n      expect(text).toContain('touchAction: "none"');\n    }\n  });\n\n  it("applies published Universal page overrides at runtime", () => {\n    const text = src("src/components/UniversalAdminPageEditor.tsx");\n    expect(text).toContain("getEffectiveAdminConfig");\n    expect(text).toContain("localPageConfig");\n  });\n});\n''')

print("admin button audit patch applied")
