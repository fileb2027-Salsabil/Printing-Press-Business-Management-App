import React, { useState, useEffect } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { SubscriptionPlanType } from '../../types';
import {
  CheckCircle2,
  Clock,
  Crown,
  Lock,
  LogOut,
  Phone,
  Mail,
  Sparkles,
  Store,
  ShieldAlert,
  CreditCard,
  Copy,
  Check,
  Send,
  AlertCircle,
  Wallet,
} from 'lucide-react';

interface SubscriptionPaywallScreenProps {
  onNavigateDashboard?: () => void;
}

export const SubscriptionPaywallScreen: React.FC<SubscriptionPaywallScreenProps> = ({
  onNavigateDashboard,
}) => {
  const {
    currentBusiness,
    saasRegistry,
    subscriptionInfo,
    submitSubscriptionPaymentRequest,
  } = useDatabase();
  const { plans, supportEmail, supportPhone, paymentInstructions, paymentMethods } =
    saasRegistry.platformSettings;

  const isSuspended = currentBusiness?.status === 'suspended';
  const enabledMethods = (paymentMethods || []).filter((m) => m.enabled);

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanType>('monthly');
  const [selectedMethodId, setSelectedMethodId] = useState<string>(
    enabledMethods[0]?.id || paymentMethods?.[0]?.id || 'pm_bkash'
  );
  const [senderNumber, setSenderNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Compute discounted price for any package given business-level % or ৳ discount
  const computePackagePricing = (planKey: 'monthly' | 'yearly' | 'one_time') => {
    const cfg = plans[planKey];
    const basePrice = Number(cfg?.basePrice || 0);
    const discType = currentBusiness?.discountType || 'amount';
    const discVal = Number(
      currentBusiness?.discountValue ?? currentBusiness?.discountAmount ?? 0
    );
    const discountAmount =
      discType === 'percent'
        ? Math.round((basePrice * Math.min(100, Math.max(0, discVal))) / 100)
        : Math.min(basePrice, Math.max(0, discVal));
    const finalPayable = Math.max(0, Math.round(basePrice - discountAmount));
    return {
      cfg,
      basePrice,
      discType,
      discVal,
      discountAmount,
      finalPayable,
    };
  };

  const selectedPricing = computePackagePricing(
    selectedPlan === 'yearly' || selectedPlan === 'one_time' ? selectedPlan : 'monthly'
  );

  useEffect(() => {
    setPaidAmount(selectedPricing.finalPayable);
  }, [selectedPlan, selectedPricing.finalPayable]);

  useEffect(() => {
    if (enabledMethods.length > 0 && !enabledMethods.some((m) => m.id === selectedMethodId)) {
      setSelectedMethodId(enabledMethods[0].id);
    }
  }, [enabledMethods, selectedMethodId]);

  const activeMethod =
    enabledMethods.find((m) => m.id === selectedMethodId) ||
    paymentMethods?.find((m) => m.id === selectedMethodId) ||
    enabledMethods[0];

  const myRequests = (saasRegistry.paymentRequests || []).filter(
    (r) => r.businessId === currentBusiness?.id
  );

  const handleCopyNumber = (id: string, num: string) => {
    if (!num) return;
    navigator.clipboard?.writeText(num).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!activeMethod) {
      setErrorMsg('অনুগ্রহ করে একটি পেমেন্ট মেথড নির্বাচন করুন।');
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitSubscriptionPaymentRequest({
        planType: selectedPlan,
        paymentMethodId: activeMethod.id,
        senderNumber,
        transactionId,
        paidAmount,
        notes,
      });
      if (res.success) {
        setSuccessMsg(
          'আপনার পেমেন্ট ও নবায়নের তথ্য সফলভাবে পাঠানো হয়েছে! সুপার এডমিন যাচাই করে অনুমোদন করলেই প্যাকেজের মেয়াদ চালু হবে।'
        );
        setSenderNumber('');
        setTransactionId('');
        setNotes('');
      } else {
        setErrorMsg(res.error || 'পেমেন্ট তথ্য পাঠানো সম্ভব হয়নি।');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const discType = currentBusiness?.discountType || 'amount';
  const discVal = Number(
    currentBusiness?.discountValue ?? currentBusiness?.discountAmount ?? 0
  );
  const hasDiscount = discVal > 0;

  return (
    <div className="min-h-[65vh] flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-8 shadow-xl border border-slate-200 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-sm">
            {isSuspended ? (
              <ShieldAlert className="w-8 h-8" />
            ) : subscriptionInfo.isExpired ? (
              <Lock className="w-8 h-8" />
            ) : (
              <Crown className="w-8 h-8" />
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            {isSuspended
              ? 'ব্যবসা প্রতিষ্ঠানের এক্সেস সাময়িকভাবে স্থগিত'
              : subscriptionInfo.isExpired
              ? 'ফ্রি ট্রায়াল / সাবস্ক্রিপশন মেয়াদ শেষ হয়েছে'
              : 'প্যাকেজ নবায়ন ও পেমেন্ট সেন্টার'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
            {isSuspended
              ? `"${currentBusiness?.name || ''}" প্রতিষ্ঠানের সাবস্ক্রিপশন বর্তমানে স্থগিত রয়েছে। পুনরায় সচল করতে নিচ থেকে প্যাকেজ বেছে পেমেন্ট করুন অথবা মেইন এডমিনের সাথে যোগাযোগ করুন।`
              : subscriptionInfo.isExpired
              ? `আপনার "${currentBusiness?.name || ''}" প্রতিষ্ঠানের ${subscriptionInfo.planLabel} মেয়াদ শেষ হওয়ায় পেইড মডিউলগুলো লক রয়েছে। ফ্রি মডিউলসমূহ (ড্যাশবোর্ড, পার্টি, বই, প্রোডাকশন ও হাজিরা) ব্যবহার চালু আছে।`
              : `আপনার "${currentBusiness?.name || ''}" প্রতিষ্ঠানের বর্তমান প্ল্যান: ${subscriptionInfo.planLabel}${
                  subscriptionInfo.daysRemaining !== null
                    ? ` (বাকি ${subscriptionInfo.daysRemaining} দিন)`
                    : ''
                }। নিচ থেকে পছন্দের প্যাকেজ নির্বাচন করে পেমেন্ট করুন।`}
          </p>
        </div>

        {/* Custom Discount Notice (% or ৳) */}
        {hasDiscount && (
          <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3.5 text-xs text-emerald-900 flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>আপনার প্রতিষ্ঠানের জন্য নির্ধারিত বিশেষ ডিস্কাউন্ট:</span>
            </span>
            <span className="font-black text-sm text-emerald-700 bg-white px-3 py-1 rounded-xl border border-emerald-200">
              {discType === 'percent'
                ? `${discVal}% ছাড় (সকল প্যাকেজে প্রযোজ্য)`
                : `৳${discVal.toLocaleString()} ছাড় (নির্বাচিত প্যাকেজ থেকে বিয়োগ)`}
            </span>
          </div>
        )}

        {/* Interactive 3 Package Cards */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-700">
            ১. আপনার পছন্দের প্যাকেজ নির্বাচন করুন (কার্ডে ক্লিক করুন):
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {(
              [
                {
                  key: 'monthly' as const,
                  badge: null,
                  accent: 'indigo',
                  durationText: `${plans.monthly.durationDays || 30} দিন মেয়াদ`,
                },
                {
                  key: 'yearly' as const,
                  badge: 'জনপ্রিয়',
                  accent: 'emerald',
                  durationText: `${plans.yearly.durationDays || 365} দিন মেয়াদ`,
                },
                {
                  key: 'one_time' as const,
                  badge: 'আজীবন',
                  accent: 'purple',
                  durationText: 'আজীবন আনলিমিটেড',
                },
              ] as const
            ).map((item) => {
              const p = computePackagePricing(item.key);
              const isSelected = selectedPlan === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setSelectedPlan(item.key);
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className={`text-left p-4 rounded-2xl border-2 transition relative flex flex-col justify-between space-y-2.5 ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-400/50 shadow-md'
                      : item.key === 'yearly'
                      ? 'border-emerald-300 bg-emerald-50/30 hover:border-emerald-500'
                      : item.key === 'one_time'
                      ? 'border-purple-200 bg-purple-50/40 hover:border-purple-400'
                      : 'border-slate-200 bg-slate-50 hover:border-indigo-400'
                  }`}
                >
                  {item.badge && (
                    <span
                      className={`absolute -top-2.5 right-3 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.key === 'yearly' ? 'bg-emerald-600' : 'bg-purple-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}

                  <div>
                    <span className="font-bold text-slate-900 flex items-center gap-1">
                      {item.key === 'one_time' && <Crown className="w-3.5 h-3.5 text-purple-600" />}
                      <span>{p.cfg.labelBn}</span>
                    </span>

                    <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
                      <span
                        className={`text-xl font-black ${
                          item.key === 'yearly'
                            ? 'text-emerald-700'
                            : item.key === 'one_time'
                            ? 'text-purple-700'
                            : 'text-indigo-700'
                        }`}
                      >
                        ৳{p.finalPayable.toLocaleString()}
                      </span>
                      {p.discountAmount > 0 && (
                        <>
                          <span className="text-xs line-through text-slate-400 font-semibold">
                            ৳{p.basePrice.toLocaleString()}
                          </span>
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {p.discType === 'percent'
                              ? `${p.discVal}% ছাড়`
                              : `৳${p.discountAmount.toLocaleString()} ছাড়`}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">{item.durationText}</p>
                  </div>

                  <div
                    className={`w-full py-1.5 rounded-xl text-center font-bold text-[11px] transition ${
                      isSelected
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white border border-slate-300 text-slate-700'
                    }`}
                  >
                    {isSelected ? '✓ নির্বাচিত প্যাকেজ' : 'প্যাকেজটি নির্বাচন করুন'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Payment Methods & Customer Submission Form */}
        <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-slate-50/70 space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>২. পেমেন্ট মেথড বেছে পেমেন্ট সম্পন্ন করুন</span>
            </h3>
            <span className="font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-xl border border-emerald-200">
              প্রদেয়: ৳{selectedPricing.finalPayable.toLocaleString()}
              {selectedPricing.discountAmount > 0 && (
                <span className="ml-1 text-[10px] font-bold text-emerald-700">
                  (ছাড় ৳{selectedPricing.discountAmount.toLocaleString()})
                </span>
              )}
            </span>
          </div>

          {enabledMethods.length === 0 ? (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-semibold">
              বর্তমানে কোনো অনলাইন পেমেন্ট মেথড সক্রিয় নেই। নিচের সাপোর্ট নম্বরে যোগাযোগ করুন।
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {enabledMethods.map((m) => {
                  const active = activeMethod?.id === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMethodId(m.id)}
                      className={`p-3 rounded-xl border text-left transition ${
                        active
                          ? 'bg-white border-indigo-600 ring-2 ring-indigo-300/60 shadow-xs'
                          : 'bg-white/80 border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Wallet className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{m.name}</span>
                        </span>
                        {active && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{m.accountType}</p>
                      <p className="font-mono font-bold text-slate-800 mt-1 text-[11px]">
                        {m.accountNumber || 'এডমিনের নম্বরে যোগাযোগ করুন'}
                      </p>
                    </button>
                  );
                })}
              </div>

              {activeMethod && (
                <div className="bg-white border border-indigo-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="font-bold text-indigo-950">
                      {activeMethod.name} ({activeMethod.accountType})
                    </p>
                    <p className="font-mono text-sm font-black text-indigo-700">
                      {activeMethod.accountNumber || 'সুপার এডমিনের সাথে যোগাযোগ করুন'}
                    </p>
                    {activeMethod.instructions && (
                      <p className="text-[11px] text-slate-600">{activeMethod.instructions}</p>
                    )}
                  </div>
                  {activeMethod.accountNumber && (
                    <button
                      type="button"
                      onClick={() => handleCopyNumber(activeMethod.id, activeMethod.accountNumber)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg font-bold text-[11px] flex items-center gap-1"
                    >
                      {copiedId === activeMethod.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>কপি হয়েছে</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>নম্বর কপি</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handlePaymentSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      প্রেরকের মোবাইল / একাউন্ট নম্বর *
                    </label>
                    <input
                      type="text"
                      required
                      value={senderNumber}
                      onChange={(e) => setSenderNumber(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      ট্রানজেকশন আইডি (TrxID) *
                    </label>
                    <input
                      type="text"
                      required
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="যেমন: BH89K2L0..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      প্রেরিত টাকা (৳) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-black text-emerald-700"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="পেমেন্ট সম্পর্কিত অতিরিক্ত নোট (ঐচ্ছিক)"
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl"
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5 transition shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span>{submitting ? 'পাঠানো হচ্ছে...' : 'পেমেন্ট তথ্য জমা দিন'}</span>
                  </button>
                </div>
              </form>
            </>
          )}

          {/* Customer's submitted payment requests status */}
          {myRequests.length > 0 && (
            <div className="pt-2 border-t border-slate-200 space-y-1.5">
              <p className="font-bold text-slate-700 text-[11px]">আপনার পাঠানো পেমেন্ট অনুরোধসমূহ:</p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {myRequests.slice(0, 5).map((req) => (
                  <div
                    key={req.id}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px]"
                  >
                    <div>
                      <span className="font-bold text-slate-900">{req.planLabel}</span> •{' '}
                      <span className="font-semibold text-indigo-700">{req.paymentMethodName}</span> •{' '}
                      <span className="font-mono">Trx: {req.transactionId}</span> •{' '}
                      <span className="font-bold">৳{req.paidAmount.toLocaleString()}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        req.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : req.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {req.status === 'approved'
                        ? 'অনুমোদিত ✓'
                        : req.status === 'rejected'
                        ? 'বাতিল'
                        : 'যাচাই চলছে'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Support & Contact Instructions */}
        <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 sm:p-5 text-xs space-y-2">
          <p className="font-bold text-amber-300 text-sm">নবায়ন ও পেমেন্ট নির্দেশনা:</p>
          <p className="text-slate-300 leading-relaxed">{paymentInstructions}</p>
          <div className="flex flex-wrap gap-4 pt-1 font-semibold">
            {supportPhone && (
              <span className="flex items-center gap-1.5 text-emerald-300">
                <Phone className="w-3.5 h-3.5" /> {supportPhone}
              </span>
            )}
            {supportEmail && (
              <span className="flex items-center gap-1.5 text-indigo-300">
                <Mail className="w-3.5 h-3.5" /> {supportEmail}
              </span>
            )}
          </div>
        </div>

        {onNavigateDashboard && !isSuspended && (
          <div className="text-center">
            <button
              onClick={onNavigateDashboard}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              ফ্রি মডিউলগুলোতে (ড্যাশবোর্ড) ফিরে যান
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const PendingBusinessApprovalScreen: React.FC = () => {
  const { currentBusiness, saasRegistry, logout, userBusinesses, switchBusiness } = useDatabase();
  const { supportPhone, supportEmail } = saasRegistry.platformSettings;
  const approvedShops = userBusinesses.filter((b) => b.status === 'approved');

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-xl border border-slate-200 text-center space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-sm">
          <Clock className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-black text-slate-900">
            নতুন ব্যবসা প্রতিষ্ঠান অনুমোদনের অপেক্ষায়
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            আপনার নিবন্ধিত প্রতিষ্ঠান <strong>"{currentBusiness?.name}"</strong> বর্তমানে মেইন সুপার অ্যাডমিনের অনুমোদনের অপেক্ষায় রয়েছে। অনুমোদন সম্পন্ন হলে আপনার{' '}
            <strong>{saasRegistry.platformSettings.defaultTrialDays} দিনের ফ্রি ট্রায়াল</strong> ও সকল ফিচার চালু হয়ে যাবে।
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500">প্রতিষ্ঠান:</span>
            <span className="font-bold text-slate-900">{currentBusiness?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">মালিকের ইমেইল:</span>
            <span className="font-mono text-slate-800">{currentBusiness?.ownerEmail}</span>
          </div>
          {supportPhone && (
            <div className="flex justify-between">
              <span className="text-slate-500">সাপোর্ট ফোন:</span>
              <span className="font-bold text-emerald-700">{supportPhone}</span>
            </div>
          )}
          {supportEmail && (
            <div className="flex justify-between">
              <span className="text-slate-500">সাপোর্ট ইমেইল:</span>
              <span className="font-bold text-indigo-700">{supportEmail}</span>
            </div>
          )}
        </div>

        {approvedShops.length > 0 && (
          <div className="space-y-2 text-left">
            <p className="text-xs font-bold text-slate-700">আপনার অনুমোদিত অন্যান্য প্রতিষ্ঠানে প্রবেশ করুন:</p>
            {approvedShops.map((b) => (
              <button
                key={b.id}
                onClick={() => switchBusiness(b.id)}
                className="w-full p-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-900 flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-emerald-700" />
                  <span>{b.name}</span>
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => logout()}
          className="w-full py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2"
        >
          <LogOut className="w-4 h-4" />
          <span>অন্য একাউন্টে লগইন / লগআউট</span>
        </button>
      </div>
    </div>
  );
};
