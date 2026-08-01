// GibiGebeta Service Worker — App Shell Cache
// Caches the app shell and static assets so the scan page loads when offline.
// API calls are NEVER cached here — they are handled by the scan page itself.

const CACHE_NAME = "gibigabeta-shell-v1";

// Pages and assets to cache on install
const APP_SHELL = [
  "/",
  "/cafe/scan",
  "/cafe/dashboard",
  "/cafe/select-cafe-number",
  "/logo.png",
];

// ── Install: cache the app shell ─────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

// ── Activate: remove old caches ───────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ── Fetch: network-first for API, cache-first for app shell ──────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept API calls, POST requests, or cross-origin requests
  if (
    url.pathname.startsWith("/api") ||
    request.method !== "GET" ||
    url.origin !== self.location.origin
  ) {
    return; // let the browser handle it normally
  }

  // Next.js static files: cache-first (they are hashed so safe to cache forever)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          }),
      ),
    );
    return;
  }

  // App shell pages: network-first, fall back to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Update cache with fresh copy
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request)),
  );
});
