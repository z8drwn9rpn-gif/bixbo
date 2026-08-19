from pathlib import Path


def rep(path: str, old: str, new: str, count: int = 1) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise RuntimeError(f"Missing anchor in {path}: {old[:120]!r}")
    file.write_text(text.replace(old, new, count))


# Storage model.
rep(
    "src/lib/storage/types.ts",
    "export interface ThermoSession {",
    '''export interface EyesEpisode {
  id: string;
  time: string;
  affected: "left" | "right" | "both";
  painWithMovement: boolean;
  visionChanges: string[];
  note?: string;
}

export interface ThermoSession {''',
)
rep(
    "src/lib/storage/types.ts",
    "  panic?: PanicAttack[];\n  heat?: ThermoSession[];",
    "  panic?: PanicAttack[];\n  eyes?: EyesEpisode[];\n  heat?: ThermoSession[];",
)
rep(
    "src/lib/storage/types.ts",
    "export interface Note {",
    '''export type RecipeCategory = "baking" | "cooking" | "spreads" | "other";
export type RecipeStatus = "ready" | "draft" | "needs-review";

export interface RecipeSection {
  title?: string;
  items: string[];
}

export interface RecipeData {
  category: RecipeCategory;
  ingredientSections: RecipeSection[];
  method: string[];
  notes?: string[];
  prepMinutes?: number;
  cookMinutes?: number;
  temperatureC?: number;
  portions?: string;
  favorite?: boolean;
  status?: RecipeStatus;
  sourceNoteId?: string;
  /** Verbatim source block retained so an import can always be audited. */
  sourceText?: string;
  /** Source lines the conservative importer could not classify safely. */
  unassignedText?: string[];
}

export interface Note {''',
)
rep(
    "src/lib/storage/types.ts",
    "  content: string;\n  checklist?: NoteChecklistItem[];",
    '''  content: string;
  /** Recipes share the synced notebook store but render in their own Recipes view. */
  kind?: "note" | "recipe";
  recipe?: RecipeData;
  checklist?: NoteChecklistItem[];''',
)
rep(
    "src/lib/storage/types.ts",
    "      panic?: PanicAttack[];\n      tetany?: TetanyEpisode[];\n      extraMeds?: ExtraMed[];",
    "      panic?: PanicAttack[];\n      tetany?: TetanyEpisode[];\n      eyes?: EyesEpisode[];\n      extraMeds?: ExtraMed[];",
)

# Migration/sync/day-presence awareness.
rep(
    "src/lib/storage/migrations.ts",
    '      "panic",\n      "heat",',
    '      "panic",\n      "eyes",\n      "heat",',
)
rep(
    "src/lib/merge.ts",
    '  "panic",\n  "heat",',
    '  "panic",\n  "eyes",\n  "heat",',
)
rep(
    "src/lib/storage/utilities.ts",
    "    l.panic?.length ||\n    l.heat?.length ||",
    "    l.panic?.length ||\n    l.eyes?.length ||\n    l.heat?.length ||",
)

