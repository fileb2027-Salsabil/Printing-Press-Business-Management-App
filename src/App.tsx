import React, { useEffect, useState } from 'react';
import { DatabaseProvider, useDatabase } from './context/DatabaseContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { SetupWizard } from './components/setup/SetupWizard';
import { Dashboard } from './components/dashboard/Dashboard';
import { PartyManager } from './components/parties/PartyManager';
import { BookManager } from './components/books/BookManager';
import { DailyProduction } from './components/production/DailyProduction';
import { OrderSlipManager } from './components/production/OrderSlipManager';
import { BillingManager } from './components/billing/BillingManager';
import { DailyCollections } from './components/collections/DailyCollections';
import { IncomeExpenseManager } from './components/finance/IncomeExpenseManager';
import { EmployeeManager } from './components/employees/EmployeeManager';
import { DailyAttendance } from './components/payroll/DailyAttendance';
import { CombinedAttendanceReport } from './components/payroll/CombinedAttendanceReport';
import { PayrollManager } from './components/payroll/PayrollManager';
import { PaperCuttingManager } from './components/cutting/PaperCuttingManager';
import { PuttiSalesManager } from './components/putti/PuttiSalesManager';
import { ReportsDashboard } from './components/reports/ReportsDashboard';
import { DataManagement } from './components/data/DataManagement';
import { SettingsManager } from './components/settings/SettingsManager';
import { PlateManager } from './components/plates/PlateManager';
import { PaperStockManager } from './components/paper/PaperStockManager';
import { InkSupplierManager } from './components/ink/InkSupplierManager';
import { InkOrderSlipManager } from './components/ink/InkOrderSlipManager';
import { UserAccessManager } from './components/users/UserAccessManager';
import { PendingApprovalScreen } from './components/users/PendingApprovalScreen';
import { AuthGatewayScreen } from './components/auth/AuthGatewayScreen';
import { AutomatedTestsRunner } from './components/testing/AutomatedTestsRunner';
import { PrintPreviewModal } from './components/common/PrintPreviewModal';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { QuotaExceededBanner } from './components/common/QuotaExceededBanner';
import { SaaSBusinessAdminPanel } from './components/saas/SaaSBusinessAdminPanel';
import { BusinessSwitcherModal } from './components/saas/BusinessSwitcherModal';
import {
  SubscriptionPaywallScreen,
  PendingBusinessApprovalScreen,
} from './components/saas/SubscriptionPaywallScreen';
import { PendingPartyPortalScreen, PartyPortalView } from './components/partyPortal/PartyPortalView';
import { DEFAULT_BUSINESS_ID } from './utils/cloudSync';
import { AppPermissionModule } from './types';
import { Lock, Eye, Wrench, ArrowLeft, AlertTriangle, KeyRound, Store, LogOut, CreditCard } from 'lucide-react';

const TAB_TO_MODULE: Record<string, AppPermissionModule> = {
  dashboard: 'dashboard',
  parties: 'parties',
  books: 'books',
  production: 'production',
  'order-slip': 'production',
  plates: 'plates',
  'paper-stock': 'paperStock',
  billing: 'billing',
  collections: 'collections',
  'income-expense': 'incomeExpense',
  'ink-suppliers': 'inkSuppliers',
  'ink-order-slip': 'inkSuppliers',
  employees: 'employees',
  attendance: 'attendance',
  'combined-attendance': 'combinedAttendance',
  payroll: 'payroll',
  cutting: 'cutting',
  putti: 'putti',
  reports: 'reports',
  'user-access': 'userAccess',
  'data-mgmt': 'dataMgmt',
  settings: 'settings',
};

const ORDERED_OPERATIONAL_TABS: { tab: string; module: AppPermissionModule }[] = [
  { tab: 'dashboard', module: 'dashboard' },
  { tab: 'attendance', module: 'attendance' },
  { tab: 'combined-attendance', module: 'combinedAttendance' },
  { tab: 'production', module: 'production' },
  { tab: 'order-slip', module: 'production' },
  { tab: 'books', module: 'books' },
  { tab: 'plates', module: 'plates' },
  { tab: 'paper-stock', module: 'paperStock' },
  { tab: 'parties', module: 'parties' },
  { tab: 'billing', module: 'billing' },
  { tab: 'collections', module: 'collections' },
  { tab: 'income-expense', module: 'incomeExpense' },
  { tab: 'ink-suppliers', module: 'inkSuppliers' },
  { tab: 'ink-order-slip', module: 'inkSuppliers' },
  { tab: 'employees', module: 'employees' },
  { tab: 'payroll', module: 'payroll' },
  { tab: 'cutting', module: 'cutting' },
  { tab: 'putti', module: 'putti' },
  { tab: 'reports', module: 'reports' },
  { tab: 'data-mgmt', module: 'dataMgmt' },
];

