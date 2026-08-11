from pathlib import Path

# Notes: do not imperatively rewrite contentEditable after mount.
p = Path('src/routes/notes-editor.tsx')
s = p.read_text()
old = '''  const editorRef = useRef<HTMLDivElement | null>(null);\n  const contentRef = useRef(note.content);\n  const firstRender = useRef(true);\n\n  useEffect(() => {\n    if (!editorRef.current) return;\n\n    const migratedContent = sanitizeNoteHtml(\n      (note.content || "").replaceAll("#fef3c7", "#b4be80").replaceAll("rgb(254, 243, 199)", "rgb(223, 230, 184)"),\n    );\n\n    if (editorRef.current.innerHTML !== migratedContent) {\n      editorRef.current.innerHTML = migratedContent;\n      contentRef.current = migratedContent;\n    }\n  }, [note.id, note.content]);\n'''
new = '''  const editorRef = useRef<HTMLDivElement | null>(null);\n  const initialContentRef = useRef(\n    sanitizeNoteHtml(\n      (note.content || "").replaceAll("#fef3c7", "#b4be80").replaceAll("rgb(254, 243, 199)", "rgb(223, 230, 184)"),\n    ),\n  );\n  const contentRef = useRef(initialContentRef.current);\n  const firstRender = useRef(true);\n'''
assert old in s, 'Notes mount effect block not found'
s = s.replace(old, new, 1)
old = '''          <div\n            ref={editorRef}\n            contentEditable'''
new = '''          <div\n            key={note.id}\n            ref={editorRef}\n            contentEditable'''
assert old in s, 'Notes editor start not found'
s = s.replace(old, new, 1)
old = '''            data-bixbo-note-editor\n            onInput={onInput}'''
new = '''            data-bixbo-note-editor\n            dangerouslySetInnerHTML={{ __html: initialContentRef.current }}\n            onInput={onInput}'''
assert old in s, 'Notes editor data anchor not found'
s = s.replace(old, new, 1)
p.write_text(s)

# Admin Mode: automatically open the correct current-page editor on activation/route change.
p = Path('src/components/GlobalAdminModeController.tsx')
s = p.read_text()
old = '''  const owner = typeof window !== "undefined" && isAdminOwnerAccount();\n\n  return ('''
new = '''  const owner = typeof window !== "undefined" && isAdminOwnerAccount();\n\n  useEffect(() => {\n    if (!active || !owner || typeof window === "undefined") return;\n    const frame = window.requestAnimationFrame(() => requestAdminCustomizeCurrentPage());\n    return () => window.cancelAnimationFrame(frame);\n  }, [active, owner, pathname]);\n\n  return ('''
assert old in s, 'Admin auto-open anchor not found'
s = s.replace(old, new, 1)
p.write_text(s)

