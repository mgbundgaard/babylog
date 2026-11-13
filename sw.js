// Keeps the app itself on the phone so it opens without a connection. Data still comes from the Sheet.
const CACHE = 'babylog-dial-20261113c';
const FILES = ['./', 'index.html', 'icon-180.png', 'icon-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // the Sheet calls go straight to Google
  // app page: use the network when it answers quickly (so updates arrive), otherwise the saved copy
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const saved = await cache.match(e.request, { ignoreSearch: true }) || (e.request.mode === 'navigate' ? await cache.match('index.html') : null);
    const net = fetch(e.request).then(r => { if (r.ok) cache.put(e.request, r.clone()); return r; }).catch(() => null);
    if (!saved) return (await net) || new Response('Offline', { status: 503 });
    const quick = await Promise.race([net, new Promise(r => setTimeout(() => r(null), 1500))]);
    return quick || saved;
  })());
});
