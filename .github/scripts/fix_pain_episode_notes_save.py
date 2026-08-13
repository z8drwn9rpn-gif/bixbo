from pathlib import Path


def must_replace(text: str, old: str, new: str, label: str, count: int = 1) -> str:
    if old not in text:
        raise SystemExit(f"matcher not found: {label}")
    return text.replace(old, new, count)

# 1) Storage: separate notes for each inline Pain episode.
p = Path('src/lib/storage/types.ts')
s = p.read_text()
s = must_replace(s, '  hotFlashes?: number;\n', '  hotFlashes?: number;\n  hotFlashesNote?: string;\n', 'hot flashes note type')
s = must_replace(s, '  headacheMedTime?: string;\n', '  headacheMedTime?: string;\n  headacheNote?: string;\n', 'headache note type')
s = must_replace(s, '  nauseaHelped?: string[];\n', '  nauseaHelped?: string[];\n  nauseaNote?: string;\n', 'nausea note type')
p.write_text(s)

# 2) Embedded Tetany/Panic forms: no nested Save bar; emit draft to parent PainWizard.
p = Path('src/features/logging/EpisodeForms.tsx')
s = p.read_text()
s = must_replace(
    s,
    'export function PanicForm({ date, data, update, onDone, initialEntry }: { date: string; data: BixboData; update: UpdateFn; onDone: () => void; initialEntry?: PanicAttack; }) {',
    'export function PanicForm({ date, data, update, onDone, initialEntry, embedded = false, onDraftChange }: { date: string; data: BixboData; update: UpdateFn; onDone: () => void; initialEntry?: PanicAttack; embedded?: boolean; onDraftChange?: (entry: PanicAttack) => void; }) {',
    'panic signature',
)
s = must_replace(
    s,
    '  const [note, setNote] = useState(initialEntry?.note ?? "");\n  const addHelped',
    '  const [note, setNote] = useState(initialEntry?.note ?? "");\n  const draftId = useRef(initialEntry?.id ?? schema?.sourceEntryId ?? crypto.randomUUID()).current;\n  const panicDraft = useMemo<PanicAttack>(() => ({\n    id: draftId, time,\n    minutes: ongoing ? undefined : minutes === "" ? undefined : Number(minutes), intensity, physical, cognitive,\n    trigger: trigger.trim(), place: place.trim() || undefined, hyperventilation: hyper, tetanyPresent, helped,\n    rescueMed: rescueMed.trim() || undefined, note: note.trim() || undefined,\n  }), [draftId, time, ongoing, minutes, intensity, physical, cognitive, trigger, place, hyper, tetanyPresent, helped, rescueMed, note]);\n  useEffect(() => { if (embedded) onDraftChange?.(panicDraft); }, [embedded, onDraftChange, panicDraft]);\n  const addHelped',
    'panic draft',
)
s = must_replace(
    s,
    '    const p: PanicAttack = {\n      id: initialEntry?.id ?? schema?.sourceEntryId ?? crypto.randomUUID(), time,\n      minutes: ongoing ? undefined : minutes === "" ? undefined : Number(minutes), intensity, physical, cognitive,\n      trigger: trigger.trim(), place: place.trim() || undefined, hyperventilation: hyper, tetanyPresent, helped,\n      rescueMed: rescueMed.trim() || undefined, note: note.trim() || undefined,\n    };',
    '    const p = panicDraft;',
    'panic save uses draft',
)
s = must_replace(s, '      <SaveBar onCancel={onDone} onSave={save} />', '      {!embedded && <SaveBar onCancel={onDone} onSave={save} />}', 'panic embedded savebar', 1)

