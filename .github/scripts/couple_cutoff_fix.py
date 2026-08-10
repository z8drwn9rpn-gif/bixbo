from pathlib import Path

p = Path('src/routes/couple.tsx')
s = p.read_text()

old = '''  const myPainAverage = average(myPain.map((pain) => pain.score));

  const partnerPainAverage = average(partnerPain.map((pain) => pain.score));

  const myPainDays = periodDays.filter((day) => (view.dayLogs[day]?.pain?.length ?? 0) > 0).length;

  const partnerPainDays = partner ? periodDays.filter((day) => (partner.dayLogs[day]?.pain?.length ?? 0) > 0).length : 0;

  const sharedSymptomDays = partner
    ? periodDays.filter((day) => hasSymptoms(view.dayLogs[day]) && hasSymptoms(partner.dayLogs[day])).length
    : 0;

  const mySymptomDays = periodDays.filter((day) => hasSymptoms(view.dayLogs[day])).length;

  const partnerSymptomDays = partner ? periodDays.filter((day) => hasSymptoms(partner.dayLogs[day])).length : 0;

  const myTakenDoses = countTakenScheduledDoses(periodDays, view.meds, view.medLog);

  const partnerTakenDoses = partner ? countTakenScheduledDoses(periodDays, partner.meds ?? [], partner.medLog ?? {}) : 0;

  const partnerComparisonDays = partner
    ? periodDays.filter((day) => hasSymptoms(partner.dayLogs[day]))
    : [];

  const hasPartnerComparisonData = partnerComparisonDays.length > 0;

  const loggedComparisonDays = partner && hasPartnerComparisonData
    ? periodDays.filter((day) => hasSymptoms(view.dayLogs[day]) || hasSymptoms(partner.dayLogs[day])).length
    : 0;

  const similarityScore = partner && hasPartnerComparisonData
    ? calculateCoupleSimilarity({
        mySymptomDays,
        partnerSymptomDays,
        loggedComparisonDays,
        myPainAverage,
        partnerPainAverage,
        myPanicCount: myPanic.length,
        partnerPanicCount: partnerPanic.length,
        myTetanyCount: myTetany.length,
        partnerTetanyCount: partnerTetany.length,
      })
    : null;
'''
new = '''  // Couple similarity starts only when the partner has their first comparable
  // pain/panic/tetany log. Calendar days before that date must never dilute or
  // penalize the comparison (for example 1–25 July when the partner starts on 26 July).
  const partnerFirstComparisonDay = partner
    ? (Object.keys(partner.dayLogs)
        .filter((day) => hasSymptoms(partner.dayLogs[day]))
        .sort()[0] ?? null)
    : null;

  const comparisonPeriodDays = partnerFirstComparisonDay
    ? periodDays.filter((day) => day >= partnerFirstComparisonDay)
    : [];

  const hasPartnerComparisonData = partner
    ? comparisonPeriodDays.some((day) => hasSymptoms(partner.dayLogs[day]))
    : false;

  const myPainAverage = average(
    comparisonPeriodDays.flatMap((day) => view.dayLogs[day]?.pain ?? []).map((pain) => pain.score),
  );

  const partnerPainAverage = partner
    ? average(comparisonPeriodDays.flatMap((day) => partner.dayLogs[day]?.pain ?? []).map((pain) => pain.score))
    : null;

  const myPainDays = comparisonPeriodDays.filter((day) => (view.dayLogs[day]?.pain?.length ?? 0) > 0).length;

  const partnerPainDays = partner
    ? comparisonPeriodDays.filter((day) => (partner.dayLogs[day]?.pain?.length ?? 0) > 0).length
    : 0;

  const sharedSymptomDays = partner
    ? comparisonPeriodDays.filter((day) => hasSymptoms(view.dayLogs[day]) && hasSymptoms(partner.dayLogs[day])).length
    : 0;

  const mySymptomDays = comparisonPeriodDays.filter((day) => hasSymptoms(view.dayLogs[day])).length;

  const partnerSymptomDays = partner
    ? comparisonPeriodDays.filter((day) => hasSymptoms(partner.dayLogs[day])).length
    : 0;

  const myPanicCount = comparisonPeriodDays.reduce(
    (sum, day) => sum + (view.dayLogs[day]?.panic?.length ?? 0),
    0,
  );
  const partnerPanicCount = partner
    ? comparisonPeriodDays.reduce((sum, day) => sum + (partner.dayLogs[day]?.panic?.length ?? 0), 0)
    : 0;
  const myTetanyCount = comparisonPeriodDays.reduce(
    (sum, day) => sum + (view.dayLogs[day]?.tetany?.length ?? 0),
    0,
  );
  const partnerTetanyCount = partner
    ? comparisonPeriodDays.reduce((sum, day) => sum + (partner.dayLogs[day]?.tetany?.length ?? 0), 0)
    : 0;

  const myTakenDoses = countTakenScheduledDoses(periodDays, view.meds, view.medLog);

  const partnerTakenDoses = partner ? countTakenScheduledDoses(periodDays, partner.meds ?? [], partner.medLog ?? {}) : 0;

  const loggedComparisonDays = partner && hasPartnerComparisonData
    ? comparisonPeriodDays.filter((day) => hasSymptoms(view.dayLogs[day]) || hasSymptoms(partner.dayLogs[day])).length
    : 0;

  const similarityScore = partner && hasPartnerComparisonData
    ? calculateCoupleSimilarity({
        mySymptomDays,
        partnerSymptomDays,
        loggedComparisonDays,
        myPainAverage,
        partnerPainAverage,
        myPanicCount,
        partnerPanicCount,
        myTetanyCount,
        partnerTetanyCount,
      })
    : null;
'''
if old not in s:
    raise RuntimeError('current similarity block not found')
s = s.replace(old, new, 1)

s = s.replace('value={`${myPanic.length + partnerPanic.length}`}', 'value={`${myPanicCount + partnerPanicCount}`}')
s = s.replace('detail={`${t("You")} ${myPanic.length} · ${t(partnerName)} ${partnerPanic.length}`}', 'detail={`${t("You")} ${myPanicCount} · ${t(partnerName)} ${partnerPanicCount}`}')
s = s.replace('value={`${myTetany.length + partnerTetany.length}`}', 'value={`${myTetanyCount + partnerTetanyCount}`}')
s = s.replace('detail={`${t("You")} ${myTetany.length} · ${t(partnerName)} ${partnerTetany.length}`}', 'detail={`${t("You")} ${myTetanyCount} · ${t(partnerName)} ${partnerTetanyCount}`}')

p.write_text(s)
