from pathlib import Path


def one(path: str, old: str, new: str, label: str) -> None:
    p = Path(path)
    s = p.read_text()
    count = s.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match in {path}, got {count}")
    p.write_text(s.replace(old, new, 1))


one(
    "src/components/MonthCalendar.tsx",
    "  }, [cells, cycleTrackingHidden, data.dayLogs, data.settings.adminConfig, data.settings.birthControlSince, predictedKeys]);",
    "  }, [cells, cycleTrackingHidden, data, predictedKeys]);",
    "MonthCalendar dependency",
)

one(
    "src/components/home/BirthControlCard.tsx",
    "  }, []);\n",
    "  }, [hakTheme.background]);\n",
    "BirthControl effect dependency",
)

one(
    "src/components/home/vitalTrends.tsx",
    "  }, [anchor, data.dayLogs, metric, period]);",
    "  }, [anchor, data, language, metric, period]);",
    "vital trends dependencies",
)

one(
    "src/components/home/DayOverview.tsx",
    '  value.replace(/^[\\p{Extended_Pictographic}\\u200d\\ufe0f\\p{Emoji_Modifier}]+\\s*/u, "").trim();',
    '  value.replace(/^(?:\\p{Extended_Pictographic}|\\u200d|\\ufe0f|\\p{Emoji_Modifier})+\\s*/u, "").trim();',
    "DayOverview emoji regex",
)
one(
    "src/components/home/DayOverview.tsx",
    "      } catch {}\n    }",
    "      } catch {\n        // Share cancellation/failure falls back to clipboard below.\n      }\n    }",
    "DayOverview share catch",
)
one(
    "src/features/logging/LogFormPrimitives.tsx",
    'export const stripEmoji = (v: string) => v.replace(/^[\\p{Extended_Pictographic}\\u200d\\ufe0f]+\\s*/u, "").trim();',
    'export const stripEmoji = (v: string) => v.replace(/^(?:\\p{Extended_Pictographic}|\\u200d|\\ufe0f)+\\s*/u, "").trim();',
    "LogForm emoji regex",
)

one(
    "src/features/logging/LifestyleForms.tsx",
    "  const temperatureEntries = useMemo(() => existingVitals(cur.temperatureEntries, cur.temperature, `${date}-legacy-temperature`), [cur.temperatureEntries, cur.temperature, date]);\n  const weightEntries = useMemo(() => existingVitals(cur.weightEntries, cur.weight, `${date}-legacy-weight`), [cur.weightEntries, cur.weight, date]);",
    "  const temperatureEntries = existingVitals(cur.temperatureEntries, cur.temperature, `${date}-legacy-temperature`);\n  const weightEntries = existingVitals(cur.weightEntries, cur.weight, `${date}-legacy-weight`);",
    "Lifestyle vitals memo",
)

p = Path("src/features/logging/LogSheetRoot.tsx")
s = p.read_text()
constant = 'const DAY_LEVEL_ADMIN_FEATURES = new Set<RegistryFeatureId>(["period", "temp", "meds", "postpartum"]);\n\n'
anchor = "export function LogSheetRoot("
if constant not in s:
    if anchor not in s:
        raise SystemExit("LogSheetRoot component anchor missing")
    s = s.replace(anchor, constant + anchor, 1)
s = s.replace('  const dayLevelAdminFeatures = new Set<RegistryFeatureId>(["period", "temp", "meds", "postpartum"]);\n', "")
old = '''  const draftSourceEntryId = useMemo(
    () => globalThis.crypto?.randomUUID?.() ?? `core-entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    [active, date, openToken],
  );'''
new = '''  const draftSourceKey = `${active ?? ""}:${date}:${openToken}`;
  const draftSourceEntryId = useMemo(
    () => globalThis.crypto?.randomUUID?.() ?? `core-entry-${encodeURIComponent(draftSourceKey)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    [draftSourceKey],
  );'''
if old not in s:
    raise SystemExit("LogSheet draft memo missing")
s = s.replace(old, new, 1).replace("dayLevelAdminFeatures.has(", "DAY_LEVEL_ADMIN_FEATURES.has(")
s = s.replace(
    "    } catch {}\n  };\n\n  const moveDirectReorder",
    "    } catch {\n      // Pointer capture is optional on browsers that do not support it.\n    }\n  };\n\n  const moveDirectReorder",
    1,
)
p.write_text(s)

