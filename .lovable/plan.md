
# BIXBO — plán aplikácie

Mobilná apka na sledovanie zdravia (endometrióza + celkové wellness) inšpirovaná dizajnom Endolog. Krásny farebný kalendár s dennými kruhmi, čistá typografia, jemné pastelové ružové/broskyňové tóny.

## Dizajn
- **Vibe:** čisto, mäkko, ženský ale nie infantilný — biele pozadie, jemná ružová (`#fce4ec`-ish), tmavá čitateľná typografia, farebné akcenty pre stavy (červená = perioda, žltá = mierne, zelená = OK).
- **Kalendár na hlavnej obrazovke** — mesačný pohľad, každý deň = kruh s farebným prstencom podľa intenzity bolesti/periódy, ikonka noty/lieku ak existuje záznam.
- **Bottom nav:** Today · Calendar · Meds · Notes · Settings
- **Font:** Instrument Serif (nadpisy) + Inter/Work Sans (body), alebo môžeš neskôr zmeniť.
- Emoji/logo: 🍓 alebo vlastné BIXBO wordmark.

## Funkcie (MVP, všetko lokálne v localStorage — bez backendu zatiaľ)

### 1. Kalendár (hlavná obrazovka)
- Mesačný grid, swipe medzi mesiacmi.
- Klik na deň → detail dňa s tabmi: **Symptoms · Notes · To-do**.
- Kruh dňa: farba prstenca = max bolesť (0-10), výplň = typ periódy.

### 2. Denné logy (Symptoms tab)
- **Pain** — slider 1–10
- **Heat sensation** (návrh prekladu „Heat season") — toggle + intenzita
- **Bowel movement** — yes/no
- **Period** — light / medium / heavy / very heavy / spotting
- **Food** — voľný text pre celý deň (raňajky/obed/večera/snack polia)
- **Sexual activity** — none / with condom / without condom
- **Temperature** — číslo (°C)
- **Weight** — číslo (kg)

### 3. Notes v kalendári (Notes tab v dni)
- Krátke poznámky viazané na dátum (napr. „27.7 idem k lekárovi"). Zobrazujú sa v kalendári ako bodka.

### 4. To-do (To-do tab v dni)
- Checklist na daný deň, možno presúvať nesplnené na ďalší deň.

### 5. Meds (samostatná záložka)
- Zoznam liekov (názov, dávka, čas — 9:00/15:00/21:00…, denne/podľa potreby).
- Denný check-off: „Vzala som" pre každý slot.
- **Notifikácie:** browser Notification API + `setTimeout` keď je apka otvorená. (Skutočné push notifikácie potrebujú PWA/service worker — pridám ako bonus, ale spoľahlivé len keď je apka otvorená v prehliadači. Pre pravé mobilné push by bola potrebná natívna apka — poviem ti to úprimne.)

### 6. Notebook (samostatná záložka)
- Voľné poznámky **nezobrazené v kalendári** — zoznam s názvom, obsahom, dátumom vytvorenia.

## Technické detaily
- TanStack Start + React + Tailwind v4 + shadcn.
- Routes: `/` (today), `/calendar`, `/meds`, `/notes`, `/settings`, `/day/$date`.
- Perzistencia: `localStorage` cez custom hook `useLocalStorage`. Žiadny backend v prvom kole (rýchle, offline, súkromné). Ak neskôr budeš chcieť sync medzi zariadeniami, zapneme Lovable Cloud.
- Design tokens v `src/styles.css` (semantické oklch farby pre perioda-light/medium/heavy, pain-low/mid/high atď.).
- Mobilný viewport (390×844).

## Otvorené otázky (drobnosti — spravím rozumné rozhodnutia ak neodpovieš)
1. **Jazyk UI:** slovenčina alebo angličtina? (Predvolene urobím **slovenčina**, keďže píšeš po slovensky.)
2. **Sync medzi zariadeniami / login?** Zatiaľ **nie**, všetko lokálne. Neskôr vieme pridať.
3. **Notifikácie na lieky:** in-app upozornenia (spoľahlivé len keď máš apku otvorenú). OK?

Poviem po dokončení.
