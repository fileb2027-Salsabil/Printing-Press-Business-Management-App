import React, { useState, useEffect } from 'react';
import { WifiOff, CheckCircle2, CloudUpload } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showReconnected) return null;

  if (showReconnected) {
    return (
      <div className="no-print fixed bottom-4 right-4 z-50 flex items-center space-x-2 bg-emerald-700 text-white px-3.5 py-2 rounded-xl shadow-lg border border-emerald-600 text-xs font-bold animate-bounce">
        <CheckCircle2 className="w-4 h-4 text-emerald-200" />
        <span>ইন্টারনেট পুনরায় সংযুক্ত হয়েছে! অনলাইন সিঙ্ক সক্রিয়।</span>
      </div>
    );
  }

  return (
    <div className="no-print fixed bottom-4 right-4 z-50 flex items-center space-x-2 bg-slate-900/95 text-amber-300 px-3.5 py-2.5 rounded-xl shadow-2xl border border-amber-500/30 text-xs font-bold backdrop-blur-xs">
      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
      <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
      <div>
        <span className="block text-white">অফলাইন মোড সক্রিয়</span>
        <span className="text-[10px] text-slate-300 font-normal">
          ইন্টারনেট ছাড়াও আপনার সমস্ত হিসাব ডিভাইসে নিরাপদ ও সেভ থাকছে।
        </span>
      </div>
    </div>
  );
};
