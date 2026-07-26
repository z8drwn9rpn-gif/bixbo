import type { BixboData } from "./storage";
import { PAIN_DESCRIPTIONS } from "./storage";

export type ScaleKey = "pain" | "stress" | "tetany" | "panic" | "hotFlashes";

export const DEFAULT_TETANY_INTENSITY_DESC: Record<number, string> = {
  1: "Mild — occasional twitches or tingling, barely disruptive",
  2: "Noticeable — clear tingling or small cramps, still functional",
  3: "Moderate — cramps hurt, hard to relax the muscles",
  4: "Strong — painful spasms, hands/feet lock up, hard to move",
  5: "Severe — full-body cramps, unable to function, may need help",
};
export const DEFAULT_PANIC_INTENSITY_DESC: Record<number, string> = {
  1: "Slight unease, easy to ignore",
  2: "Mild anxiety, aware of heartbeat",
  3: "Noticeable worry, faster breathing",
  4: "Uncomfortable, restless, want to leave",
  5: "Strong fear, racing heart, dizziness",
  6: "Hard to think clearly, trembling",
  7: "Overwhelming fear, chest pressure",
  8: "Loss of control feeling, tingling / numbness",
  9: "Terror — fear of dying or collapsing",
  10: "Total panic — unable to function",
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
  10: "Extreme — cannot cope, shutdown / panic",
};
export const DEFAULT_HOT_FLASHES_DESC: Record<number, string> = {
  1: "Mild warmth — barely noticeable, no sweat",
  2: "Warm flush — face/neck feels hot, no visible sweat",
  3: "Sweating — visible perspiration, need air/fan",
  4: "Strong wave — soaking sweat, heart racing",
  5: "Drenching — clothes/bedding wet, need to change",
};

export const SCALE_META: Record<ScaleKey, { label: string; from: number; to: number; defaults: Record<number, string> }> = {
  pain:       { label: "Pain (0–10)",         from: 0, to: 10, defaults: PAIN_DESCRIPTIONS },
  stress:     { label: "Stress (0–10)",       from: 0, to: 10, defaults: DEFAULT_STRESS_DESC },
  tetany:     { label: "Tetany intensity (1–5)", from: 1, to: 5, defaults: DEFAULT_TETANY_INTENSITY_DESC },
  panic:      { label: "Panic intensity (1–10)", from: 1, to: 10, defaults: DEFAULT_PANIC_INTENSITY_DESC },
  hotFlashes: { label: "Hot flashes (1–5)",   from: 1, to: 5, defaults: DEFAULT_HOT_FLASHES_DESC },
};

export function getScaleDesc(data: BixboData | undefined, key: ScaleKey): Record<number, string> {
  const overrides = data?.settings?.scaleDescriptions?.[key];
  const def = SCALE_META[key].defaults;
  if (!overrides) return def;
  return { ...def, ...overrides };
}
