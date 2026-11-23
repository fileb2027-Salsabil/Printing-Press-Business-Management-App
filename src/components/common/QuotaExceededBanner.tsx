import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { AlertTriangle, ExternalLink, RefreshCw, X, ShieldCheck, Database } from 'lucide-react';

const FIREBASE_CONSOLE_URL =
  'https://console.firebase.google.com/project/gen-lang-client-0081240772/firestore/databases/ai-studio-businessmanageme-e710923d-386d-4ffa-ad5c-9ed6b9eec437/data?openUpgradeDialog=true';
const FIREBASE_PRICING_URL = 'https://firebase.google.com/pricing#cloud-firestore';

export const QuotaExceededBanner: React.FC = () => {
  const { isQuotaExceeded, isQuotaDismissed, dismissQuotaNotice, forcePushToCloud } = useDatabase();
  const [isRetrying, setIsRetrying] = useState(false);

  if (!isQuotaExceeded || isQuotaDismissed) {
    return null;
  }

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await forcePushToCloud(true);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="no-print bg-linear-to-r from-amber-500 via-amber-600 to-amber-700 text-white shadow-md border-b border-amber-600 text-xs py-2 px-3 sm:px-6 sticky top-16 z-25">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div className="flex items-start sm:items-center space-x-2.5">
          <div className="p-1.5 bg-amber-800/40 rounded-lg shrink-0 mt-0.5 sm:mt-0">
            <AlertTriangle className="w-4 h-4 text-amber-200" />
          </div>
          <div>
            <div className="flex items-center space-x-2 font-bold text-white text-xs sm:text-sm">
              <span>ফায়ারবেস ক্লাউড ফ্রি দৈনিক কোটা (Daily Free Writes) পূর্ণ হয়েছে</span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.2 rounded-full text-[10px] bg-amber-900/40 text-amber-100 border border-amber-400/30">
                <ShieldCheck className="w-3 h-3 mr-1 text-emerald-300" /> লোকাল সেভ সক্রিয়
              </span>
            </div>
            <p className="text-[11px] text-amber-100 font-normal leading-tight mt-0.5">
              আপনার সমস্ত ইনভয়েস, পার্টি ও হিসাব লোকাল মেমোরি (IndexedDB)-তে সম্পূর্ণ সুরক্ষিত আছে। আগামীকাল কোটা স্বয়ংক্রিয়ভাবে রিসেট হলে ক্লাউড সিঙ্ক পুনরায় চালু হবে।
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-1.5 shrink-0 self-end md:self-center">
          <a
            href={FIREBASE_CONSOLE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 bg-white text-amber-900 hover:bg-amber-50 font-bold rounded-md shadow-2xs flex items-center space-x-1 text-[11px] transition"
            title="ফায়ারবেস কনসোলে ডেটাবেজ কোটা ও আপগ্রেড অপশন দেখুন"
          >
            <Database className="w-3 h-3 text-amber-700" />
            <span>কোটা / আপগ্রেড</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
          </a>

          <a
            href={FIREBASE_PRICING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 py-1 bg-amber-800/40 hover:bg-amber-800/60 text-white font-medium rounded-md border border-amber-400/30 flex items-center space-x-1 text-[11px] transition"
          >
            <span>মূল্য তালিকা</span>
          </a>

          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="px-2.5 py-1 bg-amber-900/60 hover:bg-amber-900/80 text-white font-bold rounded-md border border-amber-400/40 flex items-center space-x-1 text-[11px] transition"
            title="কোটা রিসেট হয়েছে কিনা পরীক্ষা করতে সিঙ্ক করুন"
          >
            <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? 'যাচাই হচ্ছে...' : 'পুনরায় চেষ্টা'}</span>
          </button>

          <button
            onClick={dismissQuotaNotice}
            className="p-1 hover:bg-amber-800/50 rounded text-amber-200 hover:text-white transition"
            title="লুকান"
            aria-label="লুকান"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
