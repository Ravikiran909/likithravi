// Firebase Cloud Messaging Background Service Worker for Smart Study Reminders
// Handles FCM push events and background notifications based on student's preferredStudyTime

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for incoming Firebase Cloud Messaging Push Notifications
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch (e) {
    payload = {
      notification: {
        title: 'Smart Study Reminder',
        body: event.data ? event.data.text() : 'It is time for your scheduled daily study session!',
      },
    };
  }

  const notification = payload.notification || {};
  const data = payload.data || {};

  const title = notification.title || data.title || 'Smart Study Reminder';
  const options = {
    body:
      notification.body ||
      data.body ||
      'Your scheduled study window has arrived. Start a focused session to protect your streak!',
    icon: notification.icon || '/assets/icon-192.png',
    badge: '/assets/icon-192.png',
    tag: data.tag || 'smart-study-reminder-fcm',
    renotify: true,
    data: {
      url: data.url || '/',
      subject: data.subject || 'General',
      preferredStudyTime: data.preferredStudyTime || '07:00 PM',
      ...data,
    },
    actions: [
      {
        action: 'start_study',
        title: 'Start Study Session',
      },
      {
        action: 'take_quiz',
        title: '5-Min Adaptive Quiz',
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle user clicking on the FCM Push Notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.postMessage({
            type: 'FCM_NOTIFICATION_CLICKED',
            action: event.action || 'open',
            data: event.notification.data,
          });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
