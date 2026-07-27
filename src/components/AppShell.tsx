import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({
  children, title, right, big = false,
}: {
  children: ReactNode;
  title?: ReactNode;
  right?: ReactNode;
  big?: boolean;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Landscape: fill full width; portrait: capped at 430px */}
      <div className="relative mx-auto min-h-screen w-full bg-background pb-24 portrait:max-w-[430px] landscape:max-w-none">
        {title !== undefined && (
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-background/90 px-5 pt-2 pb-1.5 backdrop-blur">
            <div className="flex items-center gap-2">
              <span className={big ? "text-3xl" : "text-2xl"} aria-hidden>🌶️</span>
              <h1 className={`font-serif font-bold leading-none ${big ? "text-3xl" : "text-2xl"}`}>
                {title}
              </h1>
            </div>
            <div>{right}</div>
          </header>
        )}
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
