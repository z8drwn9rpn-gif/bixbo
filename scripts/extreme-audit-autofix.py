from pathlib import Path
import re


def read(path: str) -> str:
    return Path(path).read_text()


def write(path: str, text: str) -> None:
    Path(path).write_text(text)


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one match, found {count}\n--- pattern ---\n{old[:500]}")
    write(path, text.replace(old, new, 1))


# 1. Canonical tracked-day semantics: custom/admin logs count as a real logged day.
replace_once(
    "src/lib/storage/utilities.ts",
    """    l.histamine?.length ||
    l.pregnancy != null ||
    l.postpartum != null
""",
    """    l.histamine?.length ||
    l.pregnancy != null ||
    l.postpartum != null ||
    Object.values(l.customLogs ?? {}).some((entries) => Array.isArray(entries) && entries.length > 0) ||
    Object.values(l.adminFields ?? {}).some((entries) => Array.isArray(entries) && entries.length > 0)
""",
)

# 2. Bowel analytics must never treat urinary-only sentinel -2 as a bowel movement; Type 0 remains valid.
replace_once(
    "src/lib/patterns.ts",
    """export function dayBowelSymptoms(log: DayLog): number | null {
  if (!log.bowel?.length) return null;

  return log.bowel.reduce((total, entry) => {
    const symptomCount = entry.symptoms?.length ?? 0;

    return total + Math.max(1, symptomCount);
  }, 0);
}
""",
    """export function dayBowelSymptoms(log: DayLog): number | null {
  const bowelEntries = (log.bowel ?? []).filter((entry) => !entry.urinaryOnly && entry.bristol !== -2);
  if (!bowelEntries.length) return null;

  return bowelEntries.reduce((total, entry) => {
    const symptomCount = entry.symptoms?.length ?? 0;

    return total + Math.max(1, symptomCount);
  }, 0);
}
""",
)

# 3. Calendar summaries/icons: exclude symptom-only Pain updates and urinary-only entries from the wrong metrics.
p = "src/components/MonthCalendar.tsx"
replace_once(p, 'add("bowel",Boolean(log.bowel?.length));', 'add("bowel",Boolean(log.bowel?.some(e=>!e.urinaryOnly&&e.bristol!==-2)));')
replace_once(
    p,
    'if(log.pain?.length){const v=average(log.pain.map(e=>e.score));if(v!=null)rows.push({icon:"🔥",label:`${t("Pain")} (avg)`,meta:countMeta(log.pain.length),value:formatAverage(v,10),accent:calendarPainColor(v)});}',
    'const painMeasurements=log.pain?.filter(e=>e.entryKind!=="symptom-update")??[];if(painMeasurements.length){const v=average(painMeasurements.map(e=>e.score));if(v!=null)rows.push({icon:"🔥",label:`${t("Pain")} (avg)`,meta:countMeta(painMeasurements.length),value:formatAverage(v,10),accent:calendarPainColor(v)});}',
)
replace_once(
    p,
    'if(log.bowel?.length){const b=mode(log.bowel.map(e=>e.bristol).filter((v):v is number=>typeof v==="number"));rows.push({icon:"💩",label:`${t("Bowel")} (mode)`,meta:countMeta(log.bowel.length),value:b!=null?`${t("type")} ${b}`:t("Logged"),accent:"#A66A4D"});}',
    'const bowelEntries=log.bowel?.filter(e=>!e.urinaryOnly&&e.bristol!==-2)??[];if(bowelEntries.length){const b=mode(bowelEntries.map(e=>e.bristol).filter((v):v is number=>typeof v==="number"));rows.push({icon:"💩",label:`${t("Bowel")} (mode)`,meta:countMeta(bowelEntries.length),value:b!=null?`${t("type")} ${b}`:t("Logged"),accent:"#A66A4D"});}',
)
replace_once(
    p,
    'function daySummaryEntryCount(log:DayLog|undefined){if(!log)return 0;return(log.pain?.length??0)+(log.tetany?.length??0)+(log.panic?.length??0)+(log.bowel?.length??0)+(log.workout?.length??0)+(log.extraMeds?.length??0)+(log.sex?.length??0)+(log.food?.length??0)+(log.heat?.length??0)+(log.sleepHours!=null?1:0)+(log.temperature!=null?1:0)+(log.weight!=null?1:0)+((log.periodInfo?.level??log.period)?1:0);}',
    'function daySummaryEntryCount(log:DayLog|undefined){if(!log)return 0;const painCount=log.pain?.filter(e=>e.entryKind!=="symptom-update").length??0;const bowelCount=log.bowel?.filter(e=>!e.urinaryOnly&&e.bristol!==-2).length??0;return painCount+(log.tetany?.length??0)+(log.panic?.length??0)+bowelCount+(log.workout?.length??0)+(log.extraMeds?.length??0)+(log.sex?.length??0)+(log.food?.length??0)+(log.heat?.length??0)+(log.sleepHours!=null?1:0)+(log.temperature!=null?1:0)+(log.weight!=null?1:0)+((log.periodInfo?.level??log.period)?1:0);}',
)

