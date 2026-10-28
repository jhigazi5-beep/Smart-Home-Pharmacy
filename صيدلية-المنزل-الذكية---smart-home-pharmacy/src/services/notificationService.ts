/**
 * Multi-layered Universal Notification & Alarm Engine
 * Supports Modern Web, PWA, iOS Safari, Android APK WebViews, and Sandboxed iFrames.
 */

import { playMedicalChime, playLoudMedicalSiren, startAlarmLoop, stopAlarmLoop, initAudioContext, startAudioKeepAlive } from './alarmSound';
import { registerFcmToken, getStoredFcmToken } from './fcmService';
import { syncNativeOSAlarms } from '../utils/nativeAlarmBridge';
import { StorageService } from './storage';
import { DoseSchedule } from '../types/pharmacy';

export type NotificationEngineMode = 'system_granted' | 'apk_inapp_mode' | 'denied';

const NOTIF_STORAGE_KEY = 'sph_notifications_enabled_v2';
const NOTIF_MODE_KEY = 'sph_notifications_mode_v2';

export interface NotificationStatus {
  enabled: boolean;
  mode: NotificationEngineMode;
  permission: NotificationPermission | 'unsupported';
  isAndroidWebView: boolean;
  isIframe: boolean;
  hasServiceWorker: boolean;
  wakeLockSupported: boolean;
  hasFcmToken: boolean;
  fcmToken?: string | null;
  capacitorDetected: boolean;
  androidBridgeDetected: boolean;
}

let activeWakeLock: any = null;

/**
 * Checks if running inside an iframe (e.g. AI Studio sandboxed preview or embedded wrapper)
 */
export function isInsideIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Detects if running inside an Android APK WebView or wrapper
 */
export function isAndroidWebViewContainer(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = (navigator.userAgent || '').toLowerCase();
  const isAndroid = userAgent.includes('android');
  const isWebView =
    userAgent.includes('wv') ||
    userAgent.includes('version/') ||
    !!(window as any).Android ||
    !!(window as any).AndroidBridge ||
    !!(window as any).ReactNativeWebView ||
    !!(window as any).Capacitor;
  return isAndroid && isWebView;
}

/**
 * Checks current notification engine status
 */
export function getNotificationEngineStatus(): NotificationStatus {
  if (typeof window === 'undefined') {
    return {
      enabled: false,
      mode: 'denied',
      permission: 'unsupported',
      isAndroidWebView: false,
      hasServiceWorker: false,
      wakeLockSupported: false,
      hasFcmToken: false,
      fcmToken: null,
      capacitorDetected: false,
      androidBridgeDetected: false,
    };
  }

  const isAndroidWebView = isAndroidWebViewContainer();
  const hasNotif = 'Notification' in window;
  const permission: NotificationPermission | 'unsupported' = hasNotif
    ? Notification.permission
    : 'unsupported';

  const storedEnabled = localStorage.getItem(NOTIF_STORAGE_KEY) === 'true';
  const storedMode = localStorage.getItem(NOTIF_MODE_KEY) as NotificationEngineMode | null;
  const fcmToken = getStoredFcmToken();

  const capacitorDetected = !!(window as any).Capacitor?.Plugins?.LocalNotifications;
  const androidBridgeDetected = !!((window as any).AndroidBridge || (window as any).Android);

  let mode: NotificationEngineMode = storedMode || 'apk_inapp_mode';
  if (permission === 'granted') {
    mode = 'system_granted';
  } else if (permission === 'denied' && !isAndroidWebView) {
    mode = 'denied';
  } else if (storedEnabled) {
    mode = 'apk_inapp_mode';
  }

  return {
    enabled: storedEnabled || permission === 'granted',
    mode,
    permission,
    isAndroidWebView,
    isIframe: isInsideIframe(),
    hasServiceWorker: 'serviceWorker' in navigator,
    wakeLockSupported: 'wakeLock' in navigator,
    hasFcmToken: !!fcmToken,
    fcmToken,
    capacitorDetected,
    androidBridgeDetected,
  };
}

/**
 * Request Screen WakeLock to keep screen and audio alive for dose alerts
 */
