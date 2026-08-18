export const PAIN_DESCRIPTIONS: Record<number, string> = {
  0: "Pain free",
  1: "Barely noticeable",
  2: "Mild",
  3: "Distracting at times",
  4: "Distracting",
  5: "Interrupting",
  6: "Hard to ignore",
  7: "Difficult to function",
  8: "Severely limiting",
  9: "Overwhelming",
  10: "Worst imaginable",
};

type PainScaleLanguage = "en" | "sk";

type LocalizedCopy = Record<PainScaleLanguage, string>;

const copy = (en: string, sk: string): LocalizedCopy => ({ en, sk });

/**
 * Functional pain-scale copy plus compatibility mappings for the legacy
 * Mankoski-style strings still used as translation keys by older UI surfaces.
 * Displayed severity is based on perceived pain and functional impact, not on
 * whether analgesics were taken or effective.
 */
const PAIN_SCALE_UI_COPY: Record<string, LocalizedCopy> = {
  "Pain free": copy("Pain free", "Bez bolesti"),
  "Barely noticeable": copy("Barely noticeable", "Sotva badateľná"),
  Mild: copy("Mild", "Mierna"),
  "Distracting at times": copy("Distracting at times", "Občas rušivá"),
  Distracting: copy("Distracting", "Rušivá"),
  Interrupting: copy("Interrupting", "Narušujúca"),
  "Hard to ignore": copy("Hard to ignore", "Ťažko ignorovateľná"),
  "Difficult to function": copy("Difficult to function", "Sťažuje fungovanie"),
  "Severely limiting": copy("Severely limiting", "Výrazne obmedzujúca"),
  Overwhelming: copy("Overwhelming", "Drvivá"),
  "Worst imaginable": copy("Worst imaginable", "Najhoršia predstaviteľná"),

  "Very minor annoyance": copy("Barely noticeable", "Sotva badateľná"),
  "Minor annoyance": copy("Mild", "Mierna"),
  "Annoying, distracting": copy("Distracting at times", "Občas rušivá"),
  "Annoying enough to be distracting": copy("Distracting at times", "Občas rušivá"),
  "Bearable if involved in work": copy("Distracting", "Rušivá"),
  "Can be ignored if you are really involved in your work": copy("Distracting", "Rušivá"),
  "Can't be ignored > 30 min": copy("Interrupting", "Narušujúca"),
  "Can't be ignored for more than 30 minutes": copy("Interrupting", "Narušujúca"),
  "Can't be ignored for long": copy("Hard to ignore", "Ťažko ignorovateľná"),
  "Can't be ignored for any length of time": copy("Hard to ignore", "Ťažko ignorovateľná"),
  "Hard to concentrate": copy("Difficult to function", "Sťažuje fungovanie"),
  "Makes it difficult to concentrate, interferes with sleep": copy("Difficult to function", "Sťažuje fungovanie"),
  "Physical activity limited": copy("Severely limiting", "Výrazne obmedzujúca"),
  "Physical activity severely limited": copy("Severely limiting", "Výrazne obmedzujúca"),
  "Unable to speak, crying out": copy("Overwhelming", "Drvivá"),
  "Unable to speak": copy("Overwhelming", "Drvivá"),
  "Unconscious — passes out": copy("Worst imaginable", "Najhoršia predstaviteľná"),
  Unconscious: copy("Worst imaginable", "Najhoršia predstaviteľná"),

  "You've been okay for the past 24 hours.": copy("No pain at all.", "Žiadna bolesť."),
  "Occasional minor twinges. No medication needed.": copy("I notice it only occasionally.", "Všímam si ju len občas."),
  "Occasional strong twinges. No medication needed.": copy("I notice it, but it doesn't affect what I'm doing.", "Vnímam ju, ale neovplyvňuje to, čo robím."),
  "Mild painkillers are effective (aspirin, ibuprofen).": copy("It occasionally pulls my attention away.", "Občas odpútava moju pozornosť."),
  "But still distracting. Mild painkillers relieve pain for 3–4 hours.": copy("I feel it often, but I can continue my usual activities.", "Cítim ju často, ale môžem pokračovať v bežných aktivitách."),
  "Mild painkillers reduce pain for 3–4 hours.": copy("It makes some activities harder or slower.", "Niektoré činnosti sú pre ňu ťažšie alebo pomalšie."),
  "But you can still go to work and participate in social activities. Stronger painkillers (codeine) reduce pain for 3–4 hours.": copy("I avoid or modify some activities because of it.", "Kvôli nej sa niektorým aktivitám vyhýbam alebo ich upravujem."),
  "You can still function with effort. Stronger painkillers are only partially effective. Strongest painkillers relieve pain.": copy("Concentrating, sleeping, or normal activities are difficult.", "Sústredenie, spánok alebo bežné aktivity sú náročné."),
  "You can read and converse with effort. Nausea and dizziness are common. Strongest painkillers reduce pain for 3–4 hours.": copy("Most normal activities are very difficult.", "Väčšina bežných aktivít je veľmi náročná."),
  "Crying out or moaning uncontrollably — near delirium. Strongest painkillers are only partially effective.": copy("I can barely function or do normal activities.", "Takmer nedokážem fungovať ani robiť bežné aktivity."),
  "Pain makes you pass out. Strongest painkillers are only partially effective.": copy("The pain completely dominates everything.", "Bolesť úplne ovláda všetko."),
};

export function painScaleUiCopy(key: string, language: PainScaleLanguage): string | undefined {
  return PAIN_SCALE_UI_COPY[key]?.[language];
}
