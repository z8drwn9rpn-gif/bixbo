from pathlib import Path

path = Path('src/routes/index.tsx')
s = path.read_text()

old_panic = '''      {log?.panic?.length ? (
        <Card title="Panic episode" icon="🫯">
          <ul className="space-y-2">
            {log.panic.map((p) => (
              <li key={p.id} className="flex items-start gap-2">
                <button onClick={() => onEdit?.("panic", p)} className="flex-1 text-left">
                  <p className="text-sm font-medium">
                    {p.time} · {t("intensity")} {p.intensity}/10 · {p.minutes == null ? t("ongoing") : `${p.minutes} min`}
                  </p>
                  {p.trigger && <p className="text-xs text-muted-foreground">{t("Trigger")}: {p.trigger}</p>}
                  {p.physical.length > 0 && <p className="text-xs">{t("Physical")}: {p.physical.map(t).join(", ")}</p>}
                  {p.cognitive.length > 0 && <p className="text-xs">{t("Cognitive")}: {p.cognitive.map(t).join(", ")}</p>}
                  <p className="text-[11px] text-muted-foreground">
                    {t("Hyperventilation")}: {t(p.hyperventilation)}
                    {p.tetanyPresent ? ` · ${t("tetany present")}` : ""}
                  </p>
                  {p.helped.length > 0 && (
                    <p className="text-[11px] text-muted-foreground">{t("Helped")}: {p.helped.map(t).join(", ")}</p>
                  )}
                  {p.rescueMed ? (
                    <p className="text-xs text-muted-foreground">
                      <Ico e="💊" size={13} /> {t("Rescue")}: {p.rescueMed}
                    </p>
                  ) : null}
                  {p.note && <p className="mt-1 text-sm whitespace-pre-line">"{p.note}"</p>}
                  <p className="mt-1 text-[10px] text-primary">{t("Tap to edit")}</p>
                </button>
                <DeleteBtn
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      dayLogs: {
                        ...d.dayLogs,
                        [date]: {
                          ...d.dayLogs[date],
                          panic: (d.dayLogs[date]?.panic ?? []).filter((x) => x.id !== p.id),
                        },
                      },
                    }))
                  }
                />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}'''

new_panic = '''      {log?.panic?.length ? (
        <Card title="Panic episode" icon="🫯">
          <ul className="space-y-3">
            {log.panic.map((p, index) => (
              <li key={p.id} className={`flex items-start gap-2 ${index ? "border-t border-border/60 pt-3" : ""}`}>
                <button onClick={() => onEdit?.("panic", p)} className="min-w-0 flex-1 text-left">
                  <p className="text-xs text-muted-foreground">
                    {p.time} · {t("intensity")} {p.intensity}/10 · {p.minutes == null ? t("ongoing") : `${p.minutes} min`}
                  </p>
                  <div className="my-2 border-t border-border/60" />
                  {p.trigger && (
                    <p className="text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Trigger")}:</span> {p.trigger}</p>
                  )}
                  {p.physical.length > 0 && (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Physical")}:</span> {p.physical.map(t).join(", ")}</p>
                  )}
                  {p.cognitive.length > 0 && (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Cognitive")}:</span> {p.cognitive.map(t).join(", ")}</p>
                  )}
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground">{t("Hyperventilation")}:</span> {t(p.hyperventilation)}
                    {p.tetanyPresent ? ` · ${t("tetany present")}` : ""}
                  </p>
                  {p.helped.length > 0 && (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Helped")}:</span> {p.helped.map(t).join(", ")}</p>
                  )}
                  {p.rescueMed ? (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Rescue")}:</span> {p.rescueMed}</p>
                  ) : null}
                  {p.note && <p className="mt-2 text-sm whitespace-pre-line"><span className="font-semibold">{t("Note")}:</span> {p.note}</p>}
                  <p className="mt-1 text-[10px] text-primary">{t("Tap to edit")}</p>
                </button>
                <DeleteBtn
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      dayLogs: {
                        ...d.dayLogs,
                        [date]: {
                          ...d.dayLogs[date],
                          panic: (d.dayLogs[date]?.panic ?? []).filter((x) => x.id !== p.id),
                        },
                      },
                    }))
                  }
                />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}'''

