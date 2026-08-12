from pathlib import Path
p=Path('src/routes/index.tsx')
s=p.read_text()
needle='import { layoutOrder } from "@/lib/layoutRegistry";\n'
if 'isAdminOwnerAccount' not in s:
    s=s.replace(needle, needle+'import { isAdminOwnerAccount } from "@/lib/deviceAdmin";\n',1)
s=s.replace('''      {!maleMode && (\n        <div style={{ order: layoutOrder(view, "home", "birthControl", 20) }}>''','''      {!maleMode && isAdminOwnerAccount() && (\n        <div style={{ order: layoutOrder(view, "home", "birthControl", 20) }}>''',1)
s=s.replace('''      {!maleMode && hakOpen && hakAnchor && (\n        <BirthControlOverlay''','''      {!maleMode && isAdminOwnerAccount() && hakOpen && hakAnchor && (\n        <BirthControlOverlay''',1)
p.write_text(s)
