/*
 * Offline support for the installed web app.
 * - Pages: network first, so a new deploy is picked up; cached copy when offline.
 * - Hashed build assets (/_expo/, /assets/): cache first; their names change when their content does.
 * User data is not handled here; it lives in the browser's localStorage.
 * Bump CACHE to drop everything cached by an older version.
 */
const CACHE = 'daily-habit-tracker-v1';
const ROUTES = ['./', 'habits', 'insights', 'settings', 'habit', 'habit-form', 'onboarding'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => Promise.all(ROUTES.map((route) => cache.add(route).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// The page that installs the worker already loaded its assets; it sends their URLs so the
// very first visit is enough to work offline.
self.addEventListener('message', (event) => {
  if (event.data && Array.isArray(event.data.cache)) {
    event.waitUntil(
      caches.open(CACHE).then((cache) =>
        Promise.all(
          event.data.cache
            .filter((url) => typeof url === 'string' && url.startsWith(self.location.origin))
            .map((url) => cache.add(url).catch(() => {})),
        ),
      ),
    );
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  const store = (response) => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(request, copy));
    }
    return response;
  };

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(store)
        .catch(() =>
          caches
            .match(request, { ignoreSearch: true })
            .then((hit) => hit || caches.match(self.registration.scope)),
        ),
    );
    return;
  }

  event.respondWith(caches.match(request).then((hit) => hit || fetch(request).then(store)));
});
