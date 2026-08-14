from pathlib import Path

path = Path('src/components/home/DayOverview.tsx')
text = path.read_text()

old_condition = '''          log?.periodInfo?.dischargeNote ||
          log?.periodInfo?.cramps != null ||
          log?.periodInfo?.note
        ) && ('''
new_condition = '''          log?.periodInfo?.dischargeNote ||
          log?.periodInfo?.symptoms?.length ||
          log?.periodInfo?.clots ||
          log?.periodInfo?.cramps != null ||
          log?.periodInfo?.note
        ) && ('''
if old_condition not in text:
    raise SystemExit('Blueberry visibility condition anchor not found')
text = text.replace(old_condition, new_condition, 1)

old_anchor = '''              {log?.periodInfo?.note && (
                <p className="mt-2 text-sm whitespace-pre-line">
                  <span className="font-semibold">{t("Note")}:</span> {log.periodInfo.note}
                </p>
              )}
              <p className="mt-1 text-[10px] text-primary">{t("Tap to edit")}</p>'''
new_anchor = '''              {log?.periodInfo?.symptoms?.length ? (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">{t("Period symptoms")}:</span>{" "}
                  {log.periodInfo.symptoms.map(t).join(", ")}
                </p>
              ) : null}
              {log?.periodInfo?.clots ? (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">{t("Clots")}:</span>{" "}
                  {t(log.periodInfo.clots === "none" ? "None" : log.periodInfo.clots === "small" ? "Small" : log.periodInfo.clots === "medium" ? "Medium" : "Large")}
                </p>
              ) : null}
              {log?.periodInfo?.note && (
                <p className="mt-2 text-sm whitespace-pre-line">
                  <span className="font-semibold">{t("Note")}:</span> {log.periodInfo.note}
                </p>
              )}
              <p className="mt-1 text-[10px] text-primary">{t("Tap to edit")}</p>'''
if old_anchor not in text:
    raise SystemExit('Blueberry overview render anchor not found')
text = text.replace(old_anchor, new_anchor, 1)

path.write_text(text)
