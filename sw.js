// 네트워크 우선, 끊기면 캐시. 문항이 바뀌면 다음 접속 때 바로 반영된다.
const C = "nq-1.2.0";
const SHELL = ["./", "index.html", "manifest.json", "bank/anatomy.js", "bank/maternal.js", "privacy.html", "icons/icon-192.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(C).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return; // 구글 로그인·드라이브 요청은 캐시하지 않음
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); return r; })
    .catch(() => caches.match(e.request, {ignoreSearch: true})));
});
