from pathlib import Path

p = Path("src/lib/i18n.ts")
s = p.read_text()
# The existing key is written as "Type 0 \\u2014 Mystery" in source. TypeScript
# treats that as the same property name as a literal em dash, so do not keep the
# newly added literal-key variant.
new_line = '  "Type 0 — Mystery": "Typ 0 — Neznáme",\n'
if new_line in s:
    s = s.replace(new_line, "", 1)
p.write_text(s)
print("Removed escaped-equivalent Type 0 translation duplicate")