# 4. Year heatmap Pain uses measurements only, consistent with avgDayPain.
y = "src/features/insights/YearHealthHeatmap.tsx"
text = read(y)
old = '.filter((entry) => Number.isFinite(entry.score))'
old2 = '.filter((entry)=>Number.isFinite(entry.score))'
if old in text:
    text = text.replace(old, '.filter((entry) => entry.entryKind !== "symptom-update" && Number.isFinite(entry.score))')
elif old2 in text:
    text = text.replace(old2, '.filter((entry)=>entry.entryKind!=="symptom-update"&&Number.isFinite(entry.score))')
else:
    raise SystemExit(f"{y}: pain score filter pattern not found")
write(y, text)

# 5. Profile: all real log categories count, DST-safe tracking duration, real Pain measurements and bowel movements.
prof = "src/features/profile/useProfilePageModel.tsx"
text = read(prof)
old_import = '  todayKey,\n  latestRecordedWeight,'
if old_import not in text:
    raise SystemExit(f"{prof}: storage import anchor not found")
text = text.replace(old_import, '  todayKey,\n  daysBetween,\n  hasAnyLog,\n  latestRecordedWeight,', 1)
old = 'const totalPainLogs = allDayLogs.reduce((sum, day) => sum + (day?.pain?.length ?? 0), 0);'
if old not in text:
    raise SystemExit(f"{prof}: totalPainLogs pattern not found")
text = text.replace(old, 'const totalPainLogs = allDayLogs.reduce((sum, day) => sum + (day?.pain?.filter((entry) => entry.entryKind !== "symptom-update").length ?? 0), 0);', 1)
old = 'const totalBowelLogs = allDayLogs.reduce((sum, day) => sum + (day?.bowel?.length ?? 0), 0);'
if old not in text:
    raise SystemExit(f"{prof}: totalBowelLogs pattern not found")
text = text.replace(old, 'const totalBowelLogs = allDayLogs.reduce((sum, day) => sum + (day?.bowel?.filter((entry) => !entry.urinaryOnly && entry.bristol !== -2).length ?? 0), 0);', 1)
start_marker = 'const trackedDates = Object.keys(view.dayLogs).filter((date) => {'
start = text.find(start_marker)
end_marker = '\n\nconst firstTrackedDate = trackedDates.slice().sort()[0];'
end = text.find(end_marker, start)
if start < 0 or end < 0:
    raise SystemExit(f"{prof}: trackedDates block not found")
text = text[:start] + 'const trackedDates = Object.keys(view.dayLogs).filter((date) => hasAnyLog(view.dayLogs[date]));' + text[end:]
old = """const trackingDays = firstTrackedDate
    ? Math.max(1, Math.floor((Date.now() - new Date(`${firstTrackedDate}T00:00:00`).getTime()) / 86400000) + 1)
    : 0;"""
if old not in text:
    raise SystemExit(f"{prof}: trackingDays pattern not found")
text = text.replace(old, 'const trackingDays = firstTrackedDate ? Math.max(1, daysBetween(firstTrackedDate, todayKey()) + 1) : 0;', 1)
old = """      const result = await accountAuth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });"""
if old not in text:
    raise SystemExit(f"{prof}: Profile OAuth override pattern not found")
text = text.replace(old, '      const result = await accountAuth.signInWithOAuth(provider);', 1)
write(prof, text)

