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
 * the web. We only guarantee that no BIXBO content stays hidden behind it and
 * that the background page never scrolls while a full-screen log is active.
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

type LockedDocumentStyles = {
  rootOverflow: string;
  bodyPosition: string;
  bodyTop: string;
  bodyLeft: string;
  bodyRight: string;
  bodyWidth: string;
  bodyOverflow: string;
};

/**
 * Freeze the document at its current scroll position while a full-screen log is
 * open. This is the standard iOS-safe body lock: the page stays visually at the
 * exact same Y position, while the log's own overflow container remains
 * scrollable. It also prevents Safari from moving the Home/Day Overview behind
 * a focused textarea.
 */
export function lockDocumentForLog(): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {};

  const root = document.documentElement;
  const body = document.body;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const lockToken = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const previous: LockedDocumentStyles = {
    rootOverflow: root.style.overflow,
    bodyPosition: body.style.position,
    bodyTop: body.style.top,
    bodyLeft: body.style.left,
    bodyRight: body.style.right,
    bodyWidth: body.style.width,
    bodyOverflow: body.style.overflow,
  };

  root.setAttribute(LOG_FORM_OPEN_ATTR, lockToken);
  root.style.overflow = "hidden";
  body.style.position = "fixed";
  body.style.top = `-${scrollY}px`;
  body.style.left = "0";
  body.style.right = "0";
  body.style.width = "100%";
  body.style.overflow = "hidden";

  let restored = false;
  return () => {
    if (restored) return;
    restored = true;

    root.style.overflow = previous.rootOverflow;
    body.style.position = previous.bodyPosition;
    body.style.top = previous.bodyTop;
    body.style.left = previous.bodyLeft;
    body.style.right = previous.bodyRight;
    body.style.width = previous.bodyWidth;
    body.style.overflow = previous.bodyOverflow;

    const restoreScroll = () => window.scrollTo(scrollX, scrollY);
    const finishRestore = () => {
      restoreScroll();
      // A new log may already have opened during the two restoration frames.
      // Only the lock that owns this token may re-enable BottomNav.
      if (root.getAttribute(LOG_FORM_OPEN_ATTR) === lockToken) {
        root.removeAttribute(LOG_FORM_OPEN_ATTR);
      }
    };

    // Restore immediately, then once more after Radix/React has released its own
    // scroll lock. Keep BottomNav hidden until the restoration is fully settled.
    restoreScroll();
    window.requestAnimationFrame(() => window.requestAnimationFrame(finishRestore));
  };
}

/** Nearest scrollable ancestor of an element, if any. Never returns the document. */
export function findScrollContainer(node: HTMLElement | null): HTMLElement | null {
  let current: HTMLElement | null = node?.parentElement ?? null;
  while (current) {
    if (current === document.body || current === document.documentElement) return null;
    const style = window.getComputedStyle(current);
    const scrollable = /(auto|scroll|overlay)/.test(`${style.overflowY}`);
    if (scrollable && current.scrollHeight > current.clientHeight + 1) return current;
    current = current.parentElement;
  }
  return null;
}

/**
 * Keeps a focused field above the keyboard by scrolling ONLY the nearest inner
 * scroll container and ONLY forward/down by the minimum required delta.
 *
 * Important iOS invariant: focusing a textarea must never reduce the log's
 * scrollTop. Safari may already pan/scroll the focused control into view before
 * VisualViewport settles; trying to "correct" a field that appears above our
 * computed visual top creates a second, backwards scroll and is what makes the
 * Pain Details page jump toward the top. Native iOS handles fields above the
 * visible top on its own, so we deliberately never scroll backwards here.
 */
