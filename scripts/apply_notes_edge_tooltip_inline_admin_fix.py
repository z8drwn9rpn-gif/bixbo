from pathlib import Path

# Notes: use a native textarea as an iOS keyboard bridge before transferring focus
# to the rich contentEditable editor. This preserves rich-text storage and avoids
# requiring Checklist to prime the software keyboard.
notes = Path('src/routes/notes-editor.tsx')
s = notes.read_text()
s = s.replace(
'''  const editorRef = useRef<HTMLDivElement | null>(null);\n  const initialContentRef = useRef(''',
'''  const editorRef = useRef<HTMLDivElement | null>(null);\n  const keyboardBridgeRef = useRef<HTMLTextAreaElement | null>(null);\n  const initialContentRef = useRef(''',
1,
)
anchor = '''  const onInput = () => {\n    if (!editorRef.current) return;\n\n    // Keep the live DOM completely native while the user is typing. Rewriting\n    // innerHTML from an input/touch gesture can destroy iOS WebKit's selection\n    // and dismiss the software keyboard. We still sanitize before persistence.\n    contentRef.current = editorRef.current.innerHTML;\n    setTick((value) => value + 1);\n  };\n'''
replacement = anchor + '''\n  const primeIOSKeyboard = () => {\n    const bridge = keyboardBridgeRef.current;\n    const editor = editorRef.current;\n    if (!bridge || !editor) return;\n\n    // iOS reliably opens its software keyboard for a native textarea during the\n    // user gesture. Transfer focus to the rich editor on the next animation frame\n    // so typing lands in the note body while the keyboard stays open.\n    bridge.focus({ preventScroll: true });\n    window.requestAnimationFrame(() => {\n      editor.focus({ preventScroll: true });\n      const selection = window.getSelection();\n      if (!selection || selection.rangeCount > 0) return;\n      const range = document.createRange();\n      range.selectNodeContents(editor);\n      range.collapse(false);\n      selection.addRange(range);\n    });\n  };\n'''
assert anchor in s, 'notes onInput anchor missing'
s = s.replace(anchor, replacement, 1)
old = '''        <div className="rounded-3xl p-4 ring-1 ring-border/70" style={{ background: NOTE_COLORS[color] }}>\n          <div\n            key={note.id}\n            ref={editorRef}\n            contentEditable'''
new = '''        <div className="rounded-3xl p-4 ring-1 ring-border/70" style={{ background: NOTE_COLORS[color] }}>\n          <textarea\n            ref={keyboardBridgeRef}\n            aria-hidden="true"\n            tabIndex={-1}\n            className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0 text-base"\n          />\n          <div\n            key={note.id}\n            ref={editorRef}\n            contentEditable'''
assert old in s, 'notes editor block anchor missing'
s = s.replace(old, new, 1)
old = '''            dangerouslySetInnerHTML={{ __html: initialContentRef.current }}\n            onInput={onInput}\n            onBlur={onInput}'''
new = '''            dangerouslySetInnerHTML={{ __html: initialContentRef.current }}\n            onPointerDown={(event) => {\n              if (event.pointerType === "touch") primeIOSKeyboard();\n            }}\n            onTouchStart={primeIOSKeyboard}\n            onInput={onInput}\n            onBlur={onInput}'''
assert old in s, 'notes input handlers anchor missing'
s = s.replace(old, new, 1)
notes.write_text(s)