export async function requestScreenWakeLock(): Promise<boolean> {
  if ('wakeLock' in navigator) {
    try {
      activeWakeLock = await (navigator as any).wakeLock.request('screen');
      activeWakeLock.addEventListener('release', () => {
        activeWakeLock = null;
      });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Registers or retrieves active ServiceWorker for push/local notifications
 */
/**
 * Registers or retrieves active ServiceWorker for push/local notifications
 */
async function getOrRegisterServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  try {
    // Check if already registered
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing) return existing;

    // Register PWA service worker with safety timeout
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return reg;
  } catch (err) {
    console.warn('Standard sw.js registration failed, trying inline blob fallback:', err);
    try {
      // Dynamic inline fallback service worker for restricted hosting/sandboxes
      const swCode = `
        self.addEventListener('install', e => self.skipWaiting());
        self.addEventListener('activate', e => self.clients.claim());
        self.addEventListener('notificationclick', e => {
          e.notification.close();
          e.waitUntil(clients.matchAll({ type: 'window' }).then(clientsList => {
            if (clientsList.length > 0) return clientsList[0].focus();
            return clients.openWindow('/');
          }));
        });
      `;
      const blob = new Blob([swCode], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);
      const reg = await navigator.serviceWorker.register(blobUrl);
      return reg;
    } catch (blobErr) {
      console.warn('Inline SW registration error:', blobErr);
      return null;
    }
  }
}

/**
 * Robust non-blocking permission requester with safety timeout
 * Prevents app freeze in Android WebViews and automated browsers
 */
async function requestNotificationPermissionWithTimeout(timeoutMs = 1200): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(Notification.permission === 'granted');
      }
    }, timeoutMs);

    const onResult = (status: string) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(status === 'granted');
      }
    };

    try {
      let promise: any;
      try {
        promise = Notification.requestPermission(onResult);
      } catch {
        // Some browsers only support Promise syntax
      }

      if (promise && typeof promise.then === 'function') {
        promise.then(onResult).catch(() => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve(false);
          }
        });
      }
    } catch {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(false);
      }
    }
  });
}

/**
 * Universal Permission Handler & Engine Activation
 * Gracefully breaks out of iframe sandbox limitations and unlocks audio/vibration
 */
export async function enableNotificationsAndAudio(): Promise<{
  success: boolean;
  mode: NotificationEngineMode;
  message: string;
  isIframe: boolean;
  fcmToken?: string;
}> {
  // Step A: Immediately unlock Web Audio API & Vibration on this exact user click gesture
  initAudioContext();
  startAudioKeepAlive();
  playMedicalChime();
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([300, 100, 300]);
    } catch {}
  }
  requestScreenWakeLock().catch(() => {});

  const inIframe = isInsideIframe();

  // Sync existing schedules to Native OS Alarms (Capacitor / Android Bridge)
  const currentSchedules = StorageService.getSchedules();
  syncNativeOSAlarms(currentSchedules).catch((e) => console.warn('Sync OS alarms error:', e));

  // Step B: Check permissions
  // In sandboxed iframes, Notification.requestPermission() is blocked or rejected without prompt.
  let granted = false;
  if (!inIframe) {
    granted = await requestNotificationPermissionWithTimeout(1200);
  } else {
    // Attempt rapid check in case host allowed notifications
    try {
      granted = await requestNotificationPermissionWithTimeout(400);
    } catch {
      granted = false;
    }
  }

  // Step C & D: Activate engine and persist settings
  if (granted) {
    // Mode: System Granted
    localStorage.setItem(NOTIF_STORAGE_KEY, 'true');
    localStorage.setItem(NOTIF_MODE_KEY, 'system_granted');

    let fcmTokenStr: string | undefined;
    try {
      const fcmRes = await registerFcmToken();
      if (fcmRes.success && fcmRes.token) {
        fcmTokenStr = fcmRes.token;
      }
    } catch (fcmErr) {
      console.warn('Background FCM registration skipped:', fcmErr);
    }

    sendPhoneNotification({
      title: '✅ تم تفعيل تنبيهات صيدلية المنزل الذكية',
      body: 'ستصلك إشعارات ومنبهات الأدوية في مواعيدها المحددة بنجاح.',
    }).catch(() => {});

    return {
      success: true,
      mode: 'system_granted',
      isIframe: inIframe,
      message: fcmTokenStr
        ? 'تم تفعيل إشعارات الهاتف والربط مع خدمة الإشعارات السحابية FCM بنجاح!'
        : 'تم تفعيل إشعارات الهاتف بنجاح!',
      fcmToken: fcmTokenStr,
    };
  } else {
    // Mode: In-App Sound/Vibration Engine & Android APK WebView Mode
    localStorage.setItem(NOTIF_STORAGE_KEY, 'true');
    localStorage.setItem(NOTIF_MODE_KEY, 'apk_inapp_mode');

    // Notify Android native bridge if available
    try {
      if ((window as any).Android?.showNotification) {
        (window as any).Android.showNotification(
          'صيدلية المنزل الذكية',
          'تم تفعيل منبهات الأدوية بنجاح داخل التطبيق.'
        );
      }
      if ((window as any).ReactNativeWebView?.postMessage) {
        (window as any).ReactNativeWebView.postMessage(
          JSON.stringify({
            type: 'NOTIFICATION_ENABLED',
            title: 'صيدلية المنزل الذكية',
          })
        );
      }
    } catch {}

    return {
      success: true,
      mode: 'apk_inapp_mode',
      isIframe: inIframe,
      message: inIframe
        ? 'تم تفعيل نظام الرنين الصوتي والمنبه الذكي الداخلي بنجاح داخل هذا الإطار. الرنين الصوتي والاهتزاز يعملان الآن بكفاءة تامة!'
        : 'تم تفعيل نظام المنبه الصوتي والاهتزاز عالي الأولوية المدمج للعمل داخل التطبيق وهواتف أندرويد بنجاح.',
    };
  }
}

