import { type ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { SideNav } from "./SideNav";
import bixboMascot from "@/assets/bixbo-mascot-user.png";
import "@/ui-polish.css";
import "@/ui-components-polish.css";

const BIXBO_MASCOT_SRC = bixboMascot;
const BIXBO_ROUNDED_DISPLAY_FONT = 'ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", "Trebuchet MS", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
const BIXBO_ROUNDED_DISPLAY_SHADOW = "0 1px 0 rgba(255,255,255,.92), 0 2px 1px rgba(57,72,34,.22), 0 4px 5px rgba(49,61,31,.16)";

export function AppShell({ children, title, right, big = false }: { children: ReactNode; title?: ReactNode; right?: ReactNode; big?: boolean; }) {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-background text-foreground" style={{ overscrollBehaviorX: "none" }}>
      <a href="#main-content" className="sr-only-focusable fixed left-3 top-3 z-[100] rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg">Skip to content</a>
      <SideNav mascotSrc={BIXBO_MASCOT_SRC} />
      <div className="min-h-dvh lg:pl-60">
        <div className="relative mx-auto min-h-dvh w-full overflow-x-hidden bg-background/92 pb-[calc(6rem+env(safe-area-inset-bottom))] portrait:max-w-[430px] portrait:shadow-[0_0_40px_-24px_color-mix(in_oklch,var(--primary)_45%,transparent)] landscape:max-lg:max-w-none lg:max-w-[1200px] lg:px-6 lg:pb-8 xl:max-w-[1320px]">
          {title !== undefined && (
            <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between border-b border-border/65 bg-background/88 px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] shadow-[0_1px_0_0_color-mix(in_srgb,var(--border)_72%,transparent)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/82 sm:px-5 lg:rounded-b-2xl lg:border-x lg:border-border/45">
              <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                <span className={big ? "relative block h-[50px] w-[50px] shrink-0 overflow-visible" : "relative block h-10 w-10 shrink-0 overflow-visible"} aria-hidden="true">
                  <img src={BIXBO_MASCOT_SRC} alt="" aria-hidden="true" draggable={false} className="block h-full w-full object-contain object-center opacity-100 visible" />
                </span>
                <h1 data-bixbo-app-title className={`min-w-0 truncate font-black tracking-[-0.045em] leading-[1.05] text-foreground ${big ? "text-[28px] sm:text-3xl" : "text-[23px] sm:text-2xl"}`} style={{ fontFamily: BIXBO_ROUNDED_DISPLAY_FONT, WebkitTextStroke: "0", textShadow: BIXBO_ROUNDED_DISPLAY_SHADOW }}>{title}</h1>
              </div>
              {right ? <div className="ml-2 flex min-w-0 shrink-0 items-center">{right}</div> : null}
            </header>
          )}
          <main id="main-content" tabIndex={-1} className="bixbo-page-fade min-w-0 overflow-x-hidden outline-none">{children}</main>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}