from pathlib import Path

source_path = Path("scripts/apply-eyes-recipes.py")
source = source_path.read_text()
old = '''    if old not in text:\n        raise RuntimeError(f"Missing anchor in {path}: {old[:120]!r}")\n    file.write_text(text.replace(old, new, count))\n'''
new = '''    if old not in text:\n        if new in text:\n            return\n        raise RuntimeError(f"Missing anchor in {path}: {old[:120]!r}")\n    file.write_text(text.replace(old, new, count))\n'''
if old not in source:
    raise RuntimeError("Could not locate codemod helper")
source = source.replace(old, new, 1)
exec(compile(source, str(source_path), "exec"), {"__name__": "__main__"})
