from pathlib import Path

# Extend HAK config with custom content blocks.
p = Path('src/lib/appRegistry.ts')
text = p.read_text()
old = '  hak?: { items?: Record<string, { label?: string; hidden?: boolean; order?: number }> };\n'
new = '  hak?: {\n    items?: Record<string, { label?: string; hidden?: boolean; order?: number }>;\n    blocks?: Array<AdminPageBlock & { placement?: "top" | "bottom" }>;\n  };\n'
if old not in text: raise SystemExit('HAK type marker not found')
p.write_text(text.replace(old, new, 1))

# Merge HAK block arrays local-over-global while still merging item IDs.
p = Path('src/lib/effectiveAdminConfig.ts')
text = p.read_text()
old = '''  return {
    ...(globalConfig.hak ?? {}),
    ...(localConfig.hak ?? {}),
    items: {
      ...(globalConfig.hak?.items ?? {}),
      ...(localConfig.hak?.items ?? {}),
    },
  };
'''
new = '''  return {
    ...(globalConfig.hak ?? {}),
    ...(localConfig.hak ?? {}),
    items: {
      ...(globalConfig.hak?.items ?? {}),
      ...(localConfig.hak?.items ?? {}),
    },
    blocks: localConfig.hak?.blocks ?? globalConfig.hak?.blocks,
  };
'''
if old not in text: raise SystemExit('mergeHak block not found')
p.write_text(text.replace(old, new, 1))

# Add a stable top anchor to the HAK content; the content element itself is the bottom anchor.
p = Path('src/routes/index.tsx')
text = p.read_text()
old = '''        <div
          ref={fitRef}
          className="mx-auto w-full"
          style={{
            transform: `scale(${fitScale})`,
            transformOrigin: "top center",
          }}
        >
'''
new = '''        <div
          ref={fitRef}
          data-bixbo-hak-content="1"
          className="mx-auto w-full"
          style={{
            transform: `scale(${fitScale})`,
            transformOrigin: "top center",
          }}
        >
          <div data-bixbo-hak-custom-top="1" />
'''
if old not in text: raise SystemExit('HAK fitRef marker not found')
p.write_text(text.replace(old, new, 1))

# Add block editor + runtime portals.
p = Path('src/components/HakAdminEditOverlay.tsx')
text = p.read_text()
text = text.replace('import { useEffect, useMemo, useState } from "react";\n', 'import { useEffect, useMemo, useState } from "react";\nimport { createPortal } from "react-dom";\n', 1)
text = text.replace('import { getRegistryFeature } from "@/lib/appRegistry";\n', 'import { getRegistryFeature, type AdminPageBlock } from "@/lib/appRegistry";\n', 1)

state_marker = '  const [revision, setRevision] = useState(0);\n'
state_new = '''  const [revision, setRevision] = useState(0);
  const [portalRevision, setPortalRevision] = useState(0);
'''
if state_marker not in text: raise SystemExit('HAK state marker not found')
text = text.replace(state_marker, state_new, 1)

refresh_old = '''      setConfig(readConfig());
      setRevision((value) => value + 1);
'''
refresh_new = '''      setConfig(readConfig());
      setRevision((value) => value + 1);
      setPortalRevision((value) => value + 1);
'''
if refresh_old not in text: raise SystemExit('HAK refresh marker not found')
text = text.replace(refresh_old, refresh_new, 1)

