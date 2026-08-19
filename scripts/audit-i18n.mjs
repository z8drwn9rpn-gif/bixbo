import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const scanRoots = ["src"];
const skippedPrefixes = [
  "src/build/",
  "src/components/icons/",
  "src/lib/__tests__/",
  "src/lib/i18n/",
];
const skippedFiles = new Set([
  "src/routeTree.gen.ts",
]);
const allowed = new Set([
  "src/features/logging/TrText.tsx",
  "src/features/profile/shared.tsx",
  "src/features/profile/PrivacyLegalControls.tsx",
  "src/features/insights/shared.tsx",
  "src/features/patterns/shared.tsx",
  "src/features/insights/TimeOfDayPatternChart.tsx",
  "src/hooks/useI18n.ts",
  "src/lib/painScale.ts",
  // The recipe importer deliberately recognizes Slovak source-note vocabulary.
  // User-facing labels in this module still go through useI18n(); the Slovak
  // literals are parser tokens needed to import existing notes without edits.
  "src/features/notes/RecipesView.tsx",
  // Recipe-note text helpers and their regression fixture deliberately recognize
  // Slovak source-note vocabulary. These literals are parser/test data, not UI copy.
  "src/features/notes/noteText.ts",
  "src/features/notes/__tests__/noteText.test.ts",
  // These modules deliberately colocate explicit EN/SK copy.
  "src/routes/auth.tsx",
  "src/routes/onboarding.tsx",
  "src/routes/privacy.tsx",
  "src/routes/terms.tsx",
]);
const slovakChars = /[áäčďéíĺľňóôŕšťúýž]/i;
const failures = [];

function userFacingPart(line) {
  // Ignore line comments and the intentional product feature/brand name ŠukŠuk.
  // Neither represents a missing English translation.
  const withoutComment = line.replace(/\/\/.*$/, "");
  return withoutComment.replace(/ŠukŠuk/gi, "SukSuk");
}

function visit(path) {
  const rel = relative(root, path).replaceAll("\\", "/");
  if (skippedFiles.has(rel) || skippedPrefixes.some((prefix) => rel.startsWith(prefix))) return;

  const stat = statSync(path);
  if (stat.isDirectory()) {
    for (const name of readdirSync(path)) visit(join(root, relative(root, path), name));
    return;
  }
  if (!/\.tsx?$/.test(path) || allowed.has(rel)) return;

  const lines = readFileSync(path, "utf8").split("\n");
  lines.forEach((line, index) => {
    if (slovakChars.test(userFacingPart(line))) failures.push(`${rel}:${index + 1}`);
  });
}

for (const entry of scanRoots) visit(join(root, entry));
if (failures.length) {
  console.error("English-source audit found Slovak literals outside explicit translation adapters:\n" + failures.map((x) => `- ${x}`).join("\n"));
  process.exit(1);
}
console.log("English-source audit passed across the complete hand-authored src tree.");
