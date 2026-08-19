from pathlib import Path


def rep(path: str, old: str, new: str, count: int = 1) -> None:
    file = Path(path)
    text = file.read_text()
    if new in text:
        return
    if old not in text:
        raise RuntimeError(f"Missing anchor in {path}: {old[:160]!r}")
    file.write_text(text.replace(old, new, count))


# Day Overview: surface Eyes as its own full episode card.
rep(
    "src/components/home/DayOverview.tsx",
    'import { DayOverviewSexCard } from "@/components/home/DayOverviewSexCard";',
    'import { DayOverviewSexCard } from "@/components/home/DayOverviewSexCard";\nimport { DayOverviewEyesCard } from "@/components/home/DayOverviewEyesCard";',
)
rep(
    "src/components/home/DayOverview.tsx",
    "        log.panic?.length ||\n        log.period ||",
    "        log.panic?.length ||\n        log.eyes?.length ||\n        log.period ||",
)
rep(
    "src/components/home/DayOverview.tsx",
    "      {!cycleTrackingHidden &&\n        !!(",
    '''      <DayOverviewEyesCard
        entries={log?.eyes ?? []}
        date={date}
        update={update}
      />

      {!cycleTrackingHidden &&
        !!(''',
)

# Bixbo Note: add a first-class Recipes tab. Regular notes stay separate.
rep(
    "src/routes/notes.tsx",
    'import { NoteEditor } from "./notes-editor";',
    'import { NoteEditor } from "./notes-editor";\nimport { RecipesView } from "@/features/notes/RecipesView";',
)
rep(
    "src/routes/notes.tsx",
    'type NotesView = "all" | "folders" | "archived";',
    'type NotesView = "all" | "recipes" | "folders" | "archived";',
)
rep(
    "src/routes/notes.tsx",
    '      .filter((note) => {\n        if (screen === "archived") {',
    '      .filter((note) => {\n        if (note.kind === "recipe") return false;\n        if (screen === "archived") {',
)
rep(
    "src/routes/notes.tsx",
    '      right={\n        <button',
    '      right={screen === "recipes" && !openFolder ? undefined : (\n        <button',
)
rep(
    "src/routes/notes.tsx",
    '        </button>\n      }\n    >',
    '        </button>\n      )}\n    >',
)
rep(
    "src/routes/notes.tsx",
    '        <div className="relative">\n          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />',
    '        {screen !== "recipes" && (\n          <div className="relative">\n            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />',
)
rep(
    "src/routes/notes.tsx",
    '          )}\n        </div>\n\n        {!openFolder && (',
    '          )}\n          </div>\n        )}\n\n        {!openFolder && (',
)
rep(
    "src/routes/notes.tsx",
    '          <div className="grid grid-cols-3 gap-1 rounded-2xl bg-tint p-1 ring-1 ring-border/60">',
    '          <div className="grid grid-cols-4 gap-1 rounded-2xl bg-tint p-1 ring-1 ring-border/60">',
)
rep(
    "src/routes/notes.tsx",
    '              { key: "all" as const, label: "Notes" },\n              { key: "folders" as const, label: "Folders" },',
    '              { key: "all" as const, label: "Notes" },\n              { key: "recipes" as const, label: "Recipes" },\n              { key: "folders" as const, label: "Folders" },',
)
rep(
    "src/routes/notes.tsx",
    '        {screen === "folders" && !openFolder ? (',
    '        {screen === "recipes" && !openFolder ? (\n          <RecipesView data={view} update={update} />\n        ) : screen === "folders" && !openFolder ? (',
)
rep(
    "src/routes/notes.tsx",
    'const count = safeNotebook.filter((note) => note.folderId === folder.id && !note.archived).length;',
    'const count = safeNotebook.filter((note) => note.kind !== "recipe" && note.folderId === folder.id && !note.archived).length;',
)

print("Eyes and Recipes wiring complete")
