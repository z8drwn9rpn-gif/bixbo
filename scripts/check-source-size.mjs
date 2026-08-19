import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("src");
const DEFAULT_LIMIT = 45_000;

// Existing high-churn modules are allowed a tightly frozen ceiling while they
// are incrementally split. New modules — including Notes routes — must stay
// below the default limit. These ceilings should only move downward over time.
const LEGACY_LIMITS = new Map([
  ["src/components/icons/BixboIcons.tsx", 72_000],
  ["src/components/home/DayOverview.tsx", 61_500],
  ["src/components/home/BirthControlCard.tsx", 51_500],
  ["src/features/logging/PainWizard.tsx", 51_000],
  ["src/features/patterns/usePatternsContentModel.tsx", 47_500],
  ["src/features/patterns/PatternsContentViewPart1.tsx", 47_500],
  ["src/components/QuickTags.tsx", 47_500],
  ["src/features/logging/LogSheetRoot.tsx", 46_311],
]);

// Generated route output is intentionally excluded because it is rewritten by
// TanStack Router. Hand-authored application code must always stay guarded.
const EXCLUDED = new Set(["src/routeTree.gen.ts"]);

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
