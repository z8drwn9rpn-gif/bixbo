from pathlib import Path

p = Path('src/components/AppShell.tsx')
s = p.read_text()

s = s.replace('import { useEffect, useRef, useState, type ReactNode } from "react";\n', 'import { type ReactNode } from "react";\n', 1)
s = s.replace('import { useRouterState } from "@tanstack/react-router";\n', '', 1)

old_state = '''  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isFirst = useRef(true);
  const [fadeKey, setFadeKey] = useState(0);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    setFadeKey((k) => k + 1);
  }, [pathname]);

'''
if old_state not in s:
    raise SystemExit('AppShell route-fade state block not found')
s = s.replace(old_state, '', 1)

old_main = '''        <main
          key={fadeKey}
          id="main-content"
          className={`min-w-0 overflow-x-hidden${fadeKey > 0 ? " bixbo-page-fade" : ""}`}
        >
'''
new_main = '''        <main
          id="main-content"
          className="min-w-0 overflow-x-hidden"
        >
'''
if old_main not in s:
    raise SystemExit('AppShell animated main block not found')
s = s.replace(old_main, new_main, 1)

p.write_text(s)
