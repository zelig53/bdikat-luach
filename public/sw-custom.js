// Service Worker — התראות + PWA install support
const CACHE_NAME = 'bdikat-luach-v2';
const DB_NAME = 'reminders-db';
const STORE_NAME = 'reminders';

self.addEventListener('install', e => {
  // skipWaiting מיד — ללא cache בinstall כדי למנוע לולאת reload ב-Vercel
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
    .then(() => restoreReminders()) // שחזר תזכורות שמורות
  );
});

async function restoreReminders() {
  try {
    const db = await openDB();
    const reminders = await new Promise((res, rej) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = e => res(e.target.result);
      req.onerror = e => rej(e.target.error);
    });
    for (const r of reminders) {
      const delay = new Date(r.fireAt).getTime() - Date.now();
      if (delay <= 0) { await deleteReminder(r.noteId); continue; }
      setTimeout(async () => {
        await self.registration.showNotification(r.title, {
          body: r.body, icon: '/icon.svg', tag: r.noteId, renotify: false,
        });
        await deleteReminder(r.noteId);
      }, delay);
    }
  } catch(e) { console.warn('restoreReminders failed:', e); }
}

self.addEventListener('fetch', e => {
  // navigation — תמיד מהרשת, fallback לcache רק אם offline
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.status === 200 && res.type === 'basic') {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, resClone));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then(r => r || caches.match('/')))
    );
    return;
  }
  if (e.request.method !== 'GET') return;
  // assets — cache-first
  e.respondWith(
    caches.match(e.request).then(res => {
      if (res) return res;
      return fetch(e.request).then(networkRes => {
        if (networkRes && networkRes.status === 200 && networkRes.type === 'basic') {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return networkRes;
      });
    })
  );
});

// ---- IndexedDB helpers ----
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore(STORE_NAME, { keyPath: 'noteId' });
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

async function saveReminder(r) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(r);
    tx.oncomplete = res; tx.onerror = e => rej(e.target.error);
  });
}

async function deleteReminder(id) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = res; tx.onerror = e => rej(e.target.error);
  });
}

// ---- הודעות מהאפליקציה ----
self.addEventListener('message', async event => {
  const { type, payload } = event.data || {};
  if (!type || !payload) return;

  if (type === 'SCHEDULE_REMINDER' || type === 'SCHEDULE_WEEKLY') {
    const { noteId, title, body, fireAt } = payload;
    const id = noteId || 'weekly';
    const delay = new Date(fireAt).getTime() - Date.now();
    if (delay <= 0) return;
    await saveReminder({ noteId: id, title, body, fireAt });
    setTimeout(async () => {
      await self.registration.showNotification(title, {
        body, icon: '/icon.svg', tag: id, renotify: false,
      });
      await deleteReminder(id);
    }, delay);
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
