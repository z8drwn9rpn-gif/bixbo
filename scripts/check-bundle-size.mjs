import { readdir, readFile, stat } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import path from "node:path";

const root = path.resolve(".output/public");
const MAX_SINGLE_RAW = 1_250_000;
const MAX_SINGLE_GZIP = 360_000;
const MAX_TOTAL_GZIP = 1_200_000;

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else if (entry.name.endsWith(".js")) files.push(absolute);
  }
  return files;
}

try {
  await stat(root);
} catch {
  console.error("BIXBO bundle budget requires a production build. Run `bun run build` first.");
  process.exit(1);
}

const rows = [];
for (const absolute of await walk(root)) {
  const contents = await readFile(absolute);
  rows.push({
    file: path.relative(process.cwd(), absolute).replaceAll("\\", "/"),
    raw: contents.length,
    gzip: gzipSync(contents, { level: 9 }).length,
  });
}

rows.sort((a, b) => b.gzip - a.gzip);
const totalGzip = rows.reduce((sum, row) => sum + row.gzip, 0);
const failures = [];

for (const row of rows) {
  if (row.raw > MAX_SINGLE_RAW) failures.push(`${row.file}: ${row.raw} raw bytes > ${MAX_SINGLE_RAW}`);
  if (row.gzip > MAX_SINGLE_GZIP) failures.push(`${row.file}: ${row.gzip} gzip bytes > ${MAX_SINGLE_GZIP}`);
}
if (totalGzip > MAX_TOTAL_GZIP) failures.push(`all client JS: ${totalGzip} gzip bytes > ${MAX_TOTAL_GZIP}`);

console.log("BIXBO client bundle budget");
for (const row of rows.slice(0, 8)) {
  console.log(`- ${row.file}: ${(row.raw / 1024).toFixed(1)} KiB raw / ${(row.gzip / 1024).toFixed(1)} KiB gzip`);
}
console.log(`Total client JS gzip: ${(totalGzip / 1024).toFixed(1)} KiB`);

if (failures.length) {
  console.error("Bundle budget failed. Split or lazy-load the growing client code before shipping:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("BIXBO bundle budget passed.");
