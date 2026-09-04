const CACHE='trilheiros-gps-v13.0.0';
const ASSETS=['./','index.html','app.css?v=10','app.js?v=10','v10.js?v=10','artfix-v10.js?v=13','v13-fix.js?v=13','logo-data.js?v=10','manifest.webmanifest?v=10','assets/icons/icon-192.png','assets/icons/icon-512.png','assets/icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.origin!==self.location.origin)return;e.respondWith(fetch(e.request).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return resp}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./'))))});
