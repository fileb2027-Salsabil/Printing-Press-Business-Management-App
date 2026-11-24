import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { PaperStockRecord, PaperStockType } from '../../types';
import { formatDate } from '../../utils/calculations';
import { translations } from '../../utils/i18n';
import { PrintHeader, PrintSignatures, triggerPrint } from '../common/PrintHeader';
import { ConfirmModal } from '../common/ConfirmModal';
import { SmartNumberInput } from '../common/SmartNumberInput';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Printer,
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  CheckCircle,
  FileSpreadsheet,
} from 'lucide-react';

export const PaperStockManager: React.FC = () => {
  const { db, isReadOnly, addPaperStock, updatePaperStock, deletePaperStock, getPaperStockBalance } = useDatabase();
  const lang = db.settings.language;
  const t = translations[lang];

  const today = new Date().toISOString().split('T')[0];
  const stocks = db.paperStock || [];

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | PaperStockType>('all');
  const [sizeFilter, setSizeFilter] = useState('');
  const [gsmFilter, setGsmFilter] = useState('');
  const [partyFilter, setPartyFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<PaperStockRecord | null>(null);
  const [stockToDelete, setStockToDelete] = useState<PaperStockRecord | null>(null);
  const [selectedStockSlip, setSelectedStockSlip] = useState<PaperStockRecord | null>(null);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form states
  const [form, setForm] = useState({
    date: today,
    type: 'inward' as PaperStockType,
    paperType: 'অফসেট পেপার',
    size: '২৩×৩৬',
    gsm: '৭০ গ্রাম',
    company: 'কর্ণফুলী পেপার মিলস',
    reams: 20 as number | '',
    partyId: '',
    partyName: '',
    challanNo: '',
    notes: '',
  });

  // Unique sizes, gsms and companies for quick filtering
  const allSizes = Array.from(new Set(stocks.map((s) => s.size).filter(Boolean)));
  const allGsms = Array.from(new Set(stocks.map((s) => s.gsm).filter(Boolean)));
  const allCompanies = Array.from(new Set(stocks.map((s) => s.company).filter(Boolean)));

  // Filtered Stock Entries
  const filteredStocks = stocks.filter((s) => {
    const matchSearch = search
      ? s.paperType.toLowerCase().includes(search.toLowerCase()) ||
        s.size.toLowerCase().includes(search.toLowerCase()) ||
        (s.gsm && s.gsm.toLowerCase().includes(search.toLowerCase())) ||
        s.company.toLowerCase().includes(search.toLowerCase()) ||
        (s.partyName && s.partyName.toLowerCase().includes(search.toLowerCase())) ||
        (s.challanNo && s.challanNo.toLowerCase().includes(search.toLowerCase()))
      : true;
    const matchType = typeFilter === 'all' ? true : s.type === typeFilter;
    const matchSize = sizeFilter ? s.size.toLowerCase() === sizeFilter.toLowerCase() : true;
    const matchGsm = gsmFilter ? (s.gsm && s.gsm.toLowerCase() === gsmFilter.toLowerCase()) : true;
    const matchParty = partyFilter
      ? partyFilter === 'press_own'
        ? !s.partyId && (!s.partyName || s.partyName === 'প্রেসের নিজস্ব স্টক')
        : s.partyId === partyFilter || s.partyName === partyFilter
      : true;
    const matchCompany = companyFilter ? s.company === companyFilter : true;
    return matchSearch && matchType && matchSize && matchGsm && matchParty && matchCompany;
  });

  // Aggregations
  const totalInwardReams = stocks
    .filter((s) => s.type === 'inward')
    .reduce((sum, s) => sum + s.reams, 0);

  const totalOutwardReams = stocks
    .filter((s) => s.type === 'outward')
    .reduce((sum, s) => sum + s.reams, 0);

  const currentNetStock = totalInwardReams - totalOutwardReams;

  // Stock breakdown by size
  const standardSizes = ['২৩×৩৬', '২০×৩০', '২৫×৩৭', '১৮×২৮', '২৪×৩৬', '২৬×৩৭'];
  const sizesToDisplay = Array.from(new Set([...standardSizes, ...allSizes]));

  const handleOpenModal = (stock?: PaperStockRecord) => {
    if (isReadOnly) return;
    setFormError('');
    setSuccessMessage('');
    if (stock) {
      setEditingStock(stock);
      setForm({
        date: stock.date,
        type: stock.type,
        paperType: stock.paperType,
        size: stock.size,
        gsm: stock.gsm || '৭০ গ্রাম',
        company: stock.company,
        reams: stock.reams,
        partyId: stock.partyId || '',
        partyName: stock.partyName || '',
        challanNo: stock.challanNo || '',
        notes: stock.notes || '',
      });
    } else {
      setEditingStock(null);
      const defaultParty = db.parties[0];
      setForm({
        date: today,
        type: 'inward',
        paperType: 'অফসেট পেপার',
        size: '২৩×৩৬',
        gsm: '৭০ গ্রাম',
        company: 'কর্ণফুলী পেপার মিলস',
        reams: 20,
        partyId: defaultParty?.id || '',
        partyName: defaultParty?.name || '',
        challanNo: `CH-${Date.now().toString().slice(-4)}`,
        notes: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const reamsNum = typeof form.reams === 'number' ? form.reams : parseFloat(form.reams);
    if (!reamsNum || reamsNum <= 0) {
      setFormError('সঠিক রিম সংখ্যা প্রদান করুন');
      return;
    }
    if (!form.size.trim()) {
      setFormError('কাগজের সাইজ লিখুন বা নির্বাচন করুন');
      return;
    }
    if (!form.paperType.trim()) {
      setFormError('কী কাগজ (কাগজের ধরন) লিখুন');
      return;
    }
    if (!form.company.trim()) {
      setFormError('কাগজের মিল বা কোম্পানির নাম লিখুন');
      return;
    }

    const payload = {
      date: form.date,
      type: form.type,
      paperType: form.paperType.trim(),
      size: form.size.trim(),
      gsm: form.gsm.trim() || undefined,
      company: form.company.trim(),
      reams: reamsNum,
      partyId: form.partyId || undefined,
      partyName: form.partyName.trim() || undefined,
      challanNo: form.challanNo.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    if (editingStock) {
      updatePaperStock(editingStock.id, payload);
      setIsModalOpen(false);
    } else {
      addPaperStock(payload);
      setSuccessMessage(`কাগজের স্টক সফলভাবে সংরক্ষিত হয়েছে (${payload.reams} রিম, ${payload.paperType})! নতুন এন্ট্রি করতে পারেন।`);
      setForm((prev) => ({
        ...prev,
        reams: 20,
        challanNo: `CH-${Date.now().toString().slice(-4)}`,
        notes: '',
      }));
    }
  };

  const handleConfirmDelete = () => {
    if (stockToDelete) {
      deletePaperStock(stockToDelete.id);
      setStockToDelete(null);
    }
  };

  // Printable Challan / Stock Slip
  if (selectedStockSlip) {
    return (
      <div className="space-y-6">
        <div className="no-print flex items-center justify-between">
          <button
            onClick={() => setSelectedStockSlip(null)}
            className="flex items-center space-x-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 px-3.5 py-2 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>কাগজের হিসাবে ফিরে যান</span>
          </button>

          <button
            onClick={() => triggerPrint()}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>সরাসরি প্রিন্ট করুন</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs max-w-2xl mx-auto print-container">
          <PrintHeader
            title={
              selectedStockSlip.type === 'inward'
                ? 'কাগজ আগমন চালান ও মেমো (PAPER INWARD CHALLAN)'
                : 'কাগজ খরচ ও প্রডাকশন ব্যবহারের চালান (PAPER USAGE MEMO)'
            }
            documentNo={selectedStockSlip.challanNo || `STK-${selectedStockSlip.id.slice(-6).toUpperCase()}`}
            date={selectedStockSlip.date}
          />

          <div className="my-6 space-y-4 text-xs text-slate-800 border p-5 rounded-xl bg-slate-50/50">
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">চালান / মেমো নম্বর:</span>
              <span className="font-bold text-slate-900 text-sm">
                {selectedStockSlip.challanNo || 'চালানবিহীন'}
              </span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">তারিখ:</span>
              <span className="font-bold">{formatDate(selectedStockSlip.date, lang)}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">হিসাবের ধরন:</span>
              <span
                className={`font-black ${
                  selectedStockSlip.type === 'inward' ? 'text-emerald-800' : 'text-rose-700'
                }`}
              >
                {selectedStockSlip.type === 'inward' ? 'প্রেসে আগমন (যোগ)' : 'প্রডাকশনে ব্যবহৃত (বিয়োগ)'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white p-4 rounded-lg border">
              <div>
                <span className="text-slate-500 text-[11px] block">কাগজের সাইজ:</span>
                <span className="font-bold text-sm text-slate-900">{selectedStockSlip.size}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">কাগজের গ্রাম (GSM):</span>
                <span className="font-bold text-sm text-slate-900">{selectedStockSlip.gsm || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">কী কাগজ (ধরন):</span>
                <span className="font-bold text-sm text-slate-900">{selectedStockSlip.paperType}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">কোম্পানি / মিল:</span>
                <span className="font-bold text-sm text-slate-900">{selectedStockSlip.company}</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-slate-500 text-[11px] block">কাগজের পরিমাণ:</span>
                <span className="font-black text-lg text-emerald-800">
                  {selectedStockSlip.reams} রিম
                </span>
              </div>
            </div>

            {selectedStockSlip.partyName && (
              <div className="flex justify-between border-b pb-2 pt-1">
                <span className="text-slate-500 font-semibold">পার্টির নাম:</span>
                <span className="font-bold text-slate-900">{selectedStockSlip.partyName}</span>
              </div>
            )}

            {selectedStockSlip.notes && (
              <div className="pt-2 text-slate-600">
                <span className="font-semibold block text-[11px] text-slate-400">মন্তব্য:</span>
                <p className="bg-white p-2.5 rounded border text-xs">{selectedStockSlip.notes}</p>
              </div>
            )}
          </div>

          <div className="mt-8">
            <PrintSignatures />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">কাগজের হিসাব ও স্টক লেজার</h2>
          <p className="text-xs text-slate-500">
            প্রেসে কাগজ আগমন (কত তারিখে আসলো, কত রিম, সাইজ, কী কাগজ, কোম্পানি) ও প্রডাকশন অনুযায়ী স্বয়ংক্রিয় বিয়োগ
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {!isReadOnly && (
            <button
              onClick={() => handleOpenModal()}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন কাগজ এন্ট্রি</span>
            </button>
          )}
          <button
            onClick={() => triggerPrint()}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>সরাসরি প্রিন্ট</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="no-print grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-emerald-700">মোট কাগজ আগমন</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-xl font-black text-emerald-800 mt-1">{totalInwardReams} রিম</p>
          <span className="text-[10px] text-emerald-600">প্রেসে সর্বমোট চালান এন্ট্রি</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-rose-100 bg-rose-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-rose-700">প্রডাকশনে ব্যবহৃত (বিয়োগ)</span>
            <ArrowUpRight className="w-4 h-4 text-rose-700" />
          </div>
          <p className="text-xl font-black text-rose-700 mt-1">{totalOutwardReams} রিম</p>
          <span className="text-[10px] text-rose-600">প্রডাকশন কাজ অনুযায়ী বিয়োগকৃত</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500">বর্তমান অবশিষ্ট মোট স্টক</span>
          <p className="text-xl font-black text-slate-900 mt-1">
            {currentNetStock >= 0 ? `${currentNetStock} রিম` : `${currentNetStock} রিম (ঘাটতি)`}
          </p>
          <span className="text-[10px] text-slate-500">প্রেসে উপস্থিত কাগজের উদ্বৃত্ত</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-blue-100 bg-blue-50/20 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-blue-700">কাগজ এন্ট্রি সংখ্যা</span>
          <p className="text-xl font-black text-blue-800 mt-1">{stocks.length} টি</p>
          <span className="text-[10px] text-blue-600">ইনওয়ার্ড ও আউটওয়ার্ড লেনদেন</span>
        </div>
      </div>

      {/* Stock by Paper Size Chips */}
      <div className="no-print bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center space-x-1.5">
          <Package className="w-4 h-4 text-emerald-700" />
          <span>সাইজ অনুযায়ী বর্তমান কাগজ ব্যালেন্স (Current Stock by Size):</span>
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {sizesToDisplay.map((sz) => {
            const bal = getPaperStockBalance(sz);
            return (
              <div
                key={sz}
                onClick={() => setSizeFilter(sizeFilter === sz ? '' : sz)}
                className={`cursor-pointer p-2.5 rounded-xl border transition ${
                  sizeFilter === sz
                    ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800">{sz}</span>
                  <span
                    className={`font-black ${
                      bal > 0 ? 'text-emerald-700' : bal < 0 ? 'text-rose-600' : 'text-slate-400'
                    }`}
                  >
                    {bal} রিম
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="no-print bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="flex-1 flex items-center space-x-2 w-full">
          <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="কাগজের নাম, সাইজ, গ্রাম, কোম্পানি, পার্টি বা চালান নং দিয়ে সার্চ করুন..."
            className="w-full text-xs outline-none bg-transparent"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto flex-wrap">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={partyFilter}
            onChange={(e) => setPartyFilter(e.target.value)}
            className="border rounded-lg p-1.5 text-xs font-bold text-slate-700 bg-white max-w-[170px]"
          >
            <option value="">সকল পার্টি / কাস্টমার</option>
            <option value="press_own">🏢 প্রেসের নিজস্ব স্টক</option>
            {db.parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="border rounded-lg p-1.5 text-xs font-bold text-slate-700 bg-white"
          >
            <option value="all">সকল লেনদেন</option>
            <option value="inward">প্রেসে আগমন (যোগ)</option>
            <option value="outward">প্রডাকশনে ব্যবহৃত (বিয়োগ)</option>
          </select>

          <select
            value={sizeFilter}
            onChange={(e) => setSizeFilter(e.target.value)}
            className="border rounded-lg p-1.5 text-xs font-bold text-slate-700 bg-white"
          >
            <option value="">সকল সাইজ</option>
            {sizesToDisplay.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {allGsms.length > 0 && (
            <select
              value={gsmFilter}
              onChange={(e) => setGsmFilter(e.target.value)}
              className="border rounded-lg p-1.5 text-xs font-bold text-slate-700 bg-white"
            >
              <option value="">সকল গ্রাম (GSM)</option>
              {allGsms.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          )}

          {allCompanies.length > 0 && (
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="border rounded-lg p-1.5 text-xs font-bold text-slate-700 bg-white max-w-[150px]"
            >
              <option value="">সকল কোম্পানি</option>
              {allCompanies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Selected Party Balance Highlight */}
      {partyFilter && partyFilter !== 'press_own' && (() => {
        const pty = db.parties.find((p) => p.id === partyFilter);
        const partyStocks = stocks.filter((s) => s.partyId === partyFilter || s.partyName === pty?.name);
        const pInward = partyStocks.filter((s) => s.type === 'inward').reduce((sum, s) => sum + s.reams, 0);
        const pOutward = partyStocks.filter((s) => s.type === 'outward').reduce((sum, s) => sum + s.reams, 0);
        const pNet = pInward - pOutward;
        return (
          <div className="no-print bg-amber-50 border border-amber-200 rounded-xl p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shadow-2xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-800">নির্দিষ্ট পার্টির কাগজের হিসাব</span>
              <h4 className="text-sm font-bold text-amber-950 mt-0.5">{pty?.name}</h4>
              <p className="text-xs text-amber-900">
                এই পার্টির কাগজ জমা: <b>+{pInward} রিম</b> | প্রডাকশনে খরচ হয়েছে: <b>-{pOutward} রিম</b>
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-amber-700 block">এই পার্টির অবশিষ্ট কাগজ</span>
              <span className="text-base font-black text-amber-950 bg-white px-3 py-1 rounded-lg border border-amber-300 inline-block">
                {pNet} রিম
              </span>
            </div>
          </div>
        );
      })()}

      {/* Table / Printable Area */}
      <div className="print-area space-y-4">
        <div className="print-only">
          <PrintHeader
            title="কাগজের হিসাব ও স্টক বিবরণী (Paper Stock Ledger)"
            subtitle={`তারিখ: ${formatDate(today, lang)} | মোট আগমন: ${totalInwardReams} রিম | মোট ব্যবহার: ${totalOutwardReams} রিম | বর্তমান স্টক: ${currentNetStock} রিম`}
          />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                <tr>
                  <th className="p-3">তারিখ</th>
                  <th className="p-3 text-center">লেনদেনের ধরন</th>
                  <th className="p-3">পার্টি / মালিক</th>
                  <th className="p-3">সাইজ</th>
                  <th className="p-3">গ্রাম (GSM)</th>
                  <th className="p-3">কী কাগজ (ধরন)</th>
                  <th className="p-3">কোম্পানি / মিল</th>
                  <th className="p-3 text-right">পরিমাণ (রিম)</th>
                  <th className="p-3">চালান / রেফারেন্স</th>
                  <th className="p-3">মন্তব্য</th>
                  <th className="p-3 text-right no-print">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredStocks.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-400">
                      কোনো কাগজের রেকর্ড পাওয়া যায়নি। "+ নতুন কাগজ এন্ট্রি" বাটনে ক্লিক করে যোগ করুন।
                    </td>
                  </tr>
                ) : (
                  filteredStocks.map((s) => {
                    const isInward = s.type === 'inward';
                    return (
                      <tr key={s.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 text-slate-500 whitespace-nowrap">
                          {formatDate(s.date, lang)}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center space-x-1 ${
                              isInward
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {isInward ? (
                              <>
                                <ArrowDownLeft className="w-3 h-3" />
                                <span>প্রেসে আগমন</span>
                              </>
                            ) : (
                              <>
                                <ArrowUpRight className="w-3 h-3" />
                                <span>প্রডাকশন খরচ</span>
                              </>
                            )}
                          </span>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {s.partyName ? (
                            <span className="font-bold text-slate-900 block">{s.partyName}</span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              প্রেসের নিজস্ব
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-bold text-slate-900 whitespace-nowrap">{s.size}</td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                            {s.gsm || '৮০ গ্রাম'}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-800">{s.paperType}</td>
                        <td className="p-3 text-slate-600">{s.company}</td>
                        <td
                          className={`p-3 text-right font-black text-sm whitespace-nowrap ${
                            isInward ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {isInward ? `+${s.reams}` : `-${s.reams}`} রিম
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-600">
                          {s.challanNo || (s.productionId ? 'প্রডাকশন লিঙ্ক' : '-')}
                        </td>
                        <td className="p-3 text-slate-600 text-xs max-w-xs truncate">
                          {s.notes || '-'}
                        </td>
                        <td className="p-3 text-right no-print whitespace-nowrap">
                          <div className="flex justify-end items-center space-x-1">
                            <button
                              onClick={() => setSelectedStockSlip(s)}
                              className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded"
                              title="চালান / স্লিপ প্রিন্ট"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {!isReadOnly && (
                              <>
                                <button
                                  onClick={() => handleOpenModal(s)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                  title="এডিট করুন"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setStockToDelete(s)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                  title="মুছুন"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
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
                  <td colSpan={7} className="p-3 text-right">
                    ফিল্টার অনুযায়ী মোট ব্যালেন্স:
                  </td>
                  <td className="p-3 text-right text-sm font-black text-emerald-800">
                    {filteredStocks.reduce(
                      (sum, s) => (s.type === 'inward' ? sum + s.reams : sum - s.reams),
                      0
                    )}{' '}
                    রিম
                  </td>
                  <td colSpan={3} className="p-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="print-only p-4">
            <PrintSignatures />
          </div>
        </div>
      </div>

      {/* Modal: Add/Edit Paper Stock */}
      {isModalOpen && (
        <div className="no-print fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border my-auto max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center space-x-2">
              <Package className="w-5 h-5 text-emerald-700" />
              <span>{editingStock ? 'কাগজের হিসাব রেকর্ড সংশোধন' : 'প্রেসে নতুন কাগজ আগমন / হিসাব এন্ট্রি'}</span>
            </h3>

            {formError && (
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
                {formError}
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2 animate-in fade-in duration-200">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    কাগজ আসার তারিখ *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full border rounded-lg p-2 text-xs font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    লেনদেনের ধরন *
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as PaperStockType })}
                    className="w-full border rounded-lg p-2 text-xs font-bold text-slate-900"
                  >
                    <option value="inward">প্রেসে আগমন (স্টকে যোগ)</option>
                    <option value="outward">প্রডাকশনে ব্যবহৃত / খরচ (বিয়োগ)</option>
                  </select>
                </div>
              </div>

              {/* Size & GSM */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      কাগজের সাইজ (ইচ্ছামতো যেকোনো সাইজ লিখুন) *
                    </label>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: ২৩×৩৬, ২০×৩০, ২৬×৩৭ বা যেকোনো সাইজ"
                    value={form.size}
                    onChange={(e) => setForm({ ...form, size: e.target.value })}
                    className="w-full border rounded-lg p-2 text-xs font-bold text-slate-900 bg-white"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['২৩×৩৬', '২০×৩০', '২৫×৩৭', '১৮×২৮', '২৪×৩৬', '২৬×৩৭'].map((s) => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setForm({ ...form, size: s })}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                          form.size === s
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-400'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    💡 অটোতে সীমাবদ্ধ নয়, আপনার প্রয়োজনীয় যেকোনো সাইজ লিখে দিতে পারেন।
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    কত গ্রাম এর কাগজ (GSM / গ্রাম) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: ৬৫ গ্রাম, ৭০ গ্রাম, ৮০ গ্রাম, ১০০ গ্রাম"
                    value={form.gsm}
                    onChange={(e) => setForm({ ...form, gsm: e.target.value })}
                    className="w-full border rounded-lg p-2 text-xs font-bold text-slate-900 bg-white"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['৫৫ গ্রাম', '৬৫ গ্রাম', '৭০ গ্রাম', '৭৫ গ্রাম', '৮০ গ্রাম', '১০০ গ্রাম', '১২০ গ্রাম', '৩০০ গ্রাম'].map((g) => (
                      <button
                        type="button"
                        key={g}
                        onClick={() => setForm({ ...form, gsm: g })}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                          form.gsm === g
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-400'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reams & Paper Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    কত রিম (পরিমাণ) *
                  </label>
                  <SmartNumberInput
                    required
                    min={0}
                    clearableToEmpty
                    placeholder="রিম সংখ্যা"
                    value={form.reams}
                    onTextValueChange={(s) =>
                      setForm({
                        ...form,
                        reams: s === '' ? '' : Number.isFinite(parseFloat(s)) ? parseFloat(s) : '',
                      })
                    }
                    className="w-full border rounded-lg p-2 text-xs font-bold text-emerald-800 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    কী কাগজ (ধরন) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: অফসেট পেপার, হোয়াইট পেপার, আর্ট পেপার"
                    value={form.paperType}
                    onChange={(e) => setForm({ ...form, paperType: e.target.value })}
                    className="w-full border rounded-lg p-2 text-xs font-bold text-slate-900 bg-white"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['অফসেট পেপার', 'হোয়াইট পেপার', 'আর্ট পেপার', 'নিউজপ্রিন্ট', 'কার্ট্রিজ পেপার'].map((pt) => (
                      <button
                        type="button"
                        key={pt}
                        onClick={() => setForm({ ...form, paperType: pt })}
                        className="px-1.5 py-0.5 rounded text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-700"
                      >
                        {pt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Company & Party Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    কোন কোম্পানির কাগজ *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: কর্ণফুলী, বসুন্ধরা, পারটেক্স, মেঘনা"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    className="w-full border rounded-lg p-2 text-xs font-bold text-slate-900 bg-white"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['কর্ণফুলী', 'বসুন্ধরা', 'পারটেক্স', 'মেঘনা', 'ইম্পোর্টেড'].map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => setForm({ ...form, company: c })}
                        className="px-1.5 py-0.5 rounded text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-700"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    পার্টি / কাস্টমার (কার কাগজ)
                  </label>
                  <select
                    value={form.partyId}
                    onChange={(e) => {
                      const pid = e.target.value;
                      const selectedP = db.parties.find((p) => p.id === pid);
                      setForm({
                        ...form,
                        partyId: pid,
                        partyName: selectedP ? selectedP.name : '',
                      });
                    }}
                    className="w-full border rounded-lg p-2 text-xs font-bold text-slate-900 bg-white mb-1.5"
                  >
                    <option value="">🏢 প্রেসের নিজস্ব কাগজ (কোনো পার্টির নয়)</option>
                    {db.parties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="বা সরাসরি পার্টির নাম লিখুন..."
                    value={form.partyName}
                    onChange={(e) => setForm({ ...form, partyName: e.target.value })}
                    className="w-full border rounded-lg p-1.5 text-xs bg-slate-50"
                  />
                  <span className="text-[10px] text-emerald-700 font-medium block mt-1">
                    ✓ প্রডাকশন উঠালে এই নির্দিষ্ট পার্টির স্টক থেকেই কাগজ খরচ হবে।
                  </span>
                </div>
              </div>

              {/* Challan No & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    চালান নম্বর (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    placeholder="যেমন: CH-4012"
                    value={form.challanNo}
                    onChange={(e) => setForm({ ...form, challanNo: e.target.value })}
                    className="w-full border rounded-lg p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">মন্তব্য (ঐচ্ছিক)</label>
                  <input
                    type="text"
                    placeholder="কাগজ সংক্রান্ত বিবরণ..."
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full border rounded-lg p-2 text-xs"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setSuccessMessage('');
                  }}
                  className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  {editingStock ? 'বাতিল' : 'সম্পন্ন / বন্ধ করুন'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  {editingStock ? 'পরিবর্তন সংরক্ষণ করুন' : 'সংরক্ষণ (নতুন এন্ট্রি চালু থাকবে)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {stockToDelete && (
        <ConfirmModal
          isOpen={true}
          title="কাগজের রেকর্ড মুছে ফেলবেন?"
          message={`আপনি কি নিশ্চিত যে "${stockToDelete.size}" সাইজের "${stockToDelete.paperType}" (${stockToDelete.reams} রিম) রেকর্ডটি মুছে ফেলতে চান?`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setStockToDelete(null)}
          confirmText="হ্যাঁ, মুছে ফেলুন"
          cancelText="না, ফিরে যান"
          danger={true}
        />
      )}
    </div>
  );
};
