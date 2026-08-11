import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType } from "react";
import { useI18n } from "@/hooks/useI18n";
import { DEVICE_ADMIN_CONFIG_CHANGED } from "@/lib/deviceAdminConfig";
import { GLOBAL_ADMIN_CONFIG_CHANGED } from "@/lib/globalAdminConfig";
import { BIXBO_NAVIGATION, resolvedNavigation, type NavigationItemId } from "@/lib/navigationRegistry";
import {
  NavHomeIcon,
  NavOverviewIcon,
  NavCoupleIcon,
  NavNoteIcon,
  NavLogIcon,
  User,
  type IconProps,
} from "@/components/icons/BixboIcons";

const ICONS: Record<NavigationItemId, ComponentType<IconProps>> = {
  home: NavHomeIcon,
  overview: NavOverviewIcon,
  log: NavLogIcon,
  couple: NavCoupleIcon,
  notes: NavNoteIcon,
  healthProfile: User,
};

/** User-approved navigation artwork; versioned to bypass stale browser/PWA caches. */
const NAV_IMAGE_SRC: Partial<Record<NavigationItemId, string>> = {
  home: "/nav-assets/nav-home.webp?v=exact-20260811-2",
  overview: "/nav-assets/nav-overview.webp?v=exact-20260811-2",
  couple: "/nav-assets/nav-couple.webp?v=exact-20260811-2",
  notes: "/nav-assets/nav-note.webp?v=exact-20260811-2",
};

function NavArtwork({ id, size, className }: { id: NavigationItemId; size: number; className?: string }) {
  const Icon = ICONS[id];
  const imageSrc = NAV_IMAGE_SRC[id];
  const [imageFailed, setImageFailed] = useState(false);
  const mustUseUserArtwork = id === "home" || id === "couple";

  if (imageSrc && (mustUseUserArtwork || !imageFailed)) {
    return (
      <img
        src={imageSrc}
        alt=""
        aria-hidden="true"
        draggable={false}
        width={size}
        height={size}
        className={className}
        style={{ objectFit: "contain" }}
        onError={mustUseUserArtwork ? undefined : () => setImageFailed(true)}
      />
    );
  }

  return <Icon size={size} className={className} />;
}

/** Desktop-only left navigation. Hidden below lg so the mobile UI is untouched. */
export function SideNav({ mascotSrc }: { mascotSrc: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { t } = useI18n();
  const [navRevision, setNavRevision] = useState(0);

  useEffect(() => {
    const refresh = () => setNavRevision((value) => value + 1);
    window.addEventListener(DEVICE_ADMIN_CONFIG_CHANGED, refresh);
    window.addEventListener(GLOBAL_ADMIN_CONFIG_CHANGED, refresh);
    return () => {
      window.removeEventListener(DEVICE_ADMIN_CONFIG_CHANGED, refresh);
      window.removeEventListener(GLOBAL_ADMIN_CONFIG_CHANGED, refresh);
    };
  }, []);

  void navRevision;
  const navItems = resolvedNavigation("desktop");

  const openLog = () => {
    if (pathname === "/") {
      window.dispatchEvent(new CustomEvent("bixbo:open-log"));
    } else {
      navigate({ to: "/", search: { log: 1 } as never });
    }
  };

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-[#cbd3a7]/85 bg-[#edf0c8] px-3 py-5 lg:flex dark:border-border/70 dark:bg-[#303827]"
      style={{
        boxShadow:
          "10px 0 30px -24px rgba(52,67,28,.55), inset -1px 0 0 rgba(255,255,255,.45), inset 0 18px 34px rgba(255,255,255,.16)",
      }}
    >
      <Link to="/" className="mb-6 flex items-center gap-3 px-2">
        <img
          src={mascotSrc}
          alt="BIXBO"
          draggable={false}
          className="h-11 w-auto max-w-[46px] select-none object-contain"
          style={{ filter: "none", opacity: 1, mixBlendMode: "normal" }}
        />
        <span className="font-serif text-2xl font-bold leading-none text-[#3f4f22] dark:text-[#e3edc4]">BIXBO</span>
      </Link>

      <nav className="min-h-0 flex-1 overflow-y-auto">
        <ul className="flex flex-col gap-1.5">
          {navItems.map((navItem) => {
            const label = navItem.label ?? BIXBO_NAVIGATION.find((candidate) => candidate.id === navItem.id)?.label ?? navItem.id;

            if (navItem.action === "log") {
              return (
                <li key={navItem.id}>
                  <button
                    type="button"
                    onClick={openLog}
                    className="flex min-h-[76px] w-full items-center gap-4 rounded-3xl px-3 py-2 text-left text-[15px] font-semibold text-[#415025] transition-transform hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.985] dark:text-[#dfe9bd] dark:hover:bg-white/5"
                  >
                    <NavArtwork id={navItem.id} size={58} className="-my-2 h-[58px] w-[58px] shrink-0 object-contain drop-shadow-[0_8px_9px_rgba(59,74,31,0.28)]" />
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
                  className={`flex min-h-[68px] items-center gap-4 rounded-3xl px-3 py-2 text-[15px] font-semibold transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.985] ${
                    active
                      ? "bg-white/25 text-[#3a4920] shadow-[inset_0_1px_0_rgba(255,255,255,.65)] dark:bg-white/7 dark:text-[#e4edc7]"
                      : "text-[#4b5930] hover:bg-white/18 hover:text-[#34411f] dark:text-[#bdc99e] dark:hover:bg-white/5 dark:hover:text-[#e4edc7]"
                  }`}
                >
                  <NavArtwork
                    id={navItem.id}
                    size={48}
                    className={`h-[48px] w-[48px] shrink-0 object-contain drop-shadow-[0_6px_7px_rgba(59,74,31,0.24)] transition-transform ${active ? "scale-[1.04]" : ""}`}
                  />
                  <span className="truncate">{t(label)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
