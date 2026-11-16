/**
 * Bhuvana's Bridal & Tailoring Studio
 * Firebase Cloud Messaging Background Service Worker
 * Handles background push notifications for studio owners.
 */

// Import Firebase scripts for Service Worker
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Initialize Firebase in Service Worker
const firebaseConfig = {
  apiKey: "AIzaSy_BHUVANA_STUDIO_FCM_API_KEY",
  authDomain: "bhuvana-bridal-studio.firebaseapp.com",
  projectId: "bhuvana-bridal-studio",
  storageBucket: "bhuvana-bridal-studio.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // Handle background incoming push notifications
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Background message received:', payload);

    const notificationTitle = payload.notification?.title || payload.data?.title || "Bhuvana's Bridal Studio — New Booking!";
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || 'A customer has submitted a new booking enquiry. Tap to review.',
      icon: '/assets/images/logo.png',
      badge: '/assets/images/logo.png',
      tag: payload.data?.booking_ref || 'bbs-booking',
      data: {
        url: payload.data?.clickUrl || '/studio-inbox.html',
        bookingRef: payload.data?.booking_ref
      },
      vibrate: [200, 100, 200, 100, 200],
      requireInteraction: true
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (e) {
  console.warn('[firebase-messaging-sw.js] Firebase SW initialization deferred:', e);
}

// Handle notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/studio-inbox.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a tab is already open with the dashboard, focus it
      for (const client of clientList) {
        if (client.url.includes('studio-inbox.html') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
