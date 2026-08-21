/* BIXBO offline/runtime cache layer.
   Imported by bixbo-push-sw.js so one service worker owns scope "/" for both
   push actions and app-shell resilience. All app/navigation requests are
   network-first; cache is only a fallback when the network is unavailable. */

const BIXBO_RUNTIME_CACHE_PREFIX = "bixbo-runtime-";
const BIXBO_RUNTIME_CACHE = `${BIXBO_RUNTIME_CACHE_PREFIX}v3`;
const BIXBO_APP_SHELL = "/";
const BIXBO_FIXED_ASSETS = [
  "/manifest.json",
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-launch-bixbo.png",
  "/bixbo-mascot-user.png",
  "/bixbo-coffee-cup.svg",
  "/bixbo-vintage-coffee-cup.svg",
  "/bixbo-vintage-recipe-pot.svg",
];

function sameOriginUrl(value) {
  try {
    const url = new URL(value, self.location.origin);
    return url.origin === self.location.origin ? url : null;
  } catch {
    return null;
  }
}

function fixedAssetPath(pathname) {
  return BIXBO_FIXED_ASSETS.some((path) => pathname === path || pathname.startsWith(`${path}?`));
}

function runtimeAssetRequest(request, url) {
  if (["script", "style", "font", "worker"].includes(request.destination)) return true;
  if (request.destination === "manifest") return true;
  if (url.pathname.startsWith("/assets/")) return true;
  if (request.destination === "image" && fixedAssetPath(url.pathname)) return true;
  return BIXBO_FIXED_ASSETS.includes(url.pathname);
}

async function cacheResponse(cache, key, response) {
  if (!response || !response.ok || response.type === "opaque") return;
  try {
    await cache.put(key, response.clone());
  } catch {
    // Storage quota/restricted-cache failures must never block the live app.
  }
}

function shellAssetUrls(html) {
  const urls = new Set(BIXBO_FIXED_ASSETS);
  const pattern = /(?:src|href)=["']([^"']+)["']/g;
  for (const match of html.matchAll(pattern)) {
    const url = sameOriginUrl(match[1]);
    if (!url) continue;
    if (url.pathname.startsWith("/assets/") || BIXBO_FIXED_ASSETS.includes(url.pathname)) {
      urls.add(`${url.pathname}${url.search}`);
    }
  }
  return [...urls];
}

async function refreshFixedAssets(cache, html) {
  const assets = shellAssetUrls(html);
  await Promise.allSettled(assets.map(async (asset) => {
    const request = new Request(asset, { cache: "reload", credentials: "same-origin" });
    const response = await fetch(request);
    await cacheResponse(cache, request, response);
  }));
}

async function networkFirst(request) {
  const cache = await caches.open(BIXBO_RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    await cacheResponse(cache, request, response);
    return response;
  } catch {
    const cached = await cache.match(request, { ignoreSearch: false });
    if (cached) return cached;
    if (request.mode === "navigate") {
      const shell = await cache.match(BIXBO_APP_SHELL);
      if (shell) return shell;
    }
    throw new Error("BIXBO offline resource unavailable");
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(BIXBO_RUNTIME_CACHE);
    try {
      const response = await fetch(new Request(BIXBO_APP_SHELL, { cache: "reload", credentials: "same-origin" }));
      if (response.ok) {
        await cacheResponse(cache, BIXBO_APP_SHELL, response);
        await refreshFixedAssets(cache, await response.clone().text());
      }
    } catch {
      // First install may happen offline; runtime requests will populate later.
    }
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith(BIXBO_RUNTIME_CACHE_PREFIX) && name !== BIXBO_RUNTIME_CACHE)
      .map((name) => caches.delete(name)));
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = sameOriginUrl(request.url);
  if (!url) return;
  if (url.pathname.startsWith("/rest/") || url.pathname.startsWith("/auth/") || url.pathname.startsWith("/functions/")) return;
  if (request.mode === "navigate" || runtimeAssetRequest(request, url)) {
    event.respondWith(networkFirst(request));
  }
});
