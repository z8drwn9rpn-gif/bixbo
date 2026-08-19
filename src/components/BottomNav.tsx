import { Link, useRouterState } from "@tanstack/react-router";
import { useRef, type ComponentType, type CSSProperties } from "react";
import { useI18n } from "@/hooks/useI18n";
import type { IconProps } from "@/components/icons/BixboExtraIcons";
import {
  BottomNavHomeIcon,
  BottomNavOverviewIcon,
  BottomNavCoupleIcon,
  BottomNavNoteIcon,
  BottomNavLogIcon,
} from "@/components/icons/BottomNavReferenceIcons";
import { BIXBO_NAVIGATION, resolvedNavigation, type NavigationItemId } from "@/lib/navigationRegistry";
import {
  BIXBO_BOTTOM_NAV_SHADOW,
  BIXBO_NAV_ARTWORK_FILTER,
  BIXBO_NAV_LOG_ARTWORK_FILTER,
} from "@/lib/designTokens";

const ICONS: Record<NavigationItemId, ComponentType<IconProps>> = {
  home: BottomNavHomeIcon,
  overview: BottomNavOverviewIcon,
  log: BottomNavLogIcon,
  couple: BottomNavCoupleIcon,
  notes: BottomNavNoteIcon,
  healthProfile: BottomNavHomeIcon,
};

const NAV_IMAGE_SRC: Partial<Record<NavigationItemId, string>> = {
  home: "/nav-assets/nav-home-user.webp?v=exact-4",
  overview: "/nav-assets/nav-overview-approved.webp?v=exact-3",
  log: "/nav-assets/nav-log-user.svg?v=transparent-dark-fix-1",
  couple: "/nav-assets/nav-couple-user.webp?v=exact-4",
  notes: "/nav-assets/nav-note-approved.webp?v=exact-3",
};

function NavArtwork({ id, size, className, style }: { id: NavigationItemId; size: number; className?: string; style?: CSSProperties }) {
  const Icon = ICONS[id];
  const imageSrc = NAV_IMAGE_SRC[id];
  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        alt=""
        aria-hidden="true"
        draggable={false}
        width={size}
        height={size}
        className={className}
        style={{ objectFit: "contain", ...style }}
        onError={(event) => {
          event.currentTarget.style.display = "none";
          const fallback = event.currentTarget.parentElement?.querySelector<SVGElement>("svg[data-nav-fallback]");
          if (fallback) fallback.style.display = "";
        }}
      />
    );
  }
  return <Icon size={size} className={className} style={style} />;
}

function NavArtworkSafe({ id, size, className, style }: { id: NavigationItemId; size: number; className?: string; style?: CSSProperties }) {
  const Icon = ICONS[id];
  return (
    <span className="pointer-events-none relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <NavArtwork id={id} size={size} className={className} style={style} />
      <Icon data-nav-fallback size={size} className={className} style={{ display: "none", ...style }} />
    </span>
  );
}

export function BottomNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { t } = useI18n();
  const items = resolvedNavigation("mobile");
  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);

  const clearLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const startLongPress = () => {
    clearLongPress();
    longPressFired.current = false;
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      window.dispatchEvent(new CustomEvent("bixbo:open-quick-log-menu"));
      if (navigator.vibrate) {
        try { navigator.vibrate(15); } catch { /* noop */ }
      }
    }, 480);
  };

  const openLog = () => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    window.dispatchEvent(new CustomEvent("bixbo:open-log-menu"));
  };

  return (
    <nav
      data-bixbo-bottom-nav
      aria-label="Primary navigation"
      className="pointer-events-none fixed inset-x-0 bottom-2 z-40 px-3 sm:px-4 lg:hidden"
      style={{
        contain: "layout paint",
        paddingBottom: "max(0px, calc(env(safe-area-inset-bottom) - 30px))",
      }}
    >
      <ul
        className="pointer-events-auto mx-auto flex min-h-[92px] w-full max-w-[420px] items-end justify-around gap-0 rounded-[30px] border border-border/55 bg-background/95 px-2 pb-2 pt-1.5 shadow-xl backdrop-blur-xl supports-[backdrop-filter]:bg-background/90 sm:px-4 landscape:min-h-[80px] landscape:py-1 dark:border-border/65 dark:bg-background/95"
        style={{ boxShadow: BIXBO_BOTTOM_NAV_SHADOW }}
      >
        {items.map((item) => {
          const label = item.label ?? BIXBO_NAVIGATION.find((candidate) => candidate.id === item.id)?.label ?? item.id;
          if (item.action === "log") {
            return (
              <li key={item.id} className="flex min-w-0 flex-1 justify-center">
                <button
                  type="button"
                  onClick={openLog}
                  onPointerDown={startLongPress}
                  onPointerUp={clearLongPress}
                  onPointerCancel={clearLongPress}
                  onPointerLeave={clearLongPress}
                  onContextMenu={(event) => event.preventDefault()}
                  data-bixbo-nav-id={item.id}
                  data-bixbo-nav-target="log-sheet"
                  className="flex min-h-[76px] w-full flex-col items-center justify-end gap-0 px-1 pb-0.5 text-[11px] font-semibold text-primary transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] dark:text-foreground landscape:min-h-[64px]"
                  aria-label={`${t(label)} · ${t("hold for shortcuts")}`}
                >
                  <NavArtworkSafe id={item.id} size={64} className="-mb-1 h-[64px] w-[64px] shrink-0 object-contain landscape:h-[54px] landscape:w-[54px]" style={{ filter: BIXBO_NAV_LOG_ARTWORK_FILTER }} />
                  <span className="max-w-full truncate text-center leading-none">{t(label)}</span>
                </button>
              </li>
            );
          }

          const to = item.to ?? "/";
          const active = item.id === "overview"
            ? pathname.startsWith("/insights") || pathname.startsWith("/patterns")
            : to === "/"
              ? pathname === "/"
              : pathname.startsWith(to);

          return (
            <li key={item.id} className="flex min-w-0 flex-1 justify-center">
              <Link
                to={to as never}
                preload={false}
                data-bixbo-nav-id={item.id}
                data-bixbo-nav-target={to}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-[76px] w-full flex-col items-center justify-end gap-0 px-1 pb-0.5 text-[11px] font-semibold transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] landscape:min-h-[64px] ${active ? "text-primary dark:text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <NavArtworkSafe id={item.id} size={54} className={`mb-0 h-[54px] w-[54px] shrink-0 object-contain transition-transform landscape:h-[46px] landscape:w-[46px] ${active ? "scale-[1.05]" : ""}`} style={{ filter: BIXBO_NAV_ARTWORK_FILTER }} />
                <span className="max-w-full truncate text-center leading-none">{t(label)}</span>
                {active ? <span aria-hidden="true" className="absolute bottom-[-4px] h-1 w-7 rounded-full bg-current opacity-80" /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
