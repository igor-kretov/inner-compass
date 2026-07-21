/*
 * Inner Compass service worker
 *
 * Deliberately small and dependency-free. Personal data lives in IndexedDB and
 * is never copied into these caches. Bump CACHE_VERSION whenever the shell or
 * caching rules change in a way that should invalidate existing entries.
 */

const CACHE_VERSION = "v2";
const CACHE_PREFIX = "inner-compass";
const SHELL_CACHE = `${CACHE_PREFIX}-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime-${CACHE_VERSION}`;

const APP_SHELL = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/inner-compass.svg",
  "/icons/inner-compass-192.png",
  "/icons/inner-compass-512.png",
  "/icons/inner-compass-maskable-512.png",
  "/apple-touch-icon.png",
];

const isCacheable = (response) =>
  response && response.ok && (response.type === "basic" || response.type === "cors");

const putSafely = async (cacheName, request, response) => {
  if (!isCacheable(response)) return;

  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response);
  } catch {
    // A full or unavailable cache must never break an otherwise valid request.
  }
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);

      // Cache entries independently so one unavailable file cannot prevent the
      // worker from installing. offline.html remains the final navigation fallback.
      await Promise.allSettled(
        APP_SHELL.map(async (url) => {
          const request = new Request(url, { cache: "reload" });
          const response = await fetch(request);
          if (isCacheable(response)) await cache.put(request, response);
        }),
      );
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const expectedCaches = new Set([SHELL_CACHE, RUNTIME_CACHE]);
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith(`${CACHE_PREFIX}-`) && !expectedCaches.has(name))
          .map((name) => caches.delete(name)),
      );

      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }

      await self.clients.claim();
    })(),
  );
});

const handleNavigation = async (request, preloadResponsePromise) => {
  try {
    const preloadResponse = await preloadResponsePromise;
    if (preloadResponse) {
      await putSafely(RUNTIME_CACHE, request, preloadResponse.clone());
      return preloadResponse;
    }

    const networkResponse = await fetch(request);
    await putSafely(RUNTIME_CACHE, request, networkResponse.clone());
    return networkResponse;
  } catch {
    return (
      (await caches.match(request, { ignoreSearch: true })) ||
      (await caches.match("/")) ||
      (await caches.match("/offline.html")) ||
      Response.error()
    );
  }
};

const handleStaticAsset = async (request) => {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    await putSafely(RUNTIME_CACHE, request, response.clone());
    return response;
  } catch {
    return Response.error();
  }
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request, event.preloadResponse));
    return;
  }

  const isNextStaticAsset = url.pathname.startsWith("/_next/static/");
  const isPublicStaticAsset = ["style", "script", "font", "image"].includes(request.destination);

  if (isNextStaticAsset || isPublicStaticAsset) {
    event.respondWith(handleStaticAsset(request));
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
