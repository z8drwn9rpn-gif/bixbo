import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { BottomNav } from "./BottomNav";

export function AppShell({
  children,
  title,
  right,
  big = false,
}: {
  children: ReactNode;
  title?: ReactNode;
  right?: ReactNode;
  big?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isFirst = useRef(true);
  const [fadeKey, setFadeKey] = useState(0);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    setFadeKey((k) => k + 1);
  }, [pathname]);

  return (
    <div className="min-h-dvh overflow-x-hidden bg-background text-foreground" style={{ overscrollBehaviorX: "none" }}>
      <div className="relative isolate mx-auto min-h-dvh w-full overflow-x-hidden bg-background/92 pb-[calc(6rem+env(safe-area-inset-bottom))] portrait:max-w-[430px] portrait:shadow-[0_0_40px_-24px_color-mix(in_oklch,var(--primary)_45%,transparent)] landscape:max-w-none">
        {title !== undefined && (
          <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between border-b border-border/70 bg-background/88 px-5 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] shadow-[0_1px_0_0_var(--border)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/82">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={
                  big
                    ? "relative block h-[52px] w-[52px] shrink-0 overflow-visible"
                    : "relative block h-10 w-10 shrink-0 overflow-visible"
                }
                aria-hidden="true"
              >
                <img
                  src="/icon-192.png?v=20260810b"
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className="block h-full w-full object-contain object-center opacity-100 visible"
                  style={{
                    display: "block",
                    opacity: 1,
                    visibility: "visible",
                    /* Home greeting (big): full-color Bixbo penguin + chili next to BIXBO / Hi, … */
                    filter: "none",
                    mixBlendMode: "normal",
                  }}
                  onError={(event) => {
                    const image = event.currentTarget;
                    image.onerror = null;
                    image.style.visibility = "hidden";
                  }}
                />
              </span>

              <h1
                className={`min-w-0 truncate font-serif font-bold leading-none text-foreground ${
                  big ? "text-3xl" : "text-2xl"
                }`}
              >
                {title}
              </h1>
            </div>

            {right ? <div className="ml-3 flex shrink-0 items-center">{right}</div> : null}
          </header>
        )}

        <main
          key={fadeKey}
          id="main-content"
          className={`min-w-0 overflow-x-hidden${fadeKey > 0 ? " bixbo-page-fade" : ""}`}
        >
          {children}
        </main>
      </div>

      {/* Bottom nav stays outside page fade — must remain stable on route change. */}
      <BottomNav />
    </div>
  );
}
