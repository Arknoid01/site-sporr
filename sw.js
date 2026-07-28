const CACHE_NAME = 'sport-v11';
const LOCAL_ASSETS = [
  'index.html',
  'css/style.css',
  'css/variables.css',
  'css/components.css',
  'css/themes.css',
  'css/animations.css',
  'css/premium.css',
  'css/timer.css',
  'css/workout.css',
  'js/config.js',
  'js/storage.js',
  'js/sports.js',
  'js/stats.js',
  'js/analytics.js',
  'js/achievements.js',
  'js/effects.js',
  'js/charts.js',
  'js/calendar.js',
  'js/theme.js',
  'js/pwa.js',
  'js/timer.js',
  'js/exercise-catalog.js',
  'js/wger-catalog.js',
  'js/programs.js',
  'js/route-map.js',
  'js/program-player.js',
  'js/running.js',
  'js/workout-ui.js',
  'js/ui.js',
  'js/app.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        LOCAL_ASSETS.map(async (asset) => {
          const response = await fetch(asset);
          if (response.ok) {
            await cache.put(asset, response);
          }
        })
      );
      await self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && event.request.url.startsWith(self.location.origin)) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match('index.html'));
    })
  );
});
