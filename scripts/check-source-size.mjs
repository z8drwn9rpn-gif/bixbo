import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("src");
const DEFAULT_LIMIT = 45_000;

// Existing high-churn modules are allowed a frozen ceiling while they are
// incrementally split. New modules must stay below the default. Notes are
// intentionally excluded from this audit pass and will get their own refactor.
const LEGACY_LIMITS = new Map([
  ["src/components/icons/BixboIcons.tsx", 75_000],
  ["src/components/home/DayOverview.tsx", 62_000],
  ["src/components/home/BirthControlCard.tsx", 53_000],
  ["src/features/logging/PainWizard.tsx", 53_000],
  ["src/features/patterns/usePatternsContentModel.tsx", 50_000],
  ["src/features/patterns/PatternsContentViewPart1.tsx", 50_000],
  ["src/components/QuickTags.tsx", 50_000],
]);

const EXCLUDED = new Set([
  "src/routeTree.gen.ts",
  "src/routes/notes.tsx",
  "src/routes/notes-editor.tsx",
]);

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(absolute);
  }
  return files;
}

const failures = [];
for (const absolute of await walk(root)) {
  const relative = path.relative(process.cwd(), absolute).replaceAll("\\", "/");
  if (EXCLUDED.has(relative)) continue;
  const bytes = (await stat(absolute)).size;
  const limit = LEGACY_LIMITS.get(relative) ?? DEFAULT_LIMIT;
  if (bytes > limit) failures.push({ relative, bytes, limit });
}

if (failures.length) {
  console.error("BIXBO source-size guard failed. Split the module instead of growing it further:");
  for (const { relative, bytes, limit } of failures) {
    console.error(`- ${relative}: ${bytes} bytes > ${limit} byte limit`);
  }
  process.exit(1);
}

console.log(`BIXBO source-size guard passed (default ${DEFAULT_LIMIT} bytes; legacy ceilings frozen).`);