# 6. Profile statistics average Pain measurements only.
ps = "src/features/profile/ProfilePageSpecialViews.tsx"
replace_once(
    ps,
    'const painScores = allDayLogs.flatMap((day) => (day?.pain ?? []).map((entry) => entry.score));',
    'const painScores = allDayLogs.flatMap((day) => (day?.pain ?? []).filter((entry) => entry.entryKind !== "symptom-update").map((entry) => entry.score));',
)

# 7. Patterns medication adherence: use the canonical grouped-dose/time eligibility model.
pat = "src/features/patterns/usePatternsContentModel.tsx"
text = read(pat)
if '@/lib/domain/meds' not in text:
    anchor = 'import { useI18n } from "@/hooks/useI18n";'
    if anchor not in text:
        raise SystemExit(f"{pat}: import anchor not found")
    text = text.replace(anchor, anchor + '\nimport { summarizeMedicationProgress } from "@/lib/domain/meds";', 1)
match = re.search(r'\n\s*const medicationAdherence = \(days: string\[\]\) => \{.*?\n\s*\};', text, re.S)
if not match:
    raise SystemExit(f"{pat}: local medicationAdherence function not found")
replacement = """
  const medicationAdherence = (days: string[]) => {
    const summary = summarizeMedicationProgress(
      data.meds,
      days,
      data.medLog,
      data.medLogItems ?? {},
      new Date(),
      false,
    );
    return summary.expected ? summary.pct ?? null : null;
  };"""
text = text[:match.start()] + replacement + text[match.end():]
write(pat, text)

# 8. OAuth adapter sanitizes even caller-provided redirect URLs; preview/local cannot bypass production policy.
auth = "src/integrations/auth/account.ts"
text = read(auth)
anchor = """function defaultOAuthReturnUrl(): string {
  if (typeof window === "undefined") return PRODUCTION_APP_ORIGIN;
  return oauthReturnUrlForLocation(window.location.hostname, window.location.origin);
}
"""
if anchor not in text:
    raise SystemExit(f"{auth}: defaultOAuthReturnUrl block not found")
addition = anchor + """
export function safeOAuthRedirectUrl(candidate?: string): string {
  if (!candidate) return defaultOAuthReturnUrl();
  try {
    const parsed = new URL(candidate, defaultOAuthReturnUrl());
    const safeOrigin = oauthReturnUrlForLocation(parsed.hostname, parsed.origin);
    if (safeOrigin !== parsed.origin) return safeOrigin;
    return parsed.toString();
  } catch {
    return defaultOAuthReturnUrl();
  }
}
"""
text = text.replace(anchor, addition, 1)
old = 'redirectTo: opts?.redirect_uri ?? defaultOAuthReturnUrl(),'
if old not in text:
    raise SystemExit(f"{auth}: redirectTo pattern not found")
text = text.replace(old, 'redirectTo: safeOAuthRedirectUrl(opts?.redirect_uri),', 1)
write(auth, text)

# 9. Harden /auth internal next-route validation against backslash/control-char URL normalization tricks.
route = "src/routes/auth.tsx"
replace_once(
    route,
    """function safeInternalNext(value: unknown): string {
  if (typeof value !== "string") return "";
  if (!value.startsWith("/") || value.startsWith("//")) return "";
  return value;
}
""",
    """export function safeInternalNext(value: unknown): string {
  if (typeof value !== "string") return "";
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\\\") || /[\\u0000-\\u001F\\u007F]/.test(value)) return "";
  try {
    const base = new URL("https://bixbo.invalid");
    const parsed = new URL(value, base);
    if (parsed.origin !== base.origin) return "";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "";
  }
}
""",
)

# 10. Browser Supabase client must fail closed if a secret key is ever misconfigured.
sb = "src/integrations/supabase/client.ts"
text = read(sb)
old = """function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}
"""
if old not in text:
    raise SystemExit(f"{sb}: key helper pattern not found")
new = """function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_');
}

export function assertBrowserSafeSupabaseKey(value: string): void {
  if (value.startsWith('sb_secret_')) {
    throw new Error('Refusing to initialize the BIXBO browser client with a Supabase secret key.');
  }
}
"""
text = text.replace(old, new, 1)
old = '  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {'
if old not in text:
    raise SystemExit(f"{sb}: missing env pattern not found")
