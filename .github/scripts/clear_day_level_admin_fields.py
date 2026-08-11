from pathlib import Path

p = Path('src/components/LogSheet.tsx')
s = p.read_text()

old_period = '''          onClick={() => {\n            updateDayLog(update, date, (l) => {\n              const { period: _p, periodInfo: _pi, ...rest } = l;\n              void _p;\n              void _pi;\n              return rest;\n            });\n            onDone();\n          }}'''
new_period = '''          onClick={() => {\n            update((current) => {\n              const day = current.dayLogs[date] ?? {};\n              const { period: _p, periodInfo: _pi, ...rest } = day;\n              void _p;\n              void _pi;\n              const adminFields = { ...(rest.adminFields ?? {}) };\n              const periodAdmin = adminFields.period ?? [];\n              const nextPeriodAdmin = periodAdmin.filter((entry) => entry.sourceEntryId !== `day:period:${date}`);\n              if (nextPeriodAdmin.length) adminFields.period = nextPeriodAdmin;\n              else delete adminFields.period;\n              return {\n                ...current,\n                dayLogs: {\n                  ...current.dayLogs,\n                  [date]: { ...rest, adminFields: Object.keys(adminFields).length ? adminFields : undefined },\n                },\n              };\n            });\n            onDone();\n          }}'''
if old_period not in s:
    raise SystemExit('period delete marker not found')
s = s.replace(old_period, new_period, 1)

old_post = '''          onClick={() => {\n            updateDayLog(update, date, (dayLog) => ({\n              ...dayLog,\n              postpartum: {\n                ...(dayLog.postpartum ?? {}),\n                symptoms: undefined,\n                note: undefined,\n              },\n            }));\n            onDone();\n          }}'''
new_post = '''          onClick={() => {\n            update((current) => {\n              const dayLog = current.dayLogs[date] ?? {};\n              const adminFields = { ...(dayLog.adminFields ?? {}) };\n              const postpartumAdmin = adminFields.postpartum ?? [];\n              const nextPostpartumAdmin = postpartumAdmin.filter((entry) => entry.sourceEntryId !== `day:postpartum:${date}`);\n              if (nextPostpartumAdmin.length) adminFields.postpartum = nextPostpartumAdmin;\n              else delete adminFields.postpartum;\n              return {\n                ...current,\n                dayLogs: {\n                  ...current.dayLogs,\n                  [date]: {\n                    ...dayLog,\n                    postpartum: {\n                      ...(dayLog.postpartum ?? {}),\n                      symptoms: undefined,\n                      note: undefined,\n                    },\n                    adminFields: Object.keys(adminFields).length ? adminFields : undefined,\n                  },\n                },\n              };\n            });\n            onDone();\n          }}'''
if old_post not in s:
    raise SystemExit('postpartum clear marker not found')
s = s.replace(old_post, new_post, 1)

p.write_text(s)
print('cleared day-level admin fields with core delete actions')
