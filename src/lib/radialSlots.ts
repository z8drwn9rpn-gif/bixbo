/** Evenly spaced polar positions on a near-full circle (gap at bottom for the + FAB). */
export function computeRadialSlots(count: number): { x: number; up: number }[] {
  const n = Math.min(count, 13);
  if (n === 0) return [];
  const gap = Math.PI * 0.42;
  const startAngle = -Math.PI + gap / 2;
  const endAngle = Math.PI - gap / 2;
  const radius = n <= 8 ? 168 : n <= 11 ? 178 : 188;
  return Array.from({ length: n }, (_, index) => {
    const t = n === 1 ? 0.5 : index / (n - 1);
    const angle = startAngle + t * (endAngle - startAngle);
    return {
      x: Math.round(Math.sin(angle) * radius),
      up: Math.round(Math.cos(angle) * radius + 78),
    };
  });
}
