import "@/lib/appVisualForensics";
import "@/lib/legacyDeploymentRefreshCleanup";

import { type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { BottomNav } from "./BottomNav";
import { SideNav } from "./SideNav";
import { BixboIconKeyboard } from "./icons/BixboIconKeyboard";
import { PainEpisodeChoiceDefaults } from "./PainEpisodeChoiceDefaults";
import { ScrollJumpControl } from "./ScrollJumpControl";
import { GlobalQuickLogActions } from "./GlobalQuickLogActions";
import { CalendarTargetBridge } from "./CalendarTargetBridge";
import { DiagnosticProfiler } from "./DiagnosticProfiler";
import { ProductAnalyticsRuntime } from "./ProductAnalyticsRuntime";
import {
  BIXBO_MASCOT_FILTER,
  BIXBO_ROUNDED_DISPLAY_FONT,
  BIXBO_ROUNDED_DISPLAY_SHADOW,
} from "@/lib/designTokens";
import bixboMascot from "@/assets/bixbo-mascot-user.png";

const BIXBO_MASCOT_SRC = bixboMascot;

export function AppShell({ children, title, right, big = false, stickyHeader = true }: { children: ReactNode; title?: ReactNode; right?: ReactNode; big?: boolean; stickyHeader?: boolean; }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const showBixboIconKeyboard = !pathname.startsWith("/notes");
  const isHomeHeader = pathname === "/" && title !== undefined;

  return (
    <div className="min-h-dvh overflow-x-hidden bg-background text-foreground" style={{ overscrollBehaviorX: "none" }}>
      <PainEpisodeChoiceDefaults />
      <CalendarTargetBridge />
      <ProductAnalyticsRuntime />
      <a href="#main-content" className="sr-only-focusable fixed left-3 top-3 z-50 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg">Skip to content</a>
      <SideNav mascotSrc={BIXBO_MASCOT_SRC} />
      <div className="min-h-dvh lg:pl-60">
        <div className="relative mx-auto min-h-dvh w-full overflow-x-hidden bg-background/92 pb-[calc(6rem+env(safe-area-inset-bottom))] portrait:max-w-[430px] portrait:shadow-[0_0_40px_-24px_color-mix(in_oklch,var(--primary)_45%,transparent)] landscape:max-lg:max-w-none lg:max-w-[1200px] lg:px-6 lg:pb-8 xl:max-w-[1320px]">
          {title !== undefined && (
            <header data-bixbo-app-header data-bixbo-home-header={isHomeHeader ? "true" : undefined} className={`${stickyHeader ? "sticky top-0" : ""} z-30 flex min-h-14 items-center justify-between border-b border-border/65 px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] shadow-[0_1px_0_0_color-mix(in_srgb,var(--border)_72%,transparent)] sm:px-5 lg:rounded-b-2xl lg:border-x lg:border-border/45 ${big ? "bg-background" : "bg-background/88 backdrop-blur-xl supports-[backdrop-filter]:bg-background/82"}`}>
              <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                <span className={`relative block shrink-0 overflow-visible ${big ? "h-20 w-20" : "h-16 w-16"}`} aria-hidden="true">
                  <img
                    src={BIXBO_MASCOT_SRC}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    className="block h-full w-full object-contain object-center opacity-100 visible"
                    style={{ filter: BIXBO_MASCOT_FILTER }}
                  />
                </span>
                <h1 data-bixbo-app-title className={`min-w-0 truncate font-black tracking-[-0.045em] leading-[1.05] text-foreground ${big ? "text-[28px] sm:text-3xl" : "text-[23px] sm:text-2xl"}`} style={{ fontFamily: BIXBO_ROUNDED_DISPLAY_FONT, WebkitTextStroke: "0", textShadow: big ? "none" : BIXBO_ROUNDED_DISPLAY_SHADOW }}>{title}</h1>
              </div>
              {right ? <div className="ml-2 flex min-w-0 shrink-0 items-center">{right}</div> : null}
            </header>
          )}
          <main id="main-content" tabIndex={-1} className="bixbo-page-fade min-w-0 overflow-x-hidden outline-none">
            <DiagnosticProfiler id={`Screen:${pathname}`}>
              {children}
            </DiagnosticProfiler>
          </main>
        </div>
      </div>
      <ScrollJumpControl />
      <GlobalQuickLogActions />
      {showBixboIconKeyboard ? <BixboIconKeyboard /> : null}
      <BottomNav />
    </div>
  );
}