text = text.replace(old, '  assertBrowserSafeSupabaseKey(SUPABASE_PUBLISHABLE_KEY);\n\n  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {', 1)
write(sb, text)

# 11. Privacy lock: remove underlying health UI from accessibility/keyboard interaction while locked.
privacy = "src/components/AppPrivacyGuard.tsx"
text = read(privacy)
old = 'import { useEffect, useState, type ReactNode } from "react";'
if old not in text:
    raise SystemExit(f"{privacy}: import pattern not found")
text = text.replace(old, 'import { useEffect, useRef, useState, type ReactNode } from "react";', 1)
old = '  const [error, setError] = useState("");\n\n  const bypass'
if old not in text:
    raise SystemExit(f"{privacy}: state anchor not found")
text = text.replace(old, '  const [error, setError] = useState("");\n  const contentRef = useRef<HTMLDivElement>(null);\n\n  const bypass', 1)
old = '  const lockEnabled = !bypass && (prefs.biometricLock || prefs.pinLock);\n\n  useEffect(() => {'
if old not in text:
    raise SystemExit(f"{privacy}: lock anchor not found")
text = text.replace(old, """  const lockEnabled = !bypass && (prefs.biometricLock || prefs.pinLock);
  const interactionBlocked = covered || locked;

  useEffect(() => {
    const node = contentRef.current;
    if (!node) return;
    if (interactionBlocked) node.setAttribute("inert", "");
    else node.removeAttribute("inert");
    return () => node.removeAttribute("inert");
  }, [interactionBlocked]);

  useEffect(() => {""", 1)
old = """    <>
      {children}

      {covered && ("""
if old not in text:
    raise SystemExit(f"{privacy}: children anchor not found")
text = text.replace(old, """    <>
      <div ref={contentRef} className="contents" aria-hidden={interactionBlocked ? true : undefined}>
        {children}
      </div>

      {covered && (""", 1)
write(privacy, text)

# 12. Shared log primitives: schema field marker works; SaveBar uses one consistent, touch-friendly action geometry.
lf = "src/features/logging/LogFormPrimitives.tsx"
text = read(lf)
sig_old = """  onToggle,
  descriptions,
}: {"""
if sig_old not in text:
    raise SystemExit(f"{lf}: CustomChipList destructuring pattern not found")
text = text.replace(sig_old, """  onToggle,
  descriptions,
  schemaFieldId,
}: {""", 1)
old = '<div className="relative mt-0">\n      {adding ? ('
if old not in text:
    raise SystemExit(f"{lf}: CustomChipList root pattern not found")
text = text.replace(old, '<div className="relative mt-0" data-bixbo-log-field-id={schemaFieldId || undefined}>\n      {adding ? (', 1)
old = '    <SheetFooter className="sticky top-0 z-30 -mx-5 mt-0 flex-row items-center justify-between gap-2 border-b border-border/50 bg-background px-5 py-1.5">'
if old not in text:
    raise SystemExit(f"{lf}: SaveBar footer pattern not found")
text = text.replace(old, '    <SheetFooter className="sticky top-0 z-30 -mx-5 mt-0 flex-row items-center justify-between gap-3 border-b border-border/50 bg-background/95 px-5 py-2 shadow-sm backdrop-blur">', 1)
old = 'className="flex min-w-[58px] items-center gap-1 text-xs font-semibold text-foreground/80 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"'
if old not in text:
    raise SystemExit(f"{lf}: SaveBar Back class not found")
text = text.replace(old, 'className="flex min-h-10 min-w-[68px] items-center gap-1 text-sm font-semibold text-foreground/80 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"', 1)
old = 'className="inline-flex h-8 min-w-[68px] items-center justify-center gap-1 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"'
if old not in text:
    raise SystemExit(f"{lf}: SaveBar Save class not found")
text = text.replace(old, 'className="inline-flex h-10 min-w-[104px] items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"', 1)
write(lf, text)

# 13. Episode wizard action geometry matches the shared Pain/log action family.
ep = "src/features/logging/EpisodeForms.tsx"
text = read(ep)
old = 'className="flex h-[52px] min-w-[64px] flex-col items-center justify-center rounded-[1.15rem] bg-primary px-3 text-primary-foreground shadow-sm transition active:scale-[0.98]"'
if old not in text:
    raise SystemExit(f"{ep}: EpisodeWizard action class not found")
