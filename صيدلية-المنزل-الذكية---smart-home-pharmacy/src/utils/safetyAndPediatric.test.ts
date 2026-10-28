import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePediatricDose } from './pediatricCalculator.ts';
import { checkMedicationSafety } from './drugSafetyChecker.ts';
import { calculateExpiryStatus } from './dateAndHijri.ts';
import { Patient, Medication } from '../types/pharmacy.ts';

test('pediatric calculator accurately calculates ml for standard 120mg/5ml paracetamol', () => {
  // 10 kg child: target 150 mg. Concentration: 120mg / 5ml (24 mg/ml). 150 / 24 = 6.25 -> 6.3 ml
  const res = calculatePediatricDose(10, 'paracetamol-120');
  assert.equal(res.doseMg, 150);
  assert.equal(res.doseMl, 6.3);
  assert.equal(res.minIntervalHours, 4);
});

test('pediatric calculator warns on low weight (< 3kg)', () => {
  const res = calculatePediatricDose(2.5, 'paracetamol-120');
  assert.ok(res.warning?.includes('3 كجم'));
});

test('drug safety checker catches Penicillin allergy with Augmentin', () => {
  const patient: Patient = {
    id: 'p1',
    name: 'أحمد',
    relation: 'ابن',
    age: 12,
    healthStatus: 'stable',
    chronicDiseases: [],
    allergies: ['حساسية شديدة من البنسلين'],
    createdAt: new Date().toISOString()
  };

  const result = checkMedicationSafety(
    { tradeName: 'أوجمنتين 1 جم', scientificName: 'Amoxicillin + Clavulanic Acid' },
    patient,
    []
  );

  assert.equal(result.hasConflict, true);
  assert.equal(result.severity, 'danger');
  assert.ok(result.reasons[0].includes('البنسلين'));
});

test('drug safety checker catches NSAID and Blood Thinner lethal interaction', () => {
  const patient: Patient = {
    id: 'p2',
    name: 'الوالد',
    relation: 'أب',
    age: 68,
    healthStatus: 'chronic',
    chronicDiseases: ['أمراض القلب والجلطات'],
    allergies: [],
    createdAt: new Date().toISOString()
  };

  const activeMeds: Medication[] = [
    {
      id: 'm1',
      tradeName: 'ماريفان 5 مجم (Warfarin)',
      scientificName: 'Warfarin Sodium',
      category: 'قلب وأوعية',
      currentQuantity: 30,
      lowStockThreshold: 5,
      expiryDate: '2027-01-01',
      isChronic: true,
      foodTiming: 'after_meal',
      createdAt: new Date().toISOString()
    }
  ];

  const result = checkMedicationSafety(
    { tradeName: 'فولتارين مسكن (Voltaren)', scientificName: 'Diclofenac Potassium' },
    patient,
    activeMeds
  );

  assert.equal(result.hasConflict, true);
  assert.equal(result.severity, 'danger');
  assert.ok(result.reasons.some(r => r.includes('نزيف')));
});

test('calculateExpiryStatus detects expired and expiring_soon correctly', () => {
  const past = new Date();
  past.setDate(past.getDate() - 5);
  const pastStr = past.toISOString().split('T')[0];
  const resPast = calculateExpiryStatus(pastStr);
  assert.equal(resPast.status, 'expired');

  const soon = new Date();
  soon.setDate(soon.getDate() + 10);
  const soonStr = soon.toISOString().split('T')[0];
  const resSoon = calculateExpiryStatus(soonStr);
  assert.equal(resSoon.status, 'expiring_soon');
});

test('Notification status safely initializes in SSR/headless environments without throwing', async () => {
  const { getNotificationEngineStatus, isAndroidWebViewContainer } = await import('../services/notificationService.ts');
  const status = getNotificationEngineStatus();
  assert.ok(typeof status.enabled === 'boolean');
  assert.ok(['system_granted', 'apk_inapp_mode', 'denied'].includes(status.mode));
  assert.equal(typeof isAndroidWebViewContainer(), 'boolean');
});