export function keepFocusedFieldVisible(
  target: HTMLElement,
  visibleTop: number,
  visibleBottom: number,
  margin = 16,
) {
  const container = findScrollContainer(target);
  if (!container) return;
  const rect = target.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const bottomLimit = Math.min(visibleBottom, containerRect.bottom) - margin;

  // Never decrease scrollTop on focus. The only intervention allowed is moving
  // the inner log farther down when the focused field would be hidden by the
  // keyboard/accessory bar.
  if (rect.bottom > bottomLimit) {
    container.scrollTop += rect.bottom - bottomLimit;
  }
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
 * Falls back to document locking only when the browser does not expose
 * VisualViewport.
 *
 * VisualViewport `scroll` is geometry-only: Safari may pan the visual viewport
 * while focusing a low textarea, and the fixed sheet must follow that offset.
 * Crucially, those scroll events NEVER trigger inner scrolling. The focused
 * field is revealed once, after keyboard resize/focus has settled, which avoids
 * the old feedback loop where Safari and BIXBO repeatedly scrolled each other.
 */
export function useKeyboardViewport(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined" || typeof document === "undefined") return;

    const unlockDocument = lockDocumentForLog();
    const viewport = window.visualViewport;
    if (!viewport) {
      return () => {
        applyKeyboardViewportVars(null);
        unlockDocument();
      };
    }

    let geometryFrame = 0;
    let revealTimer = 0;
    let focusTimer = 0;

    const clearRevealTimer = () => {
      if (!revealTimer) return;
      window.clearTimeout(revealTimer);
      revealTimer = 0;
    };

    const clearFocusTimer = () => {
      if (!focusTimer) return;
      window.clearTimeout(focusTimer);
      focusTimer = 0;
    };

    const syncViewportGeometry = () => {
      if (geometryFrame) cancelAnimationFrame(geometryFrame);
      geometryFrame = requestAnimationFrame(() => {
        geometryFrame = 0;
        applyKeyboardViewportVars(readKeyboardViewportMetrics());
      });
    };

    const scheduleFocusedReveal = () => {
      clearRevealTimer();
      revealTimer = window.setTimeout(() => {
        revealTimer = 0;
        const latest = readKeyboardViewportMetrics();
        const active = document.activeElement;
        applyKeyboardViewportVars(latest);
        if (!latest || latest.keyboardInset <= 80 || !isTextField(active)) return;
        keepFocusedFieldVisible(
          active,
          latest.offsetTop,
          latest.offsetTop + latest.height,
        );
      }, 96);
    };

    const syncResizeAndMaybeReveal = () => {
      syncViewportGeometry();
      const metrics = readKeyboardViewportMetrics();
      const active = document.activeElement;
      if (metrics && metrics.keyboardInset > 80 && isTextField(active)) scheduleFocusedReveal();
      else clearRevealTimer();
    };

    const syncAfterFocusIn = () => {
      syncViewportGeometry();
      clearFocusTimer();
      focusTimer = window.setTimeout(() => {
        focusTimer = 0;
        syncResizeAndMaybeReveal();
      }, 0);
    };

    const syncAfterFocusOut = () => {
      clearRevealTimer();
      clearFocusTimer();
      focusTimer = window.setTimeout(() => {
        focusTimer = 0;
        syncViewportGeometry();
      }, 0);
    };

    syncResizeAndMaybeReveal();
    viewport.addEventListener("resize", syncResizeAndMaybeReveal);
    viewport.addEventListener("scroll", syncViewportGeometry);
    window.addEventListener("orientationchange", syncResizeAndMaybeReveal);
    document.addEventListener("focusin", syncAfterFocusIn);
    document.addEventListener("focusout", syncAfterFocusOut);

    return () => {
      if (geometryFrame) cancelAnimationFrame(geometryFrame);
      clearRevealTimer();
      clearFocusTimer();
      viewport.removeEventListener("resize", syncResizeAndMaybeReveal);
      viewport.removeEventListener("scroll", syncViewportGeometry);
      window.removeEventListener("orientationchange", syncResizeAndMaybeReveal);
      document.removeEventListener("focusin", syncAfterFocusIn);
      document.removeEventListener("focusout", syncAfterFocusOut);
      applyKeyboardViewportVars(null);
      unlockDocument();
    };
  }, [enabled]);
}
