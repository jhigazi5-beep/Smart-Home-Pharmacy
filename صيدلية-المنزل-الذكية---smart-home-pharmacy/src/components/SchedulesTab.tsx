import React, { useState } from 'react';
import { DoseSchedule, Medication, Patient, AdherenceLog, FoodTiming } from '../types/pharmacy';
import {
  Clock,
  Plus,
  Bell,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  Play,
  Trash2,
  X,
  User,
  Pill,
  Filter,
  Check,
  Smartphone,
  Calendar,
  Sparkles,
} from 'lucide-react';
import {
  triggerAndroidClockAlarm,
  parseTimeToHourMinute,
  downloadAlarmIcs,
  syncNativeOSAlarms,
  triggerAndroidClockAndIcsAlarm,
  buildGoogleCalendarUrl,
} from '../utils/nativeAlarmBridge';
import { ScheduleAlarmCreatedModal } from './ScheduleAlarmCreatedModal';

interface SchedulesTabProps {
  schedules: DoseSchedule[];
  medications: Medication[];
  patients: Patient[];
  logs: AdherenceLog[];
  onSaveSchedule: (schedule: DoseSchedule) => void;
  onDeleteSchedule: (id: string) => void;
  onToggleScheduleActive: (id: string, active: boolean) => void;
  onTestAlarm: (schedule: DoseSchedule) => void;
}

