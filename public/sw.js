const CACHE_PREFIX = "pos-nube-pwa-";
const CACHE_VERSION = "v8";

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (String(key).indexOf(CACHE_PREFIX) === 0) {
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// PWA online segura:
// el Service Worker existe para instalación/standalone,
// pero NO cachea index.html ni bundles JS/CSS de Vite.
// Así cada deploy de Render usa siempre los archivos actuales.
self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request).catch(function () {
      return Response.error();
    })
  );
});
