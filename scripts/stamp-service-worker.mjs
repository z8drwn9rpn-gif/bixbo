import { readFileSync, writeFileSync } from "node:fs";

const target = ".output/public/bixbo-push-sw.js";
const placeholder = "__BIXBO_DEPLOY_SHA__";
const releaseId = String(process.env.DEPLOY_SHA || process.env.GITHUB_SHA || "").trim();

if (!releaseId) {
  console.log("BIXBO service-worker stamp skipped: no release SHA in this build environment.");
  process.exit(0);
}

if (!/^[a-f0-9]{40}$/i.test(releaseId)) {
  throw new Error(`Invalid BIXBO release SHA: ${releaseId}`);
}

const source = readFileSync(target, "utf8");
if (!source.includes(placeholder)) {
  throw new Error(`BIXBO service-worker placeholder missing from ${target}.`);
}

writeFileSync(target, source.replaceAll(placeholder, releaseId), "utf8");
const stamped = readFileSync(target, "utf8");
if (!stamped.includes(releaseId) || stamped.includes(placeholder)) {
  throw new Error("BIXBO service-worker release stamp verification failed.");
}

console.log(`BIXBO service worker stamped for ${releaseId}.`);
