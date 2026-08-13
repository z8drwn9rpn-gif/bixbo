import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { type ComponentType } from "react";
import { useI18n } from "@/hooks/useI18n";
import type { IconProps } from "@/components/icons/BixboIcons";
import {
  BottomNavHomeIcon,
  BottomNavOverviewIcon,
  BottomNavCoupleIcon,
  BottomNavNoteIcon,
  BottomNavLogIcon,
} from "@/components/icons/BottomNavReferenceIcons";
import exactHomeArtwork from "@/assets/nav-home-user.webp";
import exactCoupleArtwork from "@/assets/nav-couple-exact.webp";
import { BIXBO_NAVIGATION, resolvedNavigation, type NavigationItemId } from "@/lib/navigationRegistry";

const ICONS: Record<NavigationItemId, ComponentType<IconProps>> = {
  home: BottomNavHomeIcon,
  overview: BottomNavOverviewIcon,
  log: BottomNavLogIcon,
  couple: BottomNavCoupleIcon,
  notes: BottomNavNoteIcon,
  healthProfile: BottomNavHomeIcon,
};

const NAV_IMAGE_SRC: Partial<Record<NavigationItemId, string>> = {
  home: exactHomeArtwork,
  overview: "/nav-assets/nav-overview.webp",
  couple: exactCoupleArtwork,
  notes: "/nav-assets/nav-note.webp",
};

function NavArtwork({ id, size, className }: { id: NavigationItemId; size: number; className?: string }) {
  const Icon = ICONS[id];
  const imageSrc = NAV_IMAGE_SRC[id];

  if (imageSrc) {
    return <img src={imageSrc} alt="" aria-hidden="true" draggable={false} width={size} height={size} className={className} style={{ objectFit: "contain" }} />;
  }
  return <Icon size={size} className={className} />;
}

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { t } = useI18n();
  const items = resolvedNavigation("mobile");

  const openLog = () => {
    if (pathname === "/") window.dispatchEvent(new CustomEvent("bixbo:open-log"));
    else navigate({ to: "/", search: { log: 1 } as never });
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 w-full border-t border-[#7f8d58]/55 bg-[#a8b27b] pb-[max(8px,env(safe-area-inset-bottom))] lg:hidden dark:border-border/70 dark:bg-[#303827]" style={{ boxShadow: "0 -8px 22px -17px rgba(45,58,26,.55), inset 0 1px 0 rgba(255,255,255,.16)" }}>
      <ul className="mx-auto flex min-h-[96px] w-full items-end justify-around gap-0 px-2 pb-2 pt-1.5 sm:px-4 landscape:min-h-[84px] landscape:py-1.5">
        {items.map((item) => {
          const label = item.label ?? BIXBO_NAVIGATION.find((candidate) => candidate.id === item.id)?.label ?? item.id;
          if (item.action === "log") {
            return <li key={item.id} className="flex min-w-0 flex-1 justify-center"><button type="button" onClick={openLog} className="flex min-h-[80px] w-full flex-col items-center justify-end gap-0 px-1 pb-0.5 text-[11px] font-semibold text-[#3f4e27] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] dark:text-[#dce7b8] landscape:min-h-[68px]" aria-label={t(label)}><NavArtwork id={item.id} size={68} className="-mb-1 h-[68px] w-[68px] shrink-0 object-contain drop-shadow-[0_7px_8px_rgba(52,67,30,0.28)] landscape:h-[58px] landscape:w-[58px]" /><span className="max-w-full truncate text-center leading-none">{t(label)}</span></button></li>;
          }
          const to = item.to ?? "/";
          const active = item.id === "overview" ? pathname.startsWith("/insights") || pathname.startsWith("/patterns") : to === "/" ? pathname === "/" : pathname.startsWith(to);
          return <li key={item.id} className="flex min-w-0 flex-1 justify-center"><Link to={to as never} className={`flex min-h-[80px] w-full flex-col items-center justify-end gap-0 px-1 pb-0.5 text-[11px] font-semibold transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] landscape:min-h-[68px] ${active ? "text-[#34431f] dark:text-[#e3edc4]" : "text-[#45542b]/95 hover:text-[#34411f] dark:text-[#bdc99e] dark:hover:text-[#e3edc4]"}`}><NavArtwork id={item.id} size={58} className={`mb-0 h-[58px] w-[58px] shrink-0 object-contain drop-shadow-[0_6px_7px_rgba(52,67,30,0.22)] transition-transform landscape:h-[48px] landscape:w-[48px] ${active ? "scale-[1.02]" : ""}`} /><span className="max-w-full truncate text-center leading-none">{t(label)}</span></Link></li>;
        })}
      </ul>
    </nav>
  );
}