s = must_replace(
    s,
    'export function TetanyForm({ date, data, update, onDone, initialEntry }: { date: string; data: BixboData; update: UpdateFn; onDone: () => void; initialEntry?: TetanyEpisode; }) {',
    'export function TetanyForm({ date, data, update, onDone, initialEntry, embedded = false, onDraftChange }: { date: string; data: BixboData; update: UpdateFn; onDone: () => void; initialEntry?: TetanyEpisode; embedded?: boolean; onDraftChange?: (entry: TetanyEpisode) => void; }) {',
    'tetany signature',
)
s = must_replace(
    s,
    '  const [note, setNote] = useState(initialEntry?.note ?? "");\n  type CK =',
    '  const [note, setNote] = useState(initialEntry?.note ?? "");\n  const draftId = useRef(initialEntry?.id ?? schema?.sourceEntryId ?? crypto.randomUUID()).current;\n  const tetanyDraft = useMemo<TetanyEpisode>(() => ({\n    id: draftId, time, types, location: loc, intensity,\n    minutes: ongoing ? undefined : minutes === "" ? undefined : Number(minutes),\n    triggers, helped, rescueMed: rescueMed.trim() || undefined, note: note.trim() || undefined,\n  }), [draftId, time, types, loc, intensity, ongoing, minutes, triggers, helped, rescueMed, note]);\n  useEffect(() => { if (embedded) onDraftChange?.(tetanyDraft); }, [embedded, onDraftChange, tetanyDraft]);\n  type CK =',
    'tetany draft',
)
s = must_replace(
    s,
    '    const entry: TetanyEpisode = { id: initialEntry?.id ?? schema?.sourceEntryId ?? crypto.randomUUID(), time, types, location: loc, intensity, minutes: ongoing ? undefined : minutes === "" ? undefined : Number(minutes), triggers, helped, rescueMed: rescueMed.trim() || undefined, note: note.trim() || undefined };',
    '    const entry = tetanyDraft;',
    'tetany save uses draft',
)
s = must_replace(s, '      <SaveBar onCancel={onDone} onSave={save} />', '      {!embedded && <SaveBar onCancel={onDone} onSave={save} />}', 'tetany embedded savebar', 1)
p.write_text(s)

# 3) PainWizard: independent episode toggles, notes per episode, and one final Pain save.
p = Path('src/features/logging/PainWizard.tsx')
s = p.read_text()
s = must_replace(
    s,
    '  const [episodeMode, setEpisodeMode] = useState<"tetany" | "panic" | null>(null);',
    '  const [tetanyOn, setTetanyOn] = useState(false);\n  const [panicOn, setPanicOn] = useState(false);\n  const [tetanyDraft, setTetanyDraft] = useState<TetanyEpisode | undefined>();\n  const [panicDraft, setPanicDraft] = useState<PanicAttack | undefined>();',
    'pain episode state',
)
s = must_replace(s, '  const [hotFlashes, setHotFlashes] = useState<number | undefined>(initialEntry?.hotFlashes);', '  const [hotFlashes, setHotFlashes] = useState<number | undefined>(initialEntry?.hotFlashes);\n  const [hotFlashesNote, setHotFlashesNote] = useState(initialEntry?.hotFlashesNote ?? "");', 'hot note state')
s = must_replace(s, '  const [headacheMedTime, setHeadacheMedTime] = useState<string>(initialEntry?.headacheMedTime ?? nowHHMM());', '  const [headacheMedTime, setHeadacheMedTime] = useState<string>(initialEntry?.headacheMedTime ?? nowHHMM());\n  const [headacheNote, setHeadacheNote] = useState(initialEntry?.headacheNote ?? "");', 'head note state')
s = must_replace(s, '  const [nauseaHelped, setNauseaHelped] = useState<string[]>((initialEntry?.nauseaHelped ?? []).map(stripEmoji));', '  const [nauseaHelped, setNauseaHelped] = useState<string[]>((initialEntry?.nauseaHelped ?? []).map(stripEmoji));\n  const [nauseaNote, setNauseaNote] = useState(initialEntry?.nauseaNote ?? "");', 'nausea note state')

s = must_replace(s, '    setHotFlashes(undefined);', '    setHotFlashes(undefined);\n    setHotFlashesNote("");', 'reset hot note')
s = must_replace(s, '    setNauseaHelped([]);', '    setNauseaHelped([]);\n    setNauseaNote("");', 'reset nausea note', 1)
s = must_replace(s, '    setHeadacheMedTime(nowHHMM());', '    setHeadacheMedTime(nowHHMM());\n    setHeadacheNote("");\n    setTetanyOn(false);\n    setPanicOn(false);\n    setTetanyDraft(undefined);\n    setPanicDraft(undefined);', 'reset headache and episode drafts')

