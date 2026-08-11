from pathlib import Path
import re

ROOT = Path('.')

def read(path):
    return (ROOT / path).read_text()

def write(path, text):
    (ROOT / path).write_text(text)

# 1) Logged Period entries must never disappear from the calendar because of an admin surface toggle.
path = 'src/components/MonthCalendar.tsx'
text = read(path)
old = 'periodColor: cycleTrackingHidden || !isRegistrySurfaceEnabled(data, "period", "calendar") ? null : (periodColorVar(periodLevel) ?? actualPeriodColor),'
new = 'periodColor: cycleTrackingHidden ? null : (periodColorVar(periodLevel) ?? actualPeriodColor),'
assert old in text, 'MonthCalendar periodColor anchor missing'
text = text.replace(old, new, 1)
write(path, text)

# 2) Couple similarity must be symmetric on both phones.
path = 'src/routes/couple.tsx'
text = read(path)
old = '''  // Couple similarity starts only when the partner has their first comparable\n  // pain/panic/tetany log. Calendar days before that date must never dilute or\n  // penalize the comparison (for example 1–25 July when the partner starts on 26 July).\n  const partnerFirstComparisonDay = partner\n    ? (Object.keys(partner.dayLogs)\n        .filter((day) => hasSymptoms(partner.dayLogs[day]))\n        .sort()[0] ?? null)\n    : null;\n\n  const comparisonPeriodDays = partnerFirstComparisonDay\n    ? periodDays.filter((day) => day >= partnerFirstComparisonDay)\n    : [];'''
new = '''  // Couple similarity must use the same comparison window on both phones.\n  // Start only once BOTH people have comparable symptom history; using only\n  // `partnerFirstComparisonDay` makes the result direction-dependent because\n  // "partner" is the opposite person on the other device.\n  const myFirstComparisonDay =\n    Object.keys(view.dayLogs)\n      .filter((day) => hasSymptoms(view.dayLogs[day]))\n      .sort()[0] ?? null;\n\n  const partnerFirstComparisonDay = partner\n    ? (Object.keys(partner.dayLogs)\n        .filter((day) => hasSymptoms(partner.dayLogs[day]))\n        .sort()[0] ?? null)\n    : null;\n\n  const comparisonStartDay =\n    myFirstComparisonDay && partnerFirstComparisonDay\n      ? (myFirstComparisonDay > partnerFirstComparisonDay ? myFirstComparisonDay : partnerFirstComparisonDay)\n      : null;\n\n  const comparisonPeriodDays = comparisonStartDay\n    ? periodDays.filter((day) => day >= comparisonStartDay)\n    : [];'''
assert old in text, 'Couple comparison anchor missing'
text = text.replace(old, new, 1)
write(path, text)

# 3) iOS Notes: make the rich editor explicitly focusable/editable from a direct user gesture.
path = 'src/routes/notes-editor.tsx'
text = read(path)
old = '''          <div\n            ref={editorRef}\n            contentEditable\n            suppressContentEditableWarning\n            onInput={onInput}\n            onBlur={onInput}\n            className="min-h-[40dvh] text-base leading-relaxed whitespace-pre-wrap outline-none empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]"\n            data-placeholder={t("Start writing…")}\n          />'''
new = '''          <div\n            ref={editorRef}\n            contentEditable\n            suppressContentEditableWarning\n            role="textbox"\n            aria-multiline="true"\n            tabIndex={0}\n            inputMode="text"\n            onPointerDown={(event) => {\n              // iOS requires focus to happen synchronously inside the user's gesture\n              // for the software keyboard to open reliably in installed/PWA mode.\n              event.stopPropagation();\n              editorRef.current?.focus();\n            }}\n            onClick={(event) => {\n              event.stopPropagation();\n              editorRef.current?.focus();\n            }}\n            onInput={onInput}\n            onBlur={onInput}\n            style={{ WebkitUserSelect: "text", userSelect: "text", touchAction: "manipulation" }}\n            className="min-h-[40dvh] cursor-text text-base leading-relaxed whitespace-pre-wrap outline-none empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]"\n            data-placeholder={t("Start writing…")}\n          />'''
assert old in text, 'Notes editor anchor missing'
text = text.replace(old, new, 1)
write(path, text)

