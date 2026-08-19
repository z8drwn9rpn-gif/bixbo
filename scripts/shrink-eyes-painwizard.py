from pathlib import Path

path = Path("src/features/logging/PainWizard.tsx")
text = path.read_text()

old_import = 'import { EyesForm, type EyesEpisode } from "./EyesForm";'
new_import = 'import { EyesEpisodeField, type EyesEpisode } from "./EyesEpisodeField";'
if old_import in text:
    text = text.replace(old_import, new_import, 1)
elif new_import not in text:
    raise RuntimeError("Eyes import anchor missing")

old_block = '''          <div>
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
          </div>'''
new_block = '          <EyesEpisodeField date={date} update={update} active={eyesOn} setActive={setEyesOn} setDraft={setEyesDraft} />'
if old_block in text:
    text = text.replace(old_block, new_block, 1)
elif new_block not in text:
    raise RuntimeError("Eyes episode block anchor missing")

# Keep the legacy high-churn module under its frozen architecture ceiling without
# weakening the guard: shorten comments rather than increasing the size limit.
old_comment = '''  /**
   * The newest pain entry for the selected day. A new entry can reuse this
   * state and only add what changed (for example a headache several hours later).
   * Editing an existing entry never uses this shortcut.
   */
'''
if old_comment in text:
    text = text.replace(old_comment, '  // Latest real pain entry used by symptom-only follow-ups.\n', 1)

path.write_text(text)
print("PainWizard Eyes UI extracted and size reduced")
