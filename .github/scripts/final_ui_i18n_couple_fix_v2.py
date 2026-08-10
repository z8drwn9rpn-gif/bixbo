from pathlib import Path
import re

# Fix locale helper that lives outside a React hook scope. The popup itself still
# uses the selected app locale; this helper remains locale-neutral.
p = Path("src/routes/index.tsx")
s = p.read_text()
s = s.replace(
    'const shortDate = fromKey(key).toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", { day: "numeric", month: "short" });',
    'const shortDate = fromKey(key).toLocaleDateString("en-GB", { day: "numeric", month: "short" });',
    1,
)

# The old Share Day loop used `t` as the TetanyEpisode variable. After translating
# "ongoing", that shadows the translation function; rename only this loop.
old = '''      for (const t of log.tetany)
        lines.push(
          `  • ${t.time} · ${t.types.join(", ")} · ${t.intensity}/5 · ${t.minutes == null ? t("ongoing") : `${t.minutes}min`}`,
        );'''
new = '''      for (const tetanyEntry of log.tetany)
        lines.push(
          `  • ${tetanyEntry.time} · ${tetanyEntry.types.map(t).join(", ")} · ${tetanyEntry.intensity}/5 · ${tetanyEntry.minutes == null ? t("ongoing") : `${tetanyEntry.minutes}min`}`,
        );'''
if old not in s:
    raise RuntimeError("Expected translated Share Day tetany loop not found")
s = s.replace(old, new, 1)
p.write_text(s)

# Remove accidental duplicates only inside the SK object, keeping the last value.
p = Path("src/lib/i18n.ts")
s = p.read_text()
start_marker = 'const SK: Record<string, string> = {'
end_marker = '\n};\n\nconst TRANSLATIONS:'
start = s.index(start_marker) + len(start_marker)
end = s.index(end_marker, start)
body = s[start:end]
lines = body.splitlines()
key_positions = {}
for i, line in enumerate(lines):
    m = re.match(r'^\s*"((?:[^"\\]|\\.)+)"\s*:', line)
    if m:
        key_positions.setdefault(m.group(1), []).append(i)
drop = {i for positions in key_positions.values() if len(positions) > 1 for i in positions[:-1]}
body = '\n'.join(line for i, line in enumerate(lines) if i not in drop)
s = s[:start] + body + s[end:]
p.write_text(s)

print("Applied final UI patch validation corrections")
