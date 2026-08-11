from pathlib import Path

# appRegistry.ts
path = Path('src/lib/appRegistry.ts')
text = path.read_text()
old = '''  /** Per-page whole-section ordering. IDs are stable layout section IDs. */
  layoutOrder?: Record<string, string[]>;
  /** Reserved for Google-account ownership once app authentication is enabled. */'''
new = '''  /** Per-page whole-section ordering. IDs are stable layout section IDs. */
  layoutOrder?: Record<string, string[]>;
  /** Admin overrides for stable navigation item IDs. BIXBO branding is not a navigation item. */
  navigation?: { items?: Record<string, { label?: string; hidden?: boolean; order?: number }> };
  /** Reserved for Google-account ownership once app authentication is enabled. */'''
if old not in text: raise SystemExit('AdminConfig navigation anchor missing')
path.write_text(text.replace(old, new))

# effectiveAdminConfig.ts deep merge navigation
path = Path('src/lib/effectiveAdminConfig.ts')
text = path.read_text()
old = '''    layoutOrder: {
      ...(globalConfig.layoutOrder ?? {}),
      ...(localConfig.layoutOrder ?? {}),
    },
  };
}'''
new = '''    layoutOrder: {
      ...(globalConfig.layoutOrder ?? {}),
      ...(localConfig.layoutOrder ?? {}),
    },
    navigation: globalConfig.navigation || localConfig.navigation ? {
      ...(globalConfig.navigation ?? {}),
      ...(localConfig.navigation ?? {}),
      items: {
        ...(globalConfig.navigation?.items ?? {}),
        ...(localConfig.navigation?.items ?? {}),
      },
    } : undefined,
  };
}'''
if old not in text: raise SystemExit('effectiveAdminConfig layout anchor missing')
path.write_text(text.replace(old, new))

# BottomNav.tsx
path = Path('src/components/BottomNav.tsx')
text = path.read_text()
text = text.replace('import type { ComponentType } from "react";\n', 'import { useEffect, useState, type ComponentType } from "react";\n')
text = text.replace('import { NavHomeIcon, NavOverviewIcon, NavCoupleIcon, NavNoteIcon, NavLogIcon, type IconProps } from "@/components/icons/BixboIcons";\n', 'import { NavHomeIcon, NavOverviewIcon, NavCoupleIcon, NavNoteIcon, NavLogIcon, type IconProps } from "@/components/icons/BixboIcons";\nimport { DEVICE_ADMIN_CONFIG_CHANGED } from "@/lib/deviceAdminConfig";\nimport { GLOBAL_ADMIN_CONFIG_CHANGED } from "@/lib/globalAdminConfig";\nimport { resolvedNavigation, type NavigationItemId } from "@/lib/navigationRegistry";\n')
start = text.index('type NavItem = {')
end = text.index('\n\nexport function BottomNav()', start)
text = text[:start] + '''const ICONS: Record<NavigationItemId, ComponentType<IconProps>> = {
  home: NavHomeIcon,
  overview: NavOverviewIcon,
  log: NavLogIcon,
  couple: NavCoupleIcon,
  notes: NavNoteIcon,
  healthProfile: NavHomeIcon,
};
''' + text[end:]
text = text.replace('''  const { t } = useI18n();

  const openLog = () => {''', '''  const { t } = useI18n();
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
  const items = resolvedNavigation("mobile");

  const openLog = () => {''')
