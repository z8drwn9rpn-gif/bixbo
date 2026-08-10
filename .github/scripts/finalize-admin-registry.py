from pathlib import Path

# Admin UI: translate remaining labels and add native desktop drag/drop.
p = Path('src/routes/admin.tsx')
s = p.read_text()
s = s.replace('  const [tab, setTab] = useState<AdminTab>("logs");', '  const [tab, setTab] = useState<AdminTab>("logs");\n  const [dragged, setDragged] = useState<RegistryFeatureId | null>(null);', 1)
move_anchor = '''  const move = (id: RegistryFeatureId, delta: -1 | 1) => {
    const index = features.findIndex((feature) => feature.id === id);
    const other = features[index + delta];
    const current = features[index];
    if (!current || !other) return;
    patchFeature(current.id, { order: other.order });
    patchFeature(other.id, { order: current.order });
  };
'''
move_new = move_anchor + '''
  const moveTo = (targetId: RegistryFeatureId) => {
    if (!dragged || dragged === targetId) return;
    const sourceIndex = features.findIndex((feature) => feature.id === dragged);
    const targetIndex = features.findIndex((feature) => feature.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const reordered = [...features];
    const [source] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, source);
    reordered.forEach((feature, index) => patchFeature(feature.id, { order: (index + 1) * 10 }));
    setDragged(null);
  };
'''
if move_anchor not in s:
    raise SystemExit('admin move anchor missing')
s = s.replace(move_anchor, move_new, 1)
s = s.replace('<section key={feature.id} className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80">', '<section\n                key={feature.id}\n                draggable\n                onDragStart={() => setDragged(feature.id)}\n                onDragEnd={() => setDragged(null)}\n                onDragOver={(event) => event.preventDefault()}\n                onDrop={() => moveTo(feature.id)}\n                className={`rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80 lg:cursor-grab ${dragged === feature.id ? "opacity-60" : ""}`}\n              >', 1)
s = s.replace('>Monthly</button>', '>{t("Monthly")}</button>', 1)
s = s.replace('>Patterns</button>', '>{t("Patterns")}</button>', 1)
p.write_text(s)

# Add Slovak i18n keys before SK object closes (first `};` after `const SK`).
p = Path('src/lib/i18n.ts')
s = p.read_text()
keys = {
  'Admin mode': 'Režim správcu',
  'BIXBO Registry': 'Register BIXBO',
  'Change labels, icons, visibility and placement without editing source code. Historical data always keeps its stable ID.': 'Meň názvy, ikony, viditeľnosť a umiestnenie bez úpravy zdrojového kódu. Historické dáta si vždy zachovajú stabilné ID.',
  'Insights & graphs': 'Prehľad a grafy',
  'Display name': 'Zobrazovaný názov',
  'Enabled': 'Aktívne',
  'Hidden': 'Skryté',
  'Icon': 'Ikona',
  'Color': 'Farba',
  'Shown here': 'Zobrazené tu',
  'Hidden here': 'Skryté tu',
  'Monthly': 'Mesačne',
  'Move up': 'Posunúť vyššie',
  'Move down': 'Posunúť nižšie',
  'Reset': 'Obnoviť',
  'Safe delete policy': 'Bezpečné mazanie',
  'Admin mode never deletes historical health data. Use Hide to stop new logging. Stable IDs remain unchanged when you rename an item.': 'Režim správcu nikdy nemaže historické zdravotné dáta. Použi Skryť, ak nechceš položku ponúkať pri nových záznamoch. Pri premenovaní zostáva stabilné ID nezmenené.',
  'Configure logs, calendar, Quick Log and Insights without editing code': 'Nastav logy, kalendár, Rýchly záznam a Prehľad bez úpravy kódu',
}
start = s.find('const SK: Record<string, string> = {')
if start < 0:
    raise SystemExit('SK dictionary not found')
end = s.find('\n};', start)
if end < 0:
    raise SystemExit('SK dictionary end not found')
lines = []
for key, value in keys.items():
    marker = f'  {key!r}:'
    # dictionary uses JSON-style double quotes
    import json
    qkey = json.dumps(key, ensure_ascii=False)
    qvalue = json.dumps(value, ensure_ascii=False)
    if f'  {qkey}:' not in s[start:end]:
        lines.append(f'  {qkey}: {qvalue},')
if lines:
    s = s[:end] + '\n' + '\n'.join(lines) + s[end:]
p.write_text(s)

print('Admin registry finalized')
