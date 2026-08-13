import { type ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { SideNav } from "./SideNav";

const BIXBO_MASCOT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <defs>
    <radialGradient id="body" cx="38%" cy="28%" r="72%"><stop offset="0" stop-color="#75867a"/><stop offset=".58" stop-color="#33423a"/><stop offset="1" stop-color="#1d2924"/></radialGradient>
    <linearGradient id="belly" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fffdf8"/><stop offset="1" stop-color="#efe8db"/></linearGradient>
    <linearGradient id="beak" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ff8a2e"/><stop offset="1" stop-color="#ff3f16"/></linearGradient>
    <linearGradient id="pepper" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ff6a2d"/><stop offset="1" stop-color="#e71f13"/></linearGradient>
    <filter id="s" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity=".28"/></filter>
  </defs>
  <g filter="url(#s)">
    <ellipse cx="48" cy="55" rx="28" ry="36" fill="url(#body)"/>
    <path d="M31 34c1-14 10-24 22-24 7 0 14 4 18 10-7-2-13-1-18 1-8 3-15 8-22 13z" fill="#6d7c72" opacity=".78"/>
    <ellipse cx="48" cy="60" rx="20" ry="27" fill="url(#belly)"/>
    <path d="M24 46c-8 5-12 13-11 23 7-5 12-11 16-19z" fill="#314039"/>
    <path d="M72 45c8 5 12 13 11 23-7-4-12-10-16-18z" fill="#314039"/>
    <ellipse cx="39" cy="34" rx="9" ry="10" fill="#fdfbf4"/>
    <ellipse cx="57" cy="34" rx="9" ry="10" fill="#fdfbf4"/>
    <ellipse cx="40" cy="36" rx="4" ry="5" fill="#1a2420"/><circle cx="41" cy="34" r="1.3" fill="#fff"/>
    <ellipse cx="56" cy="36" rx="4" ry="5" fill="#1a2420"/><circle cx="57" cy="34" r="1.3" fill="#fff"/>
    <path d="M44 43c3-2 6-2 9 0l-4 7z" fill="url(#beak)"/>
    <path d="M34 86c-6 0-10 2-12 5 6 1 12 1 18-1z" fill="#ff6a26"/>
    <path d="M58 89c7-2 12-1 16 2-6 2-12 2-18 0z" fill="#ff6a26"/>
    <g transform="translate(59 58) rotate(22)">
      <path d="M4 0c10 1 16 8 14 21-1 7-5 12-10 16 2-7 1-13-3-18C1 14-1 8 4 0z" fill="url(#pepper)"/>
      <path d="M4 1C2-3 0-5-3-6c3-1 6 0 9 3z" fill="#5e7f21"/>
      <path d="M7 5c4 1 7 4 8 7" fill="none" stroke="#ff9a66" stroke-width="1.5" stroke-linecap="round" opacity=".55"/>
    </g>
  </g>
</svg>`;

const BIXBO_MASCOT_SRC = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(BIXBO_MASCOT_SVG)}`;

export function AppShell({ children, title, right, big = false, showMascot = true }: { children: ReactNode; title?: ReactNode; right?: ReactNode; big?: boolean; showMascot?: boolean; }) {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-background text-foreground" style={{ overscrollBehaviorX: "none" }}>
      <SideNav mascotSrc={BIXBO_MASCOT_SRC} />
      <div className="min-h-dvh lg:pl-60">
        <div className="relative isolate mx-auto min-h-dvh w-full overflow-x-hidden bg-background/92 pb-[calc(6rem+env(safe-area-inset-bottom))] portrait:max-w-[430px] portrait:shadow-[0_0_40px_-24px_color-mix(in_oklch,var(--primary)_45%,transparent)] landscape:max-lg:max-w-none lg:max-w-[1200px] lg:px-6 lg:pb-8 xl:max-w-[1320px]">
          {title !== undefined && (
            <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between border-b border-border/70 bg-background/88 px-5 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] shadow-[0_1px_0_0_var(--border)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/82">
              <div className="flex min-w-0 items-center gap-3">
                {showMascot && (
                  <span className={big ? "relative block h-[52px] w-[52px] shrink-0" : "relative block h-10 w-10 shrink-0"} aria-hidden="true">
                    <img
                      src={BIXBO_MASCOT_SRC}
                      alt=""
                      aria-hidden="true"
                      draggable={false}
                      className="block h-full w-full object-contain object-center"
                    />
                  </span>
                )}
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
