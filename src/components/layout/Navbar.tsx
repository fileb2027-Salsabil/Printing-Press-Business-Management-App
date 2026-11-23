import React from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { translations } from '../../utils/i18n';
import {
  Menu,
  Globe,
  Printer,
  ShieldCheck,
  LogIn,
  LogOut,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Eye,
  Store,
  ChevronDown,
  Clock,
  Crown,
  CreditCard,
  FileDown,
} from 'lucide-react';
import { triggerPrint } from '../common/PrintHeader';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { AuthModal } from '../auth/AuthModal';
import { AdminPasswordModal } from '../auth/AdminPasswordModal';
import { BusinessSwitcherModal } from '../saas/BusinessSwitcherModal';

interface NavbarProps {
  onToggleSidebar: () => void;
  activeTab: string;
  onNavigate: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, activeTab: _activeTab, onNavigate }) => {
  const {
    db,
    updateSettings,
    currentUser,
    logout,
    cloudSyncStatus,
    forcePushToCloud,
    isAdminPanelUnlocked,
    lockAdminPanel,
    isReadOnly,
    isMainAdmin,
    currentBusiness,
    subscriptionInfo,
  } = useDatabase();
  const [isAuthMenuOpen, setIsAuthMenuOpen] = React.useState(false);
  const [isSyncingNow, setIsSyncingNow] = React.useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = React.useState(false);
  const [isBizSwitcherOpen, setIsBizSwitcherOpen] = React.useState(false);
  const lang = db.settings.language;
  const t = translations[lang];

  const handleManualSync = async () => {
    setIsSyncingNow(true);
    await forcePushToCloud(true);
    setIsSyncingNow(false);
  };

  const toggleLanguage = () => {
    updateSettings({ language: lang === 'bn' ? 'en' : 'bn' });
  };

  const activePressName = lang === 'bn' ? db.settings.name : db.settings.nameEn;

  return (
    <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Left: Mobile Menu & Logo */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden shrink-0"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div
            onClick={() => onNavigate('dashboard')}
            className="flex items-center space-x-2.5 cursor-pointer group min-w-0"
          >
            {db.settings.logoUrl ? (
              <img
                src={db.settings.logoUrl}
                alt={db.settings.name}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-contain border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-black text-lg sm:text-xl shadow-xs group-hover:bg-emerald-800 transition shrink-0">
                {(activePressName || 'P')[0]}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm sm:text-lg text-slate-900 tracking-tight truncate max-w-[140px] sm:max-w-[220px]">
                  {activePressName}
                </span>
                <span className="hidden xl:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                  Press Management
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 hidden md:block truncate">
                Press Business Management & Accounting • Designed by MD. Salsabil
              </p>
            </div>
          </div>

          {/* Multi-Business Switcher Pill */}
          {currentUser && (
            <button
              onClick={() => setIsBizSwitcherOpen(true)}
              className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-emerald-50 border border-slate-300 hover:border-emerald-300 text-slate-700 hover:text-emerald-800 transition shrink-0"
              title="ব্যবসা প্রতিষ্ঠান পরিবর্তন করুন বা নতুন প্রতিষ্ঠান যোগ করুন"
            >
              <Store className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="hidden lg:inline max-w-[120px] truncate">
                {currentBusiness?.name || activePressName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
          {/* Subscription / Trial Status Pill (Clickable to open Packages & Payment) */}
          {currentUser && currentBusiness && !isMainAdmin && (
            <button
              type="button"
              onClick={() => onNavigate('subscription')}
              className={`hidden xl:flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer hover:opacity-90 ${
                subscriptionInfo.isExpired
                  ? 'bg-rose-50 border-rose-300 text-rose-800'
                  : subscriptionInfo.isTrial
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-800'
              }`}
              title={`প্ল্যান: ${subscriptionInfo.planLabel} — প্যাকেজ নবায়ন ও পেমেন্ট করতে ক্লিক করুন`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>
                {subscriptionInfo.isExpired
                  ? 'মেয়াদ শেষ 🔒 (নবায়ন)'
                  : subscriptionInfo.isLifetime
                  ? 'আজীবন সক্রিয়'
                  : `${subscriptionInfo.isTrial ? 'ফ্রি ট্রায়াল' : 'প্যাকেজ'}: ${subscriptionInfo.daysRemaining} দিন`}
              </span>
            </button>
          )}

          {/* Read-Only Status Indicator */}
          {isReadOnly && (
            <div
              className="hidden lg:flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 border border-amber-300 text-amber-900"
              title="আপনি শুধুমাত্র প্রদর্শন মোডে (Read-Only) আছেন। সমস্ত সার্চ ও খাতা দেখতে পারবেন, কিন্তু কোনো পরিবর্তন করতে পারবেন না।"
            >
              <Eye className="w-3.5 h-3.5 text-amber-600" />
              <span>শুধু প্রদর্শন (Read-Only)</span>
            </div>
          )}

          {/* Admin Panel Quick Status / Lock Toggle */}
          {isAdminPanelUnlocked ? (
            <button
              onClick={lockAdminPanel}
              className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-rose-50 border border-emerald-300 hover:border-rose-300 text-emerald-800 hover:text-rose-700 transition group"
              title="এডমিন প্যানেল আনলকড আছে। লক করতে ক্লিক করুন।"
            >
              <Unlock className="w-3.5 h-3.5 text-emerald-600 group-hover:hidden" />
              <Lock className="w-3.5 h-3.5 text-rose-600 hidden group-hover:inline" />
              <span className="group-hover:hidden">এডমিন আনলকড</span>
              <span className="hidden group-hover:inline">এডমিন লক করুন</span>
            </button>
          ) : (
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-amber-50 border border-slate-300 hover:border-amber-300 text-slate-700 hover:text-amber-900 transition"
              title="এডমিন প্যানেল (সেটিংস, ডাটা ম্যানেজমেন্ট ও ইউজার এক্সেস) আনলক করতে পাসওয়ার্ড দিন"
            >
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>এডমিন প্যানেল</span>
            </button>
          )}

          {/* Account Menu & Device Sync */}
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setIsAuthMenuOpen(!isAuthMenuOpen)}
                className={`flex items-center space-x-1.5 p-1 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-bold transition ${
                  cloudSyncStatus === 'quota_exceeded'
                    ? 'bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900'
                    : 'bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900'
                }`}
                title={
                  cloudSyncStatus === 'quota_exceeded'
                    ? `${currentUser.email} (দৈনিক ক্লাউড কোটা সমাপ্ত, লোকাল সেভ সক্রিয়)`
                    : `${currentUser.email} (মোবাইল ও পিসি সিঙ্ক সক্রিয়)`
                }
              >
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="w-5 h-5 rounded-full object-cover border border-emerald-400"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px]">
                    {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="hidden md:inline max-w-[100px] truncate">
                  {currentUser.displayName || currentUser.email}
                </span>
                {cloudSyncStatus === 'quota_exceeded' ? (
                  <span className="w-2 h-2 rounded-full bg-amber-500" title="লোকাল মোড (কোটা পূর্ণ)" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="সিঙ্ক সক্রিয়" />
                )}
              </button>

              {isAuthMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 text-xs space-y-2.5">
                  <div className="border-b border-slate-100 pb-2">
                    <p className="font-bold text-slate-900 truncate">
                      {currentUser.displayName || 'লগইনকৃত অ্যাকাউন্ট'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                    {isReadOnly && (
                      <span className="inline-flex items-center space-x-1 mt-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        <Eye className="w-3 h-3 text-amber-600" />
                        <span>প্রদর্শন মোড (Read-Only)</span>
                      </span>
                    )}
                    {cloudSyncStatus === 'quota_exceeded' ? (
                      <span className="inline-flex items-center space-x-1 mt-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        <span>লোকাল মোড (ক্লাউড কোটা শেষ)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>মোবাইল ও কম্পিউটার সিঙ্ক সক্রিয়</span>
                      </span>
                    )}
                  </div>

                  {/* Business Switcher inside Dropdown */}
                  <button
                    onClick={() => {
                      setIsBizSwitcherOpen(true);
                      setIsAuthMenuOpen(false);
                    }}
                    className="w-full py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 rounded-lg text-xs font-bold flex items-center justify-between transition"
                  >
                    <span className="flex items-center space-x-1.5 truncate">
                      <Store className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="truncate">{currentBusiness?.name || activePressName}</span>
                    </span>
                    <span className="text-[10px] underline shrink-0 ml-1">পরিবর্তন</span>
                  </button>

                  {!isMainAdmin && currentBusiness && (
                    <button
                      onClick={() => {
                        onNavigate('subscription');
                        setIsAuthMenuOpen(false);
                      }}
                      className="w-full py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-bold flex items-center justify-between transition"
                    >
                      <span className="flex items-center space-x-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                        <span>প্যাকেজ নবায়ন ও পেমেন্ট</span>
                      </span>
                      <span className="text-[10px] underline">খুলুন</span>
                    </button>
                  )}

                  {isMainAdmin && (
                    <button
                      onClick={() => {
                        onNavigate('saas-admin');
                        setIsAuthMenuOpen(false);
                      }}
                      className="w-full py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition"
                    >
                      <Crown className="w-3.5 h-3.5 text-purple-600" />
                      <span>সকল প্রেস ও সাবস্ক্রিপশন কন্ট্রোল</span>
                    </button>
                  )}

                  {/* Admin Panel Unlock/Lock in Menu */}
                  {isAdminPanelUnlocked ? (
                    <button
                      onClick={() => {
                        lockAdminPanel();
                        setIsAuthMenuOpen(false);
                      }}
                      className="w-full py-1.5 px-2 bg-emerald-50 hover:bg-rose-50 text-emerald-800 hover:text-rose-700 rounded-lg text-xs font-bold flex items-center justify-between transition"
                    >
                      <span className="flex items-center space-x-1.5">
                        <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>এডমিন প্যানেল আনলকড</span>
                      </span>
                      <span className="text-[10px] text-rose-600 font-bold underline">লক করুন</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setIsAdminModalOpen(true);
                        setIsAuthMenuOpen(false);
                      }}
                      className="w-full py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      <span>এডমিন প্যানেল পাসওয়ার্ড আনলক</span>
                    </button>
                  )}

                  <button
                    onClick={handleManualSync}
                    disabled={isSyncingNow}
                    className="w-full py-1.5 px-2 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-spin text-emerald-600' : ''}`} />
                    <span>{isSyncingNow ? 'সিঙ্ক হচ্ছে...' : 'এখনই সিঙ্ক করুন'}</span>
                  </button>

                  <button
                    onClick={() => {
                      logout();
                      setIsAuthMenuOpen(false);
                    }}
                    className="w-full py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>লগআউট করুন</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition active:scale-95"
              title="গুগল বা ইউজারনেম/পাসওয়ার্ড দিয়ে লগইন ও সাইন আপ করুন"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>লগইন / সাইন আপ</span>
            </button>
          )}

          {/* PWA App Install Button */}
          <PWAInstallButton variant="header" />

          {/* Print Quick Button */}
          <button
            onClick={() => triggerPrint()}
            title={t.print}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg flex items-center space-x-1.5 text-xs font-semibold"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden md:inline">{t.print}</span>
          </button>

          {/* Custom PDF Quick Button */}
          <button
            onClick={() => triggerPrint(null, document.title, { mode: 'pdf' })}
            title="বর্তমান পেজের কাস্টম PDF তৈরি ও ডাউনলোড করুন"
            className="px-2.5 py-1.5 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg flex items-center space-x-1 text-xs font-bold transition"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PDF</span>
          </button>

          {/* Automated Tests shortcut (Main Admin Only) */}
          {isMainAdmin && (
            <button
              onClick={() => onNavigate('tests')}
              title="System Tests"
              className="px-2.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center space-x-1"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.navTests}</span>
            </button>
          )}

          {/* Quick Number Format Switcher (সহজ বাংলা ১২৩ / ইংরেজি 123) */}
          <button
            onClick={() => {
              const current = db.settings.numberFormat || 'bn';
              updateSettings({ numberFormat: current === 'bn' ? 'en' : 'bn' });
            }}
            title="সংখ্যা প্রদর্শন পদ্ধতি পরিবর্তন (সহজ বাংলা সংখ্যা / ইংরেজি সংখ্যা)"
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center space-x-1 transition tabular-nums"
          >
            <span className="text-emerald-700 font-black text-[13px]">
              {(db.settings.numberFormat || 'bn') === 'bn' ? '১২৩' : '123'}
            </span>
            <span className="hidden sm:inline text-[10px] text-slate-500 font-semibold">
              {(db.settings.numberFormat || 'bn') === 'bn' ? 'বাংলা' : 'Eng'}
            </span>
          </button>

          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center space-x-1.5 transition"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-600" />
            <span>{lang === 'bn' ? 'English' : 'বাংলা'}</span>
          </button>
        </div>
      </div>

      {/* Auth Modal (Google & Username/Password) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Admin Panel Password Unlock Modal */}
      <AdminPasswordModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onSuccess={() => onNavigate('user-access')}
      />

      {/* Business Switcher / Create New Business Modal */}
      <BusinessSwitcherModal
        isOpen={isBizSwitcherOpen}
        onClose={() => setIsBizSwitcherOpen(false)}
      />
    </header>
  );
};
