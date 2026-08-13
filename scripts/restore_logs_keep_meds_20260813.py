from pathlib import Path
import subprocess

OLD_LOGS = "faf313dfca5382eddae5de559d87cd9e4f2a35c9"
GOOD_MEDS = "598fee6f8d53b826a9f52adf0d0e5324a80bc718"


def git_show(ref: str, path: str) -> str:
    return subprocess.check_output(["git", "show", f"{ref}:{path}"], text=True)


old = git_show(OLD_LOGS, "src/components/LogSheet.tsx")
meds_src = git_show(GOOD_MEDS, "src/features/logging/MedsWorkoutForms.tsx")

meds_start = meds_src.index("export function MedsForm(")
meds_end = meds_src.index("export function WorkoutForm(", meds_start)
meds_block = meds_src[meds_start:meds_end].rstrip()
meds_block = meds_block.replace("export function MedsForm(", "function MedsForm(", 1)

old_start_marker = "/* ------------------- MEDS ------------------- */"
old_end_marker = "/* ------------------- WORKOUT ------------------- */"
start = old.index(old_start_marker)
end = old.index(old_end_marker, start)
combined = old[:start] + old_start_marker + "\n" + meds_block + "\n\n" + old[end:]

# The Aug 12 monolith predates grouped scheduled-med support. Keep today's
# grouped-med helper import while leaving every other log exactly at Aug 12.
if "medScheduleItems," not in combined:
    anchor = "  painColor,\n"
    if anchor not in combined:
        raise RuntimeError("storage import anchor not found")
    combined = combined.replace(anchor, anchor + "  medScheduleItems,\n", 1)

Path("src/components/LogSheet.tsx").write_text(combined)

# Guardrails: prove the intended mix exists before committing.
text = Path("src/components/LogSheet.tsx").read_text()
required = [
    "function MedsForm(",
    "medScheduleItems(m)",
    "What did you take?",
    "medLogItems",
    "/* ------------------- WORKOUT ------------------- */",
]
for needle in required:
    if needle not in text:
        raise RuntimeError(f"missing expected Meds feature: {needle}")

print("Restored Aug 12 logs and preserved Aug 13 morning MedsForm")
