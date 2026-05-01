// Service Worker: shows notifications, but does not keep long-lived timers.
// Browser engines may stop a service worker at any time, so reminder scheduling
// stays in the app runtime and overdue reminders are checked when the app wakes.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(keys.filter((key) => /sync|todo|mstodo/i.test(key)).map((key) => caches.delete(key)))
      ),
    ])
  );
});

self.addEventListener("message", (event) => {
  const data = event.data || {};

  if (data.type === "notify") {
    event.waitUntil(showReminder(data));
  }

  if (data.type === "cancel") {
    event.waitUntil(closeReminder(data.id));
  }

  if (data.type === "cancelAll") {
    event.waitUntil(closeAllReminders());
  }
});

function notificationTag(id) {
  return "reminder-" + id;
}

function showReminder(data) {
  return self.registration.showNotification(data.title || "Напоминание", {
    body: data.body || "",
    tag: notificationTag(data.id),
    icon: "https://cdn-icons-png.flaticon.com/512/2387/2387635.png",
    badge: "https://cdn-icons-png.flaticon.com/512/2387/2387635.png",
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: { url: self.registration.scope, taskId: data.id },
  });
}

function closeReminder(id) {
  return self.registration.getNotifications({ tag: notificationTag(id) }).then((notifications) => {
    notifications.forEach((notification) => notification.close());
  });
}

function closeAllReminders() {
  return self.registration.getNotifications().then((notifications) => {
    notifications.forEach((notification) => {
      if (!notification.tag || notification.tag.startsWith("reminder-")) notification.close();
    });
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener("push", (event) => {
  let payload = { title: "Напоминание", body: "У вас есть задача" };
  try {
    if (event.data) payload = event.data.json();
  } catch {}
  event.waitUntil(showReminder(payload));
});
