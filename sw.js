/*
 * Service worker SIPMUR EDU (GitHub Pages)
 * - Menyimpan kerangka aplikasi (HTML, CSS, JS, ikon) agar cepat dibuka.
 * - Permintaan ke Google Apps Script (data) TIDAK pernah disimpan: selalu langsung ke server.
 * - Strategi "jaringan dulu" untuk HTML/CSS/JS: setiap git push langsung terbawa ke HP pengguna.
 * - Sudah menyiapkan penerima notifikasi push (untuk notifikasi kehadiran orang tua tahap berikutnya).
 * Naikkan VERSI bila mengganti ikon atau ingin memaksa semua HP mengambil ulang.
 */
const VERSI = 'sipmur-edu-v2.0.0';
const KERANGKA = [
  './',
  './index.html',
  './css/style.css',
  './js/config.js',
  './js/app.js',
  './manifest.json',
  './icons/logo.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSI).then(c => c.addAll(KERANGKA)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSI).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // API GAS, font, CDN: lewat apa adanya

  if (/\.(png|ico|svg|webp)$/.test(url.pathname)) {
    event.respondWith(caches.match(req).then(r => r || fetch(req)));
    return;
  }
  // HTML, CSS, JS, manifest: jaringan dulu, simpanan bila offline
  event.respondWith(
    fetch(req)
      .then(res => { if (res.ok) { const salin = res.clone(); caches.open(VERSI).then(c => c.put(req, salin)); } return res; })
      .catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});

/* ── Notifikasi push (disiapkan untuk notifikasi kehadiran) ── */
self.addEventListener('push', event => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { body: event.data ? event.data.text() : '' }; }
  const n = d.notification || d;
  event.waitUntil(self.registration.showNotification(n.title || 'SIPMUR EDU', {
    body: n.body || 'Ada informasi kehadiran baru.',
    icon: 'icons/icon-192.png',
    badge: 'icons/favicon.png',
    tag: n.tag || undefined,
    data: { url: (d.data && d.data.url) || n.url || './' }
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const tujuan = new URL((event.notification.data && event.notification.data.url) || './', self.location.href).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) { if (c.url.startsWith(self.location.origin) && 'focus' in c) return c.focus(); }
      return self.clients.openWindow(tujuan);
    })
  );
});
