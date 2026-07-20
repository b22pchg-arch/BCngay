/* SCADA Report Studio PWA service worker */
const APP_VERSION = 'V152-PWA-1.2.0';
const CACHE_NAME = 'scada-report-v152-pwa-1.2.0';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './pwa-bootstrap.js?v=1.2.0',
  './version.json',
  './CAP_NHAT_PWA.html',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png'
];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_ASSETS);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('scada-report-') && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request, {cache: 'no-store'});
    if (response && response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    return (await cache.match(request)) || (fallbackUrl ? await cache.match(fallbackUrl) : Response.error());
  }
}
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) await cache.put(request, response.clone());
  return response;
}
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, './index.html'));
    return;
  }
  const pathname = url.pathname.toLowerCase();
  if (pathname.endsWith('/index.html') || pathname.endsWith('/pwa-bootstrap.js') || pathname.endsWith('/version.json') || pathname.endsWith('/manifest.webmanifest') || pathname.endsWith('/cap_nhat_pwa.html')) {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(cacheFirst(request));
  }
});
self.addEventListener('message', event => {
  const type = event.data && event.data.type;
  if (type === 'SKIP_WAITING') self.skipWaiting();
  if (type === 'CLEAR_PWA_CACHE') {
    event.waitUntil((async () => {
      const names = await caches.keys();
      await Promise.all(names.filter(name => name.startsWith('scada-report-')).map(name => caches.delete(name)));
    })());
  }
  if (type === 'GET_VERSION' && event.source) event.source.postMessage({type: 'PWA_VERSION', version: APP_VERSION, cacheName: CACHE_NAME});
});
