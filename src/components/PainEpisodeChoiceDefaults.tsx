import { useEffect } from "react";

function isNoLabel(value: string) {
  const normalized = value.trim().toLocaleLowerCase();
  return normalized === "no" || normalized === "nie";
}

function painEpisodeSectionForHeading(heading: HTMLHeadingElement) {
  let node: HTMLElement | null = heading.parentElement;
  for (let depth = 0; node && depth < 4; depth += 1, node = node.parentElement) {
    const buttons = Array.from(node.querySelectorAll<HTMLButtonElement>("button"));
    if (buttons.some((button) => isNoLabel(button.textContent ?? ""))) return node;
  }
  return null;
}

function headingsWithin(root: ParentNode): HTMLHeadingElement[] {
  const headings = Array.from(root.querySelectorAll<HTMLHeadingElement>("h2"));
  if (root instanceof HTMLHeadingElement && root.tagName === "H2") headings.unshift(root);
  return headings;
}

function markPainEpisodeNoButtons(root: ParentNode = document) {
  for (const heading of headingsWithin(root)) {
    const headingText = heading.textContent?.trim().toLocaleLowerCase() ?? "";
    if (!headingText.includes("episodes") && !headingText.includes("epizódy")) continue;
    const section = painEpisodeSectionForHeading(heading);
    if (!section) continue;

    for (const button of section.querySelectorAll<HTMLButtonElement>("button")) {
      if (isNoLabel(button.textContent ?? "") && !button.hasAttribute("data-bixbo-neutral-no")) {
        button.setAttribute("data-bixbo-neutral-no", "true");
      }
    }
  }
}

export function PainEpisodeChoiceDefaults() {
  useEffect(() => {
    const onPointerDown = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement)) return;
      if (target.dataset.bixboNeutralNo !== "true") return;
      target.removeAttribute("data-bixbo-choice-selected");
      target.setAttribute("aria-pressed", "false");
    };

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
    document.addEventListener("pointerdown", onPointerDown, true);

    return () => {
      observer.disconnect();
      if (scanFrame !== 0) window.cancelAnimationFrame(scanFrame);
      pendingRoots.clear();
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, []);

  return null;
}