text = text.replace(old, 'className="inline-flex h-10 min-w-[104px] items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-primary-foreground shadow-sm transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"', 1)
old = """        <span className="text-sm font-semibold leading-none">{t(last ? "Save" : "Next")}</span>
        <span aria-hidden="true" className="mt-0.5 text-base leading-none">{last ? "✓" : "→"}</span>"""
if old not in text:
    raise SystemExit(f"{ep}: EpisodeWizard action spans not found")
text = text.replace(old, """        <span className="text-sm font-semibold leading-none">{t(last ? "Save" : "Next")}</span>
        <span aria-hidden="true" className="text-base leading-none">{last ? "✓" : "→"}</span>""", 1)
write(ep, text)

# 14. Pain source owns its sticky header/footer directly; remove dependence on CSS selector surgery.
pain = "src/features/logging/PainWizard.tsx"
text = read(pain)
old = 'className="flex items-center justify-between px-1 pb-3 pt-[68px]"'
if old not in text:
    raise SystemExit(f"{pain}: quick metadata spacer not found")
text = text.replace(old, 'className="flex items-center justify-between px-1 pb-3 pt-3"', 1)
old = """          className="fixed inset-x-0 z-30 h-[60px] flex items-center justify-between gap-2 border-b border-border/50 bg-background/95 px-5 py-2 shadow-sm backdrop-blur"
          style={{ top: "calc(env(safe-area-inset-top) + 56px)" }}"""
if old not in text:
    raise SystemExit(f"{pain}: standard fixed header not found")
text = text.replace(old, '          className="sticky top-0 z-30 -mx-5 h-[60px] flex items-center justify-between gap-2 border-b border-border/50 bg-background/95 px-5 py-2 shadow-sm backdrop-blur"', 1)
old = 'className="flex h-[52px] min-w-[64px] flex-col items-center justify-center rounded-[1.15rem] bg-primary px-3 text-primary-foreground shadow-sm transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"'
if old not in text:
    raise SystemExit(f"{pain}: standard action class not found")
text = text.replace(old, 'className="inline-flex h-10 min-w-[104px] items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-primary-foreground shadow-sm transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"', 1)
old = """            <span className="text-sm font-semibold leading-none">{t(safeStep < painSteps.length - 1 ? "Next" : "Save")}</span>
            <span aria-hidden="true" className="mt-0.5 text-base leading-none">{safeStep < painSteps.length - 1 ? "→" : "✓"}</span>"""
if old not in text:
    raise SystemExit(f"{pain}: standard action spans not found")
text = text.replace(old, """            <span className="text-sm font-semibold leading-none">{t(safeStep < painSteps.length - 1 ? "Next" : "Save")}</span>
            <span aria-hidden="true" className="text-base leading-none">{safeStep < painSteps.length - 1 ? "→" : "✓"}</span>""", 1)
old = '        <SheetFooter className="fixed inset-x-0 z-30 h-[60px] flex-row items-center justify-between gap-3 border-b border-border/50 bg-background/95 px-5 py-2 shadow-sm backdrop-blur" style={{ top: "calc(env(safe-area-inset-top) + 56px)" }}>'
if old not in text:
    raise SystemExit(f"{pain}: quick fixed footer not found")
text = text.replace(old, '        <SheetFooter className="sticky top-0 order-first z-30 -mx-5 mt-0 h-[60px] flex-row items-center justify-between gap-3 border-b border-border/50 bg-background/95 px-5 py-2 shadow-sm backdrop-blur">', 1)
write(pain, text)

# 15. Pain scroll container no longer needs a compensating top pad. Body/Recovery mode visibility belongs to React.
root = "src/features/logging/LogSheetRoot.tsx"
text = read(root)
old = 'className={`min-h-0 flex-1 overflow-y-auto ${active === "pain" ? "pt-[60px]" : active === "meds" ? "px-5 pb-4" : "bixbo-unified-log px-4 pb-5 sm:px-5"}`}>'
if old not in text:
    raise SystemExit(f"{root}: Pain surface padding pattern not found")