export const SchedulesTab: React.FC<SchedulesTabProps> = ({
  schedules,
  medications,
  patients,
  logs,
  onSaveSchedule,
  onDeleteSchedule,
  onToggleScheduleActive,
  onTestAlarm,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'schedules' | 'history'>('schedules');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPatientFilter, setSelectedPatientFilter] = useState<string>('all');
  const [clockActionMessage, setClockActionMessage] = useState<string | null>(null);
  const [createdSchedulePopup, setCreatedSchedulePopup] = useState<DoseSchedule | null>(null);

  // Form State
  const [medicationId, setMedicationId] = useState('');
  const [time, setTime] = useState('08:00');
  const [doseAmount, setDoseAmount] = useState<number>(1);
  const [foodTiming, setFoodTiming] = useState<FoodTiming>('after_meal');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [autoSetPhoneAlarm, setAutoSetPhoneAlarm] = useState(true);

  const openAddModal = () => {
    setMedicationId(medications[0]?.id || '');
    setTime('08:00');
    setDoseAmount(1);
    setFoodTiming(medications[0]?.foodTiming || 'after_meal');
    setSoundEnabled(true);
    setVibrationEnabled(true);
    setAutoSetPhoneAlarm(true);
    setIsAddModalOpen(true);
  };

  const handleSaveScheduleForm = (e: React.FormEvent) => {
    e.preventDefault();
    const med = medications.find((m) => m.id === medicationId);
    if (!med) return;

    const patient = patients.find((p) => p.id === med.patientId);

    const newSchedule: DoseSchedule = {
      id: 'sch_' + Date.now(),
      medicationId: med.id,
      medicationName: med.tradeName,
      patientId: med.patientId,
      patientName: patient ? patient.name : med.patientName,
      time,
      doseAmount: Number(doseAmount) || 1,
      foodTiming,
      soundEnabled,
      vibrationEnabled,
      isActive: true,
      autoSetPhoneAlarm,
      localImageId: med.localImageId || null,
      createdAt: new Date().toISOString(),
    };

    onSaveSchedule(newSchedule);

    // Sync to Native OS Alarms (Capacitor / Android Bridge)
    syncNativeOSAlarms([...schedules, newSchedule]).catch(() => {});

    setIsAddModalOpen(false);

    // Immediately display prominent modal with 1-tap Native Clock and Google Calendar options
    setCreatedSchedulePopup(newSchedule);
  };

  const handleTriggerNativeClock = (schedule: DoseSchedule) => {
    const { hour, minute } = parseTimeToHourMinute(schedule.time);
    const alarmLabel = `دواء: ${schedule.medicationName}${schedule.patientName ? ` (${schedule.patientName})` : ''}`;
    const desc = `تذكير يومي بموعد تناول الجرعة (${schedule.doseAmount} وحدة) في تمام الساعة ${schedule.time}. صيدلية المنزل الذكية.`;
    triggerAndroidClockAndIcsAlarm(hour, minute, alarmLabel, desc);
    setClockActionMessage(
      `تم إرسال أمر التنبيه (${schedule.time}) لتطبيق ساعة الهاتف وتنزيل ملف التذكير الصوتي (.ics) ⏰`
    );
    setTimeout(() => setClockActionMessage(null), 6000);
  };

  const handleOpenGoogleCalendar = (schedule: DoseSchedule) => {
    const { hour, minute } = parseTimeToHourMinute(schedule.time);
    const alarmLabel = `دواء: ${schedule.medicationName}${schedule.patientName ? ` (${schedule.patientName})` : ''}`;
    const desc = `تذكير يومي بموعد تناول الجرعة (${schedule.doseAmount} وحدة) في تمام الساعة ${schedule.time}. صيدلية المنزل الذكية.`;
    const url = buildGoogleCalendarUrl(hour, minute, alarmLabel, desc);
    window.open(url, '_blank');
    setClockActionMessage(`تم فتح تقويم Google لإضافة التنبيه اليومي المتكرر (${schedule.time}) 📅`);
    setTimeout(() => setClockActionMessage(null), 6000);
  };

  // Filter schedules and history
  const filteredSchedules = schedules.filter((s) => {
    if (selectedPatientFilter === 'all') return true;
    return s.patientId === selectedPatientFilter;
  });

  const filteredLogs = logs.filter((l) => {
    if (selectedPatientFilter === 'all') return true;
    return l.patientId === selectedPatientFilter;
  });

  const foodLabelMap: Record<FoodTiming, string> = {
    before_meal: 'قبل الأكل',
    after_meal: 'بعد الأكل',
    empty_stomach: 'على معدة فارغة',
    with_meal: 'مع الطعام',
    before_sleep: 'قبل النوم',
  };

  return (
    <div className="space-y-4 pb-20">
      {/* 1. Header Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              جدول الجرعات والتذكير
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            منبهات ذكية بأصوات متولدة محلياً، تتبع الالتزام بالجرعات وخصم الكميات تلقائياً
          </p>
        </div>

        <button
          onClick={openAddModal}
          disabled={medications.length === 0}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-teal-700/20 transition active:scale-95 cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة جدول تذكير جديد</span>
        </button>
      </div>

      {/* Clock Action Feedback Toast */}
      {clockActionMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs font-bold text-emerald-950 flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{clockActionMessage}</span>
          </div>
          <button
            onClick={() => setClockActionMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1"
          >
            ×
          </button>
        </div>
      )}

      {/* 2. Sub-navigation Toggle */}
      <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-1 text-xs font-bold">
        <button
          onClick={() => setActiveSubTab('schedules')}
          className={`flex-1 py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 ${
            activeSubTab === 'schedules'
              ? 'bg-white text-teal-900 shadow-xs font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4 text-teal-600" />
          <span>جداول التذكير النشطة ({schedules.filter((s) => s.isActive).length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('history')}
          className={`flex-1 py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 ${
            activeSubTab === 'history'
              ? 'bg-white text-teal-900 shadow-xs font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>سجل الالتزام التاريخي ({logs.length})</span>
        </button>
      </div>

      {/* Patient Filter */}
      {patients.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="font-bold text-slate-500 shrink-0">تصفية بالمريض:</span>
          <button
            onClick={() => setSelectedPatientFilter('all')}
            className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
              selectedPatientFilter === 'all'
                ? 'bg-teal-700 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            الكل
          </button>
          {patients.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPatientFilter(p.id)}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                selectedPatientFilter === p.id
                  ? 'bg-teal-700 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* SUB-VIEW 1: ACTIVE SCHEDULES */}
      {activeSubTab === 'schedules' && (
        <div className="space-y-3">
          {filteredSchedules.length > 0 ? (
            filteredSchedules.map((schedule) => (
              <div
                key={schedule.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col gap-4 transition hover:border-teal-400"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Time box */}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-700 to-teal-800 text-white flex flex-col items-center justify-center font-mono font-black text-lg shadow-sm shrink-0">
                      <span>{schedule.time}</span>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 text-base">
                        {schedule.medicationName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium mt-1">
                        {schedule.patientName && (
                          <span className="flex items-center gap-1 text-teal-800 font-bold">
                            <User className="w-3 h-3 text-teal-600" />
                            {schedule.patientName}
                          </span>
                        )}
                        <span>•</span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold text-[11px]">
                          {foodLabelMap[schedule.foodTiming] || 'بعد الأكل'}
                        </span>
                        <span>•</span>
                        <span>الجرعة للخصم: {schedule.doseAmount} وحدة</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {/* Test Alarm Button */}
                    <button
                      onClick={() => onTestAlarm(schedule)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold transition cursor-pointer"
                      title="تجربة صوت المنبه والتنبيه البصري"
                    >
                      <Play className="w-3.5 h-3.5 fill-teal-700" />
                      <span>تجربة المنبه</span>
                    </button>

                    {/* Active Toggle */}
                    <button
                      onClick={() => onToggleScheduleActive(schedule.id, !schedule.isActive)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        schedule.isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {schedule.isActive ? 'مفعّل ⏰' : 'معطل'}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => onDeleteSchedule(schedule.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                      title="حذف الموعد"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Android Native Clock & Calendar Quick Sync Bar */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600 text-[11px] font-bold">
                    <Smartphone className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    <span>ضمان الرنين في نظام الهاتف (حتى لو التطبيق مغلق):</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* 1-Tap Native Clock Alarm Intent + ICS */}
                    <button
                      onClick={() => handleTriggerNativeClock(schedule)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-950 border border-orange-300 font-bold transition cursor-pointer active:scale-95 text-[11px]"
                      title="ضبط هذا التوقيت في تطبيق المنبه وساعة الهاتف الأصلية"
                    >
                      <Clock className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                      <span>⏰ تفعيل في منبه الهاتف الأصلي (يرن حتى لو التطبيق مغلق)</span>
                    </button>

                    {/* 1-Tap Google Calendar Daily Recurring URL */}
                    <button
                      onClick={() => handleOpenGoogleCalendar(schedule)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-950 border border-blue-300 font-bold transition cursor-pointer active:scale-95 text-[11px]"
                      title="إضافة تذكير يومي متكرر في تقويم Google"
                    >
                      <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>📅 إضافة تنبيه يومي في تقويم Google</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-10 text-center bg-white rounded-3xl border border-dashed border-slate-200">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800 text-base">لا توجد مواعيد تنبيه مجدولة</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                أضف مواعيد تناول الأدوية اليومية لتفعيل المنبه الصوتي التلقائي وخصم الجرعات.
              </p>
              {medications.length > 0 ? (
                <button
                  onClick={openAddModal}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة جدول التذكير الأول</span>
                </button>
              ) : (
                <p className="text-xs text-amber-700 font-bold mt-3">
                  (يرجى إضافة دواء أولاً من تبويب "الأدوية والمخزون" لتتمكن من جدولة مواعيده)
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 2: ADHERENCE HISTORY LOG */}
      {activeSubTab === 'history' && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base">سجل الالتزام التاريخي بالجرعات</h3>
            <span className="text-xs text-slate-500">
              توثيق زمني دقيق لمساعدة العائلات والأطباء في التحقق من تناول الدواء
            </span>
          </div>

          {filteredLogs.length > 0 ? (
            <div className="space-y-2.5">
              {filteredLogs.slice().reverse().map((log) => {
                const statusConfig = {
                  taken: {
                    label: 'تم في الموعد ✅',
                    color: 'bg-emerald-50 text-emerald-900 border-emerald-200',
                    badge: 'bg-emerald-600 text-white',
                  },
                  snoozed: {
                    label: 'مؤجل / غفوة ⏳',
                    color: 'bg-amber-50 text-amber-900 border-amber-200',
                    badge: 'bg-amber-500 text-white',
                  },
                  missed: {
                    label: 'فائت أو ملغى ❌',
                    color: 'bg-rose-50 text-rose-900 border-rose-200',
                    badge: 'bg-rose-600 text-white',
                  },
                };

                const cfg = statusConfig[log.status] || statusConfig.taken;

                return (
                  <div
                    key={log.id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs transition ${cfg.color}`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          {log.medicationName}
                        </span>
                        {log.patientName && (
                          <span className="px-2 py-0.5 rounded-md bg-white border border-black/10 font-bold text-slate-700">
                            {log.patientName}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        التوقيت: {new Date(log.timestamp).toLocaleString('ar-EG')}
                        {log.notes ? ` • ملاحظة: ${log.notes}` : ''}
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-xl text-xs font-bold shadow-2xs ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              لا توجد سجلات التزام بعد. عند تأكيد أخذ الجرعات أو تخطيها ستظهر التوثيقات هنا فوراً.
            </div>
          )}
        </div>
      )}

      {/* Add Schedule Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-teal-200 overflow-hidden text-right my-8">
            <div className="bg-gradient-to-r from-teal-800 to-emerald-700 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">إضافة جدول تذكير جديد</h3>
                  <p className="text-xs text-teal-100">حدد وقت الجرعة والمريض وتعليمات الأكل</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveScheduleForm} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اختر الدواء *</label>
                <select
                  required
                  value={medicationId}
                  onChange={(e) => {
                    setMedicationId(e.target.value);
                    const selected = medications.find((m) => m.id === e.target.value);
                    if (selected) setFoodTiming(selected.foodTiming);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500"
                >
                  {medications.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.tradeName} {m.patientName ? `(${m.patientName})` : ''} — رصيد: {m.currentQuantity}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">وقت التنبيه (HH:mm) *</label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الكمية للخصم (أقراص)</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={doseAmount}
                    onChange={(e) => setDoseAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تعليمات الأكل</label>
                <select
                  value={foodTiming}
                  onChange={(e) => setFoodTiming(e.target.value as FoodTiming)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500"
                >
                  <option value="before_meal">قبل الأكل</option>
                  <option value="after_meal">بعد الأكل</option>
                  <option value="with_meal">مع الطعام</option>
                  <option value="empty_stomach">على معدة فارغة</option>
                  <option value="before_sleep">قبل النوم</option>
                </select>
              </div>

              {/* Native Android Clock Alarm Toggle */}
              <div className="p-3.5 bg-orange-50/70 border border-orange-200 rounded-2xl space-y-1.5">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSetPhoneAlarm}
                    onChange={(e) => setAutoSetPhoneAlarm(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-orange-600 focus:ring-orange-500 border-slate-300 cursor-pointer shrink-0"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      تفعيل رنين منبه الهاتف الأصلي تلقائياً لضمان عدم فوات الجرعة (موصى به) ⏰
                    </span>
                    <span className="text-[11px] text-slate-600 leading-relaxed block mt-0.5">
                      يضبط المنبه الرسمي في نظام أندرويد ليرن بصوت عالٍ حتى لو كان التطبيق مغلقاً تماماً أو في وضع توفير الطاقة.
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                >
                  حفظ جدول التذكير
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1-Tap Phone Alarm & Google Calendar Post-Save Modal */}
      <ScheduleAlarmCreatedModal
        schedule={createdSchedulePopup}
        isOpen={!!createdSchedulePopup}
        onClose={() => setCreatedSchedulePopup(null)}
      />
    </div>
  );
};
