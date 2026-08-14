import { spawn } from "node:child_process";

const port = Number(process.env.BIXBO_SMOKE_PORT ?? 4179);
const host = "127.0.0.1";
const base = `http://${host}:${port}`;
const isWindows = process.platform === "win32";
const wranglerBin = isWindows ? "node_modules/.bin/wrangler.cmd" : "node_modules/.bin/wrangler";

// Production is a Cloudflare Worker. Exercise the actual built Worker module
// and static assets through Wrangler instead of TanStack's generic Vite preview,
// which expects a different dist/server layout.
const child = spawn(
  wranglerBin,
  ["dev", "--ip", host, "--port", String(port)],
  {
    env: { ...process.env, CI: process.env.CI ?? "true" },
    stdio: ["ignore", "pipe", "pipe"],
    detached: !isWindows,
  },
);

let output = "";
child.stdout.on("data", (chunk) => { output += chunk.toString(); });
child.stderr.on("data", (chunk) => { output += chunk.toString(); });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function stopWorker(signal = "SIGTERM") {
  try {
    if (!isWindows && child.pid) process.kill(-child.pid, signal);
    else child.kill(signal);
  } catch {
    // It may already have exited; cleanup must not turn a passing smoke into a failure.
  }
}

async function fetchWithTimeout(path, timeoutMs = 1500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${base}${path}`, { signal: controller.signal, redirect: "manual" });
  } finally {
    clearTimeout(timer);
  }
}

async function waitForServer() {
  let lastError;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (child.exitCode != null) throw new Error(`BIXBO Worker exited early (${child.exitCode}).\n${output}`);
    try {
      const response = await fetchWithTimeout("/");
      if (response.status < 500) return;
      lastError = new Error(`Root returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(250);
  }
  throw new Error(`BIXBO Worker did not become healthy: ${lastError}\n${output}`);
}

async function assertRoute(path, { exactStatus, contentIncludes } = {}) {
  const response = await fetchWithTimeout(path, 4000);
  if (exactStatus != null ? response.status !== exactStatus : response.status >= 500) {
    throw new Error(`${path} returned HTTP ${response.status}.\n${output}`);
  }
  const body = await response.text();
  if (body.includes('{"unhandled":true,"message":"HTTPError"}')) {
    throw new Error(`${path} returned the swallowed SSR error body.`);
  }
  if (contentIncludes && !body.includes(contentIncludes)) {
    throw new Error(`${path} did not contain expected content: ${contentIncludes}`);
  }
}

try {
  await waitForServer();
  await assertRoute("/");
  await assertRoute("/auth");
  await assertRoute("/profile");
  await assertRoute("/manifest.json", { exactStatus: 200, contentIncludes: '"name"' });
  await assertRoute("/bixbo-push-sw.js", { exactStatus: 200 });
  await assertRoute("/build-info.json", { exactStatus: 200, contentIncludes: '"app": "BIXBO"' });
  console.log("BIXBO production Worker smoke passed.");
} finally {
  stopWorker("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    sleep(2000),
  ]);
  if (child.exitCode == null) stopWorker("SIGKILL");
}
