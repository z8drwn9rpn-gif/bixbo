/* BIXBO offline/runtime cache layer.
   Imported by bixbo-push-sw.js so one service worker owns scope "/" for both
   push actions and app-shell resilience. All app/navigation requests are
   network-first; cache is only a fallback when the network is unavailable. */

const BIXBO_RUNTIME_CACHE_PREFIX = "bixbo-runtime-";
const BIXBO_RUNTIME_CACHE = `${BIXBO_RUNTIME_CACHE_PREFIX}v1`;
const BIXBO_APP_SHELL = "/";
const BIXBO_FIXED_ASSETS = [
  "/manifest.json",
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-launch-bixbo.png",
  "/bixbo-mascot-user.png",
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

async function precacheAppShell() {
  const cache = await caches.open(BIXBO_RUNTIME_CACHE);

  try {
    const response = await fetch(BIXBO_APP_SHELL, { cache: "reload", credentials: "same-origin" });
    if (response.ok) {
      const html = await response.clone().text();
      await cacheResponse(cache, BIXBO_APP_SHELL, response);

      await Promise.allSettled(
        shellAssetUrls(html).map(async (path) => {
          try {
            const assetResponse = await fetch(path, { cache: "reload", credentials: "same-origin" });
            await cacheResponse(cache, path, assetResponse);
          } catch {
            // A non-critical image/chunk must not fail service-worker install.
          }
        }),
      );
    }
  } catch {
    // Keep an already valid older runtime cache if install happens offline.
  }
}

async function cleanupOldRuntimeCaches() {
  const current = await caches.open(BIXBO_RUNTIME_CACHE);
  const hasCurrentShell = Boolean(await current.match(BIXBO_APP_SHELL));
  if (!hasCurrentShell) return;

  const names = await caches.keys();
  await Promise.all(
    names
      .filter((name) => name.startsWith(BIXBO_RUNTIME_CACHE_PREFIX) && name !== BIXBO_RUNTIME_CACHE)
      .map((name) => caches.delete(name)),
  );
}

function navigationCacheKey(url) {
  return `${url.origin}${url.pathname}`;
}

async function networkFirstNavigation(request, url) {
  const cache = await caches.open(BIXBO_RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && url.pathname !== "/auth") {
      await cacheResponse(cache, navigationCacheKey(url), response);
      if (url.pathname === "/") await cacheResponse(cache, BIXBO_APP_SHELL, response);
    }
    return response;
  } catch (error) {
    const exact = await caches.match(navigationCacheKey(url));
    if (exact) return exact;
    const shell = await caches.match(BIXBO_APP_SHELL);
    if (shell) return shell;
    throw error;
  }
}

async function networkFirstAsset(request) {
  const cache = await caches.open(BIXBO_RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    await cacheResponse(cache, request, response);
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheAppShell().catch(() => undefined));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(cleanupOldRuntimeCaches().catch(() => undefined));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (!request || request.method !== "GET") return;

  const url = sameOriginUrl(request.url);
  if (!url) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request, url));
    return;
  }

  if (runtimeAssetRequest(request, url)) {
    event.respondWith(networkFirstAsset(request));
  }
});
