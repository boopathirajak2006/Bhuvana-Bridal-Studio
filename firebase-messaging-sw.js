/* Firebase Cloud Messaging background handler for the owner portal. */
function getPortalUrl(value) {
  const base = self.registration.scope;
  const fallback = new URL('studio-inbox.html', base).href;
  if (!value) return fallback;

  try {
    const normalized = /^https?:\/\//i.test(value)
      ? new URL(value)
      : new URL(String(value).replace(/^\/+/, ''), base);
    const scopePath = new URL(base).pathname;
    if (normalized.origin !== new URL(base).origin || !normalized.pathname.startsWith(scopePath)) {
      return fallback;
    }
    return normalized.href;
  } catch (_) {
    return fallback;
  }
}

// Register this before importing Firebase; the SDK may install its own click handler.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = getPortalUrl(event.notification.data && event.notification.data.url);

  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const matchingClient = clients.find((client) => client.url === targetUrl);
    if (matchingClient) return matchingClient.focus();
    return self.clients.openWindow(targetUrl);
  }));
});

importScripts('https://www.gstatic.com/firebasejs/13.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/13.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyADS-H04V46QEJWyJR-lr4ADYfm8IcOYQM',
  authDomain: 'bhuvana-bridal-studio.firebaseapp.com',
  projectId: 'bhuvana-bridal-studio',
  storageBucket: 'bhuvana-bridal-studio.firebasestorage.app',
  messagingSenderId: '718120895257',
  appId: '1:718120895257:web:d33ccb0dd057ad6b98bb88',
  measurementId: 'G-MNET3E3PEJ'
});

firebase.messaging().onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  const data = payload.data || {};
  const title = notification.title || 'New booking received';

  return self.registration.showNotification(title, {
    body: notification.body || 'A new booking enquiry is waiting in the owner portal.',
    icon: new URL('assets/images/logo.png', self.registration.scope).href,
    badge: new URL('assets/images/favicon.png', self.registration.scope).href,
    data: { url: getPortalUrl(data.url || data.click_action) }
  });
});
