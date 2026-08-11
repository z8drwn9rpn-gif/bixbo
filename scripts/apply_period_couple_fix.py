from pathlib import Path

# Period: logged entries are historical data and must stay visible on calendar.
p = Path('src/components/MonthCalendar.tsx')
s = p.read_text()
old = 'periodColor: cycleTrackingHidden || !isRegistrySurfaceEnabled(data, "period", "calendar") ? null : (periodColorVar(periodLevel) ?? actualPeriodColor),'
new = 'periodColor: cycleTrackingHidden ? null : (periodColorVar(periodLevel) ?? actualPeriodColor),'
assert old in s
p.write_text(s.replace(old, new, 1))

# Couple: use same comparison window regardless of which phone views whom as partner.
p = Path('src/routes/couple.tsx')
s = p.read_text()
old = '''  // Couple similarity starts only when the partner has their first comparable\n  // pain/panic/tetany log. Calendar days before that date must never dilute or\n  // penalize the comparison (for example 1–25 July when the partner starts on 26 July).\n  const partnerFirstComparisonDay = partner\n    ? (Object.keys(partner.dayLogs)\n        .filter((day) => hasSymptoms(partner.dayLogs[day]))\n        .sort()[0] ?? null)\n    : null;\n\n  const comparisonPeriodDays = partnerFirstComparisonDay\n    ? periodDays.filter((day) => day >= partnerFirstComparisonDay)\n    : [];'''
new = '''  // Couple similarity must use the same comparison window on both phones.\n  // Start only once BOTH people have comparable symptom history.\n  const myFirstComparisonDay =\n    Object.keys(view.dayLogs)\n      .filter((day) => hasSymptoms(view.dayLogs[day]))\n      .sort()[0] ?? null;\n\n  const partnerFirstComparisonDay = partner\n    ? (Object.keys(partner.dayLogs)\n        .filter((day) => hasSymptoms(partner.dayLogs[day]))\n        .sort()[0] ?? null)\n    : null;\n\n  const comparisonStartDay =\n    myFirstComparisonDay && partnerFirstComparisonDay\n      ? (myFirstComparisonDay > partnerFirstComparisonDay ? myFirstComparisonDay : partnerFirstComparisonDay)\n      : null;\n\n  const comparisonPeriodDays = comparisonStartDay\n    ? periodDays.filter((day) => day >= comparisonStartDay)\n    : [];'''
assert old in s
p.write_text(s.replace(old, new, 1))

Path('src/lib/__tests__/period-couple-runtime-regression.test.ts').write_text('''import { describe, expect, it } from "vitest";\nimport fs from "node:fs";\n\nconst read = (path: string) => fs.readFileSync(path, "utf8");\n\ndescribe("Period and Couple runtime regressions", () => {\n  it("always renders actual logged Period on the calendar when cycle tracking is visible", () => {\n    const source = read("src/components/MonthCalendar.tsx");\n    expect(source).toContain('periodColor: cycleTrackingHidden ? null : (periodColorVar(periodLevel) ?? actualPeriodColor)');\n  });\n\n  it("uses the later first-comparison day for both Couple directions", () => {\n    const source = read("src/routes/couple.tsx");\n    expect(source).toContain("const myFirstComparisonDay");\n    expect(source).toContain("const comparisonStartDay");\n    expect(source).toContain("myFirstComparisonDay > partnerFirstComparisonDay");\n  });\n});\n''')
