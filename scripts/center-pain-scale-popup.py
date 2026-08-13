from pathlib import Path
p=Path('src/components/LogSheet.tsx')
s=p.read_text()

s=s.replace(
'''      {activePainStepId === "score" && (\n        <div className="flex flex-col items-center gap-4 py-6">''',
'''      {activePainStepId === "score" && (\n        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-6">''',
1,
)

old='''          {painScaleInfoOpen ? (\n            <div className="w-full px-2">\n              <ScaleLegend\n                max={10}\n                from={0}\n                descriptions={getScaleDesc(data, "pain")}\n                value={Math.round(score)}\n                title={t("Pain scale (Mankosky)")}\n              />\n            </div>\n          ) : null}\n'''
new='''          {painScaleInfoOpen ? (\n            <div\n              className="fixed inset-0 z-[90] flex items-end justify-center bg-black/20 px-3 pb-[calc(12px+env(safe-area-inset-bottom))] backdrop-blur-[1px]"\n              role="presentation"\n              onClick={() => setPainScaleInfoOpen(false)}\n            >\n              <div\n                role="dialog"\n                aria-modal="true"\n                aria-label={t("Pain scale guide")}\n                className="w-full max-w-md rounded-[1.6rem] border border-border/70 bg-background p-4 shadow-2xl"\n                onClick={(e) => e.stopPropagation()}\n              >\n                <div className="mb-2 flex items-center justify-between gap-3">\n                  <div className="flex items-center gap-2">\n                    <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary">i</span>\n                    <h3 className="font-serif text-lg font-semibold">{t("Pain scale guide")}</h3>\n                  </div>\n                  <button\n                    type="button"\n                    onClick={() => setPainScaleInfoOpen(false)}\n                    aria-label={t("Close")}\n                    className="grid h-8 w-8 place-items-center rounded-full bg-tint text-foreground ring-1 ring-border"\n                  >\n                    <X className="h-4 w-4" />\n                  </button>\n                </div>\n                <ScaleLegend\n                  max={10}\n                  from={0}\n                  descriptions={getScaleDesc(data, "pain")}\n                  value={Math.round(score)}\n                  title={t("Pain scale (Mankosky)")}\n                />\n              </div>\n            </div>\n          ) : null}\n'''
if old not in s:
    raise SystemExit('pain inline info block not found')
s=s.replace(old,new,1)

p.write_text(s)
