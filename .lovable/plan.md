
# BIXBO v3 — big update

Toto je veľký update. Prečítaj a povedz **poď**, potom to postavím naraz. Dáta v localStorage neprídeš, robím migráciu (staré polia zostanú, nové sa pridajú).

## 1. Log — nové poradie a úpravy
Poradie v Log liste (a v prehľade dňa):
1. Meds
2. Pain
3. **Panic attacks** (nová samostatná kategória)
4. Blueberry 🫐
5. ŠukŠuk! ❤️
6. Heat / Cold / **TENS** session
7. Food
8. Bowel
9. Workout
10. Temp / Sleep / Weight
11. Task
12. Event
13. Note

Medzi kartami v prehľade dňa väčšia medzera.

## 2. Pain — rozšírenia
Pod "Other symptoms" pribudne:
- **Tetánia** (samostatná sekcia v Pain wizarde, krok 4b):
  - Typ: Karpopedálny spazmus / Kŕče v lýtkach / Zášklby okolo úst-tváre / Mravčenie-necitlivosť / Fascikulácie
  - Lokalizácia (chipy: pery, prsty rúk, prsty nôh, lýtka, tvár… + ➕ Add own)
  - Intenzita 1–5, trvanie (min)
  - Spúšťače (chipy): Hyperventilácia/stres, Cvičenie, Chlad, Fáza cyklu, Iné + ➕
  - Čas od poslednej dávky Magnerotu (auto-výpočet z Meds logu)
  - Čo pomohlo (chipy + ➕)
- **Body battery** 1–5 (5 farebných batériek so smajlíkmi ako na screenshote — červená spí, oranžová, žltá, zelená, zelená s bleskom)
- **Mood chipy** (All over the place, Angry, Anxious, Calm, Depressed, Happy, In pain, Irritated, Lonely, Sad, Stressed, Tired… + ➕)
- **Stress scale** 1–10 nad body battery

Farba pozadia Pain editora podľa aktuálneho score (endolog-style — 7 = červené pozadie).

## 3. Panic attacks (nová kategória)
- Čas + dĺžka
- Fyzické príznaky (chipy: búšenie srdca, dýchavičnosť, tlak na hrudi, závraty, mravčenie, triaška, nevoľnosť, horúčava/zimomravosť)
- Kognitívne (chipy: strata kontroly, derealizácia, strach zo smrti)
- Intenzita 1–10
- Spúšťač (text + chipy: konkrétna situácia, žiadny zjavný, myšlienka, miesto)
- Predchádzala hyperventilácia? (Áno/Nie/Až počas)
- Bola prítomná tetánia? (checkbox)
- Čo pomohlo (chipy: pomalý výdych, Frontin, uzemnenie, niekto pri mne + ➕)

## 4. Today badges row
Medzi nadpis "Today" a agendu dňa pridám **horizontálny scrollovateľný riadok kruhových badge**:
- 💊 Meds (modrá) • 💗 Symptoms/Pain (červená) • 💧 Cycle (ružová) • 🍽️ Food (oranžová) • ⚡ Tetánia/Panic (fialová)
- Ak dnes zalogované → zelený checkmark v rohu + počet
- Klik = otvorí quick form danej kategórie

## 5. ŠukŠuk! ❤️
- Vymazať "Sex with condom"
- Typy: Sex, Fingering, Suck dick, Oral, **Other + ➕ add**
- Vlastný **čas** (nastaviteľný, nie len teraz)
- **Ako sa cítim po** (smajlíky + chipy)
- **Bolo to bolestivé?** (Nie / Pred / Počas / Po)
- Ikona ❤️ v kalendári **len** pre Sex (nie fingering/oral); multi-sex za deň = stále jedna ❤️

## 6. Heat/Cold + TENS
Pridám TENS ako tretiu možnosť (⚡).

## 7. Food
- **Pitný režim** (ml)
- **Kofeín** (mg alebo šálky)
- **Alkohol** (drink count)
Zostáva jedlo + ako sa cítim po.

## 8. Bowel — Bristol 1–7 + no bowel
- 7 farebných kariet podľa Bristol chart (fialová Type1, modrá 2, zelená 3, žltá 4, oranžová 5, ružová 6, červená 7) + **No bowel movement**
- Popis podľa oficiálneho chartu (Separate hard lumps, Sausage-shaped lumpy, Sausage with cracks, Smooth soft, Soft blobs, Fluffy mushy, Watery)
- Ikona 💩 v kalendári (už je)
- **Nový graf v Insights**: týždenný stĺpcový podľa typu + počet za týždeň + priemer/deň

