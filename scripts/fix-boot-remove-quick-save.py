from pathlib import Path

# Remove redundant quick-save actions from detailed Pain/Panic/Tetany forms.
p = Path('src/components/LogSheet.tsx')
s = p.read_text()

blocks = [
'''          {!initialEntry && !quickSymptomUpdate ? (\n            <div className="sticky top-0 z-20 w-full px-2 pb-1 bg-background/95 backdrop-blur">\n              <QuickSaveAction label="Save pain now — add details later" onSave={save} />\n            </div>\n          ) : null}\n''',
'''      <QuickSaveAction label="Save basic panic episode" onSave={save} />\n''',
'''      <QuickSaveAction label="Save basic tetany episode" onSave={save} />\n''',
]
for block in blocks:
    if block not in s:
        raise SystemExit(f'Expected quick-save block missing: {block[:80]!r}')
    s = s.replace(block, '', 1)

component_start = s.find('function QuickSaveAction(')
if component_start < 0:
    raise SystemExit('QuickSaveAction component not found')
component_end = s.find('\n\nfunction CustomChipList(', component_start)
if component_end < 0:
    raise SystemExit('QuickSaveAction component end not found')
s = s[:component_start] + s[component_end + 2:]
p.write_text(s)

# App boot: keep secrets out of Git, but public client config must be available when
# the deployment provider does not inject Vite env vars. These are publishable/public
# values only; environment variables still take precedence.
p = Path('src/integrations/supabase/client.ts')
s = p.read_text()
old = '''  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;\n  const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;\n'''
new = '''  const PUBLIC_SUPABASE_URL = "https://zvpfzfofhalmwrtipcsp.supabase.co";\n  const PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_3b9UmhEARkpHrhsfX0oziA_lWi0k57-";\n  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || PUBLIC_SUPABASE_URL;\n  const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || PUBLIC_SUPABASE_PUBLISHABLE_KEY;\n'''
if old not in s:
    raise SystemExit('Supabase env block not found')
s = s.replace(old, new, 1)
p.write_text(s)
