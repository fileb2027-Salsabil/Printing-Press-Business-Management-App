import React from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { ShieldAlert, LogOut, RefreshCw, Clock, CheckCircle2, Mail, Lock } from 'lucide-react';

export const PendingApprovalScreen: React.FC = () => {
  const { currentUser, currentUserAccess, logout, forcePushToCloud } = useDatabase();

  const isRejected = currentUserAccess?.status === 'rejected';

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-xl border border-slate-200 text-center space-y-6">
        {/* Status Icon */}
        <div className="relative mx-auto w-20 h-20">
          <div
            className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg ${
              isRejected
                ? 'bg-rose-100 text-rose-600 shadow-rose-500/20'
                : 'bg-amber-100 text-amber-600 shadow-amber-500/20'
            }`}
          >
            {isRejected ? <Lock className="w-10 h-10" /> : <Clock className="w-10 h-10 animate-pulse" />}
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white flex items-center justify-center shadow">
            <ShieldAlert className={`w-5 h-5 ${isRejected ? 'text-rose-600' : 'text-amber-500'}`} />
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
            {isRejected ? 'একাউন্ট এক্সেস স্থগিত রয়েছে' : 'অ্যাকাউন্ট অনুমোদনের অপেক্ষায়'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {isRejected
              ? 'আপনার একাউন্টের এক্সেস সাময়িকভাবে স্থগিত করা হয়েছে। বিস্তারিত জানতে মেইন অ্যাডমিনের সাথে যোগাযোগ করুন।'
              : 'প্রেসের নিরাপত্তা এবং গোপনীয়তা রক্ষার স্বার্থে নতুন ব্যবহারকারীদের অ্যাডমিন কর্তৃক অনুমোদন ছাড়া কোনো তথ্য প্রদর্শন করা হয় না।'}
          </p>
        </div>

        {/* User Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2">
          <div className="flex items-center space-x-3">
            {currentUser?.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt={currentUser.displayName || 'User'}
                className="w-11 h-11 rounded-full border border-slate-200"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm">
                {(currentUser?.displayName || currentUser?.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="truncate">
              <div className="font-bold text-slate-800 text-sm truncate">
                {currentUser?.displayName || 'ব্যবহারকারী'}
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1 truncate">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{currentUser?.email}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
            <span className="text-slate-500">অনুরোধের অবস্থা:</span>
            <span
              className={`font-bold px-2 py-0.5 rounded-full ${
                isRejected
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {isRejected ? 'অননুমোদিত / স্থগিত' : 'অপেক্ষমান (Pending Approval)'}
            </span>
          </div>
        </div>

        {/* Notice */}
        <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-xl p-3 text-xs text-emerald-800 text-left space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>কীভাবে এক্সেস পাবেন?</span>
          </div>
          <p className="text-[11px] text-emerald-700 leading-relaxed">
            মেইন অ্যাডমিন (
            <span className="font-bold font-mono">fileb2027@gmail.com</span>) তার আইডি থেকে
            লগইন করে আপনাকে নির্দিষ্ট মডিউলে কাজ করার এক্সেস প্রদান করবেন। এক্সেস অনুমোদিত হলে
            স্বয়ংক্রিয়ভাবে আপনার স্ক্রিন উন্মুক্ত হবে।
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
          <button
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span>পুনরায় চেক করুন</span>
          </button>

          <button
            onClick={() => logout()}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs sm:text-sm font-bold transition"
          >
            <LogOut className="w-4 h-4 text-slate-500" />
            <span>লগআউট করুন</span>
          </button>
        </div>

        <div className="pt-1">
          <button
            type="button"
            onClick={() => logout()}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition"
          >
            অ্যাডমিন প্যানেলে লগইন করতে চান? লগআউট করে অ্যাডমিন অ্যাকাউন্ট দিয়ে প্রবেশ করুন →
          </button>
        </div>
      </div>
    </div>
  );
};
