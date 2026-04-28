// Service Worker — фоновый помощник, который показывает уведомления
// даже когда вкладка с сайтом закрыта.

const CACHE_NAME = "mstodo-cache-v1";
const SCHEDULED = new Map(); // id -> timeoutId

// При установке — активируемся сразу
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Приём команд от страницы
self.addEventListener("message", (event) => {
  const data = event.data || {};

  if (data.type === "schedule") {
    // data: { id, title, body, when (timestamp ms) }
    const delay = data.when - Date.now();

    // Отменяем предыдущий таймер с этим id (если был)
    if (SCHEDULED.has(data.id)) {
      clearTimeout(SCHEDULED.get(data.id));
      SCHEDULED.delete(data.id);
    }

    if (delay <= 0) {
      showReminder(data);
    } else {
      const tid = setTimeout(() => {
        showReminder(data);
        SCHEDULED.delete(data.id);
      }, delay);
      SCHEDULED.set(data.id, tid);
    }

    // Notification Triggers API (экспериментальная фича Chrome) —
    // умеет показывать уведомления даже если SW "заснул"
    if ("showTrigger" in Notification.prototype) {
      try {
        self.registration.showNotification(data.title, {
          body: data.body,
          tag: "reminder-" + data.id,
          icon: "https://cdn-icons-png.flaticon.com/512/2387/2387635.png",
          badge: "https://cdn-icons-png.flaticon.com/512/2387/2387635.png",
          showTrigger: new TimestampTrigger(data.when),
          data: { url: self.registration.scope, taskId: data.id },
        });
      } catch (e) { /* ignore */ }
    }
  }

  if (data.type === "cancel") {
    if (SCHEDULED.has(data.id)) {
      clearTimeout(SCHEDULED.get(data.id));
      SCHEDULED.delete(data.id);
    }
    self.registration.getNotifications({ tag: "reminder-" + data.id }).then((ns) => {
      ns.forEach((n) => n.close());
    });
  }

  if (data.type === "cancelAll") {
    SCHEDULED.forEach((tid) => clearTimeout(tid));
    SCHEDULED.clear();
    self.registration.getNotifications().then((ns) => {
      ns.forEach((n) => {
        if (!n.tag || n.tag.startsWith("reminder-")) n.close();
      });
    });
  }
});

function showReminder(data) {
  self.registration.showNotification(data.title, {
    body: data.body || "",
    tag: "reminder-" + data.id,
    icon: "https://cdn-icons-png.flaticon.com/512/2387/2387635.png",
    badge: "https://cdn-icons-png.flaticon.com/512/2387/2387635.png",
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: { url: self.registration.scope, taskId: data.id },
  });
}

// Клик по уведомлению — открываем/фокусируем вкладку с приложением
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

// Для будущего (когда добавите настоящий Push-сервер с VAPID):
self.addEventListener("push", (event) => {
  let payload = { title: "Напоминание", body: "У вас есть задача" };
  try { if (event.data) payload = event.data.json(); } catch {}
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "https://cdn-icons-png.flaticon.com/512/2387/2387635.png",
      requireInteraction: true,
    })
  );
});
