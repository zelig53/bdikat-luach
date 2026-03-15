// Service Worker מותאם — ניהול תזכורות
const DB_NAME = 'reminders-db';
const STORE_NAME = 'reminders';

self.addEventListener('install', e => e.waitUntil(self.skipWaiting()));
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore(STORE_NAME, { keyPath: 'noteId' });
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

async function saveReminder(reminder) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(reminder);
    tx.oncomplete = resolve;
    tx.onerror = e => reject(e.target.error);
  });
}

async function deleteReminder(noteId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(noteId);
    tx.oncomplete = resolve;
    tx.onerror = e => reject(e.target.error);
  });
}

async function getAllReminders() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

async function checkAndFireReminders() {
  const reminders = await getAllReminders();
  const now = Date.now();
  for (const r of reminders) {
    if (new Date(r.fireAt).getTime() <= now) {
      await self.registration.showNotification(r.title, {
        body: r.body, icon: '/icon.svg', badge: '/icon.svg',
        tag: r.noteId, renotify: false, requireInteraction: false,
      });
      await deleteReminder(r.noteId);
    }
  }
}

self.addEventListener('sync', e => {
  if (e.tag === 'check-reminders') e.waitUntil(checkAndFireReminders());
});

self.addEventListener('periodicsync', e => {
  if (e.tag === 'check-reminders-periodic') e.waitUntil(checkAndFireReminders());
});

self.addEventListener('message', async (event) => {
  const { type, payload } = event.data || {};

  if (type === 'SCHEDULE_REMINDER' || type === 'SCHEDULE_WEEKLY') {
    const { noteId, title, body, fireAt } = payload;
    const id = noteId || 'weekly-reminder';
    if (new Date(fireAt).getTime() <= Date.now()) return;
    await saveReminder({ noteId: id, title, body, fireAt });
    const delay = new Date(fireAt).getTime() - Date.now();
    setTimeout(async () => {
      await self.registration.showNotification(title, {
        body, icon: '/icon.svg', badge: '/icon.svg',
        tag: id, renotify: type === 'SCHEDULE_WEEKLY',
      });
      await deleteReminder(id);
    }, delay);
    try { await self.registration.sync.register('check-reminders'); } catch(_) {}
  }

  if (type === 'CANCEL_REMINDER') {
    await deleteReminder(payload.noteId);
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const c = clients.find(cl => cl.url.includes(self.location.origin));
      if (c) return c.focus();
      return self.clients.openWindow('/');
    })
  );
});
