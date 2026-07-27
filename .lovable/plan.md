# BIXBO — big batch update

Big list of changes. I'll group by area so nothing gets lost. Confirm and I ship it all in one pass.

## 1. Quick Log row (move ABOVE "Today", simplify)

- Keep first 5 tiles (pain 0/1/5/10 + tetany episode and panic attack) as-is.
- **Tetany**: single tile "Tetany episode" — logs entry with no preset type, user fills details later.
- **Panic**: single tile "Panic attack" — same, no preset, user fills details later.
- **Histamine flare**: move into Food category — quick tap logs a food entry named "Histamine flare".
- **Add ŠukŠuk quick tile** — logs a sex entry ("Sex"), details filled later.
- Remove all mood smileys + battery tiles from quick row.
- Move whole Quick Log strip **above** the "Today" heading.

## 2. Pain wizard additions

- **Symptoms/quality lists**: add all missing tags from the screenshots (digestive, urinary, menstrual & reproductive, physical, mental & cognitive, PCOS-specific, other, alternative treatments) and put them under correct sections. Fix typos where safe.
- **Tetany types**: add (i) info icon next to each type with SK explanation tooltip:
  - Carpopedal spasm, Calf cramps, Twitches around mouth/face, Tingling / numbness, Fasciculations (texts as provided).
  - Add more type options (Laryngospasm, Jaw clenching, Eyelid twitch, Back spasm, Whole-body cramp).
- **Headache type** in Pain wizard, with (i) explanations (tension, migraine, cluster, sinus, hormonal, cervicogenic).
- **Mood chips**: add emoji next to each mood word.
- **Time editor**: allow changing the recorded time of a pain entry. 
- **Blueberry cramp pain** → show in DayPreview.

## 3. Bowel

- Add **Type 0 — Mystery 🌈** (rainbow color).

## 4. Bugs

- Food custom quick-add always writes "Matcha" — fix so it uses the typed value.
- Pain form auto-checks tags the user didn't tap — fix state bleed.
- ŠukŠuk insights count wrong again — recount only true sex entries.
- Weight graph broken — rebuild as Apple-Health-style line chart (year view, smooth line, min/max markers). Apply same style to Body temperature.
- Meds notifications don't fire — fix scheduling + permission request; also enable adherence-drop notifications for me + partner (threshold: ≥2 missed doses in 7 days).
- When a med is taken later than scheduled, overview shows the actual time, not the planned one.
- Meds heatmap: allow **un-checking** a dose (toggle, not one-way).

## 5. Calendar

- Replace the horizontal event row under the date with small colored squares (one per event, using each event's color), so more fit side-by-side.
- Shrink the outer ring slightly (smaller circle, same stroke) so it isn't clipped on the sides.
- Do-dos: hide from calendar cells, keep only in DayPreview.
- Fit **4 mood emojis per row** in the mood picker (currently 3).

## 6. Insights

- Pain bar chart: add X-axis (day-of-month labels) and Y-axis (0–10 pain level labels). Apply to Week / Month / Year views.
- Weight + Temperature: new line-chart component (see §4).

## 7. Couple

- Show only entries from the **current month**.

## 8. Layout

- Move the "+ Log" button to the bottom nav (next to Notes), replacing/reorganising the current nav slot as marked in screenshot. Keep it olive color. 
- Landscape mode: make the app fill the full screen width (remove the 430px max-width clamp when orientation is landscape).
- Ako je napisane BIXBO so smajlikom 🥑 tak to vsade zmen na tohto smajlika 🫒

---

### Technical notes (skip if not interested)

- Files touched: `QuickTags.tsx`, `LogSheet.tsx`, `MonthCalendar.tsx`, `BottomNav.tsx`, `AppShell.tsx`, `routes/index.tsx`, `routes/insights.tsx`, `routes/couple.tsx`, `lib/storage.ts` (add `Bristol 0`, headache type, notification prefs), new `lib/notifications.ts` for scheduling + adherence checks, new `components/LineChart.tsx` for Apple-Health-style graphs.
- Meds notifications: use `Notification` API + `setTimeout` scheduler re-armed on visibility change (no service worker yet); adherence check runs on app load and on med-log change.
- Storage additions are backward-compatible (optional fields, migration on read).

This is a large batch — shall I proceed with all of it, or want me to split into phases (e.g. bugs first, then features)? Proceed with all of it. 