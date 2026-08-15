import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = path.resolve("src");
const EMOJI_RE = /(\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*)/u;
const ICON_IMPL = /\/components\/icons\//;
const TEST_FILE = /\/__tests__\//;
const GENERATED = /routeTree\.gen\.ts$/;
const SAFE_ICON_ATTRS = new Set(["icon", "emoji", "e", "fallbackEmoji"]);

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return files(full);
    return /\.(tsx?|jsx?)$/.test(entry.name) ? [full] : [];
  });
}

function pos(source, node) {
  const p = source.getLineAndCharacterOfPosition(node.getStart(source));
  return `${path.relative(process.cwd(), source.fileName)}:${p.line + 1}:${p.character + 1}`;
}

function textOf(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isJsxText(node)) return node.text;
  return node.getText();
}

const direct = [];
const suspicious = [];
const identifiers = [];

for (const file of files(ROOT)) {
  const normalized = file.replace(/\\/g, "/");
  if (ICON_IMPL.test(normalized) || TEST_FILE.test(normalized) || GENERATED.test(normalized)) continue;
  const code = fs.readFileSync(file, "utf8");
  if (!EMOJI_RE.test(code)) continue;
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, kind);

  function walk(node) {
    let text = null;
    if (ts.isJsxText(node) || ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) text = textOf(node);
    if (text && EMOJI_RE.test(text)) {
      const parent = node.parent;
      const at = pos(source, node);
      const sample = text.trim().replace(/\s+/g, " ").slice(0, 140);

      if (ts.isJsxText(node)) {
        direct.push({ at, sample, reason: "raw JSX text" });
      } else if (ts.isJsxExpression(parent)) {
        direct.push({ at, sample, reason: "raw JSX child expression" });
      } else if (ts.isJsxAttribute(parent)) {
        const attr = parent.name.getText(source);
        const tag = ts.isJsxOpeningElement(parent.parent) || ts.isJsxSelfClosingElement(parent.parent)
          ? parent.parent.tagName.getText(source)
          : "?";
        if (SAFE_ICON_ATTRS.has(attr)) identifiers.push({ at, sample, reason: `${tag}.${attr} icon identifier` });
        else suspicious.push({ at, sample, reason: `${tag}.${attr} attribute` });
      } else if (ts.isPropertyAssignment(parent)) {
        const key = parent.name.getText(source).replace(/["']/g, "");
        if (SAFE_ICON_ATTRS.has(key)) identifiers.push({ at, sample, reason: `object.${key} icon identifier` });
        else suspicious.push({ at, sample, reason: `object.${key} data/string` });
      } else {
        suspicious.push({ at, sample, reason: ts.SyntaxKind[parent?.kind] ?? "string literal" });
      }
    }
    ts.forEachChild(node, walk);
  }
  walk(source);
}

function print(title, rows) {
  console.log(`\n=== ${title} (${rows.length}) ===`);
  for (const row of rows) console.log(`${row.at} | ${row.reason} | ${row.sample}`);
}

console.log("BIXBO full-project Unicode emoji audit");
console.log("Icon implementation files, generated route tree and tests are excluded from UI findings.");
print("DIRECT UI EMOJI — migrate to BixboIcon/BixboSafeText", direct);
print("SUSPICIOUS EMOJI STRINGS — inspect whether rendered", suspicious);
print("ALLOWED ICON/DATA IDENTIFIERS", identifiers);
console.log(`\nSUMMARY direct=${direct.length} suspicious=${suspicious.length} identifiers=${identifiers.length}`);

// Audit mode intentionally reports without failing CI. Once the migration reaches zero
// direct UI findings this can be promoted to a hard guard.
process.exit(0);