s = must_replace(s, '      hotFlashes: hotFlashesOn ? hotFlashes : undefined,', '      hotFlashes: hotFlashesOn ? hotFlashes : undefined,\n      hotFlashesNote: hotFlashesOn && hotFlashesNote.trim() ? hotFlashesNote.trim() : undefined,', 'save hot note')
s = must_replace(s, '      headacheMedTime: headache && headacheMedOn && headacheMed.trim() ? headacheMedTime : undefined,', '      headacheMedTime: headache && headacheMedOn && headacheMed.trim() ? headacheMedTime : undefined,\n      headacheNote: headache && headacheNote.trim() ? headacheNote.trim() : undefined,', 'save head note')
s = must_replace(s, '      nauseaHelped: nausea && nauseaHelped.length ? [...new Set(nauseaHelped.map(stripEmoji))] : undefined,', '      nauseaHelped: nausea && nauseaHelped.length ? [...new Set(nauseaHelped.map(stripEmoji))] : undefined,\n      nauseaNote: nausea && nauseaNote.trim() ? nauseaNote.trim() : undefined,', 'save nausea note')

old_update = '''    updateDayLog(update, date, (l) => ({\n      ...l,\n      pain: editing ? (l.pain ?? []).map((x) => (x.id === p.id ? p : x)) : [...(l.pain ?? []), p],\n    }));'''
new_update = '''    updateDayLog(update, date, (l) => ({\n      ...l,\n      pain: editing ? (l.pain ?? []).map((x) => (x.id === p.id ? p : x)) : [...(l.pain ?? []), p],\n      tetany: tetanyOn && tetanyDraft ? [...(l.tetany ?? []), tetanyDraft] : l.tetany,\n      panic: panicOn && panicDraft ? [...(l.panic ?? []), panicDraft] : l.panic,\n    }));'''
s = must_replace(s, old_update, new_update, 'single pain save includes episode drafts')

# Headache note field.
s = must_replace(
    s,
    '                </Field>\n              </div>\n            )}\n          </div>\n          <Field label="Nausea?">',
    '                </Field>\n                <Field label="Note (optional)"><Textarea rows={2} value={headacheNote} onChange={(e) => setHeadacheNote(e.target.value)} placeholder={t("Headache note…")} /></Field>\n              </div>\n            )}\n          </div>\n          <Field label="Nausea?">',
    'headache note UI',
)
# Clear nausea note when switching No.
s = must_replace(s, '                  setNauseaHelped([]);\n                }}', '                  setNauseaHelped([]);\n                  setNauseaNote("");\n                }}', 'nausea no clears note')
# Nausea note UI at end of nausea card.
s = must_replace(
    s,
    '              <Field label="Relieved by">\n                <CustomChipList',
    '              <Field label="Relieved by">\n                <CustomChipList',
    'nausea anchor noop',
)
s = must_replace(
    s,
    '                  onToggle={(v) => setNauseaHelped((a) => toggleIn(a, v))}\n                />\n              </Field>\n            </div>\n          )}\n          <Field label="Hot flashes?">',
    '                  onToggle={(v) => setNauseaHelped((a) => toggleIn(a, v))}\n                />\n              </Field>\n              <Field label="Note (optional)"><Textarea rows={2} value={nauseaNote} onChange={(e) => setNauseaNote(e.target.value)} placeholder={t("Nausea note…")} /></Field>\n            </div>\n          )}\n          <Field label="Hot flashes?">',
    'nausea note UI',
)
# Hot flashes no clears note and expanded block contains note.
s = must_replace(s, '<Chip active={!hotFlashesOn} onClick={() => setHotFlashesOn(false)}>', '<Chip active={!hotFlashesOn} onClick={() => { setHotFlashesOn(false); setHotFlashes(undefined); setHotFlashesNote(""); }}>', 'hot no clears')
s = must_replace(
    s,
    '''          {hotFlashesOn && (\n            <Field label={`Hot flashes intensity ${hotFlashes ?? "-"}/5`}>\n              <IntensityScale\n                value={hotFlashes ?? 0}\n                onChange={(n) => setHotFlashes(hotFlashes === n ? undefined : n)}\n                max={5}\n                from={1}\n                step={1}\n                descriptions={getScaleDesc(data, "hotFlashes")}\n                legendTitle="Hot flashes scale"\n                compactSingleRow\n              />\n            </Field>\n          )}''',
    '''          {hotFlashesOn && (\n            <div className="rounded-2xl border border-border p-3 space-y-3">\n              <Field label={`Hot flashes intensity ${hotFlashes ?? "-"}/5`}>\n                <IntensityScale\n                  value={hotFlashes ?? 0}\n                  onChange={(n) => setHotFlashes(hotFlashes === n ? undefined : n)}\n                  max={5}\n                  from={1}\n                  step={1}\n                  descriptions={getScaleDesc(data, "hotFlashes")}\n                  legendTitle="Hot flashes scale"\n                  compactSingleRow\n                />\n              </Field>\n              <Field label="Note (optional)"><Textarea rows={2} value={hotFlashesNote} onChange={(e) => setHotFlashesNote(e.target.value)} placeholder={t("Hot flashes note…")} /></Field>\n            </div>\n          )}''',
    'hot note UI',
)

