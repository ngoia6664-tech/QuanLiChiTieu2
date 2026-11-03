/* Service worker: lưu đệm các file của app để mở được khi không có mạng.
   Mỗi lần sửa file nên tăng số phiên bản CACHE để máy người dùng tải bản mới. */
const CACHE = 'chitieu-v7';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'css/style.css', 'js/app.js'];
/* Cài đặt: tải sẵn các file vào cache */
self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(FILES); }).then(function(){ return self.skipWaiting(); }));
});
/* Kích hoạt: xóa cache phiên bản cũ */
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
/* Mỗi request: ưu tiên lấy từ mạng (và cập nhật cache), mất mạng thì lấy từ cache */
self.addEventListener('fetch', function(e){
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(function(r){
      const copy = r.clone();
      if (r.ok && new URL(e.request.url).origin === location.origin) caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
      return r;
    }).catch(function(){ return caches.match(e.request).then(function(m){ return m || caches.match('index.html'); }); })
  );
});