const AdminLockedScreen: React.FC = () => {
  const { unlockAdminPanel } = useDatabase();
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [show, setShow] = useState(false);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const res = unlockAdminPanel(pwd);
    if (!res.success) {
      setErr(res.error || 'ভুল পাসওয়ার্ড!');
    }
  };

  return (
    <div className="min-h-[55vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-xl border border-slate-200 text-center space-y-5 animate-in fade-in duration-150">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-md">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-800">অ্যাডমিন প্যানেল সুরক্ষিত</h2>
          <p className="text-xs text-slate-500">
            এই সেকশনে প্রবেশের জন্য মেইন অ্যাডমিন পাসওয়ার্ড প্রদান করুন
          </p>
        </div>

        {err && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold text-left">
            {err}
          </div>
        )}

        <form onSubmit={handleUnlock} className="space-y-3.5 text-xs text-left">
          <div>
            <label className="block font-bold text-slate-700 mb-1">মেইন অ্যাডমিন পাসওয়ার্ড:</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                placeholder="এডমিন পাসওয়ার্ড দিন"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                required
                autoFocus
                className="w-full pl-3 pr-14 py-2.5 border border-slate-300 rounded-xl font-medium text-sm focus:outline-amber-500"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 text-[11px] font-bold"
              >
                {show ? 'লুকান' : 'দেখুন'}
              </button>
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-2.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl shadow-md transition"
          >
            আনলক করুন
          </button>
        </form>
      </div>
    </div>
  );
};

