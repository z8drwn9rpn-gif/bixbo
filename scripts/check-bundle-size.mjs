import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const assetsDir = path.resolve(".output/public/assets");
const MAX_JS_CHUNK = 760_000;
const MAX_CSS_FILE = 190_000;
const MAX_TOTAL_JS = 2_900_000;

const files = await readdir(assetsDir);
let totalJs = 0;
const failures = [];

for (const name of files) {
  const full = path.join(assetsDir, name);
  const info = await stat(full);
  if (!info.isFile()) continue;

  if (name.endsWith(".js")) {
    totalJs += info.size;
    if (info.size > MAX_JS_CHUNK) failures.push(`${name}: ${info.size} B > ${MAX_JS_CHUNK} B JS chunk budget`);
  }
  if (name.endsWith(".css") && info.size > MAX_CSS_FILE) {
    failures.push(`${name}: ${info.size} B > ${MAX_CSS_FILE} B CSS budget`);
  }
}

if (totalJs > MAX_TOTAL_JS) failures.push(`total client JS: ${totalJs} B > ${MAX_TOTAL_JS} B budget`);

if (failures.length) {
  console.error("BIXBO bundle budget failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`BIXBO bundle budget passed (client JS ${totalJs} B).`);
