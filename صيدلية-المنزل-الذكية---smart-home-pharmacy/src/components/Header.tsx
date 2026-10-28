import React from 'react';
import { Plus, Sparkles, Settings as SettingsIcon, Edit3, Wifi, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface HeaderProps {
  duaaText: string;
  onOpenDuaaModal: () => void;
  onOpenSettings: () => void;
  isCloudConnected?: boolean;
  notificationsActive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  duaaText,
  onOpenDuaaModal,
  onOpenSettings,
  isCloudConnected = false,
  notificationsActive = false,
}) => {
  const isOnline = useOnlineStatus();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md shadow-xs border-b border-teal-100">
      {/* Top App Bar */}
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-teal-700 to-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-700/20">
            <Plus className="w-6 h-6 stroke-[3]" />
            {/* Status dot */}
            <span
              className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                isOnline ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              title={isOnline ? 'متصل بالإنترنت' : 'يعمل بدون إنترنت (محلياً)'}
            />
          </div>

          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-1.5 tracking-tight">
              صيدلية المنزل الذكية
              <span className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-semibold bg-teal-50 text-teal-700 rounded-full border border-teal-200">
                إصدار الرعاية العائلية
              </span>
            </h1>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
              <span>إدارة صحية ذكية</span>
              <span className="text-slate-300">•</span>
              {notificationsActive ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded-md border border-teal-200">
                  <span>التنبيهات مفعلة 🔔</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                  {isOnline ? (
                    <>
                      <Wifi className="w-3 h-3 text-emerald-600" />
                      <span>جاهز ومحفوظ</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3 text-amber-600" />
                      <span>محلي أوفلاين</span>
                    </>
                  )}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenDuaaModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
            aria-label="تغيير دعاء الشفاء"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>دعاء ✨</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition border border-slate-200 cursor-pointer active:scale-95"
            aria-label="إعدادات الصيدلية والتخزين"
            title="الإعدادات والسحابة"
          >
            <SettingsIcon className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Sub-header Mint Green Banner */}
      <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 border-t border-teal-100/80 px-4 py-2">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
            <span className="shrink-0 px-2 py-0.5 text-[11px] font-bold bg-teal-600 text-white rounded-full shadow-xs">
              الأدعية
            </span>
            <span className="text-teal-950 font-medium truncate">
              {duaaText}
            </span>
          </div>

          <button
            onClick={onOpenDuaaModal}
            className="shrink-0 p-1 text-teal-700 hover:text-teal-900 hover:bg-teal-100/80 rounded-md transition"
            title="تعديل الدعاء"
            aria-label="تعديل الدعاء"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
