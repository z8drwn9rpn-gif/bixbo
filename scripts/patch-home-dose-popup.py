from pathlib import Path

p = Path('src/routes/index.tsx')
s = p.read_text()

# 1) Add a compact per-dose popup component before DayPreview.
anchor = '''function DayPreview({\n'''
if anchor not in s:
    raise SystemExit('DayPreview anchor not found')

component = r'''type ScheduledDoseTarget = {
  key: string;
  med: BixboData["meds"][number];
  time: string;
};

function ScheduledDosePopup({
  date,
  target,
  data,
  update,
  onClose,
}: {
  date: string;
  target: ScheduledDoseTarget;
  data: BixboData;
  update: (u: (d: BixboData) => BixboData) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const allItems = medScheduleItems(target.med);
  const alreadyTaken = !!data.medLog[date]?.[target.key];
  const initialItems = data.medLogItems?.[date]?.[target.key] ?? (alreadyTaken ? allItems : []);
  const [selectedItems, setSelectedItems] = useState<string[]>(initialItems);
  const [note, setNote] = useState(data.medLogNotes?.[date]?.[target.key] ?? "");

  const toggleItem = (item: string) => {
    setSelectedItems((current) =>
      current.includes(item) ? current.filter((value) => value !== item) : [...current, item],
    );
  };

  const save = () => {
    const cleanNote = note.trim();
    const actualExisting = data.medLogTimes?.[date]?.[target.key];
    const now = new Date();
    const nowHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const actualTime = actualExisting || (date === todayKey() ? nowHHMM : target.time);

    update((d) => {
      const dayLog = { ...(d.medLog[date] ?? {}) };
      const dayTimes = { ...(d.medLogTimes?.[date] ?? {}) };
      const dayItems = { ...(d.medLogItems?.[date] ?? {}) };
      const dayNotes = { ...(d.medLogNotes?.[date] ?? {}) };

      if (selectedItems.length > 0) {
        dayLog[target.key] = true;
        dayTimes[target.key] = actualTime;
        dayItems[target.key] = selectedItems;
      } else {
        delete dayLog[target.key];
        delete dayTimes[target.key];
        delete dayItems[target.key];
      }

      if (cleanNote) dayNotes[target.key] = cleanNote;
      else delete dayNotes[target.key];

      return {
        ...d,
        medLog: { ...d.medLog, [date]: dayLog },
        medLogTimes: { ...(d.medLogTimes ?? {}), [date]: dayTimes },
        medLogItems: { ...(d.medLogItems ?? {}), [date]: dayItems },
        medLogNotes: { ...(d.medLogNotes ?? {}), [date]: dayNotes },
      };
    });

    onClose();
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/30 p-3 sm:items-center"
      style={{
        paddingTop: "max(.75rem, env(safe-area-inset-top))",
        paddingBottom: "max(.75rem, env(safe-area-inset-bottom))",
      }}
      onClick={onClose}
    >
      <section
        className="w-full max-w-[360px] rounded-[1.6rem] bg-surface p-4 shadow-2xl ring-1 ring-border"
        onClick={(event) => event.stopPropagation()}
        aria-label={t("Scheduled dose")}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {t("Scheduled dose")} · {target.time}
            </p>
            <h3 className="mt-1 font-serif text-lg font-bold text-foreground">{target.med.name}</h3>
            {target.med.dose ? <p className="text-xs text-muted-foreground">{target.med.dose}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-tint text-sm font-bold ring-1 ring-border"
            aria-label={t("Close")}
          >
            ×
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setSelectedItems(allItems)}
            className="min-h-8 flex-1 rounded-xl bg-primary/12 px-2 text-[11px] font-semibold text-primary ring-1 ring-primary/20"
          >
            {t("All taken")}
          </button>
          <button
            type="button"
            onClick={() => setSelectedItems([])}
            className="min-h-8 flex-1 rounded-xl bg-tint px-2 text-[11px] font-semibold text-muted-foreground ring-1 ring-border"
          >
            {t("None")}
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {allItems.map((item) => {
            const checked = selectedItems.includes(item);
            return (
              <button
                key={item}
                type="button"
                onClick={() => toggleItem(item)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left ring-1 transition ${
                  checked ? "bg-primary/10 ring-primary/35" : "bg-tint/70 ring-border"
                }`}
              >
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-md text-[11px] font-bold ring-1 ${
                    checked ? "bg-primary text-primary-foreground ring-primary" : "bg-surface text-transparent ring-border"
                  }`}
                  aria-hidden="true"
                >
                  ✓
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium text-foreground">{item}</span>
              </button>
            );
          })}
        </div>

        <label className="mt-3 block">
          <span className="text-[11px] font-semibold text-muted-foreground">{t("Note")} ({t("optional")})</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            placeholder={t("Note (optional)")}
            className="mt-1 w-full resize-none rounded-xl bg-background px-3 py-2 text-sm text-foreground outline-none ring-1 ring-border focus:ring-primary"
          />
        </label>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 rounded-xl bg-tint px-3 text-sm font-semibold text-foreground ring-1 ring-border"
          >
            {t("Cancel")}
          </button>
          <button
            type="button"
            onClick={save}
            className="min-h-10 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground"
          >
            {t("Save")} ✓
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

'''

s = s.replace(anchor, component + anchor, 1)

# 2) Add popup state at the top of DayPreview, before any conditional return.
old = '''}) {\n  const { t } = useI18n();\n  const log = data.dayLogs[date];'''
new = '''}) {\n  const { t } = useI18n();\n  const [scheduledDoseTarget, setScheduledDoseTarget] = useState<ScheduledDoseTarget | null>(null);\n  const log = data.dayLogs[date];'''
if old not in s:
    raise SystemExit('DayPreview state anchor not found')
s = s.replace(old, new, 1)

# 3) Scheduled Taken row opens only its compact popup, not the full Meds sheet.
s = s.replace(
    'onClick={() => onEdit?.("meds", undefined)}\n                    className="text-left text-green-700 hover:underline"',
    'onClick={() => setScheduledDoseTarget({ key: x.key, med: x.med, time: x.time })}\n                    className="text-left text-green-700 hover:underline"',
    1,
)

# 4) Scheduled Missed row opens the same compact popup.
s = s.replace(
    'onClick={() => onEdit?.("meds", undefined)}\n                  className="flex-1 text-left text-destructive/90"',
    'onClick={() => setScheduledDoseTarget({ key: x.key, med: x.med, time: x.time })}\n                  className="flex-1 text-left text-destructive/90"',
    1,
)

# 5) Render popup inside DayPreview. Extra/PRN meds continue using the full Meds editor.
end_anchor = '''      )}\n    </div>\n  );\n}\n\nfunction DeleteBtn'''
replacement = '''      )}\n\n      {scheduledDoseTarget ? (\n        <ScheduledDosePopup\n          key={`${date}:${scheduledDoseTarget.key}`}\n          date={date}\n          target={scheduledDoseTarget}\n          data={data}\n          update={update}\n          onClose={() => setScheduledDoseTarget(null)}\n        />\n      ) : null}\n    </div>\n  );\n}\n\nfunction DeleteBtn'''
if end_anchor not in s:
    raise SystemExit('DayPreview end anchor not found')
s = s.replace(end_anchor, replacement, 1)

p.write_text(s)
