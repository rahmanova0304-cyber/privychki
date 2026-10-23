// Офлайн: приложение целиком хранится в кэше телефона. При изменении файлов поднять VERSION.
// cache: 'reload' — мимо HTTP-кэша браузера (GitHub Pages отдаёт max-age=600, иначе в новую версию попадают старые файлы).
const VERSION = 'v86';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'css/app.css', 'js/app.js', 'js/store.js', 'js/screens.js', 'js/util.js', 'js/screens2.js', 'js/ai.js', 'js/print.js', 'vendor/anthropic-sdk-0.131.0.js', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
});
