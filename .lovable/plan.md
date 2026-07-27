Rozsah je veľký a niektoré požiadavky treba upresniť. Navrhujem toto poradie a rozsah, potvrď / uprav:

## Priorita 1 — Kritický bug: strata dát pri zavretí (#7)
Diagnóza: `useBixbo` ukladá do `localStorage` cez debounced write, a cloud push v `cloudSync` má 900 ms `setTimeout`. Ak sa app zavrie hneď po Save, ani jedno neuloží.
Oprava:
- Save vo wizardoch → synchrónny `localStorage.setItem` okamžite (flush pending debounce pred návratom).
- Cloud push: pri každom lokálnom `update` naplánuj push, ale **flushni okamžite** aj cez `navigator.sendBeacon` / `visibilitychange` / `pagehide` listener, a Save tlačidlo zavolá `await pushMyData(...)` pred zatvorením sheetu (s krátkym timeoutom, aby UX neblokovalo pri offline).
- Fallback: pri offline zapíš do `localStorage` „pending sync queue" a flushni pri obnovení siete.

## Priorita 2 — Poradie tlačidiel v wizarde (#8)
Aktuálne: `[Back] [Next/Save]`. Potvrď preferované poradie — navrhujem: `[Cancel] [Back] [Next/Save]` s Save vždy vpravo (primárna akcia).

## Priorita 3 — Notes fixes (#1)
- Bold / highlight tlačidlá momentálne vkladajú HTML tagy do `<textarea>`, čo nefunguje ako WYSIWYG. Prepnem na `contentEditable` div s `document.execCommand("bold")` / vlastný highlight wrap, alebo pridám živý HTML preview pod editor. Potvrď preferenciu (execCommand je najjednoduchšie).
- Checklist: prejdem interakcie, opravím pridanie/toggle.
- Autosave: debounced save (500 ms) pri každej zmene titulu / obsahu / checklistu — nevyžaduje „Save".

## Priorita 4 — Weight ročný graf (#2)
- Zredukujem X labely na 12 mesiacov (Jan, Feb, …) s väčším spacing a jemnými gridlines; ak dát je málo, spriemerujem na mesiac.

## Priorita 5 — Tetany: liek na zmiernenie (#3)
- Do `TetanyWizard` pridám textové pole „Rescue med" (voľný text + rýchle chipy `meds` zo store). Uložím do `tetany[i].rescueMed`. Zobrazím v prehľade dňa a v Couple view.

## Priorita 6 — Export PDF/CSV (#4)
- Nové tlačidlo v Settings → „Export for doctor". Range picker (posledný mesiac / 3 / 6 / vlastný).
- CSV: samostatné súbory pain.csv, cycle.csv, meds.csv, tetany.csv (ZIP-ované cez `jszip`) alebo jeden zlúčený.
- PDF: cez `jspdf` + `jspdf-autotable` — súhrn + tabuľky. Otázka: chceš tam aj grafy (weight, pain) ako obrázky? (Áno = pridám `html2canvas`.)

## Priorita 7 — História / verziovanie (#5)
Návrh (potvrď rozsah):
- Nová Supabase tabuľka `user_data_history` (user_id, snapshot jsonb, created_at). Trigger na `user_data` UPDATE ukladá starú verziu.
- Retencia: posledných 30 snapshotov.
- V Settings: „Restore previous version" so zoznamom časových značiek + náhľad + restore.
- Alternatíva (jednoduchšie): iba lokálne snapshoty v `localStorage` (posledných 10). Potvrď, ktorú chceš.

## Priorita 8 — SK/EN prepínač (#6)
- Zavediem `i18n` s `react-i18next` (alebo ľahký vlastný context — appka je momentálne v angličtine s pár SK stringami).
- Otázka: máš existujúce SK preklady, alebo mám iba dodať SK verziu core stringov a nechať tooltipy/copy postupne? (Kompletné preklady všetkých ~500 stringov je samostatná veľká úloha.)

---

## Otázky pred implementáciou
1. **Bug (#7)**: OK, ak Save krátko blokuje UI (spinner) kým prebehne cloud push? Alebo optimistic + offline queue?
2. **Notes bold/highlight**: `contentEditable` (WYSIWYG) alebo markdown-style s live preview?
3. **PDF**: pribaliť grafy ako obrázky?
4. **Verziovanie**: cloud (Supabase tabuľka) alebo iba lokálne snapshoty?
5. **i18n**: iba UI chrome (menu, tlačidlá) alebo kompletné preklady vrátane tooltipov?
6. **Poradie tlačidiel (#8)**: potvrď `[Cancel] [Back] [Next/Save]` alebo iné.

Napíš odpovede (stačí číslami) a pustím sa do implementácie — začnem prioritou 1 a 2, ktoré nasadím okamžite.