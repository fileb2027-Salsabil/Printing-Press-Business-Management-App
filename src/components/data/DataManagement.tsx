import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { translations } from '../../utils/i18n';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  FileSpreadsheet,
  ShieldAlert,
  Trash2,
  Cloud,
  Share2,
  HardDrive,
  History,
  RotateCcw,
  Smartphone,
  Monitor,
  Sparkles,
  ShieldCheck,
  Check,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AppPermissionModule } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallModal } from '../common/PWAInstallModal';

export const DataManagement: React.FC = () => {
  const {
    db,
    canManageResetAndDemo,
    canAccessModule,
    isMainAdmin,
    currentUserAccess,
    cloudSyncStatus,
    forcePushToCloud,
    resetBusinessData,
    resetCompanySettings,
    loadDemoData,
    clearDemoData,
    exportDatabaseJSON,
    importDatabaseJSON,
    autoSnapshots,
    createManualSnapshot,
    restoreSnapshotData,
    deleteAutoSnapshot,
    storageStats,
    isReadOnly,
  } = useDatabase();
  const activeShopName = db.settings.name || 'Press Management';
  const lang = db.settings.language;
  const t = translations[lang];

  // PWA install hook
  const { isInstallable, install } = usePWAInstall();
  const [isPWAHelpOpen, setIsPWAHelpOpen] = useState(false);

  // Cloud & Snapshot states
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [snapshotActionMsg, setSnapshotActionMsg] = useState<string | null>(null);
  const [isTakingSnapshot, setIsTakingSnapshot] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [restoreConfirmSnapshotId, setRestoreConfirmSnapshotId] = useState<string | null>(null);
  const [showUsageGuide, setShowUsageGuide] = useState(true);

  // Reset states
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [confirmDemoAction, setConfirmDemoAction] = useState<'load' | 'clear' | null>(null);
  const [demoMessage, setDemoMessage] = useState<string | null>(null);

  // Restore states
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Company settings reset states
  const [isCompanyResetModalOpen, setIsCompanyResetModalOpen] = useState(false);
  const [companyResetPin, setCompanyResetPin] = useState('');
  const [companyResetError, setCompanyResetError] = useState<string | null>(null);
  const [companyResetSuccess, setCompanyResetSuccess] = useState(false);

  const handleConfirmCompanyReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setCompanyResetError(null);
    const res = resetCompanySettings(companyResetPin);
    if (!res.success) {
      setCompanyResetError(res.error || 'ভুল পিন!');
      return;
    }
    setCompanyResetSuccess(true);
    setTimeout(() => {
      setIsCompanyResetModalOpen(false);
      setCompanyResetSuccess(false);
      setCompanyResetPin('');
    }, 1200);
  };

  // Download complete JSON backup
  const handleExportJSON = () => {
    const jsonStr = exportDatabaseJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `makkah_printers_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Cloud & Online Share (Google Drive, Gmail, WhatsApp, etc. via Web Share API)
  const handleCloudShare = async () => {
    const jsonStr = exportDatabaseJSON();
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `makkah_printers_backup_${dateStr}.json`;
    const file = new File([jsonStr], fileName, { type: 'application/json' });

    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: `${activeShopName} - অনলাইন ক্লাউড ব্যাকআপ`,
          text: `${activeShopName} (Press Management — প্রেস ম্যানেজমেন্ট) - তারিখ: ${dateStr}। এই ব্যাকআপ ফাইলটি গুগল ড্রাইভ (Google Drive) অথবা ইমেইলে সুরক্ষিত রাখুন।`,
          files: [file],
        });
        setShareMessage('ক্লাউড ব্যাকআপ সফলভাবে শেয়ার বা ড্রাইভে প্রেরণ করা হয়েছে!');
        setTimeout(() => setShareMessage(null), 4000);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleExportJSON();
        }
      }
    } else {
      // Direct download fallback with clear prompt
      handleExportJSON();
      setShareMessage('ব্যাকআপ ফাইলটি ডাউনলোড হয়েছে। এটি গুগল ড্রাইভ (Google Drive), জিমেইল বা হোয়াটসঅ্যাপে সেভ করে রাখুন।');
      setTimeout(() => setShareMessage(null), 6000);
    }
  };

  // Direct Live Firebase Cloud Sync (Online Backup)
  const handleLiveCloudSync = async () => {
    setIsSyncingCloud(true);
    try {
      const ok = await forcePushToCloud(true);
      if (ok) {
        setShareMessage('লাইভ অনলাইন ক্লাউডে আপনার ডেটা সফলভাবে সিঙ্ক ও ব্যাকআপ হয়েছে!');
      } else {
        setShareMessage('লাইভ ক্লাউড সিঙ্ক এই মুহূর্তে সম্ভব হচ্ছে না (অফলাইন বা দৈনিক কোটা পূর্ণ)। অনুগ্রহ করে গুগল ড্রাইভ/হোয়াটসঅ্যাপ বা অফলাইন JSON ব্যাকআপ ব্যবহার করুন।');
      }
      setTimeout(() => setShareMessage(null), 5000);
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Manual snapshot creation
  const handleTakeSnapshot = async () => {
    if (isReadOnly) return;
    setIsTakingSnapshot(true);
    const success = await createManualSnapshot();
    setIsTakingSnapshot(false);
    if (success) {
      setSnapshotActionMsg('সফল! নতুন অফলাইন স্ন্যাপশট সংরক্ষিত হয়েছে।');
      setTimeout(() => setSnapshotActionMsg(null), 3500);
    }
  };

  // Snapshot restore execution
  const handleConfirmRestoreSnapshot = async (id: string) => {
    if (isReadOnly) return;
    const ok = await restoreSnapshotData(id);
    setRestoreConfirmSnapshotId(null);
    if (ok) {
      setSnapshotActionMsg('স্ন্যাপশট থেকে ডেটাবেজ সফলভাবে রিস্টোর হয়েছে!');
      setTimeout(() => setSnapshotActionMsg(null), 4000);
    }
  };

  // Snapshot deletion
  const handleDeleteSnapshot = async (id: string) => {
    if (isReadOnly) return;
    await deleteAutoSnapshot(id);
    setSnapshotActionMsg('স্ন্যাপশট মুছে ফেলা হয়েছে।');
    setTimeout(() => setSnapshotActionMsg(null), 3000);
  };

  // Upload JSON backup
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importDatabaseJSON(content);
      if (res.success) {
        setImportStatus('ডেটাবেজ ব্যাকআপ সফলভাবে রিস্টোর হয়েছে!');
      } else {
        setImportStatus(`ত্রুটি: ${res.error}`);
      }
    };
    reader.readAsText(file);
  };

  // Perform Reset
  const handleConfirmReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setResetError(null);

    if (confirmText !== 'নিশ্চিত' && confirmText !== 'RESET') {
      setResetError('অনুগ্রহ করে নিশ্চিতকরণ বক্সে "নিশ্চিত" অথবা "RESET" লিখুন।');
      return;
    }

    const res = resetBusinessData(adminPin);
    if (!res.success) {
      setResetError(res.error || 'রিসেট ব্যর্থ হয়েছে');
      return;
    }

    setResetSuccess(true);
    setTimeout(() => {
      setIsResetModalOpen(false);
      setResetSuccess(false);
      setAdminPin('');
      setConfirmText('');
    }, 1500);
  };

  const isFullAdmin =
    isMainAdmin ||
    currentUserAccess?.role === 'super_admin' ||
    currentUserAccess?.role === 'admin';

  const allRecordStats: { label: string; count: number; module: AppPermissionModule }[] = [
    { label: 'কাস্টমার / পার্টি', count: db.parties.length, module: 'parties' },
    { label: 'বইয়ের তালিকা', count: db.books.length, module: 'books' },
    { label: 'দৈনিক প্রডাকশন', count: db.productions.length, module: 'production' },
    { label: 'অর্ডার স্লিপ', count: (db.orderSlips || []).length, module: 'production' },
    { label: 'কালির দোকান স্লিপ', count: (db.inkOrderSlips || []).length, module: 'inkSuppliers' },
    { label: 'বিল ও ইনভয়েস', count: db.invoices.length, module: 'billing' },
    { label: 'কালেকশন রসিদ', count: db.collections.length, module: 'collections' },
    { label: 'কর্মচারী সংখ্যা', count: db.employees.length, module: 'employees' },
    { label: 'হাজিরা রেকর্ড', count: db.attendance.length, module: 'attendance' },
    { label: 'অগ্রিম রেকর্ড', count: db.advances.length, module: 'payroll' },
    { label: 'বেতন শিট', count: db.payrolls.length, module: 'payroll' },
    { label: 'কাগজ কাটিং এন্ট্রি', count: db.cuttingRecords.length, module: 'cutting' },
    { label: 'পট্টি বিক্রি', count: db.puttiSales.length, module: 'putti' },
    { label: 'আয়-ব্যয় লেনদেন', count: db.transactions.length, module: 'incomeExpense' },
  ];

  const recordStats = isFullAdmin
    ? allRecordStats
    : allRecordStats.filter((item) => canAccessModule(item.module));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">{t.navDataManagement}</h2>
        <p className="text-xs text-slate-500">
          ব্যাকআপ, রিস্টোর, ডেমো ডেটা এবং ডেটাবেজ রিসেট নিয়ন্ত্রণ কেন্দ্র
        </p>
      </div>

      {/* Status Notifications */}
      {shareMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center space-x-2 text-xs font-bold">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{shareMessage}</span>
          </div>
          <button
            onClick={() => setShareMessage(null)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {snapshotActionMsg && (
        <div className="p-4 bg-indigo-50 border border-indigo-300 text-indigo-900 rounded-2xl flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center space-x-2 text-xs font-bold">
            <CheckCircle className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>{snapshotActionMsg}</span>
          </div>
          <button
            onClick={() => setSnapshotActionMsg(null)}
            className="text-xs font-bold text-indigo-700 hover:text-indigo-900 px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {demoMessage && (
        <div className="p-4 bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center space-x-2 text-xs font-bold">
            <CheckCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>{demoMessage}</span>
          </div>
          <button
            onClick={() => setDemoMessage(null)}
            className="text-xs font-bold text-amber-700 hover:text-amber-900 px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {!isFullAdmin && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl flex items-start space-x-2.5 text-xs">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <span>
            <strong>অনুমোদিত মডিউল ব্যাকআপ মোড:</strong> আপনার একাউন্টে যেসকল মডিউলের এক্সেস রয়েছে, আপনি শুধুমাত্র সেই মডিউলগুলোর ডাটা অনলাইন (ক্লাউড সিঙ্ক / ড্রাইভ / হোয়াটসঅ্যাপ) এবং অফলাইন (.json / স্ন্যাপশট) ব্যাকআপ ও রিস্টোর করতে পারবেন।
          </span>
        </div>
      )}

      {/* Multi-Year & Storage Engine Health Card */}
      <div className="bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-950 text-white p-6 rounded-3xl shadow-xl border border-emerald-800/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[11px] font-bold flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>স্থায়ী মাল্টি-ইয়ার স্টোরেজ সক্রিয়</span>
              </span>
              <span className="px-2.5 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full text-[11px] font-bold flex items-center space-x-1.5">
                <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                <span>অফলাইন + অনলাইন দ্বিমুখী ব্যাকআপ</span>
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
              যত বছর ইচ্ছা নির্ভয়ে হিসাব রাখুন — ডেটা কখনো মুছবে না
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              আপনার সফটওয়্যারে শক্তিশালী <b>IndexedDB পারসিস্টেন্ট ইঞ্জিন</b> যুক্ত করা হয়েছে। এটি ব্রাউজারের সাধারণ ৫ মেগাবাইট সীমা অতিক্রম করে গিগাবাইট পর্যন্ত জায়গা নিতে পারে। ফলে বিগত ১০-২০ বছরের হাজার হাজার পার্টি, বই, ছবি, প্রডাকশন ও রসিদের পূর্ণাঙ্গ খাতা স্থায়ীভাবে সুরক্ষিত থাকবে।
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto shrink-0">
            <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10 text-center">
              <span className="text-[10px] text-emerald-300 font-semibold block">স্টোরেজ স্থায়িত্ব</span>
              <p className="text-sm font-black text-white mt-0.5">
                {storageStats.isPersistent ? 'স্থায়ী (Persistent)' : 'সুরক্ষিত (Auto-Save)'}
              </p>
              <span className="text-[9px] text-slate-300">OS মুছবে না</span>
            </div>

            <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10 text-center">
              <span className="text-[10px] text-emerald-300 font-semibold block">ব্যবহৃত মেমোরি</span>
              <p className="text-sm font-black text-white mt-0.5">
                {storageStats.usageMB > 0 ? `${storageStats.usageMB} MB` : '১ MB এর কম'}
              </p>
              <span className="text-[9px] text-slate-300">অফলাইন স্টোরেজ</span>
            </div>

            <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10 text-center col-span-2 sm:col-span-1">
              <span className="text-[10px] text-emerald-300 font-semibold block">হিসাবের মেয়াদ</span>
              <p className="text-sm font-black text-emerald-400 mt-0.5">আজীবন / আনলিমিটেড</p>
              <span className="text-[9px] text-slate-300">সকল বছর অক্ষত</span>
            </div>
          </div>
        </div>

        {/* Action strip inside banner */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-slate-300 text-[11px]">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>মোবাইল ও কম্পিউটার উভয় ডিভাইসেই ইনস্টল করে দ্রুত কাজ করতে পারবেন।</span>
          </div>

          <button
            onClick={() => setIsPWAHelpOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 transition shadow-xs"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>মোবাইল ও পিসিতে ব্যবহারের নিয়ম দেখুন</span>
          </button>
        </div>
      </div>

      {/* Database Overview */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="font-bold text-sm text-slate-800 mb-4 flex items-center space-x-2">
          <Database className="w-4 h-4 text-emerald-700" />
          <span>বর্তমান সক্রিয় ডেটাবেজ পরিসংখ্যান</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {recordStats.map((item, idx) => (
            <div key={idx} className="bg-slate-50 p-3 rounded-xl border text-center">
              <span className="text-[10px] text-slate-500 font-semibold">{item.label}</span>
              <p className="text-lg font-black text-slate-900 mt-1">{item.count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Dual Backup Center: Online Cloud & Offline Local Backup */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Online Cloud Backup (Google Drive, WhatsApp, Gmail) */}
        <div className="bg-white p-6 rounded-2xl border-2 border-emerald-600/40 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl">
                <Cloud className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  অনলাইন ব্যাকআপ (Cloud)
                </span>
                <h4 className="font-bold text-base text-slate-900 mt-0.5">গুগল ড্রাইভ ও ক্লাউড সেভ</h4>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              এক ক্লিকে আপনার হিসাবটি সরাসরি <b>Google Drive</b>, <b>Gmail</b>, <b>WhatsApp</b> বা <b>OneDrive</b>-এ পাঠিয়ে দিন। যেকোনো নতুন মোবাইল বা কম্পিউটারে খুব সহজে রিস্টোর করতে পারবেন।
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleLiveCloudSync}
              disabled={isSyncingCloud}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-xs transition"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingCloud ? 'animate-spin' : ''}`} />
              <span>
                {isSyncingCloud
                  ? 'ক্লাউডে সিঙ্ক হচ্ছে...'
                  : cloudSyncStatus === 'synced'
                  ? 'লাইভ ক্লাউড সিঙ্ক আপডেট করুন'
                  : 'অনলাইনে লাইভ ক্লাউডে সেভ করুন'}
              </span>
            </button>

            <button
              onClick={handleCloudShare}
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-xs transition"
            >
              <Share2 className="w-4 h-4" />
              <span>গুগল ড্রাইভ / হোয়াটসঅ্যাপে পাঠান</span>
            </button>
          </div>
        </div>

        {/* 2. Offline JSON Backup File Download */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  অফলাইন ব্যাকআপ
                </span>
                <h4 className="font-bold text-base text-slate-900 mt-0.5">ডিভাইসে ফাইল ডাউনলোড</h4>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              কম্পিউটার বা মোবাইলের নিজস্ব মেমোরি / পেনড্রাইভে একটি পূর্ণাঙ্গ <b>.json ব্যাকআপ ফাইল</b> সেভ করে রাখুন। ইন্টারনেট ছাড়াই সবসময় ব্যবহার উপযোগী।
            </p>
          </div>

          <button
            onClick={handleExportJSON}
            className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-xs transition"
          >
            <Download className="w-4 h-4" />
            <span>JSON ফাইল ডাউনলোড করুন (.json)</span>
          </button>
        </div>

        {/* 3. Restore Box */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  ডেটা রিস্টোর
                </span>
                <h4 className="font-bold text-base text-slate-900 mt-0.5">ব্যাকআপ ফাইল থেকে পুনরুদ্ধার</h4>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              পূর্বে গুগল ড্রাইভ বা ডিভাইসে সংরক্ষিত যেকোনো ব্যাকআপ ফাইল আপলোড করলেই সাথে সাথে সকল হিসাব হুবহু ফিরে আসবে।
            </p>
          </div>

          <div>
            {isReadOnly ? (
              <div className="w-full py-3 bg-slate-100 text-slate-500 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <span>Read-Only মোডে রিস্টোর বন্ধ রয়েছে</span>
              </div>
            ) : (
              <label className="w-full py-3 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-xs transition cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>ব্যাকআপ ফাইল আপলোড ও রিস্টোর</span>
                <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
              </label>
            )}

            {importStatus && (
              <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 p-2 rounded mt-2 text-center">
                {importStatus}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Offline Auto-Snapshots History Manager */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <History className="w-5 h-5 text-emerald-700" />
              <h3 className="font-bold text-base text-slate-900">
                অফলাইন অটো-স্ন্যাপশট হিস্ট্রি (স্বয়ংক্রিয় ব্যাকআপ রিকোভারি)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              অ্যাপটি আপনার কাজের সময় স্বয়ংক্রিয়ভাবে বিগত ১৫টি রিকোভারি পয়েন্ট তৈরি করে রাখে। কোনো ভুল হলে বা আগের হিসাবে ফিরতে চাইলে এক ক্লিকে রিস্টোর করুন।
            </p>
          </div>

          {!isReadOnly && (
            <button
              onClick={handleTakeSnapshot}
              disabled={isTakingSnapshot}
              className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center space-x-2 transition shrink-0"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>{isTakingSnapshot ? 'স্ন্যাপশট নেওয়া হচ্ছে...' : 'এখনই অফলাইন স্ন্যাপশট তুলুন'}</span>
            </button>
          )}
        </div>

        {autoSnapshots.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <History className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600">
              এখনও কোনো স্বয়ংক্রিয় অফলাইন স্ন্যাপশট তৈরি হয়নি।
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              হিসাব সংরক্ষণ বা প্রডাকশন যোগ করার সাথে সাথে এখানে ক্রমান্বয়ে ১৫টি স্ন্যাপশট জমা হবে।
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3 rounded-l-lg">তারিখ ও সময়</th>
                  <th className="p-3">মোট রেকর্ড</th>
                  <th className="p-3">হিসাবের সারসংক্ষেপ</th>
                  <th className="p-3 text-right rounded-r-lg">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {autoSnapshots.map((snap, idx) => (
                  <tr key={snap.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {idx === 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            লেটেস্ট
                          </span>
                        )}
                        <span>{snap.date} • {snap.time}</span>
                      </div>
                    </td>
                    <td className="p-3 font-bold text-slate-700">
                      {snap.totalRecords} টি এন্ট্রি
                    </td>
                    <td className="p-3 text-slate-600">
                      {snap.summary}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {isReadOnly ? (
                        <span className="text-[11px] font-semibold text-slate-400">শুধু প্রদর্শন</span>
                      ) : (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setRestoreConfirmSnapshotId(snap.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-2xs transition"
                            title="এই সময়ের হিসাবে ডেটাবেজ ফিরিয়ে নিন"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>রিস্টোর</span>
                          </button>
                          <button
                            onClick={() => handleDeleteSnapshot(snap.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="স্ন্যাপশটটি মুছুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Demo Data & Fresh Start Box — Restricted strictly to Super Admin, Admin & Manager */}
      {canManageResetAndDemo && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <h3 className="font-bold text-base text-slate-900 border-b pb-2">
            টেস্টিং ও নতুন হিসাব শুরু করার সুবিধা
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Load Sample Demo Data */}
            <div className="p-4 border rounded-xl bg-slate-50/50 flex flex-col justify-between space-y-3">
              <div>
                <h4 className="font-bold text-sm text-slate-800 flex items-center space-x-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  <span>নমুনা ডেমো ডেটা লোড করুন</span>
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  {activeShopName}-এর উপযোগী বাস্তবসম্মত কিছু কাস্টমার, বই ও কর্মচারী যোগ করে সফটওয়্যারটি পরীক্ষা করুন।
                </p>
              </div>

              <button
                onClick={() => setConfirmDemoAction('load')}
                className="py-2.5 px-4 bg-white border border-slate-300 hover:bg-emerald-50 text-slate-800 rounded-lg text-xs font-bold transition text-center"
              >
                ডেমো ডেটা লোড করুন ⚡
              </button>
            </div>

            {/* Clean Sample Demo Data */}
            <div className="p-4 border rounded-xl bg-slate-50/50 flex flex-col justify-between space-y-3">
              <div>
                <h4 className="font-bold text-sm text-amber-800 flex items-center space-x-1.5">
                  <RefreshCw className="w-4 h-4 text-amber-600" />
                  <span>নমুনা ডেটা পরিষ্কার করুন</span>
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  টেস্টিং শেষে শুধুমাত্র নমুনা ডেমো রেকর্ডগুলো সরিয়ে ফেলুন, যাতে আসল কাজের এন্ট্রি অক্ষত থাকে।
                </p>
              </div>

              <button
                onClick={() => setConfirmDemoAction('clear')}
                className="py-2.5 px-4 bg-white border border-amber-300 hover:bg-amber-50 text-amber-800 rounded-lg text-xs font-bold transition text-center"
              >
                নমুনা ডেটা পরিষ্কার করুন 🧹
              </button>
            </div>

            {/* Reset Business Data */}
            <div className="p-4 border border-rose-200 rounded-xl bg-rose-50/30 flex flex-col justify-between space-y-3">
              <div>
                <h4 className="font-bold text-sm text-rose-800 flex items-center space-x-1.5">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>নতুন করে হিসাব শুরু করুন (ডেটা রিসেট)</span>
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  প্রতিষ্ঠানের প্রোফাইল, লোগো ও সেটিংস অক্ষত রেখে সব লেনদেন ও প্রডাকশন ডিলিট করে সম্পূর্ণ পরিষ্কার খাতা দিয়ে শুরু করুন।
                </p>
              </div>

              <button
                onClick={() => setIsResetModalOpen(true)}
                className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition text-center shadow-xs"
              >
                হিসাব রিসেট ডায়ালগ খুলুন ⚠️
              </button>
            </div>

            {/* Reset Company Settings */}
            <div className="p-4 border border-indigo-200 rounded-xl bg-indigo-50/30 flex flex-col justify-between space-y-3">
              <div>
                <h4 className="font-bold text-sm text-indigo-900 flex items-center space-x-1.5">
                  <ShieldAlert className="w-4 h-4 text-indigo-600" />
                  <span>কোম্পানি সেটিংস রিসেট</span>
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  প্রতিষ্ঠানের নাম, লোগো, মালিক বা ম্যানেজারের তথ্য নতুন করে সেটআপ উইজার্ডের মাধ্যমে পরিবর্তন করুন।
                </p>
              </div>

              <button
                onClick={() => {
                  setCompanyResetPin('');
                  setCompanyResetError(null);
                  setIsCompanyResetModalOpen(true);
                }}
                className="py-2.5 px-4 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold transition text-center shadow-xs"
              >
                কোম্পানি সেটিংস রিসেট করুন ⚙️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reset Confirmation (Super Admin, Admin & Manager only) */}
      {canManageResetAndDemo && isResetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-300 space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center space-x-3 text-rose-600">
              <ShieldAlert className="w-8 h-8 shrink-0" />
              <div>
                <h3 className="text-base font-black text-rose-700">সতর্কতা: ডেটাবেজ রিসেট</h3>
                <p className="text-xs text-slate-500">এই কাজটির পরে কোনো হিসাব ফেরত পাওয়া যাবে না</p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs text-rose-800 space-y-1">
              <p className="font-bold">• সমস্ত প্রডাকশন, বিল, কালেকশন, হাজিরা ও ব্যয় মুছে যাবে।</p>
              <p>• তবে আপনার প্রতিষ্ঠানের নাম, লোগো, মালিক/ম্যানেজার ও সেটিংস সংরক্ষিত থাকবে।</p>
              <p className="text-[11px] font-semibold text-slate-600 pt-1">
                রিসেটের আগে ব্যাকআপ ফাইল ডাউনলোড করে রাখা উত্তম।
              </p>
            </div>

            {resetError && (
              <p className="text-xs font-bold text-rose-600 bg-rose-100 p-2 rounded">
                {resetError}
              </p>
            )}

            {resetSuccess && (
              <p className="text-xs font-bold text-emerald-700 bg-emerald-100 p-2 rounded">
                সফল! নতুন খাতা প্রস্তুত করা হয়েছে।
              </p>
            )}

            <form onSubmit={handleConfirmReset} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  অ্যাডমিন পিন / পাসওয়ার্ড (ডিফল্ট: 1234)
                </label>
                <input
                  type="password"
                  required
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="PIN"
                  className="w-full border rounded-lg p-2 text-sm text-center font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  নিশ্চিত করতে বক্সে লিখুন: <b className="text-rose-600">নিশ্চিত</b> অথবা <b className="text-rose-600">RESET</b>
                </label>
                <input
                  type="text"
                  required
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full border rounded-lg p-2 text-sm text-center font-bold"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-600"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold"
                >
                  হ্যাঁ, রিসেট সম্পন্ন করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Demo Action Confirmation Modal (Super Admin, Admin & Manager only) */}
      <ConfirmModal
        isOpen={canManageResetAndDemo && confirmDemoAction === 'load'}
        title="নমুনা ডেটা লোড করুন"
        message={`আপনি কি টেস্ট করার জন্য ${activeShopName}-এর নমুনা ডেটা লোড করতে চান?`}
        confirmText="হ্যাঁ, লোড করুন"
        danger={false}
        onConfirm={() => {
          if (!canManageResetAndDemo) return;
          loadDemoData();
          setConfirmDemoAction(null);
          setDemoMessage('নমুনা ডেটা সফলভাবে লোড হয়েছে!');
          setTimeout(() => setDemoMessage(null), 4000);
        }}
        onCancel={() => setConfirmDemoAction(null)}
      />

      <ConfirmModal
        isOpen={canManageResetAndDemo && confirmDemoAction === 'clear'}
        title="নমুনা ডেটা পরিষ্কার করুন"
        message="আপনি কি টেস্ট করার জন্য লোড করা নমুনা রেকর্ডগুলো মুছে ফেলতে চান? আপনার নিজস্ব এন্ট্রি অক্ষত থাকবে।"
        confirmText="হ্যাঁ, পরিষ্কার করুন"
        danger={true}
        onConfirm={() => {
          if (!canManageResetAndDemo) return;
          clearDemoData();
          setConfirmDemoAction(null);
          setDemoMessage('নমুনা ডেটা পরিষ্কার করা হয়েছে!');
          setTimeout(() => setDemoMessage(null), 4000);
        }}
        onCancel={() => setConfirmDemoAction(null)}
      />

      {/* Modal: Company Settings Reset PIN */}
      {canManageResetAndDemo && isCompanyResetModalOpen && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900">
              কোম্পানি সেটিংস রিসেট
            </h3>
            <p className="text-xs text-slate-600">
              প্রতিষ্ঠানের নাম, লোগো ও প্রাথমিক তথ্য রিসেট করতে অনুগ্রহ করে অ্যাডমিন পিন (ডিফল্ট: 1234) দিন:
            </p>

            {companyResetError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold">
                {companyResetError}
              </div>
            )}

            {companyResetSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold">
                কোম্পানি সেটিংস রিসেট হয়েছে! সেটআপ উইজার্ড চালু হচ্ছে...
              </div>
            )}

            <form onSubmit={handleConfirmCompanyReset} className="space-y-4">
              <div>
                <input
                  type="password"
                  required
                  placeholder="অ্যাডমিন পিন লিখুন"
                  value={companyResetPin}
                  onChange={(e) => setCompanyResetPin(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-center text-sm font-mono tracking-widest font-bold focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsCompanyResetModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold"
                >
                  রিসেট করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Snapshot Restore Confirmation Modal */}
      <ConfirmModal
        isOpen={!isReadOnly && Boolean(restoreConfirmSnapshotId)}
        title="অফলাইন স্ন্যাপশট রিস্টোর নিশ্চিতকরণ"
        message="আপনি কি এই পূর্ববর্তী স্ন্যাপশটের হিসাবে ফিরে যেতে চান? এর ফলে ডেটাবেজের বর্তমান হিসাব ওই সময়ের অবস্থায় চলে যাবে।"
        confirmText="হ্যাঁ, রিস্টোর করুন"
        danger={false}
        onConfirm={() => {
          if (isReadOnly) return;
          if (restoreConfirmSnapshotId) {
            handleConfirmRestoreSnapshot(restoreConfirmSnapshotId);
          }
        }}
        onCancel={() => setRestoreConfirmSnapshotId(null)}
      />

      {/* Mobile & PC PWA Setup Modal */}
      <PWAInstallModal
        isOpen={isPWAHelpOpen}
        onClose={() => setIsPWAHelpOpen(false)}
      />
    </div>
  );
};
