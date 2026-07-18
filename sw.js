// ── CFO Keluarga Finance — Service Worker ─────────────
// Versi cache: update angka ini setiap deploy supaya SW refresh
const APP_CACHE  = 'cfo-app-v1';
const CDN_CACHE  = 'cfo-cdn-v1';

// Aset CDN yang di-cache (fonts + chart.js)
const CDN_ORIGINS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://cdn.jsdelivr.net',
];

// JANGAN cache endpoint ini
const NO_CACHE = [
  'api.anthropic.com',
];

// ── INSTALL: cache app shell ───────────────────────────
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(APP_CACHE).then(function(cache) {
      return cache.addAll(['./index.html', './']);
    }).then(function() {
      // Langsung aktif tanpa tunggu tab lama ditutup
      return self.skipWaiting();
    })
  );
});

// ── ACTIVATE: bersihkan cache lama ─────────────────────
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) {
          return k !== APP_CACHE && k !== CDN_CACHE;
        }).map(function(k) {
          return caches.delete(k);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ── FETCH: strategi per jenis request ─────────────────
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // 1. Jangan cache API Anthropic (chat AI harus selalu live)
  if (NO_CACHE.some(function(h) { return url.includes(h); })) {
    return; // biarkan request jalan normal
  }

  // 2. CDN assets (fonts, chart.js) — Cache First, update di background
  if (CDN_ORIGINS.some(function(origin) { return url.startsWith(origin); })) {
    e.respondWith(
      caches.open(CDN_CACHE).then(function(cache) {
        return cache.match(e.request).then(function(cached) {
          // Ambil dari network untuk update cache di background
          var fetchPromise = fetch(e.request).then(function(response) {
            if (response.ok) cache.put(e.request, response.clone());
            return response;
          }).catch(function() { return null; });
          // Kembalikan cache kalau ada, sambil update di background
          return cached || fetchPromise;
        });
      })
    );
    return;
  }

  // 3. App shell (index.html) — Network First, cache sebagai fallback offline
  if (e.request.mode === 'navigate' ||
      url.includes('index.html') ||
      url.endsWith('/')) {
    e.respondWith(
      fetch(e.request).then(function(response) {
        // Simpan versi terbaru ke cache
        var clone = response.clone();
        caches.open(APP_CACHE).then(function(cache) {
          cache.put(e.request, clone);
        });
        return response;
      }).catch(function() {
        // Offline: sajikan dari cache
        return caches.match('./index.html');
      })
    );
    return;
  }

  // 4. Default: network first, cache fallback
  e.respondWith(
    fetch(e.request).catch(function() {
      return caches.match(e.request);
    })
  );
});

// ── PESAN ke tab untuk reload setelah update ──────────
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
