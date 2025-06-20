// public/sw.js

self.addEventListener('push', (event) => {
  const data = event.data.json();
  const { title, body, icon, tag } = data;

  const options = {
    body: body,
    icon: icon || '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: tag || 'default-tag',
    data: data.data, 
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
}); 