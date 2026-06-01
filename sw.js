/* ศูนย์ควบคุมชีวิต — service worker
   - แคชหน้าแอป (shell) ไว้เปิดออฟไลน์
   - HTML ใช้ network-first เพื่อให้เห็นเวอร์ชันใหม่เสมอเมื่อออนไลน์
   - ไม่แตะ Firebase / Firestore / Google Fonts (ปล่อยให้ต่อเน็ตปกติ) จึงไม่ขวางการซิงค์ */
const CACHE = 'lifeos-v2';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // หน้า HTML / navigation: เอาตัวใหม่จากเน็ตก่อน ถ้าออฟไลน์ค่อยใช้แคช
  if (req.mode === 'navigate' || (url.origin === location.origin && url.pathname.endsWith('.html'))) {
    e.respondWith(
      fetch(req).then(r => {
        const cp = r.clone();
        caches.open(CACHE).then(c => c.put(req, cp));
        return r;
      }).catch(() => caches.match(req).then(m => m || caches.match('./index.html')))
    );
    return;
  }

  // ไฟล์ static ของเราเอง (icon, manifest): ใช้แคชก่อน
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(m => m || fetch(req).then(r => {
        const cp = r.clone();
        caches.open(CACHE).then(c => c.put(req, cp));
        return r;
      }))
    );
    return;
  }
  // อื่นๆ (Firebase/Firestore/ฟอนต์ของ Google): ปล่อยให้ต่อเน็ตตามปกติ ไม่ดักจับ
});
