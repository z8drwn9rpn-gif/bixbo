
# BIXBO — big redesign v2

Toto je velká zmena. Prečítaj si to a povedz "poď" — potom to postavím.

## 1. Layout Home — kalendár + prehľad dňa na jednej strane
Ako na Endolog screenshote:
- Hore hlavička: veľká hrubá 🍓 **BIXBO** (jahoda väčšia), pod ňou mesiac + rok hrubo a veľký (napr. **March 2026 ▾**) so šípkami ◀ ▶.
- Pod tým **mesačný kalendár** (kruhy s farbami / prstencami / event-pruhmi).
- Pod kalendárom **prehľad označeného dňa** (dátum + zoznam všetkého čo je zapísané: pain entries, period, food, bowel, meds, workout, event, task, note, temp/weight/sleep, ŠukŠuk, Blueberry poznámky). Klik na deň v kalendári len zmení výber pod ním — **žiadna druhá obrazovka**.
- Dnešný deň = **plné žlté koliesko, číslo hrubo**.
- Ďalšia menstruácia (predikcia z 15.7–19.7, cyklus 28d, 5d) = **oranžové hrubé kolieska** na predikovaných dňoch.
- Pod prehľadom dňa: veľký **+ Log** button (floating).
- Každá položka v prehľade dňa má **⋯ menu → Edit / Delete** aby sa dala prepísať alebo zmazať.
- Button **Share the day** — vygeneruje textový sumár (dnes pain X, časti…) a otvorí systémový share.

## 2. Bottom nav — 3 taby
**Home** · **Health of Bixbo** (insights) · **Notes**

## 3. Log sheet — kompaktné riadky
Namiesto veľkých kaziet: malý bottom sheet len na pol obrazovky, položky **v riadkoch pod sebou** (ikona + názov), farebné smajlíky/ikony zostanú. Po výbere kategórie sa otvorí **fullscreen** editor pre danú kategóriu (nie polovica displeja).

Kategórie v Log (nové názvy):
- **Pain**
- **Blueberry 🫐** (bývalé Period)
- **ŠukŠuk! ❤️** (bývalé Sexual activity)
- **Food**
- **Bowel**
- **Heat / Cold session**
- **Workout 🧘🏼‍♀️**
- **Temp / Weight / Sleep**
- **Meds**
- **Event**
- **Task**
- **Note**

## 4. Pain wizard (fullscreen, 4 kroky, farebné)
1. **Pain scale 0–10 (0.5 krok)** — veľké **koliesko s číslom**, farba podľa úrovne (zelená 0–2, limetka 3, žltá 4–5, oranžová 6–7, červená 8–10). Pod tým popis (Pain free, Very minor annoyance…). Slider + rýchle chipy 0..10 vrátane .5.
2. **Where does it hurt** — chipy body parts + **➕ Add own** (custom časť sa uloží do zoznamu do budúcna).
3. **How does it hurt** — chipy quality + **➕ Add own**.
4. **Other symptoms + note** — chipy + free text + **Save**.

## 5. Blueberry 🫐 (period)
- 5 intenzít (spotting → very heavy) s farbou.
- **Poznámka** k dňu periódy.
- **Vytok (discharge)**: typ (creamy, watery, egg-white, sticky, brown, yellow, none) + poznámka.
- Predikcia ďalšej menstruácie z posledných dát (default: 15.7.2026–19.7.2026, cyklus 28d, dĺžka 5d) — nastaviteľné v malom paneli v editore.

## 6. ŠukŠuk! ❤️
Typy (multi-select): **Sex with condom, Sex without condom, Fingering, Suck dick, Other** + poznámka. V kalendári ikona ❤️.

## 7. Food
Time + čo som jedla + **ako sa cítim po** (chipy: Bloated, Stomach pain, Nausea, Fine, Energy up, Sluggish, Reflux, …) + **➕ Add own** + smajlíky 😀🙂😐🙁🤢 na rýchlu náladu.

## 8. Bowel
Bristol 1–7 s **obrázkami/ikonami** (SVG karta pre každý typ, farba podľa typu) + poznámka. Farebné karty ako na 5. obrázku.

## 9. Heat / Cold session
Výber **Heat 🔥 / Cold 🧊**, čas začiatku, trvanie (min alebo h), poznámka.

