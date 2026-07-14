/* QC快篩 Service Worker: 離線快取
   - CDN 資源(OCR程式庫/模型檔, 版本固定) → cache-first: 首次下載後永久快取, 無網可用
   - 自家頁面(index.html) → network-first: 有網時永遠拿最新版, 離線時退回快取 */
const CACHE = 'qc-cache-v1';
const PRECACHE = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const sameOrigin = new URL(req.url).origin === self.location.origin;
  if (!sameOrigin) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') {
          const cl = res.clone();
          caches.open(CACHE).then(c => c.put(req, cl));
        }
        return res;
      }))
    );
  } else {
    e.respondWith(
      fetch(req).then(res => {
        const cl = res.clone();
        caches.open(CACHE).then(c => c.put(req, cl));
        return res;
      }).catch(() =>
        caches.match(req).then(h => h || caches.match('./index.html'))
      )
    );
  }
});
