import { useEffect, useState } from "react";
import { ChevronDown } from "@/components/icons/BixboExtraIcons";
import { BottomNavLogIcon } from "@/components/icons/BottomNavReferenceIcons";

const EDGE_TOLERANCE = 28;
const MIN_SCROLL_DISTANCE = 280;

export function ScrollJumpControl() {
  const [scrollable, setScrollable] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(false);

  useEffect(() => {
    let animationFrame = 0;
    const update = () => {
      const root = document.scrollingElement ?? document.documentElement;
      const top = window.scrollY || root.scrollTop || 0;
      const max = Math.max(0, root.scrollHeight - window.innerHeight);
      setScrollable(max > MIN_SCROLL_DISTANCE);
      setAtTop(top <= EDGE_TOLERANCE);
      setAtBottom(top >= max - EDGE_TOLERANCE);
    };
    const scheduleUpdate = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = 0;
        update();
      });
    };

    update();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(scheduleUpdate) : null;
    resizeObserver?.observe(document.body);

    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      resizeObserver?.disconnect();
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const scrollToBottom = () => {
    const root = document.scrollingElement ?? document.documentElement;
    window.scrollTo({ top: root.scrollHeight, behavior: "smooth" });
  };

  const openQuickLog = () => window.dispatchEvent(new CustomEvent("bixbo:open-quick-log-menu"));
  const buttonClass = "relative grid h-7 w-7 place-items-center text-primary transition active:scale-95 after:absolute after:left-1/2 after:top-1/2 after:h-11 after:w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']";

  return (
    <div className="fixed bottom-[calc(6.8rem+env(safe-area-inset-bottom))] right-3 z-40 flex flex-col overflow-hidden rounded-full border border-border/70 bg-surface/92 shadow-md backdrop-blur-md lg:bottom-6 lg:right-6" aria-label="Quick shortcuts">
      {scrollable ? (
        <>
          <button type="button" onClick={scrollToTop} disabled={atTop} aria-label="Scroll to top" className={`${buttonClass} disabled:opacity-25`}><ChevronDown className="h-3 w-3 rotate-180" /></button>
          <div className="mx-1.5 border-t border-border/60" />
        </>
      ) : null}
      <button type="button" onClick={openQuickLog} aria-label="Quick log" title="Quick log" className={buttonClass}><BottomNavLogIcon size={15} /></button>
      {scrollable ? (
        <>
          <div className="mx-1.5 border-t border-border/60" />
          <button type="button" onClick={scrollToBottom} disabled={atBottom} aria-label="Scroll to bottom" className={`${buttonClass} disabled:opacity-25`}><ChevronDown className="h-3 w-3" /></button>
        </>
      ) : null}
    </div>
  );
}
