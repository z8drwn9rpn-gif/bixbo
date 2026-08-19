from pathlib import Path

path = Path("src/features/home/HomePage.tsx")
text = path.read_text()
text = text.replace('import { DayOverviewEyesCard } from "@/components/home/DayOverviewEyesCard";\n', '', 1)
text = text.replace('          <DayOverviewEyesCard entries={view.dayLogs[selected]?.eyes ?? []} date={selected} update={update} />\n', '', 1)
path.write_text(text)
print("Removed duplicate Eyes overview render")
