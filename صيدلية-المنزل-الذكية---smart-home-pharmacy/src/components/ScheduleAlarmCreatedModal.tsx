import React, { useState } from 'react';
import { DoseSchedule } from '../types/pharmacy';
import {
  Clock,
  Calendar,
  Smartphone,
  CheckCircle2,
  X,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Check,
} from 'lucide-react';
import {
  parseTimeToHourMinute,
  triggerAndroidClockAndIcsAlarm,
  buildGoogleCalendarUrl,
} from '../utils/nativeAlarmBridge';

interface ScheduleAlarmCreatedModalProps {
  schedule: DoseSchedule | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ScheduleAlarmCreatedModal: React.FC<ScheduleAlarmCreatedModalProps> = ({
  schedule,
  isOpen,
  onClose,
}) => {
  const [phoneAlarmTriggered, setPhoneAlarmTriggered] = useState(false);
  const [googleCalOpened, setGoogleCalOpened] = useState(false);

  if (!isOpen || !schedule) return null;

  const { hour, minute } = parseTimeToHourMinute(schedule.time);
  const alarmTitle = `دواء: ${schedule.medicationName}${schedule.patientName ? ` (${schedule.patientName})` : ''}`;
  const alarmDescription = `تذكير يومي بموعد تناول الجرعة (${schedule.doseAmount} وحدة) في تمام الساعة ${schedule.time}. صيدلية المنزل الذكية.`;

  const handleTriggerNativeAlarm = () => {
    triggerAndroidClockAndIcsAlarm(hour, minute, alarmTitle, alarmDescription);
    setPhoneAlarmTriggered(true);
  };

  const handleOpenGoogleCalendar = () => {
    const url = buildGoogleCalendarUrl(hour, minute, alarmTitle, alarmDescription);
    window.open(url, '_blank');
    setGoogleCalOpened(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-in fade-in text-right"
      dir="rtl"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border-2 border-teal-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner animate-pulse">
              <Clock className="w-6 h-6 text-white stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black">تم حفظ موعد الدواء بنجاح ⏰</h3>
              </div>
              <p className="text-xs text-teal-100 mt-0.5 font-medium">
                {schedule.medicationName} • الساعة {schedule.time}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg transition cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-2xl text-xs font-semibold text-teal-950 leading-relaxed">
            لضمان رنين هاتفك في الموعد بدقة <strong>حتى لو كان التطبيق مغلقاً تماماً أو بدون إنترنت</strong>، ننصحك باختيار أحد خياري منبه الهاتف الأصلي:
          </div>

          {/* 2 Primary Actions */}
          <div className="space-y-3 pt-1">
            {/* Action 1: Native Phone Alarm (Android Intent + ICS) */}
            <button
              onClick={handleTriggerNativeAlarm}
              className="w-full flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 active:scale-98 transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div className="text-right">
                  <span className="block font-black text-[13px]">
                    ⏰ تفعيل في منبه الهاتف الأصلي
                  </span>
                  <span className="block text-[11px] text-orange-100 font-normal">
                    يرن في ساعة الهاتف حتى لو كان التطبيق مغلقاً
                  </span>
                </div>
              </div>

              {phoneAlarmTriggered ? (
                <span className="px-2 py-1 rounded-lg bg-white text-emerald-800 text-[10px] font-black flex items-center gap-1 shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" /> تم الضبط
                </span>
              ) : (
                <span className="text-xs bg-white/25 px-2.5 py-1 rounded-xl text-white font-black shrink-0">
                  تفعيل 1-Tap
                </span>
              )}
            </button>

            {phoneAlarmTriggered && (
              <p className="text-[11px] text-emerald-700 font-bold px-1 animate-in fade-in">
                ✅ تم إرسال أمر التنبيه لتطبيق الساعة بالهاتف وتنزيل ملف التذكير الصوتي (.ics).
              </p>
            )}

            {/* Action 2: Daily Google Calendar Alert */}
            <button
              onClick={handleOpenGoogleCalendar}
              className="w-full flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-900 border-2 border-blue-200 font-bold text-xs transition active:scale-98 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div className="text-right">
                  <span className="block font-black text-[13px] text-blue-950">
                    📅 إضافة تنبيه يومي في تقويم Google
                  </span>
                  <span className="block text-[11px] text-blue-700 font-normal">
                    تذكير يومي متكرر جاهز ومُعبأ مسبقاً بالجرعة والموعد
                  </span>
                </div>
              </div>

              <ExternalLink className="w-4 h-4 text-blue-700 shrink-0" />
            </button>

            {googleCalOpened && (
              <p className="text-[11px] text-blue-800 font-bold px-1 animate-in fade-in">
                ↗️ تم فتح تقويم Google في نافذة جديدة لحفظ التذكير اليومي المتكرر.
              </p>
            )}
          </div>

          {/* Dismiss button */}
          <div className="pt-2">
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              تم، سأعتمد على منبه التطبيق الداخلي
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