insert_before = '  const patch = (id: HakItemId, next: HakItemOverride) => {\n'
block_helpers = '''  const effectiveHakBlocks = useMemo(
    () => [...(getEffectiveAdminConfig().hak?.blocks ?? [])].sort((a, b) => a.order - b.order),
    [revision, portalRevision],
  );

  const writeBlocks = (blocks: Array<AdminPageBlock & { placement?: "top" | "bottom" }>) => {
    const current = getDeviceAdminConfig();
    setDeviceAdminConfig({
      ...current,
      enabled: true,
      hak: {
        ...(current.hak ?? {}),
        blocks: [...blocks].map((block, index) => ({ ...block, order: (index + 1) * 10 })),
      },
    });
    setPortalRevision((value) => value + 1);
  };

  const editableBlocks = () => {
    const local = getDeviceAdminConfig().hak?.blocks;
    return [...(local ?? effectiveHakBlocks)].sort((a, b) => a.order - b.order);
  };

  const addBlock = () => {
    const blocks = editableBlocks();
    writeBlocks([
      ...blocks,
      {
        id: `hak_block_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        title: t("New section"),
        body: "",
        order: (blocks.at(-1)?.order ?? 0) + 10,
        placement: "bottom",
      },
    ]);
  };

  const patchBlock = (blockId: string, next: Partial<AdminPageBlock & { placement?: "top" | "bottom" }>) => {
    writeBlocks(editableBlocks().map((block) => block.id === blockId ? { ...block, ...next, id: block.id } : block));
  };

  const deleteBlock = (blockId: string) => writeBlocks(editableBlocks().filter((block) => block.id !== blockId));

  const moveBlock = (blockId: string, delta: -1 | 1) => {
    const blocks = editableBlocks();
    const from = blocks.findIndex((block) => block.id === blockId);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= blocks.length) return;
    const [item] = blocks.splice(from, 1);
    blocks.splice(to, 0, item);
    writeBlocks(blocks);
  };

'''
if insert_before not in text: raise SystemExit('HAK patch marker not found')
text = text.replace(insert_before, block_helpers + insert_before, 1)

return_marker = '  if (!hakOpen || !adminMode || typeof window === "undefined" || !isAdminOwnerAccount()) return null;\n\n  return (\n'
return_new = '''  if (!hakOpen || !adminMode || typeof window === "undefined" || !isAdminOwnerAccount()) return null;

  const hakContent = document.querySelector<HTMLElement>("[data-bixbo-hak-content]");
  const hakTop = document.querySelector<HTMLElement>("[data-bixbo-hak-custom-top]");
  const visibleBlocks = effectiveHakBlocks.filter((block) => block.hidden !== true);
  const renderBlocks = (placement: "top" | "bottom") => (
    <div data-bixbo-hak-custom-sections className="space-y-3 px-1 py-3">
      {visibleBlocks.filter((block) => (block.placement ?? "bottom") === placement).map((block) => (
        <section key={block.id} className="rounded-[1.75rem] bg-surface p-4 ring-1 ring-border/80">
          <h2 className="font-serif text-lg font-semibold text-foreground">{block.title}</h2>
          {block.body.trim() ? <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{block.body}</p> : null}
        </section>
      ))}
    </div>
  );

  return (
'''
if return_marker not in text: raise SystemExit('HAK return marker not found')
text = text.replace(return_marker, return_new, 1)

fragment_marker = '    <>\n      <div data-bixbo-hak-admin-ui data-bixbo-admin-ui className="fixed right-4 top-[max(4.1rem,calc(env(safe-area-inset-top)+3.1rem))] z-[9980]">\n'
fragment_new = '''    <>
      {hakTop ? createPortal(renderBlocks("top"), hakTop) : null}
      {hakContent ? createPortal(renderBlocks("bottom"), hakContent) : null}
      <div data-bixbo-hak-admin-ui data-bixbo-admin-ui className="fixed right-4 top-[max(4.1rem,calc(env(safe-area-inset-top)+3.1rem))] z-[9980]">
'''
if fragment_marker not in text: raise SystemExit('HAK fragment marker not found')
text = text.replace(fragment_marker, fragment_new, 1)

header_marker = '''              <p className="font-serif text-xl font-bold">HAK · {t("Admin edit mode")}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{t("Rename or hide HAK labels without changing pill calculations or saved health data.")}</p>
'''
header_new = '''              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-xl font-bold">HAK · {t("Admin edit mode")}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{t("Rename, hide or add HAK sections without changing pill calculations or saved health data.")}</p>
                </div>
                <button type="button" onClick={addBlock} className="rounded-full bg-primary px-3 py-2 text-[10px] font-bold text-primary-foreground">+ {t("Add section")}</button>
              </div>
'''
if header_marker not in text: raise SystemExit('HAK header marker not found')
text = text.replace(header_marker, header_new, 1)

