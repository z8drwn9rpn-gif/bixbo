import { useEffect } from "react";

/**
 * BIXBO iOS keyboard viewport handling.
 *
 * iOS Safari / standalone PWA keeps a separate visual viewport while the
 * software keyboard and its native accessory bar are open. We only mirror that
 * geometry into CSS. We deliberately do not move the document or an inner log
 * scroll container in response to focus/VisualViewport events: native iOS owns
 * focus scrolling and competing with it causes jumps, compositor stalls and
 * background-page flashes.
 */

export const VIEWPORT_HEIGHT_VAR = "--bixbo-viewport-height";
export const VIEWPORT_OFFSET_VAR = "--bixbo-viewport-offset";
export const KEYBOARD_INSET_VAR = "--bixbo-keyboard-inset";
export const LOG_FORM_OPEN_ATTR = "data-bixbo-log-form-open";

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
  const offsetTop = Math.max(0, Math.round(viewport.offsetTop));
  const layoutHeight = Math.round(window.innerHeight || height);
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

type LockedDocumentStyles = {
  rootOverflow: string;
  rootOverscrollBehavior: string;
  bodyOverflow: string;
  bodyOverscrollBehavior: string;
};

let documentLockCount = 0;
let documentLockSnapshot: LockedDocumentStyles | null = null;

/**
 * Prevent background scroll while a full-screen log is open without converting
 * the document body into a fixed-position layer. Fixed-body locking is unstable
 * when iOS also pans/resizes VisualViewport for the software keyboard.
 */
export function lockDocumentForLog(): () => void {
  if (typeof document === "undefined") return () => {};

  const root = document.documentElement;
  const body = document.body;
  documentLockCount += 1;

  if (documentLockCount === 1) {
    documentLockSnapshot = {
      rootOverflow: root.style.overflow,
      rootOverscrollBehavior: root.style.overscrollBehavior,
      bodyOverflow: body.style.overflow,
      bodyOverscrollBehavior: body.style.overscrollBehavior,
    };

    root.setAttribute(LOG_FORM_OPEN_ATTR, "true");
    root.style.overflow = "hidden";
    root.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;

    documentLockCount = Math.max(0, documentLockCount - 1);
    if (documentLockCount !== 0 || !documentLockSnapshot) return;

    root.style.overflow = documentLockSnapshot.rootOverflow;
    root.style.overscrollBehavior = documentLockSnapshot.rootOverscrollBehavior;
    body.style.overflow = documentLockSnapshot.bodyOverflow;
    body.style.overscrollBehavior = documentLockSnapshot.bodyOverscrollBehavior;
    root.removeAttribute(LOG_FORM_OPEN_ATTR);
    documentLockSnapshot = null;
  };
}

/**
 * Mirrors VisualViewport geometry into CSS variables while `enabled` is true.
 * This hook is intentionally read-only with respect to scroll position.
 */
export function useKeyboardViewport(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined" || typeof document === "undefined") return;

    const unlockDocument = lockDocumentForLog();
    const viewport = window.visualViewport;
    const root = document.documentElement;

    if (!viewport) {
      return () => {
        applyKeyboardViewportVars(null, root);
        unlockDocument();
      };
    }

    let frame = 0;
    const sync = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = 0;
        applyKeyboardViewportVars(readKeyboardViewportMetrics(), root);
      });
    };

    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);
    document.addEventListener("focusin", sync);
    document.addEventListener("focusout", sync);
    window.addEventListener("orientationchange", sync);
    sync();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", sync);
      viewport.removeEventListener("scroll", sync);
      document.removeEventListener("focusin", sync);
      document.removeEventListener("focusout", sync);
      window.removeEventListener("orientationchange", sync);
      applyKeyboardViewportVars(null, root);
      unlockDocument();
    };
  }, [enabled]);
}
