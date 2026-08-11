from pathlib import Path

p = Path('src/routes/notes-editor.tsx')
s = p.read_text()

old = '''  const onInput = () => {\n    if (!editorRef.current) return;\n\n    contentRef.current = sanitizeNoteHtml(editorRef.current.innerHTML);\n\n    if (editorRef.current.innerHTML !== contentRef.current) {\n      editorRef.current.innerHTML = contentRef.current;\n    }\n\n    setTick((value) => value + 1);\n  };\n\n  const focusEditorForTyping = () => {\n    const editor = editorRef.current;\n    if (!editor) return;\n    if (document.activeElement !== editor) {\n      editor.focus({ preventScroll: true });\n    }\n  };'''
new = '''  const onInput = () => {\n    if (!editorRef.current) return;\n\n    // Keep the live DOM completely native while the user is typing. Rewriting\n    // innerHTML from an input/touch gesture can destroy iOS WebKit's selection\n    // and dismiss the software keyboard. We still sanitize before persistence.\n    contentRef.current = editorRef.current.innerHTML;\n    setTick((value) => value + 1);\n  };'''
assert old in s, 'Notes input/focus block not found'
s = s.replace(old, new, 1)

old = '''            onPointerDown={focusEditorForTyping}\n            onTouchStart={focusEditorForTyping}\n            onClick={focusEditorForTyping}\n            onInput={onInput}\n            onBlur={onInput}'''
new = '''            onInput={onInput}\n            onBlur={onInput}'''
assert old in s, 'Notes forced focus handlers not found'
s = s.replace(old, new, 1)

old = '            spellCheck\n            onInput={onInput}'
new = '            spellCheck\n            autoCapitalize="sentences"\n            autoCorrect="on"\n            data-bixbo-note-editor\n            onInput={onInput}'
assert old in s, 'Notes editor attributes anchor not found'
s = s.replace(old, new, 1)

p.write_text(s)

Path('src/lib/__tests__/notes-ios-editing-regression.test.ts').write_text('''import { describe, expect, it } from "vitest";\nimport fs from "node:fs";\n\nconst source = fs.readFileSync("src/routes/notes-editor.tsx", "utf8");\n\ndescribe("Notes iOS editing", () => {\n  it("does not rewrite contentEditable innerHTML during input", () => {\n    const inputBlock = source.slice(source.indexOf("const onInput"), source.indexOf("return (", source.indexOf("const onInput")));\n    expect(inputBlock).toContain("contentRef.current = editorRef.current.innerHTML");\n    expect(inputBlock).not.toContain("sanitizeNoteHtml(editorRef.current.innerHTML)");\n    expect(inputBlock).not.toContain("editorRef.current.innerHTML =");\n  });\n\n  it("lets iOS use native contentEditable touch focus", () => {\n    expect(source).toContain("data-bixbo-note-editor");\n    expect(source).toContain("contentEditable");\n    expect(source).not.toContain("onTouchStart={focusEditorForTyping}");\n    expect(source).not.toContain("onPointerDown={focusEditorForTyping}");\n  });\n});\n''')
