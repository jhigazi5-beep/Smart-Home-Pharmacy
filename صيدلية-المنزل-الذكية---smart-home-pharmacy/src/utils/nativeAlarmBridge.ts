/**
 * Native OS & Android Clock Alarm Bridge
 * Supports:
 * 1. Android Native Clock Alarm Intent (android.intent.action.SET_ALARM)
 * 2. Capacitor LocalNotifications plugin (OS AlarmManager while idle)
 * 3. Android WebView Java Interface (window.Android / window.AndroidBridge)
 * 4. Universal iCalendar (.ics) Alarm fallback with recurring VALARM
 */

import { DoseSchedule } from '../types/pharmacy';

/**
 * Parses time string (e.g. "08:30" or "8:5") into hour and minute integers
 */
export function parseTimeToHourMinute(timeStr: string): { hour: number; minute: number } {
  if (!timeStr || typeof timeStr !== 'string') {
    return { hour: 8, minute: 0 };
  }
  const parts = timeStr.trim().split(':');
  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);
  return {
    hour: isNaN(hour) ? 8 : Math.min(23, Math.max(0, hour)),
    minute: isNaN(minute) ? 0 : Math.min(59, Math.max(0, minute)),
  };
}

/**
 * Builds the standard Android Clock Intent URL
 * This allows 1-click setting of the phone's native Clock app alarm
 */
export function buildAndroidClockIntentUrl(hour: number, minute: number, message: string): string {
  const safeMessage = encodeURIComponent(message || 'موعد الدواء');
  return `intent:#Intent;action=android.intent.action.SET_ALARM;i.android.intent.extra.alarm.HOUR=${hour};i.android.intent.extra.alarm.MINUTES=${minute};S.android.intent.extra.alarm.MESSAGE=${safeMessage};B.android.intent.extra.alarm.SKIP_UI=false;end`;
}

/**
 * Triggers the native Android Clock app to register an alarm
 */
export function triggerAndroidClockAlarm(hour: number, minute: number, message: string): boolean {
  if (typeof window === 'undefined') return false;

  const intentUrl = buildAndroidClockIntentUrl(hour, minute, message);

  try {
    // Attempt navigation to Android Intent URI
    const link = document.createElement('a');
    link.href = intentUrl;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 1000);
    return true;
  } catch (err) {
    console.warn('Could not launch Android Clock Intent:', err);
    return false;
  }
}

/**
 * Generates an iCalendar (.ics) file content with daily recurrence and alarm
 */
export function generateAlarmIcsContent(
  hour: number,
  minute: number,
  title: string,
  description: string
): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hStr = hour.toString().padStart(2, '0');
  const mStr = minute.toString().padStart(2, '0');

  const dtStart = `${year}${month}${day}T${hStr}${mStr}00`;
  const dtStamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const uid = `med-alarm-${Date.now()}@smart-home-pharmacy`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//صيدلية المنزل الذكية//Smart Home Pharmacy//AR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `SUMMARY:⏰ ${title}`,
    `DESCRIPTION:${description}`,
    'RRULE:FREQ=DAILY;INTERVAL=1',
    'BEGIN:VALARM',
    'TRIGGER:-PT0M',
    'ACTION:AUDIO',
    'DESCRIPTION:موعد تناول الدواء',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Triggers download of the .ics alarm calendar event
 */
export function downloadAlarmIcs(
  hour: number,
  minute: number,
  title: string,
  description: string
): void {
  if (typeof window === 'undefined') return;

  const content = generateAlarmIcsContent(hour, minute, title, description);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `alarm_${hour.toString().padStart(2, '0')}_${minute.toString().padStart(2, '0')}.ics`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Builds direct Google Calendar web URL with recurring daily RRULE
 * pre-filled with medication name, dose, and exact timing
 */
export function buildGoogleCalendarUrl(
  hour: number,
  minute: number,
  title: string,
  details: string
): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hStr = hour.toString().padStart(2, '0');
  const mStr = minute.toString().padStart(2, '0');

  const startDt = `${year}${month}${day}T${hStr}${mStr}00`;
  const endMinute = (minute + 15) % 60;
  const endHour = (hour + Math.floor((minute + 15) / 60)) % 24;
  const endHStr = endHour.toString().padStart(2, '0');
  const endMStr = endMinute.toString().padStart(2, '0');
  const endDt = `${year}${month}${day}T${endHStr}${endMStr}00`;

  const params = new URLSearchParams();
  params.set('action', 'TEMPLATE');
  params.set('text', `⏰ ${title}`);
  params.set('details', details);
  params.set('dates', `${startDt}/${endDt}`);
  params.set('recur', 'RRULE:FREQ=DAILY');

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Triggers both Android Clock Intent and iCalendar (.ics) with VALARM download
 * to guarantee clock alerts even if app is completely closed or offline.
 */
export function triggerAndroidClockAndIcsAlarm(
  hour: number,
  minute: number,
  title: string,
  description: string
): { androidTriggered: boolean } {
  const androidTriggered = triggerAndroidClockAlarm(hour, minute, title);
  try {
    downloadAlarmIcs(hour, minute, title, description);
  } catch (err) {
    console.warn('ICS download error:', err);
  }
  return { androidTriggered };
}

/**
 * Stable integer hash for string IDs (required by Capacitor notification IDs)
 */
export function stringToNumericId(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash) % 2147483647 || 1;
}

