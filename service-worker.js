/**
 * CAST — Progressive Web App Service Worker
 * Created By Shiv Yogi
 */

const CACHE_NAME = 'cast-platform-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/svg/icons.svg',
  './css/global.css',
  './css/liquid-glass.css',
  './css/desktop.css',
  './css/mobile.css',
  './css/players.css',
  './css/waterdrop.css',
  './js/app.js',
  './js/modules/icons.js',
  './js/modules/settings.js',
  './js/modules/pairing.js',
  './js/modules/webrtc.js',
  './js/modules/media-transfer.js',
  './js/modules/movie-player.js',
  './js/modules/music-player.js',
  './js/modules/audio-visualizer.js',
  './js/modules/image-viewer.js',
  './js/modules/pdf-reader.js',
  './js/modules/waterdrop.js',
  './js/modules/no-signal.js',
  './js/modules/qrcode.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('Pre-cache partial failure:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Pass-through API and WebRTC/signaling calls
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
