import React from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { translations } from '../../utils/i18n';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Printer,
  FileText,
  CreditCard,
  TrendingDown,
  UserCheck,
  CalendarCheck,
  Layers,
  Banknote,
  Scissors,
  Boxes,
  Disc,
  Package,
  BarChart3,
  Database,
  Settings,
  ShieldCheck,
  Droplet,
  Key,
  X,
  Crown,
  Lock,
  ClipboardList,
} from 'lucide-react';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { AppPermissionModule } from '../../types';

interface SidebarProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onNavigate,
  isOpen,
  onClose,
}) => {
  const { db, canAccessModule, isMainAdmin, isModuleLockedBySubscription } = useDatabase();
  const lang = db.settings.language;
  const t = translations[lang];

  const menuItems: { id: string; label: string; icon: any; moduleKey?: AppPermissionModule; adminOnly?: boolean }[] = [
    { id: 'dashboard', label: t.navDashboard, icon: LayoutDashboard, moduleKey: 'dashboard' },
    { id: 'parties', label: t.navParties, icon: Users, moduleKey: 'parties' },
    { id: 'books', label: t.navBooks, icon: BookOpen, moduleKey: 'books' },
    { id: 'production', label: t.navProduction, icon: Printer, moduleKey: 'production' },
    { id: 'order-slip', label: t.navOrderSlip || 'অর্ডার স্লিপ', icon: ClipboardList, moduleKey: 'production' },
    { id: 'plates', label: t.navPlates, icon: Disc, moduleKey: 'plates' },
    { id: 'paper-stock', label: t.navPaperStock, icon: Package, moduleKey: 'paperStock' },
    { id: 'billing', label: t.navBilling, icon: FileText, moduleKey: 'billing' },
    { id: 'collections', label: t.navCollections, icon: CreditCard, moduleKey: 'collections' },
    { id: 'income-expense', label: t.navIncomeExpense, icon: TrendingDown, moduleKey: 'incomeExpense' },
    { id: 'ink-suppliers', label: t.navInkSuppliers || 'কালির দোকান ও মালামাল', icon: Droplet, moduleKey: 'inkSuppliers' },
    { id: 'ink-order-slip', label: t.navInkOrderSlip || 'কালির দোকান স্লিপ', icon: ClipboardList, moduleKey: 'inkSuppliers' },
    { id: 'employees', label: t.navEmployees, icon: UserCheck, moduleKey: 'employees' },
    { id: 'attendance', label: t.navAttendance, icon: CalendarCheck, moduleKey: 'attendance' },
    { id: 'combined-attendance', label: t.navCombinedAttendance, icon: Layers, moduleKey: 'combinedAttendance' },
    { id: 'payroll', label: t.navPayroll, icon: Banknote, moduleKey: 'payroll' },
    { id: 'cutting', label: t.navPaperCutting, icon: Scissors, moduleKey: 'cutting' },
    { id: 'putti', label: t.navPuttiSales, icon: Boxes, moduleKey: 'putti' },
    { id: 'reports', label: t.navReports, icon: BarChart3, moduleKey: 'reports' },
    { id: 'user-access', label: t.navUserAccess || 'ব্যবহারকারী ও এক্সেস', icon: Key, moduleKey: 'userAccess' },
    { id: 'data-mgmt', label: t.navDataManagement, icon: Database, moduleKey: 'dataMgmt' },
    { id: 'settings', label: t.navSettings, icon: Settings, moduleKey: 'settings' },
    { id: 'saas-admin', label: 'সকল প্রেস ও সাবস্ক্রিপশন', icon: Crown, adminOnly: true },
    { id: 'tests', label: t.navTests, icon: ShieldCheck, adminOnly: true },
  ];

  const visibleMenuItems = menuItems.filter((item) => {
    if (item.adminOnly && !isMainAdmin) return false;
    if (item.moduleKey && !canAccessModule(item.moduleKey)) return false;
    return true;
  });

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden no-print"
        />
      )}

      {/* Sidebar Drawer / Fixed */}
      <aside
        className={`no-print fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile Header in Drawer */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between lg:hidden">
          <span className="font-bold text-white text-base">মেনু ও নেভিগেশন</span>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isSubLocked = item.moduleKey ? isModuleLockedBySubscription(item.moduleKey) : false;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition group ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/50'
                    : isSubLocked
                    ? 'text-slate-500 hover:text-amber-300 hover:bg-slate-800/60'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition ${
                      isActive
                        ? 'text-white'
                        : item.id === 'saas-admin'
                        ? 'text-amber-400'
                        : 'text-slate-400 group-hover:text-emerald-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {isSubLocked && (
                  <span title="পেইড মডিউল (মেয়াদ শেষ)" className="shrink-0 ml-1 inline-flex">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Mobile / PC App Installation Button */}
        <div className="px-3 pb-2">
          <PWAInstallButton variant="sidebar" />
        </div>

        {/* Footer info in sidebar */}
        <div className="p-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
          <div className="truncate w-full">
            <p className="text-slate-300 font-bold truncate">{db.settings.name}</p>
            <p className="text-[10px] text-slate-400 truncate">Press Business Management & Accounting</p>
            <p className="text-[10px] text-emerald-400 font-semibold truncate">Designed by MD. Salsabil</p>
          </div>
        </div>
      </aside>
    </>
  );
};
