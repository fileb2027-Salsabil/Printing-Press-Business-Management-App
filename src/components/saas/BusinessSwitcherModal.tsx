import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { RegisteredBusiness, SubscriptionPlanType } from '../../types';
import {
  Building2,
  CheckCircle2,
  Clock,
  Plus,
  Store,
  X,
  ArrowRightCircle,
  ShieldCheck,
  Lock,
  KeyRound,
} from 'lucide-react';

interface BusinessSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BusinessSwitcherModal: React.FC<BusinessSwitcherModalProps> = ({ isOpen, onClose }) => {
  const {
    activeBusinessId,
    userBusinesses,
    isMainAdmin,
    saasRegistry,
    switchBusiness,
    verifyAndUnlockBusiness,
    registerNewBusiness,
  } = useDatabase();

  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [planType, setPlanType] = useState<SubscriptionPlanType>('trial');
  const [shopPassword, setShopPassword] = useState('');
  const [showShopPwd, setShowShopPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // Password prompt when switching into a password-protected shop
  const [pendingUnlockBiz, setPendingUnlockBiz] = useState<RegisteredBusiness | null>(null);
  const [unlockPwdInput, setUnlockPwdInput] = useState('');
  const [showUnlockPwd, setShowUnlockPwd] = useState(false);

  if (!isOpen) return null;

  const handleSelectShop = (biz: RegisteredBusiness) => {
    setError('');
    setMsg('');
    if (biz.id === activeBusinessId) {
      onClose();
      return;
    }
    if (!isMainAdmin && biz.shopPassword) {
      setPendingUnlockBiz(biz);
      setUnlockPwdInput('');
      return;
    }
    switchBusiness(biz.id);
    onClose();
  };

  const handleConfirmShopPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUnlockBiz) return;
    setError('');
    const res = verifyAndUnlockBusiness(pendingUnlockBiz.id, unlockPwdInput);
    if (res.success) {
      setPendingUnlockBiz(null);
      setUnlockPwdInput('');
      onClose();
    } else {
      setError(res.error || 'দোকানের পাসওয়ার্ড সঠিক নয়!');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMsg('');
    if (!name.trim()) {
      setError('ব্যবসা প্রতিষ্ঠানের নাম লিখুন');
      return;
    }
    if (shopPassword.trim().length < 4) {
      setError('দোকানের নিরাপত্তার জন্য কমপক্ষে ৪ অক্ষরের পাসওয়ার্ড দিন');
      return;
    }
    setSubmitting(true);
    try {
      const res = await registerNewBusiness({
        name,
        phone,
        address,
        planType,
        shopPassword: shopPassword.trim(),
      });
      if (res.success) {
        setName('');
        setPhone('');
        setAddress('');
        setShopPassword('');
        setShowAddForm(false);
        if (isMainAdmin) {
          onClose();
        } else {
          setMsg('নতুন প্রতিষ্ঠান যুক্ত হয়েছে! মেইন এডমিনের অনুমোদনের পর এটি সক্রিয় হবে।');
        }
      } else {
        setError(res.error || 'যোগ করা সম্ভব হয়নি');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">ব্যবসা প্রতিষ্ঠান পরিবর্তন / নতুন যুক্ত</h3>
              <p className="text-[11px] text-slate-500">
                প্রতিটি প্রতিষ্ঠানের হিসাব আলাদা ডাটাবেজ ও নিজস্ব পাসওয়ার্ডে সুরক্ষিত থাকে
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setPendingUnlockBiz(null);
              setShowAddForm(false);
              setError('');
              onClose();
            }}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {msg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
            {msg}
          </div>
        )}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
            {error}
          </div>
        )}

        {pendingUnlockBiz ? (
          <form onSubmit={handleConfirmShopPassword} className="space-y-3.5 text-xs">
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-2.5 text-amber-950">
              <KeyRound className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">{pendingUnlockBiz.name}</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  এক দোকান থেকে অন্য দোকানের হিসাব সুরক্ষিত রাখতে অনুগ্রহ করে এই দোকানের নিরাপত্তা পাসওয়ার্ড দিন:
                </p>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">দোকানের নিরাপত্তা পাসওয়ার্ড *</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type={showUnlockPwd ? 'text' : 'password'}
                  required
                  autoFocus
                  value={unlockPwdInput}
                  onChange={(e) => setUnlockPwdInput(e.target.value)}
                  placeholder="দোকানের পাসওয়ার্ড লিখুন"
                  className="w-full pl-9 pr-14 py-2 border border-slate-300 rounded-xl font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowUnlockPwd(!showUnlockPwd)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-[11px] font-bold"
                >
                  {showUnlockPwd ? 'লুকান' : 'দেখুন'}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPendingUnlockBiz(null);
                  setError('');
                }}
                className="px-4 py-2 border border-slate-300 rounded-xl font-bold"
              >
                ফিরে যান
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md"
              >
                দোকান খুলুন
              </button>
            </div>
          </form>
        ) : !showAddForm ? (
          <>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {userBusinesses.map((biz) => {
                const isActive = biz.id === activeBusinessId;
                return (
                  <button
                    key={biz.id}
                    onClick={() => handleSelectShop(biz)}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                      isActive
                        ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black shrink-0 ${
                          isActive ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
                        }`}
                      >
                        {biz.name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate flex items-center gap-1.5">
                          <span className="truncate">{biz.name}</span>
                          {biz.shopPassword && (
                            <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                          )}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span>{biz.ownerEmail}</span>
                          {biz.status === 'pending' ? (
                            <span className="text-amber-700 font-bold inline-flex items-center gap-0.5">
                              <Clock className="w-3 h-3" /> অপেক্ষমান
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-bold inline-flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3" /> অনুমোদিত
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isActive ? (
                      <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold shrink-0">
                        সক্রিয়
                      </span>
                    ) : (
                      <ArrowRightCircle className="w-5 h-5 text-slate-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  setError('');
                  setShowAddForm(true);
                }}
                className="w-full py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন প্রেস / ব্যবসা প্রতিষ্ঠান যুক্ত করুন</span>
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleCreate} className="space-y-3 text-xs">
            {!isMainAdmin && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  নতুন ব্যবসা প্রতিষ্ঠান তৈরি করার পর মেইন এডমিনের অনুমোদনের মাধ্যমে আপনার {saasRegistry.platformSettings.defaultTrialDays} দিনের ফ্রি ট্রায়াল ও একাউন্ট সক্রিয় হবে।
                </span>
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1">প্রতিষ্ঠানের নাম *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="যেমন: আল-বারাকা অফসেট প্রেস"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                দোকানের নিরাপত্তা পাসওয়ার্ড * <span className="font-normal text-slate-500">(কমপক্ষে ৪ অক্ষর)</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-emerald-600" />
                <input
                  type={showShopPwd ? 'text' : 'password'}
                  required
                  minLength={4}
                  value={shopPassword}
                  onChange={(e) => setShopPassword(e.target.value)}
                  placeholder="দোকানের হিসাব সুরক্ষিত রাখতে পাসওয়ার্ড দিন"
                  className="w-full pl-9 pr-14 py-2 border border-emerald-300 rounded-xl font-medium bg-emerald-50/30"
                />
                <button
                  type="button"
                  onClick={() => setShowShopPwd(!showShopPwd)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-[11px] font-bold"
                >
                  {showShopPwd ? 'লুকান' : 'দেখুন'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">মোবাইল নম্বর</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">প্যাকেজ পছন্দ</label>
                <select
                  value={planType}
                  onChange={(e) => setPlanType(e.target.value as SubscriptionPlanType)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white"
                >
                  <option value="trial">
                    ফ্রি ট্রায়াল ({saasRegistry.platformSettings.defaultTrialDays} দিন)
                  </option>
                  <option value="monthly">
                    মাসিক (৳{saasRegistry.platformSettings.plans.monthly.basePrice})
                  </option>
                  <option value="yearly">
                    বাৎসরিক (৳{saasRegistry.platformSettings.plans.yearly.basePrice})
                  </option>
                  <option value="one_time">
                    এককালীন / আজীবন (৳{saasRegistry.platformSettings.plans.one_time.basePrice})
                  </option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">ঠিকানা</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="ব্যবসার ঠিকানা"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl font-bold"
              >
                ফিরে যান
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md flex items-center space-x-1.5"
              >
                <Building2 className="w-4 h-4" />
                <span>{submitting ? 'সংরক্ষণ হচ্ছে...' : 'প্রতিষ্ঠান যুক্ত করুন'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
