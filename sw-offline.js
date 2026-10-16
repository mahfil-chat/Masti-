/* Mahfil Chat — offline cache.
   Purana sw.js (push notification wala) neeche import hota hai, use mat hatana. */
try { importScripts("sw.js"); } catch (e) {}

const SHELL = "mahfil-shell-v1", MEDIA = "mahfil-media-v1";
const PRE = [
  "./", "index.html", "config.js", "games.js", "manifest.json", "icon-192.png", "privacy.html",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js",
  "https://cdn.jsdelivr.net/npm/livekit-client@2.5.0/dist/livekit-client.umd.min.js"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => Promise.all(PRE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== SHELL && k !== MEDIA).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const netFirst = (r, ms) => new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error("timeout")), ms);
  fetch(r).then(x => { clearTimeout(t); res(x); }, y => { clearTimeout(t); rej(y); });
});
async function trim(name, max) {
  const c = await caches.open(name), ks = await c.keys();
  for (let i = 0; i < ks.length - max; i++) await c.delete(ks[i]);
}

self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET" || r.headers.has("range")) return;
  const u = new URL(r.url);

  // Supabase API / auth / realtime: kabhi cache nahi (chats app khud phone mein save karta hai)
  const sup = u.hostname.endsWith(".supabase.co");
  if (sup && !u.pathname.includes("/storage/v1/object/public/")) return;
  if (u.protocol === "ws:" || u.protocol === "wss:") return;

  // Photos / voice / files jo chat mein aaye: ek baar dekh liye to offline bhi dikhenge
  if (sup) {
    e.respondWith(caches.open(MEDIA).then(async c => {
      const hit = await c.match(r); if (hit) return hit;
      const res = await fetch(r);
      if (res && (res.ok || res.type === "opaque")) { c.put(r, res.clone()); trim(MEDIA, 150); }
      return res;
    }));
    return;
  }

  // CDN scripts (Supabase, LiveKit): cache-first
  if (u.origin !== location.origin) {
    if (!/cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/.test(u.hostname)) return;
    e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => {
      if (res && (res.ok || res.type === "opaque")) { const cp = res.clone(); caches.open(SHELL).then(c => c.put(r, cp)); }
      return res;
    })));
    return;
  }

  // Apni files (index.html, config.js, games.js...): pehle net, na mile to cache
  e.respondWith(netFirst(r, 4000).then(res => {
    if (res && res.ok) { const cp = res.clone(); caches.open(SHELL).then(c => c.put(r, cp)); }
    return res;
  }).catch(() => caches.match(r, { ignoreSearch: true }).then(hit => hit || (r.mode === "navigate" ? (caches.match("index.html").then(x => x || caches.match("./"))) : Response.error()))));
});