# Replace exclusive episodeMode UI with independent toggles + embedded draft forms.
s = must_replace(
    s,
    '''                <Chip active={episodeMode !== "tetany"} onClick={() => episodeMode === "tetany" && setEpisodeMode(null)}>\n                  No\n                </Chip>\n                <Chip active={episodeMode === "tetany"} onClick={() => setEpisodeMode("tetany")}>\n                  Yes — log it\n                </Chip>''',
    '''                <Chip active={!tetanyOn} onClick={() => { setTetanyOn(false); setTetanyDraft(undefined); }}>\n                  No\n                </Chip>\n                <Chip active={tetanyOn} onClick={() => setTetanyOn(true)}>\n                  Yes — log it\n                </Chip>''',
    'tetany toggle UI',
)
s = must_replace(
    s,
    '''            {episodeMode === "tetany" && (\n              <div className="mt-3 rounded-2xl border border-border p-3">\n                <LogSchemaContext.Provider value={null}>\n                  <TetanyForm date={date} data={data} update={update} onDone={() => setEpisodeMode(null)} />\n                </LogSchemaContext.Provider>\n              </div>\n            )}''',
    '''            {tetanyOn && (\n              <div className="mt-3 rounded-2xl border border-border p-3">\n                <LogSchemaContext.Provider value={null}>\n                  <TetanyForm date={date} data={data} update={update} onDone={() => setTetanyOn(false)} embedded onDraftChange={setTetanyDraft} />\n                </LogSchemaContext.Provider>\n              </div>\n            )}''',
    'tetany embedded form',
)
s = must_replace(
    s,
    '''                <Chip active={episodeMode !== "panic"} onClick={() => episodeMode === "panic" && setEpisodeMode(null)}>\n                  No\n                </Chip>\n                <Chip active={episodeMode === "panic"} onClick={() => setEpisodeMode("panic")}>\n                  Yes — log it\n                </Chip>''',
    '''                <Chip active={!panicOn} onClick={() => { setPanicOn(false); setPanicDraft(undefined); }}>\n                  No\n                </Chip>\n                <Chip active={panicOn} onClick={() => setPanicOn(true)}>\n                  Yes — log it\n                </Chip>''',
    'panic toggle UI',
)
s = must_replace(
    s,
    '''            {episodeMode === "panic" && (\n              <div className="mt-3 rounded-2xl border border-border p-3">\n                <LogSchemaContext.Provider value={null}>\n                  <PanicForm date={date} data={data} update={update} onDone={() => setEpisodeMode(null)} />\n                </LogSchemaContext.Provider>\n              </div>\n            )}''',
    '''            {panicOn && (\n              <div className="mt-3 rounded-2xl border border-border p-3">\n                <LogSchemaContext.Provider value={null}>\n                  <PanicForm date={date} data={data} update={update} onDone={() => setPanicOn(false)} embedded onDraftChange={setPanicDraft} />\n                </LogSchemaContext.Provider>\n              </div>\n            )}''',
    'panic embedded form',
)
p.write_text(s)

