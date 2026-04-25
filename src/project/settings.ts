const DB_NAME = 'tegne-settings';
const DB_VERSION = 1;
const STORE_NAME = 'settings';
const COMMON_FOLDER_KEY = 'commonFolderHandle';

export async function saveCommonFolderHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openSettingsDb();
  await putValue(db, COMMON_FOLDER_KEY, handle);
  db.close();
}

export async function loadCommonFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (!('indexedDB' in globalThis)) return null;

  const db = await openSettingsDb();
  const handle = await getValue<FileSystemDirectoryHandle>(db, COMMON_FOLDER_KEY);
  db.close();
  return handle ?? null;
}

export async function ensureReadPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const descriptor: FileSystemHandlePermissionDescriptor = { mode: 'read' };

  if (typeof handle.queryPermission === 'function') {
    const current = await handle.queryPermission(descriptor);
    if (current === 'granted') return true;
  }

  if (typeof handle.requestPermission === 'function') {
    return await handle.requestPermission(descriptor) === 'granted';
  }

  return true;
}

function openSettingsDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open settings database'));
  });
}

function putValue(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error(`Could not save setting "${key}"`));
  });
}

function getValue<T>(db: IDBDatabase, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error ?? new Error(`Could not read setting "${key}"`));
  });
}
