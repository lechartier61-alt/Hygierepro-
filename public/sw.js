const CACHE='hygiesafe-v6.5.7-shell';
const ASSETS=['/app.html','/css/app.css','/css/main.css','/js/app.js','/js/api.js','/assets/logo-hygiesafe.png','/assets/icon-192.png','/assets/icon-512.png','/assets/hygiesafe-icons/home.png','/assets/hygiesafe-icons/profile.png','/assets/hygiesafe-icons/team.png','/assets/hygiesafe-icons/scanner.png','/assets/hygiesafe-icons/temperature.png','/assets/hygiesafe-icons/controls.png','/assets/hygiesafe-icons/schedule.png','/assets/hygiesafe-icons/inventory.png','/assets/hygiesafe-icons/orders.png','/assets/hygiesafe-icons/archive.png'];
const NEVER_CACHE=['/api/','/public-media/','/login','/register','/forgot','/reset','/invite','/verify-email','/admin'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const u=new URL(req.url);if(u.origin!==self.location.origin||NEVER_CACHE.some(p=>u.pathname.startsWith(p)))return;
  if(req.mode==='navigate'){
    if(u.pathname!=='/app.html'&&!u.pathname.startsWith('/app'))return;
    e.respondWith(fetch(req).catch(()=>caches.match('/app.html')));return;
  }
  const staticAsset=/\.(?:css|js|png|jpg|jpeg|webp|svg|woff2?)$/i.test(u.pathname);
  if(!staticAsset)return;
  e.respondWith(caches.match(req).then(cached=>{
    const fresh=fetch(req).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put(req,r.clone()));return r}).catch(()=>cached);
    return cached||fresh;
  }));
});