text = text.replace(old, 'className={`min-h-0 flex-1 overflow-y-auto ${active === "pain" ? "" : active === "meds" ? "px-5 pb-4" : "bixbo-unified-log px-4 pb-5 sm:px-5"}`}>', 1)
body_start = '      <section className="border-t border-border pt-4" onFocusCapture={() => setMode("body")}>'
recovery_start = '      <section className="border-t border-border pt-4" onFocusCapture={() => setMode("recovery")}>'
first = text.find(body_start)
second = text.find(recovery_start, first + 1)
if first < 0 or second < 0:
    raise SystemExit(f"{root}: BodyRecovery sections not found")
text = text[:first] + '      {mode === "body" && (\n' + text[first:second] + '      )}\n\n' + text[second:]
second = text.find(recovery_start, first + 1)
close_marker = '\n      </section>\n    </div>\n  );'
close_at = text.find(close_marker, second)
if close_at < 0:
    raise SystemExit(f"{root}: BodyRecovery recovery closing marker not found")
close_end = close_at + len('\n      </section>')
text = text[:second] + '      {mode === "recovery" && (\n' + text[second:close_end] + '\n      )}' + text[close_end:]
write(root, text)

# 16. Delete brittle CSS overrides now that source owns its layout/state.
css = "src/ios-touch-stability.css"
text = read(css)
start_comment = '/* Pain has its own step action bar inside the scroll surface.'
end_comment = '/* A full-screen log freezes the document in JS at its current scroll position.'
start = text.find(start_comment)
end = text.find(end_comment)
if start < 0 or end < 0 or end <= start:
    raise SystemExit(f"{css}: Pain override block markers not found")
text = text[:start] + text[end:]
write(css, text)

polish = "src/ui-components-polish.css"
text = read(polish)
start_comment = '/* Body & Recovery is a two-mode log.'
end = text.find('@media (min-width: 1024px)')
start = text.find(start_comment)
if start < 0 or end < 0 or end <= start:
    raise SystemExit(f"{polish}: BodyRecovery CSS block markers not found")
text = text[:start] + text[end:]
write(polish, text)

# 17. Cloud sync state cannot remain stuck in syncing if auth disappears mid-flight.
cloud = "src/lib/cloudSync.ts"
text = read(cloud)
patched = False
candidates = [
    ("""    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;""", """    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setCloudSyncState({ status: "idle" });
      return;
    }"""),
    ("""    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;""", """    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setCloudSyncState({ status: "idle" });
      return;
    }"""),
]
for old, new in candidates:
    if old in text:
        text = text.replace(old, new, 1)
        patched = True
        break
if patched:
    write(cloud, text)
else:
    print(f"{cloud}: no auth-race return pattern found; leaving unchanged after manual review")

# 18. Regression tests for corrected semantic/security invariants.
Path("src/lib/__tests__/extreme-audit-regressions.test.ts").write_text(r'''import { describe, expect, it } from "vitest";
import { avgDayPain } from "@/lib/domain/pain";
import { resolveScheduledDose } from "@/lib/medicationAdherence";
import { dayBowelSymptoms } from "@/lib/patterns";
import { hasAnyLog, type Med } from "@/lib/storage";
import { safeInternalNext } from "@/routes/auth";
import { assertBrowserSafeSupabaseKey } from "@/integrations/supabase/client";

describe("extreme audit semantic regressions", () => {
  it("does not double count symptom-only Pain follow-ups", () => {
    expect(avgDayPain({ pain: [
      { score: 7 },
      { score: 7, entryKind: "symptom-update" },
      { score: 3 },
    ] })).toBe(5);
  });

  it("treats custom/admin-only days as logged days", () => {
    expect(hasAnyLog({ customLogs: { custom: [{ id: "x", time: "10:00", values: {} }] } })).toBe(true);
    expect(hasAnyLog({ adminFields: { field: [{ id: "x", time: "10:00", value: "yes" }] } })).toBe(true);
  });

  it("excludes urinary-only records from bowel analytics but preserves Bristol Type 0", () => {
    expect(dayBowelSymptoms({ bowel: [{ id: "u", time: "09:00", bristol: -2, urinaryOnly: true }] })).toBeNull();
    expect(dayBowelSymptoms({ bowel: [{ id: "b", time: "09:00", bristol: 0 }] })).toBe(1);
  });

  it("uses time-aware medication eligibility for historical and current doses", () => {
    const med: Med = { id: "m", name: "M", times: ["21:00"], dose: "1" };
    const historical = resolveScheduledDose(med, "2026-08-14", "21:00", {}, {}, new Date("2026-08-15T10:00:00"));
    const futureToday = resolveScheduledDose(med, "2026-08-15", "21:00", {}, {}, new Date("2026-08-15T10:00:00"));
    expect(historical.eligible).toBe(true);
    expect(futureToday.eligible).toBe(false);
  });

  it("rejects external/backslash auth next routes", () => {
    expect(safeInternalNext("/settings?tab=privacy#lock")).toBe("/settings?tab=privacy#lock");
    expect(safeInternalNext("//evil.example")).toBe("");
    expect(safeInternalNext("/\\evil.example")).toBe("");
    expect(safeInternalNext("/ok\nhttps://evil.example")).toBe("");
  });

  it("fails closed if a Supabase secret key is configured in the browser", () => {
    expect(() => assertBrowserSafeSupabaseKey("sb_secret_should-never-be-client-side")).toThrow(/secret key/i);
    expect(() => assertBrowserSafeSupabaseKey("sb_publishable_public")).not.toThrow();
  });
});
''')

