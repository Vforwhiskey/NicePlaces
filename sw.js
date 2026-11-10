const PREFIX='niceplaces-'+new URL(self.registration.scope).pathname+'-',CACHE=PREFIX+'v3';
const FILES=['./','./index.html','./style.css','./app.js','./leaflet.css','./leaflet.js','./map-engine.js','./map-data.js','./icon.svg','./manifest.webmanifest','./public-places.json'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||!e.request.url.startsWith(self.registration.scope))return;e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request)));});
