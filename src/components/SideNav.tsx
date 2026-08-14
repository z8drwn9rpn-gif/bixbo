import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { type ComponentType } from "react";
import { useI18n } from "@/hooks/useI18n";
import { BIXBO_NAVIGATION, resolvedNavigation, type NavigationItemId } from "@/lib/navigationRegistry";
import { BottomNavHomeIcon } from "@/components/icons/BottomNavReferenceIcons";
import { NavOverviewIcon, NavCoupleIcon, NavNoteIcon, NavLogIcon, User, type IconProps } from "@/components/icons/BixboExtraIcons";

const ICONS: Record<NavigationItemId, ComponentType<IconProps>> = { home: BottomNavHomeIcon, overview: NavOverviewIcon, log: NavLogIcon, couple: NavCoupleIcon, notes: NavNoteIcon, healthProfile: User };
const NAV_IMAGE_SRC: Partial<Record<NavigationItemId, string>> = { home: "/nav-assets/nav-home.webp?v=visible-20260814-2", overview: "/nav-assets/nav-overview-approved.webp?v=visible-20260814-2", log: "/nav-assets/nav-log.svg?v=green-plus-2", couple: "/nav-assets/nav-couple.webp?v=visible-20260814-2", notes: "/nav-assets/nav-note-approved.webp?v=visible-20260814-2" };

function NavArtwork({ id, size, className }: { id: NavigationItemId; size: number; className?: string }) {
  const Icon = ICONS[id];
  const imageSrc = NAV_IMAGE_SRC[id];
  if (imageSrc) return <img src={imageSrc} alt="" aria-hidden="true" draggable={false} width={size} height={size} className={className} style={{ objectFit: "contain" }} onError={(event) => { event.currentTarget.style.display = "none"; event.currentTarget.parentElement?.querySelector<SVGElement>("svg[data-nav-fallback]")?.removeAttribute("hidden"); }} />;
  return <Icon size={size} className={className} />;
}

function NavArtworkSafe({ id, size, className }: { id: NavigationItemId; size: number; className?: string }) {
  const Icon = ICONS[id];
  return <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}><NavArtwork id={id} size={size} className={className} /><Icon data-nav-fallback hidden size={size} className={className} /></span>;
}

export function SideNav({ mascotSrc }: { mascotSrc: string; mascotFallbackSrc?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { t } = useI18n();
  const navItems = resolvedNavigation("desktop");
  const openLog = () => pathname === "/" ? window.dispatchEvent(new CustomEvent("bixbo:open-log")) : navigate({ to: "/", search: { log: 1 } as never });
  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border/55 bg-[#FBF7F3]/96 px-3 py-5 backdrop-blur-xl lg:flex dark:border-border/70 dark:bg-[#303827]/96" style={{ boxShadow: "10px 0 30px -24px rgba(52,67,28,.26), inset -1px 0 0 rgba(255,255,255,.72)" }}>
      <Link to="/" aria-label="BIXBO home" className="mb-6 flex min-h-12 items-center gap-3 rounded-2xl px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span aria-hidden="true" className="block h-11 w-[46px] shrink-0 select-none" style={{ backgroundImage: `url(${mascotSrc})`, backgroundRepeat: "no-repeat", backgroundPosition: "center", backgroundSize: "contain" }} />
        <span className="font-sans text-[30px] font-black tracking-[-0.035em] leading-none text-[#2f3d1e] dark:text-[#e3edc4]">BIXBO</span>
      </Link>
      <nav aria-label="Primary navigation" className="min-h-0 flex-1 overflow-y-auto">
        <ul className="flex flex-col gap-1.5">
          {navItems.map((navItem) => {
            const label = navItem.label ?? BIXBO_NAVIGATION.find((candidate) => candidate.id === navItem.id)?.label ?? navItem.id;
            if (navItem.action === "log") return <li key={navItem.id}><button type="button" onClick={openLog} className="flex min-h-[72px] w-full items-center gap-3 rounded-3xl px-3 py-2 text-left text-[15px] font-semibold text-[#415025] transition-[background-color,transform] hover:bg-[#EEF2E3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.985] dark:text-[#dfe9bd] dark:hover:bg-white/5"><NavArtworkSafe id={navItem.id} size={56} className="-my-2 h-14 w-14 shrink-0 object-contain drop-shadow-[0_8px_9px_rgba(59,74,31,0.20)]" /><span>{t(label)}</span></button></li>;
            const to = navItem.to ?? "/";
            const active = navItem.id === "overview" ? pathname.startsWith("/insights") || pathname.startsWith("/patterns") : isActive(to);
            return <li key={navItem.id}><Link to={to as never} aria-current={active ? "page" : undefined} className={`relative flex min-h-[64px] items-center gap-3 rounded-3xl px-3 py-2 text-[15px] font-semibold transition-[background-color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.985] ${active ? "bg-[#EEF2E3] text-[#3a4920] shadow-[inset_0_1px_0_rgba(255,255,255,.8),0_6px_16px_-14px_rgba(44,57,24,.28)] dark:bg-white/7 dark:text-[#e4edc7]" : "text-[#4b5930] hover:bg-[#F3F5EB] hover:text-[#34411f] dark:text-[#bdc99e] dark:hover:bg-white/5 dark:hover:text-[#e4edc7]"}`}><NavArtworkSafe id={navItem.id} size={46} className={`h-[46px] w-[46px] shrink-0 object-contain drop-shadow-[0_6px_7px_rgba(59,74,31,0.18)] transition-transform ${active ? "scale-[1.04]" : ""}`} /><span className="truncate">{t(label)}</span>{active ? <span aria-hidden="true" className="absolute left-1 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full bg-current opacity-55" /> : null}</Link></li>;
          })}
        </ul>
      </nav>
    </aside>
  );
}
