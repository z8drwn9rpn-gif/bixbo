import { useEffect } from "react";

/**
 * Full-screen BIXBO log document lock.
 *
 * Important iOS rule: the log shell must keep stable layout geometry while the
 * software keyboard opens, closes, pans or changes its suggestion/accessory
 * rows. Safari owns focused-field scrolling. Listening to the browser's moving
 * keyboard viewport and feeding its height/offset back into the sheet creates a
 * resize/reposition loop that makes text entry jump and stutter.
 *
 * The legacy hook name is retained to keep the logging API stable, but the hook
 * intentionally does not read or subscribe to that moving viewport API anymore.
 */

export const LOG_FORM_OPEN_ATTR = "data-bixbo-log-form-open";

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
 * the document body into a fixed-position layer. The active log owns scrolling;
 * iOS remains free to pan the focused native input inside its visible viewport.
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
 * Keep the background document locked for the lifetime of an active log.
 * No keyboard-viewport, focus, resize or scroll listeners are installed here.
 */
export function useKeyboardViewport(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;
    return lockDocumentForLog();
  }, [enabled]);
}
