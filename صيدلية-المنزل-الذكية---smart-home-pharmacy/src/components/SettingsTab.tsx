import React, { useState } from 'react';
import { FirebaseConfig } from '../types/pharmacy';
import { StorageService } from '../services/storage';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import {
  Settings,
  Cloud,
  Download,
  Upload,
  Trash2,
  Key,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
  FileText,
  LogOut,
  Save,
  Bell,
  Volume2,
  Play,
  Smartphone,
  ShieldCheck,
  Clock,
  Copy,
  Send,
} from 'lucide-react';
import {
  getNotificationEngineStatus,
  enableNotificationsAndAudio,
  runTestAlertSequence,
  NotificationStatus,
} from '../services/notificationService';
import { triggerAndroidClockAlarm } from '../utils/nativeAlarmBridge';
import { registerFcmToken } from '../services/fcmService';


interface SettingsTabProps {
  firebaseConfig: FirebaseConfig | null;
  onSaveFirebaseConfig: (config: FirebaseConfig | null) => void;
  onDataReset: () => void;
  onSeedDemoData: () => void;
  onBackupRestored: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  firebaseConfig,
  onSaveFirebaseConfig,
  onDataReset,
  onSeedDemoData,
  onBackupRestored,
}) => {
  const isOnline = useOnlineStatus();
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [jsonConfigInput, setJsonConfigInput] = useState(
    firebaseConfig ? JSON.stringify(firebaseConfig, null, 2) : ''
  );
  const [isLoggedInGoogle, setIsLoggedInGoogle] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [notifStatus, setNotifStatus] = useState<NotificationStatus>(() => getNotificationEngineStatus());
  const [isTestingAlarm, setIsTestingAlarm] = useState(false);
  const [alarmTestSuccess, setAlarmTestSuccess] = useState(false);
  const [vapidKeyInput, setVapidKeyInput] = useState(firebaseConfig?.vapidKey || '');
  const [isRegisteringFcm, setIsRegisteringFcm] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [clockTestMessage, setClockTestMessage] = useState<string | null>(null);

  const handleTestAlarm = async () => {
    setIsTestingAlarm(true);
    setAlarmTestSuccess(false);
    try {
      await runTestAlertSequence();
      setAlarmTestSuccess(true);
    } catch (err) {
      console.error('Test alarm error:', err);
    } finally {
      setTimeout(() => {
        setIsTestingAlarm(false);
      }, 5000);
    }
  };

  const handleTestClockIntent = () => {
    const now = new Date();
    // Test alarm set 2 minutes from now
    now.setMinutes(now.getMinutes() + 2);
    const hour = now.getHours();
    const minute = now.getMinutes();

    const ok = triggerAndroidClockAlarm(
      hour,
      minute,
      '⏰ تجربة منبه صيدلية المنزل الذكية (أندرويد الأصلي)'
    );

    if (ok) {
      setClockTestMessage(`تم إرسال أمر فتح وتعيين منبه الساعة الأصلي للهاتف بنجاح (${hour}:${minute.toString().padStart(2, '0')}) ⏰`);
    } else {
      setClockTestMessage('تعذر إطلاق أمر المنبه في هذا المتصفح. استخدم تطبيق أندرويد APK.');
    }
    setTimeout(() => setClockTestMessage(null), 6000);
  };

  const handleRegisterFcm = async () => {
    setIsRegisteringFcm(true);
    try {
      const res = await registerFcmToken(vapidKeyInput.trim() || undefined);
      const latest = getNotificationEngineStatus();
      setNotifStatus(latest);
      if (res.success && res.token) {
        setStatusMessage('✅ تم تسجيل مفتاح FCM Web Push السحابي بنجاح!');
      } else {
        setStatusMessage(`تعذر تسجيل FCM: ${res.error}`);
      }
    } catch (err: any) {
      setStatusMessage(`خطأ: ${err?.message || 'تعذر تسجيل FCM'}`);
    } finally {
      setIsRegisteringFcm(false);
    }
  };

  const handleCopyFcmToken = () => {
    if (notifStatus.fcmToken) {
      navigator.clipboard.writeText(notifStatus.fcmToken);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 3000);
    }
  };

  const handleActivateNotifications = async () => {
    try {
      const res = await enableNotificationsAndAudio();
      const latest = getNotificationEngineStatus();
      setNotifStatus(latest);
      setStatusMessage(res.message);
    } catch (err) {
      console.error('Activate notifications error:', err);
      setStatusMessage('تعذر تفعيل التنبيهات');
    }
  };

  const handleSaveConfig = () => {
    try {
      if (!jsonConfigInput.trim() && !vapidKeyInput.trim()) {
        onSaveFirebaseConfig(null);
        setStatusMessage('تم تعطيل الربط السحابي والاعتماد على التخزين المحلي فقط.');
        return;
      }
      let parsed: any = {};
      if (jsonConfigInput.trim()) {
        parsed = JSON.parse(jsonConfigInput);
      }
      if (vapidKeyInput.trim()) {
        parsed.vapidKey = vapidKeyInput.trim();
      }
      onSaveFirebaseConfig(parsed);
      setJsonConfigInput(JSON.stringify(parsed, null, 2));
      setStatusMessage('تم حفظ إعدادات Firebase و VAPID Key وتفعيل المزامنة بنجاح!');
      setShowConfigDrawer(false);
    } catch {
      setStatusMessage('خطأ: صيغة JSON غير صحيحة. يرجى التحقق من المفاتيح.');
    }
  };

  const handleExport = () => {
    const backupJson = StorageService.exportBackup();
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart_pharmacy_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage('تم تصدير النسخة الاحتياطية بنجاح.');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = StorageService.importBackup(content);
      if (res.success) {
        setStatusMessage('تمت استعادة البيانات بنجاح!');
        onBackupRestored();
      } else {
        setStatusMessage(`تعذر استعادة النسخة: ${res.error}`);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmReset = async () => {
    await StorageService.wipeAllData();
    setShowResetConfirm(false);
    onDataReset();
    setStatusMessage('تم مسح جميع البيانات بنجاح، وجميع العدادات عادت إلى الصفر.');
  };

  return (
    <div className="space-y-4 pb-20">
      {/* 1. Header Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              إعدادات الصيدلية والسحابة الهجينة
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              مزامنة النصوص والأرقام سحابياً • حفظ الصور محلياً بجهازك • النسخ والمسح
            </p>
          </div>
        </div>

        {/* Real-time sync indicator badge */}
        <span
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 shadow-2xs ${
            firebaseConfig && isOnline
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-amber-50 text-amber-900 border-amber-300'
          }`}
        >
          {firebaseConfig && isOnline ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>متصل ومتزامن 🟢</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>يعمل بدون إنترنت - محفوظ محلياً 🟠</span>
            </>
          )}
        </span>
      </div>

      {statusMessage && (
        <div className="p-3 bg-teal-50 text-teal-900 border border-teal-200 rounded-2xl text-xs font-bold flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-teal-700">
            ×
          </button>
        </div>
      )}

      {/* 2. Notification & Alarm Engine Management Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900 text-base">
                  فحص وإدارة التنبيهات والمنبه
                </h3>
                <span className="text-[11px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-200">
                  Universal Engine
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                محرك التنبيهات الشامل للهواتف الذكية وتطبيقات أندرويد APK - يضمن رنين المنبه الطبي والاهتزاز حتى في وضع عدم الاتصال بالإنترنت.
              </p>
            </div>
          </div>

          {/* Current Status Badge */}
          <div className="shrink-0">
            {notifStatus.mode === 'system_granted' && (
              <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>مفعلة في النظام 🟢</span>
              </span>
            )}
            {notifStatus.mode === 'apk_inapp_mode' && (
              <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-50 text-teal-800 border border-teal-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                <span>وضع المنبه الداخلي للـ APK 🔔</span>
              </span>
            )}
            {notifStatus.permission === 'denied' && (
              <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>محظورة من إعدادات الهاتف ⚠️</span>
              </span>
            )}
            {!notifStatus.enabled && notifStatus.permission !== 'denied' && (
              <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>غير مفعلة ⚪</span>
              </span>
            )}
          </div>
        </div>

        {/* Feature Pills / Diagnostics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col">
            <span className="text-slate-400 text-[10px]">نظام الصوت (Web Audio)</span>
            <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5 text-[11px]">
              <Volume2 className="w-3.5 h-3.5 text-teal-600" />
              جاهز محلياً
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col">
            <span className="text-slate-400 text-[10px]">الاهتزاز (Vibration)</span>
            <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5 text-[11px]">
              <Smartphone className="w-3.5 h-3.5 text-teal-600" />
              {typeof navigator !== 'undefined' && 'vibrate' in navigator ? 'مدعوم بالجهاز' : 'وضع الصوت'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col">
            <span className="text-slate-400 text-[10px]">استيقاظ الشاشة (WakeLock)</span>
            <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              {notifStatus.wakeLockSupported ? 'مدعوم ومفعل' : 'وضع الشاشة'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col">
            <span className="text-slate-400 text-[10px]">منبه ساعة أندرويد</span>
            <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5 text-[11px]">
              <Clock className="w-3.5 h-3.5 text-orange-600" />
              Intent مدعوم ⏰
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col">
            <span className="text-slate-400 text-[10px]">جسر أندرويد / Capacitor</span>
            <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5 text-[11px]">
              <Smartphone className="w-3.5 h-3.5 text-teal-600" />
              {notifStatus.capacitorDetected || notifStatus.androidBridgeDetected
                ? 'جسر APK نشط 🟢'
                : 'PWA Web'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col">
            <span className="text-slate-400 text-[10px]">إشعارات السحابة FCM</span>
            <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5 text-[11px]">
              <Cloud className="w-3.5 h-3.5 text-teal-600" />
              {notifStatus.hasFcmToken ? 'مسجل ونشط 🟢' : 'جاهز للربط'}
            </span>
          </div>
        </div>

        {/* Clock Test Feedback Banner */}
        {clockTestMessage && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs font-bold text-orange-950 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600 shrink-0" />
              <span>{clockTestMessage}</span>
            </div>
            <button onClick={() => setClockTestMessage(null)} className="text-orange-700">
              ×
            </button>
          </div>
        )}

        {/* FCM Token Display Card if available */}
        {notifStatus.fcmToken && (
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5 font-bold text-teal-900">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>مفتاح FCM Web Push السحابي نشط للجهاز:</span>
              </div>
              <div className="font-mono text-[10px] text-teal-800 truncate mt-0.5 max-w-md">
                {notifStatus.fcmToken}
              </div>
            </div>

            <button
              onClick={handleCopyFcmToken}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-teal-100 text-teal-800 border border-teal-300 rounded-xl font-bold text-[11px] shrink-0 transition cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-teal-600" />
              <span>{tokenCopied ? 'تم النسخ ✅' : 'نسخ المفتاح'}</span>
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {/* Audio & in-app alarm test */}
          <button
            onClick={handleTestAlarm}
            disabled={isTestingAlarm}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-75"
          >
            {isTestingAlarm ? (
              <>
                <Volume2 className="w-4 h-4 text-yellow-200 animate-bounce" />
                <span>جاري الرنين والاهتزاز (5 ثوانٍ)...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>إرسال إشعار وتجربة رنين المنبه الآن</span>
              </>
            )}
          </button>

          {/* Android Native Clock Alarm Test */}
          <button
            onClick={handleTestClockIntent}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer"
            title="يرسل أمراً لنظام الهاتف لفتح تطبيق الساعة والمنبه وضبط رنين بعد دقيقتين"
          >
            <Clock className="w-4 h-4 text-orange-400" />
            <span>تجربة فتح ساعة ومنبه الهاتف الأصلية ⏰</span>
          </button>

          {/* FCM Push Register Button */}
          <button
            onClick={handleRegisterFcm}
            disabled={isRegisteringFcm}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold text-xs shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4 text-teal-600" />
            <span>{isRegisteringFcm ? 'جاري الاتصال بـ FCM...' : 'تحديث إذن وإعدادات FCM Web Push'}</span>
          </button>

          {!notifStatus.enabled && (
            <button
              onClick={handleActivateNotifications}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              <span>تفعيل التنبيهات وفتح محرك الصوت</span>
            </button>
          )}

          {alarmTestSuccess && (
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              تم إرسال الإشعار وتشغيل رنين المنبه والاهتزاز بنجاح!
            </span>
          )}
        </div>
      </div>

      {/* 3. Google Sign-In & Firebase Cloud Sync Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              الربط السحابي ومزامنة البيانات (Firebase Cloud Sync)
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              قم بتسجيل الدخول بحساب Google للربط مع سحابة Firebase وحفظ بياناتك النصية والأرقام بشكل دائم عبر أجهزتك المختلفة (يتم حفظ الصور محلياً داخل هاتفك فقط وفق معمارية التخزين الهجين).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {!isLoggedInGoogle ? (
            <button
              onClick={() => setIsLoggedInGoogle(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer"
            >
              {/* Google G icon */}
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>تسجيل الدخول عبر Google</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 p-2 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>تم تسجيل الدخول بحساب Google المتصل</span>
              <button
                onClick={() => setIsLoggedInGoogle(false)}
                className="text-xs text-rose-600 hover:underline mr-2"
              >
                خروج
              </button>
            </div>
          )}

          <button
            onClick={() => setShowConfigDrawer(!showConfigDrawer)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs border border-teal-200 transition cursor-pointer"
          >
            <Key className="w-3.5 h-3.5 text-teal-700" />
            <span>إعدادات مفاتيح Firebase (Config)</span>
            {showConfigDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Collapsible Config Drawer */}
        {showConfigDrawer && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3.5 animate-in fade-in">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ألصق إعدادات مشروع Firebase الخاص بك بصيغة JSON:
              </label>
              <textarea
                rows={5}
                value={jsonConfigInput}
                onChange={(e) => setJsonConfigInput(e.target.value)}
                placeholder={`{\n  "apiKey": "AIzaSy...",\n  "authDomain": "my-app.firebaseapp.com",\n  "projectId": "my-app",\n  "appId": "1:..."\n}`}
                className="w-full p-3 font-mono text-xs bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-teal-500"
                dir="ltr"
              />
            </div>

            {/* VAPID Key field for FCM Web Push */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <label className="block text-xs font-bold text-teal-900">
                مفتاح Web Push Certificate (VAPID Key) لإشعارات السحابة FCM Push:
              </label>
              <input
                type="text"
                value={vapidKeyInput}
                onChange={(e) => setVapidKeyInput(e.target.value)}
                placeholder="BOm_X9..."
                className="w-full px-3 py-2 font-mono text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-teal-500"
                dir="ltr"
              />
              <p className="text-[11px] text-slate-500 leading-relaxed">
                تجد هذا المفتاح في Firebase Console ➔ Project Settings ➔ Cloud Messaging ➔ Web Configuration (KeyPair). يتيح إرسال تنبيهات حتى لو كان التطبيق مغلقاً.
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500">
                يتم حفظ المفاتيح محلياً في متصفحك للمزامنة المباشرة
              </span>
              <button
                onClick={handleSaveConfig}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                تطبيق وحفظ الإعدادات
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Backup & Restore Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 text-base">
            النسخ الاحتياطي واستعادة البيانات (Backup & Restore)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            قم بتنزيل ملف نسخة احتياطية من جميع السجلات والأدوية والمواعيد للرجوع إليها في أي وقت
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Export */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تصدير نسخة احتياطية (Export Backup)</span>
          </button>

          {/* Import */}
          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition active:scale-95 cursor-pointer">
            <Upload className="w-4 h-4 text-slate-600" />
            <span>استعادة نسخة سابقة (Import Backup)</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* 4. Optional Demo Data Loading */}
      <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-3xl p-5 border border-teal-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-900 font-bold text-sm">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <h4>تحميل بيانات تجريبية استرشادية (اختياري للاختبار)</h4>
          </div>
          <p className="text-xs text-teal-800 mt-1">
            يضيف عائلة نموذجية (أب مريض ضغط، أم مريضة سكر، طفل) وأدوية حقيقية لاختبار المنبه والمساعد الذكي فوراً.
          </p>
        </div>

        <button
          onClick={onSeedDemoData}
          className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
        >
          تحميل بيانات استرشادية
        </button>
      </div>

      {/* 5. Danger Zone (مسح جميع البيانات والبدء من الصفر) */}
      <div className="bg-rose-50/70 rounded-3xl p-5 border border-rose-200 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-rose-950 font-bold text-base">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          <h3>منطقة الخطر: تصفير الصيدلية بالكامل</h3>
        </div>
        <p className="text-xs text-rose-800 leading-relaxed">
          يمسح هذا الإجراء جميع الملفات الصحية للأفراد، الأدوية، الصور المخزنة محلياً في الذاكرة (IndexedDB)، وجداول التنبيهات، ويعيد التطبيق إلى حالة الصفر تماماً.
        </p>

        <button
          onClick={() => setShowResetConfirm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          <span>مسح جميع البيانات والبدء من الصفر</span>
        </button>
      </div>

      {/* Confirm Reset Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-rose-300 p-6 text-right space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900">
                هل أنت متأكد تماماً من رغبتك في مسح كل شيء؟
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                سيتم حذف كافة البيانات والصور المحلية بلا رجعة، وستعود جميع العدادات لـ (0).
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleConfirmReset}
                className="py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                نعم، امسح كل البيانات
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                تراجع وإلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
