import { DocumentRecord, StudentProfile, MaterialReview } from '../types/index.ts';

const DB_NAME = 'AITutorOfflineDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

// Initialize / Open the IndexedDB database
export function getIndexedDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Documents store
      if (!db.objectStoreNames.contains('documents')) {
        db.createObjectStore('documents', { keyPath: 'id' });
      }



      // 4. Pending sync queue for offline changes in rural areas
      if (!db.objectStoreNames.contains('pending_sync')) {
        db.createObjectStore('pending_sync', { keyPath: 'id' });
      }

      // 5. Offline student profile store
      if (!db.objectStoreNames.contains('profile')) {
        db.createObjectStore('profile', { keyPath: 'userId' });
      }

      // 6. Offline reviews store
      if (!db.objectStoreNames.contains('reviews')) {
        db.createObjectStore('reviews', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

  return dbPromise;
}

// ----------------------------------------------------
// Documents Cache Operations
// ----------------------------------------------------
export async function saveOfflineDocuments(documents: DocumentRecord[]): Promise<void> {
  try {
    const db = await getIndexedDB();
    const tx = db.transaction('documents', 'readwrite');
    const store = tx.objectStore('documents');
    for (const doc of documents) {
      store.put(doc);
    }
  } catch (err) {
    console.warn('Failed to cache documents in IndexedDB:', err);
  }
}

export async function getOfflineDocuments(): Promise<DocumentRecord[]> {
  try {
    const db = await getIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction('documents', 'readonly');
      const store = tx.objectStore('documents');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}





// ----------------------------------------------------
// Student Profile Offline Cache
// ----------------------------------------------------
export async function saveOfflineProfile(profile: StudentProfile): Promise<void> {
  try {
    const db = await getIndexedDB();
    const tx = db.transaction('profile', 'readwrite');
    const store = tx.objectStore('profile');
    store.put(profile);
  } catch (err) {
    console.warn('Failed to cache profile in IndexedDB:', err);
  }
}

export async function getOfflineProfile(userId: string): Promise<StudentProfile | null> {
  try {
    const db = await getIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction('profile', 'readonly');
      const store = tx.objectStore('profile');
      const request = store.get(userId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// ----------------------------------------------------
// Offline Action Queue (Rural Sync Pipeline)
// ----------------------------------------------------
export interface PendingOfflineAction {
  id: string;
  type: string;
  payload: any;
  timestamp: string;
}

export async function queueOfflineAction(action: PendingOfflineAction): Promise<void> {
  try {
    const db = await getIndexedDB();
    const tx = db.transaction('pending_sync', 'readwrite');
    const store = tx.objectStore('pending_sync');
    store.put(action);
  } catch (err) {
    console.warn('Failed to queue offline action:', err);
  }
}

export async function getPendingOfflineActions(): Promise<PendingOfflineAction[]> {
  try {
    const db = await getIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction('pending_sync', 'readonly');
      const store = tx.objectStore('pending_sync');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function removePendingOfflineAction(id: string): Promise<void> {
  try {
    const db = await getIndexedDB();
    const tx = db.transaction('pending_sync', 'readwrite');
    const store = tx.objectStore('pending_sync');
    store.delete(id);
  } catch (err) {
    console.warn('Failed to delete pending action:', err);
  }
}

// ----------------------------------------------------
// Automatic Rural Background Sync Helper
// ----------------------------------------------------
export async function syncPendingOfflineActions(): Promise<{ syncedCount: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { syncedCount: 0 };
  }

  try {
    const pending = await getPendingOfflineActions();
    let syncedCount = 0;

    for (const action of pending) {
      if (action.type === 'SUBMIT_REVIEW') {
        try {
          await fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action.payload),
          });
          await removePendingOfflineAction(action.id);
          syncedCount++;
        } catch {
          // Still offline, will retry later
        }
      }
    }

    return { syncedCount };
  } catch {
    return { syncedCount: 0 };
  }
}
