import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import {
  LogIn,
  UserPlus,
  Lock,
  Mail,
  User,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Printer,
  Cloud,
  CheckCircle2,
  Building2,
  Phone,
  MapPin,
  Sparkles,
  Users,
  KeyRound,
} from 'lucide-react';

export const AuthGatewayScreen: React.FC = () => {
  const {
    loginWithGoogle,
    loginWithEmailOrUsername,
    signupWithEmailOrUsername,
    loginAsParty,
    signupAsParty,
    saasRegistry,
  } = useDatabase();

  const [portalType, setPortalType] = useState<'press' | 'party'>('press');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [signupType, setSignupType] = useState<'business' | 'staff'>('business');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [shopPassword, setShopPassword] = useState('');
  const [showShopPassword, setShowShopPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Party Portal form states
  const [partyLoginId, setPartyLoginId] = useState('');
  const [partyPassword, setPartyPassword] = useState('');
  const [partyConfirmPassword, setPartyConfirmPassword] = useState('');
  const [partyName, setPartyName] = useState('');
  const [partyContactPerson, setPartyContactPerson] = useState('');
  const [partyPhone, setPartyPhone] = useState('');
  const [partyAddress, setPartyAddress] = useState('');

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const defaultTrialDays = saasRegistry.platformSettings.defaultTrialDays || 14;

  const handleGoogleSignIn = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    setError('');
    try {
      const res = await loginWithGoogle();
      if (!res.success && res.error && !res.error.includes('বাতিল')) {
        setError(res.error);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handlePartySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!partyLoginId.trim()) {
      setError('অনুগ্রহ করে পার্টির লগইন আইডি দিন');
      return;
    }
    if (!partyPassword) {
      setError('পাসওয়ার্ড দিন');
      return;
    }

    if (mode === 'signup') {
      if (!partyName.trim()) {
        setError('আপনার নাম বা প্রকাশনীর নাম লিখুন');
        return;
      }
      if (!partyPhone.trim()) {
        setError('যোগাযোগের মোবাইল নম্বর দিন');
        return;
      }
      if (partyPassword.trim().length < 4) {
        setError('পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে');
        return;
      }
      if (partyPassword !== partyConfirmPassword) {
        setError('পাসওয়ার্ড ও নিশ্চিতকরণ পাসওয়ার্ড মেলেনি!');
        return;
      }
      setLoading(true);
      try {
        const res = await signupAsParty({
          partyName: partyName.trim(),
          contactPerson: partyContactPerson.trim() || undefined,
          phone: partyPhone.trim(),
          address: partyAddress.trim() || undefined,
          loginId: partyLoginId.trim(),
          password: partyPassword.trim(),
        });
        if (!res.success) {
          setError(res.error || 'পার্টি সাইন আপ ব্যর্থ হয়েছে');
        }
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        const res = await loginAsParty(partyLoginId.trim(), partyPassword);
        if (!res.success) {
          setError(res.error || 'পার্টি আইডি অথবা পাসওয়ার্ড সঠিক নয়!');
        }
      } finally {
        setLoading(false);
      }
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
      if (signupType === 'business' && !businessName.trim()) {
        setError('অনুগ্রহ করে আপনার প্রেস / ব্যবসা প্রতিষ্ঠানের নাম লিখুন');
        return;
      }
      if (signupType === 'business' && shopPassword.trim().length < 4) {
        setError('দোকানের হিসাব সুরক্ষিত রাখতে কমপক্ষে ৪ অক্ষরের দোকানের পাসওয়ার্ড দিন');
        return;
      }

      setLoading(true);
      try {
        const res = await signupWithEmailOrUsername(
          identifier,
          password,
          displayName,
          signupType === 'business'
            ? {
                registerNewBusiness: true,
                businessName: businessName.trim(),
                phone: businessPhone.trim(),
                address: businessAddress.trim(),
                planType: 'trial',
                shopPassword: shopPassword.trim(),
              }
            : undefined
        );
        if (res.success) {
          setSuccessMsg(
            signupType === 'business'
              ? `অ্যাকাউন্ট ও "${businessName.trim()}" নিবন্ধন সফল হয়েছে! মেইন অ্যাডমিনের অনুমোদনের পর ${defaultTrialDays} দিনের ফ্রি ট্রায়াল চালু হবে।`
              : 'অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে! অ্যাডমিন অনুমোদনের পর নির্ধারিত মডিউলসমূহ উন্মুক্ত হবে।'
          );
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
        if (!res.success) {
          setError(res.error || 'লগইন ব্যর্থ হয়েছে! সঠিক ইউজারনেম ও পাসওয়ার্ড দিন।');
        }
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100">
      {/* Brand Header */}
      <div className="text-center mb-6 max-w-lg w-full space-y-1.5">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-xl shadow-emerald-500/30 mb-2">
          <Printer className="w-8 h-8" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
          Press Business Management & Accounting
        </h1>
        <p className="text-xs sm:text-sm text-emerald-300 font-medium">
          প্রিন্টিং প্রেস, প্রকাশনী ও প্রোডাকশন ক্লাউড হিসাব ব্যবস্থাপনা
        </p>
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold text-amber-300">
          <Sparkles className="w-3 h-3" />
          <span>এই এপ ডিজাইন বাই MD. Salsabil</span>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white text-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5">
        {/* Account Type Switcher: Press/Staff vs Customer Party Portal */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => {
              setPortalType('press');
              setError('');
              setSuccessMsg('');
            }}
            className={`py-2 px-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
              portalType === 'press'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>প্রেস / স্টাফ</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setPortalType('party');
              setError('');
              setSuccessMsg('');
            }}
            className={`py-2 px-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
              portalType === 'party'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>পার্টি পোর্টাল (কাস্টমার)</span>
          </button>
        </div>

        {/* Notice */}
        {portalType === 'press' ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-xs text-emerald-900 flex items-start space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-relaxed">
              <span className="font-bold block">সুরক্ষিত অ্যাকাউন্ট গেট:</span>
              <span>
                একই প্ল্যাটফর্মে প্রতিটি প্রেস প্রতিষ্ঠানের সম্পূর্ণ আলাদা ডাটাবেজ। লগইন করুন অথবা নতুন ব্যবসা প্রতিষ্ঠান নিবন্ধন করুন।
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3.5 text-xs text-indigo-900 flex items-start space-x-2.5">
            <Users className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-relaxed">
              <span className="font-bold block">কাস্টমার / পার্টি পোর্টাল:</span>
              <span>
                প্রেসের দেওয়া লগইন আইডি ও পাসওয়ার্ড দিয়ে লগইন করে আপনার বইয়ের তালিকা, বিল ও বকেয়া হিসাব দেখুন (পার্টির জন্য কোনো সাবস্ক্রিপশন ফি নেই)।
              </span>
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
              setSuccessMsg('');
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
              setSuccessMsg('');
            }}
            className={`py-2 rounded-lg transition ${
              mode === 'signup' ? 'bg-white text-emerald-700 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            {portalType === 'party' ? 'পার্টি সাইন আপ' : 'নতুন একাউন্ট (Sign Up)'}
          </button>
        </div>

        {/* Google 1-Click Button & Divider — ONLY for Press/Staff mode */}
        {portalType === 'press' && (
          <>
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
                <span>গুগল দিয়ে ১-ক্লিকে {mode === 'login' ? 'লগইন' : 'সাইন আপ'}</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider absolute">
                অথবা ইউজারনেম / পাসওয়ার্ড
              </span>
            </div>
          </>
        )}

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

        {/* Form: Party Portal OR Press/Staff */}
        {portalType === 'party' ? (
          <form onSubmit={handlePartySubmit} className="space-y-3.5 text-xs">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    পার্টি / প্রকাশনীর নাম *
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="যেমন: আল-মদিনা পাবলিকেশন্স"
                      value={partyName}
                      onChange={(e) => setPartyName(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">যোগাযোগকারীর নাম</label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="আপনার নাম"
                        value={partyContactPerson}
                        onChange={(e) => setPartyContactPerson(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-2.5 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">মোবাইল নম্বর *</label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="017XXXXXXXX"
                        value={partyPhone}
                        onChange={(e) => setPartyPhone(e.target.value)}
                        required
                        className="w-full pl-8 pr-2.5 py-2.5 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">ঠিকানা (ঐচ্ছিক)</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="বাংলাবাজার, ঢাকা"
                      value={partyAddress}
                      onChange={(e) => setPartyAddress(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-slate-700 font-bold mb-1">পার্টি লগইন আইডি *</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-3 text-indigo-500" />
                <input
                  type="text"
                  placeholder="যেমন: almadina01 (ইংরেজি অক্ষর/সংখ্যা)"
                  value={partyLoginId}
                  onChange={(e) => setPartyLoginId(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:outline-indigo-500 font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">পাসওয়ার্ড *</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="কমপক্ষে ৪ অক্ষরের পাসওয়ার্ড"
                  value={partyPassword}
                  onChange={(e) => setPartyPassword(e.target.value)}
                  required
                  className="w-full pl-9 pr-14 py-2.5 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 text-[11px] font-bold"
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
                    value={partyConfirmPassword}
                    onChange={(e) => setPartyConfirmPassword(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:outline-indigo-500 font-medium"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20 transition active:scale-[0.99] flex items-center justify-center space-x-2 text-sm"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : mode === 'login' ? (
                <LogIn className="w-4 h-4" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              <span>
                {loading
                  ? 'প্রসেসিং হচ্ছে...'
                  : mode === 'login'
                  ? 'পার্টি পোর্টালে লগইন করুন'
                  : 'পার্টি অ্যাকাউন্ট খুলুন'}
              </span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {mode === 'signup' && (
            <>
              {/* Signup Mode: New Press Business vs Staff Account */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSignupType('business')}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    signupType === 'business'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1 text-[11px]">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>নতুন প্রেস নিবন্ধন</span>
                  </div>
                  <p className="text-[10px] opacity-80 mt-0.5">{defaultTrialDays} দিন ফ্রি ট্রায়াল</p>
                </button>
                <button
                  type="button"
                  onClick={() => setSignupType('staff')}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    signupType === 'staff'
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-900'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1 text-[11px]">
                    <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>স্টাফ / অপারেটর</span>
                  </div>
                  <p className="text-[10px] opacity-80 mt-0.5">বিদ্যমান প্রেসে যোগ দিন</p>
                </button>
              </div>

              {signupType === 'business' && (
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 space-y-2.5">
                  <div>
                    <label className="block text-emerald-950 font-bold mb-1">প্রেস / ব্যবসা প্রতিষ্ঠানের নাম *</label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-emerald-600" />
                      <input
                        type="text"
                        placeholder="যেমন: আল-বারাকা অফসেট প্রেস"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        required={signupType === 'business'}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-emerald-300 rounded-xl focus:outline-emerald-600 font-medium"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="মোবাইল নম্বর"
                        value={businessPhone}
                        onChange={(e) => setBusinessPhone(e.target.value)}
                        className="w-full pl-8 pr-2 py-2 bg-white border border-slate-300 rounded-xl focus:outline-emerald-600 text-[11px]"
                      />
                    </div>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="ঠিকানা"
                        value={businessAddress}
                        onChange={(e) => setBusinessAddress(e.target.value)}
                        className="w-full pl-8 pr-2 py-2 bg-white border border-slate-300 rounded-xl focus:outline-emerald-600 text-[11px]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-emerald-950 font-bold mb-1">
                      দোকানের নিরাপত্তা পাসওয়ার্ড * <span className="font-normal text-slate-600">(কমপক্ষে ৪ অক্ষর)</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-emerald-600" />
                      <input
                        type={showShopPassword ? 'text' : 'password'}
                        placeholder="অন্য দোকান থেকে আপনার হিসাব আলাদা রাখতে পাসওয়ার্ড দিন"
                        value={shopPassword}
                        onChange={(e) => setShopPassword(e.target.value)}
                        required={signupType === 'business'}
                        minLength={4}
                        className="w-full pl-8 pr-12 py-2 bg-white border border-emerald-300 rounded-xl focus:outline-emerald-600 text-[11px] font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowShopPassword(!showShopPassword)}
                        className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 text-[10px] font-bold"
                      >
                        {showShopPassword ? 'লুকান' : 'দেখুন'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">আপনার সম্পূর্ণ নাম *</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="যেমন: সুমন আহমেদ"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:outline-emerald-500 font-medium"
                  />
                </div>
              </div>
            </>
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
                className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:outline-emerald-500 font-medium"
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
                className="w-full pl-9 pr-14 py-2.5 border border-slate-300 rounded-xl focus:outline-emerald-500 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 text-[11px] font-bold"
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
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:outline-emerald-500 font-medium"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 transition active:scale-[0.99] flex items-center justify-center space-x-2 text-sm"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : mode === 'login' ? (
              <LogIn className="w-4 h-4" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            <span>
              {loading
                ? 'প্রসেসিং হচ্ছে...'
                : mode === 'login'
                ? 'লগইন করুন'
                : signupType === 'business'
                ? 'প্রতিষ্ঠান নিবন্ধন ও অ্যাকাউন্ট খুলুন'
                : 'অ্যাকাউন্ট খুলুন'}
            </span>
          </button>
        </form>
        )}

        {/* Feature Highlights */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-500 font-medium">
          <div className="flex items-center space-x-1.5">
            <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>অটো ক্লাউড সিঙ্ক</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>মোবাইল ও পিসিতে সিঙ্ক</span>
          </div>
        </div>
      </div>

      {/* Security & Attribution Note */}
      <div className="mt-5 text-center max-w-md space-y-1">
        <p className="text-xs text-slate-400">
          🔒 সুরক্ষিত প্রেস ডেটাবেজ। নতুন ব্যবসা নিবন্ধন বা স্টাফ এক্সেস মেইন অ্যাডমিন অনুমোদনের পর সম্পূর্ণ সচল হয়।
        </p>
        <p className="text-[11px] text-emerald-400/90 font-semibold">
          Press Business Management & Accounting • Designed by MD. Salsabil
        </p>
      </div>
    </div>
  );
};
