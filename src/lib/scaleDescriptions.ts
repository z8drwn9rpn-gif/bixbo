import type { BixboData } from "./storage";
import { PAIN_DESCRIPTIONS } from "./storage";

export type ScaleKey = "pain" | "stress" | "tetany" | "panic" | "hotFlashes" | "headache" | "pressure" | "nausea";

export const DEFAULT_PRESSURE_DESC: Record<number, string> = {
  1: "Barely noticeable — slight pressure, easy to ignore",
  2: "Mild — clear pressure but not distracting",
  3: "Noticeable — present often, still easy to function",
  4: "Persistent — harder to ignore during activity",
  5: "Moderate — clearly uncomfortable and distracting",
  6: "Moderate high — difficult to ignore, concentration affected",
  7: "Strong — pressure interferes with normal activity",
  8: "Very strong — activity is clearly limited",
  9: "Severe — difficult to function normally",
  10: "Extreme — strongest pressure you can imagine",
};

export const DEFAULT_NAUSEA_DESC: Record<number, string> = {
  1: "Very mild — barely noticeable nausea",
  2: "Mild — noticeable but easy to ignore",
  3: "Mild — uncomfortable with little effect on activity",
  4: "Mild to moderate — persistent but manageable",
  5: "Moderate — affects appetite or concentration",
  6: "Moderate high — hard to ignore",
  7: "Strong — activity is affected",
  8: "Severe — difficult to continue normal activities",
  9: "Very severe — near-vomiting feeling or major functional impact",
  10: "Extreme — worst nausea imaginable",
};

export const DEFAULT_HEADACHE_DESC: Record<number, string> = {
  1: "Barely noticeable — minimal head pain",
  2: "Mild — easy to ignore",
  3: "Mild — occasionally distracting",
  4: "Noticeable — still manageable",
  5: "Moderate — clearly affects comfort",
  6: "Moderate high — concentration is affected",
  7: "Strong — difficult to continue normal activity",
  8: "Severe — normal activity is very difficult",
  9: "Very severe — activity largely stops",
  10: "Worst imaginable — maximum headache intensity",
};

export const DEFAULT_TETANY_INTENSITY_DESC: Record<number, string> = {
  1: "Very mild — tingling or slight muscle tension",
  2: "Mild — clear tingling, numbness or mild twitching/cramping",
  3: "Moderate — repeated tingling, cramps or muscle tightness with noticeable impact",
  4: "Severe — strong cramps or spasms; affected muscles are difficult to use",
  5: "Very severe — major spasm or episode with substantial functional impairment",
};

export const DEFAULT_PANIC_INTENSITY_DESC: Record<number, string> = {
  1: "Very mild — symptoms are present but barely distressing",
  2: "Mild — noticeable symptoms, easy to manage",
  3: "Mild — some discomfort or anxiety",
  4: "Moderate low — clearly distressing but still controlled",
  5: "Moderate — significant symptoms; harder to focus",
  6: "Moderate high — strong physical or cognitive symptoms",
  7: "Severe — difficult to function normally",
  8: "Very severe — overwhelming symptoms; activity largely stops",
  9: "Extreme — very intense fear and physical symptoms; difficult to regain control",
  10: "Maximum intensity — most intense panic experience imaginable",
};

export const DEFAULT_STRESS_DESC: Record<number, string> = {
  0: "None — completely calm and relaxed",
  1: "Very low — barely any tension",
  2: "Low — slight background pressure",
  3: "Mild — a little on edge",
  4: "Moderate low — noticeable but manageable",
  5: "Moderate — clearly stressed, still coping",
  6: "Moderate high — tense, harder to focus",
  7: "High — irritable, body feels tight",
  8: "Very high — overwhelmed, hard to relax",
  9: "Severe — near breaking point",
  10: "Extreme — cannot cope, shutdown or panic",
};

export const DEFAULT_HOT_FLASHES_DESC: Record<number, string> = {
  1: "Very mild — brief warmth, barely bothersome",
  2: "Mild — clear warmth with little or no sweating; activity unaffected",
  3: "Moderate — noticeable heat and/or sweating; uncomfortable but activity continues",
  4: "Severe — strong heat and sweating; activity may need to pause",
  5: "Very severe — intense episode with major discomfort or interruption of activity/sleep",
};

export const SCALE_META: Record<ScaleKey, { label: string; from: number; to: number; defaults: Record<number, string> }> = {
  pain:       { label: "Pain (0–10)",         from: 0, to: 10, defaults: PAIN_DESCRIPTIONS },
  stress:     { label: "Stress (0–10)",       from: 0, to: 10, defaults: DEFAULT_STRESS_DESC },
  tetany:     { label: "Tetany intensity (1–5)", from: 1, to: 5, defaults: DEFAULT_TETANY_INTENSITY_DESC },
  panic:      { label: "Panic intensity (1–10)", from: 1, to: 10, defaults: DEFAULT_PANIC_INTENSITY_DESC },
  hotFlashes: { label: "Hot flashes (1–5)",   from: 1, to: 5, defaults: DEFAULT_HOT_FLASHES_DESC },
  headache:   { label: "Headache (1–10)",     from: 1, to: 10, defaults: DEFAULT_HEADACHE_DESC },
  pressure:   { label: "Pressure intensity (1–10)", from: 1, to: 10, defaults: DEFAULT_PRESSURE_DESC },
  nausea:     { label: "Nausea severity (1–10)", from: 1, to: 10, defaults: DEFAULT_NAUSEA_DESC },
};

export function getScaleDesc(data: BixboData | undefined, key: ScaleKey): Record<number, string> {
  const overrides = data?.settings?.scaleDescriptions?.[key];
  const def = SCALE_META[key].defaults;
  if (!overrides) return def;
  return { ...def, ...overrides };
}
