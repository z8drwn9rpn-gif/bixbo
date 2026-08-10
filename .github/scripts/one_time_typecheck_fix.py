from pathlib import Path
import re


def replace_once(path: str, old: str, new: str, required: bool = True) -> None:
    p = Path(path)
    s = p.read_text()
    if old not in s:
        if required:
            raise RuntimeError(f"Expected text not found in {path}: {old[:100]!r}")
        return
    p.write_text(s.replace(old, new, 1))


def ensure_hook(path: str, func_name: str) -> None:
    p = Path(path)
    s = p.read_text()
    idx = s.find(f"function {func_name}(")
    if idx < 0:
        raise RuntimeError(f"Function not found: {func_name} in {path}")
    candidates = [x for x in (s.find("}) {", idx), s.find(") {", idx)) if x >= 0]
    if not candidates:
        raise RuntimeError(f"Body opener not found: {func_name}")
    body = min(candidates)
    opener_len = 4 if s.startswith("}) {", body) else 3
    insert = body + opener_len
    if "useI18n()" not in s[insert:insert + 180]:
        s = s[:insert] + "\n  const { t } = useI18n();" + s[insert:]
        p.write_text(s)


# LogSheet.tsx
log = "src/components/LogSheet.tsx"
for fn in ("TempForm", "EventForm", "TaskForm"):
    ensure_hook(log, fn)

p = Path(log)
s = p.read_text()
old = '''function NoteForm({ date, update, onDone }: { date: string; update: UpdateFn; onDone: () => void }) {
  const [t, setT] = useState("");'''
new = '''function NoteForm({ date, update, onDone }: { date: string; update: UpdateFn; onDone: () => void }) {
  const { t } = useI18n();
  const [text, setText] = useState("");'''
if old in s:
    s = s.replace(old, new, 1)
    s = s.replace("if (!t.trim()) return;", "if (!text.trim()) return;", 1)
    s = s.replace("next.push({ text: t.trim(), time: time || undefined });", "next.push({ text: text.trim(), time: time || undefined });", 1)
    s = s.replace("disabled={!t.trim()}", "disabled={!text.trim()}", 1)
    s = s.replace('value={t} onChange={(e) => setT(e.target.value)} placeholder={t("Anything about today…")}', 'value={text} onChange={(e) => setText(e.target.value)} placeholder={t("Anything about today…")}', 1)
    p.write_text(s)

# MonthCalendar.tsx
replace_once(
    "src/components/MonthCalendar.tsx",
    "const lines = daySummaryLines(data.dayLogs[peek], cycleTrackingHidden);",
    "const lines = daySummaryLines(data.dayLogs[peek], cycleTrackingHidden, t);",
)

# insights.tsx
p = Path("src/routes/insights.tsx")
s = p.read_text()
old = '''    const t = topOf(tetanyBlocks, tetanyTotal);
    const p = topOf(panicBlocks, panicTotal);
    const blockName = (i: number) => t(TIME_BLOCK_SHORT[i]);'''
new = '''    const tetanyTop = topOf(tetanyBlocks, tetanyTotal);
    const panicTop = topOf(panicBlocks, panicTotal);
    const blockName = (i: number) => t(TIME_BLOCK_SHORT[i]);'''
if old not in s:
    raise RuntimeError("Insights collision block not found")
s = s.replace(old, new, 1)
for a, b in {
    "if (t && p) {": "if (tetanyTop && panicTop) {",
    "blockName(t.i)": "blockName(tetanyTop.i)",
    "blockHours(t.i)": "blockHours(tetanyTop.i)",
    "${t.pct}": "${tetanyTop.pct}",
    "blockName(p.i)": "blockName(panicTop.i)",
    "blockHours(p.i)": "blockHours(panicTop.i)",
    "${p.pct}": "${panicTop.pct}",
    "if (t) return `Tetánia": "if (tetanyTop) return `Tetánia",
    "if (p) return `Panické": "if (panicTop) return `Panické",
    "if (t) return `Tetany": "if (tetanyTop) return `Tetany",
    "if (p) return `Panic": "if (panicTop) return `Panic",
}.items():
    s = s.replace(a, b)
p.write_text(s)

# patterns.tsx
replace_once(
    "src/routes/patterns.tsx",
    '<ConfidenceBadge level={t(String(confidence.level))} detail={confidence.detail} />',
    '<ConfidenceBadge level={confidence.level} detail={confidence.detail} />',
)
p = Path("src/routes/patterns.tsx")
s = p.read_text()
app_idx = s.find('<AppShell title={t("Health of Bixbo")}>')
if app_idx >= 0:
    funcs = list(re.finditer(r"function\s+\w+\([^)]*\)\s*\{", s[:app_idx]))
    if funcs:
        body = funcs[-1].end()
        if "useI18n()" not in s[body:app_idx]:
            s = s[:body] + "\n  const { t } = useI18n();" + s[body:]
            p.write_text(s)

# pregnancy.tsx
for fn in ("RecentBP", "RecentBS"):
    ensure_hook("src/routes/pregnancy.tsx", fn)
p = Path("src/routes/pregnancy.tsx")
s = p.read_text()
s = s.replace('window.confirm("Delete this blood pressure entry?")', 'window.confirm(t("Delete this blood pressure entry?"))')
s = s.replace('window.confirm("Delete this blood sugar entry?")', 'window.confirm(t("Delete this blood sugar entry?"))')
p.write_text(s)

# i18n.ts — keep the last occurrence of duplicated top-level quoted keys.
p = Path("src/lib/i18n.ts")
lines = p.read_text().splitlines()
indices = {}
for i, line in enumerate(lines):
    m = re.match(r'^  "([^"]+)":\s*', line)
    if m:
        indices.setdefault(m.group(1), []).append(i)
drop = {i for positions in indices.values() if len(positions) > 1 for i in positions[:-1]}
lines = [line for i, line in enumerate(lines) if i not in drop]
s = "\n".join(lines) + "\n"
for key, value in (
    ("Delete this blood pressure entry?", "Vymazať tento záznam krvného tlaku?"),
    ("Delete this blood sugar entry?", "Vymazať tento záznam cukru v krvi?"),
):
    if f'  "{key}":' not in s:
        pos = s.rfind("\n};")
        s = s[:pos] + f'\n  "{key}": "{value}",' + s[pos:]
p.write_text(s)

# Exact checks for the reported errors.
assert "const [t, setT]" not in Path(log).read_text()
assert "daySummaryLines(data.dayLogs[peek], cycleTrackingHidden);" not in Path("src/components/MonthCalendar.tsx").read_text()
assert "const t = topOf(tetanyBlocks" not in Path("src/routes/insights.tsx").read_text()
assert "level={t(String(confidence.level))}" not in Path("src/routes/patterns.tsx").read_text()
