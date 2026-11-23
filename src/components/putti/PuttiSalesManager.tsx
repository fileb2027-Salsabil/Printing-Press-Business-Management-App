import React, { useState, useEffect } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { PuttiCategory, PuttiSaleRecord, PuttiBuyerAdvance } from '../../types';
import {
  calculatePuttiSale,
  formatCurrency,
  formatDate,
} from '../../utils/calculations';
import { translations } from '../../utils/i18n';
import { PrintHeader, PrintSignatures, PrintAmountInWords, triggerPrint } from '../common/PrintHeader';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  Boxes,
  Plus,
  Search,
  Printer,
  Trash2,
  Calendar,
  Banknote,
  ArrowLeft,
  Wallet,
  AlertCircle,
  CheckCircle2,
  X,
  History,
} from 'lucide-react';

const STORAGE_KEY_PUTTI_ADVANCES = 'makkah_putti_buyer_advances';

export const PuttiSalesManager: React.FC = () => {
  const { db, addPuttiSale, deletePuttiSale, isReadOnly } = useDatabase();
  const lang = db.settings.language;
  const t = translations[lang];

  const today = new Date().toISOString().split('T')[0];
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPuttiSlip, setSelectedPuttiSlip] = useState<PuttiSaleRecord | null>(null);
  const [saleSuccessMessage, setSaleSuccessMessage] = useState('');
  const [advanceSuccessMessage, setAdvanceSuccessMessage] = useState('');

  // Deletion modals
  const [saleToDelete, setSaleToDelete] = useState<PuttiSaleRecord | null>(null);
  const [advanceToDelete, setAdvanceToDelete] = useState<PuttiBuyerAdvance | null>(null);

  // Putti Buyer Advances state
  const [puttiAdvances, setPuttiAdvances] = useState<PuttiBuyerAdvance[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PUTTI_ADVANCES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PUTTI_ADVANCES, JSON.stringify(puttiAdvances));
    } catch (e) {
      console.error('Failed to save putti advances', e);
    }
  }, [puttiAdvances]);

  // Modal for adding advance from Putti buyer
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isAdvanceListModalOpen, setIsAdvanceListModalOpen] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({
    buyerName: '',
    date: today,
    amount: 1000,
    paymentMethod: 'cash',
    notes: '',
  });

  const categories: PuttiCategory[] = [
    'সাদা',
    'সাদা-২',
    'নিউজ',
    'নিউজ-২',
    'খাস্তা',
    'মলাট',
    '২নং',
  ];

  // Sale Entry Form
  const [form, setForm] = useState({
    date: today,
    category: 'সাদা' as PuttiCategory,
    quantityKg: 100,
    ratePerKg: 40,
    buyerName: '',
    sellerName: db.settings.manager?.name || 'ম্যানেজার',
    deductAdvance: true,
    customAdvanceToDeduct: 0,
    paymentMethodChoice: 'cash' as 'cash' | 'due' | 'partial',
    cashAmount: 0,
    notes: '',
  });

  const grossSale = Math.round(form.quantityKg * form.ratePerKg);

  // Calculate available advance for a specific buyer
  const getBuyerAdvanceBalance = (buyerName: string): number => {
    if (!buyerName.trim()) return 0;
    const normalized = buyerName.trim().toLowerCase();

    // Total advance taken from this buyer
    const totalAdvancesTaken = puttiAdvances
      .filter((a) => a.buyerName.trim().toLowerCase() === normalized)
      .reduce((s, a) => s + a.amount, 0);

    // Total advance deducted in earlier sales to this buyer
    const totalDeductedInSales = db.puttiSales
      .filter((s) => s.buyerName.trim().toLowerCase() === normalized)
      .reduce((s, r) => s + (r.advanceReceived || 0), 0);

    return Math.max(0, totalAdvancesTaken - totalDeductedInSales);
  };

  const buyerAvailableAdvance = getBuyerAdvanceBalance(form.buyerName);

  // Auto-calculated advance deduction and cash/due
  const calculatedAdvanceDeduction = form.deductAdvance
    ? Math.min(grossSale, buyerAvailableAdvance)
    : Math.min(form.customAdvanceToDeduct, buyerAvailableAdvance, grossSale);

  const remainingAfterAdvance = Math.max(0, grossSale - calculatedAdvanceDeduction);

  const finalCashReceived =
    remainingAfterAdvance === 0
      ? 0
      : form.paymentMethodChoice === 'cash'
      ? remainingAfterAdvance
      : form.paymentMethodChoice === 'due'
      ? 0
      : Math.min(form.cashAmount, remainingAfterAdvance);

  const finalOutstandingDue = Math.max(0, remainingAfterAdvance - finalCashReceived);

  // Get distinct list of existing buyers
  const existingBuyers = Array.from(
    new Set([
      ...puttiAdvances.map((a) => a.buyerName.trim()),
      ...db.puttiSales.map((s) => s.buyerName.trim()),
    ])
  ).filter(Boolean);

  const handleOpenModal = () => {
    if (isReadOnly) return;
    setSaleSuccessMessage('');
    const firstBuyer = existingBuyers[0] || '';
    setForm({
      date: today,
      category: 'সাদা',
      quantityKg: 100,
      ratePerKg: 40,
      buyerName: firstBuyer,
      sellerName: db.settings.manager?.name || 'ম্যানেজার',
      deductAdvance: true,
      customAdvanceToDeduct: 0,
      paymentMethodChoice: 'cash',
      cashAmount: 0,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleSaveSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (form.quantityKg <= 0 || form.ratePerKg <= 0) {
      return;
    }

    const bName = form.buyerName.trim() || 'সাধারণ ক্রেতা';
    const advDeducted = calculatedAdvanceDeduction;
    const cashRec = finalCashReceived;
    const outDue = finalOutstandingDue;

    let finalPaymentMethod = 'cash';
    let settlementMode: 'advance' | 'cash' | 'due' | 'mixed' = 'cash';

    if (advDeducted >= grossSale) {
      finalPaymentMethod = 'advance';
      settlementMode = 'advance';
    } else if (advDeducted > 0 && outDue > 0) {
      finalPaymentMethod = 'mixed';
      settlementMode = 'mixed';
    } else if (outDue > 0 && cashRec === 0) {
      finalPaymentMethod = 'due';
      settlementMode = 'due';
    } else if (cashRec > 0 && outDue > 0) {
      finalPaymentMethod = 'mixed';
      settlementMode = 'mixed';
    } else {
      finalPaymentMethod = 'cash';
      settlementMode = 'cash';
    }

    addPuttiSale({
      date: form.date,
      category: form.category,
      quantityKg: form.quantityKg,
      ratePerKg: form.ratePerKg,
      grossSale,
      buyerName: bName,
      sellerName: form.sellerName || 'প্রেস ম্যানেজার',
      advanceReceived: advDeducted,
      cashReceived: cashRec,
      outstandingDue: outDue,
      paymentMethod: finalPaymentMethod,
      settlementMode,
      notes: form.notes,
    });

    setSaleSuccessMessage(`পট্টি বিক্রি সফলভাবে সংরক্ষিত হয়েছে (${form.quantityKg} কেজি)! নতুন এন্ট্রি করতে পারেন।`);
    setForm((prev) => ({
      ...prev,
      quantityKg: 100,
      notes: '',
      customAdvanceToDeduct: 0,
      cashAmount: 0,
    }));
  };

  const handleSaveAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!advanceForm.buyerName.trim() || advanceForm.amount <= 0) return;

    const newAdvance: PuttiBuyerAdvance = {
      id: `padv_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      date: advanceForm.date,
      buyerName: advanceForm.buyerName.trim(),
      amount: advanceForm.amount,
      paymentMethod: advanceForm.paymentMethod,
      notes: advanceForm.notes,
      createdAt: new Date().toISOString(),
    };

    setPuttiAdvances((prev) => [newAdvance, ...prev]);
    setAdvanceSuccessMessage(`ক্রেতা "${advanceForm.buyerName}" এর অগ্রিম জমা সফলভাবে সংরক্ষিত হয়েছে (${formatCurrency(advanceForm.amount, lang)})!`);
    setAdvanceForm({
      buyerName: '',
      date: today,
      amount: 1000,
      paymentMethod: 'cash',
      notes: '',
    });
  };

  const filteredSales = db.puttiSales.filter((s) => {
    const matchDate = dateFilter ? s.date === dateFilter : true;
    const matchSearch = search
      ? s.category.toLowerCase().includes(search.toLowerCase()) ||
        s.buyerName.toLowerCase().includes(search.toLowerCase()) ||
        s.sellerName.toLowerCase().includes(search.toLowerCase())
      : true;
    return matchDate && matchSearch;
  });

  const totalKg = filteredSales.reduce((s, r) => s + r.quantityKg, 0);
  const totalGross = filteredSales.reduce((s, r) => s + r.grossSale, 0);
  const totalAdvances = filteredSales.reduce((s, r) => s + (r.advanceReceived || 0), 0);
  const totalCashCollected = filteredSales.reduce((s, r) => s + (r.cashReceived || 0), 0);
  const totalDues = filteredSales.reduce((s, r) => s + r.outstandingDue, 0);

  // Total advance deposits collected from buyers overall
  const totalBuyerAdvancePool = puttiAdvances.reduce((s, a) => s + a.amount, 0);
  const totalAdvanceDeductedAll = db.puttiSales.reduce((s, r) => s + (r.advanceReceived || 0), 0);
  const totalRemainingAdvancePool = Math.max(0, totalBuyerAdvancePool - totalAdvanceDeductedAll);

  // Printable slip view
  if (selectedPuttiSlip) {
    const isFullAdvance = (selectedPuttiSlip.advanceReceived || 0) >= selectedPuttiSlip.grossSale;
    const isFullCash = (selectedPuttiSlip.cashReceived || 0) >= selectedPuttiSlip.grossSale;
    const isFullDue = selectedPuttiSlip.outstandingDue >= selectedPuttiSlip.grossSale;

    return (
      <div className="space-y-6">
        <div className="no-print flex items-center justify-between">
          <button
            onClick={() => setSelectedPuttiSlip(null)}
            className="flex items-center space-x-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 px-3 py-2 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>পট্টি বিক্রির তালিকায় ফিরে যান</span>
          </button>

          <button
            onClick={() => triggerPrint()}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>পট্টি স্লিপ প্রিন্ট করুন</span>
          </button>
        </div>

        {/* Printable Putti Slip */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs max-w-2xl mx-auto print-container">
          <PrintHeader
            title="পট্টি বিক্রির ক্যাশ মেমো / রসিদ (PUTTI SALES SLIP)"
            documentNo={`PUTTI-${selectedPuttiSlip.id.slice(-6)}`}
            date={selectedPuttiSlip.date}
          />

          <div className="my-6 space-y-3.5 text-xs text-slate-800 border p-5 rounded-xl bg-slate-50/50">
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">ক্রেতার নাম / পট্টি ওয়ালা:</span>
              <span className="font-bold text-slate-900 text-sm">
                {selectedPuttiSlip.buyerName || 'সাধারণ ক্রেতা'}
              </span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">বিক্রয় প্রতিনিধির নাম:</span>
              <span className="font-semibold">{selectedPuttiSlip.sellerName}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">বিক্রির তারিখ:</span>
              <span className="font-bold">{formatDate(selectedPuttiSlip.date, lang)}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">পট্টির বিবরণ / ক্যাটাগরি:</span>
              <span className="font-bold text-emerald-800 text-sm">{selectedPuttiSlip.category}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">পরিমাণ (ওজন):</span>
              <span className="font-bold text-sm text-slate-900">{selectedPuttiSlip.quantityKg} কেজি</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">প্রতি কেজির বিক্রয় দর:</span>
              <span className="font-bold">৳ {selectedPuttiSlip.ratePerKg} / কেজি</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">মোট বিক্রয় মূল্য (Gross):</span>
              <span className="text-base font-black text-slate-900">
                {formatCurrency(selectedPuttiSlip.grossSale, lang)}
              </span>
            </div>

            {/* Advance deduction details */}
            {(selectedPuttiSlip.advanceReceived || 0) > 0 && (
              <div className="flex justify-between border-b pb-2 text-indigo-700 bg-indigo-50/50 p-2 rounded">
                <span className="font-bold">পট্টি ওয়ালার জমা অগ্রিম থেকে কর্তন:</span>
                <span className="font-black text-sm">
                  - {formatCurrency(selectedPuttiSlip.advanceReceived, lang)}
                </span>
              </div>
            )}

            {/* Direct cash paid */}
            {(selectedPuttiSlip.cashReceived || 0) > 0 && (
              <div className="flex justify-between border-b pb-2 text-emerald-700 bg-emerald-50/50 p-2 rounded">
                <span className="font-bold">সরাসরি নগদ আদায়:</span>
                <span className="font-black text-sm">
                  - {formatCurrency(selectedPuttiSlip.cashReceived || 0, lang)}
                </span>
              </div>
            )}

            {/* Remaining due */}
            <div className="flex justify-between border-b pb-2 text-amber-800 font-black pt-1">
              <span>অবশিষ্ট বাকী (Due):</span>
              <span className="text-base">
                {formatCurrency(selectedPuttiSlip.outstandingDue, lang)}
              </span>
            </div>

            <div className="flex justify-between items-center pt-1 text-slate-600">
              <span className="font-semibold">পরিশোধের অবস্থা:</span>
              <span className="font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border">
                {isFullAdvance
                  ? 'জমা অগ্রিম থেকে সম্পূর্ণ পরিশোধিত'
                  : isFullCash
                  ? 'নগদে সম্পূর্ণ পরিশোধিত'
                  : isFullDue
                  ? 'সম্পূর্ণ বাকীতে বিক্রয়'
                  : 'অগ্রিম ও আংশিক সমন্বিত'}
              </span>
            </div>

            {selectedPuttiSlip.notes && (
              <div className="flex justify-between pt-1 border-t">
                <span className="text-slate-500 font-semibold">মন্তব্য / নোট:</span>
                <span className="font-medium text-slate-700">{selectedPuttiSlip.notes}</span>
              </div>
            )}
          </div>

          <PrintAmountInWords amount={selectedPuttiSlip.grossSale} lang={lang} />
          <PrintSignatures />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.puttiSalesTitle}</h2>
          <p className="text-xs text-slate-500">
            কাগজের পট্টি ও ওয়েস্টেজ স্ক্র্যাপ বিক্রয় হিসাব, পট্টি ওয়ালার অগ্রিম ও নগদ/বাকী সমন্বয়
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isReadOnly && (
            <button
              onClick={() => setIsAdvanceModalOpen(true)}
              className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition"
            >
              <Wallet className="w-4 h-4" />
              <span>পট্টি ওয়ালার অগ্রিম জমা</span>
            </button>
          )}
          <button
            onClick={() => setIsAdvanceListModalOpen(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition"
          >
            <History className="w-4 h-4 text-indigo-600" />
            <span>অগ্রিম লেজার ({puttiAdvances.length})</span>
          </button>
          {!isReadOnly && (
            <button
              onClick={handleOpenModal}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addPuttiSale}</span>
            </button>
          )}
          <button
            onClick={() => triggerPrint()}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>প্রিন্ট শিট</span>
          </button>
        </div>
      </div>

      <div className="print-only">
        <PrintHeader
          title="পট্টি বিক্রির হিসাব বিবরণী (Putti / Scrap Sales Sheet)"
          subtitle={`মোট বিক্রি: ${totalKg} কেজি | মোট টাকা: ${formatCurrency(totalGross, lang)} | অগ্রিম কর্তন: ${formatCurrency(totalAdvances, lang)} | নগদ আদায়: ${formatCurrency(totalCashCollected, lang)} | বকেয়া: ${formatCurrency(totalDues, lang)}`}
        />
      </div>

      {/* Summary KPI Cards */}
      <div className="no-print grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] text-slate-500 font-bold block">মোট পট্টি বিক্রি</span>
          <span className="text-lg font-black text-slate-900 mt-1 block">
            {formatCurrency(totalGross, lang)}
          </span>
          <span className="text-[10px] text-slate-400 font-semibold">{totalKg} কেজি স্ক্র্যাপ</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-indigo-200 bg-indigo-50/20 shadow-xs">
          <span className="text-[11px] text-indigo-700 font-bold block">জমা অগ্রিম থেকে কর্তন</span>
          <span className="text-lg font-black text-indigo-900 mt-1 block">
            {formatCurrency(totalAdvances, lang)}
          </span>
          <span className="text-[10px] text-indigo-600 font-semibold">
            অবশিষ্ট অগ্রিম তহবিল: {formatCurrency(totalRemainingAdvancePool, lang)}
          </span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <span className="text-[11px] text-emerald-700 font-bold block">সরাসরি নগদ আদায়</span>
          <span className="text-lg font-black text-emerald-900 mt-1 block">
            {formatCurrency(totalCashCollected, lang)}
          </span>
          <span className="text-[10px] text-emerald-600 font-semibold">ক্যাশ মেমো থেকে সরাসরি প্রাপ্ত</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <span className="text-[11px] text-amber-700 font-bold block">মোট অবশিষ্ট বাকি পাওনা</span>
          <span className="text-lg font-black text-amber-800 mt-1 block">
            {formatCurrency(totalDues, lang)}
          </span>
          <span className="text-[10px] text-amber-600 font-semibold">পরবর্তীতে আদায়যোগ্য</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="no-print bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px] flex items-center space-x-2 px-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="পট্টির ধরন, ক্রেতা বা বিক্রেতার নাম..."
            className="w-full text-xs outline-none bg-transparent"
          />
        </div>

        <div className="flex items-center space-x-2 border-l pl-3">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="text-xs border rounded p-1"
          />
          {dateFilter && (
            <button onClick={() => setDateFilter('')} className="text-[10px] text-slate-500 underline">
              সব তারিখ
            </button>
          )}
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b">
              <tr>
                <th className="p-3">তারিখ</th>
                <th className="p-3">ক্রেতা (পট্টি ওয়ালা)</th>
                <th className="p-3">পট্টির বিবরণ</th>
                <th className="p-3 text-center">পরিমাণ (কেজি)</th>
                <th className="p-3 text-right">দর (৳/কেজি)</th>
                <th className="p-3 text-right font-black">মোট বিক্রি (৳)</th>
                <th className="p-3 text-right text-indigo-700">অগ্রিম কর্তন</th>
                <th className="p-3 text-right text-emerald-700">নগদ আদায়</th>
                <th className="p-3 text-right text-amber-700">বাকি পাওনা</th>
                <th className="p-3 text-center">পরিশোধের ধরন</th>
                <th className="p-3 text-right no-print">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400">
                    কোনো পট্টি বিক্রির রেকর্ড নেই।
                  </td>
                </tr>
              ) : (
                filteredSales.map((s) => {
                  const isFullAdvance = (s.advanceReceived || 0) >= s.grossSale;
                  const isFullCash = (s.cashReceived || 0) >= s.grossSale;
                  const isFullDue = s.outstandingDue >= s.grossSale;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 whitespace-nowrap">{formatDate(s.date, lang)}</td>
                      <td className="p-3 font-bold text-slate-900">
                        <div>{s.buyerName}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          জমা অগ্রিম: ৳{getBuyerAdvanceBalance(s.buyerName)}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 font-bold">
                          {s.category}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold">{s.quantityKg} কেজি</td>
                      <td className="p-3 text-right font-mono">৳{s.ratePerKg}</td>
                      <td className="p-3 text-right font-black text-slate-900">
                        {formatCurrency(s.grossSale, lang)}
                      </td>
                      <td className="p-3 text-right text-indigo-700 font-bold">
                        {s.advanceReceived > 0 ? `- ${formatCurrency(s.advanceReceived, lang)}` : '-'}
                      </td>
                      <td className="p-3 text-right text-emerald-700 font-bold">
                        {s.cashReceived && s.cashReceived > 0 ? formatCurrency(s.cashReceived, lang) : '-'}
                      </td>
                      <td className="p-3 text-right text-amber-700 font-black">
                        {s.outstandingDue > 0 ? formatCurrency(s.outstandingDue, lang) : '-'}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isFullAdvance
                              ? 'bg-indigo-100 text-indigo-800'
                              : isFullCash
                              ? 'bg-emerald-100 text-emerald-800'
                              : isFullDue
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isFullAdvance
                            ? 'অগ্রিম কর্তন'
                            : isFullCash
                            ? 'নগদ আদায়'
                            : isFullDue
                            ? 'বাকী'
                            : 'অগ্রিম ও নগদ/বাকী'}
                        </span>
                      </td>
                      <td className="p-3 text-right no-print">
                        <div className="flex justify-end space-x-1">
                          <button
                            onClick={() => setSelectedPuttiSlip(s)}
                            className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded"
                            title="পট্টি স্লিপ দেখুন ও প্রিন্ট করুন"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {!isReadOnly && (
                            <button
                              onClick={() => setSaleToDelete(s)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                              title="মুছুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot className="bg-slate-100 font-bold border-t text-slate-900">
              <tr>
                <td colSpan={3} className="p-3 text-right">সর্বমোট:</td>
                <td className="p-3 text-center">{totalKg} কেজি</td>
                <td></td>
                <td className="p-3 text-right text-slate-900 font-black text-sm">
                  {formatCurrency(totalGross, lang)}
                </td>
                <td className="p-3 text-right text-indigo-700">{formatCurrency(totalAdvances, lang)}</td>
                <td className="p-3 text-right text-emerald-700">{formatCurrency(totalCashCollected, lang)}</td>
                <td className="p-3 text-right text-amber-700">{formatCurrency(totalDues, lang)}</td>
                <td colSpan={2} className="p-3 no-print"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="print-only p-4">
          <PrintSignatures />
        </div>
      </div>

      {/* Modal: Add Advance from Putti Wala */}
      {isAdvanceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Wallet className="w-5 h-5 text-indigo-600" />
                <span>পট্টি ওয়ালার থেকে অগ্রিম গ্রহণ</span>
              </h3>
              <button
                onClick={() => setIsAdvanceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              পট্টি ওয়ালার থেকে অগ্রিম টাকা নেওয়া থাকলে তা এখানে জমা করুন। পরবর্তীতে পট্টি বিক্রি করলে এই অগ্রিম থেকে স্বয়ংক্রিয়ভাবে বিয়োগ হবে।
            </p>

            {advanceSuccessMessage && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{advanceSuccessMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveAdvance} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  পট্টি ওয়ালা / ক্রেতার নাম *
                </label>
                <input
                  type="text"
                  required
                  list="putti-buyers-list"
                  placeholder="যেমন: আলমগীর পট্টি ওয়ালা"
                  value={advanceForm.buyerName}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, buyerName: e.target.value })}
                  className="w-full border rounded-lg p-2.5 text-xs font-bold text-slate-900"
                />
                <datalist id="putti-buyers-list">
                  {existingBuyers.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">তারিখ</label>
                  <input
                    type="date"
                    required
                    value={advanceForm.date}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, date: e.target.value })}
                    className="w-full border rounded-lg p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">পেমেন্ট মাধ্যম</label>
                  <select
                    value={advanceForm.paymentMethod}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, paymentMethod: e.target.value })}
                    className="w-full border rounded-lg p-2 text-xs"
                  >
                    <option value="cash">নগদ (Cash)</option>
                    <option value="bkash">বিকাশ</option>
                    <option value="nagad">নগদ</option>
                    <option value="bank">ব্যাংক</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  অগ্রিম গ্রহণের পরিমাণ (৳) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={advanceForm.amount}
                  onChange={(e) =>
                    setAdvanceForm({ ...advanceForm, amount: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full border rounded-lg p-2.5 text-base font-black text-indigo-800"
                  placeholder="৳ 0.00"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">নোট / মন্তব্য</label>
                <input
                  type="text"
                  value={advanceForm.notes}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, notes: e.target.value })}
                  placeholder="অগ্রিমের বিবরণ বা বিশেষ নোট"
                  className="w-full border rounded-lg p-2 text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdvanceModalOpen(false);
                    setAdvanceSuccessMessage('');
                  }}
                  className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  সম্পন্ন / বন্ধ করুন
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  অগ্রিম জমা (নতুন এন্ট্রি চালু থাকবে)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Putti Buyer Advances Ledger */}
      {isAdvanceListModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <History className="w-5 h-5 text-indigo-600" />
                <span>পট্টি ওয়ালাদের অগ্রিম জমার তালিকা</span>
              </h3>
              <button
                onClick={() => setIsAdvanceListModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {puttiAdvances.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">
                এখনও কোনো পট্টি ওয়ালার থেকে অগ্রিম গ্রহণ করা হয়নি।
              </p>
            ) : (
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                    <tr>
                      <th className="p-2.5">তারিখ</th>
                      <th className="p-2.5">ক্রেতা / পট্টি ওয়ালা</th>
                      <th className="p-2.5 text-right">গৃহীত অগ্রিম (৳)</th>
                      <th className="p-2.5 text-right text-indigo-700">বর্তমান অবশিষ্ট অগ্রিম (৳)</th>
                      <th className="p-2.5 text-center">মাধ্যম</th>
                      {!isReadOnly && <th className="p-2.5 text-right">মুছুন</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {puttiAdvances.map((adv) => (
                      <tr key={adv.id} className="hover:bg-slate-50">
                        <td className="p-2.5">{formatDate(adv.date, lang)}</td>
                        <td className="p-2.5 font-bold text-slate-900">{adv.buyerName}</td>
                        <td className="p-2.5 text-right font-bold text-indigo-700">
                          {formatCurrency(adv.amount, lang)}
                        </td>
                        <td className="p-2.5 text-right font-black text-emerald-800">
                          {formatCurrency(getBuyerAdvanceBalance(adv.buyerName), lang)}
                        </td>
                        <td className="p-2.5 text-center uppercase text-[10px] text-slate-500">
                          {adv.paymentMethod}
                        </td>
                        {!isReadOnly && (
                          <td className="p-2.5 text-right">
                            <button
                              onClick={() => setAdvanceToDelete(adv)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded"
                              title="অগ্রিম রেকর্ড মুছুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsAdvanceListModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Putti Sale with Advance deduction & Cash/Due Settlement */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border my-auto max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-3">
              নতুন পট্টি বিক্রি এন্ট্রি
            </h3>
            {saleSuccessMessage && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{saleSuccessMessage}</span>
              </div>
            )}
            <form onSubmit={handleSaveSale} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">তারিখ</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full border rounded-lg p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">পট্টির বিবরণ / ধরন *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as PuttiCategory })}
                    className="w-full border rounded-lg p-2 text-xs font-bold text-slate-800"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">পরিমাণ (কেজি) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={form.quantityKg}
                    onChange={(e) => setForm({ ...form, quantityKg: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded p-2 text-sm font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">দর (৳ প্রতি কেজি) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={form.ratePerKg}
                    onChange={(e) => setForm({ ...form, ratePerKg: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded p-2 text-sm font-bold text-center"
                  />
                </div>
              </div>

              {/* Buyer selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ক্রেতার নাম (পট্টি ওয়ালা) *
                </label>
                <input
                  type="text"
                  required
                  list="putti-sale-buyers"
                  value={form.buyerName}
                  onChange={(e) => setForm({ ...form, buyerName: e.target.value })}
                  placeholder="ক্রেতার নাম লিখুন বা বাছুন..."
                  className="w-full border rounded-lg p-2 text-xs font-bold text-slate-900"
                />
                <datalist id="putti-sale-buyers">
                  {existingBuyers.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>

              {/* Total Gross Display */}
              <div className="bg-slate-100 border p-3 rounded-xl flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">মোট বিক্রয় মূল্য (Gross Sale):</span>
                <span className="text-base font-black text-slate-900">
                  {formatCurrency(grossSale, lang)}
                </span>
              </div>

              {/* Advance Adjustment Section */}
              <div className="border border-indigo-200 bg-indigo-50/40 p-3.5 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-950 flex items-center space-x-1">
                    <Wallet className="w-4 h-4 text-indigo-600" />
                    <span>পট্টি ওয়ালার জমা অগ্রিম স্ট্যাটাস:</span>
                  </span>
                  <span className="font-black text-indigo-900 text-sm">
                    {buyerAvailableAdvance > 0
                      ? formatCurrency(buyerAvailableAdvance, lang)
                      : 'কোনো অগ্রিম নেই (৳ 0)'}
                  </span>
                </div>

                {buyerAvailableAdvance > 0 ? (
                  <div className="p-2.5 bg-white border border-indigo-200 rounded-lg space-y-2">
                    <label className="flex items-center space-x-2 text-indigo-900 font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.deductAdvance}
                        onChange={(e) => setForm({ ...form, deductAdvance: e.target.checked })}
                        className="rounded text-indigo-600"
                      />
                      <span>জমা অগ্রিম থেকে বিক্রয় মূল্য বিয়োগ করুন (- ৳{calculatedAdvanceDeduction})</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      এই বিক্রির পর পট্টি ওয়ালার অবশিষ্ট অগ্রিম থাকবে:{' '}
                      <b className="text-indigo-800">
                        {formatCurrency(Math.max(0, buyerAvailableAdvance - calculatedAdvanceDeduction), lang)}
                      </b>
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    * এই পট্টি ওয়ালার কাছে কোনো জমা অগ্রিম নেই। সম্পূর্ণ মূল্য নগদ অথবা বাকী হিসেবে প্রযোজ্য হবে।
                  </p>
                )}
              </div>

              {/* If remaining amount exists after advance deduction, specify Cash or Due */}
              {remainingAfterAdvance > 0 && (
                <div className="border border-amber-200 bg-amber-50/40 p-3.5 rounded-xl space-y-3 text-xs">
                  <div className="flex justify-between items-center font-bold text-amber-950">
                    <span>অগ্রিম বাদে প্রদেয় অবশিষ্ট টাকা:</span>
                    <span className="text-base font-black text-amber-900">
                      {formatCurrency(remainingAfterAdvance, lang)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      অবশিষ্ট টাকা কিভাবে পরিশোধ হচ্ছে? *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, paymentMethodChoice: 'cash' })}
                        className={`p-2 rounded-lg font-bold text-center border transition ${
                          form.paymentMethodChoice === 'cash'
                            ? 'bg-emerald-700 text-white border-emerald-700'
                            : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        নগদ আদায় (Cash)
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, paymentMethodChoice: 'due' })}
                        className={`p-2 rounded-lg font-bold text-center border transition ${
                          form.paymentMethodChoice === 'due'
                            ? 'bg-rose-700 text-white border-rose-700'
                            : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        সম্পূর্ণ বাকী (Due)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            paymentMethodChoice: 'partial',
                            cashAmount: Math.round(remainingAfterAdvance / 2),
                          })
                        }
                        className={`p-2 rounded-lg font-bold text-center border transition ${
                          form.paymentMethodChoice === 'partial'
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        আংশিক নগদ
                      </button>
                    </div>
                  </div>

                  {form.paymentMethodChoice === 'partial' && (
                    <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-lg border">
                      <div>
                        <label className="block text-[11px] text-slate-600 font-bold mb-1">
                          নগদ প্রাপ্ত টাকা (৳):
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={remainingAfterAdvance}
                          value={form.cashAmount}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              cashAmount: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full border rounded p-1.5 text-xs font-bold text-emerald-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-600 font-bold mb-1">
                          অবশিষ্ট বাকী (৳):
                        </label>
                        <div className="p-1.5 text-xs font-black text-rose-700">
                          {formatCurrency(finalOutstandingDue, lang)}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-[11px] text-slate-600 pt-1 border-t border-amber-200">
                    <span>
                      নগদ আদায়: <b className="text-emerald-800">{formatCurrency(finalCashReceived, lang)}</b>
                    </span>
                    <span>
                      বাকি পাওনা: <b className="text-amber-800">{formatCurrency(finalOutstandingDue, lang)}</b>
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">মন্তব্য</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="গাড়ি নম্বর বা বিশেষ নোট"
                  className="w-full border rounded-lg p-2 text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setSaleSuccessMessage('');
                  }}
                  className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  সম্পন্ন / বন্ধ করুন
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  বিক্রি সংরক্ষণ (নতুন এন্ট্রি চালু থাকবে)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for Sale Record */}
      <ConfirmModal
        isOpen={!isReadOnly && !!saleToDelete}
        title="পট্টি বিক্রির রেকর্ড মুছে ফেলা"
        message="আপনি কি নিশ্চিত যে এই পট্টি বিক্রির রেকর্ডটি মুছে ফেলতে চান? এটি মুছে দিলে হিসাব থেকে বাদ পড়বে।"
        onConfirm={() => {
          if (isReadOnly) return;
          if (saleToDelete) {
            deletePuttiSale(saleToDelete.id);
            setSaleToDelete(null);
          }
        }}
        onCancel={() => setSaleToDelete(null)}
      />

      {/* Delete Confirmation Modal for Advance Record */}
      <ConfirmModal
        isOpen={!isReadOnly && !!advanceToDelete}
        title="পট্টি ওয়ালার অগ্রিম রেকর্ড মুছে ফেলা"
        message="আপনি কি নিশ্চিত যে এই অগ্রিম জমার রেকর্ডটি মুছে ফেলতে চান?"
        onConfirm={() => {
          if (isReadOnly) return;
          if (advanceToDelete) {
            setPuttiAdvances((prev) => prev.filter((a) => a.id !== advanceToDelete.id));
            setAdvanceToDelete(null);
          }
        }}
        onCancel={() => setAdvanceToDelete(null)}
      />
    </div>
  );
};
