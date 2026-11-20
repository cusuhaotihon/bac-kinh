/* Lưu bản sao để mở được khi mất mạng. Luôn ưu tiên bản mới trên mạng. */
const CACHE = "bk26-v1";
const CORE = ["./", "./index.html", "./manifest.webmanifest"];
self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {}));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;
  const isPage = r.mode === "navigate" || u.pathname.endsWith("/") || u.pathname.endsWith(".html");
  const key = isPage ? "./index.html" : u.origin + u.pathname;
  if (!isPage && /\.(woff2|png|jpe?g|webp|svg)$/i.test(u.pathname)) {
    // ảnh, phông: lấy trong máy trước cho nhanh, rồi cập nhật ngầm
    e.respondWith(caches.open(CACHE).then(c => c.match(r, { ignoreSearch: true }).then(hit => {
      const net = fetch(r).then(res => { if (res.ok) c.put(key, res.clone()); return res; });
      return hit || net;
    })));
    return;
  }
  // trang: lấy bản mới trên mạng, mất mạng thì dùng bản đã lưu
  e.respondWith(fetch(r).then(res => {
    if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(key, cp)); }
    return res;
  }).catch(() => caches.match(key, { ignoreSearch: true }).then(hit => hit || caches.match("./index.html"))));
});
