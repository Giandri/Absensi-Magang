self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png', // Fallback icon path
      badge: '/icons/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '2',
        url: data.url || '/'
      },
      actions: [
        {
          action: 'explore',
          title: 'Buka Aplikasi',
          icon: '/icons/check-mark.png'
        },
        {
          action: 'close',
          title: 'Tutup',
          icon: '/icons/x-mark.png'
        },
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  if (event.action === 'explore') {
    // Open the app
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  } else {
    // Default click behavior
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});