# Year Heatmap: position the tooltip from the actual tapped dot DOM geometry.
p = Path('src/routes/insights.tsx')
s = p.read_text()
old = '''  const [metric, setMetric] = useState<HeatmapMetric>("pain");\n  const [active, setActive] = useState<string | null>(null);'''
new = '''  const [metric, setMetric] = useState<HeatmapMetric>("pain");\n  const [active, setActive] = useState<string | null>(null);\n  const [yearTooltipAnchor, setYearTooltipAnchor] = useState<{\n    halfIndex: number;\n    leftPct: number;\n    top: number;\n    connectorSide: "top" | "bottom";\n  } | null>(null);'''
assert old in s, 'Heatmap state anchor not found'
s = s.replace(old, new, 1)
old = '''  useEffect(() => {\n    setActive(null);\n  }, [anchor, heatmapPeriod, metric]);'''
new = '''  useEffect(() => {\n    setActive(null);\n    setYearTooltipAnchor(null);\n  }, [anchor, heatmapPeriod, metric]);'''
assert old in s, 'Heatmap reset anchor not found'
s = s.replace(old, new, 1)
old = '''              <div key={`${half.startMonth}-${half.endMonth}`} className="relative min-w-0 overflow-visible">\n                {hasActive && activeTooltip && activePosition && activeTooltipLayout ? (\n                  <InsightFloatingTooltip\n                    leftPct={10 + ((activePosition.weekIndex + 0.5) / Math.max(1, half.weekCount)) * 88}\n                    details={activeTooltip}\n                    top={activeTooltipLayout.top}\n                    connectorSide={activeTooltipLayout.connectorSide}\n                  />\n                ) : null}'''
new = '''              <div\n                key={`${half.startMonth}-${half.endMonth}`}\n                data-bixbo-heatmap-half={halfIndex}\n                className="relative min-w-0 overflow-visible"\n              >\n                {hasActive && activeTooltip && yearTooltipAnchor?.halfIndex === halfIndex ? (\n                  <InsightFloatingTooltip\n                    leftPct={yearTooltipAnchor.leftPct}\n                    details={activeTooltip}\n                    top={yearTooltipAnchor.top}\n                    connectorSide={yearTooltipAnchor.connectorSide}\n                  />\n                ) : null}'''
assert old in s, 'Year tooltip render block not found'
s = s.replace(old, new, 1)
old = '''                                  onClick={(event) => {\n                                    if (!datum) return;\n                                    event.stopPropagation();\n                                    setActive((current) => (current === key ? null : key));\n                                  }}'''
new = '''                                  onClick={(event) => {\n                                    if (!datum) return;\n                                    event.stopPropagation();\n\n                                    if (active === key) {\n                                      setActive(null);\n                                      setYearTooltipAnchor(null);\n                                      return;\n                                    }\n\n                                    const halfElement = event.currentTarget.closest<HTMLElement>("[data-bixbo-heatmap-half]");\n                                    if (halfElement) {\n                                      const halfRect = halfElement.getBoundingClientRect();\n                                      const dotRect = event.currentTarget.getBoundingClientRect();\n                                      const centerX = dotRect.left - halfRect.left + dotRect.width / 2;\n                                      const centerY = dotRect.top - halfRect.top + dotRect.height / 2;\n                                      const showBelow = centerY < 92;\n                                      setYearTooltipAnchor({\n                                        halfIndex,\n                                        leftPct: Math.max(0, Math.min(100, (centerX / Math.max(1, halfRect.width)) * 100)),\n                                        top: showBelow ? centerY + 5 : Math.max(0, centerY - 75),\n                                        connectorSide: showBelow ? "top" : "bottom",\n                                      });\n                                    }\n                                    setActive(key);\n                                  }}'''
assert old in s, 'Year dot click block not found'
s = s.replace(old, new, 1)
p.write_text(s)

Path('src/lib/__tests__/admin-heatmap-notes-live-regression.test.ts').write_text('''import { describe, expect, it } from "vitest";\nimport { readFileSync } from "node:fs";\nimport { resolve } from "node:path";\n\nconst read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");\n\ndescribe("live Admin / Heatmap / Notes regressions", () => {\n  it("opens the current-page editor when Admin Mode activates or the route changes", () => {\n    const source = read("src/components/GlobalAdminModeController.tsx");\n    expect(source).toContain("requestAnimationFrame(() => requestAdminCustomizeCurrentPage())");\n    expect(source).toContain("[active, owner, pathname]");\n  });\n\n  it("anchors Year Heatmap tooltip to the actual tapped dot", () => {\n    const source = read("src/routes/insights.tsx");\n    expect(source).toContain("data-bixbo-heatmap-half={halfIndex}");\n    expect(source).toContain("event.currentTarget.getBoundingClientRect()");\n    expect(source).toContain("halfElement.getBoundingClientRect()");\n    expect(source).toContain("yearTooltipAnchor.leftPct");\n  });\n\n  it("mounts Notes content without an imperative innerHTML rewrite", () => {\n    const source = read("src/routes/notes-editor.tsx");\n    expect(source).toContain("dangerouslySetInnerHTML={{ __html: initialContentRef.current }}");\n    expect(source).not.toContain("editorRef.current.innerHTML = migratedContent");\n    expect(source).toContain("contentRef.current = editorRef.current.innerHTML");\n  });\n});\n''')
