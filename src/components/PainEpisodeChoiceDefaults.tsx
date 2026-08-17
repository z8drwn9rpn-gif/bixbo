import { useEffect } from "react";

const NO_LABELS = new Set(["no", "nie"]);

function normalizeLabel(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase();
}

function headingsWithin(root: ParentNode): HTMLHeadingElement[] {
  const headings = Array.from(root.querySelectorAll<HTMLHeadingElement>("h2"));
  if (root instanceof HTMLHeadingElement && root.tagName === "H2") headings.unshift(root);
  return headings;
}

function markPainEpisodeNoButtons(root: ParentNode = document) {
  for (const heading of headingsWithin(root)) {
    const section = heading.parentElement?.parentElement;
    if (!section) continue;

    const noButtons = Array.from(section.querySelectorAll<HTMLButtonElement>("button")).filter((button) =>
      NO_LABELS.has(normalizeLabel(button.textContent)),
    );

    // The Pain > Episodes step has five top-level Yes/No questions. Requiring
    // several No buttons keeps this compatibility rule scoped to that step.
    if (noButtons.length < 4) continue;

    for (const button of noButtons) {
      const row = button.parentElement;
      if (!row) continue;
      const directButtons = Array.from(row.children).filter(
        (child): child is HTMLButtonElement => child instanceof HTMLButtonElement,
      );
      if (directButtons.length !== 2) continue;
      button.dataset.bixboNeutralNo = "1";
    }
  }
}

export function PainEpisodeChoiceDefaults() {
  useEffect(() => {
    markPainEpisodeNoButtons();

    const pendingRoots = new Set<Element>();
    let scanFrame = 0;
    const flushPendingRoots = () => {
      scanFrame = 0;
      for (const root of pendingRoots) markPainEpisodeNoButtons(root);
      pendingRoots.clear();
    };
    const scheduleScan = () => {
      if (scanFrame !== 0) return;
      scanFrame = window.requestAnimationFrame(flushPendingRoots);
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof Element) pendingRoots.add(node);
          else if (node.parentElement) pendingRoots.add(node.parentElement);
        }
      }
      if (pendingRoots.size > 0) scheduleScan();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button[data-bixbo-neutral-no='1']") : null;
      if (target) target.dataset.bixboChoiceTouched = "1";
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      observer.disconnect();
      if (scanFrame !== 0) window.cancelAnimationFrame(scanFrame);
      pendingRoots.clear();
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, []);

  return (
    <style>{`
      button[data-bixbo-neutral-no="1"]:not([data-bixbo-choice-touched="1"]) {
        background: var(--tint) !important;
        color: var(--foreground) !important;
        box-shadow: 0 0 0 1px var(--border) !important;
        transform: none !important;
      }
    `}</style>
  );
}
