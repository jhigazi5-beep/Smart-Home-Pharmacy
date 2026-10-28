import React, { useEffect, useState } from 'react';
import { DoseSchedule } from '../types/pharmacy';
import { getLocalPhoto } from '../services/localPhotoStorage';
import {
  Bell,
  Check,
  Clock,
  X,
  Pill,
  User,
  AlertCircle,
  Volume2,
  Sparkles,
} from 'lucide-react';
import { startAlarmLoop, stopAlarmLoop } from '../services/alarmSound';

interface AlarmModalProps {
  schedule: DoseSchedule | null;
  onTakeDose: (schedule: DoseSchedule) => void;
  onSnooze: (schedule: DoseSchedule) => void;
  onSkipDose: (schedule: DoseSchedule, reason?: string) => void;
  onClose: () => void;
}

export const AlarmModal: React.FC<AlarmModalProps> = ({
  schedule,
  onTakeDose,
  onSnooze,
  onSkipDose,
  onClose,
}) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [skipReason, setSkipReason] = useState<string>('');
  const [showSkipInput, setShowSkipInput] = useState<boolean>(false);
  // Alternating Red / Green flashing state every 600ms for unmissable medical alarm
  const [flashState, setFlashState] = useState<'red' | 'green'>('red');

  useEffect(() => {
    if (schedule?.localImageId) {
      getLocalPhoto(schedule.localImageId).then(setPhotoUrl);
    } else {
      setPhotoUrl(null);
    }
    setShowSkipInput(false);
    setSkipReason('');

    // Ensure continuous alarm loop plays until user dismisses
    startAlarmLoop();

    const flashTimer = setInterval(() => {
      setFlashState((prev) => (prev === 'red' ? 'green' : 'red'));
    }, 600);

    return () => {
      clearInterval(flashTimer);
      stopAlarmLoop();
    };
  }, [schedule]);

  if (!schedule) return null;

  const foodTimingLabelMap: Record<string, { label: string; color: string }> = {
    before_meal: {
      label: 'قبل الأكل (على معدة فارغة)',
      color: 'bg-amber-100 text-amber-950 border-amber-300',
    },
    after_meal: {
      label: 'بعد الأكل مباشرة',
      color: 'bg-emerald-100 text-emerald-950 border-emerald-300',
    },
    empty_stomach: {
      label: 'على الريق / معدة فارغة',
      color: 'bg-sky-100 text-sky-950 border-sky-300',
    },
    with_meal: {
      label: 'مع الطعام أثناء الوجبة',
      color: 'bg-indigo-100 text-indigo-950 border-indigo-300',
    },
    before_sleep: {
      label: 'قبل النوم',
      color: 'bg-purple-100 text-purple-950 border-purple-300',
    },
  };

  const timingInfo = foodTimingLabelMap[schedule.foodTiming] || {
    label: 'حسب إرشادات الصيدلي',
    color: 'bg-slate-100 text-slate-800 border-slate-300',
  };

  const handleTake = () => {
    stopAlarmLoop();
    onTakeDose(schedule);
    onClose();
  };

  const handleSnooze = () => {
    stopAlarmLoop();
    onSnooze(schedule);
    onClose();
  };

  const handleSkip = () => {
    stopAlarmLoop();
    onSkipDose(schedule, skipReason.trim() || undefined);
    onClose();
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center p-3 sm:p-6 transition-colors duration-500 text-right backdrop-blur-md overflow-y-auto ${
        flashState === 'red'
          ? 'bg-rose-950/85 ring-8 ring-inset ring-rose-500'
          : 'bg-emerald-950/85 ring-8 ring-inset ring-emerald-500'
      }`}
      dir="rtl"
    >
      {/* Central Unmissable High-Urgency Alarm Card */}
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border-4 border-white/80 overflow-hidden my-auto animate-in zoom-in-95 duration-200">
        {/* Pulsating Flashing Header */}
        <div
          className={`p-5 text-white transition-colors duration-500 flex items-center justify-between ${
            flashState === 'red'
              ? 'bg-gradient-to-r from-rose-700 via-rose-600 to-red-600'
              : 'bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-13 h-13 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center animate-bounce shadow-lg">
              <Bell className="w-7 h-7 text-white stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-black bg-amber-400 text-amber-950 shadow-sm animate-pulse">
                  <Volume2 className="w-3.5 h-3.5" />
                  منبه دوائي طارئ يعمل الآن ⏰
                </span>
              </div>
              <h3 className="text-2xl font-black mt-1 font-mono tracking-wider">
                {schedule.time}
              </h3>
            </div>
          </div>

          <button
            onClick={() => {
              stopAlarmLoop();
              onClose();
            }}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition cursor-pointer"
            aria-label="إغلاق التنبيه"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Alarm Card Content */}
        <div className="p-6 space-y-5">
          {/* Medication Info & Photo */}
          <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border-2 border-slate-200">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={schedule.medicationName}
                className="w-22 h-22 rounded-2xl object-cover border-2 border-white shadow-md shrink-0"
              />
            ) : (
              <div className="w-22 h-22 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 text-white flex flex-col items-center justify-center shrink-0 shadow-sm">
                <Pill className="w-10 h-10 stroke-[2.2]" />
                <span className="text-[10px] font-black mt-1">صورة الدواء</span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold mb-1">
                <User className="w-4 h-4 text-teal-600" />
                <span>المريض:</span>
                <span className="text-slate-900 font-black text-sm">
                  {schedule.patientName || 'غير محدد'}
                </span>
              </div>

              <h4 className="text-xl font-black text-slate-900 leading-tight">
                {schedule.medicationName}
              </h4>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black bg-white text-slate-800 border-2 border-slate-200 shadow-2xs">
                  الجرعة المطلوبة:
                  <strong className="text-teal-700 font-black text-sm">
                    {schedule.doseAmount} قرص / وحدة
                  </strong>
                </span>

                <span
                  className={`inline-block px-3 py-1 rounded-xl text-xs font-black border ${timingInfo.color}`}
                >
                  {timingInfo.label}
                </span>
              </div>
            </div>
          </div>

          {/* Sound Notification Alert Note */}
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 bg-teal-50 p-3 rounded-xl border border-teal-200">
            <span className="flex items-center gap-1.5 text-teal-900">
              <Volume2 className="w-4 h-4 text-teal-700 animate-pulse" />
              الرنين الصوتي الطبي مستمر حتى اختيار الإجراء
            </span>
            <button
              onClick={() => stopAlarmLoop()}
              className="text-[11px] text-teal-700 hover:text-teal-900 underline cursor-pointer"
            >
              كتم الصوت مؤقتاً
            </button>
          </div>

          {/* Skip Reason Input (Optional) */}
          {showSkipInput && (
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 animate-in fade-in">
              <label className="block text-xs font-bold text-rose-900 mb-1.5">
                سبب التخطي أو الإلغاء (يُسجل في الأرشيف الطبي):
              </label>
              <input
                type="text"
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                placeholder="مثال: سفر، نسيان، استشارة طبيب..."
                className="w-full px-3 py-2 text-xs bg-white border border-rose-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500 text-right font-medium"
              />
            </div>
          )}

          {/* Main Action Buttons */}
          <div className="space-y-3 pt-1">
            {/* 1. Primary Take Dose Button */}
            <button
              onClick={handleTake}
              className="w-full flex items-center justify-center gap-2.5 py-4 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base shadow-xl shadow-emerald-700/30 active:scale-98 transition cursor-pointer"
            >
              <Check className="w-6 h-6 stroke-[3]" />
              <span>تم أخذ الجرعة (خصم من الرصيد) ✅</span>
            </button>

            {/* 2. Snooze Button */}
            <button
              onClick={handleSnooze}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm shadow-md shadow-amber-600/25 active:scale-98 transition cursor-pointer"
            >
              <Clock className="w-5 h-5 stroke-[2.5]" />
              <span>غفوة 10 دقائق (Snooze) ⏳</span>
            </button>

            {/* 3. Skip Dose Button */}
            {!showSkipInput ? (
              <button
                onClick={() => setShowSkipInput(true)}
                className="w-full py-2 px-4 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold transition cursor-pointer"
              >
                تخطي الجرعة (تأخر أو إلغاء)
              </button>
            ) : (
              <button
                onClick={handleSkip}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer"
              >
                <AlertCircle className="w-4 h-4" />
                <span>تأكيد تخطي الجرعة وتوثيقها في السجل</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