## 9. Workout, Temp/Weight/Sleep
- Weight ostáva aj v Temp/Weight/Sleep (dopísať)
- Sleep: pridať **"Ako sa vyspala"** (smajlíky 😴🙁😐🙂😀)

## 10. Task, Event, Note
- Task: **čas od–do** + notes (už je od–do dátum, pridám čas + notes)
- Event: viac **farieb na výber** (paleta 8 farieb)
- Note (v kalendári): pridať **čas**
- Task pruh v kalendári = **ružová** namiesto žltej

## 11. Kalendár
- **Swipe left/right** na zmenu mesiaca (touch gesture)
- Pain score za deň = **priemer** viacerých zápisov (nie max) → farba prstenca aj v Insights
- Predikcia periódy: **notifikácia 1 deň pred** začiatkom (browser Notification)

## 12. Header
- Vedľa BIXBO **🥑** namiesto 🍓 (všade)
- **Ikona ⚙️ Settings vpravo hore**
- Odstrániť "Edit with Lovable" badge (`publish_settings--set_badge_visibility` off)

## 13. Home top zone (nad zápisy)
Malé karty vedľa seba:
- **3/3 taken today** (meds progress)
- **Manage medications** (link)

## 14. Meds
- Pridať **poznámku** k lieku
- Presunúť Backup/Notifications toggles do Settings

## 15. Insights
- **Default tab = Week**
- Nad grafmi **mesiac s ◀ ▶** (aj minulé mesiace)
- Oprava **ŠukŠuk počítania** (počíta len sex eventy, nie fingering/oral duplicitne)
- **Nový: Bowel graf** (týždeň, typy + počet, priemer/deň)
- **Nový: Weight graf** (mesačný trend line)
- **Sleep graf**: <8h červená, =8h žltá, >8h zelená + legenda

## 16. Notes / Folders
- **Checkboxy** v note (grocery list)
- Formátovanie: **bold** a **farebný highlight** textu
- Fullscreen editor (už je)

## 17. Settings (nová route `/settings`)
Ikona ⚙️ vpravo hore v Home:
- **Text size** (Small / Medium / Large / XL) — mení root font-size
- **Notifications** toggle
- **Backup / Restore** (export/import JSON — presunuté sem)
- **Couple sharing** (nižšie)

## 18. Couple sharing (nová funkcia)
Bez cloud backendu to na iných zariadeniach reálne nefunguje — v tomto MVP:
- Vygenerujem **pairing code** (lokálne uložený)
- **Import partner data** cez zdieľaný JSON súbor (partner pošle export, ty importuješ)
- Zobrazím v Insights partnerov pain/panic vedľa mojich (dve farby)

Ak chceš **live sync** medzi zariadeniami, treba zapnúť **Lovable Cloud** (backend). Poviem ti to v odpovedi po "poď" a spýtam sa či zapnúť.

## 19. Share the day
Detailnejší text — každý pain zápis (čas, score, časti tela, kvalita), každý panic (čas, intenzita, spúšťač), meds, blueberry, atď.

## 20. Editovanie ➕ pridaných chipov
Custom chipy (body parts, symptoms, food feelings, workout types) — long-press / ⋯ menu = Rename / Delete.

## 21. Edit existujúcich zápisov
Prehľad dňa už má ⋯ menu; **preveriť že Edit skutočne otvorí editor s predvyplnenými dátami** pre všetky kategórie (aktuálne asi nefunguje pre niektoré) — opravím.

## 22. App icon
`public/apple-touch-icon.png` + `favicon` = **🥑 na tmavozelenom pozadí** (podobný štýl ako tvoja fialová pixel ikonka — pridám na home screen ikonu).

---

## Data safety
Rozšírim `BixboData` schema o nové polia (`panicAttacks[]`, `tetany[]`, `bodyBattery`, `stress`, `mood`, `hydration`, `caffeine`, `alcohol`, `sleepQuality`, `tens[]`, `pairing`, `partnerData`, `customChips`, `settings.textSize`…). **Migrácia iba pridáva** — staré `dayLogs`, `meds`, `notes`, `folders`, `events`, `tasks` ostávajú netknuté.

---

Toto je fakt veľký zoznam — poviem ti keď to bude hotové. Ak niečo chceš vyhodiť alebo posunúť na neskôr, napíš **teraz** pred "poď".
