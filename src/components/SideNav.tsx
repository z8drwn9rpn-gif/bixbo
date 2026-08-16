import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { type ComponentType, type CSSProperties } from "react";
import { useI18n } from "@/hooks/useI18n";
import { BIXBO_NAVIGATION, resolvedNavigation, type NavigationItemId } from "@/lib/navigationRegistry";
import {
  BIXBO_MASCOT_FILTER,
  BIXBO_SIDE_NAV_ACTIVE_SHADOW,
  BIXBO_SIDE_NAV_ARTWORK_FILTER,
  BIXBO_SIDE_NAV_LOG_ARTWORK_FILTER,
  BIXBO_SIDE_NAV_SHADOW,
} from "@/lib/designTokens";
import { BottomNavHomeIcon } from "@/components/icons/BottomNavReferenceIcons";
import {
  NavOverviewIcon,
  NavCoupleIcon,
  NavNoteIcon,
  NavLogIcon,
  User,
  type IconProps,
} from "@/components/icons/BixboExtraIcons";

const ICONS: Record<NavigationItemId, ComponentType<IconProps>> = {
  home: BottomNavHomeIcon,
  overview: NavOverviewIcon,
  log: NavLogIcon,
  couple: NavCoupleIcon,
  notes: NavNoteIcon,
  healthProfile: User,
};

const NAV_IMAGE_SRC: Partial<Record<NavigationItemId, string>> = {
  home: "/nav-assets/nav-home-user.webp?v=exact-4",
  overview: "/nav-assets/nav-overview-approved.webp?v=exact-3",
  log: "/nav-assets/nav-log.svg?v=green-plus-2",
  couple: "/nav-assets/nav-couple-user.webp?v=exact-4",
  notes: "/nav-assets/nav-note-approved.webp?v=exact-3",
};

function NavArtwork({
  id,
  size,
  className,
  style,
}: {
  id: NavigationItemId;
  size: number;
  className?: string;
  style?: CSSProperties;
}) {
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

function NavArtworkSafe({
  id,
  size,
  className,
  style,
}: {
  id: NavigationItemId;
  size: number;
  className?: string;
  style?: CSSProperties;
}) {
  const Icon = ICONS[id];
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <NavArtwork id={id} size={size} className={className} style={style} />
      <Icon data-nav-fallback size={size} className={className} style={{ display: "none", ...style }} />
    </span>
  );
}

export function SideNav({ mascotSrc }: { mascotSrc: string; mascotFallbackSrc?: string }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const { t } = useI18n();
  const navItems = resolvedNavigation("desktop");

  const openLog = () => pathname === "/"
    ? window.dispatchEvent(new CustomEvent("bixbo:open-log"))
    : navigate({ to: "/", search: { log: 1 } as never });

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border/55 bg-background/96 px-3 py-5 backdrop-blur-xl lg:flex dark:border-border/65 dark:supports-[backdrop-filter]:bg-background/92"
      style={{ boxShadow: BIXBO_SIDE_NAV_SHADOW }}
    >
      <Link
        to="/"
        aria-label="BIXBO home"
        className="mb-6 flex min-h-12 items-center gap-3 rounded-2xl px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span aria-hidden="true" className="relative block h-16 w-16 shrink-0 select-none overflow-visible">
          <span
            className="absolute inset-0 block h-full w-full bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${mascotSrc})`, filter: BIXBO_MASCOT_FILTER }}
          />
        </span>
        <span className="font-sans text-[30px] font-black leading-none tracking-[-0.035em] text-primary dark:text-foreground">BIXBO</span>
      </Link>

      <nav aria-label="Sidebar navigation" className="min-h-0 flex-1 overflow-y-auto">
        <ul className="flex flex-col gap-1.5">
          {navItems.map((navItem) => {
            const label = navItem.label ?? BIXBO_NAVIGATION.find((candidate) => candidate.id === navItem.id)?.label ?? navItem.id;

            if (navItem.action === "log") {
              return (
                <li key={navItem.id}>
                  <button
                    type="button"
                    onClick={openLog}
                    className="flex min-h-[72px] w-full items-center gap-3 rounded-3xl px-3 py-2 text-left text-[15px] font-semibold text-foreground transition-[background-color,transform] hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.985] dark:hover:bg-foreground/5"
                  >
                    <NavArtworkSafe
                      id={navItem.id}
                      size={56}
                      className="-my-2 h-14 w-14 shrink-0 object-contain"
                      style={{ filter: BIXBO_SIDE_NAV_LOG_ARTWORK_FILTER }}
                    />
                    <span>{t(label)}</span>
                  </button>
                </li>
              );
            }

            const to = navItem.to ?? "/";
            const active = navItem.id === "overview"
              ? pathname.startsWith("/insights") || pathname.startsWith("/patterns")
              : isActive(to);

            return (
              <li key={navItem.id}>
                <Link
                  to={to as never}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex min-h-[64px] items-center gap-3 rounded-3xl px-3 py-2 text-[15px] font-semibold transition-[background-color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.985] ${active ? "bg-tint text-primary dark:bg-foreground/7 dark:text-foreground" : "text-muted-foreground hover:bg-tint hover:text-foreground dark:hover:bg-foreground/5"}`}
                  style={active ? { boxShadow: BIXBO_SIDE_NAV_ACTIVE_SHADOW } : undefined}
                >
                  <NavArtworkSafe
                    id={navItem.id}
                    size={46}
                    className={`h-[46px] w-[46px] shrink-0 object-contain transition-transform ${active ? "scale-[1.04]" : ""}`}
                    style={{ filter: BIXBO_SIDE_NAV_ARTWORK_FILTER }}
                  />
                  <span className="truncate">{t(label)}</span>
                  {active ? <span aria-hidden="true" className="absolute left-1 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full bg-current opacity-55" /> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
