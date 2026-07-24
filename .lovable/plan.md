# BIXBO redesign

Big restructure. Reading it before I start — one important note about cloud sync at the bottom.

## 1. Language
Switch the whole UI to English. Rename tabs, buttons, dialogs, headings, months, weekdays.

## 2. Navigation (simpler)
Bottom nav becomes just **two** items:
- **Home** — calendar + today summary + medication schedule all in one screen (calendar, today, and meds merged as requested)
- **Notes** — the free-form notebook

A floating **`+`** button on Home opens the "Log" sheet (Endolog-style), which lists categories:
Pain · Heat session · Period · Food · Bowel · Temperature & weight · Meds · Sexual activity · Note · Task

Tapping a category opens a focused, single-purpose sheet. Every sheet ends with an explicit **Save** button (nothing auto-saves silently).

## 3. Pain — multi-step wizard
Endolog Mankosky-style. Four steps, one screen each, Back/Next:
1. **Pain scale (0–10, with 0.5 steps)** — big number, description under it (Pain free, Very minor annoyance, … Unconscious). Slider with `step=0.5` OR tap a number chip; half-steps shown as 5.5, 6.5, etc.
2. **Where does it hurt?** — body-part chips (Abdomen, Lower abdomen, Lower belly, Pelvis, Ovaries, Uterus, Vagina, Groin, Back, Head, Legs, Other). Multi-select.
3. **How does it hurt?** — quality chips (Cramping, Stabbing, Burning, Dull, Sharp, Throbbing, Pressure, Shooting). Multi-select.
4. **Other symptoms + note** — chips (Nausea, Dizziness, Fatigue, Bloating, Diarrhea, Constipation, …) + free-text "How I feel".

## 4. Other logging sheets
- **Heat session** — start time, duration (minutes), free-text note.
- **Period** — 5 intensity chips (unchanged).
- **Food** — time picker + what I ate + "How I feel after" note (histamine tracking).
- **Bowel** — Bristol stool scale 1–7 with color per type + optional note. Records timestamp.
- **Temperature & weight** — two inputs.
- **Meds** — quick "taken" toggles for today's scheduled meds + "Add extra dose" (free-text one-off, saved into medLog as an ad-hoc entry).
- **Sexual activity** — with/without condom/none + optional note.
- **Note** — free text for the day.
- **Task** — todo item for the day.

## 5. Calendar rings (fix pain visibility)
Each day cell shows:
- Fill color = period intensity
- **Thicker outer ring** = pain logged (currently 2.5px; bump to 4px and place it *outside* the period fill so it's visible over red)
- Small icon row under the number for what was logged that day: 💊 (meds), 💩 (bowel), ❤️ (sex), 🌡️ (temp/weight), 🔥 (heat session)

## 6. Medications
Keep 3× daily default schedule + as-needed. Add "extras" (unplanned doses) that get logged with timestamp. Med icon 💊 appears on the calendar for any day with at least one taken/extra dose.

## 7. Data storage — important tradeoff
You asked for **permanent cloud storage that doesn't cost credits to maintain**. That combination isn't possible on Lovable — any cloud backend (Lovable Cloud / Supabase) uses credits for storage and requests. Options:

- **A. Keep localStorage only** (current) — free forever, but data lives in one browser only; switching phones/browsers loses it. Export/Import JSON button for manual backup.
- **B. Enable Lovable Cloud** — real cross-device sync with sign-in. Uses credits (small monthly free allowance included in your plan, then usage-based).
- **C. Hybrid** — local-first + optional Cloud sync when you're ready.

**I'll build option A now** (with an Export/Import backup button) so the redesign ships. When you want cross-device sync, say the word and I'll add Cloud.

## Technical notes
- New `LogSheet` component (bottom sheet with category grid) triggered from a floating `+`.
- New per-category sheet components with a shared `<Sheet>` wrapper and a mandatory Save action.
- Extend `DayLog` type: `pain` → `{ score:number; parts:string[]; quality:string[]; symptoms:string[]; note:string }`; add `heatSessions[]`, `bowel` → `{ bristol:1..7; note? }`, `food` → array of `{ time, what, after }`, `sex` → `{ type; note? }`.
- Migration: read old flat fields once on load and lift them into the new shape so nothing is lost.
- Calendar cell: outer ring rendered as a separate absolutely-positioned div so it sits above the period fill.

Confirm and I'll build it.
