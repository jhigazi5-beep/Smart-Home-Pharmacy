/**
 * Firebase Cloud Messaging (FCM) & Web Push / OneSignal Integration
 * Manages push notification registration, token exchange, and cloud synchronization
 */

import { FirebaseConfig, DoseSchedule } from '../types/pharmacy';
import { StorageService } from './storage';

const FCM_TOKEN_STORAGE_KEY = 'sph_fcm_token_v1';
const FCM_VAPID_STORAGE_KEY = 'sph_fcm_vapid_key_v1';

let cachedMessaging: any = null;
let cachedFirebaseApp: any = null;

export function getStoredFcmToken(): string | null {
  try {
    return localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredFcmToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
    }
  } catch {}
}

export function getStoredVapidKey(): string | null {
  try {
    const fromConfig = StorageService.getFirebaseConfig()?.vapidKey;
    if (fromConfig) return fromConfig;
    return localStorage.getItem(FCM_VAPID_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredVapidKey(key: string): void {
  try {
    localStorage.setItem(FCM_VAPID_STORAGE_KEY, key);
  } catch {}
}

/**
 * Initializes Firebase App instance safely
 */
export async function getFirebaseApp(config?: FirebaseConfig | null) {
  if (cachedFirebaseApp) return cachedFirebaseApp;

  const activeConfig = config || StorageService.getFirebaseConfig();
  if (!activeConfig || !activeConfig.apiKey || !activeConfig.projectId) {
    return null;
  }

  try {
    const { initializeApp, getApps } = await import('firebase/app');
    const existing = getApps();
    if (existing.length > 0) {
      cachedFirebaseApp = existing[0];
    } else {
      cachedFirebaseApp = initializeApp(activeConfig);
    }
    return cachedFirebaseApp;
  } catch (err) {
    console.warn('Failed to initialize Firebase app for FCM:', err);
    return null;
  }
}

/**
 * Initializes and retrieves Firebase Messaging instance
 */
export async function getFirebaseMessagingInstance(config?: FirebaseConfig | null) {
  if (typeof window === 'undefined') return null;
  if (cachedMessaging) return cachedMessaging;

  try {
    const { getMessaging, isSupported } = await import('firebase/messaging');
    const supported = await isSupported();
    if (!supported) {
      console.info('FCM isSupported returned false (browser/environment does not support Web Push)');
      return null;
    }

    const app = await getFirebaseApp(config);
    if (!app) return null;

    cachedMessaging = getMessaging(app);
    return cachedMessaging;
  } catch (err) {
    console.warn('FCM getMessaging initialization failed:', err);
    return null;
  }
}

/**
 * Registers device FCM token and syncs schedule metadata to Firestore
 */
export async function registerFcmToken(customVapidKey?: string): Promise<{
  success: boolean;
  token?: string;
  error?: string;
}> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Environment does not support window' };
  }

  const vapidKey =
    customVapidKey ||
    getStoredVapidKey() ||
    StorageService.getFirebaseConfig()?.vapidKey;

  try {
    const messaging = await getFirebaseMessagingInstance();
    if (!messaging) {
      // Check if OneSignal is available
      if ((window as any).OneSignal) {
        try {
          await (window as any).OneSignal.Notifications?.requestPermission();
        } catch {}
      }
      return {
        success: false,
        error: 'محرك Firebase Messaging غير مدعوم في هذا المتصفح أو لم يتم ضبط مفاتيح Firebase.',
      };
    }

    const { getToken } = await import('firebase/messaging');

    // Make sure service worker is ready
    let swRegistration: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      try {
        swRegistration = (await navigator.serviceWorker.getRegistration()) || undefined;
      } catch {}
    }

    const tokenOptions: { vapidKey?: string; serviceWorkerRegistration?: ServiceWorkerRegistration } = {};
    if (vapidKey) tokenOptions.vapidKey = vapidKey;
    if (swRegistration) tokenOptions.serviceWorkerRegistration = swRegistration;

    const currentToken = await getToken(messaging, tokenOptions);

    if (currentToken) {
      setStoredFcmToken(currentToken);
      if (vapidKey) setStoredVapidKey(vapidKey);

      // Synchronize token to Firestore if Firebase is connected
      await syncTokenToFirestore(currentToken);

      return { success: true, token: currentToken };
    } else {
      return {
        success: false,
        error: 'لم نتمكن من الحصول على مفتاح FCM Token من Firebase. تأكد من إعطاء إذن الإشعارات.',
      };
    }
  } catch (err: any) {
    console.warn('Error during registerFcmToken:', err);
    return {
      success: false,
      error: err?.message || 'خطأ أثناء تسجيل إشعارات FCM السحابية.',
    };
  }
}

/**
 * Saves FCM Token and active schedules metadata to Firestore
 */
export async function syncTokenToFirestore(token: string): Promise<void> {
  try {
    const app = await getFirebaseApp();
    if (!app) return;

    const { getFirestore, doc, setDoc } = await import('firebase/firestore');
    const { getAuth } = await import('firebase/auth');

    const db = getFirestore(app);
    const auth = getAuth(app);
    const uid = auth.currentUser?.uid || 'guest_' + token.substring(0, 12);

    const schedules = StorageService.getSchedules().filter((s) => s.isActive);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    const deviceDocRef = doc(db, 'users', uid, 'devices', token);
    await setDoc(
      deviceDocRef,
      {
        token,
        timezone,
        userAgent: navigator.userAgent,
        updatedAt: new Date().toISOString(),
        activeSchedulesSummary: schedules.map((s) => ({
          id: s.id,
          medicationName: s.medicationName,
          time: s.time,
          doseAmount: s.doseAmount,
        })),
        platform: 'web_pwa',
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Error syncing token to Firestore:', err);
  }
}

/**
 * Sets up foreground FCM push listener
 */
export async function setupFcmForegroundListener(
  onNotificationReceived: (payload: any) => void
): Promise<(() => void) | null> {
  if (typeof window === 'undefined') return null;

  try {
    const messaging = await getFirebaseMessagingInstance();
    if (!messaging) return null;

    const { onMessage } = await import('firebase/messaging');
    const unsubscribe = onMessage(messaging, (payload) => {
      onNotificationReceived(payload);
    });

    return unsubscribe;
  } catch (err) {
    console.warn('Error setting up FCM foreground listener:', err);
    return null;
  }
}
