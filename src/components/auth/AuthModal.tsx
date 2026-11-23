import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { LogIn, UserPlus, X, Lock, Mail, User, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const { loginWithGoogle, loginWithEmailOrUsername, signupWithEmailOrUsername } = useDatabase();

  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    setError('');
    try {
      const res = await loginWithGoogle();
      if (res.success) {
        onClose();
      } else if (res.error && !res.error.includes('বাতিল')) {
        setError(res.error);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!identifier.trim()) {
      setError('অনুগ্রহ করে ইউজারনেম বা ইমেইল লিখুন');
      return;
    }
    if (!password) {
      setError('পাসওয়ার্ড লিখুন');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
        return;
      }
      if (password !== confirmPassword) {
        setError('পাসওয়ার্ড ও নিশ্চিতকরণ পাসওয়ার্ড মেলেনি!');
        return;
      }
      if (!displayName.trim()) {
        setError('অনুগ্রহ করে আপনার পুরো নাম লিখুন');
        return;
      }

      setLoading(true);
      try {
        const res = await signupWithEmailOrUsername(identifier, password, displayName);
        if (res.success) {
          setSuccessMsg('অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে! অ্যাডমিনের অনুমোদনের পর সম্পূর্ণ এক্সেস উন্মুক্ত হবে।');
          setTimeout(() => {
            onClose();
          }, 1500);
        } else {
          setError(res.error || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে');
        }
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        const res = await loginWithEmailOrUsername(identifier, password);
        if (res.success) {
          onClose();
        } else {
          setError(res.error || 'লগইন ব্যর্থ হয়েছে');
        }
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 my-auto max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              {mode === 'login' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {mode === 'login' ? 'অ্যাকাউন্টে লগইন করুন' : 'নতুন অ্যাকাউন্ট তৈরি করুন'}
              </h3>
              <p className="text-[11px] text-slate-500">Press Business Management & Accounting • MD. Salsabil</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`py-2 rounded-lg transition ${
              mode === 'login' ? 'bg-white text-emerald-700 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            লগইন (Sign In)
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError('');
            }}
            className={`py-2 rounded-lg transition ${
              mode === 'signup' ? 'bg-white text-emerald-700 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            সাইন আপ (Sign Up)
          </button>
        </div>

        {/* Google 1-Click Button */}
        <div>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-700 flex items-center justify-center space-x-3 shadow-2xs transition active:scale-[0.99]"
          >
            {googleLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
            ) : (
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
            )}
            <span>গুগল অ্যাকাউন্ট দিয়ে ১-ক্লিকে {mode === 'login' ? 'লগইন' : 'সাইন আপ'}</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-200 w-full" />
          <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider absolute">
            অথবা ইউজারনেম / পাসওয়ার্ড দিয়ে
          </span>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {mode === 'signup' && (
            <div>
              <label className="block text-slate-700 font-bold mb-1">আপনার পুরো নাম *</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="যেমন: মো. তারিকুল ইসলাম"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-emerald-500 font-medium"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-bold mb-1">
              ইউজারনেম অথবা ইমেইল *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="যেমন: admin বা user@example.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-emerald-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">পাসওয়ার্ড *</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-9 pr-12 py-2 border border-slate-300 rounded-xl focus:outline-emerald-500 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-[11px] font-bold"
              >
                {showPassword ? 'লুকান' : 'দেখুন'}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-slate-700 font-bold mb-1">পাসওয়ার্ড নিশ্চিত করুন *</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="একই পাসওয়ার্ড পুনরায় লিখুন"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-emerald-500 font-medium"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 transition active:scale-[0.99] flex items-center justify-center space-x-2"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : mode === 'login' ? (
              <LogIn className="w-4 h-4" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            <span>{loading ? 'প্রসেসিং হচ্ছে...' : mode === 'login' ? 'লগইন করুন' : 'অ্যাকাউন্ট খুলুন'}</span>
          </button>
        </form>

        {/* Security Note */}
        <p className="text-[11px] text-slate-400 text-center leading-relaxed">
          🔒 যেকেউ অ্যাকাউন্ট খুললেও মেইন অ্যাডমিন পাসওয়ার্ড ছাড়া অ্যাডমিন প্যানেলে প্রবেশ বা পারমিশন পরিবর্তন করা সম্ভব নয়।
        </p>
      </div>
    </div>
  );
};
