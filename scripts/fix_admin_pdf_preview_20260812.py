from pathlib import Path


def repl(path, old, new):
    p=Path(path); s=p.read_text()
    if old not in s: raise SystemExit(f'pattern missing {path}: {old[:100]!r}')
    p.write_text(s.replace(old,new,1))

# Admin global command event.
p='src/lib/adminCustomizeEvents.ts'
s=Path(p).read_text()
s += '\nexport const ADMIN_TOOL_REQUESTED = "bixbo:admin-tool-requested";\nexport type AdminTool = "page" | "text" | "sections" | "navigation";\nexport function requestAdminTool(tool: AdminTool) {\n  if (typeof window === "undefined") return;\n  window.dispatchEvent(new CustomEvent(ADMIN_TOOL_REQUESTED, { detail: { tool } }));\n}\n'
Path(p).write_text(s)

p='src/components/GlobalAdminModeController.tsx'
repl(p,'import { requestAdminCustomizeCurrentPage } from "@/lib/adminCustomizeEvents";','import { requestAdminCustomizeCurrentPage, requestAdminTool } from "@/lib/adminCustomizeEvents";')
repl(p,'<button type="button" onClick={requestAdminCustomizeCurrentPage} className="rounded-full bg-background/15 px-2 py-1 text-[9px] font-bold">{t("Page")}</button>\n            <button type="button" onClick={() => openAdminTool("text")} className="rounded-full bg-background/15 px-2 py-1 text-[9px] font-bold">{t("Text")}</button>\n            <button type="button" onClick={() => openAdminTool("sections")} className="rounded-full bg-background/15 px-2 py-1 text-[9px] font-bold">{t("Sections")}</button>\n            <button type="button" onClick={() => openAdminTool("navigation")} className="rounded-full bg-background/15 px-2 py-1 text-[9px] font-bold">{t("Nav")}</button>', '<button type="button" onClick={() => requestAdminTool("page")} className="rounded-full bg-background/15 px-2 py-1 text-[9px] font-bold">{t("Page")}</button>\n            <button type="button" onClick={() => requestAdminTool("text")} className="rounded-full bg-background/15 px-2 py-1 text-[9px] font-bold">{t("Text")}</button>\n            <button type="button" onClick={() => requestAdminTool("sections")} className="rounded-full bg-background/15 px-2 py-1 text-[9px] font-bold">{t("Sections")}</button>\n            <button type="button" onClick={() => requestAdminTool("navigation")} className="rounded-full bg-background/15 px-2 py-1 text-[9px] font-bold">{t("Nav")}</button>')

# Primary page editor reacts directly.
p='src/components/AdminEditOverlay.tsx'
repl(p,'import { ADMIN_CUSTOMIZE_REQUESTED } from "@/lib/adminCustomizeEvents";','import { ADMIN_CUSTOMIZE_REQUESTED, ADMIN_TOOL_REQUESTED } from "@/lib/adminCustomizeEvents";')
needle='''  useEffect(() => {\n    const openCurrentPageEditor = () => {\n      if (!adminMode || !page) return;\n      if (pathname === "/" && document.querySelector("[data-bixbo-hak-root]")) return;\n      setTab("page");\n      setOpen(true);\n    };\n    window.addEventListener(ADMIN_CUSTOMIZE_REQUESTED, openCurrentPageEditor);\n    return () => window.removeEventListener(ADMIN_CUSTOMIZE_REQUESTED, openCurrentPageEditor);\n  }, [adminMode, page, pathname]);'''
replacement=needle+'''\n\n  useEffect(() => {\n    const onTool = (event: Event) => {\n      const tool = (event as CustomEvent<{ tool?: string }>).detail?.tool;\n      if (!adminMode || !page || (tool !== "page" && tool !== "sections")) return;\n      if (pathname === "/" && document.querySelector("[data-bixbo-hak-root]")) return;\n      setTab("page");\n      setOpen(true);\n    };\n    window.addEventListener(ADMIN_TOOL_REQUESTED, onTool);\n    return () => window.removeEventListener(ADMIN_TOOL_REQUESTED, onTool);\n  }, [adminMode, page, pathname]);'''
repl(p,needle,replacement)

# Universal page editor reacts directly.
p='src/components/UniversalAdminPageEditor.tsx'
repl(p,'import { ADMIN_CUSTOMIZE_REQUESTED } from "@/lib/adminCustomizeEvents";','import { ADMIN_CUSTOMIZE_REQUESTED, ADMIN_TOOL_REQUESTED } from "@/lib/adminCustomizeEvents";')
needle='''  useEffect(() => {\n    const openCurrentPageEditor = () => {\n      if (adminMode && supported) setOpen(true);\n    };\n    window.addEventListener(ADMIN_CUSTOMIZE_REQUESTED, openCurrentPageEditor);\n    return () => window.removeEventListener(ADMIN_CUSTOMIZE_REQUESTED, openCurrentPageEditor);\n  }, [adminMode, supported]);'''
replacement=needle+'''\n\n  useEffect(() => {\n    const onTool = (event: Event) => {\n      const tool = (event as CustomEvent<{ tool?: string }>).detail?.tool;\n      if (adminMode && supported && (tool === "page" || tool === "sections")) setOpen(true);\n    };\n    window.addEventListener(ADMIN_TOOL_REQUESTED, onTool);\n    return () => window.removeEventListener(ADMIN_TOOL_REQUESTED, onTool);\n  }, [adminMode, supported]);'''
repl(p,needle,replacement)

