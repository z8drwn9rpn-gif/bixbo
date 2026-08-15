from pathlib import Path
import re


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


def parse_vars(block: str) -> list[tuple[str, str]]:
    values: list[tuple[str, str]] = []
    for match in re.finditer(r"^\s*(--[A-Za-z0-9_-]+):\s*(.+);\s*$", block, re.MULTILINE):
        values.append((match.group(1), match.group(2)))
    return values


def render_vars(selector: str, values: list[tuple[str, str]], heading: str) -> str:
    body = "\n".join(f"  {name}: {value};" for name, value in values)
    return f"/* {heading} */\n{selector} {{\n{body}\n}}"


styles_path = Path("src/styles.css")
light_path = Path("src/white-green-theme.css")
dark_path = Path("src/dark-theme.css")
root_path = Path("src/routes/__root.tsx")
test_path = Path("src/lib/__tests__/ui-layout-architecture-regression.test.ts")

styles = styles_path.read_text()
light = light_path.read_text().strip()
dark = dark_path.read_text().strip()
root = root_path.read_text()
test = test_path.read_text()

# styles.css still carried two obsolete Moss/Soft-Olive token palettes that were
# immediately overridden by the later light/dark theme stylesheets. Extract the
# theme-only semantic/health tokens, then leave styles.css structural only.
token_pattern = re.compile(
    r"\n:root \{\n(?P<root>\s*--radius: 1rem;.*?\n)\}\n\n"
    r"\.dark \{\n(?P<dark>.*?)\n\}\n\n@utility tap-target",
    re.DOTALL,
)
match = token_pattern.search(styles)
if not match:
    raise SystemExit("theme token blocks not found in styles.css")

root_vars = parse_vars(match.group("root"))
dark_vars = parse_vars(match.group("dark"))
light_defined = {name for name, _ in parse_vars(light)}
dark_defined = {name for name, _ in parse_vars(dark)}

light_semantics = [
    (name, value)
    for name, value in root_vars
    if name != "--radius" and name not in light_defined
]
dark_semantics = [
    (name, value)
    for name, value in dark_vars
    if name not in dark_defined
]

required_semantics = {
    "--destructive",
    "--destructive-foreground",
    "--success",
    "--warning",
    "--info",
    "--period-spotting",
    "--period-veryheavy",
    "--pain-0",
    "--pain-10",
    "--today",
    "--predicted",
}
if not required_semantics.issubset({name for name, _ in light_semantics}):
    missing = sorted(required_semantics - {name for name, _ in light_semantics})
    raise SystemExit(f"missing light semantic variables: {missing}")
if not required_semantics.issubset({name for name, _ in dark_semantics}):
    missing = sorted(required_semantics - {name for name, _ in dark_semantics})
    raise SystemExit(f"missing dark semantic variables: {missing}")

replacement = "\n:root {\n  --radius: 1rem;\n}\n\n@utility tap-target"
styles = styles[: match.start()] + replacement + styles[match.end() :]

# One ordered theme stylesheet now owns every colour token and theme-specific
# surface override. Exact existing values are preserved; this is an architecture
# change, not a redesign.
theme_system = "\n\n".join(
    [
        "/* BIXBO theme system — canonical light/dark palette and semantic health colours.\n"
        "   styles.css owns structure; this file owns theme values and theme-specific surfaces.\n"
        "   Health semantics (pain, period, status) remain explicit so neutral UI changes cannot\n"
        "   accidentally recolour logged health information. */",
        render_vars(":root", light_semantics, "Light semantic and health tokens"),
        "/* ========================= Light UI ========================= */\n" + light,
        render_vars(".dark", dark_semantics, "Dark semantic and health tokens"),
        "/* ========================= Dark UI ========================== */\n" + dark,
    ]
) + "\n"
Path("src/theme-system.css").write_text(theme_system)
styles_path.write_text(styles)

root = replace_once(
    root,
    'import whiteGreenThemeCss from "../white-green-theme.css?url";\nimport darkThemeCss from "../dark-theme.css?url";',
    'import themeSystemCss from "../theme-system.css?url";',
    "theme imports",
)
root = replace_once(
    root,
    '      { rel: "stylesheet", href: whiteGreenThemeCss },\n      { rel: "stylesheet", href: darkThemeCss },',
    '      { rel: "stylesheet", href: themeSystemCss },',
    "theme stylesheet links",
)
root_path.write_text(root)

insertion = '''

  it("keeps light and dark colour ownership in one canonical theme system", () => {
    const styles = readFileSync("src/styles.css", "utf8");
    const theme = readFileSync("src/theme-system.css", "utf8");
    const root = readFileSync("src/routes/__root.tsx", "utf8");
    const runtimeTheme = readFileSync("src/lib/theme.ts", "utf8");

    expect(styles).not.toContain("Final BIXBO Moss Green light palette");
    expect(styles).not.toContain("Final BIXBO Soft Olive dark palette");
    expect(theme).toContain(":root:not(.dark)");
    expect(theme).toContain("--background: #FBF7F3;");
    expect(theme).toContain("--background: #171A14;");
    expect(theme).toContain("--destructive:");
    expect(theme).toContain("--period-veryheavy:");
    expect(theme).toContain("--pain-10: #c81746;");
    expect(root).toContain('import themeSystemCss from "../theme-system.css?url";');
    expect(root).not.toContain("white-green-theme.css");
    expect(root).not.toContain("dark-theme.css");
    expect(runtimeTheme).toContain('const LIGHT_THEME_COLOR = "#FBF7F3";');
    expect(runtimeTheme).toContain('const DARK_THEME_COLOR = "#171A14";');
  });
'''
close_index = test.rfind("\n});")
if close_index == -1:
    raise SystemExit("architecture test describe close not found")
test = test[:close_index] + insertion + test[close_index:]
test_path.write_text(test)

light_path.unlink()
dark_path.unlink()

# Temporary automation removes itself from the final branch diff.
Path(".github/workflows/theme-css-refactor.yml").unlink(missing_ok=True)
Path(".github/scripts/theme_css_refactor.py").unlink(missing_ok=True)
