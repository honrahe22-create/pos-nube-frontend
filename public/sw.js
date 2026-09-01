const CACHE_PREFIX = "pos-nube-pwa-";
const CACHE_VERSION = "v9";

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (String(key).indexOf(CACHE_PREFIX) === 0) return caches.delete(key);
          return Promise.resolve();
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// PWA online segura: no conserva index.html ni bundles antiguos de Vite.
self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request, { cache: "no-store" }).catch(function () {
      return Response.error();
    })
  );
});
