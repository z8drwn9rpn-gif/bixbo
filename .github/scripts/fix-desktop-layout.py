from pathlib import Path

patterns = Path('src/routes/patterns.tsx')
p = patterns.read_text()

replacements = [
    ('{!cycleTrackingHidden && activeTab === "cycle" && (\n          <div className="space-y-3">',
     '{!cycleTrackingHidden && activeTab === "cycle" && (\n          <div className="space-y-3 lg:contents">'),
    ('{activeTab === "monthly" && (\n          <div className="space-y-3">',
     '{activeTab === "monthly" && (\n          <div className="space-y-3 lg:contents">'),
    ('{activeTab === "treatment" && (\n          <div className="space-y-3">',
     '{activeTab === "treatment" && (\n          <div className="space-y-3 lg:contents">'),
    ('{activeTab === "triggers" && (\n          <div className="space-y-3">',
     '{activeTab === "triggers" && (\n          <div className="space-y-3 lg:contents">'),
]

for old, new in replacements:
    if old not in p:
        raise SystemExit(f'Patterns target not found: {old[:60]}')
    p = p.replace(old, new, 1)

# Trigger analysis range belongs above both desktop columns.
old = '{activeTab === "triggers" && <AnalysisRangeSelector value={analysisRange} onChange={setAnalysisRange} />}'
new = '{activeTab === "triggers" && (\n          <div className="lg:col-span-2">\n            <AnalysisRangeSelector value={analysisRange} onChange={setAnalysisRange} />\n          </div>\n        )}'
if old not in p:
    raise SystemExit('AnalysisRangeSelector target not found')
p = p.replace(old, new, 1)
patterns.write_text(p)

couple = Path('src/routes/couple.tsx')
c = couple.read_text()
old = '''          className="h-[206px] max-w-none"\n          style={{ width: `${width}px` }}'''
new = '''          className="h-[206px] w-full max-w-none"\n          style={{ minWidth: `${width}px` }}'''
if old not in c:
    raise SystemExit('Couple SVG width target not found')
c = c.replace(old, new, 1)
couple.write_text(c)

print('Desktop layout patch applied')
