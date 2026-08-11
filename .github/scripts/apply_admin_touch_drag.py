from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)

# HAK custom sections: use the same pointer-handle drag pattern already used by LayoutOrderEditor.
p = Path("src/components/HakAdminEditOverlay.tsx")
s = p.read_text()
s = replace_once(
    s,
    'import { useEffect, useMemo, useState } from "react";',
    'import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";',
    "HAK react import",
)
s = replace_once(
    s,
    '  const [portalRevision, setPortalRevision] = useState(0);',
    '  const [portalRevision, setPortalRevision] = useState(0);\n  const [draggedBlock, setDraggedBlock] = useState<string | null>(null);',
    "HAK drag state",
)
s = replace_once(
    s,
    '''  const moveBlock = (blockId: string, delta: -1 | 1) => {\n    const blocks = editableBlocks();\n    const from = blocks.findIndex((block) => block.id === blockId);\n    const to = from + delta;\n    if (from < 0 || to < 0 || to >= blocks.length) return;\n    const [item] = blocks.splice(from, 1);\n    blocks.splice(to, 0, item);\n    writeBlocks(blocks);\n  };''',
    '''  const moveBlock = (blockId: string, delta: -1 | 1) => {\n    const blocks = editableBlocks();\n    const from = blocks.findIndex((block) => block.id === blockId);\n    const to = from + delta;\n    if (from < 0 || to < 0 || to >= blocks.length) return;\n    const [item] = blocks.splice(from, 1);\n    blocks.splice(to, 0, item);\n    writeBlocks(blocks);\n  };\n\n  const dropBlock = (targetId: string) => {\n    if (!draggedBlock || draggedBlock === targetId) return;\n    const blocks = editableBlocks();\n    const from = blocks.findIndex((block) => block.id === draggedBlock);\n    const to = blocks.findIndex((block) => block.id === targetId);\n    if (from < 0 || to < 0) return;\n    const [item] = blocks.splice(from, 1);\n    blocks.splice(to, 0, item);\n    writeBlocks(blocks);\n  };\n\n  const moveDraggedBlockByPointer = (event: ReactPointerEvent<HTMLElement>) => {\n    if (!draggedBlock) return;\n    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-hak-block-sort-id]");\n    const targetId = target?.dataset.hakBlockSortId;\n    if (targetId && targetId !== draggedBlock) dropBlock(targetId);\n  };''',
    "HAK drag helpers",
)
s = replace_once(
    s,
    '<section key={block.id} className="rounded-2xl bg-primary/5 p-3 ring-1 ring-primary/15">',
    '<section key={block.id} data-hak-block-sort-id={block.id} className={`rounded-2xl bg-primary/5 p-3 ring-1 ring-primary/15 ${draggedBlock === block.id ? "opacity-60" : ""}`}>',
    "HAK sortable section",
)
s = replace_once(
    s,
    '''                        <button type="button" disabled={blockIndex === effectiveHakBlocks.length - 1} onClick={() => moveBlock(block.id, 1)} className="rounded-full bg-tint px-2.5 py-1 text-[9px] ring-1 ring-border disabled:opacity-25">↓</button>\n                        <select value={block.placement ?? "bottom"}''',
    '''                        <button type="button" disabled={blockIndex === effectiveHakBlocks.length - 1} onClick={() => moveBlock(block.id, 1)} className="rounded-full bg-tint px-2.5 py-1 text-[9px] ring-1 ring-border disabled:opacity-25">↓</button>\n                        <button\n                          type="button"\n                          onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDraggedBlock(block.id); }}\n                          onPointerMove={moveDraggedBlockByPointer}\n                          onPointerUp={() => setDraggedBlock(null)}\n                          onPointerCancel={() => setDraggedBlock(null)}\n                          style={{ touchAction: "none" }}\n                          className="inline-flex h-7 items-center gap-1 rounded-full bg-tint px-2.5 text-[9px] font-semibold text-muted-foreground ring-1 ring-border cursor-grab active:cursor-grabbing"\n                          aria-label={t("Drag to reorder")}\n                        ><span className="text-sm">⋮⋮</span>{t("Drag")}</button>\n                        <select value={block.placement ?? "bottom"}''',
    "HAK drag button",
)
p.write_text(s)

