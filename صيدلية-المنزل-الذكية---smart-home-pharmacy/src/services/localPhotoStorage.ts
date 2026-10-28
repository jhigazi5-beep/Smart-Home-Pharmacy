/**
 * Local-Only Image Storage using browser IndexedDB.
 * Compresses images client-side via HTML5 Canvas.
 * Strictly local to the device — NEVER uploaded to cloud.
 */

const DB_NAME = 'SmartHomePharmacyImages';
const DB_VERSION = 1;
const STORE_NAME = 'local_photos';

function openPhotoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db: IDBDatabase = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Compresses image file to max 800px and 0.75 JPEG quality using Canvas
 */
export async function compressImage(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDimension = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(e.target?.result as string);
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
        resolve(compressedDataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Stores compressed photo in IndexedDB and returns a unique localImageId
 */
export async function saveLocalPhoto(fileOrBlob: File | Blob): Promise<string> {
  const compressedDataUrl = await compressImage(fileOrBlob);
  const id = 'img_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

  const db = await openPhotoDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const item = { id, dataUrl: compressedDataUrl, createdAt: new Date().toISOString() };
    const request = store.put(item);

    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieves compressed photo from IndexedDB by localImageId
 */
export async function getLocalPhoto(id?: string | null): Promise<string | null> {
  if (!id) return null;
  try {
    const db = await openPhotoDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result ? request.result.dataUrl : null);
      };
      request.onerror = () => resolve(null);
    });
  } catch (err) {
    console.error('Failed to read from IndexedDB photo storage:', err);
    return null;
  }
}

/**
 * Deletes photo by ID
 */
export async function deleteLocalPhoto(id?: string | null): Promise<void> {
  if (!id) return;
  try {
    const db = await openPhotoDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.error('Failed to delete photo from IndexedDB:', err);
  }
}

/**
 * Wipes all stored photos (used on app reset)
 */
export async function clearAllLocalPhotos(): Promise<void> {
  try {
    const db = await openPhotoDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.error('Failed to clear photo store:', err);
  }
}
