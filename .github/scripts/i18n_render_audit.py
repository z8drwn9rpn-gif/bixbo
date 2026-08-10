from pathlib import Path
import re

SKIP_PARTS = {"/ui/", "/icons/"}
ATTRS = ("placeholder", "aria-label", "title", "alt")

for p in sorted(Path("src").rglob("*.tsx")):
    rel = "/" + p.as_posix()
    if any(part in rel for part in SKIP_PARTS):
        continue
    lines = p.read_text(errors="ignore").splitlines()
    hits = []
    for i, raw in enumerate(lines, 1):
        line = raw.strip()
        if not line or line.startswith("//"):
            continue
        # direct string attrs e.g. placeholder="English text"
        for attr in ATTRS:
            m = re.search(rf'{attr}="([^"{{}}]*[A-Za-z][^"{{}}]*)"', line)
            if m:
                hits.append((i, f"ATTR {attr}: {m.group(1)}", line))
        # plain JSX text between tags, ignore obvious brand/unit/technical-only values
        for m in re.finditer(r'>\s*([^<>{}]*[A-Za-z][^<>{}]*)\s*<', line):
            text = re.sub(r'\s+', ' ', m.group(1)).strip()
            if not text:
                continue
            if text in {"BIXBO", "TENS", "JSON", "CSV", "kg", "ml", "mg", "OAuth", "Supabase", "Web Push", "Aa"}:
                continue
            hits.append((i, f"TEXT: {text}", line))
    if hits:
        print(f"\n### {p.as_posix()} ({len(hits)})")
        for i, kind, src in hits:
            print(f"{i}: {kind} :: {src}")
