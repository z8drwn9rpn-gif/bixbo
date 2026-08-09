export const BIRTH_CONTROL_CONFIG = {
  name: "Drovelis",
  legacyStartDate: "2026-04-22",
  activeDays: 24,
  placeboDays: 4,
  packDays: 28,
} as const;

export function birthControlStart(settings: { birthControlSince?: string }): string {
  return settings.birthControlSince || BIRTH_CONTROL_CONFIG.legacyStartDate;
}
