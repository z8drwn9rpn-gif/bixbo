import { type ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { SideNav } from "./SideNav";
import { useAppAutoUpdate } from "@/hooks/useAppAutoUpdate";

const BIXBO_MASCOT_SRC = "data:image/png;base64,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";

export function AppShell({ children, title, right, big = false }: { children: ReactNode; title?: ReactNode; right?: ReactNode; big?: boolean; }) {
  useAppAutoUpdate();

  return (
    <div className="min-h-dvh overflow-x-hidden bg-background text-foreground" style={{ overscrollBehaviorX: "none" }}>
      <SideNav mascotSrc={BIXBO_MASCOT_SRC} />
      <div className="min-h-dvh lg:pl-60">
        <div className="relative isolate mx-auto min-h-dvh w-full overflow-x-hidden bg-background/92 pb-[calc(6rem+env(safe-area-inset-bottom))] portrait:max-w-[430px] portrait:shadow-[0_0_40px_-24px_color-mix(in_oklch,var(--primary)_45%,transparent)] landscape:max-lg:max-w-none lg:max-w-[1200px] lg:px-6 lg:pb-8 xl:max-w-[1320px]">
          {title !== undefined && (
            <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between border-b border-border/70 bg-background/88 px-5 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] shadow-[0_1px_0_0_var(--border)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/82">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={big ? "relative block h-[52px] w-[52px] shrink-0" : "relative block h-10 w-10 shrink-0"}
                  aria-hidden="true"
                  style={{
                    backgroundImage: `url(${BIXBO_MASCOT_SRC})`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    backgroundSize: "contain",
                    opacity: 1,
                    visibility: "visible",
                  }}
                />
                <h1 className={`min-w-0 truncate font-serif font-bold leading-none text-foreground ${big ? "text-3xl" : "text-2xl"}`}>{title}</h1>
              </div>
              {right ? <div className="ml-3 flex shrink-0 items-center">{right}</div> : null}
            </header>
          )}
          <main id="main-content" className="min-w-0 overflow-x-hidden">{children}</main>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
