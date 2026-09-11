// Gamas MRT – Service Worker v21 (fix: foto marcada 'subida' sin enlazar al ítem se perdía)
const CACHE = 'gamas-mrt-v21';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({type:'window',includeUncontrolled:true}))
      .then(clients => clients.forEach(c => { try{ c.postMessage({type:'RELOAD'}); }catch(_){} }))
  );
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// Network-first para TODO — siempre intenta red, cae a caché si offline
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith((async () => {
    try {
      const res = await fetch(e.request, {cache: 'no-cache'});
      if (res && res.status === 200) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    } catch(_) {
      const cached = await caches.match(e.request);
      return cached || new Response('Sin conexión', {status: 503});
    }
  })());
});