old_return = '''      <ul className="mx-auto flex items-stretch justify-around gap-0.5 px-2 pt-2.5 pb-2.5 lg:max-w-3xl">

        {items.slice(0, 2).map(({ to, label, icon: Icon }) => {
          const active =
            to === "/insights"
              ? pathname.startsWith("/insights") || pathname.startsWith("/patterns")
              : to === "/"
                ? pathname === "/"
                : pathname.startsWith(to);
          return (
            <li key={to} className="flex-1">
              <Link
                to={to as never}
                className={`flex min-h-14 flex-col items-center justify-center gap-0 rounded-2xl px-1.5 py-1 text-[11.5px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={42} className={`shrink-0 drop-shadow-sm transition-transform ${active ? "scale-[1.04]" : ""}`} />
                <span className="mt-0.5 max-w-full truncate text-center leading-none">{t(label)}</span>
              </Link>
            </li>
          );
        })}

        <li className="flex-1">
          <button
            type="button"
            onClick={openLog}
            className="flex min-h-14 w-full -translate-y-1 flex-col items-center justify-center gap-0 rounded-2xl px-1.5 py-1 text-[11.5px] font-semibold text-primary transition-all hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t("nav.log")}
          >
            <NavLogIcon size={62} className="drop-shadow-lg transition-transform active:scale-95" />
            <span className="-mt-0.5 leading-none">{t("nav.log")}</span>
          </button>
        </li>

        {items.slice(2).map(({ to, label, icon: Icon }) => {
          const active = pathname.startsWith(to);
          return (
            <li key={to} className="flex-1">
              <Link
                to={to as never}
                className={`flex min-h-14 flex-col items-center justify-center gap-0 rounded-2xl px-1.5 py-1 text-[11.5px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={42} className={`shrink-0 drop-shadow-sm transition-transform ${active ? "scale-[1.04]" : ""}`} />
                <span className="mt-0.5 max-w-full truncate text-center leading-none">{t(label)}</span>
              </Link>
            </li>
          );
        })}
      </ul>'''
new_return = '''      <ul className="mx-auto flex items-stretch justify-around gap-0.5 px-2 pt-2.5 pb-2.5 lg:max-w-3xl">
        {items.map((item) => {
          const Icon = ICONS[item.id];
          const label = item.label ?? BIXBO_NAVIGATION.find((candidate) => candidate.id === item.id)?.label ?? item.id;
          if (item.action === "log") {
            return (
              <li key={item.id} className="flex-1">
                <button type="button" onClick={openLog} className="flex min-h-14 w-full -translate-y-1 flex-col items-center justify-center gap-0 rounded-2xl px-1.5 py-1 text-[11.5px] font-semibold text-primary transition-all hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={t(label)}>
                  <Icon size={62} className="drop-shadow-lg transition-transform active:scale-95" />
                  <span className="-mt-0.5 max-w-full truncate leading-none">{t(label)}</span>
                </button>
              </li>
            );
          }
          const to = item.to ?? "/";
          const active = item.id === "overview"
            ? pathname.startsWith("/insights") || pathname.startsWith("/patterns")
            : to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <li key={item.id} className="flex-1">
              <Link to={to as never} className={`flex min-h-14 flex-col items-center justify-center gap-0 rounded-2xl px-1.5 py-1 text-[11.5px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <Icon size={42} className={`shrink-0 drop-shadow-sm transition-transform ${active ? "scale-[1.04]" : ""}`} />
                <span className="mt-0.5 max-w-full truncate text-center leading-none">{t(label)}</span>
              </Link>
            </li>
          );
        })}
      </ul>'''
if old_return not in text: raise SystemExit('BottomNav return block missing')
text = text.replace(old_return, new_return)
text = text.replace('import { resolvedNavigation, type NavigationItemId } from "@/lib/navigationRegistry";', 'import { BIXBO_NAVIGATION, resolvedNavigation, type NavigationItemId } from "@/lib/navigationRegistry";')
path.write_text(text)

