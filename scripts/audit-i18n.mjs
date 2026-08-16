import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const scanRoots = ["src/components", "src/features", "src/routes"];
const allowed = new Set([
  "src/features/logging/TrText.tsx",
  "src/features/profile/shared.tsx",
  "src/features/insights/shared.tsx",
  "src/features/patterns/shared.tsx",
]);
const slovakChars = /[áäčďéíĺľňóôŕšťúýž]/i;
const failures = [];

function visit(path) {
  const rel = relative(root, path).replaceAll("\\", "/");
  const stat = statSync(path);
  if (stat.isDirectory()) {
    if (rel === "src/components/icons") return;
    for (const name of readdirSync(path)) visit(join(path, name));
    return;
  }
  if (!/\.tsx?$/.test(path) || allowed.has(rel)) return;
  const lines = readFileSync(path, "utf8").split("\n");
  lines.forEach((line, index) => {
    if (slovakChars.test(line)) failures.push(`${rel}:${index + 1}`);
  });
}

for (const entry of scanRoots) visit(join(root, entry));
if (failures.length) {
  console.error("English-source UI audit found Slovak literals outside translation adapters:\n" + failures.map((x) => `- ${x}`).join("\n"));
  process.exit(1);
}
console.log("English-source UI audit passed.");
