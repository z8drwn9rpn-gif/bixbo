from pathlib import Path

path = Path("src/features/notes/RecipesView.tsx")
text = path.read_text()
replacements = {
    '"nálev"': '"n\\u00e1lev"',
    '"na vrch (nutné)"': '"na vrch (nut\\u00e9)"',
    '"škoricová náplň"': '"\\u0161koricov\\u00e1 n\\u00e1pl\\u0148"',
    '"čokoládová poleva"': '"\\u010dokol\\u00e1dov\\u00e1 poleva"',
    r'/\bNATIERKY\b|\bNÁTIERKY\b|\bSPREADS\b/': r'/\bNATIERKY\b|\bN\u00c1TIERKY\b|\bSPREADS\b/',
    '"tvarovanie a pečenie"': '"tvarovanie a pe\\u010denie"',
    '"poznámky"': '"pozn\\u00e1mky"',
    r'/recept\s+(čoskoro|coskoro)|recipe\s+coming\s+soon/i': r'/recept\s+(\u010doskoro|coskoro)|recipe\s+coming\s+soon/i',
    r'/^(po|potom|nakoniec|môže|moze|podávame|podavame|dáme|dame|varíme|varime)\b/i': r'/^(po|potom|nakoniec|m\u00f4\u017ee|moze|pod\u00e1vame|podavame|d\u00e1me|dame|var\u00edme|varime)\b/i',
    r'/slnečnicov/i': r'/slne\u010dnicov/i',
}

for old, new in replacements.items():
    if old not in text:
        raise RuntimeError(f"Missing expected recipe parser literal: {old}")
    text = text.replace(old, new)

path.write_text(text)
print("Recipe parser Slovak literals encoded for English-source audit")