# Text editor direct event.
p='src/components/UniversalTextAdminEditor.tsx'
repl(p,'import { ADMIN_MODE_CHANGED, isGlobalAdminModeActive } from "@/components/GlobalAdminModeController";','import { ADMIN_MODE_CHANGED, isGlobalAdminModeActive } from "@/components/GlobalAdminModeController";\nimport { ADMIN_TOOL_REQUESTED } from "@/lib/adminCustomizeEvents";')
needle='''  useEffect(() => {\n    if (!adminMode) setOpen(false);\n  }, [adminMode]);'''
replacement=needle+'''\n\n  useEffect(() => {\n    const onTool = (event: Event) => {\n      if ((event as CustomEvent<{ tool?: string }>).detail?.tool === "text" && adminMode) setOpen(true);\n    };\n    window.addEventListener(ADMIN_TOOL_REQUESTED, onTool);\n    return () => window.removeEventListener(ADMIN_TOOL_REQUESTED, onTool);\n  }, [adminMode]);'''
repl(p,needle,replacement)

# Nav editor direct event.
p='src/components/NavigationAdminEditor.tsx'
repl(p,'import { ADMIN_MODE_CHANGED, isGlobalAdminModeActive } from "@/components/GlobalAdminModeController";','import { ADMIN_MODE_CHANGED, isGlobalAdminModeActive } from "@/components/GlobalAdminModeController";\nimport { ADMIN_TOOL_REQUESTED } from "@/lib/adminCustomizeEvents";')
needle='''  useEffect(() => {\n    if (!active) setOpen(false);\n  }, [active]);'''
replacement=needle+'''\n\n  useEffect(() => {\n    const onTool = (event: Event) => {\n      if ((event as CustomEvent<{ tool?: string }>).detail?.tool === "navigation" && active) setOpen(true);\n    };\n    window.addEventListener(ADMIN_TOOL_REQUESTED, onTool);\n    return () => window.removeEventListener(ADMIN_TOOL_REQUESTED, onTool);\n  }, [active]);'''
repl(p,needle,replacement)

# PDF: replace popup flow with closable in-app preview and direct native print action.
p='src/routes/report.tsx'
# Remove printReport function and replace with preview state.
start='''  const printReport = () => {\n    const reportPage = document.querySelector<HTMLElement>(".pdf-page");\n    const styleNode = document.querySelector<HTMLStyleElement>("style[data-bixbo-pdf-styles]");\n    if (!reportPage || !styleNode) {\n      window.print();\n      return;\n    }\n\n    const popup = window.open("", "_blank");\n    if (!popup) {\n      window.print();\n      return;\n    }\n\n    popup.document.open();\n    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — BIXBO</title><style>${styleNode.textContent ?? ""}</style></head><body><div class="pdf-report-root">${reportPage.outerHTML}</div></body></html>`);\n    popup.document.close();\n    popup.focus();\n    window.setTimeout(() => popup.print(), 180);\n  };'''
repl(p,start,'  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);')
repl(p,'onClick={printReport}','onClick={() => setPrintPreviewOpen(true)}')
# add print css
repl(p,'@media print{body{background:#fff!important}.pdf-no-print,header,nav,.bottom-nav{display:none!important}', '@media print{body{background:#fff!important}.pdf-no-print,header,nav,.bottom-nav,.pdf-preview-toolbar{display:none!important}.pdf-print-preview{position:static!important;inset:auto!important;overflow:visible!important;background:#fff!important;padding:0!important}.pdf-print-preview>.pdf-page{display:block!important}.pdf-report-root:not(.pdf-print-preview){display:none!important}')
# inject overlay before closing root div
needle='''      {style === "clinical" ? <ClinicalReport title={title} days={days} meds={view.meds} avgPain={avgPain} loggedDays={loggedDays} locale={locale} /> : null}\n    </div>\n  </AppShell>;'''
overlay='''      {style === "clinical" ? <ClinicalReport title={title} days={days} meds={view.meds} avgPain={avgPain} loggedDays={loggedDays} locale={locale} /> : null}\n    </div>\n\n    {printPreviewOpen ? (\n      <div className="pdf-print-preview fixed inset-0 z-[10050] overflow-y-auto bg-background p-3 pb-24">\n        <div className="pdf-preview-toolbar sticky top-0 z-10 mx-auto mb-3 flex max-w-[820px] items-center gap-2 rounded-2xl bg-background/95 p-2 shadow-lg ring-1 ring-border backdrop-blur">\n          <button type="button" onClick={() => setPrintPreviewOpen(false)} className="h-10 rounded-xl bg-tint px-4 text-sm font-semibold ring-1 ring-border">← {t("Back")}</button>\n          <div className="min-w-0 flex-1 text-center text-xs font-semibold text-muted-foreground">{title}</div>\n          <button type="button" onClick={() => window.print()} className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">{t("Print / Save PDF")}</button>\n        </div>\n        {style === "soft" ? <SoftReport title={title} days={days} meds={view.meds} avgPain={avgPain} loggedDays={loggedDays} locale={locale} /> : null}\n        {style === "dashboard" ? <DashboardReport title={title} days={days} avgPain={avgPain} loggedDays={loggedDays} /> : null}\n        {style === "journal" ? <JournalReport title={title} days={days} locale={locale} /> : null}\n        {style === "clinical" ? <ClinicalReport title={title} days={days} meds={view.meds} avgPain={avgPain} loggedDays={loggedDays} locale={locale} /> : null}\n      </div>\n    ) : null}\n  </AppShell>;'''
repl(p,needle,overlay)

print('patched')
