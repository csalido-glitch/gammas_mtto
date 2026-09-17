// Gamas MRT – Service Worker v46 (Roll: columna ÁREA oculta en celular para ver más días; resaltado en cruz al pasar el mouse en laptop)
const CACHE = 'gamas-mrt-v46';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== 'evidencias-cola-v1').map(k => caches.delete(k))))
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
  // Nunca interceptar/cachear llamadas a Supabase (REST/Storage) — que las maneje
  // directo la app (fetch normal), no tiene sentido cachearlas ni sirve para offline real
  if (e.request.url.includes('supabase.co')) return;
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
