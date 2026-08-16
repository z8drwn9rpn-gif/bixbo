import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const roots = ["package.json", "bun.lock", "vite.config.ts", "src", "supabase/functions", "wrangler.jsonc"];
const ignored = ["src/lib/__tests__"];
const banned = [
  ["@lovable", ".dev"].join(""),
  ["bixbo", ".lovable.app"].join(""),
  ["zvpfzfof", "halmwrtipcsp"].join(""),
];

const failures = [];
if (existsSync(join(root, ".lovable"))) failures.push(".lovable directory still exists");

function visit(path) {
  const rel = relative(root, path).replaceAll("\\", "/");
  if (ignored.some((prefix) => rel.startsWith(prefix))) return;
  const stat = statSync(path);
  if (stat.isDirectory()) {
    for (const name of readdirSync(path)) visit(join(path, name));
    return;
  }
  if (!/\.(?:[cm]?[jt]sx?|json|jsonc|toml|lock)$/.test(path) && !path.endsWith("package.json")) return;
  const text = readFileSync(path, "utf8");
  for (const needle of banned) {
    if (text.includes(needle)) failures.push(`${rel}: contains retired dependency/reference ${needle}`);
  }
}

for (const entry of roots) {
  const path = join(root, entry);
  if (existsSync(path)) visit(path);
}

if (failures.length) {
  console.error("BIXBO independence audit failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}
console.log("BIXBO independence audit passed: no active Lovable dependency/reference found.");
