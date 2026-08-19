from pathlib import Path
p=Path('src/features/home/HomePage.tsx')
s=p.read_text()
s=s.replace('</div>}\n\n        <PregnancyHomeCard', '</div>}\n        <PregnancyHomeCard', 1)
p.write_text(s)