# Pain -> Episodes.
rep(
    "src/features/logging/PainWizard.tsx",
    "  type TetanyEpisode,\n  type PanicAttack,\n  type PainfulWhen,",
    "  type TetanyEpisode,\n  type PanicAttack,\n  type EyesEpisode,\n  type PainfulWhen,",
)
rep(
    "src/features/logging/PainWizard.tsx",
    'import { PanicForm, TetanyForm } from "./EpisodeForms";',
    'import { PanicForm, TetanyForm } from "./EpisodeForms";\nimport { EyesForm } from "./EyesForm";',
)
rep(
    "src/features/logging/PainWizard.tsx",
    "  const [tetanyOn, setTetanyOn] = useState(false);\n  const [panicOn, setPanicOn] = useState(false);\n  const [tetanyDraft, setTetanyDraft] = useState<TetanyEpisode | undefined>();\n  const [panicDraft, setPanicDraft] = useState<PanicAttack | undefined>();",
    "  const [tetanyOn, setTetanyOn] = useState(false);\n  const [panicOn, setPanicOn] = useState(false);\n  const [eyesOn, setEyesOn] = useState(false);\n  const [tetanyDraft, setTetanyDraft] = useState<TetanyEpisode | undefined>();\n  const [panicDraft, setPanicDraft] = useState<PanicAttack | undefined>();\n  const [eyesDraft, setEyesDraft] = useState<EyesEpisode | undefined>();",
)
rep(
    "src/features/logging/PainWizard.tsx",
    "    setTetanyOn(false);\n    setPanicOn(false);\n    setTetanyDraft(undefined);\n    setPanicDraft(undefined);",
    "    setTetanyOn(false);\n    setPanicOn(false);\n    setEyesOn(false);\n    setTetanyDraft(undefined);\n    setPanicDraft(undefined);\n    setEyesDraft(undefined);",
)
rep(
    "src/features/logging/PainWizard.tsx",
    "      tetany: tetanyOn && tetanyDraft ? [...(l.tetany ?? []), tetanyDraft] : l.tetany,\n      panic: panicOn && panicDraft ? [...(l.panic ?? []), panicDraft] : l.panic,\n    }));",
    "      tetany: tetanyOn && tetanyDraft ? [...(l.tetany ?? []), tetanyDraft] : l.tetany,\n      panic: panicOn && panicDraft ? [...(l.panic ?? []), panicDraft] : l.panic,\n      eyes: eyesOn && eyesDraft ? [...(l.eyes ?? []), eyesDraft] : l.eyes,\n    }));",
)
rep(
    "src/features/logging/PainWizard.tsx",
    '''          </div>
        </div>
      )}

      {activePainStepId === "details" && (''',
    '''          </div>

          <div>
            <Field label="Eyes?">
              <div className="mt-1 flex gap-2">
                <Chip active={!eyesOn} onClick={() => { setEyesOn(false); setEyesDraft(undefined); }}>
                  No
                </Chip>
                <Chip active={eyesOn} onClick={() => setEyesOn(true)}>
                  Yes — log it
                </Chip>
              </div>
            </Field>
            {eyesOn && (
              <div className="mt-3 rounded-2xl border border-border p-3">
                <LogSchemaContext.Provider value={null}>
                  <EyesForm
                    date={date}
                    update={update}
                    onDone={() => setEyesOn(false)}
                    embedded
                    onDraftChange={setEyesDraft}
                  />
                </LogSchemaContext.Provider>
              </div>
            )}
          </div>
        </div>
      )}

      {activePainStepId === "details" && (''',
)

