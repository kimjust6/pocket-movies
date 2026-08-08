const CACHE_NAME = 'movie-posters-v3';

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Only intercept GET requests for TMDB movie posters and backdrops
    if (request.method !== 'GET') return;
    if (!url.hostname.includes('image.tmdb.org')) return;

    event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
            const cachedResponse = await cache.match(request);
            if (cachedResponse) {
                return cachedResponse;
            }

            try {
                const networkResponse = await fetch(request);
                if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                    await cache.put(request, networkResponse.clone());
                }
                return networkResponse;
            } catch (error) {
                if (cachedResponse) return cachedResponse;
                throw error;
            }
        })
    );
});