# 4) Admin Customize: keep explicit events, but add a deterministic fallback that clicks
# the current page's mounted editor opener if a route listener did not open a panel.
path = 'src/components/GlobalAdminModeController.tsx'
text = read(path)
old = '            onClick={requestAdminCustomizeCurrentPage}'
new = '''            onClick={() => {\n              requestAdminCustomizeCurrentPage();\n              window.setTimeout(() => {\n                const panelAlreadyOpen = document.querySelector(\n                  '[data-bixbo-admin-ui] aside, [data-bixbo-couple-admin-ui] aside, [data-bixbo-hak-admin-ui] aside',\n                );\n                if (panelAlreadyOpen) return;\n                document.querySelector<HTMLButtonElement>('[data-bixbo-admin-page-opener]')?.click();\n              }, 80);\n            }}'''
assert old in text, 'Global admin Customize anchor missing'
text = text.replace(old, new, 1)
write(path, text)

# Mark the real current-page editor opener in every page editor implementation.
for path in [
    'src/components/AdminEditOverlay.tsx',
    'src/components/CoupleAdminEditOverlay.tsx',
    'src/components/UniversalAdminPageEditor.tsx',
]:
    text = read(path)
    if 'data-bixbo-admin-page-opener' in text:
        continue
    pattern = r'(<button\b[^>]*?)onClick=\{\(\) => setOpen\(\(value\) => !value\)\}'
    text2, count = re.subn(pattern, r'\1data-bixbo-admin-page-opener onClick={() => setOpen((value) => !value)}', text, count=1, flags=re.S)
    assert count == 1, f'Admin opener anchor missing in {path}'
    write(path, text2)

path = 'src/components/HakAdminEditOverlay.tsx'
text = read(path)
if 'data-bixbo-admin-page-opener' not in text:
    anchor = 'data-bixbo-admin-open="hak"'
    assert anchor in text, 'HAK admin opener anchor missing'
    text = text.replace(anchor, anchor + '\n          data-bixbo-admin-page-opener', 1)
    write(path, text)

# Source-level regression tests for the four reported failures.
test_path = ROOT / 'src/lib/__tests__/reported-runtime-regressions.test.ts'
test_path.write_text('''import { describe, expect, it } from "vitest";\nimport fs from "node:fs";\n\nconst read = (path: string) => fs.readFileSync(path, "utf8");\n\ndescribe("reported runtime regressions", () => {\n  it("keeps logged Period visible independently of the admin calendar surface", () => {\n    const source = read("src/components/MonthCalendar.tsx");\n    expect(source).toContain('periodColor: cycleTrackingHidden ? null : (periodColorVar(periodLevel) ?? actualPeriodColor)');\n    expect(source).not.toContain('!isRegistrySurfaceEnabled(data, "period", "calendar") ? null');\n  });\n\n  it("uses a symmetric Couple comparison start day", () => {\n    const source = read("src/routes/couple.tsx");\n    expect(source).toContain("const myFirstComparisonDay");\n    expect(source).toContain("const comparisonStartDay");\n    expect(source).toContain("myFirstComparisonDay > partnerFirstComparisonDay");\n  });\n\n  it("makes the Notes rich editor explicitly iOS-focusable", () => {\n    const source = read("src/routes/notes-editor.tsx");\n    expect(source).toContain('role="textbox"');\n    expect(source).toContain('inputMode="text"');\n    expect(source).toContain("editorRef.current?.focus()");\n  });\n\n  it("has a route-editor fallback for Admin Customize", () => {\n    const source = read("src/components/GlobalAdminModeController.tsx");\n    expect(source).toContain("data-bixbo-admin-page-opener");\n    for (const path of [\n      "src/components/AdminEditOverlay.tsx",\n      "src/components/CoupleAdminEditOverlay.tsx",\n      "src/components/HakAdminEditOverlay.tsx",\n      "src/components/UniversalAdminPageEditor.tsx",\n    ]) {\n      expect(read(path)).toContain("data-bixbo-admin-page-opener");\n    }\n  });\n});\n''')