const ShopPasswordLockScreen: React.FC = () => {
  const { currentBusiness, verifyAndUnlockBusiness, logout } = useDatabase();
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [show, setShow] = useState(false);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  if (!currentBusiness) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    const res = verifyAndUnlockBusiness(currentBusiness.id, pwd);
    if (!res.success) {
      setErr(res.error || 'দোকানের নিরাপত্তা পাসওয়ার্ড সঠিক নয়!');
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-xl border border-slate-200 text-center space-y-5 animate-in fade-in duration-150">
        <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-md">
          <KeyRound className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">দোকান নিরাপত্তা লক</p>
          <h2 className="text-xl font-black text-slate-900">{currentBusiness.name}</h2>
          <p className="text-xs text-slate-500">
            এই প্রতিষ্ঠানের হিসাব-নিকাশ সুরক্ষিত রাখতে দোকানের নিরাপত্তা পাসওয়ার্ড দিয়ে প্রবেশ করুন
          </p>
        </div>

        {err && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold text-left">
            {err}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs text-left">
          <div>
            <label className="block font-bold text-slate-700 mb-1">দোকানের পাসওয়ার্ড:</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                placeholder="দোকানের নিরাপত্তা পাসওয়ার্ড লিখুন"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                required
                autoFocus
                className="w-full pl-3 pr-14 py-2.5 border border-slate-300 rounded-xl font-medium text-sm focus:outline-emerald-600"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 text-[11px] font-bold"
              >
                {show ? 'লুকান' : 'দেখুন'}
              </button>
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition"
          >
            দোকানে প্রবেশ করুন
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
          <button
            type="button"
            onClick={() => setIsSwitcherOpen(true)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-bold rounded-xl flex items-center space-x-1.5 transition"
          >
            <Store className="w-3.5 h-3.5" />
            <span>অন্য দোকান বা নতুন দোকান</span>
          </button>
          <button
            type="button"
            onClick={() => logout()}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl flex items-center space-x-1 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>লগআউট</span>
          </button>
        </div>
      </div>

      <BusinessSwitcherModal isOpen={isSwitcherOpen} onClose={() => setIsSwitcherOpen(false)} />
    </div>
  );
};

const AppContent: React.FC = () => {
  const {
    db,
    isReady,
    authResolved,
    isCloudHydrating,
    hasVerifiedEmptyCloudDoc,
    cloudSyncStatus,
    updateSettings,
    currentUser,
    currentUserAccess,
    isMainAdmin,
    isAdminPanelUnlocked,
    isCurrentBusinessUnlocked,
    isReadOnly,
    canAccessModule,
    currentBusiness,
    saasRegistry,
    subscriptionInfo,
    isModuleLockedBySubscription,
    switchBusiness,
    isPartyPortalUser,
    currentPartyAccount,
    logout,
  } = useDatabase();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [wantsAdminRoute, setWantsAdminRoute] = useState<boolean>(() =>
    typeof window !== 'undefined' && /^\/(admin|saas-admin)(\/|$)/i.test(window.location.pathname)
  );
  const [focusedPartyId, setFocusedPartyId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Automatically redirect user to their first permitted tab if activeTab is inaccessible
  // (e.g., an Attendance-only operator immediately lands on 'attendance', not blank 'dashboard')
  useEffect(() => {
    if (!isReady || !currentUser || !authResolved || isCloudHydrating) return;
    if (!isMainAdmin && currentUserAccess?.status !== 'approved') return;

    if (wantsAdminRoute) {
      setWantsAdminRoute(false);
      if (typeof window !== 'undefined' && /^\/(admin|saas-admin)(\/|$)/i.test(window.location.pathname)) {
        try {
          window.history.replaceState({}, '', '/');
        } catch {
          // ignore
        }
      }
      if (isMainAdmin) {
        setActiveTab('saas-admin');
        return;
      }
      if (currentUserAccess?.role === 'super_admin' || currentUserAccess?.role === 'admin') {
        setActiveTab('user-access');
        return;
      }
    }

    if (activeTab === 'subscription') return;

    const isAdminRoute =
      activeTab === 'user-access' ||
      activeTab === 'settings' ||
      activeTab === 'tests' ||
      activeTab === 'saas-admin';

    if (isAdminRoute) {
      if ((activeTab === 'tests' || activeTab === 'saas-admin') && !isMainAdmin) {
        const firstAllowed = ORDERED_OPERATIONAL_TABS.find((item) => canAccessModule(item.module));
        if (firstAllowed) setActiveTab(firstAllowed.tab);
      }
      return;
    }

    const activeMod = TAB_TO_MODULE[activeTab];
    if (!activeMod || !canAccessModule(activeMod)) {
      const firstAllowed = ORDERED_OPERATIONAL_TABS.find((item) => canAccessModule(item.module));
      if (firstAllowed && firstAllowed.tab !== activeTab) {
        setActiveTab(firstAllowed.tab);
      }
    }
  }, [
    isReady,
    authResolved,
    isCloudHydrating,
    currentUser,
    isMainAdmin,
    currentUserAccess,
    activeTab,
    wantsAdminRoute,
    canAccessModule,
  ]);

  const hasExistingRecords = Boolean(
    (db.parties?.length || 0) > 0 ||
      (db.books?.length || 0) > 0 ||
      (db.productions?.length || 0) > 0 ||
      (db.invoices?.length || 0) > 0 ||
      (db.collections?.length || 0) > 0 ||
      (db.employees?.length || 0) > 0 ||
      (db.transactions?.length || 0) > 0 ||
      (db.orderSlips?.length || 0) > 0 ||
      (db.inkPurchases?.length || 0) > 0
  );
  const isRegisteredNonDefaultShop = Boolean(
    currentBusiness && currentBusiness.id !== DEFAULT_BUSINESS_ID
  );
  const hasRegisteredStaff =
    (db.userAccessList?.length || 0) > 0 ||
    (saasRegistry.staffAccounts || []).some(
      (s) => (s.businessId || DEFAULT_BUSINESS_ID) === DEFAULT_BUSINESS_ID
    );

  // Auto-heal settings.isConfigured when a registered shop, saved records, staff, or non-main-admin logs in
  useEffect(() => {
    if (!isReady || !authResolved || !currentUser || isCloudHydrating) return;
    if (
      !db.settings.isConfigured &&
      (isRegisteredNonDefaultShop || hasExistingRecords || hasRegisteredStaff || !isMainAdmin)
    ) {
      updateSettings({
        isConfigured: true,
        ...(isRegisteredNonDefaultShop && currentBusiness?.name && !db.settings.name
          ? { name: currentBusiness.name, nameEn: currentBusiness.nameEn || currentBusiness.name }
          : {}),
      });
    }
  }, [
    isReady,
    authResolved,
    currentUser,
    isCloudHydrating,
    db.settings.isConfigured,
    db.settings.name,
    isRegisteredNonDefaultShop,
    hasExistingRecords,
    hasRegisteredStaff,
    isMainAdmin,
    currentBusiness?.name,
    currentBusiness?.nameEn,
    updateSettings,
  ]);

  if (!isReady || !authResolved || (currentUser && isCloudHydrating)) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm p-4">
        <div className="flex flex-col items-center space-y-3 text-center">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-bold text-base">Press Management — প্রেস ম্যানেজমেন্ট প্রস্তুত হচ্ছে...</p>
          <p className="text-xs text-emerald-400 font-semibold">
            {currentUser && isCloudHydrating
              ? 'ক্লাউড ডাটা ও দোকানের তথ্য লোড হচ্ছে...'
              : 'Designed by MD. Salsabil'}
          </p>
        </div>
      </div>
    );
  }

  // Mandatory Authentication Gate: Unauthenticated users CANNOT see dashboard or any data
  if (!currentUser) {
    return <AuthGatewayScreen />;
  }

  // Customer Party Portal Route (isolated from Press Staff/Owner routes & SetupWizard)
  if (isPartyPortalUser) {
    if (
      !currentPartyAccount ||
      !currentPartyAccount.businessId ||
      currentPartyAccount.status !== 'approved'
    ) {
      return <PendingPartyPortalScreen />;
    }

    const linkedBiz =
      currentBusiness ||
      (saasRegistry.businesses || []).find((b) => b.id === currentPartyAccount.businessId);
    const isPressSubscriptionActive = (() => {
      if (!linkedBiz || linkedBiz.status !== 'approved') return false;
      if (linkedBiz.planType === 'lifetime' || linkedBiz.planType === 'one_time') return true;
      if (!linkedBiz.expiresAt) return true;
      return new Date(linkedBiz.expiresAt).getTime() > Date.now();
    })();

    if (!isPressSubscriptionActive) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-xl border border-slate-200 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-black text-slate-900">প্রেস পোর্টাল সাময়িকভাবে বন্ধ আছে</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>"{linkedBiz?.name || currentPartyAccount.businessName}"</strong> এর সাবস্ক্রিপশন মেয়াদোত্তীর্ণ বা স্থগিত থাকায় পার্টি পোর্টাল সাময়িকভাবে বন্ধ রয়েছে। আপনার প্রেসের সাথে যোগাযোগ করুন।
            </p>
            <button
              type="button"
              onClick={() => logout()}
              className="w-full py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>লগআউট করুন</span>
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        <QuotaExceededBanner />
        <PartyPortalView />
        <PrintPreviewModal />
      </>
    );
  }

  // First run Setup Wizard (strictly ONLY for brand-new flagship initialization by main admin when cloud confirms empty DB)
  if (
    isMainAdmin &&
    !db.settings.isConfigured &&
    !isRegisteredNonDefaultShop &&
    !hasExistingRecords &&
    !hasRegisteredStaff &&
    hasVerifiedEmptyCloudDoc &&
    cloudSyncStatus !== 'offline' &&
    cloudSyncStatus !== 'quota_exceeded'
  ) {
    return <SetupWizard />;
  }

  // Pending / Unapproved Business Gate (for non-trial pending businesses only)
  if (
    !isMainAdmin &&
    currentBusiness &&
    currentBusiness.status === 'pending' &&
    currentBusiness.planType !== 'trial'
  ) {
    return (
      <div className="min-h-screen bg-slate-100">
        <Navbar
          onToggleSidebar={() => {}}
          activeTab=""
          onNavigate={() => {}}
        />
        <PendingBusinessApprovalScreen />
      </div>
    );
  }

  // Suspended Business Gate
  if (!isMainAdmin && currentBusiness && currentBusiness.status === 'suspended') {
    return (
      <div className="min-h-screen bg-slate-100">
        <Navbar
          onToggleSidebar={() => {}}
          activeTab=""
          onNavigate={() => {}}
        />
        <SubscriptionPaywallScreen />
      </div>
    );
  }

  // Shop Security Password Gate (must unlock shop before seeing shop data/accounts)
  if (!isMainAdmin && currentBusiness?.shopPassword && !isCurrentBusinessUnlocked) {
    return (
      <div className="min-h-screen bg-slate-100">
        <Navbar
          onToggleSidebar={() => {}}
          activeTab=""
          onNavigate={() => {}}
        />
        <ShopPasswordLockScreen />
      </div>
    );
  }

  // If a non-super-admin user has logged in, but is not approved inside this shop, block all press data!
  if (!isMainAdmin && currentUserAccess?.status !== 'approved') {
    return (
      <div className="min-h-screen bg-slate-100">
        <Navbar
          onToggleSidebar={() => {}}
          activeTab=""
          onNavigate={() => {}}
        />
        <PendingApprovalScreen />
      </div>
    );
  }

  // Selected Font Class
  const fontClass =
    db.settings.font === 'Noto Sans Bengali'
      ? 'font-noto'
      : db.settings.font === 'Tiro Bangla'
      ? 'font-tiro'
      : 'font-hind';

  const isAdminTab =
    activeTab === 'user-access' ||
    activeTab === 'settings' ||
    activeTab === 'tests' ||
    activeTab === 'saas-admin';

  const activeModuleKey = TAB_TO_MODULE[activeTab];
  const isPaidLockedCurrentTab =
    !isAdminTab && activeModuleKey ? isModuleLockedBySubscription(activeModuleKey) : false;

  return (
    <div className={`h-dvh overflow-hidden flex flex-col bg-slate-50 text-slate-900 ${fontClass}`}>
      {/* Top Navigation */}
      <Navbar
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        activeTab={activeTab}
        onNavigate={setActiveTab}
      />

      {/* Cloud Daily Quota Notice Banner (when daily free write units are exhausted) */}
      <QuotaExceededBanner />

      {/* Super Admin Live Support / Inspection Banner when viewing a customer's press */}
      {isMainAdmin && currentBusiness && currentBusiness.id !== DEFAULT_BUSINESS_ID && (
        <div className="bg-indigo-950 text-white px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 no-print shadow-xs">
          <div className="flex items-center space-x-2">
            <Wrench className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              সুপার অ্যাডমিন সাপোর্ট মোড: আপনি এখন <strong>"{currentBusiness.name}"</strong> ({currentBusiness.ownerEmail}) প্রতিষ্ঠানের ডাটাবেজ দেখছেন ও সমাধান করতে পারছেন।
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('saas-admin')}
              className="px-2.5 py-1 bg-indigo-800 hover:bg-indigo-700 rounded-lg font-bold text-[11px] transition"
            >
              সব প্রতিষ্ঠান তালিকা
            </button>
            <button
              onClick={() => switchBusiness(DEFAULT_BUSINESS_ID)}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-bold text-[11px] flex items-center space-x-1 transition"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>মূল প্রেসে ফিরুন</span>
            </button>
          </div>
        </div>
      )}

      {/* Subscription Expired Alert Banner */}
      {!isMainAdmin && subscriptionInfo.isExpired && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 text-xs text-rose-900 flex flex-wrap items-center justify-between gap-2 no-print">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">
              আপনার প্রতিষ্ঠানের <strong>{subscriptionInfo.planLabel}</strong> মেয়াদ শেষ হয়েছে। ফ্রি মডিউলসমূহ সচল আছে, তবে পেইড মডিউলসমূহ অস্থায়ীভাবে লক করা হয়েছে।
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('subscription')}
            className="text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded-full shadow-xs inline-flex items-center space-x-1 transition"
          >
            <CreditCard className="w-3 h-3" />
            <span>নবায়ন ও পেমেন্ট করুন 🔒</span>
          </button>
        </div>
      )}

      {/* Read-Only Top Alert Banner */}
      {isReadOnly && (
        <div className="bg-amber-100/90 border-b border-amber-300 px-4 py-2 text-xs text-amber-950 flex items-center justify-between no-print shadow-2xs">
          <div className="flex items-center space-x-2">
            <Eye className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="font-semibold">
              আপনি <strong>শুধুমাত্র প্রদর্শন মোডে (Read-Only)</strong> আছেন। আপনি সমস্ত খাতা, রিপোর্ট ও সার্চ সুবিধা ব্যবহার করতে পারবেন, কিন্তু তথ্য পরিবর্তন বা মুছে ফেলার অনুমতি নেই।
            </span>
          </div>
          <span className="hidden sm:inline-block text-[10px] font-bold bg-amber-200 border border-amber-400 text-amber-900 px-2.5 py-0.5 rounded-full">
            রিড-অনলি এক্সেস
          </span>
        </div>
      )}

      {/* Main Body */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onNavigate={(tab) => {
            setFocusedPartyId(null);
            setActiveTab(tab);
          }}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Content Area */}
        <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* If tab is subscription paywall & checkout */}
            {activeTab === 'subscription' ? (
              <SubscriptionPaywallScreen
                onNavigateDashboard={() => {
                  const firstFree = ORDERED_OPERATIONAL_TABS.find(
                    (item) => canAccessModule(item.module) && !isModuleLockedBySubscription(item.module)
                  );
                  setActiveTab(firstFree ? firstFree.tab : 'dashboard');
                }}
              />
            ) : !isMainAdmin && isAdminTab && !isAdminPanelUnlocked ? (
              <AdminLockedScreen />
            ) : isPaidLockedCurrentTab ? (
              <SubscriptionPaywallScreen
                onNavigateDashboard={() => {
                  const firstFree = ORDERED_OPERATIONAL_TABS.find(
                    (item) => canAccessModule(item.module) && !isModuleLockedBySubscription(item.module)
                  );
                  setActiveTab(firstFree ? firstFree.tab : 'dashboard');
                }}
              />
            ) : (
              <>
                {activeTab === 'dashboard' && canAccessModule('dashboard') && <Dashboard onNavigate={setActiveTab} />}
                {activeTab === 'parties' && canAccessModule('parties') && (
                  <PartyManager
                    initialPartyId={focusedPartyId}
                    onClearInitialParty={() => setFocusedPartyId(null)}
                  />
                )}
                {activeTab === 'books' && canAccessModule('books') && (
                  <BookManager
                    onSelectParty={(partyId) => {
                      setFocusedPartyId(partyId);
                      setActiveTab('parties');
                    }}
                  />
                )}
                {activeTab === 'production' && canAccessModule('production') && <DailyProduction />}
                {activeTab === 'order-slip' && canAccessModule('production') && <OrderSlipManager />}
                {activeTab === 'plates' && canAccessModule('plates') && <PlateManager />}
                {activeTab === 'paper-stock' && canAccessModule('paperStock') && <PaperStockManager />}
                {activeTab === 'billing' && canAccessModule('billing') && <BillingManager />}
                {activeTab === 'collections' && canAccessModule('collections') && <DailyCollections />}
                {activeTab === 'income-expense' && canAccessModule('incomeExpense') && <IncomeExpenseManager />}
                {activeTab === 'ink-suppliers' && canAccessModule('inkSuppliers') && <InkSupplierManager />}
                {activeTab === 'ink-order-slip' && canAccessModule('inkSuppliers') && <InkOrderSlipManager />}
                {activeTab === 'employees' && canAccessModule('employees') && <EmployeeManager />}
                {activeTab === 'attendance' && canAccessModule('attendance') && <DailyAttendance />}
                {activeTab === 'combined-attendance' && canAccessModule('combinedAttendance') && <CombinedAttendanceReport />}
                {activeTab === 'payroll' && canAccessModule('payroll') && <PayrollManager />}
                {activeTab === 'cutting' && canAccessModule('cutting') && <PaperCuttingManager />}
                {activeTab === 'putti' && canAccessModule('putti') && <PuttiSalesManager />}
                {activeTab === 'reports' && canAccessModule('reports') && <ReportsDashboard />}
                {activeTab === 'user-access' && <UserAccessManager />}
                {activeTab === 'data-mgmt' && canAccessModule('dataMgmt') && <DataManagement />}
                {activeTab === 'settings' && <SettingsManager />}
                {activeTab === 'saas-admin' && isMainAdmin && (
                  <SaaSBusinessAdminPanel onNavigate={setActiveTab} />
                )}
                {activeTab === 'tests' && isMainAdmin && <AutomatedTestsRunner />}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Universal Print Assistant & Preview Modal */}
      <PrintPreviewModal />

      {/* Floating Offline / Reconnection Banner */}
      <OfflineIndicator />
    </div>
  );
};

export default function App() {
  return (
    <DatabaseProvider>
      <AppContent />
    </DatabaseProvider>
  );
}