/**
 * Synchronizes active schedules to Native OS Alarms
 * Supports:
 * - Capacitor LocalNotifications (repeating daily OS alarms with allowWhileIdle: true)
 * - AndroidBridge / window.Android Java bridge in custom WebViews
 */
export async function syncNativeOSAlarms(
  schedules: DoseSchedule[]
): Promise<{ capacitorCount: number; androidBridge: boolean; error?: string }> {
  let capacitorCount = 0;
  let androidBridge = false;

  if (typeof window === 'undefined') {
    return { capacitorCount: 0, androidBridge: false };
  }

  const activeSchedules = schedules.filter((s) => s.isActive);

  // 1. Check for Capacitor LocalNotifications plugin
  const capacitor = (window as any).Capacitor;
  const localNotifications = capacitor?.Plugins?.LocalNotifications;

  if (localNotifications) {
    try {
      // Request permission if not already granted
      if (typeof localNotifications.requestPermissions === 'function') {
        await localNotifications.requestPermissions();
      }

      // Create high-importance channel on Android
      if (typeof localNotifications.createChannel === 'function') {
        try {
          await localNotifications.createChannel({
            id: 'medication_reminders',
            name: 'منبهات الأدوية والجرعات',
            description: 'تنبيهات صوتية واهتزاز عالية الأولوية لمواعيد تناول الدواء',
            importance: 5,
            visibility: 1,
            vibration: true,
          });
        } catch (chErr) {
          console.warn('Capacitor channel creation warning:', chErr);
        }
      }

      // Cancel all existing pending notifications before re-scheduling
      const pending = await localNotifications.getPending?.();
      if (pending?.notifications?.length > 0) {
        await localNotifications.cancel({ notifications: pending.notifications });
      }

      // Prepare notifications array
      const notificationsToSchedule = activeSchedules.map((sch) => {
        const { hour, minute } = parseTimeToHourMinute(sch.time);
        const numId = stringToNumericId(sch.id);

        return {
          id: numId,
          title: `⏰ موعد دواء: ${sch.medicationName}`,
          body: `المريض: ${sch.patientName || 'الجرعة المحددة'} • الكمية: ${sch.doseAmount} وحدة`,
          schedule: {
            on: {
              hour,
              minute,
            },
            allowWhileIdle: true,
            repeats: true,
          },
          channelId: 'medication_reminders',
          smallIcon: 'ic_stat_medication',
          extra: {
            scheduleId: sch.id,
            medicationId: sch.medicationId,
          },
        };
      });

      if (notificationsToSchedule.length > 0) {
        await localNotifications.schedule({ notifications: notificationsToSchedule });
        capacitorCount = notificationsToSchedule.length;
      }
    } catch (capErr: any) {
      console.warn('Error syncing Capacitor LocalNotifications:', capErr);
    }
  }

  // 2. Check for Android WebView Interface (window.Android or window.AndroidBridge)
  const androidObj = (window as any).AndroidBridge || (window as any).Android;
  if (androidObj) {
    try {
      if (typeof androidObj.syncAlarms === 'function') {
        androidObj.syncAlarms(
          JSON.stringify(
            activeSchedules.map((s) => {
              const { hour, minute } = parseTimeToHourMinute(s.time);
              return {
                id: s.id,
                medicationName: s.medicationName,
                patientName: s.patientName,
                hour,
                minute,
                doseAmount: s.doseAmount,
              };
            })
          )
        );
        androidBridge = true;
      } else if (typeof androidObj.scheduleAlarm === 'function') {
        for (const sch of activeSchedules) {
          const { hour, minute } = parseTimeToHourMinute(sch.time);
          androidObj.scheduleAlarm(
            sch.id,
            hour,
            minute,
            `⏰ موعد دواء: ${sch.medicationName}`,
            `المريض: ${sch.patientName || ''} • الجرعة: ${sch.doseAmount}`
          );
        }
        androidBridge = true;
      }
    } catch (andErr) {
      console.warn('Error syncing Android WebView Interface:', andErr);
    }
  }

  return { capacitorCount, androidBridge };
}
