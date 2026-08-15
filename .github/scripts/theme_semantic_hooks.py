from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


hak_path = Path("src/components/home/BirthControlCard.tsx")
theme_path = Path("src/theme-system.css")
test_path = Path("src/lib/__tests__/ui-layout-architecture-regression.test.ts")

hak = hak_path.read_text()
theme = theme_path.read_text()
test = test_path.read_text()

hak = replace_once(
    hak,
    "  // HAK follows the same BIXBO SOFT OLIVE DARK palette defined at the end of styles.css.\n  // Light mode keeps the existing Moss Green palette exactly as before.",
    "  // HAK deliberately owns a local olive palette for its 3D pill/wheel design.\n  // Global light/dark surfaces must not recolour those health-specific controls.",
    "HAK palette ownership comment",
)
hak = replace_once(
    hak,
    '          <div\n            className="absolute inset-[16.5%] rounded-full"',
    '          <div\n            data-bixbo-hak-wheel-center="1"\n            className="absolute inset-[16.5%] rounded-full"',
    "HAK wheel center semantic hook",
)
hak_path.write_text(hak)

theme = replace_once(
    theme,
    ':root:not(.dark) [data-bixbo-hak-content="1"] .absolute.inset-\\[16\\.5\\%\\].rounded-full {',
    ':root:not(.dark) [data-bixbo-hak-wheel-center="1"] {',
    "HAK wheel center theme selector",
)

stale_suksuk = '''/* ŠukŠuk analytics card inside HAK uses the same off-white surface instead of
   the old moss-green fill; its chart bars, icon and green accents remain unchanged. */
:root:not(.dark) [data-bixbo-hak-content="1"] section.mt-4.rounded-3xl.p-4.pb-5 {
  background: #FBF7F3 !important;
  background-color: #FBF7F3 !important;
}

'''
theme = replace_once(theme, stale_suksuk, "", "stale ŠukŠuk DOM-shape override")
theme_path.write_text(theme)

needle = '    expect(runtimeTheme).toContain(\'const DARK_THEME_COLOR = "#171A14";\');\n'
addition = '''    const hak = readFileSync("src/components/home/BirthControlCard.tsx", "utf8");
    expect(hak).toContain('data-bixbo-hak-wheel-center="1"');
    expect(theme).toContain('[data-bixbo-hak-wheel-center="1"]');
    expect(theme).not.toContain(".absolute.inset-");
    expect(theme).not.toContain("section.mt-4.rounded-3xl");
'''
test = replace_once(test, needle, needle + addition, "theme semantic hook assertions")
test_path.write_text(test)

Path(".github/workflows/theme-semantic-hooks.yml").unlink(missing_ok=True)
Path(".github/scripts/theme_semantic_hooks.py").unlink(missing_ok=True)