p = Path("src/features/insights/MedsAdherence.tsx")
s = p.read_text()
s = s.replace(
    "  const adherenceNow = new Date();\n  const perDay = useMemo(() => days.map((date) => {",
    "  const adherenceMinuteKey = Math.floor(Date.now() / 60_000);\n  const perDay = useMemo(() => {\n    const adherenceNow = new Date();\n    return days.map((date) => {",
)
s = s.replace(
    "    return { date, expected, taken, missed, takenList, pct: expected ? Math.round((taken / expected) * 100) : null };\n  }), [data.medLog, data.medLogItems, days, scheduled, adherenceNow.getFullYear(), adherenceNow.getMonth(), adherenceNow.getDate(), adherenceNow.getHours(), adherenceNow.getMinutes()]);",
    "    return { date, expected, taken, missed, takenList, pct: expected ? Math.round((taken / expected) * 100) : null };\n    });\n  }, [adherenceMinuteKey, data.medLog, data.medLogItems, days, scheduled]);",
)
s = s.replace(
    "  const perMed = useMemo(() => scheduled.flatMap((med) => med.times.flatMap((time) => medScheduleItems(med).map((item) => {",
    "  const perMed = useMemo(() => {\n    const adherenceNow = new Date();\n    return scheduled.flatMap((med) => med.times.flatMap((time) => medScheduleItems(med).map((item) => {",
)
s = s.replace(
    "  }))).filter((entry) => entry.expected > 0).sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0)), [data.medLog, data.medLogItems, days, scheduled, adherenceNow.getFullYear(), adherenceNow.getMonth(), adherenceNow.getDate(), adherenceNow.getHours(), adherenceNow.getMinutes()]);",
    "    }))).filter((entry) => entry.expected > 0).sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0));\n  }, [adherenceMinuteKey, data.medLog, data.medLogItems, days, scheduled]);",
)
if "adherenceNow.getFullYear()" in s:
    raise SystemExit("MedsAdherence old complex deps remain")
p.write_text(s)

p = Path("src/features/patterns/usePatternsContentModel.tsx")
s = p.read_text()
old = '''const [selectedTrigger, setSelectedTrigger] = useState(triggerOptions[0]?.id ?? "");

const [selectedOutcome, setSelectedOutcome] = useState(outcomeOptions[0]?.id ?? "");

useEffect(() => {
    if (!triggerOptions.some((option) => option.id === selectedTrigger)) {
      setSelectedTrigger(triggerOptions[0]?.id ?? "");
    }
  }, [cycleTrackingHidden, customCorrelationOptionKey, selectedTrigger, view.custom.foodQuickAdd]);

useEffect(() => {
    if (!outcomeOptions.some((option) => option.id === selectedOutcome)) {
      setSelectedOutcome(outcomeOptions[0]?.id ?? "");
    }
  }, [customCorrelationOptionKey, selectedOutcome]);'''
new = '''const triggerOptionIdKey = triggerOptions.map((option) => option.id).join("\\u0000");
const outcomeOptionIdKey = outcomeOptions.map((option) => option.id).join("\\u0000");

const [selectedTrigger, setSelectedTrigger] = useState(triggerOptions[0]?.id ?? "");

const [selectedOutcome, setSelectedOutcome] = useState(outcomeOptions[0]?.id ?? "");

useEffect(() => {
    const ids = triggerOptionIdKey ? triggerOptionIdKey.split("\\u0000") : [];
    if (!ids.includes(selectedTrigger)) setSelectedTrigger(ids[0] ?? "");
  }, [selectedTrigger, triggerOptionIdKey]);

useEffect(() => {
    const ids = outcomeOptionIdKey ? outcomeOptionIdKey.split("\\u0000") : [];
    if (!ids.includes(selectedOutcome)) setSelectedOutcome(ids[0] ?? "");
  }, [outcomeOptionIdKey, selectedOutcome]);'''
if old not in s:
    raise SystemExit("Pattern option effects block missing")
p.write_text(s.replace(old, new, 1))

one(
    "src/features/profile/useProfilePageModel.tsx",
    "  }, [hydrated, prefsSignature]);",
    "  }, [hydrated, prefsSignature, view.postpartum?.active, view.pregnancy?.active, view.settings.backup, view.settings.notif, view.settings.privacy, view.settings.tracking, view.settings.units]);",
    "Profile preference dependencies",
)

p = Path("src/lib/cloudSync.ts")
s = p.read_text()
old = '''export function useCloudSync() {
  const { session, ready } = useSession();

  useEffect(() => {
    if (!ready) return;

    if (!session) {
      setPartner(undefined);
      return;
    }

    const userId = session.user.id;'''
new = '''export function useCloudSync() {
  const { session, ready } = useSession();
  const sessionUserId = session?.user?.id ?? null;

  useEffect(() => {
    if (!ready) return;

    if (!sessionUserId) {
      setPartner(undefined);
      return;
    }

    const userId = sessionUserId;'''
if old not in s:
    raise SystemExit("Cloud sync session block missing")
s = s.replace(old, new, 1).replace("  }, [ready, session?.user?.id]);", "  }, [ready, sessionUserId]);", 1)
p.write_text(s)