/**
 * Starts a 5-second persistent alarm ticker.
 * Uses an inline Web Worker if available (so ticks continue in background/throttled tabs),
 * with fallback to window.setInterval.
 */
export function startPersistentAlarmTicker(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  let worker: Worker | null = null;
  let intervalId: any = null;

  try {
    const swCode = `
      let timer = null;
      self.onmessage = function(e) {
        if (e.data === 'start') {
          if (timer) clearInterval(timer);
          timer = setInterval(function() {
            self.postMessage('tick');
          }, 5000);
        } else if (e.data === 'stop') {
          if (timer) clearInterval(timer);
        }
      };
    `;
    const blob = new Blob([swCode], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    worker = new Worker(blobUrl);
    worker.onmessage = () => {
      callback();
    };
    worker.postMessage('start');
  } catch {
    intervalId = setInterval(callback, 5000);
  }

  return () => {
    if (worker) {
      try {
        worker.postMessage('stop');
        worker.terminate();
      } catch {}
    }
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
}

/**
 * Universal helper to sync all medication schedules with Native OS Alarms and cloud tokens
 */
export async function syncAllMedicationAlarms(schedules?: DoseSchedule[]): Promise<void> {
  const activeSchedules = schedules || StorageService.getSchedules();
  try {
    await syncNativeOSAlarms(activeSchedules);
  } catch (err) {
    console.warn('Error in syncAllMedicationAlarms:', err);
  }
}


/**
 * Fires a system notification across ServiceWorker, Window Notification, or Native Bridge
 */
export async function sendPhoneNotification(options: {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
}): Promise<boolean> {
  const title = options.title;
  const notifOptions: NotificationOptions = {
    body: options.body,
    icon: options.icon || '/icon.svg',
    badge: options.badge || '/icon.svg',
    tag: options.tag || 'med-alert-' + Date.now(),
    vibrate: [300, 100, 300, 100, 400],
    requireInteraction: true,
    dir: 'rtl',
    lang: 'ar',
  } as any;

  // 1. Try Native Android Bridge
  try {
    if ((window as any).Android?.showNotification) {
      (window as any).Android.showNotification(title, options.body);
      return true;
    }
  } catch {}

  // 2. Try Service Worker ShowNotification
  if ('serviceWorker' in navigator) {
    try {
      const sw = await getOrRegisterServiceWorker();
      if (sw && typeof sw.showNotification === 'function') {
        await sw.showNotification(title, notifOptions);
        return true;
      }
    } catch (swErr) {
      console.warn('SW showNotification error:', swErr);
    }
  }

  // 3. Try standard window.Notification
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, notifOptions);
      return true;
    } catch (winErr) {
      console.warn('Window Notification error:', winErr);
    }
  }

  return false;
}

/**
 * Executes a full 5-second loud test of both the alarm sound, vibration and system notification
 */
export async function runTestAlertSequence(): Promise<void> {
  // 1. Play audio chime and loop for 5 seconds
  startAlarmLoop();
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([400, 150, 400, 150, 600]);
    } catch {}
  }

  // 2. Send test notification
  await sendPhoneNotification({
    title: '⏰ تجربة منبه صيدلية المنزل',
    body: 'صوت المنبه والاهتزاز يعملان بكفاءة تامة. حان موعد الجرعة التجريبية!',
  });

  // Stop test alarm after 5 seconds
  setTimeout(() => {
    stopAlarmLoop();
  }, 5000);
}
