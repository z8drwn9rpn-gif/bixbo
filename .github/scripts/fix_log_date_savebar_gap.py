from pathlib import Path

log_sheet_path = Path("src/components/LogSheet.tsx")
log_sheet = log_sheet_path.read_text(encoding="utf-8")
old_effect = '''  useEffect(() => {\n    if (!formSurface) return;\n    formSurface.style.paddingTop = showDateControl ? "36px" : "";\n    return () => {\n      formSurface.style.paddingTop = "";\n    };\n  }, [formSurface, showDateControl]);'''
new_effect = '''  useEffect(() => {\n    if (!formSurface) return;\n    if (showDateControl) {\n      formSurface.style.setProperty("--bixbo-log-date-offset", "36px");\n      formSurface.style.scrollPaddingTop = "36px";\n    } else {\n      formSurface.style.removeProperty("--bixbo-log-date-offset");\n      formSurface.style.scrollPaddingTop = "";\n    }\n    return () => {\n      formSurface.style.removeProperty("--bixbo-log-date-offset");\n      formSurface.style.scrollPaddingTop = "";\n    };\n  }, [formSurface, showDateControl]);'''
if old_effect not in log_sheet:
    raise SystemExit("LogSheet date spacing target not found")
log_sheet_path.write_text(log_sheet.replace(old_effect, new_effect, 1), encoding="utf-8")

primitives_path = Path("src/features/logging/LogFormPrimitives.tsx")
primitives = primitives_path.read_text(encoding="utf-8")
old_savebar = '''    <SheetFooter className="sticky top-0 z-30 -mx-5 mt-0 flex-row items-center justify-between gap-3 border-b border-border/50 bg-background/95 px-5 py-2 shadow-sm backdrop-blur">'''
new_savebar = '''    <SheetFooter\n      data-bixbo-log-save-bar\n      style={{ top: "var(--bixbo-log-date-offset, 0px)" }}\n      className="sticky z-30 -mx-5 mt-0 flex-row items-center justify-between gap-3 border-b border-border/50 bg-background/95 px-5 py-2 shadow-sm backdrop-blur"\n    >'''
if old_savebar not in primitives:
    raise SystemExit("Shared SaveBar target not found")
primitives_path.write_text(primitives.replace(old_savebar, new_savebar, 1), encoding="utf-8")

# Pain has its own standard and quick-symptom sticky action bars.
pain_path = Path("src/features/logging/PainWizard.tsx")
pain = pain_path.read_text(encoding="utf-8")
old_pain = 'className="sticky top-0 z-30 -mx-5 h-[60px]'
new_pain = 'style={{ top: "var(--bixbo-log-date-offset, 0px)" }} className="sticky z-30 -mx-5 h-[60px]'
if old_pain not in pain:
    raise SystemExit("Pain standard sticky navigation target not found")
pain = pain.replace(old_pain, new_pain, 1)
old_quick_pain = '<SheetFooter className="sticky top-0 order-first'
new_quick_pain = '<SheetFooter style={{ top: "var(--bixbo-log-date-offset, 0px)" }} className="sticky order-first'
if old_quick_pain not in pain:
    raise SystemExit("Pain quick-symptom sticky navigation target not found")
pain_path.write_text(pain.replace(old_quick_pain, new_quick_pain, 1), encoding="utf-8")

# Keep source-level architecture regressions aligned with the intentional CSS-variable offset.
ui_test_path = Path("src/lib/__tests__/ui-layout-architecture-regression.test.ts")
ui_test = ui_test_path.read_text(encoding="utf-8")
ui_test = ui_test.replace(
    "expect(pain).toContain('className=\"sticky top-0');",
    "expect(pain).toContain('style={{ top: \"var(--bixbo-log-date-offset, 0px)\" }} className=\"sticky');",
)
needle = '''  it("keeps shared log Save action touch-friendly", () => {\n    const source = readFileSync("src/features/logging/LogFormPrimitives.tsx", "utf8");\n    expect(source).toContain('h-10 min-w-[104px]');\n  });'''
replacement = '''  it("keeps shared log Save action touch-friendly", () => {\n    const source = readFileSync("src/features/logging/LogFormPrimitives.tsx", "utf8");\n    const shell = readFileSync("src/components/LogSheet.tsx", "utf8");\n    expect(source).toContain('h-10 min-w-[104px]');\n    expect(source).toContain('data-bixbo-log-save-bar');\n    expect(source).toContain('var(--bixbo-log-date-offset, 0px)');\n    expect(shell).not.toContain('formSurface.style.paddingTop = showDateControl ? "36px" : ""');\n    expect(shell).toContain('formSurface.style.setProperty("--bixbo-log-date-offset", "36px")');\n  });'''
if needle not in ui_test:
    raise SystemExit("UI layout regression target not found")
ui_test_path.write_text(ui_test.replace(needle, replacement, 1), encoding="utf-8")

pain_test_path = Path("src/lib/__tests__/pain-ios-layout-regression.test.ts")
pain_test = pain_test_path.read_text(encoding="utf-8")
old_standard_expect = '''    expect(painWizard).toContain('className="sticky top-0 z-30 -mx-5 h-[60px]');'''
new_standard_expect = '''    expect(painWizard).toContain('style={{ top: "var(--bixbo-log-date-offset, 0px)" }} className="sticky z-30 -mx-5 h-[60px]');'''
if old_standard_expect not in pain_test:
    raise SystemExit("Pain iOS standard action-bar regression target not found")
pain_test = pain_test.replace(old_standard_expect, new_standard_expect, 1)
old_quick_expect = '''    expect(painWizard).toContain('<SheetFooter className="sticky top-0 order-first');'''
new_quick_expect = '''    expect(painWizard).toContain('<SheetFooter style={{ top: "var(--bixbo-log-date-offset, 0px)" }} className="sticky order-first');'''
if old_quick_expect not in pain_test:
    raise SystemExit("Pain iOS quick action-bar regression target not found")
pain_test_path.write_text(pain_test.replace(old_quick_expect, new_quick_expect, 1), encoding="utf-8")

forensic_test_path = Path("src/lib/__tests__/forensic-performance-fixes-regression.test.ts")
forensic_test = forensic_test_path.read_text(encoding="utf-8")
old_forensic_expect = '''    expect(logSheet).toContain("formSurface.style.paddingTop");'''
new_forensic_expect = '''    expect(logSheet).toContain('formSurface.style.setProperty("--bixbo-log-date-offset", "36px")');\n    expect(logSheet).not.toContain("formSurface.style.paddingTop");'''
if old_forensic_expect not in forensic_test:
    raise SystemExit("Forensic LogSheet spacing regression target not found")
forensic_test_path.write_text(forensic_test.replace(old_forensic_expect, new_forensic_expect, 1), encoding="utf-8")
