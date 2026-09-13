
const CACHE='gamas-v40-infalible';
const CORE=['./','./index.html'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.url.includes('supabase.co')) return; // network only
  e.respondWith(
    caches.match(req).then(r=> r || fetch(req).then(net=>{
      if(req.method==='GET' && req.url.startsWith(self.location.origin)){
        const clone=net.clone();
        caches.open(CACHE).then(c=>c.put(req,clone));
      }
      return net;
    }).catch(()=> caches.match('./index.html')))
  );
});
