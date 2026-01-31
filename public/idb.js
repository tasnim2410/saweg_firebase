(function () {
  const DB_NAME = 'saweg-offline';
  const DB_VERSION = 2;
  const STORE = 'kv';
  const QUEUE = 'queue';

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains(QUEUE)) {
          const q = db.createObjectStore(QUEUE, { keyPath: 'id', autoIncrement: true });
          try {
            q.createIndex('createdAt', 'createdAt', { unique: false });
          } catch {
          }
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function withStore(storeName, mode, fn) {
    return openDB().then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(storeName, mode);
          const store = tx.objectStore(storeName);
          const res = fn(store);
          tx.oncomplete = () => resolve(res);
          tx.onabort = () => reject(tx.error);
          tx.onerror = () => reject(tx.error);
        })
    );
  }

  function setJson(key, data) {
    const entry = { key, data, updatedAt: Date.now() };
    return withStore(STORE, 'readwrite', (store) => store.put(entry));
  }

  function getJson(key) {
    return withStore(STORE, 'readonly', (store) =>
      new Promise((resolve, reject) => {
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      })
    );
  }

  function queueAdd(item) {
    return withStore(QUEUE, 'readwrite', (store) =>
      new Promise((resolve, reject) => {
        const req = store.add(item);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
    );
  }

  function queueGetAll() {
    return withStore(QUEUE, 'readonly', (store) =>
      new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      })
    );
  }

  function queueDelete(id) {
    return withStore(QUEUE, 'readwrite', (store) =>
      new Promise((resolve, reject) => {
        const req = store.delete(id);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      })
    );
  }

  self.sawegIdb = {
    openDB,
    setJson,
    getJson,
    queueAdd,
    queueGetAll,
    queueDelete,
  };
})();
