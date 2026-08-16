import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { CalendarIcon, ChevronDown } from "@/components/icons/BixboExtraIcons";
import { BottomNavLogIcon } from "@/components/icons/BottomNavReferenceIcons";

const EDGE_TOLERANCE = 28;
const MIN_SCROLL_DISTANCE = 280;

export function ScrollJumpControl() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
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

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const scrollToBottom = () => {
    const root = document.scrollingElement ?? document.documentElement;
    window.scrollTo({ top: root.scrollHeight, behavior: "smooth" });
  };

  const goToday = () => {
    if (pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    void navigate({ to: "/" });
  };

  const openQuickLog = () => {
    if (pathname === "/") {
      window.dispatchEvent(new CustomEvent("bixbo:toggle-log"));
      return;
    }
    void navigate({ to: "/", search: { log: 1 } as never });
  };

  return (
    <div
      className="fixed bottom-[calc(6.8rem+env(safe-area-inset-bottom))] right-3 z-40 flex flex-col overflow-hidden rounded-full border border-border/70 bg-surface/92 shadow-md backdrop-blur-md lg:bottom-6 lg:right-6"
      aria-label="Quick shortcuts"
    >
      {scrollable ? (
        <>
          <button
            type="button"
            onClick={scrollToTop}
            disabled={atTop}
            aria-label="Scroll to top"
            className="relative grid h-7 w-7 place-items-center text-primary transition active:scale-95 disabled:opacity-25 after:absolute after:left-1/2 after:top-1/2 after:h-11 after:w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']"
          >
            <ChevronDown className="h-3 w-3 rotate-180" />
          </button>
          <div className="mx-1.5 border-t border-border/60" />
        </>
      ) : null}

      <button
        type="button"
        onClick={goToday}
        aria-label="Today"
        title="Today"
        className="relative grid h-7 w-7 place-items-center text-primary transition active:scale-95 after:absolute after:left-1/2 after:top-1/2 after:h-11 after:w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']"
      >
        <CalendarIcon size={13} />
      </button>

      <div className="mx-1.5 border-t border-border/60" />

      <button
        type="button"
        onClick={openQuickLog}
        aria-label="Quick log"
        title="Quick log"
        className="relative grid h-7 w-7 place-items-center text-primary transition active:scale-95 after:absolute after:left-1/2 after:top-1/2 after:h-11 after:w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']"
      >
        <BottomNavLogIcon size={15} />
      </button>

      {scrollable ? (
        <>
          <div className="mx-1.5 border-t border-border/60" />
          <button
            type="button"
            onClick={scrollToBottom}
            disabled={atBottom}
            aria-label="Scroll to bottom"
            className="relative grid h-7 w-7 place-items-center text-primary transition active:scale-95 disabled:opacity-25 after:absolute after:left-1/2 after:top-1/2 after:h-11 after:w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </>
      ) : null}
    </div>
  );
}
