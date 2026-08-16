import { useEffect, useState } from "react";
import { ChevronDown } from "@/components/icons/BixboExtraIcons";

const EDGE_TOLERANCE = 28;
const MIN_SCROLL_DISTANCE = 280;

export function ScrollJumpControl() {
  const [scrollable, setScrollable] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(false);

  useEffect(() => {
    const update = () => {
      const root = document.scrollingElement ?? document.documentElement;
      const top = window.scrollY || root.scrollTop || 0;
      const max = Math.max(0, root.scrollHeight - window.innerHeight);
      setScrollable(max > MIN_SCROLL_DISTANCE);
      setAtTop(top <= EDGE_TOLERANCE);
      setAtBottom(top >= max - EDGE_TOLERANCE);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    resizeObserver?.observe(document.body);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      resizeObserver?.disconnect();
    };
  }, []);

  if (!scrollable) return null;

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const scrollToBottom = () => {
    const root = document.scrollingElement ?? document.documentElement;
    window.scrollTo({ top: root.scrollHeight, behavior: "smooth" });
  };

  return (
    <div
      className="fixed bottom-[calc(6.8rem+env(safe-area-inset-bottom))] right-3 z-40 flex flex-col overflow-hidden rounded-full border border-border/75 bg-surface/92 shadow-lg backdrop-blur-md lg:bottom-6 lg:right-6"
      aria-label="Page navigation"
    >
      <button
        type="button"
        onClick={scrollToTop}
        disabled={atTop}
        aria-label="Scroll to top"
        className="grid h-10 w-10 place-items-center text-primary transition active:scale-95 disabled:opacity-25"
      >
        <ChevronDown className="h-4 w-4 rotate-180" />
      </button>
      <div className="mx-2 border-t border-border/60" />
      <button
        type="button"
        onClick={scrollToBottom}
        disabled={atBottom}
        aria-label="Scroll to bottom"
        className="grid h-10 w-10 place-items-center text-primary transition active:scale-95 disabled:opacity-25"
      >
        <ChevronDown className="h-4 w-4" />
      </button>
    </div>
  );
}