# 4) Overview: same small text size for general Note + show episode-specific notes.
p = Path('src/components/home/DayOverview.tsx')
s = p.read_text()
s = must_replace(
    s,
    '{p.nauseaHelped?.length ? (\n                    <p className="text-xs leading-relaxed text-muted-foreground">\n                      <span className="font-semibold text-foreground">{t("Relieved by")}:</span> {p.nauseaHelped.map(t).join(", ")}\n                    </p>\n                  ) : null}',
    '{p.nauseaHelped?.length ? (\n                    <p className="text-xs leading-relaxed text-muted-foreground">\n                      <span className="font-semibold text-foreground">{t("Relieved by")}:</span> {p.nauseaHelped.map(t).join(", ")}\n                    </p>\n                  ) : null}\n                  {p.nauseaNote ? <p className="text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Nausea note")}:</span> {p.nauseaNote}</p> : null}',
    'overview nausea note',
)
s = must_replace(
    s,
    '                  {p.hotFlashes != null && (\n                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">\n                      <span className="font-semibold text-foreground">{t("Hot flashes")}:</span>{" "}{p.hotFlashes}/5\n                    </p>\n                  )}',
    '                  {p.hotFlashes != null && (\n                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">\n                      <span className="font-semibold text-foreground">{t("Hot flashes")}:</span>{" "}{p.hotFlashes}/5\n                    </p>\n                  )}\n                  {p.hotFlashesNote ? <p className="text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Hot flashes note")}:</span> {p.hotFlashesNote}</p> : null}',
    'overview hot note',
)
s = must_replace(
    s,
    '                  {p.headacheMed ? (',
    '                  {p.headacheNote ? <p className="text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Headache note")}:</span> {p.headacheNote}</p> : null}\n                  {p.headacheMed ? (',
    'overview headache note',
)
s = must_replace(
    s,
    '                  {p.note && <p className="mt-2 text-sm whitespace-pre-line"><span className="font-semibold">{t("Note")}:</span> {p.note}</p>}',
    '                  {p.note && <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Note")}:</span> {p.note}</p>}',
    'overview pain note typography',
)
# Symptom update overview notes too.
s = s.replace(
    '{entry.nausea || entry.nauseaSeverity != null || entry.nauseaTypes?.length ? (\n                                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Nausea")}:</span>{entry.nauseaSeverity != null ? ` ${entry.nauseaSeverity}/10` : ""}{entry.nauseaTypes?.length ? ` · ${entry.nauseaTypes.map(t).join(", ")}` : ""}</p>\n                              ) : null}',
    '{entry.nausea || entry.nauseaSeverity != null || entry.nauseaTypes?.length ? (\n                                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Nausea")}:</span>{entry.nauseaSeverity != null ? ` ${entry.nauseaSeverity}/10` : ""}{entry.nauseaTypes?.length ? ` · ${entry.nauseaTypes.map(t).join(", ")}` : ""}</p>\n                              ) : null}\n                              {entry.nauseaNote ? <p className="text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Nausea note")}:</span> {entry.nauseaNote}</p> : null}'
)
s = s.replace(
    '{entry.headache || entry.headacheIntensity != null || entry.headacheTypes?.length ? (\n                                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Headache")}:</span>{entry.headacheIntensity != null ? ` ${entry.headacheIntensity}/10` : ""}{entry.headacheTypes?.length ? ` · ${entry.headacheTypes.map(t).join(", ")}` : ""}</p>\n                              ) : null}',
    '{entry.headache || entry.headacheIntensity != null || entry.headacheTypes?.length ? (\n                                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Headache")}:</span>{entry.headacheIntensity != null ? ` ${entry.headacheIntensity}/10` : ""}{entry.headacheTypes?.length ? ` · ${entry.headacheTypes.map(t).join(", ")}` : ""}</p>\n                              ) : null}\n                              {entry.headacheNote ? <p className="text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Headache note")}:</span> {entry.headacheNote}</p> : null}'
)
s = s.replace(
    '{entry.hotFlashesOn || entry.hotFlashes != null ? <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Hot flashes")}:</span>{entry.hotFlashes != null ? ` ${entry.hotFlashes}/5` : ""}</p> : null}',
    '{entry.hotFlashesOn || entry.hotFlashes != null ? <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Hot flashes")}:</span>{entry.hotFlashes != null ? ` ${entry.hotFlashes}/5` : ""}</p> : null}\n                              {entry.hotFlashesNote ? <p className="text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Hot flashes note")}:</span> {entry.hotFlashesNote}</p> : null}'
)
p.write_text(s)
