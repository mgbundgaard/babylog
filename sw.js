// Keeps the app itself on the phone so it opens instantly, also without a connection. Data still comes from the Sheet.
// The saved copy is shown straight away; a newer version is fetched in the background and used from the next open.
const CACHE = 'babylog-app';
const FILES = ['./', 'index.html', 'icon-180.png', 'icon-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
async function tell(msg) { (await self.clients.matchAll({ includeUncontrolled: true })).forEach(c => c.postMessage(msg)); }
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // the Sheet calls go straight to Google
  const page = e.request.mode === 'navigate' || /\/(index\.html)?$/.test(u.pathname);
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = page ? 'index.html' : e.request;
    const saved = await cache.match(key, { ignoreSearch: true });
    const copy = saved && saved.clone();   // the saved one is handed to the page, so compare against a copy
    const net = fetch(page ? new Request('index.html', { cache: 'no-store' }) : e.request).then(async r => {
      if (!r.ok) return r;
      if (page && copy) {
        const [a, b] = await Promise.all([copy.text(), r.clone().text()]);
        if (a !== b) { await cache.put(key, r.clone()); tell({ type: 'babylog-update' }); }
      } else await cache.put(key, r.clone());
      return r;
    }).catch(() => null);
    if (saved) { e.waitUntil(net); return saved; }
    return (await net) || new Response('Offline', { status: 503 });
  })());
});
