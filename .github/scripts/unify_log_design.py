from pathlib import Path

root = Path('src/features/logging/LogSheetRoot.tsx')
s = root.read_text()

old = '''          (active
            ? `fixed !inset-0 !left-0 !right-0 !top-0 !bottom-0 flex !h-[100svh] !max-h-[100svh] !w-full !max-w-none min-h-0 flex-col overflow-hidden !rounded-none !border-0 bg-background p-0 !shadow-none !transition-none !animate-none ${
                active === "pain" ? "pt-[env(safe-area-inset-top)]" : "pt-0"
              }`
'''
new = '''          (active
            ? `fixed !inset-0 !left-0 !right-0 !top-0 !bottom-0 flex !h-[100svh] !max-h-[100svh] !w-full !max-w-none min-h-0 flex-col overflow-hidden !rounded-none !border-0 bg-background p-0 pt-[env(safe-area-inset-top)] !shadow-none !transition-none !animate-none`
'''
if old not in s:
    raise SystemExit('active sheet block not found')
s = s.replace(old, new, 1)

old = '''            <SheetHeader
              className={`shrink-0 flex-row items-end justify-between gap-0 border-b border-border px-5 pb-2 ${
                active === "pain"
                  ? "h-14 pt-0"
                  : "h-[calc(40px+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)]"
              }`}
            >'''
new = '''            <SheetHeader className="h-14 shrink-0 flex-row items-end justify-between gap-0 border-b border-border px-5 pb-2 pt-0">'''
if old not in s:
    raise SystemExit('sheet header block not found')
s = s.replace(old, new, 1)

old = '''            <div
              key={`${active}-${openToken}-${(edit as { id?: string } | undefined)?.id ?? initialPain?.id ?? "new"}`}
              className={`min-h-0 flex-1 overflow-y-auto ${
                active === "pain" ? "pt-[60px]" : "px-5 pb-4"
              }`}
            >'''
new = '''            <div
              key={`${active}-${openToken}-${(edit as { id?: string } | undefined)?.id ?? initialPain?.id ?? "new"}`}
              data-bixbo-log-surface={active === "pain" ? "pain" : "standard"}
              className={`min-h-0 flex-1 overflow-y-auto ${
                active === "pain" ? "pt-[60px]" : "bixbo-unified-log px-4 pb-5 sm:px-5"
              }`}
            >'''
if old not in s:
    raise SystemExit('content wrapper block not found')
s = s.replace(old, new, 1)

s = s.replace('className="mx-auto flex w-full max-w-md flex-col gap-4 py-4"', 'className="bixbo-log-flow mx-auto flex w-full max-w-xl flex-col gap-4 py-4"')

root.write_text(s)

styles = Path('src/styles.css')
css = styles.read_text()
marker = '/* BIXBO unified log design — Pain log is the visual reference. */'
block = r'''

/* BIXBO unified log design — Pain log is the visual reference. */
.bixbo-unified-log {
  --bixbo-log-control-h: 44px;
  --bixbo-log-radius: 18px;
  --bixbo-log-gap: 14px;
  scroll-padding-top: 54px;
  overscroll-behavior-y: contain;
}

.bixbo-unified-log > * {
  width: 100%;
  max-width: 40rem;
  margin-inline: auto;
}

.bixbo-unified-log .bixbo-log-flow,
.bixbo-unified-log > div:not([role="dialog"]) {
  gap: var(--bixbo-log-gap);
}

.bixbo-unified-log section {
  border-color: color-mix(in srgb, var(--border) 78%, transparent);
}

.bixbo-unified-log [data-bixbo-log-field-id] {
  padding-block: 2px;
}

.bixbo-unified-log [data-bixbo-log-field-id] > div:first-child > span:first-child,
.bixbo-unified-log section > p:first-child {
  font-size: 11px;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: .075em;
  text-transform: uppercase;
  color: var(--muted-foreground);
}

.bixbo-unified-log input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),
.bixbo-unified-log textarea,
.bixbo-unified-log select {
  min-height: var(--bixbo-log-control-h);
  border-radius: var(--bixbo-log-radius);
  border-color: var(--border);
  background: color-mix(in srgb, var(--surface) 86%, var(--background));
  box-shadow: inset 0 1px 0 rgba(255,255,255,.10);
}

.bixbo-unified-log textarea {
  min-height: 86px;
  resize: vertical;
}

.bixbo-unified-log input:focus-visible,
.bixbo-unified-log textarea:focus-visible,
.bixbo-unified-log select:focus-visible,
.bixbo-unified-log button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--background), 0 0 0 4px color-mix(in srgb, var(--primary) 70%, transparent);
}

.bixbo-unified-log button.rounded-full,
.bixbo-unified-log button[class*="rounded-xl"],
.bixbo-unified-log button[class*="rounded-2xl"],
.bixbo-unified-log button[class*="rounded-3xl"] {
  transition: transform 120ms ease, background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
}

.bixbo-unified-log button:active {
  transform: scale(.985);
}

.bixbo-unified-log .sticky.top-0 {
  top: 0;
  margin-inline: -1rem;
  padding-inline: 1rem;
  min-height: 48px;
  background: color-mix(in srgb, var(--background) 94%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom-color: color-mix(in srgb, var(--border) 65%, transparent);
}

@media (min-width: 640px) {
  .bixbo-unified-log .sticky.top-0 {
    margin-inline: -1.25rem;
    padding-inline: 1.25rem;
  }
}

.bixbo-unified-log .sticky.top-0 button:last-child {
  min-height: 34px;
  border-radius: 999px;
  padding-inline: 14px;
  box-shadow: 0 4px 12px rgba(38, 49, 18, .14);
}

.bixbo-unified-log .grid.rounded-2xl.bg-tint.p-1 {
  border: 1px solid var(--border);
  border-radius: 20px;
  background: color-mix(in srgb, var(--surface) 72%, var(--background));
  padding: 4px;
}

.bixbo-unified-log .grid.rounded-2xl.bg-tint.p-1 > button {
  min-height: 42px;
  border-radius: 16px;
}

.bixbo-unified-log .rounded-3xl.bg-surface,
.bixbo-unified-log .rounded-2xl.bg-tint,
.bixbo-unified-log .rounded-2xl.bg-surface {
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  box-shadow: 0 5px 16px rgba(37, 48, 17, .06);
}

.bixbo-unified-log .text-muted-foreground {
  color: color-mix(in srgb, var(--muted-foreground) 92%, var(--foreground));
}

.bixbo-unified-log [class*="grid-cols-"] > button,
.bixbo-unified-log [class*="flex-wrap"] > button {
  min-height: 38px;
}

.bixbo-unified-log button[class*="bg-primary"] {
  box-shadow: 0 4px 12px rgba(45, 59, 19, .14);
}

.dark .bixbo-unified-log input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),
.dark .bixbo-unified-log textarea,
.dark .bixbo-unified-log select {
  background: color-mix(in srgb, var(--surface) 86%, var(--surface-sunken));
}
'''
if marker not in css:
    css += block
styles.write_text(css)
