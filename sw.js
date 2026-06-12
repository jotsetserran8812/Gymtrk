// GYMTRK Service Worker — v2
const CACHE='gymtrk-v8';
const STATIC=['./manifest.json','./icon.svg'];

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)).catch(()=>{}));
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  // Nunca cachear API de Claude
  if(url.hostname==='api.anthropic.com')return;
  // HTML siempre desde la red (network-first) para que las actualizaciones lleguen
  const isHTML=e.request.mode==='navigate'||url.pathname.endsWith('.html')||url.pathname.endsWith('/');
  if(isHTML){
    e.respondWith(
      fetch(e.request).then(res=>{
        const clone=res.clone();
        caches.open(CACHE).then(c=>c.put(e.request,clone)).catch(()=>{});
        return res;
      }).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html')))
    );
    return;
  }
  // Resto de archivos: cache-first
  e.respondWith(
    caches.match(e.request).then(cached=>cached||fetch(e.request).then(res=>{
      if(res.ok&&(url.origin===self.location.origin||url.hostname.includes('googleapis.com')||url.hostname.includes('gstatic.com')||url.hostname.includes('unpkg.com'))){
        const clone=res.clone();
        caches.open(CACHE).then(c=>c.put(e.request,clone)).catch(()=>{});
      }
      return res;
    }))
  );
});
