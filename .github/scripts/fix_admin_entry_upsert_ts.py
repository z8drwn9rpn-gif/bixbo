from pathlib import Path
p=Path('src/components/LogSheet.tsx')
s=p.read_text()
old='''      const legacyIndex = linkedIndex < 0 && editSourceId && editSourceTime\n        ? existing.findLastIndex((entry) => !entry.sourceEntryId && entry.time === editSourceTime)\n        : -1;\n'''
new='''      let legacyIndex = -1;\n      if (linkedIndex < 0 && editSourceId && editSourceTime) {\n        for (let index = existing.length - 1; index >= 0; index -= 1) {\n          const entry = existing[index];\n          if (!entry.sourceEntryId && entry.time === editSourceTime) {\n            legacyIndex = index;\n            break;\n          }\n        }\n      }\n'''
assert old in s
p.write_text(s.replace(old,new))
