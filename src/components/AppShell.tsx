import type { ReactNode } from "react";
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
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="relative isolate mx-auto min-h-dvh w-full overflow-x-clip bg-background/92 pb-[calc(6rem+env(safe-area-inset-bottom))] portrait:max-w-[430px] portrait:shadow-[0_0_40px_-24px_color-mix(in_oklch,var(--primary)_45%,transparent)] landscape:max-w-none">
        {title !== undefined && (
          <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between border-b border-border/70 bg-background/88 px-5 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] shadow-[0_1px_0_0_var(--border)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/82">
            <div className="flex min-w-0 items-center gap-3">
              <img
                src="/bixbo-mascot.png"
                alt=""
                aria-hidden="true"
                draggable={false}
                className={
                  big
                    ? "h-12 w-auto max-w-[52px] shrink-0 select-none object-contain object-center"
                    : "h-9 w-auto max-w-[40px] shrink-0 select-none object-contain object-center"
                }
              />

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

        <main id="main-content" className="min-w-0">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
