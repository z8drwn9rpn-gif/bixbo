from pathlib import Path

p = Path('src/routes/notes-editor.tsx')
s = p.read_text()

s = s.replace('  const [tick, setTick] = useState(0);\n  const [editorReady, setEditorReady] = useState(false);\n', '  const [tick, setTick] = useState(0);\n')

old_effect = '''  useEffect(() => {\n    setEditorReady(false);\n    const frame = window.requestAnimationFrame(() => setEditorReady(true));\n    return () => window.cancelAnimationFrame(frame);\n  }, [note.id]);\n\n'''
if old_effect not in s:
    raise SystemExit('editorReady effect not found')
s = s.replace(old_effect, '', 1)

old_key = '            key={`${note.id}:${editorReady ? "ready" : "boot"}`}\n'
if old_key not in s:
    raise SystemExit('dynamic textarea key not found')
s = s.replace(old_key, '', 1)

# Explicitly harden body textarea for iOS/PWA touch editing without any remount/bridge.
old_class = '            className="block min-h-[40dvh] w-full resize-none bg-transparent text-base leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"\n'
new_class = '            className="relative z-10 block min-h-[40dvh] w-full touch-manipulation resize-none bg-transparent text-base leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"\n            style={{ WebkitUserSelect: "text", userSelect: "text", pointerEvents: "auto" }}\n'
if old_class not in s:
    raise SystemExit('textarea class not found')
s = s.replace(old_class, new_class, 1)

p.write_text(s)

# Replace stale regression test with assertions for current native textarea architecture.
t = Path('src/lib/__tests__/notes-ios-editing-regression.test.ts')
t.write_text('''import { describe, expect, it } from "vitest";\nimport fs from "node:fs";\n\nconst source = fs.readFileSync("src/routes/notes-editor.tsx", "utf8");\n\ndescribe("Notes iOS editing", () => {\n  it("uses one stable native textarea for the note body", () => {\n    expect(source).toContain("data-bixbo-note-editor");\n    expect(source).toContain("<textarea");\n    expect(source).toContain("value={bodyText}");\n    expect(source).toContain("onChange={(event) => onInput(event.target.value)}");\n    expect(source).not.toContain("contentEditable");\n    expect(source).not.toContain("keyboardBridgeRef");\n  });\n\n  it("never remounts the body textarea after tap/mount", () => {\n    expect(source).not.toContain("editorReady");\n    expect(source).not.toContain('key={`${note.id}:');\n    expect(source).not.toContain("setEditorReady");\n  });\n\n  it("keeps body editing independent from checklist visibility", () => {\n    const bodyIndex = source.indexOf("data-bixbo-note-editor");\n    const checklistIndex = source.indexOf("{showChecklist && (");\n    expect(bodyIndex).toBeGreaterThan(-1);\n    expect(checklistIndex).toBeGreaterThan(bodyIndex);\n    const beforeChecklist = source.slice(0, checklistIndex);\n    expect(beforeChecklist).toContain("data-bixbo-note-editor");\n  });\n});\n''')

print('patched stable native Notes textarea and regression test')
