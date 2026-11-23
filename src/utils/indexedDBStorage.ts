import { DatabaseState } from '../types';

const DB_NAME = 'MakkahPrintersOfflineDB';
const DB_VERSION = 1;
const STORE_CURRENT = 'active_database';
const STORE_SNAPSHOTS = 'auto_snapshots';

export interface AutoSnapshot {
  id: string;
  date: string;
  time: string;
  timestamp: number;
  totalRecords: number;
  summary: string;
  data: DatabaseState;
}

const IDB_TIMEOUT_MS = 2500;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported'));
    }

    let settled = false;
    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('IndexedDB open timeout'));
      }
    }, IDB_TIMEOUT_MS);

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_CURRENT)) {
          db.createObjectStore(STORE_CURRENT);
        }
        if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
          db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        if (settled) {
          try {
            request.result.close();
          } catch {
            // ignore
          }
          return;
        }
        settled = true;
        clearTimeout(timeoutId);
        resolve(request.result);
      };
      request.onerror = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          reject(request.error || new Error('IndexedDB open error'));
        }
      };
      request.onblocked = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          reject(new Error('IndexedDB open blocked'));
        }
      };
    } catch (err) {
      if (!settled) {
        settled = true;
        clearTimeout(timeoutId);
        reject(err);
      }
    }
  });
}

function getStoreKey(businessId: string = 'makkah_printers_shared'): string {
  return businessId === 'makkah_printers_shared' ? 'current_state' : `biz_state_${businessId}`;
}

/**
 * Persist the current database state to IndexedDB (no 5MB storage limit)
 */
export async function saveToIndexedDB(
  state: DatabaseState,
  businessId: string = 'makkah_printers_shared'
): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_CURRENT], 'readwrite');
      const store = tx.objectStore(STORE_CURRENT);
      const req = store.put(state, getStoreKey(businessId));

      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to save to IndexedDB', err);
    return false;
  }
}

/**
 * Load database state from IndexedDB
 */
export async function loadFromIndexedDB(
  businessId: string = 'makkah_printers_shared'
): Promise<DatabaseState | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve(null);
        }
      }, IDB_TIMEOUT_MS);

      try {
        const tx = db.transaction([STORE_CURRENT], 'readonly');
        const store = tx.objectStore(STORE_CURRENT);
        const req = store.get(getStoreKey(businessId));

        req.onsuccess = () => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve(req.result || null);
          }
        };
        req.onerror = () => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            reject(req.error);
          }
        };
      } catch (err) {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(err);
        }
      }
    });
  } catch (err) {
    console.warn('Failed to load from IndexedDB, falling back to localStorage:', err);
    return null;
  }
}

/**
 * Save an automatic timestamped snapshot (keeps latest 15 snapshots)
 */
export async function saveSnapshotToIndexedDB(state: DatabaseState): Promise<boolean> {
  try {
    const db = await openDB();
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
    const timestamp = Date.now();

    const totalRecords =
      (state.parties?.length || 0) +
      (state.books?.length || 0) +
      (state.productions?.length || 0) +
      (state.invoices?.length || 0) +
      (state.collections?.length || 0) +
      (state.transactions?.length || 0) +
      (state.paperStock?.length || 0);

    const snapshot: AutoSnapshot = {
      id: `snap_${timestamp}`,
      date: dateStr,
      time: timeStr,
      timestamp,
      totalRecords,
      summary: `পার্টি: ${state.parties?.length || 0}, প্রডাকশন: ${state.productions?.length || 0}, বিল: ${state.invoices?.length || 0}`,
      data: state,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_SNAPSHOTS], 'readwrite');
      const store = tx.objectStore(STORE_SNAPSHOTS);
      store.put(snapshot);

      // Keep only up to 15 snapshots to keep storage neat
      const allReq = store.getAll();
      allReq.onsuccess = () => {
        const all: AutoSnapshot[] = allReq.result || [];
        if (all.length > 15) {
          all.sort((a, b) => a.timestamp - b.timestamp);
          const toDelete = all.slice(0, all.length - 15);
          for (const item of toDelete) {
            store.delete(item.id);
          }
        }
      };

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to save snapshot to IndexedDB', err);
    return false;
  }
}

/**
 * Get all available auto snapshots sorted descending by time
 */
export async function getSnapshotsFromIndexedDB(): Promise<AutoSnapshot[]> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve([]);
        }
      }, IDB_TIMEOUT_MS);

      try {
        const tx = db.transaction([STORE_SNAPSHOTS], 'readonly');
        const store = tx.objectStore(STORE_SNAPSHOTS);
        const req = store.getAll();

        req.onsuccess = () => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            const list: AutoSnapshot[] = req.result || [];
            list.sort((a, b) => b.timestamp - a.timestamp);
            resolve(list);
          }
        };
        req.onerror = () => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            reject(req.error);
          }
        };
      } catch (err) {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(err);
        }
      }
    });
  } catch (err) {
    console.warn('Failed to get snapshots from IndexedDB:', err);
    return [];
  }
}

/**
 * Delete a specific snapshot
 */
export async function deleteSnapshotFromIndexedDB(id: string): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_SNAPSHOTS], 'readwrite');
      const store = tx.objectStore(STORE_SNAPSHOTS);
      const req = store.delete(id);

      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to delete snapshot', err);
    return false;
  }
}

/**
 * Request persistent storage from the browser so OS never clears it
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      return await navigator.storage.persist();
    }
  } catch {
    // Restricted WebViews / third-party iframes may reject storage persistence requests
  }
  return false;
}

/**
 * Check storage usage estimate
 */
export async function getStorageEstimate(): Promise<{
  usageMB: number;
  quotaMB: number;
  percent: number;
  isPersistent: boolean;
}> {
  let isPersistent = false;
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
      isPersistent = await navigator.storage.persisted();
    }

    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const usageMB = Math.round(((estimate.usage || 0) / (1024 * 1024)) * 100) / 100;
      const quotaMB = Math.round(((estimate.quota || 0) / (1024 * 1024)) * 100) / 100;
      const percent = quotaMB > 0 ? Math.round((usageMB / quotaMB) * 1000) / 10 : 0;
      return { usageMB, quotaMB, percent, isPersistent };
    }
  } catch {
    // Fallback gracefully in restricted environments
  }

  return { usageMB: 0, quotaMB: 1000, percent: 0, isPersistent };
}