# Overview card.
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
        onEdit={(entry) => onEdit?.("eyes", entry)}
      />

      {!cycleTrackingHidden &&
        !!(''',
)

# Episode edit sheet.
rep(
    "src/features/home/EpisodePainEditSheet.tsx",
    'import { PanicForm, TetanyForm } from "@/features/logging/EpisodeForms";',
    'import { PanicForm, TetanyForm } from "@/features/logging/EpisodeForms";\nimport { EyesForm } from "@/features/logging/EyesForm";',
)
rep(
    "src/features/home/EpisodePainEditSheet.tsx",
    "  type BixboData,\n  type PanicAttack,\n  type TetanyEpisode,",
    "  type BixboData,\n  type EyesEpisode,\n  type PanicAttack,\n  type TetanyEpisode,",
)
rep(
    "src/features/home/EpisodePainEditSheet.tsx",
    'export type EpisodeEditTarget =\n  | { kind: "tetany"; entry: TetanyEpisode }\n  | { kind: "panic"; entry: PanicAttack };',
    'export type EpisodeEditTarget =\n  | { kind: "tetany"; entry: TetanyEpisode }\n  | { kind: "panic"; entry: PanicAttack }\n  | { kind: "eyes"; entry: EyesEpisode };',
)
rep(
    "src/features/home/EpisodePainEditSheet.tsx",
    "  const [draft, setDraft] = useState<TetanyEpisode | PanicAttack | null>(target?.entry ?? null);",
    "  const [draft, setDraft] = useState<TetanyEpisode | PanicAttack | EyesEpisode | null>(target?.entry ?? null);",
)
rep(
    "src/features/home/EpisodePainEditSheet.tsx",
    '''      const next = draft as PanicAttack;
      return {
        ...log,
        panic: (log.panic ?? []).map((entry) => (entry.id === target.entry.id ? next : entry)),
      };''',
    '''      if (target.kind === "eyes") {
        const next = draft as EyesEpisode;
        return {
          ...log,
          eyes: (log.eyes ?? []).map((entry) => (entry.id === target.entry.id ? next : entry)),
        };
      }

      const next = draft as PanicAttack;
      return {
        ...log,
        panic: (log.panic ?? []).map((entry) => (entry.id === target.entry.id ? next : entry)),
      };''',
)
rep(
    "src/features/home/EpisodePainEditSheet.tsx",
    '<Ico e={target.kind === "tetany" ? "⭐" : "✨"} size={14} />\n                <span>{t(target.kind === "tetany" ? "Tetany" : "Panic attack")}</span>',
    '<Ico e={target.kind === "tetany" ? "⭐" : target.kind === "panic" ? "✨" : "👁️"} size={14} />\n                <span>{t(target.kind === "tetany" ? "Tetany" : target.kind === "panic" ? "Panic attack" : "Eyes")}</span>',
)
rep(
    "src/features/home/EpisodePainEditSheet.tsx",
    '''                  {target.kind === "tetany" ? (
                    <TetanyForm
                      key={`tetany:${target.entry.id}`}
                      date={date}
                      data={data}
                      update={update}
                      onDone={close}
                      initialEntry={target.entry}
                      embedded
                      onDraftChange={setDraft}
                    />
                  ) : (
                    <PanicForm
                      key={`panic:${target.entry.id}`}
                      date={date}
                      data={data}
                      update={update}
                      onDone={close}
                      initialEntry={target.entry}
                      embedded
                      onDraftChange={setDraft}
                    />
                  )}''',
    '''                  {target.kind === "tetany" ? (
                    <TetanyForm
                      key={`tetany:${target.entry.id}`}
                      date={date}
                      data={data}
                      update={update}
                      onDone={close}
                      initialEntry={target.entry}
                      embedded
                      onDraftChange={setDraft}
                    />
                  ) : target.kind === "panic" ? (
                    <PanicForm
                      key={`panic:${target.entry.id}`}
                      date={date}
                      data={data}
                      update={update}
                      onDone={close}
                      initialEntry={target.entry}
                      embedded
                      onDraftChange={setDraft}
                    />
                  ) : (
                    <EyesForm
                      key={`eyes:${target.entry.id}`}
                      date={date}
                      update={update}
                      onDone={close}
                      initialEntry={target.entry}
                      embedded
                      onDraftChange={setDraft}
                    />
                  )}''',
)

# Home routes Eyes into the episode edit sheet.
rep(
    "src/features/home/HomePage.tsx",
    "  type EventEntry,\n  type PanicAttack,\n  type TetanyEpisode,",
    "  type EventEntry,\n  type EyesEpisode,\n  type PanicAttack,\n  type TetanyEpisode,",
)
rep(
    "src/features/home/HomePage.tsx",
    '''    if (cat === "panic") {
      setEpisodeEdit({ kind: "panic", entry: entry as PanicAttack });
      return;
    }
    setEpisodeEdit(null);''',
    '''    if (cat === "panic") {
      setEpisodeEdit({ kind: "panic", entry: entry as PanicAttack });
      return;
    }
    if (cat === "eyes") {
      setEpisodeEdit({ kind: "eyes", entry: entry as EyesEpisode });
      return;
    }
    setEpisodeEdit(null);''',
)

# Notes -> Recipes tab.
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

print("Eyes + Recipes integration applied")
