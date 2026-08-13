from pathlib import Path

path = Path('src/components/LogSheet.tsx')
text = path.read_text()
old = '''          <div className="flex max-w-md flex-wrap justify-center gap-1.5 px-2">
            {Array.from({ length: 21 }, (_, i) => i / 2).map((n) => ('''
new = '''          <div className="grid w-fit max-w-full grid-cols-7 justify-center gap-1.5 px-2">
            {Array.from({ length: 21 }, (_, i) => i / 2).map((n) => ('''
if old not in text:
    raise SystemExit('Pain scale number grid target not found')
text = text.replace(old, new, 1)
path.write_text(text)
