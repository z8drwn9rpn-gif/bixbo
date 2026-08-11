from pathlib import Path

# BottomNav: force user artwork for Home/Couple with cache-busted URLs and no SVG fallback.
p = Path('src/components/BottomNav.tsx')
s = p.read_text()
s = s.replace('home: "/nav-assets/nav-home.webp",', 'home: "/nav-assets/nav-home.webp?v=user-exact-20260811-2",')
s = s.replace('couple: "/nav-assets/nav-couple.webp",', 'couple: "/nav-assets/nav-couple.webp?v=user-exact-20260811-2",')
old = '''  const [imageFailed, setImageFailed] = useState(false);\n\n  // Never show Safari's broken-image placeholder. If a deployed PWA still has\n  // an older asset cache, fall back to the bundled BIXBO SVG immediately.\n  if (imageSrc && !imageFailed) {\n    return (\n      <img\n        src={imageSrc}\n        alt=""\n        aria-hidden="true"\n        draggable={false}\n        width={size}\n        height={size}\n        className={className}\n        style={{ objectFit: "contain" }}\n        onError={() => setImageFailed(true)}\n      />\n    );\n  }\n\n  return <Icon size={size} className={className} />;'''
new = '''  const isExactUserArtwork = id === "home" || id === "couple";\n\n  if (imageSrc) {\n    return (\n      <img\n        src={imageSrc}\n        alt=""\n        aria-hidden="true"\n        draggable={false}\n        width={size}\n        height={size}\n        className={className}\n        style={{ objectFit: "contain" }}\n        onError={(event) => {\n          // Home and Couple must never fall back to the old SVG artwork.\n          // If an old PWA cache is stale, keep the slot empty until the exact\n          // user asset is fetched instead of showing the wrong icon.\n          if (isExactUserArtwork) event.currentTarget.style.visibility = "hidden";\n        }}\n      />\n    );\n  }\n\n  return <Icon size={size} className={className} />;'''
assert old in s, 'BottomNav artwork block not found'
s = s.replace(old, new, 1)
p.write_text(s)

# SideNav: same exact user artwork URLs; no old Home/Couple fallback path exists here.
p = Path('src/components/SideNav.tsx')
s = p.read_text()
s = s.replace('home: "/nav-assets/nav-home.webp",', 'home: "/nav-assets/nav-home.webp?v=user-exact-20260811-2",')
s = s.replace('couple: "/nav-assets/nav-couple.webp",', 'couple: "/nav-assets/nav-couple.webp?v=user-exact-20260811-2",')
p.write_text(s)

# Profile: make the intended order explicit — Health Hub first, Preferences second.
p = Path('src/routes/profile.tsx')
s = p.read_text()
needle = '''        <section className="overflow-hidden rounded-3xl bg-surface shadow-sm ring-1 ring-border/80">\n          <HubRow\n            icon={<StethoscopeIcon size={23} />}\n            title="Health Summary"'''
replacement = '''        <div>\n          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">\n            {t("Health Hub")}\n          </p>\n          <section className="overflow-hidden rounded-3xl bg-surface shadow-sm ring-1 ring-border/80">\n          <HubRow\n            icon={<StethoscopeIcon size={23} />}\n            title="Health Summary"'''
assert needle in s, 'Health Hub list start not found'
s = s.replace(needle, replacement, 1)
needle2 = '''          <HubRow\n            icon={<NoteIcon size={22} />}\n            title="Export"\n            subtitle="Export health data as JSON or CSV"\n            onClick={() => onOpen("export")}\n          />\n        </section>\n\n        <div>\n          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">\n            {t("Preferences")}'''
replacement2 = '''          <HubRow\n            icon={<NoteIcon size={22} />}\n            title="Export"\n            subtitle="Export health data as JSON or CSV"\n            onClick={() => onOpen("export")}\n          />\n          </section>\n        </div>\n\n        <div>\n          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">\n            {t("Preferences")}'''
assert needle2 in s, 'Health Hub list end / Preferences start not found'
s = s.replace(needle2, replacement2, 1)
p.write_text(s)

print('exact Home/Couple nav artwork forced; Health Hub shown before Preferences')
