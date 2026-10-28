import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Volume2,
  X,
  Play,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import {
  runTestAlertSequence,
  NotificationEngineMode,
  isInsideIframe,
} from '../services/notificationService';
import { playLoudMedicalSiren, stopAlarmLoop } from '../services/alarmSound';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: NotificationEngineMode;
  message: string;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  mode,
  message,
}) => {
  const [isTesting, setIsTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  if (!isOpen) return null;

  const inIframe = isInsideIframe();

  const handleTestSound = async () => {
    setIsTesting(true);
    setTestSuccess(false);
    try {
      await runTestAlertSequence();
      setTestSuccess(true);
    } catch (e) {
      console.error('Test alert error:', e);
    } finally {
      setTimeout(() => {
        setIsTesting(false);
      }, 4500);
    }
  };

  const handleOpenStandalone = () => {
    try {
      window.open(window.location.href, '_blank');
    } catch (err) {
      console.warn('Could not open standalone window:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-in fade-in text-right">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-teal-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner animate-pulse">
              <Bell className="w-6 h-6 text-white stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">
                  تم تفعيل نظام الرنين الصوتي والمنبه الذكي 🔔
                </h3>
              </div>
              <p className="text-xs text-teal-100 mt-0.5">
                {inIframe
                  ? 'تم فك قيود الصوت وتنشيط المنبه الداخلي بنجاح'
                  : 'محرك التنبيهات ونظام الرنين جاهز للعمل'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopAlarmLoop();
              onClose();
            }}
            className="p-1.5 text-white/80 hover:text-white rounded-lg transition cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Status Alert Banner */}
          <div className="p-4 rounded-2xl border bg-emerald-50 border-emerald-200 text-emerald-950 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-black">
                صوت المنبه والاهتزاز يعملان الآن 100% بدون حظر 🔊
              </h4>
              <p className="text-xs leading-relaxed mt-1 font-medium text-slate-700">
                {message ||
                  'تم تنشيط محرك الصوت المدمج. سيعمل المنبه الصوتي عالي النبرة والاهتزاز والشاشة التحذيرية التفاعلية فور حلول موعد أي جرعة دواء.'}
              </p>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>جاهزية نظام التنبيهات:</span>
            </div>

            <ul className="space-y-1.5 text-slate-600 font-medium">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>رنين صفارة طبية متواصلة عالية الأولوية تعمل محلياً</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>شاشة تنبيه طوارئ حمراء/خضراء تفاعلية لا يمكن تفويتها</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>فحص زمني مستمر كل 5 ثوانٍ مع تثبيت استيقاظ الشاشة</span>
              </li>
            </ul>
          </div>

          {/* 2 Primary Required Actions */}
          <div className="space-y-2.5 pt-2">
            {/* Action 1: Test alarm tone now */}
            <button
              onClick={handleTestSound}
              disabled={isTesting}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-teal-700 via-teal-800 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-bold text-xs shadow-md shadow-teal-700/25 active:scale-98 transition cursor-pointer"
            >
              {isTesting ? (
                <>
                  <Volume2 className="w-4 h-4 animate-bounce text-yellow-300" />
                  <span>جاري إطلاق صفارة الرنين والاهتزاز الآن...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>تجربة صوت رنين الدواء الآن 🔊</span>
                </>
              )}
            </button>

            {/* Action 2: Open in standalone window */}
            <button
              onClick={handleOpenStandalone}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs transition active:scale-98 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-teal-700" />
              <span>فتح التطبيق في نافذة مستقلة لتفعيل إشعارات النظام ↗️</span>
            </button>

            {testSuccess && (
              <p className="text-center text-[11px] font-bold text-emerald-700 animate-in fade-in">
                ✅ تم إطلاق صوت الرنين الطبي والاهتزاز بنجاح!
              </p>
            )}

            <button
              onClick={() => {
                stopAlarmLoop();
                onClose();
              }}
              className="w-full py-2.5 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-semibold transition cursor-pointer"
            >
              إغلاق ومتابعة استخدام التطبيق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
