from pathlib import Path

p = Path('src/routes/index.tsx')
s = p.read_text()
anchor = 'import { DayPreview, ShareDayButton } from "@/components/home/DayOverview";\n'
if anchor not in s:
    raise SystemExit('Home import anchor missing')
s = s.replace(anchor, anchor + 'import { TodayHeaderSummary } from "@/components/home/TodayHeaderSummary";\n', 1)
old = '''          <button
            type="button"
            onClick={() => {
              setSummaryMode("today");
              setSummaryMonthAnchor(new Date());
              setTodayOpen(true);
            }}
            className="flex min-w-[82px] flex-col items-end justify-center rounded-2xl px-2 py-1 transition hover:bg-tint"
            aria-label={t("Open today's summary")}
          >
            <span className="text-[10px] font-semibold leading-none text-muted-foreground">{t("Today")}</span>
            <span className="mt-1 flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold leading-none text-foreground">
              <Ico name="flame" size={14} /> {todayPain != null ? todayPain.toFixed(1) : "—"}
              <span className="text-muted-foreground">·</span>
              <PillIcon size={14} /> {todayMedsTaken}/{todayScheduled.length}
            </span>
          </button>
'''
new = '''          <TodayHeaderSummary
            data={view}
            onOpen={() => {
              setSummaryMode("today");
              setSummaryMonthAnchor(new Date());
              setTodayOpen(true);
            }}
          />
'''
if old not in s:
    raise SystemExit('Home Today header block missing')
p.write_text(s.replace(old, new, 1))