old_tetany = '''      {log?.tetany?.length ? (
        <Card title="Tetany episode" icon="⚡">
          <ul className="space-y-2 text-sm">
            {log.tetany.map((tetanyEntry) => (
              <li key={tetanyEntry.id} className="flex items-start gap-2">
                <button onClick={() => onEdit?.("tetany", tetanyEntry)} className="flex-1 text-left">
                  <p>
                    {tetanyEntry.time} · {tetanyEntry.types.length ? tetanyEntry.types.map(t).join(", ") : t("Tetany")} · {tetanyEntry.intensity}/5 ·{" "}
                    {tetanyEntry.minutes == null ? t("ongoing") : `${tetanyEntry.minutes}min`}
                    {tetanyEntry.triggers.length ? ` — ${tetanyEntry.triggers.map(t).join(", ")}` : ""}
                  </p>
                  {tetanyEntry.location?.length ? (
                    <p className="text-xs text-muted-foreground">{t("Location")}: {tetanyEntry.location.map(t).join(", ")}</p>
                  ) : null}
                  {tetanyEntry.helped?.length ? (
                    <p className="text-xs text-muted-foreground">{t("Helped")}: {tetanyEntry.helped.map(t).join(", ")}</p>
                  ) : null}
                  {tetanyEntry.rescueMed ? (
                    <p className="text-xs text-muted-foreground">
                      <Ico e="💊" size={13} /> {t("Rescue")}: {tetanyEntry.rescueMed}
                    </p>
                  ) : null}
                  {tetanyEntry.note && <p className="mt-1 text-sm whitespace-pre-line">"{tetanyEntry.note}"</p>}
                  <p className="mt-1 text-[10px] text-primary">{t("Tap to edit")}</p>
                </button>
                <DeleteBtn
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      dayLogs: {
                        ...d.dayLogs,
                        [date]: {
                          ...d.dayLogs[date],
                          tetany: (d.dayLogs[date]?.tetany ?? []).filter((x) => x.id !== tetanyEntry.id),
                        },
                      },
                    }))
                  }
                />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}'''

new_tetany = '''      {log?.tetany?.length ? (
        <Card title="Tetany episode" icon="⚡">
          <ul className="space-y-3">
            {log.tetany.map((tetanyEntry, index) => (
              <li key={tetanyEntry.id} className={`flex items-start gap-2 ${index ? "border-t border-border/60 pt-3" : ""}`}>
                <button onClick={() => onEdit?.("tetany", tetanyEntry)} className="min-w-0 flex-1 text-left">
                  <p className="text-xs text-muted-foreground">
                    {tetanyEntry.time} · {tetanyEntry.types.length ? tetanyEntry.types.map(t).join(", ") : t("Tetany")} · {tetanyEntry.intensity}/5 ·{" "}
                    {tetanyEntry.minutes == null ? t("ongoing") : `${tetanyEntry.minutes} min`}
                  </p>
                  <div className="my-2 border-t border-border/60" />
                  {tetanyEntry.triggers.length ? (
                    <p className="text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Triggers")}:</span> {tetanyEntry.triggers.map(t).join(", ")}</p>
                  ) : null}
                  {tetanyEntry.location?.length ? (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Location")}:</span> {tetanyEntry.location.map(t).join(", ")}</p>
                  ) : null}
                  {tetanyEntry.helped?.length ? (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Helped")}:</span> {tetanyEntry.helped.map(t).join(", ")}</p>
                  ) : null}
                  {tetanyEntry.rescueMed ? (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Rescue")}:</span> {tetanyEntry.rescueMed}</p>
                  ) : null}
                  {tetanyEntry.note && <p className="mt-2 text-sm whitespace-pre-line"><span className="font-semibold">{t("Note")}:</span> {tetanyEntry.note}</p>}
                  <p className="mt-1 text-[10px] text-primary">{t("Tap to edit")}</p>
                </button>
                <DeleteBtn
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      dayLogs: {
                        ...d.dayLogs,
                        [date]: {
                          ...d.dayLogs[date],
                          tetany: (d.dayLogs[date]?.tetany ?? []).filter((x) => x.id !== tetanyEntry.id),
                        },
                      },
                    }))
                  }
                />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}'''

if old_panic not in s:
    raise SystemExit('panic overview block not found')
if old_tetany not in s:
    raise SystemExit('tetany overview block not found')

s = s.replace(old_panic, new_panic, 1)
s = s.replace(old_tetany, new_tetany, 1)
path.write_text(s)
