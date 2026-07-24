import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({ children, title, right }: { children: ReactNode; title?: ReactNode; right?: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="relative mx-auto min-h-screen w-full max-w-[430px] bg-background pb-24">
        {title !== undefined && (
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-background/90 px-5 py-4 backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden>🍓</span>
              <h1 className="font-serif text-2xl leading-none">{title}</h1>
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