## 10. Workout 🧘🏼‍♀️
Typ (Yoga, Walk, Gym, Stretch, Pilates, Other + ➕), trvanie, **ako sa cítim po** (chipy + smajlíky), **weight** (voliteľné — presunuté sem z Temp). Ikona 🧘🏼‍♀️ v kalendári.

## 11. Temp / Weight / Sleep
Temperature, Weight (zostáva aj tu voliteľne), **Sleep hours**. V kalendári sa ikonka **NEZOBRAZUJE**, len v prehľade dňa.

## 12. Meds
Zostáva; **v prehľade dňa** ukázať zoznam ktoré lieky som brala + čas. Ikona 💊 v kalendári.

## 13. Event (nové — kalendárový typ)
Dátum od–do, čas, názov, poznámka, farba. V kalendári sa zobrazí ako **pruh cez dni** (ako "PN" na 3. obrázku).

## 14. Task
Dátum od–do, čas (voliteľné), text. V prehľade dňa **checkbox** na done. V kalendári farebný pruh (ako event, iná farba).

## 15. Note (v kalendári)
Krátky text ku dňu; v prehľade dňa vlastná karta. V kalendári farebný malý pruh.

## 16. Kalendár — vizuál
- Bunka: kruh s číslom.
- Fill = perioda (farba podľa intenzity).
- Vonkajší **hrubší farebný prstenec** = pain (farba podľa maxPain: zelená/žlta/oranžová/červená), hrúbka 4px, mimo period fillu.
- Predikcia periódy = oranžový hrubý ring (bez fillu).
- Dnes = žlté plné koliesko, hrubé číslo.
- Pod číslom malý riadok ikon: 💊 💩 ❤️ 🔥/🧊 🧘🏼‍♀️ 🫐. **Bez** 🌡️.
- Pod bunkami event/task pruhy s názvom (ako Apple Calendar), max 2–3 viditeľné + "+N".

## 17. Health of Bixbo (insights)
Nová stránka s prehľadmi:
- **Pain**: týždeň / mesiac / rok — čiarový graf priemer + max.
- **ŠukŠuk**: mesačný graf frekvencie.
- **Blueberry (period)**: ročný pohľad — pravidelnosť, priemerná dĺžka cyklu, priemerná dĺžka menstruácie, predikcia ďalšej.
- **Sleep / Weight**: mesačný trend (bonus).
Prepínač period (W / M / Y) hore.

## 18. Notes (nová štruktúra)
- Zoznam **priečinkov** (Folders) — vytvoriť/premenovať/zmazať.
- V priečinku zoznam **notes**.
- Klik na note = **fullscreen editor** (titulok + text, autosave, Delete).
- Ako iPhone Notes, len jednoduchšie.

## 19. Farby / dizajn
- Zelená paleta v rôznych odtieňoch (mint, sage, forest, lime akcent) — už žiadna rúžova ako dominantná.
- Pain škála: zelená → žltá → oranžová → červená (len na pain a health).
- Perioda: odtiene ružovo-červenej (musí ostať aby dávalo zmysel).
- Hrubšie nadpisy, väčšie mesiace, väčšia jahoda vedľa BIXBO.
- Dizajn inšpirovaný Endologom (biele karty, jemné tiene, veľký serif nadpis).

## 20. Editovanie / mazanie
Každá zapísaná položka (pain entry, food, bowel, event, task, med…) má v prehľade dňa **⋯ menu**: Edit (otvorí ten istý fullscreen editor s predvyplnenými údajmi) / Delete (confirm).

## 21. Data
Zostáva localStorage (cloud sync = kredity, ako sme sa dohodli). Rozšírim `DayLog` o: `events[]`, `workout[]`, `sleep`, `discharge`, custom lists (bodyParts, painQuality, foodFeelings, workoutTypes), `periodMeta` (lastStart, lastEnd, cycleLen, periodLen).

## Technické (pre teba, nemusíš to čítať)
- Route: `/insights` pribudne.
- `LogSheet` prerobiť na kompaktné riadky, každá kategória otvorí vlastnú fullscreen `Sheet` (side="bottom" h-[100dvh]).
- Farby v `src/styles.css` prekopať na zelenú paletu + pain gradient tokens.
- Kalendár: layer pre event/task bary (compact monthly agenda).
- Prediction util: `nextPeriod(lastStart, cycleLen)`.
- Share: `navigator.share({ text })` fallback clipboard.

Povedz **poď** a idem stavať. Ak niečo v zozname preskočiť/upraviť, napíš to teraz.
