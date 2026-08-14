import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("src");
const DEFAULT_LIMIT = 45_000;

// Legacy large modules are ratcheted to approximately their current size: they
// may shrink/split, but CI blocks meaningful growth back into monoliths. New
// modules stay below the default. Notes are intentionally excluded from this
// pass and will get their own dedicated refactor.
const LEGACY_LIMITS = new Map([
  ["src/components/icons/BixboIcons.tsx", 71_600],
  ["src/components/home/DayOverview.tsx", 60_700],
  ["src/components/home/BirthControlCard.tsx", 51_200],
  ["src/features/logging/PainWizard.tsx", 50_900],
  ["src/features/patterns/usePatternsContentModel.tsx", 47_550],
  ["src/features/patterns/PatternsContentViewPart1.tsx", 47_200],
  ["src/components/QuickTags.tsx", 46_600],
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

console.log(`BIXBO source-size guard passed (default ${DEFAULT_LIMIT} bytes; legacy ceilings ratcheted).`);
