from pathlib import Path

root = Path('src/features/logging/LogSheetRoot.tsx')
s = root.read_text()
old = '''              data-bixbo-log-surface={active === "pain" ? "pain" : "standard"}
              className={`min-h-0 flex-1 overflow-y-auto ${
                active === "pain" ? "pt-[60px]" : "bixbo-unified-log px-4 pb-5 sm:px-5"
              }`}
'''
new = '''              data-bixbo-log-surface={active === "pain" ? "pain" : "standard"}
              className={`min-h-0 flex-1 overflow-y-auto bg-background ${
                active === "pain" ? "pt-[60px] pb-[env(safe-area-inset-bottom)]" : "bixbo-unified-log px-4 pb-[calc(20px+env(safe-area-inset-bottom))] sm:px-5"
              }`}
'''
if old not in s:
    raise SystemExit('log scroll wrapper block not found')
root.write_text(s.replace(old, new, 1))

styles = Path('src/styles.css')
css = styles.read_text()
marker = '/* Keep active log surfaces green through the iPhone bottom safe area. */'
block = '''\n\n/* Keep active log surfaces green through the iPhone bottom safe area. */\n[data-bixbo-log-surface] {\n  background: var(--background);\n  min-height: 0;\n}\n\n[data-bixbo-log-surface]::after {\n  content: "";\n  display: block;\n  height: env(safe-area-inset-bottom);\n  background: var(--background);\n  pointer-events: none;\n}\n'''
if marker not in css:
    css += block
styles.write_text(css)
