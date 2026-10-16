// Mahfil Chat service worker: app install, offline shell, push notifications
const CACHE = "mf-v1", SHELL = ["./", "index.html", "games.js", "config.js", "privacy.html", "manifest.json", "icon-192.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => clients.claim()));
});
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  e.respondWith(
    fetch(r).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); return res; })
      .catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match("index.html")))
  );
});

self.addEventListener("push", e => {
  let d = {}; try { d = e.data.json(); } catch (_) {}
  e.waitUntil(self.registration.showNotification(d.title || "Mahfil Chat", {
    body: d.body || "", icon: "icon-192.png", badge: "icon-192.png",
    tag: d.chat, renotify: true, requireInteraction: !!d.call,
    vibrate: d.call ? [400, 200, 400, 200, 400] : [120], data: d
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close(); const d = e.notification.data || {};
  e.waitUntil((async () => {
    const cl = await clients.matchAll({ type: "window", includeUncontrolled: true });
    if (cl.length) { await cl[0].focus(); cl[0].postMessage(d); return; }
    await clients.openWindow(`./?chat=${d.chat}&call=${d.call ? 1 : 0}`);
  })());
});
