import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

function resolveCommitSha() {
  const fromEnv = process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || process.env.BUILD_COMMIT_SHA;
  if (fromEnv) return fromEnv.trim();
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

const info = {
  app: "BIXBO",
  commit: resolveCommitSha(),
  generatedAt: new Date().toISOString(),
};

mkdirSync("public", { recursive: true });
writeFileSync("public/build-info.json", `${JSON.stringify(info, null, 2)}\n`, "utf8");
console.log(`BIXBO build info: ${info.commit}`);
