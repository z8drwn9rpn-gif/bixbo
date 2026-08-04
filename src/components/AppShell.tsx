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
    <div className="min-h-screen bg-background text-foreground">
      {/* Landscape: full width; portrait: maximum 430 px */}
      <div className="relative mx-auto min-h-screen w-full bg-background pb-24 portrait:max-w-[430px] landscape:max-w-none">
        {title !== undefined && (
          <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between border-b border-border/60 bg-background/95 px-5 py-2 backdrop-blur">
            <div className="flex min-w-0 items-center gap-3 overflow-visible">
              <img
                src="/bixbo-mascot.png"
                alt="Bixbo"
                className={
                  big
                    ? "h-12 w-auto max-w-[52px] shrink-0 object-contain object-center"
                    : "h-9 w-auto max-w-[40px] shrink-0 object-contain object-center"
                }
              />

              <h1
                className={`min-w-0 font-serif font-bold leading-none text-foreground ${big ? "text-3xl" : "text-2xl"}`}
              >
                {title}
              </h1>
            </div>

            {right && <div className="ml-3 shrink-0">{right}</div>}
          </header>
        )}

        {children}
      </div>

      <BottomNav />
    </div>
  );
}
