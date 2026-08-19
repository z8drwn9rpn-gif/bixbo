/**
 * Shared marker for "a pain/intensity scale explanation overlay is open".
 *
 * The log sheet renders a fixed date control near the top of the viewport. It
 * must never cover the scale explanation overlays, so those overlays flag the
 * document root and CSS hides the date pill for as long as any legend is open.
 */
const ATTRIBUTE = "bixboScaleLegendOpen";
let openCount = 0;

export function markScaleLegendOpen(): () => void {
  if (typeof document === "undefined") return () => {};
  openCount += 1;
  document.documentElement.dataset[ATTRIBUTE] = "true";
  let released = false;
  return () => {
    if (released) return;
    released = true;
    openCount = Math.max(0, openCount - 1);
    if (openCount === 0) delete document.documentElement.dataset[ATTRIBUTE];
  };
}
