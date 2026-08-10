from pathlib import Path
files=['src/routes/index.tsx','src/routes/insights.tsx','src/routes/patterns.tsx','src/routes/couple.tsx']
terms=['function HomePage','function InsightsPage','function PatternsContent','function CouplePage','Today summary','Month summary','QuickTags','MonthCalendar','ChartCard','CollapsibleSection','Comparison','Health similarity','PatternsContent','overviewView ===','return (']
for f in files:
    print('\n###',f)
    lines=Path(f).read_text().splitlines()
    hits=[]
    for i,line in enumerate(lines):
        if any(t in line for t in terms): hits.append(i)
    for i in hits:
        a=max(0,i-4); b=min(len(lines),i+12)
        print(f'--- {a+1}-{b} ---')
        for j in range(a,b): print(f'{j+1}: {lines[j]}')
