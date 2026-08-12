from pathlib import Path

old = Path("scripts/fix-add-symptoms-once.py").read_text()
old_block = '''s = replace_once(
    s,
    '<div className="flex items-center justify-between px-1 pb-3">\\n    <span className="rounded-full',
    '<div className="flex items-center justify-between px-1 pb-3 pt-[68px]">\\n    <span className="rounded-full',
    "quick header safe spacing",
)'''
new_block = '''s = replace_once(
    s,
    'className="flex items-center justify-between px-1 pb-3"',
    'className="flex items-center justify-between px-1 pb-3 pt-[68px]"',
    "quick header safe spacing",
)'''
if old_block not in old:
    raise SystemExit("Could not harden quick header replacement")
old = old.replace(old_block, new_block, 1)
exec(compile(old, "scripts/fix-add-symptoms-once.py", "exec"))
Path("scripts/fix-add-symptoms-once-v2.py").unlink(missing_ok=True)