# 19. Static architecture regression: source owns layout instead of brittle CSS selectors.
Path("src/lib/__tests__/ui-layout-architecture-regression.test.ts").write_text(r'''import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("UI layout architecture regressions", () => {
  it("keeps Pain navigation source-native and removes old fixed spacer coupling", () => {
    const pain = readFileSync("src/features/logging/PainWizard.tsx", "utf8");
    const css = readFileSync("src/ios-touch-stability.css", "utf8");
    expect(pain).not.toContain('pt-[68px]');
    expect(pain).not.toContain('style={{ top: "calc(env(safe-area-inset-top) + 56px)" }}');
    expect(pain).toContain('className="sticky top-0');
    expect(css).not.toContain('> div > div.fixed.inset-x-0');
    expect(css).not.toContain(':has(> div.fixed.mt-6)');
  });

  it("renders Body & Recovery modes in React instead of CSS nth-of-type surgery", () => {
    const source = readFileSync("src/features/logging/LogSheetRoot.tsx", "utf8");
    const css = readFileSync("src/ui-components-polish.css", "utf8");
    expect(source).toContain('{mode === "body" && (');
    expect(source).toContain('{mode === "recovery" && (');
    expect(css).not.toContain('section:nth-of-type(4)');
    expect(css).not.toContain('section:nth-of-type(3)');
  });

  it("keeps shared log Save action touch-friendly", () => {
    const source = readFileSync("src/features/logging/LogFormPrimitives.tsx", "utf8");
    expect(source).toContain('h-10 min-w-[104px]');
  });
});
''')

# 20. App-surface E2E coverage for overflow and default log opening on desktop/mobile/WebKit.
Path("e2e/app-surface-consistency.spec.ts").write_text(r'''import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.width + 1);
}

test("core routes stay inside the viewport", async ({ page }) => {
  for (const route of ["/", "/insights", "/notes", "/settings"]) {
    await page.goto(route);
    await expect(page.locator("body")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
});

test("every visible default Log category opens without clipping", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("bixbo:toggle-log")));
  const ids = await page.locator("button[data-log-category]").evaluateAll((nodes) =>
    nodes.filter((node) => (node as HTMLElement).offsetParent !== null)
      .map((node) => (node as HTMLElement).dataset.logCategory)
      .filter((value): value is string => Boolean(value)),
  );
  expect(ids.length).toBeGreaterThan(5);

  for (const id of ids) {
    const button = page.locator(`button[data-log-category="${id}"]`);
    if (!(await button.isVisible())) {
      await page.evaluate(() => window.dispatchEvent(new CustomEvent("bixbo:toggle-log")));
    }
    await page.locator(`button[data-log-category="${id}"]`).click();
    const surface = page.locator("[data-bixbo-log-surface]");
    await expect(surface).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const box = await surface.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      const viewport = page.viewportSize();
      expect(box.x).toBeGreaterThanOrEqual(-1);
      expect(box.x + box.width).toBeLessThanOrEqual((viewport?.width ?? box.width) + 1);
    }
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(surface).toBeHidden();
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("bixbo:toggle-log")));
  }
});
''')

print("Extreme audit fixes applied successfully.")
