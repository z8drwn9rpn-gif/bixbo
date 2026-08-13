from pathlib import Path

p = Path('src/components/home/DayOverview.tsx')
s = p.read_text()

# Keep compact cards compact, but use the same readable typography scale as Pain.
replacements = {
    'text-[11px] leading-none text-muted-foreground': 'text-xs text-muted-foreground',
    'text-[11px] leading-tight text-muted-foreground': 'text-xs leading-relaxed text-muted-foreground',
    'text-[11px] leading-tight text-destructive': 'text-xs leading-relaxed text-destructive',
    'text-[11px] leading-tight': 'text-xs leading-relaxed',
    'text-[9px] leading-tight text-primary': 'text-[10px] text-primary',
}
for old, new in replacements.items():
    s = s.replace(old, new)

# Match compact-card titles/icons to the standard Pain card typography while retaining compact padding/spacing.
s = s.replace('<Ico e={icon} size={compact ? 20 : 22} />', '<Ico e={icon} size={22} />')
s = s.replace('<h3 className={`font-serif font-semibold ${compact ? "text-[17px]" : "text-lg"}`}>{t(title)}</h3>', '<h3 className="font-serif text-lg font-semibold">{t(title)}</h3>')

# Temp / Sleep / Weight is part of Day Overview too; align it with Pain typography.
s = s.replace('text-[11px] leading-tight text-muted-foreground', 'text-xs leading-relaxed text-muted-foreground')
s = s.replace('text-[9px] leading-tight text-primary', 'text-[10px] text-primary')

p.write_text(s)
