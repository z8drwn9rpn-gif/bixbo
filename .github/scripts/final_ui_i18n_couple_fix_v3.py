from pathlib import Path
import re

p = Path("src/lib/i18n.ts")
s = p.read_text()
start_marker = 'const SK: Record<string, string> = {'
end_marker = '\n};\n\nconst TRANSLATIONS:'
start = s.index(start_marker) + len(start_marker)
end = s.index(end_marker, start)
body = s[start:end]
lines = body.splitlines()

# Support both quote styles. Keep the last occurrence so the newest intended
# translation wins, and report exactly what was removed.
positions = {}
for i, line in enumerate(lines):
    m = re.match(r"^\s*(['\"])(.*?)\1\s*:", line)
    if m:
        positions.setdefault(m.group(2), []).append(i)

duplicates = {key: rows for key, rows in positions.items() if len(rows) > 1}
print("SK duplicate keys before cleanup:", duplicates)
drop = {row for rows in duplicates.values() for row in rows[:-1]}
cleaned = '\n'.join(line for i, line in enumerate(lines) if i not in drop)
s = s[:start] + cleaned + s[end:]
p.write_text(s)

# Verify no simple quoted duplicate remains.
positions = {}
for i, line in enumerate(cleaned.splitlines()):
    m = re.match(r"^\s*(['\"])(.*?)\1\s*:", line)
    if m:
        positions.setdefault(m.group(2), []).append(i)
remaining = {key: rows for key, rows in positions.items() if len(rows) > 1}
if remaining:
    raise RuntimeError(f"Remaining SK duplicates: {remaining}")
print("SK duplicate cleanup complete")
