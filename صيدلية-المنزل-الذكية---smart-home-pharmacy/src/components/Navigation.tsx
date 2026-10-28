import React from 'react';
import { LayoutDashboard, Users, Pill, Clock, MoreHorizontal } from 'lucide-react';

export type TabType = 'dashboard' | 'patients' | 'medications' | 'schedules' | 'more';

interface NavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  pendingDosesCount?: number;
  lowStockCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  pendingDosesCount = 0,
  lowStockCount = 0,
}) => {
  const tabs = [
    {
      id: 'dashboard' as TabType,
      label: 'الرئيسية',
      icon: LayoutDashboard,
      badge: 0,
    },
    {
      id: 'patients' as TabType,
      label: 'العائلة',
      icon: Users,
      badge: 0,
    },
    {
      id: 'medications' as TabType,
      label: 'الأدوية',
      icon: Pill,
      badge: lowStockCount,
    },
    {
      id: 'schedules' as TabType,
      label: 'المواعيد',
      icon: Clock,
      badge: pendingDosesCount,
    },
    {
      id: 'more' as TabType,
      label: 'الإعدادات',
      icon: MoreHorizontal,
      badge: 0,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg pb-safe">
      <div className="max-w-lg mx-auto grid grid-cols-5 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center gap-1 transition-all py-1 cursor-pointer select-none ${
                isActive
                  ? 'text-teal-700 font-bold'
                  : 'text-slate-500 hover:text-slate-700 font-medium'
              }`}
              aria-label={tab.label}
            >
              {/* Active top indicator pill */}
              {isActive && (
                <span className="absolute top-0 w-8 h-1 bg-teal-600 rounded-b-full shadow-xs" />
              )}

              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'
                  }`}
                />
                {tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 min-w-4.5 text-[10px] font-bold text-white bg-rose-500 rounded-full flex items-center justify-center shadow-xs">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>

              <span className="text-[11px] leading-tight text-center tracking-tight truncate max-w-full px-1">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