# Main AdminEditOverlay: restore touch drag alongside arrow fallback for Page, Features and choices/options.
p = Path("src/components/AdminEditOverlay.tsx")
s = p.read_text()
s = replace_once(
    s,
    'import { useEffect, useRef, useState } from "react";',
    'import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";',
    "Admin react import",
)
s = replace_once(
    s,
    '  const [publishing, setPublishing] = useState(false);\n  const undoStack = useRef<string[]>([]);',
    '  const [publishing, setPublishing] = useState(false);\n  const [draggedSection, setDraggedSection] = useState<string | null>(null);\n  const [draggedFeature, setDraggedFeature] = useState<RegistryFeatureId | null>(null);\n  const [draggedOption, setDraggedOption] = useState<{ featureId: RegistryFeatureId; fieldId: string; value: string } | null>(null);\n  const undoStack = useRef<string[]>([]);',
    "Admin drag states",
)
s = replace_once(
    s,
    '''  const moveFeature = (featureId: RegistryFeatureId, delta: number) => {\n    const ids = features.map((feature) => feature.id);\n    const from = ids.indexOf(featureId);\n    const to = from + delta;\n    if (from < 0 || to < 0 || to >= ids.length) return;\n    [ids[from], ids[to]] = [ids[to], ids[from]];\n\n    const config = getDeviceAdminConfig();\n    const featureOverrides = { ...(config.features ?? {}) };\n    ids.forEach((id, index) => {\n      featureOverrides[id] = { ...(featureOverrides[id] ?? {}), order: (index + 1) * 10 };\n    });\n    persist({ ...config, enabled: true, features: featureOverrides });\n  };''',
    '''  const writeFeatureOrder = (ids: RegistryFeatureId[]) => {\n    const config = getDeviceAdminConfig();\n    const featureOverrides = { ...(config.features ?? {}) };\n    ids.forEach((id, index) => {\n      featureOverrides[id] = { ...(featureOverrides[id] ?? {}), order: (index + 1) * 10 };\n    });\n    persist({ ...config, enabled: true, features: featureOverrides });\n  };\n\n  const moveFeature = (featureId: RegistryFeatureId, delta: number) => {\n    const ids = features.map((feature) => feature.id);\n    const from = ids.indexOf(featureId);\n    const to = from + delta;\n    if (from < 0 || to < 0 || to >= ids.length) return;\n    [ids[from], ids[to]] = [ids[to], ids[from]];\n    writeFeatureOrder(ids);\n  };\n\n  const dropFeature = (targetId: RegistryFeatureId) => {\n    if (!draggedFeature || draggedFeature === targetId) return;\n    const ids = features.map((feature) => feature.id);\n    const from = ids.indexOf(draggedFeature);\n    const to = ids.indexOf(targetId);\n    if (from < 0 || to < 0) return;\n    const [item] = ids.splice(from, 1);\n    ids.splice(to, 0, item);\n    writeFeatureOrder(ids);\n  };\n\n  const moveDraggedFeatureByPointer = (event: ReactPointerEvent<HTMLElement>) => {\n    if (!draggedFeature) return;\n    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-admin-feature-sort-id]");\n    const targetId = target?.dataset.adminFeatureSortId as RegistryFeatureId | undefined;\n    if (targetId && targetId !== draggedFeature) dropFeature(targetId);\n  };''',
    "Feature drag helpers",
)
s = replace_once(
    s,
    '''  const moveFieldOption = (featureId: RegistryFeatureId, fieldId: string, baseOptions: string[], value: string, delta: number) => {\n    const values = orderedFieldOptionValues(featureId, fieldId, baseOptions);\n    const from = values.indexOf(value);\n    const to = from + delta;\n    if (from < 0 || to < 0 || to >= values.length) return;\n    [values[from], values[to]] = [values[to], values[from]];\n\n    const config = getDeviceAdminConfig();\n    const feature = config.features?.[featureId] ?? {};\n    const field = feature.fields?.[fieldId] ?? {};\n    const options = { ...(field.options ?? {}) };\n    values.forEach((option, index) => {\n      options[option] = { ...(options[option] ?? {}), order: (index + 1) * 10 };\n    });\n    patchField(featureId, fieldId, { options });\n  };''',
    '''  const writeFieldOptionOrder = (featureId: RegistryFeatureId, fieldId: string, values: string[]) => {\n    const config = getDeviceAdminConfig();\n    const feature = config.features?.[featureId] ?? {};\n    const field = feature.fields?.[fieldId] ?? {};\n    const options = { ...(field.options ?? {}) };\n    values.forEach((option, index) => {\n      options[option] = { ...(options[option] ?? {}), order: (index + 1) * 10 };\n    });\n    patchField(featureId, fieldId, { options });\n  };\n\n  const moveFieldOption = (featureId: RegistryFeatureId, fieldId: string, baseOptions: string[], value: string, delta: number) => {\n    const values = orderedFieldOptionValues(featureId, fieldId, baseOptions);\n    const from = values.indexOf(value);\n    const to = from + delta;\n    if (from < 0 || to < 0 || to >= values.length) return;\n    [values[from], values[to]] = [values[to], values[from]];\n    writeFieldOptionOrder(featureId, fieldId, values);\n  };\n\n  const dropFieldOption = (featureId: RegistryFeatureId, fieldId: string, baseOptions: string[], targetValue: string) => {\n    if (!draggedOption || draggedOption.featureId !== featureId || draggedOption.fieldId !== fieldId || draggedOption.value === targetValue) return;\n    const values = orderedFieldOptionValues(featureId, fieldId, baseOptions);\n    const from = values.indexOf(draggedOption.value);\n    const to = values.indexOf(targetValue);\n    if (from < 0 || to < 0) return;\n    const [item] = values.splice(from, 1);\n    values.splice(to, 0, item);\n    writeFieldOptionOrder(featureId, fieldId, values);\n  };\n\n  const moveDraggedOptionByPointer = (event: ReactPointerEvent<HTMLElement>, featureId: RegistryFeatureId, fieldId: string, baseOptions: string[]) => {\n    if (!draggedOption) return;\n    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-admin-option-sort-value]");\n    const targetValue = target?.dataset.adminOptionSortValue;\n    if (targetValue && target?.dataset.adminOptionFeature === featureId && target?.dataset.adminOptionField === fieldId && targetValue !== draggedOption.value) {\n      dropFieldOption(featureId, fieldId, baseOptions, targetValue);\n    }\n  };''',
    "Option drag helpers",
)
s = replace_once(
    s,
    '''  const moveSection = (sectionId: string, delta: number) => {\n    const ids = sectionDefinitions.map((section) => section.id);\n    const index = ids.indexOf(sectionId);\n    const target = index + delta;\n    if (index < 0 || target < 0 || target >= ids.length) return;\n    [ids[index], ids[target]] = [ids[target], ids[index]];\n    writeOrder(ids);\n  };''',
    '''  const moveSection = (sectionId: string, delta: number) => {\n    const ids = sectionDefinitions.map((section) => section.id);\n    const index = ids.indexOf(sectionId);\n    const target = index + delta;\n    if (index < 0 || target < 0 || target >= ids.length) return;\n    [ids[index], ids[target]] = [ids[target], ids[index]];\n    writeOrder(ids);\n  };\n\n  const dropSection = (targetId: string) => {\n    if (!draggedSection || draggedSection === targetId) return;\n    const ids = sectionDefinitions.map((section) => section.id);\n    const from = ids.indexOf(draggedSection);\n    const to = ids.indexOf(targetId);\n    if (from < 0 || to < 0) return;\n    const [item] = ids.splice(from, 1);\n    ids.splice(to, 0, item);\n    writeOrder(ids);\n  };\n\n  const moveDraggedSectionByPointer = (event: ReactPointerEvent<HTMLElement>) => {\n    if (!draggedSection) return;\n    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-admin-section-sort-id]");\n    const targetId = target?.dataset.adminSectionSortId;\n    if (targetId && targetId !== draggedSection) dropSection(targetId);\n  };''',
    "Section drag helpers",
)
s = replace_once(
    s,
    '<section key={section.id} className="rounded-2xl bg-surface p-3 ring-1 ring-border/80">',
    '<section key={section.id} data-admin-section-sort-id={section.id} className={`rounded-2xl bg-surface p-3 ring-1 ring-border/80 ${draggedSection === section.id ? "opacity-60" : ""}`}>',
    "Section sortable attr",
)
s = replace_once(
    s,
    '''                          <button type="button" disabled={index === sectionDefinitions.length - 1} onClick={() => moveSection(section.id, 1)} className="rounded-full bg-tint px-3 py-1.5 text-[10px] font-semibold ring-1 ring-border disabled:opacity-30">↓</button>\n                          <span className="min-w-0 flex-1 truncate text-[9px] text-muted-foreground">ID: {section.id}</span>''',
    '''                          <button type="button" disabled={index === sectionDefinitions.length - 1} onClick={() => moveSection(section.id, 1)} className="rounded-full bg-tint px-3 py-1.5 text-[10px] font-semibold ring-1 ring-border disabled:opacity-30">↓</button>\n                          <button type="button" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDraggedSection(section.id); }} onPointerMove={moveDraggedSectionByPointer} onPointerUp={() => setDraggedSection(null)} onPointerCancel={() => setDraggedSection(null)} style={{ touchAction: "none" }} className="inline-flex h-7 items-center gap-1 rounded-full bg-tint px-2.5 text-[9px] font-semibold text-muted-foreground ring-1 ring-border cursor-grab active:cursor-grabbing" aria-label={t("Drag to reorder")}><span className="text-sm">⋮⋮</span>{t("Drag")}</button>\n                          <span className="min-w-0 flex-1 truncate text-[9px] text-muted-foreground">ID: {section.id}</span>''',
    "Section drag button",
)
s = replace_once(
    s,
    '<section key={feature.id} className="rounded-2xl bg-surface p-3 ring-1 ring-border/80">',
    '<section key={feature.id} data-admin-feature-sort-id={feature.id} className={`rounded-2xl bg-surface p-3 ring-1 ring-border/80 ${draggedFeature === feature.id ? "opacity-60" : ""}`}>',
    "Feature sortable attr",
)
s = replace_once(
    s,
    '''                          <button type="button" disabled={featureIndex === features.length - 1} onClick={() => moveFeature(feature.id, 1)} className="rounded-full bg-tint px-2.5 py-1 text-[9px] font-semibold ring-1 ring-border disabled:opacity-25" aria-label={`${t("Move down")} ${feature.label}`}>↓</button>\n                          {SURFACES.map((surface) => {''',
    '''                          <button type="button" disabled={featureIndex === features.length - 1} onClick={() => moveFeature(feature.id, 1)} className="rounded-full bg-tint px-2.5 py-1 text-[9px] font-semibold ring-1 ring-border disabled:opacity-25" aria-label={`${t("Move down")} ${feature.label}`}>↓</button>\n                          <button type="button" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDraggedFeature(feature.id); }} onPointerMove={moveDraggedFeatureByPointer} onPointerUp={() => setDraggedFeature(null)} onPointerCancel={() => setDraggedFeature(null)} style={{ touchAction: "none" }} className="inline-flex h-7 items-center gap-1 rounded-full bg-tint px-2.5 text-[9px] font-semibold text-muted-foreground ring-1 ring-border cursor-grab active:cursor-grabbing" aria-label={t("Drag to reorder")}><span className="text-sm">⋮⋮</span>{t("Drag")}</button>\n                          {SURFACES.map((surface) => {''',
    "Feature drag button",
)
s = replace_once(
    s,
    '<div key={option} className="flex items-center gap-1.5">',
    '<div key={option} data-admin-option-sort-value={option} data-admin-option-feature={featureId} data-admin-option-field={baseField.id} className={`flex items-center gap-1.5 ${draggedOption?.featureId === featureId && draggedOption.fieldId === baseField.id && draggedOption.value === option ? "opacity-60" : ""}`}>',
    "Option sortable attr",
)
s = replace_once(
    s,
    '''                                          <button type="button" disabled={optionIndex === optionValues.length - 1} onClick={() => moveFieldOption(featureId, baseField.id, baseField.options ?? [], option, 1)} className="rounded-full bg-background px-2 py-1 text-[8px] ring-1 ring-border disabled:opacity-25" aria-label={`${t("Move down")} ${label}`}>↓</button>\n                                          <input value={label}''',
    '''                                          <button type="button" disabled={optionIndex === optionValues.length - 1} onClick={() => moveFieldOption(featureId, baseField.id, baseField.options ?? [], option, 1)} className="rounded-full bg-background px-2 py-1 text-[8px] ring-1 ring-border disabled:opacity-25" aria-label={`${t("Move down")} ${label}`}>↓</button>\n                                          <button type="button" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDraggedOption({ featureId, fieldId: baseField.id, value: option }); }} onPointerMove={(event) => moveDraggedOptionByPointer(event, featureId, baseField.id, baseField.options ?? [])} onPointerUp={() => setDraggedOption(null)} onPointerCancel={() => setDraggedOption(null)} style={{ touchAction: "none" }} className="inline-flex h-7 items-center rounded-full bg-background px-2 text-[8px] text-muted-foreground ring-1 ring-border cursor-grab active:cursor-grabbing" aria-label={t("Drag to reorder")}>⋮⋮</button>\n                                          <input value={label}''',
    "Option drag button",
)
p.write_text(s)

print("Applied touch/pointer drag handles to HAK custom sections and Admin page/features/options.")
