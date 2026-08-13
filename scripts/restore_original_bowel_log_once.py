from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    if old not in text:
        raise SystemExit(f"Expected block not found in {path}: {old[:160]!r}")
    path.write_text(text.replace(old, new, 1))


root = Path("src/features/logging/LogSheetRootV2.tsx")
replace_once(
    root,
    'import { MedsForm } from "./MedsWorkoutForms";\n',
    'import { MedsForm } from "./MedsWorkoutForms";\nimport { BowelForm } from "./LifestyleForms";\n',
)
replace_once(root, '  EnhancedBowelForm,\n', '')
replace_once(
    root,
    '{renderActive === "bowel" && <EnhancedBowelForm date={date} data={data} update={update} onDone={close} initialEntry={edit as BowelEntry | undefined} />}',
    '{renderActive === "bowel" && <BowelForm date={date} data={data} update={update} onDone={close} initialEntry={edit as BowelEntry | undefined} />}',
)

lifestyle = Path("src/features/logging/LifestyleForms.tsx")
replace_once(
    lifestyle,
    '  const [bristol, setBristol] = useState<number>(initialEntry?.bristol ?? 4);\n',
    '  const [bristol, setBristol] = useState<number | null>(initialEntry?.bristol ?? null);\n',
)
replace_once(
    lifestyle,
    '  const save = () => {\n    const editing = !!initialEntry;\n    const entry: BowelEntry = {\n      id: initialEntry?.id ?? schema?.sourceEntryId ?? crypto.randomUUID(),\n      time,\n      bristol,\n',
    '  const save = () => {\n    if (bristol == null && urinary.length === 0 && feelings.length === 0 && symptoms.length === 0 && !note.trim()) return;\n    const editing = !!initialEntry;\n    const entry: BowelEntry = {\n      id: initialEntry?.id ?? schema?.sourceEntryId ?? crypto.randomUUID(),\n      time,\n      // Urinary-only entries must not invent a stool type. -1 is the existing "No bowel movement" sentinel.\n      bristol: bristol ?? -1,\n',
)
