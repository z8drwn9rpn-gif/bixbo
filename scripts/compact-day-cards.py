from pathlib import Path

p = Path('src/components/home/DayOverview.tsx')
s = p.read_text()

# Apply compact outer card spacing only to the three overview cards requested.
s = s.replace('<Card title="ŠukŠuk!" icon="❤️">', '<Card title="ŠukŠuk!" icon="❤️" compact>', 1)
s = s.replace('<Card title="Food" icon="🍽️">', '<Card title="Food" icon="🍽️" compact>', 1)
s = s.replace('<Card title="Bowel" icon="💩">', '<Card title="Bowel" icon="💩" compact>', 1)

# ŠukŠuk: reduce vertical space without changing content or stored data.
sex_start = s.index('      {log?.sex?.length ? (')
sex_end = s.index('      {log?.heat?.length ? (', sex_start)
sex = s[sex_start:sex_end]
sex = sex.replace('<ul className="space-y-3">', '<ul className="space-y-1">', 1)
sex = sex.replace('border-t border-border/60 pt-3', 'border-t border-border/60 pt-1.5')
sex = sex.replace('<p className="text-xs text-muted-foreground">{s.time}</p>', '<p className="text-[11px] leading-none text-muted-foreground">{s.time}</p>')
sex = sex.replace('<div className="my-2 border-t border-border/60" />', '<div className="my-1 border-t border-border/60" />')
sex = sex.replace('mt-2 text-xs leading-relaxed text-muted-foreground', 'mt-1 text-xs leading-snug text-muted-foreground')
sex = sex.replace('mt-2 whitespace-pre-line text-sm', 'mt-1 whitespace-pre-line text-xs leading-snug')
sex = sex.replace('mt-1 text-[10px] text-primary', 'mt-0.5 text-[9px] leading-tight text-primary')
s = s[:sex_start] + sex + s[sex_end:]

# Food: further reduce inter-entry spacing while keeping all fields readable.
food_start = s.index('      {log?.food?.length ? (')
food_end = s.index('      {log?.bowel?.length ? (', food_start)
food = s[food_start:food_end]
food = food.replace('<ul className="space-y-1">', '<ul className="space-y-0.5">', 1)
food = food.replace('border-t border-border/60 pt-1', 'border-t border-border/60 pt-0.5')
food = food.replace('<div className="my-1 border-t border-border/60" />', '<div className="my-0.5 border-t border-border/60" />')
food = food.replace('mt-0.5 text-[11px]', 'mt-px text-[11px]')
food = food.replace('mt-0.5 whitespace-pre-line text-[11px]', 'mt-px whitespace-pre-line text-[11px]')
s = s[:food_start] + food + s[food_end:]

# Bowel: make basic entries much shorter; optional details still render when present.
bowel_start = s.index('      {log?.bowel?.length ? (')
bowel_end = s.index('      {log?.workout?.length ? (', bowel_start)
bowel = s[bowel_start:bowel_end]
bowel = bowel.replace('<ul className="space-y-3">', '<ul className="space-y-1">', 1)
bowel = bowel.replace('border-t border-border/60 pt-3', 'border-t border-border/60 pt-1.5')
bowel = bowel.replace('<p className="text-xs text-muted-foreground">{b.time}</p>', '<p className="text-[11px] leading-none text-muted-foreground">{b.time}</p>')
bowel = bowel.replace('<div className="my-2 border-t border-border/60" />', '<div className="my-1 border-t border-border/60" />')
bowel = bowel.replace('mt-2 text-xs leading-relaxed text-muted-foreground', 'mt-1 text-xs leading-snug text-muted-foreground')
bowel = bowel.replace('mt-2 text-sm whitespace-pre-line', 'mt-1 text-xs leading-snug whitespace-pre-line')
bowel = bowel.replace('mt-1 text-[10px] text-primary', 'mt-0.5 text-[9px] leading-tight text-primary')
s = s[:bowel_start] + bowel + s[bowel_end:]

# Add an explicit compact variant to Card; all other Day Overview cards stay unchanged.
old = '''export function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="rounded-3xl bg-surface p-4 ring-1 ring-border">
      <div className="mb-2 flex items-center gap-2">
        <Ico e={icon} size={22} />
        <h3 className="font-serif text-lg font-semibold">{t(title)}</h3>
      </div>
      {children}
    </div>
  );
}'''
new = '''export function Card({
  title,
  icon,
  children,
  compact = false,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className={`rounded-3xl bg-surface ring-1 ring-border ${compact ? "px-4 py-3" : "p-4"}`}>
      <div className={`${compact ? "mb-1" : "mb-2"} flex items-center gap-2`}>
        <Ico e={icon} size={compact ? 20 : 22} />
        <h3 className={`font-serif font-semibold ${compact ? "text-[17px]" : "text-lg"}`}>{t(title)}</h3>
      </div>
      {children}
    </div>
  );
}'''
if old not in s:
    raise SystemExit('Card component block not found')
s = s.replace(old, new, 1)
p.write_text(s)

# Keep the source-level regression test aligned with the intentional compact prop.
p = Path('src/lib/__tests__/day-overview-ux-regression.test.ts')
test = p.read_text()
test = test.replace("expect(source).toContain('<Card title=\"ŠukŠuk!\" icon=\"❤️\">');", "expect(source).toContain('<Card title=\"ŠukŠuk!\" icon=\"❤️\" compact>');")
test = test.replace("expect(source).toContain('<Card title=\"Food\" icon=\"🍽️\">');", "expect(source).toContain('<Card title=\"Food\" icon=\"🍽️\" compact>');")
test = test.replace("expect(source).toContain('<Card title=\"Bowel\" icon=\"💩\">');", "expect(source).toContain('<Card title=\"Bowel\" icon=\"💩\" compact>');")
p.write_text(test)
