/* Service Worker: App offline nutzbar machen.
   Eigene Dateien: erst Netz (damit Updates ankommen), sonst Zwischenspeicher.
   Bibliotheken von CDN (QR, PDF) und Schriften: nach dem ersten Laden aus dem Zwischenspeicher. */
const VERSION='v4';
const CACHE='geraete-'+VERSION;
const SHELL=['./','index.html','app.js','local-db.js','seed.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('geraete-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  const own=url.origin===location.origin;
  const cdn=/(^|\.)(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname);
  if(!own&&!cdn)return;
  if(own){
    e.respondWith(fetch(req).then(r=>{
      if(r&&r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(req,copy));}
      return r;
    }).catch(()=>caches.match(req,{ignoreSearch:true}).then(m=>m||caches.match('index.html'))));
  }else{
    e.respondWith(caches.match(req).then(m=>m||fetch(req).then(r=>{
      if(r&&(r.ok||r.type==='opaque')){const copy=r.clone();caches.open(CACHE).then(c=>c.put(req,copy));}
      return r;
    })));
  }
});
