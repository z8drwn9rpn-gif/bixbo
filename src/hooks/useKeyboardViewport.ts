import { useEffect } from "react";

/**
 * BIXBO iOS keyboard viewport handling.
 *
 * iOS Safari / standalone PWA does not resize the layout viewport when the
 * software keyboard (plus its suggestion row and previous/next/done accessory
 * bar) opens. `window.visualViewport` is the only reliable source of the truly
 * visible area, so we mirror it into CSS variables and let the active
 * full-screen log sheet size itself against those values.
 *
 * Nothing here tries to hide the native accessory bar — that is not possible on
 * the web. We only guarantee that no BIXBO content stays hidden behind it.
 */

export const VIEWPORT_HEIGHT_VAR = "--bixbo-viewport-height";
export const VIEWPORT_OFFSET_VAR = "--bixbo-viewport-offset";
export const KEYBOARD_INSET_VAR = "--bixbo-keyboard-inset";

export type KeyboardViewportMetrics = {
  height: number;
  offsetTop: number;
  keyboardInset: number;
};

export function readKeyboardViewportMetrics(): KeyboardViewportMetrics | null {
  if (typeof window === "undefined") return null;
  const viewport = window.visualViewport;
  if (!viewport) return null;

  const height = Math.round(viewport.height);
  const offsetTop = Math.round(viewport.offsetTop);
  const layoutHeight = Math.round(window.innerHeight || height);
  // Anything the visual viewport lost at the bottom is keyboard + accessory bar.
  const keyboardInset = Math.max(0, layoutHeight - height - offsetTop);

  return { height, offsetTop, keyboardInset };
}

export function applyKeyboardViewportVars(
  metrics: KeyboardViewportMetrics | null,
  root: HTMLElement | null = typeof document === "undefined" ? null : document.documentElement,
) {
  if (!root) return;
  if (!metrics) {
    root.style.removeProperty(VIEWPORT_HEIGHT_VAR);
    root.style.removeProperty(VIEWPORT_OFFSET_VAR);
    root.style.removeProperty(KEYBOARD_INSET_VAR);
    root.removeAttribute("data-bixbo-keyboard-open");
    return;
  }

  root.style.setProperty(VIEWPORT_HEIGHT_VAR, `${metrics.height}px`);
  root.style.setProperty(VIEWPORT_OFFSET_VAR, `${metrics.offsetTop}px`);
  root.style.setProperty(KEYBOARD_INSET_VAR, `${metrics.keyboardInset}px`);
  if (metrics.keyboardInset > 80) root.setAttribute("data-bixbo-keyboard-open", "true");
  else root.removeAttribute("data-bixbo-keyboard-open");
}

/** Nearest scrollable ancestor of an element, if any. */
export function findScrollContainer(node: HTMLElement | null): HTMLElement | null {
  let current: HTMLElement | null = node?.parentElement ?? null;
  while (current) {
    const style = window.getComputedStyle(current);
    const scrollable = /(auto|scroll|overlay)/.test(`${style.overflowY}`);
    if (scrollable && current.scrollHeight > current.clientHeight + 1) return current;
    current = current.parentElement;
  }
  return null;
}

/**
 * Keeps the focused field above the keyboard by scrolling ONLY the nearest
 * inner scroll container by the minimum required delta. We never call
 * `scrollIntoView()` on the sheet or the document, because that causes the
 * well-known iOS jump/flicker.
 */
export function keepFocusedFieldVisible(target: HTMLElement, visibleBottom: number, margin = 16) {
  const container = findScrollContainer(target);
  if (!container) return;
  const rect = target.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const bottomLimit = Math.min(visibleBottom, containerRect.bottom) - margin;
  const topLimit = Math.max(0, containerRect.top) + margin;

  if (rect.bottom > bottomLimit) container.scrollTop += rect.bottom - bottomLimit;
  else if (rect.top < topLimit) container.scrollTop -= topLimit - rect.top;
}

function isTextField(node: EventTarget | null): node is HTMLElement {
  if (!(node instanceof HTMLElement)) return false;
  const tag = node.tagName;
  if (tag === "TEXTAREA") return true;
  if (tag === "INPUT") return true;
  return node.isContentEditable;
}

/**
 * Mirrors the visual viewport into CSS variables while `enabled` is true.
 * Falls back to no-op (CSS keeps using its dvh/svh values) when the browser
 * does not expose VisualViewport.
 */
export function useKeyboardViewport(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const viewport = window.visualViewport;
    if (!viewport) return;

    let frame = 0;
    const sync = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = 0;
        const metrics = readKeyboardViewportMetrics();
        applyKeyboardViewportVars(metrics);
        const active = document.activeElement;
        if (metrics && metrics.keyboardInset > 80 && isTextField(active)) {
          keepFocusedFieldVisible(active, metrics.height + metrics.offsetTop);
        }
      });
    };

    sync();
    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);
    window.addEventListener("orientationchange", sync);
    document.addEventListener("focusin", sync);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", sync);
      viewport.removeEventListener("scroll", sync);
      window.removeEventListener("orientationchange", sync);
      document.removeEventListener("focusin", sync);
      applyKeyboardViewportVars(null);
    };
  }, [enabled]);
}
