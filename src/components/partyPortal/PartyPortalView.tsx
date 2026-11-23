import React, { useState, useMemo } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { formatCurrency, formatDate, formatNumber } from '../../utils/calculations';
import { PrintHeader, triggerPrint } from '../common/PrintHeader';
import {
  BookOpen,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  LogOut,
  MapPin,
  Phone,
  Printer,
  RefreshCw,
  ShieldAlert,
  User,
  Wallet,
  XCircle,
  ChevronDown,
  ChevronUp,
  Layers,
} from 'lucide-react';

export const PendingPartyPortalScreen: React.FC = () => {
  const {
    currentUser,
    currentPartyAccount,
    saasRegistry,
    submitPartyPressLinkRequest,
    logout,
  } = useDatabase();

  const approvedBusinesses = useMemo(
    () => (saasRegistry.businesses || []).filter((b) => b.status === 'approved'),
    [saasRegistry.businesses]
  );

  const [selectedBizId, setSelectedBizId] = useState(
    currentPartyAccount?.businessId || approvedBusinesses[0]?.id || ''
  );
  const [partyName, setPartyName] = useState(
    currentPartyAccount?.partyName || currentUser?.displayName || ''
  );
  const [contactPerson, setContactPerson] = useState(
    currentPartyAccount?.contactPerson || ''
  );
  const [phone, setPhone] = useState(currentPartyAccount?.phone || '');
  const [address, setAddress] = useState(currentPartyAccount?.address || '');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFeedback('');
    if (!selectedBizId) {
      setError('অনুগ্রহ করে আপনার প্রেস প্রতিষ্ঠানটি নির্বাচন করুন।');
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitPartyPressLinkRequest(selectedBizId, {
        partyName: partyName.trim() || undefined,
        contactPerson: contactPerson.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
      });
      if (res.success) {
        setFeedback('আপনার অনুরোধ সফলভাবে প্রেসে পাঠানো হয়েছে! প্রেস মালিক বা ম্যানেজার অনুমোদন করলেই পোর্টাল চালু হবে।');
      } else {
        setError(res.error || 'অনুরোধ পাঠাতে সমস্যা হয়েছে।');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const status = currentPartyAccount?.status || 'pending';
  const hasLinkedBiz = Boolean(currentPartyAccount?.businessId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 text-slate-800">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                status === 'rejected' || status === 'disabled'
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {status === 'rejected' || status === 'disabled' ? (
                <XCircle className="w-6 h-6" />
              ) : (
                <Clock className="w-6 h-6" />
              )}
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900">পার্টি কাস্টমার পোর্টাল</h1>
              <p className="text-xs text-slate-500 font-medium">
                লগইন আইডি:{' '}
                <span className="font-mono font-bold text-slate-700">
                  {currentPartyAccount?.loginId || currentUser?.email?.split('@')[0]}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center space-x-1 transition shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>লগআউট</span>
          </button>
        </div>

        {/* Status Banner */}
        {status === 'rejected' ? (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs leading-relaxed">
            <p className="font-bold mb-1">আবেদনটি বাতিল করা হয়েছে</p>
            <p>প্রেস কর্তৃপক্ষ আপনার পোর্টাল অনুমোদন বাতিল করেছেন। প্রয়োজনে নিচ থেকে পুনরায় প্রেস নির্বাচন করে অনুরোধ পাঠাতে পারেন অথবা প্রেসে যোগাযোগ করুন।</p>
          </div>
        ) : status === 'disabled' ? (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs leading-relaxed">
            <p className="font-bold mb-1">আপনার পোর্টাল সাময়িকভাবে বন্ধ আছে</p>
            <p>বিস্তারিত জানতে আপনার প্রিন্টিং প্রেসের ম্যানেজার বা মালিকের সাথে যোগাযোগ করুন।</p>
          </div>
        ) : hasLinkedBiz ? (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>অপেক্ষমান: "{currentPartyAccount?.businessName}" এর অনুমোদনের অপেক্ষায়</span>
            </p>
            <p>
              আপনার পার্টি অ্যাকাউন্টটি নিবন্ধিত হয়েছে। প্রেস মালিক বা ম্যানেজার অনুমোদন করলেই আপনি আপনার বই, বিল ও বকেয়া হিসাব দেখতে পারবেন।
            </p>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs leading-relaxed">
            <p className="font-bold mb-1">আপনার প্রেস নির্বাচন করুন</p>
            <p>আপনি কোন প্রিন্টিং প্রেসের পার্টি/কাস্টমার তা নিচ থেকে নির্বাচন করে অনুরোধ পাঠান।</p>
          </div>
        )}

        {feedback && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{feedback}</span>
          </div>
        )}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {status !== 'disabled' && (
          <form onSubmit={handleLinkSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                প্রিন্টিং প্রেস নির্বাচন করুন *
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-emerald-600" />
                <select
                  value={selectedBizId}
                  onChange={(e) => setSelectedBizId(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl bg-white font-bold text-slate-800 focus:outline-emerald-600"
                >
                  <option value="">-- প্রেস নির্বাচন করুন --</option>
                  {approvedBusinesses.map((biz) => (
                    <option key={biz.id} value={biz.id}>
                      {biz.name} {biz.address ? `(${biz.address})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">পার্টি / প্রকাশনীর নাম</label>
                <input
                  type="text"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder="যেমন: আল-মদিনা পাবলিকেশন্স"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">মোবাইল নম্বর</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">যোগাযোগকারীর নাম</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="আপনার নাম"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">ঠিকানা</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="ঠিকানা"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || approvedBusinesses.length === 0}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2"
            >
              {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>
                {hasLinkedBiz ? 'প্রেস সংযোগ তথ্য আপডেট / পুনরায় পাঠান' : 'প্রেস অনুমোদনের অনুরোধ পাঠান'}
              </span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export const PartyPortalView: React.FC = () => {
  const {
    db,
    currentBusiness,
    currentPartyAccount,
    getPartyBalance,
    logout,
  } = useDatabase();

  const [activeTab, setActiveTab] = useState<'overview' | 'books' | 'billed-work' | 'invoices' | 'collections' | 'ledger'>('overview');
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  const lang = db.settings.language || 'bn';
  const numFmt = db.settings.numberFormat || 'bn';

  const party = useMemo(
    () => db.parties.find((p) => p.id === currentPartyAccount?.partyId),
    [db.parties, currentPartyAccount?.partyId]
  );

  // Strict privacy filter: ONLY books associated with this party (ONLY name, code, forma, size, pagesInfo — NEVER plates or location)
  const partyBooks = useMemo(() => {
    if (!party) return [];
    return db.books.filter((b) => (b.partyIds || []).includes(party.id));
  }, [db.books, party]);

  // Strict privacy filter: ONLY billed productions (p.isBilled === true). Unbilled work is strictly hidden!
  const billedProductions = useMemo(() => {
    if (!party) return [];
    return db.productions
      .filter((p) => p.partyId === party.id && p.isBilled === true)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [db.productions, party]);

  const partyInvoices = useMemo(() => {
    if (!party) return [];
    return db.invoices
      .filter((inv) => inv.partyId === party.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [db.invoices, party]);

  const partyCollections = useMemo(() => {
    if (!party) return [];
    return db.collections
      .filter((col) => col.partyId === party.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [db.collections, party]);

  const ledgerEntries = useMemo(() => {
    if (!party) return [];
    interface Entry {
      date: string;
      refNo: string;
      description: string;
      debit: number;
      credit: number;
      runningBalance: number;
    }
    const entries: Entry[] = [];
    let running = party.openingDue || 0;
    if (running > 0) {
      entries.push({
        date: (party.createdAt || new Date().toISOString()).split('T')[0],
        refNo: 'OPN-01',
        description: 'পূর্ববর্তী প্রারম্ভিক বকেয়া (Opening Due)',
        debit: running,
        credit: 0,
        runningBalance: running,
      });
    }
    const events: Array<{ date: string; type: 'invoice' | 'collection'; obj: any }> = [
      ...partyInvoices.map((inv) => ({ date: inv.date, type: 'invoice' as const, obj: inv })),
      ...partyCollections.map((col) => ({ date: col.date, type: 'collection' as const, obj: col })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (const ev of events) {
      if (ev.type === 'invoice') {
        const inv = ev.obj;
        running += inv.grandTotal || 0;
        entries.push({
          date: inv.date,
          refNo: inv.invoiceNo,
          description: `বিল/চালান: ${(inv.items || []).map((i: any) => i.bookName).join(', ')}`,
          debit: inv.grandTotal || 0,
          credit: 0,
          runningBalance: running,
        });
      } else {
        const col = ev.obj;
        running -= col.amount || 0;
        entries.push({
          date: col.date,
          refNo: col.receiptNo,
          description: `পরিশোধ (${col.paymentMethod}) ${col.notes ? `- ${col.notes}` : ''}`,
          debit: 0,
          credit: col.amount || 0,
          runningBalance: running,
        });
      }
    }
    return entries;
  }, [party, partyInvoices, partyCollections]);

  const pressName = currentBusiness?.name || db.settings.name || 'প্রিন্টিং প্রেস';
  const pressPhone = currentBusiness?.phone || db.settings.phone || '';
  const pressAddress = currentBusiness?.address || db.settings.address || '';

  if (!party) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-xl border border-slate-200 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black text-slate-900">পার্টি প্রোফাইল সংযুক্ত করা হয়নি</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            আপনার অ্যাকাউন্টটি <strong>"{pressName}"</strong> কর্তৃক অনুমোদিত হয়েছে, তবে কোনো পার্টি খাতার সাথে এখনো লিংক করা হয়নি। অনুগ্রহ করে প্রেসের ম্যানেজার বা মালিকের সাথে যোগাযোগ করুন।
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

  const currentBalance = getPartyBalance(party.id);
  const totalBilled = partyInvoices.reduce((s, inv) => s + (inv.grandTotal || 0), 0);
  const totalPaid = partyCollections.reduce((s, col) => s + (col.amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Press Portal Navbar */}
      <header className="no-print bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            {db.settings.logoUrl ? (
              <img
                src={db.settings.logoUrl}
                alt={pressName}
                className="w-11 h-11 rounded-xl object-contain bg-white p-1 shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center font-black text-lg shrink-0">
                {pressName.slice(0, 1)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight">{pressName}</h1>
                <span className="px-2 py-0.5 bg-emerald-500/30 border border-emerald-300/40 rounded text-[10px] font-bold text-emerald-100">
                  কাস্টমার পার্টি পোর্টাল
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-emerald-100/90 mt-0.5">
                {pressAddress && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{pressAddress}</span>
                  </span>
                )}
                {pressPhone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    <span>{pressPhone}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => triggerPrint()}
              className="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট স্টেটমেন্ট</span>
            </button>
            <button
              type="button"
              onClick={() => logout()}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>লগআউট</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-5">
        {/* Print Header */}
        <div className="print-only">
          <PrintHeader
            title="পার্টি হিসাব ও বই বিবরণী"
            subtitle={`পার্টির নাম: ${party.name} | মোবাইল: ${party.phone}`}
          />
        </div>

        {/* Party Welcome & Current Due Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            {party.photoUrl ? (
              <img
                src={party.photoUrl}
                alt={party.name}
                className="w-14 h-14 rounded-2xl object-cover border border-emerald-200 shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xl shrink-0">
                {party.name.slice(0, 1)}
              </div>
            )}
            <div>
              <p className="text-[11px] font-bold text-emerald-700 uppercase">স্বাগতম</p>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">{party.name}</h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-0.5">
                {party.contactPerson && (
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    <span>{party.contactPerson}</span>
                  </span>
                )}
                {party.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{party.phone}</span>
                  </span>
                )}
                {party.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{party.address}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div
            className={`p-4 rounded-2xl border text-right min-w-[210px] ${
              currentBalance > 0
                ? 'bg-amber-50 border-amber-200'
                : 'bg-emerald-50 border-emerald-200'
            }`}
          >
            <p className="text-xs font-bold text-slate-600">বর্তমান মোট বাকি / পাওনা</p>
            <p
              className={`text-2xl font-black mt-0.5 ${
                currentBalance > 0 ? 'text-amber-700' : 'text-emerald-700'
              }`}
            >
              {formatCurrency(currentBalance, lang)}
            </p>
            {party.openingDue > 0 && (
              <p className="text-[11px] text-slate-500 mt-0.5">
                পূর্বের বকেয়া: {formatCurrency(party.openingDue, lang)}
              </p>
            )}
          </div>
        </div>

        {/* Summary KPI Cards */}
        <div className="no-print grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-slate-500 font-semibold">মোট নিবন্ধিত বই</p>
              <p className="text-xl font-black text-slate-900 mt-1">
                {formatNumber(partyBooks.length, lang, numFmt)} টি
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-slate-500 font-semibold">বিলকৃত কাজ / অর্ডার</p>
              <p className="text-xl font-black text-slate-900 mt-1">
                {formatNumber(billedProductions.length, lang, numFmt)} টি
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-slate-500 font-semibold">মোট বিল (ইনভয়েস)</p>
              <p className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                {formatCurrency(totalBilled, lang)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-slate-500 font-semibold">মোট পরিশোধিত</p>
              <p className="text-lg sm:text-xl font-black text-emerald-700 mt-1">
                {formatCurrency(totalPaid, lang)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Portal Navigation Tabs */}
        <div className="no-print flex flex-wrap gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs text-xs font-bold">
          {[
            { id: 'overview', label: 'সকল সারসংক্ষেপ' },
            { id: 'books', label: `বইয়ের তালিকা (${partyBooks.length})` },
            { id: 'billed-work', label: `বিলকৃত বইয়ের কাজ (${billedProductions.length})` },
            { id: 'invoices', label: `বিল ও ইনভয়েস (${partyInvoices.length})` },
            { id: 'collections', label: `পেমেন্ট রসিদ (${partyCollections.length})` },
            { id: 'ledger', label: 'সম্পূর্ণ খাতা (Ledger)' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl transition ${
                activeTab === tab.id
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Section: Books List (ONLY Book Name, Code, Forma, Size, Pages/Notes — NEVER Plate Location!) */}
        {(activeTab === 'overview' || activeTab === 'books') && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800">আপনার বইয়ের তালিকা (ফর্মা ও সাইজ)</h3>
              </div>
              <span className="text-xs text-slate-500">মোট {partyBooks.length} টি বই</span>
            </div>
            {partyBooks.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                এখনো আপনার নামের সাথে কোনো বই যুক্ত করা হয়নি।
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                    <tr>
                      <th className="p-3">কোড</th>
                      <th className="p-3">বইয়ের নাম</th>
                      <th className="p-3 text-center">ফর্মা</th>
                      <th className="p-3 text-center">সাইজ</th>
                      <th className="p-3">বিবরণ / পৃষ্ঠা</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {partyBooks.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-slate-500">{b.code || '-'}</td>
                        <td className="p-3 font-bold text-slate-900">{b.name}</td>
                        <td className="p-3 text-center font-bold text-indigo-700 tabular-nums">
                          {formatNumber(b.forma, lang, numFmt)} ফর্মা
                        </td>
                        <td className="p-3 text-center font-semibold text-slate-700">
                          {b.size || '-'}
                        </td>
                        <td className="p-3 text-slate-600">{b.pagesInfo || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Section: Billed Work ONLY (Strict rule: ONLY productions where isBilled === true) */}
        {(activeTab === 'overview' || activeTab === 'billed-work') && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  বিল হওয়া বইয়ের কাজের বিবরণ
                </h3>
              </div>
              <span className="text-[11px] text-slate-500">
                শুধুমাত্র চূড়ান্ত বিল হওয়া বইয়ের কাজগুলো এখানে প্রদর্শিত হচ্ছে
              </span>
            </div>
            {billedProductions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                এখনো কোনো বিলকৃত বইয়ের কাজের রেকর্ড নেই। বিল সম্পন্ন হলে এখানে স্বয়ংক্রিয়ভাবে দেখাবে।
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                    <tr>
                      <th className="p-3">তারিখ</th>
                      <th className="p-3">বইয়ের নাম</th>
                      <th className="p-3 text-center">ধরন</th>
                      <th className="p-3 text-center">ফর্মা</th>
                      <th className="p-3 text-center">সাইজ</th>
                      <th className="p-3 text-center">ছাপা</th>
                      <th className="p-3 text-center">কপি</th>
                      <th className="p-3 text-center">ইনভয়েস নম্বর</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {billedProductions.map((p) => {
                      const book = db.books.find((b) => b.id === p.bookId);
                      const inv = partyInvoices.find((i) => i.id === p.invoiceId);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="p-3 whitespace-nowrap tabular-nums">
                            {formatDate(p.date, lang, numFmt)}
                          </td>
                          <td className="p-3 font-bold text-slate-900">
                            {book?.name || 'বই'}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                p.itemType === 'cover'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {p.itemType === 'cover' ? 'কভার' : 'বই'}
                            </span>
                          </td>
                          <td className="p-3 text-center tabular-nums">
                            {formatNumber(p.forma, lang, numFmt)}
                          </td>
                          <td className="p-3 text-center font-medium text-slate-700">
                            {p.paperSize || book?.size || '-'}
                          </td>
                          <td className="p-3 text-center font-mono tabular-nums">
                            {formatNumber(p.chhapa, lang, numFmt)}
                          </td>
                          <td className="p-3 text-center font-bold text-slate-800 tabular-nums">
                            {formatNumber(p.copies, lang, numFmt)}
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-emerald-700">
                            {inv?.invoiceNo || 'বিল সম্পন্ন'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Section: Invoices with itemized details */}
        {(activeTab === 'overview' || activeTab === 'invoices') && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800">বিল ও ইনভয়েস হিসাব</h3>
              </div>
              <span className="text-xs text-slate-500">মোট {partyInvoices.length} টি বিল</span>
            </div>
            {partyInvoices.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                কোনো বিল/ইনভয়েস তৈরি করা হয়নি।
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {partyInvoices.map((inv) => {
                  const isExpanded = expandedInvoiceId === inv.id;
                  return (
                    <div key={inv.id} className="p-4 hover:bg-slate-50/70 transition">
                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-slate-900">{inv.invoiceNo}</span>
                            <span className="text-slate-500">• {formatDate(inv.date, lang, numFmt)}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            বই: {(inv.items || []).map((i) => i.bookName).join(', ')}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">মোট বিল</span>
                            <span className="font-bold text-slate-900">{formatCurrency(inv.grandTotal, lang)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">জমা</span>
                            <span className="font-bold text-emerald-700">{formatCurrency(inv.paidAmount, lang)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">ইনভয়েস বকেয়া</span>
                            <span className="font-black text-amber-700">{formatCurrency(inv.currentDue, lang)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                            className="no-print px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold flex items-center gap-1"
                          >
                            <span>বিস্তারিত</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-slate-100 overflow-x-auto">
                          <table className="w-full text-[11px] text-left bg-slate-50 rounded-xl overflow-hidden">
                            <thead className="bg-slate-200/70 text-slate-700 font-bold">
                              <tr>
                                <th className="p-2">বই ও বিবরণ</th>
                                <th className="p-2 text-center">ফর্মা</th>
                                <th className="p-2 text-center">কপি/ছাপা</th>
                                <th className="p-2 text-right">দর</th>
                                <th className="p-2 text-right">মোট টাকা</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/60">
                              {(inv.items || []).map((item, idx) => (
                                <tr key={idx}>
                                  <td className="p-2 font-semibold text-slate-800">{item.bookName}</td>
                                  <td className="p-2 text-center">{item.forma || '-'}</td>
                                  <td className="p-2 text-center">{item.quantity || '-'}</td>
                                  <td className="p-2 text-right">{formatCurrency(item.rate || 0, lang)}</td>
                                  <td className="p-2 text-right font-bold">{formatCurrency(item.amount || 0, lang)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Section: Collections / Payments */}
        {(activeTab === 'overview' || activeTab === 'collections') && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-800">জমা / পেমেন্ট রসিদ</h3>
              </div>
              <span className="text-xs text-slate-500">মোট {partyCollections.length} টি জমা</span>
            </div>
            {partyCollections.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                এখনো কোনো পেমেন্ট জমার রেকর্ড নেই।
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                    <tr>
                      <th className="p-3">তারিখ</th>
                      <th className="p-3">রসিদ নম্বর</th>
                      <th className="p-3">মাধ্যম</th>
                      <th className="p-3">মন্তব্য</th>
                      <th className="p-3 text-right">পরিমাণ (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {partyCollections.map((col) => (
                      <tr key={col.id} className="hover:bg-slate-50">
                        <td className="p-3 whitespace-nowrap">{formatDate(col.date, lang, numFmt)}</td>
                        <td className="p-3 font-mono font-bold text-slate-800">{col.receiptNo}</td>
                        <td className="p-3 uppercase text-[11px] font-bold text-slate-600">{col.paymentMethod}</td>
                        <td className="p-3 text-slate-500">{col.notes || '-'}</td>
                        <td className="p-3 text-right font-bold text-emerald-700">
                          {formatCurrency(col.amount, lang)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Section: Full Ledger */}
        {(activeTab === 'overview' || activeTab === 'ledger') && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">তারিখ অনুযায়ী সম্পূর্ণ খাতা (Ledger)</h3>
              <span className="text-xs text-slate-500">মোট {ledgerEntries.length} টি এন্ট্রি</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                  <tr>
                    <th className="p-3">তারিখ</th>
                    <th className="p-3">ভাউচার / রেফ</th>
                    <th className="p-3">বিবরণ</th>
                    <th className="p-3 text-right">বিল (৳)</th>
                    <th className="p-3 text-right">জমা (৳)</th>
                    <th className="p-3 text-right">অবশিষ্ট বকেয়া (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledgerEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        এখনো কোনো লেনদেন রেকর্ড নেই।
                      </td>
                    </tr>
                  ) : (
                    ledgerEntries.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 whitespace-nowrap">{formatDate(row.date, lang, numFmt)}</td>
                        <td className="p-3 font-mono font-semibold">{row.refNo}</td>
                        <td className="p-3">{row.description}</td>
                        <td className="p-3 text-right font-semibold text-slate-900">
                          {row.debit > 0 ? formatCurrency(row.debit, lang) : '-'}
                        </td>
                        <td className="p-3 text-right font-semibold text-emerald-700">
                          {row.credit > 0 ? formatCurrency(row.credit, lang) : '-'}
                        </td>
                        <td className="p-3 text-right font-bold text-amber-700">
                          {formatCurrency(row.runningBalance, lang)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-slate-100 font-bold border-t">
                  <tr>
                    <td colSpan={3} className="p-3 text-right">সর্বমোট:</td>
                    <td className="p-3 text-right">
                      {formatCurrency(ledgerEntries.reduce((s, r) => s + r.debit, 0), lang)}
                    </td>
                    <td className="p-3 text-right text-emerald-700">
                      {formatCurrency(ledgerEntries.reduce((s, r) => s + r.credit, 0), lang)}
                    </td>
                    <td className="p-3 text-right text-amber-700">
                      {formatCurrency(currentBalance, lang)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
