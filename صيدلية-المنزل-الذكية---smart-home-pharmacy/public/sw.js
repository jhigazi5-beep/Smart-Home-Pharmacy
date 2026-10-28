/**
 * Service Worker for Smart Home Pharmacy (صيدلية المنزل الذكية)
 * Handles Offline Caching, Web Push, and Background FCM Notifications
 */

const CACHE_NAME = 'sph-cache-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Push notification listener (FCM and Web Push)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { body: event.data.text() };
    }
  }

  const title =
    data.title ||
    data.notification?.title ||
    '⏰ تذكير موعد الدواء - صيدلية المنزل الذكية';

  const body =
    data.body ||
    data.notification?.body ||
    'حان موعد تناول جرعتك الدوائية المحددة الآن.';

  const options = {
    body,
    icon: data.icon || data.notification?.icon || '/icon.svg',
    badge: '/icon.svg',
    tag: data.tag || 'med-dose-alert-' + Date.now(),
    vibrate: [400, 150, 400, 150, 600],
    requireInteraction: true,
    dir: 'rtl',
    lang: 'ar',
    data: data.data || {},
    actions: [
      { action: 'take', title: 'تم أخذ الجرعة ✅' },
      { action: 'snooze', title: 'غفوة 10 دقائق ⏳' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click listener
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