# SideNav.tsx replace with registry-driven rendering while preserving classes/default layout
path = Path('src/components/SideNav.tsx')
text = path.read_text()
text = text.replace('import { useEffect, useRef, useState, type ReactNode } from "react";' if False else 'import type { ComponentType } from "react";', 'import { useEffect, useState, type ComponentType } from "react";')
text = text.replace('import { useI18n } from "@/hooks/useI18n";\n', 'import { useI18n } from "@/hooks/useI18n";\nimport { DEVICE_ADMIN_CONFIG_CHANGED } from "@/lib/deviceAdminConfig";\nimport { GLOBAL_ADMIN_CONFIG_CHANGED } from "@/lib/globalAdminConfig";\nimport { BIXBO_NAVIGATION, resolvedNavigation, type NavigationItemId } from "@/lib/navigationRegistry";\n')
start = text.index('const main = [')
end = text.index('\n\n/** Desktop-only', start)
text = text[:start] + '''const ICONS: Record<NavigationItemId, ComponentType<IconProps>> = {
  home: NavHomeIcon,
  overview: NavOverviewIcon,
  log: NavLogIcon,
  couple: NavCoupleIcon,
  notes: NavNoteIcon,
  healthProfile: User,
};
''' + text[end:]
text = text.replace('''  const { t } = useI18n();

  const openLog = () => {''', '''  const { t } = useI18n();
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

  const openLog = () => {''')
# replace item helper and return nav area using conservative string slices
item_start = text.index('  const item = (to: string, labelKey: string, Icon: ComponentType<IconProps>) => (')
item_end = text.index('\n\n  return (', item_start)
text = text[:item_start] + text[item_end:]
old_nav = '''      <button
        type="button"
        onClick={openLog}
        className="mb-5 flex min-h-[68px] items-center justify-center gap-2.5 rounded-2xl bg-tint px-4 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-border/70 transition hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <NavLogIcon size={50} className="-my-3 shrink-0 drop-shadow-lg" /> <span>{t("nav.log")}</span>
      </button>

      <nav className="min-h-0 flex-1 overflow-y-auto">
        <ul className="flex flex-col gap-1">{main.map((i) => item(i.to, i.labelKey, i.icon))}</ul>
        <div className="my-4 border-t border-border/70" />
        <ul className="flex flex-col gap-1">{secondary.map((i) => item(i.to, i.labelKey, i.icon))}</ul>
      </nav>'''
new_nav = '''      <nav className="min-h-0 flex-1 overflow-y-auto">
        <ul className="flex flex-col gap-1">
          {navItems.map((navItem) => {
            const Icon = ICONS[navItem.id];
            const label = navItem.label ?? BIXBO_NAVIGATION.find((candidate) => candidate.id === navItem.id)?.label ?? navItem.id;
            if (navItem.action === "log") {
              return (
                <li key={navItem.id}>
                  <button type="button" onClick={openLog} className="mb-4 flex min-h-[68px] w-full items-center justify-center gap-2.5 rounded-2xl bg-tint px-4 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-border/70 transition hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <Icon size={50} className="-my-3 shrink-0 drop-shadow-lg" /> <span>{t(label)}</span>
                  </button>
                </li>
              );
            }
            const to = navItem.to ?? "/";
            return (
              <li key={navItem.id}>
                <Link to={to as never} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors ${isActive(to) ? "bg-tint text-primary shadow-sm" : "text-muted-foreground hover:bg-surface-elevated hover:text-foreground"}`}>
                  <Icon size={40} className={`shrink-0 drop-shadow-sm transition-transform ${isActive(to) ? "scale-[1.04]" : ""}`} />
                  <span className="truncate">{t(label)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>'''
if old_nav not in text: raise SystemExit('SideNav nav block missing')
text = text.replace(old_nav, new_nav)
path.write_text(text)

# Root mount NavigationAdminEditor
path = Path('src/routes/__root.tsx')
text = path.read_text()
import_anchor = 'import { UniversalAdminPageEditor } from "../components/UniversalAdminPageEditor";\n'
if import_anchor not in text: raise SystemExit('root universal import missing')
text = text.replace(import_anchor, import_anchor + 'import { NavigationAdminEditor } from "../components/NavigationAdminEditor";\n')
mount_anchor = '      <UniversalAdminPageEditor />\n'
if mount_anchor not in text: raise SystemExit('root universal mount missing')
text = text.replace(mount_anchor, mount_anchor + '      <NavigationAdminEditor />\n')
path.write_text(text)