list_end = '''              {definitions.map((definition) => {
'''
# custom blocks editor before built-in definitions
custom_ui = '''              {effectiveHakBlocks.length ? (
                <div className="mb-4 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{t("Custom sections")}</p>
                  {effectiveHakBlocks.map((block, blockIndex) => (
                    <section key={block.id} className="rounded-2xl bg-primary/5 p-3 ring-1 ring-primary/15">
                      <input value={block.title} onChange={(event) => patchBlock(block.id, { title: event.target.value })} className="h-9 w-full rounded-xl bg-tint px-3 text-xs font-semibold ring-1 ring-border" />
                      <textarea value={block.body} onChange={(event) => patchBlock(block.id, { body: event.target.value })} rows={2} placeholder={t("Text…")} className="mt-2 w-full resize-y rounded-xl bg-tint px-3 py-2 text-xs ring-1 ring-border" />
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <button type="button" disabled={blockIndex === 0} onClick={() => moveBlock(block.id, -1)} className="rounded-full bg-tint px-2.5 py-1 text-[9px] ring-1 ring-border disabled:opacity-25">↑</button>
                        <button type="button" disabled={blockIndex === effectiveHakBlocks.length - 1} onClick={() => moveBlock(block.id, 1)} className="rounded-full bg-tint px-2.5 py-1 text-[9px] ring-1 ring-border disabled:opacity-25">↓</button>
                        <select value={block.placement ?? "bottom"} onChange={(event) => patchBlock(block.id, { placement: event.target.value as "top" | "bottom" })} className="h-7 rounded-full bg-tint px-2 text-[9px] ring-1 ring-border">
                          <option value="top">{t("Top")}</option>
                          <option value="bottom">{t("Bottom")}</option>
                        </select>
                        <button type="button" onClick={() => patchBlock(block.id, { hidden: block.hidden !== true })} className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${block.hidden ? "bg-tint text-muted-foreground ring-1 ring-border" : "bg-primary text-primary-foreground"}`}>{block.hidden ? t("Hidden") : t("Shown")}</button>
                        <span className="min-w-0 flex-1 truncate text-[8px] text-muted-foreground">{block.id}</span>
                        <button type="button" onClick={() => deleteBlock(block.id)} className="rounded-full px-2.5 py-1 text-[9px] font-semibold text-destructive ring-1 ring-border">{t("Delete")}</button>
                      </div>
                    </section>
                  ))}
                </div>
              ) : null}

              {definitions.map((definition) => {
'''
if list_end not in text: raise SystemExit('definitions list marker not found')
text = text.replace(list_end, custom_ui, 1)
p.write_text(text)

Path('src/lib/__tests__/hak-custom-blocks.test.ts').write_text('''import { describe, expect, it } from "bun:test";\nimport { mergeAdminConfigs } from "../effectiveAdminConfig";\n\ndescribe("HAK custom sections", () => {\n  it("lets local HAK custom blocks replace the published array while keeping item overrides merged", () => {\n    const merged = mergeAdminConfigs(\n      { hak: { items: { sex: { label: "Global sex" } }, blocks: [{ id: "g", title: "G", body: "", order: 10, placement: "top" }] } },\n      { hak: { items: { protection: { hidden: true } }, blocks: [{ id: "l", title: "L", body: "", order: 10, placement: "bottom" }] } },\n    );\n    expect(merged.hak?.blocks?.map((block) => block.id)).toEqual(["l"]);\n    expect(merged.hak?.items?.sex?.label).toBe("Global sex");\n    expect(merged.hak?.items?.protection?.hidden).toBe(true);\n  });\n});\n''')