test('Native Alarm Bridge correctly parses time strings and bounds values', async () => {
  const { parseTimeToHourMinute } = await import('./nativeAlarmBridge.ts');
  assert.deepEqual(parseTimeToHourMinute('08:30'), { hour: 8, minute: 30 });
  assert.deepEqual(parseTimeToHourMinute('14:05'), { hour: 14, minute: 5 });
  assert.deepEqual(parseTimeToHourMinute('00:00'), { hour: 0, minute: 0 });
  assert.deepEqual(parseTimeToHourMinute('23:59'), { hour: 23, minute: 59 });
  // Bounds fallback check
  assert.deepEqual(parseTimeToHourMinute('25:99'), { hour: 23, minute: 59 });
  assert.deepEqual(parseTimeToHourMinute(''), { hour: 8, minute: 0 });
});

test('buildAndroidClockIntentUrl generates exact Android Intent URI syntax', async () => {
  const { buildAndroidClockIntentUrl } = await import('./nativeAlarmBridge.ts');
  const uri = buildAndroidClockIntentUrl(8, 30, 'دواء كونكور 5 مجم');
  assert.ok(uri.startsWith('intent:#Intent;action=android.intent.action.SET_ALARM'));
  assert.ok(uri.includes('i.android.intent.extra.alarm.HOUR=8'));
  assert.ok(uri.includes('i.android.intent.extra.alarm.MINUTES=30'));
  assert.ok(uri.includes('B.android.intent.extra.alarm.SKIP_UI=false;end'));
  assert.ok(uri.includes(encodeURIComponent('دواء كونكور 5 مجم')));
});

test('generateAlarmIcsContent outputs valid iCalendar with daily recurrence and VALARM', async () => {
  const { generateAlarmIcsContent } = await import('./nativeAlarmBridge.ts');
  const ics = generateAlarmIcsContent(14, 0, 'دواء جلوكوفاج', 'جرعة ما بعد الأكل');
  assert.ok(ics.includes('BEGIN:VCALENDAR'));
  assert.ok(ics.includes('BEGIN:VEVENT'));
  assert.ok(ics.includes('RRULE:FREQ=DAILY;INTERVAL=1'));
  assert.ok(ics.includes('BEGIN:VALARM'));
  assert.ok(ics.includes('TRIGGER:-PT0M'));
  assert.ok(ics.includes('ACTION:AUDIO'));
  assert.ok(ics.includes('END:VCALENDAR'));
});

test('stringToNumericId produces deterministic positive integers', async () => {
  const { stringToNumericId } = await import('./nativeAlarmBridge.ts');
  const id1 = stringToNumericId('sch_123456');
  const id2 = stringToNumericId('sch_123456');
  const id3 = stringToNumericId('sch_different');
  assert.equal(id1, id2);
  assert.ok(id1 > 0);
  assert.notEqual(id1, id3);
});

test('buildGoogleCalendarUrl generates correct URL with recurrence and prefilled fields', async () => {
  const { buildGoogleCalendarUrl } = await import('./nativeAlarmBridge.ts');
  const url = buildGoogleCalendarUrl(8, 30, 'بنادول إكسترا', 'تناول قرص واحد بعد الإفطار');
  assert.ok(url.startsWith('https://calendar.google.com/calendar/render?'));
  assert.ok(url.includes('action=TEMPLATE'));
  assert.ok(url.includes('recur=RRULE%3AFREQ%3DDAILY'));
  assert.ok(url.includes('text=%E2%8F%B0+'));
});

test('isInsideIframe executes safely in non-browser environment without throwing', async () => {
  const { isInsideIframe } = await import('../services/notificationService.ts');
  const result = isInsideIframe();
  assert.equal(typeof result, 'boolean');
});



