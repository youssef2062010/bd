// Cache only immutable build assets. Config, manifests and live APIs must be fresh.
const CACHE_NAME = 'phone-call-v5';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith('phone-call-') && key !== CACHE_NAME) {
          await caches.delete(key);
        }
      }
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'PURGE_CACHE') {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        if (event.ports?.[0]) {
          event.ports[0].postMessage({ status: 'purged' });
        }
      })()
    );
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // 1. Live API routes, manifests, and branding MUST ALWAYS be fetched fresh from network
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('manifest') ||
    url.searchParams.has('v') ||
    url.searchParams.has('_t')
  ) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  // 2. Navigation / HTML pages: Network-First with Offline Fallback
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(event.request, { cache: 'no-store' });
          if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          // Offline fallback: return cached navigation page
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(event.request);
          if (cached) return cached;
          const fallback = await cache.match('/fake-call-app/index.html');
          if (fallback) return fallback;
          throw err;
        }
      })()
    );
    return;
  }

  // 3. Immutable Vite Build Assets: Cache-First
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response.ok) await cache.put(event.request, response.clone());
        return response;
      })()
    );
    return;
  }
});
