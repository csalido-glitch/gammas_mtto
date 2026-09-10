// Gamas MRT – Service Worker v9
const CACHE = 'gamas-mrt-v9';
const ASSETS = ['./', './index.html'];

const RELOAD_SCRIPT = `<script id="_gamas_sw_v9">
(function(){
  if(!navigator.serviceWorker||window._gamasSWReload)return;
  window._gamasSWReload=true;
  var _r=false;
  function _reload(){if(!_r){_r=true;setTimeout(function(){location.reload();},200);}}
  navigator.serviceWorker.addEventListener('controllerchange',_reload);
  navigator.serviceWorker.addEventListener('message',function(e){
    if(e.data&&(e.data.type==='RELOAD'||e.data.type==='SW_UPDATED'))_reload();
  });
})();
<\/script>`;

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({type:'window',includeUncontrolled:true}))
      .then(clients => {
        clients.forEach(c => { try{ c.postMessage({type:'RELOAD'}); }catch(_){} });
        return Promise.all(clients.map(c => { try{ return c.navigate(c.url); }catch(_){ return Promise.resolve(); } }));
      })
  );
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // Network-first para index.html con cache-buster para romper CDN de GitHub
  if (e.request.url.endsWith('/') || e.request.url.includes('index.html')) {
    e.respondWith((async () => {
      try {
        // Cambiar cada 2 min → CDN nunca puede cachear más de 2 min
        const bust = Math.floor(Date.now() / 120000);
        const bustUrl = new URL(e.request.url);
        bustUrl.searchParams.set('_v', bust);
        const res = await fetch(bustUrl.toString(), {cache:'no-cache'});
        if (res && res.status === 200) {
          let text = await res.text();
          if (!text.includes('_gamas_sw_v8')) {
            text = text.replace('</head>', RELOAD_SCRIPT + '</head>');
          }
          const modified = new Response(text, {
            status: 200,
            headers: {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}
          });
          caches.open(CACHE).then(c => c.put(e.request, modified.clone()));
          return modified;
        }
      } catch(_) {}
      // Fallback a caché
      const cached = await caches.match(e.request);
      return cached || fetch(e.request);
    })());
    return;
  }

  // Cache-first para el resto
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
