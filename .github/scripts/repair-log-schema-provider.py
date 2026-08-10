from pathlib import Path
p = Path('src/components/LogSheet.tsx')
s = p.read_text()
# Remove any provider tags inserted at the wrong structural location.
s = s.replace('            <LogSchemaContext.Provider value={active ? { data, featureId: active as RegistryFeatureId } : null}>\n', '')
s = s.replace('            </LogSchemaContext.Provider>\n', '')
# Insert provider immediately before the active form scroll container.
needle = '''            <div
              key={`${active}-${openToken}-${(edit as { id?: string } | undefined)?.id ?? initialPain?.id ?? "new"}`}
'''
if needle not in s:
    raise SystemExit('active form container not found')
s = s.replace(needle, '''            <LogSchemaContext.Provider value={active ? { data, featureId: active as RegistryFeatureId } : null}>
''' + needle, 1)
# Close provider after the active form container and before the parent flex container.
needle2 = '''              {active === "note" && <NoteForm date={date} update={update} onDone={close} />}
            </div>
          </div>
        )}
'''
if needle2 not in s:
    raise SystemExit('active form close block not found')
s = s.replace(needle2, '''              {active === "note" && <NoteForm date={date} update={update} onDone={close} />}
            </div>
            </LogSchemaContext.Provider>
          </div>
        )}
''', 1)
p.write_text(s)
