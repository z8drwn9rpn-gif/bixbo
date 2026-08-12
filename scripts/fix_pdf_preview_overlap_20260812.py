from pathlib import Path

p = Path('src/routes/report.tsx')
s = p.read_text()

old = '''        {style === "soft" ? <SoftReport title={title} days={days} meds={view.meds} avgPain={avgPain} loggedDays={loggedDays} locale={locale} /> : null}\n        {style === "dashboard" ? <DashboardReport title={title} days={days} avgPain={avgPain} loggedDays={loggedDays} /> : null}\n        {style === "journal" ? <JournalReport title={title} days={days} locale={locale} /> : null}\n        {style === "clinical" ? <ClinicalReport title={title} days={days} meds={view.meds} avgPain={avgPain} loggedDays={loggedDays} locale={locale} /> : null}'''

new = '''        <div className="pdf-preview-content pt-3">\n          {style === "soft" ? <SoftReport title={title} days={days} meds={view.meds} avgPain={avgPain} loggedDays={loggedDays} locale={locale} /> : null}\n          {style === "dashboard" ? <DashboardReport title={title} days={days} avgPain={avgPain} loggedDays={loggedDays} /> : null}\n          {style === "journal" ? <JournalReport title={title} days={days} locale={locale} /> : null}\n          {style === "clinical" ? <ClinicalReport title={title} days={days} meds={view.meds} avgPain={avgPain} loggedDays={loggedDays} locale={locale} /> : null}\n        </div>'''

# Replace only the preview occurrence (last occurrence in the file).
idx = s.rfind(old)
if idx == -1:
    raise SystemExit('preview report block not found')
s = s[:idx] + new + s[idx + len(old):]

# Extra visual gap beneath sticky toolbar, preview only. Keep exported canvas clean by targeting wrapper only.
s = s.replace('.pdf-preview-toolbar{', '.pdf-preview-content{padding-top:12px}.pdf-preview-toolbar{') if '.pdf-preview-toolbar{' in s and '.pdf-preview-content{' not in s else s

p.write_text(s)
print('patched PDF preview overlap')
