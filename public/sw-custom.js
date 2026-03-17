// Service Worker — התראות + PWA install support
const CACHE_NAME = 'bdikat-luach-v3';
const DB_NAME = 'reminders-db';
const STORE_NAME = 'reminders';

self.addEventListener('install', e => {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => scheduleAllFromDB()) // שחזר תזכורות אחרי activate
  );
});

// ---- שחזור תזכורות מ-IndexedDB ----
// רץ: (1) אחרי activate  (2) כשהדפדפן פותח מחדש (message RESTORE)
async function scheduleAllFromDB() {
  try {
    const reminders = await getAllReminders();
    const now = Date.now();
    for (const r of reminders) {
      const delay = new Date(r.fireAt).getTime() - now;
      if (delay <= 0) {
        // תזכורת שהחמצנו — שלח מיד
        await self.registration.showNotification(r.title, {
          body: r.body, icon: '/icon.svg', tag: r.noteId, renotify: true,
        });
        await deleteReminder(r.noteId);
      } else {
        // קבע setTimeout חדש
        armReminder(r.noteId, r.title, r.body, delay);
      }
    }
  } catch(e) { console.warn('[SW] scheduleAllFromDB failed:', e); }
}

// map לשמירת timerId לכל תזכורת (כדי לבטל אם צריך)
const activeTimers = new Map();

function armReminder(noteId, title, body, delay) {
  // ביטול timer קיים אם יש
  if (activeTimers.has(noteId)) clearTimeout(activeTimers.get(noteId));
  const id = setTimeout(async () => {
    activeTimers.delete(noteId);
    await self.registration.showNotification(title, {
      body, icon: '/icon.svg', tag: noteId, renotify: false,
    });
    await deleteReminder(noteId);
  }, delay);
  activeTimers.set(noteId, id);
}

// ---- Fetch ----
self.addEventListener('fetch', e => {
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then(r => r || caches.match('/')))
    );
    return;
  }
  if (e.request.method !== 'GET') return;
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

// ---- הודעות מהאפליקציה ----
self.addEventListener('message', async event => {
  const { type, payload } = event.data || {};
  if (!type) return;

  if (type === 'RESTORE_REMINDERS') {
    // הדף נפתח — שחזר כל התזכורות שנשמרו ב-DB
    await scheduleAllFromDB();
    return;
  }

  if (type === 'SCHEDULE_REMINDER') {
    const { noteId, title, body, fireAt } = payload || {};
    if (!noteId || !fireAt) return;
    const delay = new Date(fireAt).getTime() - Date.now();
    if (delay <= 0) {
      // שלח מיד אם השעה כבר עברה
      await self.registration.showNotification(title, {
        body, icon: '/icon.svg', tag: noteId, renotify: true,
      });
      return;
    }
    await saveReminder({ noteId, title, body, fireAt });
    armReminder(noteId, title, body, delay);
  }

  if (type === 'CANCEL_REMINDER') {
    const { noteId } = payload || {};
    if (!noteId) return;
    if (activeTimers.has(noteId)) {
      clearTimeout(activeTimers.get(noteId));
      activeTimers.delete(noteId);
    }
    await deleteReminder(noteId);
  }
});

// ---- לחיצה על התראה ----
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

// ---- IndexedDB helpers ----
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore(STORE_NAME, { keyPath: 'noteId' });
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

async function getAllReminders() {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = e => res(e.target.result || []);
    req.onerror = e => rej(e.target.error);
  });
}

async function saveReminder(r) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(r);
    tx.oncomplete = res;
    tx.onerror = e => rej(e.target.error);
  });
}

async function deleteReminder(id) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = res;
    tx.onerror = e => rej(e.target.error);
  });
}
