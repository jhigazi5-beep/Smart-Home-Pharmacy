/**
 * Firebase Cloud Messaging Service Worker
 * Intercepts background push notifications when app is closed or backgrounded
 */

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { notification: { body: event.data.text() } };
    }
  }

  const notificationTitle =
    payload.notification?.title ||
    payload.title ||
    '⏰ تذكير موعد الدواء - صيدلية المنزل';

  const notificationOptions = {
    body:
      payload.notification?.body ||
      payload.body ||
      'حان موعد تناول جرعتك الدوائية المقررة.',
    icon: payload.notification?.icon || '/icon.svg',
    badge: '/icon.svg',
    tag: payload.notification?.tag || 'med-alert',
    vibrate: [400, 150, 400, 150, 600],
    requireInteraction: true,
    dir: 'rtl',
    lang: 'ar',
    data: payload.data || {},
  };

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
  );
});

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
