from pathlib import Path

p=Path('src/routes/index.tsx')
s=p.read_text(encoding='utf-8')

def ensure_hook(func_name: str, hook='const { t } = useI18n();'):
    global s
    idx=s.find(f'function {func_name}(')
    if idx<0: raise RuntimeError(f'{func_name} not found')
    body=s.find('}) {', idx)
    if body>=0:
        insert=body+4
    else:
        body=s.find(') {', idx)
        if body<0: raise RuntimeError(f'{func_name} body not found')
        insert=body+3
    if 'useI18n()' not in s[insert:insert+250]:
        s=s[:insert]+'\n  '+hook+s[insert:]

ensure_hook('BirthControlOverlay')
ensure_hook('ShareDayButton', 'const { t, language } = useI18n();')

# Translate the remaining obvious Birth Control overlay labels while this scope is being fixed.
s=s.replace('{isPlacebo ? "Placebo" : "Active"}', '{isPlacebo ? t("Placebo") : t("Active")}')
s=s.replace('              Birth control overview\n', '              {t("Birth control overview")}\n')

# Localize Share Day date label; the rest of share text can keep the selected app language fallback behavior.
s=s.replace('fromKey(date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })', 'fromKey(date).toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", { weekday: "long", day: "numeric", month: "long" })')

p.write_text(s, encoding='utf-8')

# Add exact SK keys if absent.
ip=Path('src/lib/i18n.ts')
i=ip.read_text(encoding='utf-8')
keys={'Placebo':'Placebo','Active':'Aktívna'}
pos=i.rfind('\n};')
for k,v in keys.items():
    if f'  "{k}":' not in i:
        i=i[:pos]+f'\n  "{k}": "{v}",' + i[pos:]
        pos=i.rfind('\n};')
ip.write_text(i, encoding='utf-8')
print('final index scopes fixed')
