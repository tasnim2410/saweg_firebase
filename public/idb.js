(function () {
  const DB_NAME = 'saweg-offline';
  const STORE = 'kv';

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function withStore(mode, fn) {
    return openDB().then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, mode);
          const store = tx.objectStore(STORE);
          const res = fn(store);
          tx.oncomplete = () => resolve(res);
          tx.onabort = () => reject(tx.error);
          tx.onerror = () => reject(tx.error);
        })
    );
  }

  function setJson(key, data) {
    const entry = { key, data, updatedAt: Date.now() };
    return withStore('readwrite', (store) => store.put(entry));
  }

  function getJson(key) {
    return withStore('readonly', (store) =>
      new Promise((resolve, reject) => {
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      })
    );
  }

  self.sawegIdb = {
    openDB,
    setJson,
    getJson,
  };
})();
