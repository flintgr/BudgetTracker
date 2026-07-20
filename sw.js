const CACHE_NAME = "budget-tracker-v1-1-5-history-delete-state-fix";
const APP_SHELL = [
  "./", "./index.html", "./style.css", "./config.js", "./app.js", "./manifest.json",
  "./icon-192.png", "./icon-512.png",
  "./home-v2/", "./home-v2/index.html", "./home-v2/home-v2.css", "./home-v2/home-v2.js",
  "./home-v2/offline-store.js", "./home-v2/config.js"
];
self.addEventListener("install",event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)))});
self.addEventListener("activate",event=>{event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))),self.clients.claim()]))});
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  if(event.request.mode==="navigate"){
    event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match(event.request).then(r=>r||caches.match(url.pathname.includes("home-v2")?"./home-v2/index.html":"./index.html"))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response&&response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy))}return response})));
});
