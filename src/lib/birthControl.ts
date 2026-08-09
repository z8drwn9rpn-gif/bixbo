/** Birth-control cycle helpers for HAK/Drovelis-style 24+4 packs. */

export const HAK_ACTIVE_DAYS = 24;
export const HAK_PLACEBO_DAYS = 4;
export const HAK_PACK_LENGTH = HAK_ACTIVE_DAYS + HAK_PLACEBO_DAYS;

export function isPlaceboDay(dayInPack: number): boolean {
  return dayInPack > HAK_ACTIVE_DAYS && dayInPack <= HAK_PACK_LENGTH;
}

export function packDayLabel(dayInPack: number): string {
  if (dayInPack < 1 || dayInPack > HAK_PACK_LENGTH) return "";
  return isPlaceboDay(dayInPack) ? "Placebo" : "Active";
}
