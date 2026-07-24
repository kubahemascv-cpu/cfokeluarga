// SW CS TUKIN — Kumasindo
// Service Worker ini membuat app diinstall sebagai true PWA:
// - Tidak ada logo Chrome di thumbnail
// - Tidak hilang saat HP di-update
// - Bisa dibuka offline (cached)

var CACHE = 'cs-tukin-v1';

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return c.addAll(['./']);
    }).catch(function(){})
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){return k!==CACHE;})
            .map(function(k){return caches.delete(k);})
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e){
  if(e.request.method!=='GET')return;
  if(!e.request.url.startsWith(self.location.origin))return;
  e.respondWith(
    caches.match(e.request).then(function(cached){
      if(cached)return cached;
      return fetch(e.request).then(function(res){
        if(!res||res.status!==200)return res;
        var clone=res.clone();
        caches.open(CACHE).then(function(c){c.put(e.request,clone);});
        return res;
      }).catch(function(){return cached;});
    })
  );
});
