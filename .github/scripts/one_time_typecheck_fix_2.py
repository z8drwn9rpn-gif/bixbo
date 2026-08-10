from pathlib import Path


def ensure_hook(path: str, func_name: str) -> None:
    p = Path(path)
    s = p.read_text()
    idx = s.find(f"function {func_name}(")
    if idx < 0:
        raise RuntimeError(f"Function not found: {func_name}")
    candidates = [x for x in (s.find("}) {", idx), s.find(") {", idx)) if x >= 0]
    body = min(candidates)
    opener_len = 4 if s.startswith("}) {", body) else 3
    insert = body + opener_len
    if "useI18n()" not in s[insert:insert + 180]:
        s = s[:insert] + "\n  const { t } = useI18n();" + s[insert:]
        p.write_text(s)


# Missing translation hooks in LogSheet helpers.
for fn in ("TetanyForm", "AddCustomInline", "FoodForm"):
    ensure_hook("src/components/LogSheet.tsx", fn)

# Pregnancy photo section uses t() in aria-labels.
ensure_hook("src/routes/pregnancy.tsx", "PhotosSection")

# Remove the later duplicate of Start writing…; keep the original escaped key earlier in SK.
p = Path("src/lib/i18n.ts")
s = p.read_text()
duplicate = '  "Start writing…": "Začni písať…",\n'
if s.count(duplicate) != 1:
    raise RuntimeError(f"Expected exactly one later duplicate line, found {s.count(duplicate)}")
s = s.replace(duplicate, "", 1)
p.write_text(s)

# Complete variable rename in the English Insights sentence.
p = Path("src/routes/insights.tsx")
s = p.read_text()
s = s.replace("TIME_BLOCK_SHORT[t.i]", "TIME_BLOCK_SHORT[tetanyTop.i]")
s = s.replace("TIME_BLOCK_SHORT[p.i]", "TIME_BLOCK_SHORT[panicTop.i]")
p.write_text(s)

assert "TIME_BLOCK_SHORT[t.i]" not in s
assert "TIME_BLOCK_SHORT[p.i]" not in s
