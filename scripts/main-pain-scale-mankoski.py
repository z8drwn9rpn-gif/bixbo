from pathlib import Path

path = Path('src/components/LogSheet.tsx')
text = path.read_text()

old_circle = '''          <div
            className="grid h-32 w-32 place-items-center rounded-full text-white shadow-sm"
            style={{ background: bg }}
          >
            <div className="text-center">
              <div className="text-5xl font-bold leading-none">{Number.isInteger(score) ? score : score.toFixed(1)}</div>
              <div className="mt-2 text-sm font-semibold">{t(getScaleDesc(data, "pain")[Math.round(score)])}</div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-1.5">
'''
new_circle = '''          <div
            className="grid h-32 w-32 place-items-center rounded-full text-white shadow-sm"
            style={{ background: bg }}
          >
            <div className="text-5xl font-bold leading-none">{Number.isInteger(score) ? score : score.toFixed(1)}</div>
          </div>
          <p className="-mt-2 text-center text-sm font-semibold text-foreground">
            {t(getScaleDesc(data, "pain")[Math.round(score)])}
          </p>
          <div className="flex items-center justify-center gap-1.5">
'''
if old_circle not in text:
    raise SystemExit('main pain circle block not found')
text = text.replace(old_circle, new_circle, 1)

old_popup = '''                <ScaleLegend
                  max={10}
                  from={0}
                  descriptions={getScaleDesc(data, "pain")}
                  value={Math.round(score)}
                  title={t("Pain scale (Mankosky)")}
                />
'''
new_popup = '''                <div className="max-h-[72dvh] overflow-y-auto rounded-2xl border border-border/60 bg-surface/40">
                  {[
                    [0, "Pain free", "You've been okay for the past 24 hours."],
                    [1, "Very minor annoyance", "Occasional minor twinges. No medication needed."],
                    [2, "Minor annoyance", "Occasional strong twinges. No medication needed."],
                    [3, "Annoying enough to be distracting", "Mild painkillers are effective (aspirin, ibuprofen)."],
                    [4, "Can be ignored if you are really involved in your work", "But still distracting. Mild painkillers relieve pain for 3–4 hours."],
                    [5, "Can't be ignored for more than 30 minutes", "Mild painkillers reduce pain for 3–4 hours."],
                    [6, "Can't be ignored for any length of time", "But you can still go to work and participate in social activities. Stronger painkillers (codeine) reduce pain for 3–4 hours."],
                    [7, "Makes it difficult to concentrate, interferes with sleep", "You can still function with effort. Stronger painkillers are only partially effective. Strongest painkillers relieve pain."],
                    [8, "Physical activity severely limited", "You can read and converse with effort. Nausea and dizziness are common. Strongest painkillers reduce pain for 3–4 hours."],
                    [9, "Unable to speak", "Crying out or moaning uncontrollably — near delirium. Strongest painkillers are only partially effective."],
                    [10, "Unconscious", "Pain makes you pass out. Strongest painkillers are only partially effective."],
                  ].map(([n, label, description]) => {
                    const level = Number(n);
                    const active = Math.round(score) === level;
                    return (
                      <div
                        key={level}
                        className={`flex gap-3 border-b border-border/50 px-3 py-2.5 last:border-b-0 ${active ? "bg-primary/10" : "bg-background/60"}`}
                      >
                        <span
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                          style={{ background: painColor(level) }}
                        >
                          {level}
                        </span>
                        <div className="min-w-0 pt-0.5">
                          <p className={`text-sm leading-tight ${active ? "font-bold text-foreground" : "font-semibold text-foreground"}`}>
                            {t(String(label))}
                          </p>
                          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{t(String(description))}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
'''
if old_popup not in text:
    raise SystemExit('main pain popup legend block not found')
text = text.replace(old_popup, new_popup, 1)

# Match the reference title wording while keeping the existing bottom-sheet behavior.
text = text.replace('aria-label={t("Pain scale guide")}', 'aria-label={t("The Pain Scale")}', 1)
text = text.replace('<h3 className="font-serif text-lg font-semibold">{t("Pain scale guide")}</h3>', '<h3 className="font-serif text-lg font-semibold">{t("The Pain Scale")}</h3>', 1)

path.write_text(text)
