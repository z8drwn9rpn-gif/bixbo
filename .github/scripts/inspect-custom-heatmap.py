from pathlib import Path
p=Path('src/routes/insights.tsx')
s=p.read_text()
terms=['Heatmap','heatmap','HEATMAP','metric','Metric']
lines=s.splitlines()
seen=set()
for i,line in enumerate(lines):
    if any(t in line for t in terms):
        a=max(0,i-5); b=min(len(lines),i+9)
        key=(a,b)
        if key in seen: continue
        seen.add(key)
        print(f'--- {a+1}-{b} ---')
        for j in range(a,b): print(f'{j+1}: {lines[j]}')
