import React, { useState, useEffect } from 'react';
import {
  Patient,
  Medication,
  DoseSchedule,
  AdherenceLog,
  VaccinationRecord,
} from '../types/pharmacy';
import { getArabicGregorianDate, getArabicHijriDate, calculateExpiryStatus } from '../utils/dateAndHijri';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Bell,
  Download,
  Clock,
  Pill,
  AlertTriangle,
  Calendar,
  Sparkles,
  Bot,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronLeft,
  ShieldAlert,
  Syringe,
  Check,
} from 'lucide-react';

import { enableNotificationsAndAudio, NotificationEngineMode, getNotificationEngineStatus } from '../services/notificationService';

interface DashboardTabProps {
  patients: Patient[];
  medications: Medication[];
  schedules: DoseSchedule[];
  logs: AdherenceLog[];
  vaccinations: VaccinationRecord[];
  notificationsEnabled: boolean;
  onNotificationsStateChange: (enabled: boolean) => void;
  onShowNotificationModal: (mode: NotificationEngineMode, message: string) => void;
  onTakeDose: (schedule: DoseSchedule) => void;
  onSnoozeDose: (schedule: DoseSchedule) => void;
  onOpenAIPharmacist: () => void;
  onNavigateTab: (tab: any) => void;
  onOpenAddSchedule: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  patients,
  medications,
  schedules,
  logs,
  vaccinations,
  notificationsEnabled,
  onNotificationsStateChange,
  onShowNotificationModal,
  onTakeDose,
  onSnoozeDose,
  onOpenAIPharmacist,
  onNavigateTab,
  onOpenAddSchedule,
}) => {
  const { isInstallable, isInstalled, install, isIOS } = usePWAInstall();
  const [showNotificationBanner, setShowNotificationBanner] = useState<boolean>(true);
  const [isActivating, setIsActivating] = useState<boolean>(false);

  // Live ticking clock
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format real-time clock HH:mm:ss ص/م in Arabic
  const formatTimeParts = (date: Date) => {
    const hours24 = date.getHours();
    const hours12 = hours24 % 12 || 12;
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const ampm = hours24 >= 12 ? 'م' : 'ص';
    return {
      timeStr: `${hours12.toString().padStart(2, '0')} : ${minutes} : ${seconds}`,
      ampm,
    };
  };

  const timeParts = formatTimeParts(currentTime);
  const gregorianDateStr = getArabicGregorianDate(currentTime);
  const hijriDateStr = getArabicHijriDate(currentTime);

  // Robust Universal Notification & Audio Unlock Handler
  const handleEnableNotifications = async () => {
    setIsActivating(true);
    try {
      const res = await enableNotificationsAndAudio();
      onNotificationsStateChange(true);
      setShowNotificationBanner(false);
      onShowNotificationModal(res.mode, res.message);
    } catch (err) {
      console.error('Failed to enable notifications:', err);
    } finally {
      setIsActivating(false);
    }
  };

  // 2x2 Stats calculation
  const totalMedications = medications.length;
  const chronicMedications = medications.filter((m) => m.isChronic).length;
  const lowStockMeds = medications.filter((m) => m.currentQuantity <= m.lowStockThreshold);

  // Today's remaining doses calculation
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTakenIds = new Set(
    logs
      .filter((l) => l.status === 'taken' && l.timestamp.startsWith(todayStr))
      .map((l) => l.scheduleId)
  );

  const activeSchedules = schedules.filter((s) => s.isActive);
  const pendingDoses = activeSchedules.filter((s) => !todayTakenIds.has(s.id));

  // Early Expiry (< 30 days or expired)
  const expiringMeds = medications.filter((m) => {
    const exp = calculateExpiryStatus(m.expiryDate);
    return exp.status === 'expired' || exp.status === 'expiring_soon';
  });

  // Upcoming child vaccinations
  const upcomingVaccinations = vaccinations.filter((v) => v.status === 'upcoming');

  return (
    <div className="space-y-4 pb-20">
      {/* 1. Orange Gradient Notification Banner */}
      {showNotificationBanner && !notificationsEnabled && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-4 text-white shadow-md shadow-orange-500/20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-white animate-bounce" />
              </div>
              <div>
                <h4 className="text-sm font-bold leading-tight">
                  تفعيل تنبيهات الأدوية والمواعيد في الخلفية
                </h4>
                <p className="text-xs text-amber-100 mt-0.5">
                  احصل على صوت المنبه واهتزاز الهاتف وإشعارات فورية عند حلول موعد كل جرعة
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleEnableNotifications}
                disabled={isActivating}
                className="px-3.5 py-1.5 rounded-xl bg-white text-orange-700 hover:bg-orange-50 disabled:opacity-75 font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer whitespace-nowrap"
              >
                {isActivating ? 'جاري التفعيل...' : 'تفعيل التنبيهات الآن'}
              </button>
              <button
                onClick={() => setShowNotificationBanner(false)}
                className="p-1.5 text-white/80 hover:text-white rounded-lg transition cursor-pointer"
                aria-label="إغلاق التنبيه"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Teal Green Gradient PWA Install Card */}
      {!isInstalled && (isInstallable || isIOS) && (
        <div className="rounded-2xl bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-700 p-4 text-white shadow-md shadow-teal-900/20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                <Download className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-bold flex items-center gap-1.5">
                  <span>تثبيت صيدلية المنزل على شاشة هاتفك</span>
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                </h4>
                <p className="text-xs text-teal-100 mt-0.5">
                  يعمل كتطبيق أصلي سريع بدون إنترنت ويوفر وصولاً فورياً
                </p>
              </div>
            </div>

            <button
              onClick={install}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer whitespace-nowrap"
            >
              تثبيت التطبيق
            </button>
          </div>
        </div>
      )}

      {/* 3. Dark Teal Hero Live Clock Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#063a36] via-[#094844] to-[#042f2c] p-5 sm:p-6 text-white shadow-xl shadow-teal-950/25 border border-teal-800/40">
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-teal-800/80 text-teal-200 border border-teal-700/60 shadow-2xs">
              ✨ رعاية صحية عائلية متكاملة وإدارة ذكية للأدوية
            </span>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              صيدلية المنزل الذكية
            </h2>

            {/* Dates */}
            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-teal-200/90 font-medium">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-teal-400" />
                {gregorianDateStr}
              </span>
              <span className="text-teal-600">•</span>
              <span className="text-amber-200 font-semibold">{hijriDateStr}</span>
            </div>
          </div>

          {/* Real-time Ticking Digital Clock Box */}
          <div className="bg-[#032321]/80 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-teal-700/50 flex flex-col items-center justify-center shadow-inner min-w-[190px]">
            <div className="flex items-center gap-1.5 text-teal-300 text-[11px] font-bold mb-1">
              <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
              <span>الوقت المباشر</span>
            </div>
            <div className="flex items-center justify-center gap-2 font-mono flex-wrap" dir="rtl">
              <span className="text-2xl sm:text-3xl font-black text-white tracking-wider drop-shadow-sm font-mono" dir="ltr">
                {timeParts.timeStr}
              </span>
              <span className="text-xs sm:text-sm font-bold text-teal-300 px-2 py-0.5 rounded-md bg-teal-900/70 border border-teal-700/60 shadow-2xs">
                {timeParts.ampm === 'ص' ? 'صباحاً (ص)' : 'مساءً (م)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. 2x2 Summary Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Medications */}
        <div
          onClick={() => onNavigateTab('medications')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:border-teal-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>إجمالي الأدوية</span>
            <div className="p-2 bg-teal-50 text-teal-700 rounded-xl">
              <Pill className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{totalMedications}</div>
          <div className="text-[11px] text-slate-500 mt-1">مسجل في الصيدلية</div>
        </div>

        {/* Chronic Medications */}
        <div
          onClick={() => onNavigateTab('medications')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:border-teal-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>أدوية مزمنة</span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              دواء مزمن
            </span>
          </div>
          <div className="text-2xl font-black text-indigo-950">{chronicMedications}</div>
          <div className="text-[11px] text-slate-500 mt-1">متابعة يومية حيوية</div>
        </div>

        {/* Low Stock Warning */}
        <div
          onClick={() => onNavigateTab('medications')}
          className={`p-4 rounded-2xl border shadow-xs transition cursor-pointer ${
            lowStockMeds.length > 0
              ? 'bg-rose-50/60 border-rose-300 hover:border-rose-400'
              : 'bg-white border-slate-200/90 hover:border-teal-400'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className={lowStockMeds.length > 0 ? 'text-rose-900 font-bold' : 'text-slate-500'}>
              أوشكت على النفاد
            </span>
            <div
              className={`p-2 rounded-xl ${
                lowStockMeds.length > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-black ${
              lowStockMeds.length > 0 ? 'text-rose-700' : 'text-slate-900'
            }`}
          >
            {lowStockMeds.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">بحاجة للشراء</div>
        </div>

        {/* Remaining Doses Today */}
        <div
          onClick={() => onNavigateTab('schedules')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:border-teal-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>جرعات اليوم</span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              اليوم
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-800">{pendingDoses.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">متبقية لليوم</div>
        </div>
      </div>

      {/* 5. Comprehensive Alert Center Card (مركز التنبيهات الشامل) */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
              <Bell className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">مركز التنبيهات الشامل</h3>
          </div>
          <span className="text-xs text-slate-500">مراقبة حية للمخزون والصلاحية والتطعيمات</span>
        </div>

        <div className="space-y-2.5">
          {/* Low Stock Alerts */}
          {lowStockMeds.map((med) => (
            <div
              key={`alert-stock-${med.id}`}
              className="flex items-center justify-between p-3 rounded-2xl bg-rose-50/80 border border-rose-200 text-xs"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <div>
                  <span className="font-bold text-rose-950">{med.tradeName}</span>
                  <span className="text-rose-700 mr-2">
                    (متبقي {med.currentQuantity} وحدات فقط • حد التنبيه {med.lowStockThreshold})
                  </span>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('medications')}
                className="px-2.5 py-1 bg-white text-rose-700 border border-rose-300 font-bold rounded-lg hover:bg-rose-100 transition"
              >
                طلب شراء
              </button>
            </div>
          ))}

          {/* Expiry Alerts */}
          {expiringMeds.map((med) => {
            const exp = calculateExpiryStatus(med.expiryDate);
            return (
              <div
                key={`alert-exp-${med.id}`}
                className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold text-amber-950">{med.tradeName}</span>
                    <span className="text-amber-800 mr-2">({exp.labelAr})</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-md font-bold ${exp.badgeClass}`}>
                  {exp.status === 'expired' ? 'منتهي' : 'قريب الانتهاء'}
                </span>
              </div>
            );
          })}

          {/* Upcoming Child Vaccinations */}
          {upcomingVaccinations.map((vac) => (
            <div
              key={`alert-vac-${vac.id}`}
              className="flex items-center justify-between p-3 rounded-2xl bg-sky-50/80 border border-sky-200 text-xs"
            >
              <div className="flex items-center gap-2.5">
                <Syringe className="w-4 h-4 text-sky-600 shrink-0" />
                <div>
                  <span className="font-bold text-sky-950">{vac.vaccineName}</span>
                  <span className="text-sky-800 mr-2">(الموعد المقرر: {vac.dueDate})</span>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('patients')}
                className="px-2.5 py-1 bg-white text-sky-700 border border-sky-300 font-bold rounded-lg hover:bg-sky-100 transition"
              >
                سجل الطفل
              </button>
            </div>
          ))}

          {lowStockMeds.length === 0 && expiringMeds.length === 0 && upcomingVaccinations.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              ✅ جميع الأدوية في حالة آمنة، لا توجد نواقص حرجة أو أدوية منتهية الصلاحية حالياً.
            </div>
          )}
        </div>
      </div>

      {/* 6. Quick Access Banner to Smart AI Pharmacist */}
      <div
        onClick={onOpenAIPharmacist}
        className="rounded-3xl bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 p-5 text-white shadow-lg shadow-teal-900/20 flex items-center justify-between gap-4 cursor-pointer hover:shadow-xl transition group"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-teal-200 group-hover:scale-105 transition-transform shrink-0">
            <Bot className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-base text-white">
                فاحص التداخلات الدوائية الذكي (AI Pharmacist)
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-amber-950">
                فحص فوري
              </span>
            </div>
            <p className="text-xs text-teal-200/90 mt-1">
              تأكد من أمان أي دواء جديد قبل تناوله وفحص تعارضه مع أمراض المريض وحساسياته
            </p>
          </div>
        </div>

        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-teal-200 group-hover:bg-white/20 transition shrink-0">
          <ChevronLeft className="w-5 h-5" />
        </div>
      </div>

      {/* 7. Today's Dose Schedule Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">جدول جرعات اليوم</h3>
              <p className="text-xs text-slate-500">المواعيد النشطة والمطلوبة لأفراد الأسرة</p>
            </div>
          </div>

          <button
            onClick={onOpenAddSchedule}
            className="px-3 py-1.5 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold hover:bg-teal-100 transition cursor-pointer"
          >
            + إضافة موعد
          </button>
        </div>

        {pendingDoses.length > 0 ? (
          <div className="space-y-3">
            {pendingDoses.map((schedule) => {
              const foodLabelMap: Record<string, string> = {
                before_meal: 'قبل الأكل',
                after_meal: 'بعد الأكل',
                empty_stomach: 'على معدة فارغة',
                with_meal: 'مع الأكل',
                before_sleep: 'قبل النوم',
              };

              return (
                <div
                  key={schedule.id}
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-teal-50/40 border border-slate-200/90 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex flex-col items-center justify-center font-bold shrink-0 shadow-xs">
                      <span className="text-sm font-black font-mono">{schedule.time}</span>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        {schedule.medicationName}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-medium">
                        <span>المريض: <strong className="text-slate-700">{schedule.patientName || 'غير محدد'}</strong></span>
                        <span>•</span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold text-[11px]">
                          {foodLabelMap[schedule.foodTiming] || 'مع الأكل'}
                        </span>
                        <span>•</span>
                        <span>الجرعة: {schedule.doseAmount} قرص</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => onSnoozeDose(schedule)}
                      className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition cursor-pointer"
                    >
                      غفوة 10 د
                    </button>
                    <button
                      onClick={() => onTakeDose(schedule)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>تم أخذ الجرعة (خصم)</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800">
              لا توجد جرعات متبقية لليوم!
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              إما أنه تم أخذ جميع جرعات اليوم بنجاح، أو لم يتم تسجيل جداول مواعيد بعد. يمكنك إضافة موعد جديد في أي وقت.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