# Heatmap: never require measured DOM coordinates to render a Year tooltip.
# Measured coordinates remain preferred; deterministic grid coordinates are the
# fallback, which fixes edge dots where geometry can fail/clamp on iOS.
insights = Path('src/routes/insights.tsx')
s = insights.read_text()
old = '''                {hasActive && activeTooltip && yearTooltipAnchor?.halfIndex === halfIndex ? (\n                  <InsightFloatingTooltip\n                    leftPct={yearTooltipAnchor.leftPct}\n                    details={activeTooltip}\n                    top={yearTooltipAnchor.top}\n                    connectorSide={yearTooltipAnchor.connectorSide}\n                  />\n                ) : null}'''
new = '''                {hasActive && activeTooltip && activePosition && activeTooltipLayout ? (\n                  <InsightFloatingTooltip\n                    leftPct={\n                      yearTooltipAnchor?.halfIndex === halfIndex\n                        ? Math.max(2, Math.min(98, yearTooltipAnchor.leftPct))\n                        : 10 + ((activePosition.weekIndex + 0.5) / Math.max(1, half.weekCount)) * 88\n                    }\n                    details={activeTooltip}\n                    top={\n                      yearTooltipAnchor?.halfIndex === halfIndex\n                        ? yearTooltipAnchor.top\n                        : activeTooltipLayout.top\n                    }\n                    connectorSide={\n                      yearTooltipAnchor?.halfIndex === halfIndex\n                        ? yearTooltipAnchor.connectorSide\n                        : activeTooltipLayout.connectorSide\n                    }\n                  />\n                ) : null}'''
assert old in s, 'year tooltip render anchor missing'
s = s.replace(old, new, 1)
insights.write_text(s)

# Admin: keep the live app interactive while the editor is open on mobile.
# This turns the existing page editor into an overlaid live-edit sheet rather than
# a full-screen modal/admin destination. Existing rename/hide/reorder/publish logic
# remains unchanged.
admin = Path('src/components/AdminEditOverlay.tsx')
s = admin.read_text()
old = '''      {open ? (\n        <div data-bixbo-admin-ui className="fixed inset-0 z-[89] bg-black/20 lg:bg-black/10" onClick={() => setOpen(false)}>\n          <aside className="absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-y-auto rounded-t-[28px] bg-background pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl ring-1 ring-border lg:inset-y-4 lg:left-auto lg:right-4 lg:w-[460px] lg:max-h-none lg:rounded-[28px]" onClick={(event) => event.stopPropagation()}>'''
new = '''      {open ? (\n        <div\n          data-bixbo-admin-ui\n          data-bixbo-admin-live-editor\n          className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.6rem)] z-[10010] lg:inset-0 lg:pointer-events-auto lg:bg-black/10"\n        >\n          <aside className="pointer-events-auto relative mx-2 max-h-[48dvh] overflow-y-auto rounded-[28px] bg-background pb-4 shadow-2xl ring-1 ring-border lg:absolute lg:inset-y-4 lg:left-auto lg:right-4 lg:mx-0 lg:w-[460px] lg:max-h-none lg:rounded-[28px] lg:pb-[calc(env(safe-area-inset-bottom)+1rem)]" onClick={(event) => event.stopPropagation()}>'''
assert old in s, 'Admin modal shell anchor missing'
s = s.replace(old, new, 1)
admin.write_text(s)

# Regression contract.
test = Path('src/lib/__tests__/notes-edge-tooltip-inline-admin-regression.test.ts')
test.write_text('''import { describe, expect, it } from "vitest";\nimport { readFileSync } from "node:fs";\nimport { resolve } from "node:path";\n\nconst read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");\n\ndescribe("Notes keyboard, Heatmap edge tooltip and live Admin regressions", () => {\n  it("primes iOS keyboard through a native textarea before focusing rich Notes", () => {\n    const source = read("src/routes/notes-editor.tsx");\n    expect(source).toContain("keyboardBridgeRef");\n    expect(source).toContain("bridge.focus({ preventScroll: true })");\n    expect(source).toContain("onTouchStart={primeIOSKeyboard}");\n  });\n\n  it("always renders the Year Heatmap tooltip with a deterministic edge-safe fallback", () => {\n    const source = read("src/routes/insights.tsx");\n    expect(source).toContain("hasActive && activeTooltip && activePosition && activeTooltipLayout");\n    expect(source).toContain("Math.max(2, Math.min(98, yearTooltipAnchor.leftPct))");\n    expect(source).toContain("activePosition.weekIndex");\n  });\n\n  it("keeps the current app page interactive while Admin editing is open", () => {\n    const source = read("src/components/AdminEditOverlay.tsx");\n    expect(source).toContain("data-bixbo-admin-live-editor");\n    expect(source).toContain("pointer-events-none fixed inset-x-0");\n    expect(source).toContain("pointer-events-auto relative mx-2 max-h-[48dvh]");\n  });\n});\n''')
