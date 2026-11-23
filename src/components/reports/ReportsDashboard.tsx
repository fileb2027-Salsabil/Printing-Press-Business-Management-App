import React, { useState, useMemo } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { formatCurrency, formatDate } from '../../utils/calculations';
import { translations } from '../../utils/i18n';
import { PrintHeader, PrintSignatures, triggerPrint } from '../common/PrintHeader';
import {
  BarChart3,
  Calendar,
  Printer,
  Filter,
  Users,
  CreditCard,
  TrendingDown,
  TrendingUp,
  Scissors,
  Boxes,
  Package,
  Disc,
  FileText,
  Clock,
  Layers,
} from 'lucide-react';

export const ReportsDashboard: React.FC = () => {
  const { db, getPartyBalance, getPaperStockBalance } = useDatabase();
  const lang = db.settings.language;
  const t = translations[lang];

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const firstDayOfMonth = `${today.substring(0, 7)}-01`;
  const firstDayOfYear = `${now.getFullYear()}-01-01`;

  // 7 days ago
  const sevenDaysAgoDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const [reportType, setReportType] = useState<
    | 'general'
    | 'party'
    | 'production'
    | 'billing'
    | 'collection'
    | 'income-expense'
    | 'paper-stock'
    | 'plates'
    | 'cutting'
    | 'putti'
  >('general');

  const [fromDate, setFromDate] = useState(firstDayOfMonth);
  const [toDate, setToDate] = useState(today);
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [printMode, setPrintMode] = useState<'single' | 'all'>('single');

  // Filtering helpers
  const isInDateRange = (dateStr: string) => {
    if (!dateStr) return false;
    return dateStr >= fromDate && dateStr <= toDate;
  };

  // Aggregations within date range
  const rangeProductions = db.productions.filter((p) => isInDateRange(p.date));
  const rangeInvoices = db.invoices.filter((inv) => isInDateRange(inv.date));
  const rangeCollections = db.collections.filter((col) => isInDateRange(col.date));
  const rangeTransactions = db.transactions.filter((tx) => isInDateRange(tx.date));
  const rangeCutting = db.cuttingRecords.filter((c) => isInDateRange(c.date));
  const rangePutti = db.puttiSales.filter((p) => isInDateRange(p.date));
  const rangePaperStocks = (db.paperStock || []).filter((s) => isInDateRange(s.date));
  const allPlates = db.plates || [];

  const totalProductionReams = rangeProductions.reduce((s, p) => s + p.reams, 0);
  const totalBilledRevenue = rangeInvoices.reduce((s, inv) => s + inv.grandTotal, 0);
  const totalCollectionsCash = rangeCollections.reduce((s, col) => s + col.amount, 0);
  const totalExpenses = rangeTransactions
    .filter((tx) => tx.type === 'expense')
    .reduce((s, tx) => s + tx.amount, 0);
  const totalCuttingCost = rangeCutting.reduce((s, c) => s + c.totalCost, 0);
  const totalPuttiGross = rangePutti.reduce((s, p) => s + p.grossSale, 0);

  // Quick period setters
  const setDailyPeriod = () => {
    setFromDate(today);
    setToDate(today);
  };

  const setWeeklyPeriod = () => {
    setFromDate(sevenDaysAgoDate);
    setToDate(today);
  };

  const setMonthlyPeriod = () => {
    setFromDate(firstDayOfMonth);
    setToDate(today);
  };

  const setYearlyPeriod = () => {
    setFromDate(firstDayOfYear);
    setToDate(today);
  };

  const setAllTimePeriod = () => {
    setFromDate('2020-01-01');
    setToDate(`${now.getFullYear() + 5}-12-31`);
  };

  const setSpecificYear = (year: number) => {
    setFromDate(`${year}-01-01`);
    setToDate(`${year}-12-31`);
  };

  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 3; y <= currentYear + 3; y++) {
      yearsSet.add(y);
    }
    db.productions.forEach((p) => {
      if (p.date) yearsSet.add(parseInt(p.date.substring(0, 4), 10));
    });
    db.invoices.forEach((i) => {
      if (i.date) yearsSet.add(parseInt(i.date.substring(0, 4), 10));
    });
    db.transactions.forEach((t) => {
      if (t.date) yearsSet.add(parseInt(t.date.substring(0, 4), 10));
    });
    return Array.from(yearsSet).filter(Boolean).sort((a, b) => b - a);
  }, [db]);

  const handlePrintSingle = () => {
    setPrintMode('single');
    setTimeout(() => {
      triggerPrint();
    }, 50);
  };

  const handlePrintAll = () => {
    setPrintMode('all');
    setTimeout(() => {
      triggerPrint();
    }, 50);
  };

  const getPeriodLabel = () => {
    if (fromDate === today && toDate === today) return `আজকের দিন (${formatDate(today, lang)})`;
    if (fromDate === sevenDaysAgoDate && toDate === today) return `চলতি সপ্তাহ (${formatDate(fromDate, lang)} হতে ${formatDate(toDate, lang)})`;
    if (fromDate === firstDayOfMonth && toDate === today) return `চলতি মাস (${formatDate(fromDate, lang)} হতে ${formatDate(toDate, lang)})`;
    if (fromDate === firstDayOfYear && toDate === today) return `চলতি বছর (${now.getFullYear()} সাল)`;
    if (fromDate.endsWith('-01-01') && toDate.endsWith('-12-31') && fromDate.substring(0, 4) === toDate.substring(0, 4)) {
      return `${fromDate.substring(0, 4)} সালের সম্পূর্ণ হিসাব`;
    }
    if (fromDate === '2020-01-01') return 'শুরু হতে আজ পর্যন্ত সকল বছরের হিসাব (All Time)';
    return `${formatDate(fromDate, lang)} হতে ${formatDate(toDate, lang)}`;
  };

  return (
    <div className="space-y-6 print-area">
      {/* Header */}
      <div className="no-print flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.navReports}</h2>
          <p className="text-xs text-slate-500">
            প্রতি দিন, সপ্তাহ, মাস, বছরের ব্যবসায়িক হিসাব | একবারে পূর্ণাঙ্গ অথবা আলাদা প্রিন্ট
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrintSingle}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition"
            title="বর্তমান নির্বাচিত রিপোর্ট প্রিন্ট করুন"
          >
            <Printer className="w-4 h-4" />
            <span>আলাদা প্রিন্ট</span>
          </button>
          <button
            onClick={handlePrintAll}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition"
            title="সকল বিষয়ের সমন্বিত হিসাব একসাথে প্রিন্ট করুন"
          >
            <Layers className="w-4 h-4" />
            <span>একবারে পূর্ণাঙ্গ হিসাব প্রিন্ট</span>
          </button>
        </div>
      </div>

      {/* Date Range and Report Type Controls */}
      <div className="no-print bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        {/* Quick Period Selection Buttons */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-2">
            সময়কাল দ্রুত নির্বাচন (Quick Period Filter):
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <button
              type="button"
              onClick={setDailyPeriod}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 border ${
                fromDate === today && toDate === today
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>প্রতি দিন (আজ)</span>
            </button>

            <button
              type="button"
              onClick={setWeeklyPeriod}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 border ${
                fromDate === sevenDaysAgoDate && toDate === today
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>প্রতি সপ্তাহ (৭ দিন)</span>
            </button>

            <button
              type="button"
              onClick={setMonthlyPeriod}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 border ${
                fromDate === firstDayOfMonth && toDate === today
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>প্রতি মাস (চলতি মাস)</span>
            </button>

            <button
              type="button"
              onClick={setYearlyPeriod}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 border ${
                fromDate === firstDayOfYear && toDate === today
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>চলতি বছর ({now.getFullYear()})</span>
            </button>

            <button
              type="button"
              onClick={setAllTimePeriod}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 border col-span-2 sm:col-span-1 ${
                fromDate === '2020-01-01'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>সকল বছর (All Time)</span>
            </button>
          </div>
        </div>

        {/* Detailed Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-center pt-2 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">রিপোর্টের বিভাগ:</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="w-full border rounded-lg p-2 text-xs font-bold text-slate-800 bg-white"
            >
              <option value="general">১. সার্বিক সারসংক্ষেপ ও নগদ প্রবাহ</option>
              <option value="party">২. কাস্টমার / পার্টিভিত্তিক বকেয়া রিপোর্ট</option>
              <option value="production">৩. প্রডাকশন রিপোর্ট (Forma, Reams & Sheets)</option>
              <option value="billing">৪. বিল ও ইনভয়েস রিপোর্ট</option>
              <option value="collection">৫. নগদ কালেকশন আদায় রিপোর্ট</option>
              <option value="income-expense">৬. প্রতিষ্ঠানের ব্যয় বিবরণী</option>
              <option value="paper-stock">৭. কাগজের হিসাব ও স্টক বিবরণী</option>
              <option value="plates">৮. প্লেটের অবস্থান ও ট্র্যাকিং</option>
              <option value="cutting">৯. কাগজ কাটিং খরচ</option>
              <option value="putti">১০. পট্টি বিক্রি রাজস্ব</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">নির্দিষ্ট বছর বাছুন:</label>
            <select
              onChange={(e) => {
                if (e.target.value === 'all') {
                  setAllTimePeriod();
                } else if (e.target.value) {
                  setSpecificYear(parseInt(e.target.value, 10));
                }
              }}
              value={
                fromDate.endsWith('-01-01') && toDate.endsWith('-12-31') && fromDate.substring(0, 4) === toDate.substring(0, 4)
                  ? fromDate.substring(0, 4)
                  : fromDate === '2020-01-01'
                  ? 'all'
                  : ''
              }
              className="w-full border rounded-lg p-2 text-xs bg-white font-bold text-emerald-800"
            >
              <option value="">কাস্টম তারিখ পরিসীমা</option>
              <option value="all">সকল বছর (শুরু হতে আজীবন)</option>
              {availableYears.map((y) => (
                <option key={y} value={y.toString()}>
                  {y} সাল (১ জানু - ৩১ ডিসে)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">শুরুর তারিখ:</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full border rounded-lg p-2 text-xs bg-white font-bold text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">শেষ তারিখ:</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full border rounded-lg p-2 text-xs bg-white font-bold text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Printable Header */}
      <div className="print-only">
        <PrintHeader
          title={
            printMode === 'all'
              ? `${db.settings.name || 'Press Business Management'} - সর্বাঙ্গীন ব্যবসায়িক অডিট ও পূর্ণাঙ্গ হিসাব রিপোর্ট`
              : `${db.settings.name || 'Press Business Management'} - ${
                  reportType === 'general'
                    ? 'সার্বিক আর্থিক সারসংক্ষেপ'
                    : reportType === 'party'
                    ? 'পার্টি বকেয়া হিসাব'
                    : reportType === 'production'
                    ? 'প্রডাকশন রিপোর্ট'
                    : reportType === 'billing'
                    ? 'বিলিং ও ইনভয়েস রিপোর্ট'
                    : reportType === 'collection'
                    ? 'কালেকশন রিপোর্ট'
                    : reportType === 'income-expense'
                    ? 'আয়-ব্যয় হিসাব'
                    : reportType === 'paper-stock'
                    ? 'কাগজের হিসাব ও স্টক'
                    : reportType === 'plates'
                    ? 'প্লেটের অবস্থান বিবরণী'
                    : 'বিভাগভিত্তিক রিপোর্ট'
                }`
          }
          subtitle={`নির্বাচিত সময়কাল: ${getPeriodLabel()} | প্রস্তুতের তারিখ: ${formatDate(today, lang)}`}
        />
      </div>

      {/* PRINT ALL MODE: Render Comprehensive Full Statement */}
      {printMode === 'all' && (
        <div className="print-only space-y-6">
          {/* Section 1: Financial Overview */}
          <div className="border p-4 rounded-xl">
            <h3 className="font-bold text-sm text-slate-900 border-b pb-2 mb-3">
              ১. আর্থিক সারসংক্ষেপ ও নগদ উদ্বৃত্ত (Financial Overview)
            </h3>
            <div className="grid grid-cols-3 gap-3 text-xs mb-3">
              <div className="border p-2 rounded">
                <span className="text-slate-500 block">ইনভয়েস বিল রাজস্ব:</span>
                <span className="font-bold text-indigo-800">{formatCurrency(totalBilledRevenue, lang)}</span>
              </div>
              <div className="border p-2 rounded">
                <span className="text-slate-500 block">নগদ কালেকশন আদায়:</span>
                <span className="font-bold text-emerald-800">{formatCurrency(totalCollectionsCash, lang)}</span>
              </div>
              <div className="border p-2 rounded">
                <span className="text-slate-500 block">মোট ব্যয়সমূহ:</span>
                <span className="font-bold text-rose-700">{formatCurrency(totalExpenses, lang)}</span>
              </div>
            </div>
            <div className="flex justify-between border-t pt-2 text-xs font-black">
              <span>নগদ প্রবাহ নেট উদ্বৃত্ত (Collections - Expenses):</span>
              <span className={totalCollectionsCash - totalExpenses >= 0 ? 'text-emerald-800' : 'text-rose-700'}>
                {formatCurrency(totalCollectionsCash - totalExpenses, lang)}
              </span>
            </div>
          </div>

          {/* Section 2: Production */}
          <div className="border p-4 rounded-xl">
            <h3 className="font-bold text-sm text-slate-900 border-b pb-2 mb-3">
              ২. দৈনিক প্রডাকশন সারসংক্ষেপ (মোট: {totalProductionReams} রিম)
            </h3>
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 font-bold border-b">
                <tr>
                  <th className="p-2">তারিখ</th>
                  <th className="p-2">পার্টি</th>
                  <th className="p-2">বইয়ের নাম</th>
                  <th className="p-2 text-center">ফর্মা</th>
                  <th className="p-2 text-center">প্লেট</th>
                  <th className="p-2 text-center">ছাপা</th>
                  <th className="p-2 text-center">রিম</th>
                </tr>
              </thead>
              <tbody className="divide-y font-medium">
                {rangeProductions.slice(0, 15).map((p) => {
                  const party = db.parties.find((pty) => pty.id === p.partyId);
                  const book = db.books.find((b) => b.id === p.bookId);
                  return (
                    <tr key={p.id}>
                      <td className="p-2">{formatDate(p.date, lang)}</td>
                      <td className="p-2 font-bold">{party?.name}</td>
                      <td className="p-2">{book?.name}</td>
                      <td className="p-2 text-center">{p.forma}</td>
                      <td className="p-2 text-center">{p.plates}</td>
                      <td className="p-2 text-center">{p.chhapa}</td>
                      <td className="p-2 text-center font-bold text-emerald-800">{p.reams}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Section 3: Paper Stock & Plates Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border p-4 rounded-xl text-xs">
              <h4 className="font-bold border-b pb-1 mb-2">৩. কাগজের স্টক সারসংক্ষেপ</h4>
              <p>সময়কালে আগমন: <b className="text-emerald-800">{rangePaperStocks.filter(s => s.type === 'inward').reduce((sum, s) => sum + s.reams, 0)} রিম</b></p>
              <p>প্রডাকশনে ব্যবহৃত: <b className="text-rose-700">{rangePaperStocks.filter(s => s.type === 'outward').reduce((sum, s) => sum + s.reams, 0)} রিম</b></p>
            </div>
            <div className="border p-4 rounded-xl text-xs">
              <h4 className="font-bold border-b pb-1 mb-2">৪. প্লেটের অবস্থান সারসংক্ষেপ</h4>
              <p>প্রেসে আছে: <b>{allPlates.filter(p => p.location === 'press').reduce((s, p) => s + p.plateCount, 0)} টি</b></p>
              <p>গোডাউনে আছে: <b>{allPlates.filter(p => p.location === 'godown').reduce((s, p) => s + p.plateCount, 0)} টি</b></p>
              <p>পার্টিকে ফেরত: <b>{allPlates.filter(p => p.location === 'returned').reduce((s, p) => s + p.plateCount, 0)} টি</b></p>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE MODE / SCREEN DISPLAY */}
      {(printMode === 'single' || true) && (
        <div className={printMode === 'all' ? 'no-print space-y-6' : 'space-y-6'}>
          {/* General Summary */}
          {reportType === 'general' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400">মোট প্রডাকশন</span>
                  <p className="text-base font-black text-slate-900 mt-1">{totalProductionReams} রিম</p>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400">ইস্যুকৃত মোট বিল</span>
                  <p className="text-base font-black text-indigo-700 mt-1">{formatCurrency(totalBilledRevenue, lang)}</p>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400">নগদ কালেকশন আদায়</span>
                  <p className="text-base font-black text-emerald-700 mt-1">{formatCurrency(totalCollectionsCash, lang)}</p>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400">মোট ব্যয়সমূহ</span>
                  <p className="text-base font-black text-rose-600 mt-1">{formatCurrency(totalExpenses, lang)}</p>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400">কাগজ কাটিং খরচ</span>
                  <p className="text-base font-black text-purple-700 mt-1">{formatCurrency(totalCuttingCost, lang)}</p>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400">পট্টি বিক্রি</span>
                  <p className="text-base font-black text-teal-700 mt-1">{formatCurrency(totalPuttiGross, lang)}</p>
                </div>
              </div>

              {/* Detailed Statement Table */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <h3 className="font-bold text-base text-slate-900 border-b pb-2">
                  নির্বাচিত সময়কালের ({getPeriodLabel()}) আয়, ব্যয় ও নগদ প্রবাহ সারসংক্ষেপ
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-bold text-slate-700">১. প্রিন্টিং বিল রাজস্ব (Invoiced Revenue):</span>
                    <span className="font-bold text-indigo-800">{formatCurrency(totalBilledRevenue, lang)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-bold text-slate-700">২. পট্টি বিক্রি রাজস্ব (Putti Sales):</span>
                    <span className="font-bold text-teal-800">{formatCurrency(totalPuttiGross, lang)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-bold text-slate-700">৩. কাস্টমারদের থেকে নগদ কালেকশন আদায় (Cash Inflow):</span>
                    <span className="font-bold text-emerald-800">{formatCurrency(totalCollectionsCash, lang)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-bold text-slate-700">৪. মোট খরচসমূহ (Expenses Incurred):</span>
                    <span className="font-bold text-rose-700">{formatCurrency(totalExpenses, lang)}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b text-sm font-black bg-slate-50 px-3 rounded-lg">
                    <span className="text-slate-900">নগদ ক্যাশ উদ্বৃত্ত (Cash Flow Net = Collections - Expenses):</span>
                    <span className={totalCollectionsCash - totalExpenses >= 0 ? 'text-emerald-800' : 'text-rose-700'}>
                      {formatCurrency(totalCollectionsCash - totalExpenses, lang)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Report 2: Party Dues */}
          {reportType === 'party' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                  <tr>
                    <th className="p-3">পার্টির নাম</th>
                    <th className="p-3">যোগাযোগ</th>
                    <th className="p-3">ফোন নম্বর</th>
                    <th className="p-3 text-right">প্রারম্ভিক বকেয়া</th>
                    <th className="p-3 text-right font-black">বর্তমান মোট বকেয়া (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {db.parties.map((p) => {
                    const bal = getPartyBalance(p.id);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{p.name}</td>
                        <td className="p-3 text-slate-600">{p.contactPerson}</td>
                        <td className="p-3 text-slate-600">{p.phone}</td>
                        <td className="p-3 text-right">{formatCurrency(p.openingDue, lang)}</td>
                        <td className={`p-3 text-right font-black text-sm ${bal > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                          {formatCurrency(bal, lang)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100 font-bold border-t text-slate-900">
                  <tr>
                    <td colSpan={4} className="p-3 text-right">সর্বমোট কাস্টমার বকেয়া:</td>
                    <td className="p-3 text-right font-black text-sm text-amber-800">
                      {formatCurrency(
                        db.parties.reduce((s, p) => s + getPartyBalance(p.id), 0),
                        lang
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Report 3: Production */}
          {reportType === 'production' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                  <tr>
                    <th className="p-3">তারিখ</th>
                    <th className="p-3">পার্টির নাম</th>
                    <th className="p-3">বইয়ের নাম</th>
                    <th className="p-3 text-center">ফর্মা</th>
                    <th className="p-3 text-center">প্লেট</th>
                    <th className="p-3 text-center">ছাপা</th>
                    <th className="p-3 text-center">কপি</th>
                    <th className="p-3 text-center">রিম</th>
                    <th className="p-3 text-center">বিল অবস্থা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {rangeProductions.map((p) => {
                    const party = db.parties.find((pty) => pty.id === p.partyId);
                    const book = db.books.find((b) => b.id === p.bookId);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="p-3">{formatDate(p.date, lang)}</td>
                        <td className="p-3 font-bold">{party?.name}</td>
                        <td className="p-3">{book?.name}</td>
                        <td className="p-3 text-center">{p.forma}</td>
                        <td className="p-3 text-center">{p.plates}</td>
                        <td className="p-3 text-center">{p.chhapa}</td>
                        <td className="p-3 text-center">{p.copies}</td>
                        <td className="p-3 text-center font-bold text-emerald-800">{p.reams}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.isBilled ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {p.isBilled ? 'বিল হয়েছে' : 'বকেয়া বিল'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100 font-bold border-t">
                  <tr>
                    <td colSpan={7} className="p-3 text-right">মোট রিম:</td>
                    <td className="p-3 text-center font-black text-emerald-800">{totalProductionReams} রিম</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Report 4: Collections */}
          {reportType === 'collection' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                  <tr>
                    <th className="p-3">তারিখ</th>
                    <th className="p-3">রসিদ নম্বর</th>
                    <th className="p-3">পার্টির নাম</th>
                    <th className="p-3">পেমেন্ট মাধ্যম</th>
                    <th className="p-3">মন্তব্য</th>
                    <th className="p-3 text-right">টাকা (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {rangeCollections.map((col) => (
                    <tr key={col.id} className="hover:bg-slate-50">
                      <td className="p-3">{formatDate(col.date, lang)}</td>
                      <td className="p-3 font-mono font-bold">{col.receiptNo}</td>
                      <td className="p-3 font-bold">{col.partyName}</td>
                      <td className="p-3 uppercase text-[10px] font-bold text-slate-500">{col.paymentMethod}</td>
                      <td className="p-3 text-slate-500">{col.notes || '-'}</td>
                      <td className="p-3 text-right font-black text-emerald-700">{formatCurrency(col.amount, lang)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-bold border-t">
                  <tr>
                    <td colSpan={5} className="p-3 text-right">মোট কালেকশন:</td>
                    <td className="p-3 text-right font-black text-emerald-800 text-sm">{formatCurrency(totalCollectionsCash, lang)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Report 5: Income & Expense */}
          {reportType === 'income-expense' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                  <tr>
                    <th className="p-3">তারিখ</th>
                    <th className="p-3">ধরন</th>
                    <th className="p-3">খাত / ক্যাটাগরি</th>
                    <th className="p-3">বিবরণ</th>
                    <th className="p-3 text-right">পরিমাণ (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {rangeTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="p-3">{formatDate(tx.date, lang)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tx.type === 'income' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {tx.type === 'income' ? 'আয়' : 'ব্যয়'}
                        </span>
                      </td>
                      <td className="p-3 font-bold">{tx.category}</td>
                      <td className="p-3 text-slate-600">{tx.description}</td>
                      <td className={`p-3 text-right font-black ${tx.type === 'income' ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {formatCurrency(tx.amount, lang)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-bold border-t">
                  <tr>
                    <td colSpan={4} className="p-3 text-right">নিট লাভ/উদ্বৃত্ত:</td>
                    <td className="p-3 text-right font-black text-sm">
                      {formatCurrency(
                        rangeTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0) -
                          totalExpenses,
                        lang
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Report 6: Paper Stock */}
          {reportType === 'paper-stock' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                  <tr>
                    <th className="p-3">তারিখ</th>
                    <th className="p-3 text-center">ধরন</th>
                    <th className="p-3">সাইজ</th>
                    <th className="p-3">কাগজের বিবরণ</th>
                    <th className="p-3">কোম্পানি</th>
                    <th className="p-3 text-right">পরিমাণ (রিম)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {rangePaperStocks.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="p-3">{formatDate(s.date, lang)}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.type === 'inward' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {s.type === 'inward' ? 'প্রেসে আগমন' : 'প্রডাকশন খরচ'}
                        </span>
                      </td>
                      <td className="p-3 font-bold">{s.size}</td>
                      <td className="p-3">{s.paperType}</td>
                      <td className="p-3 text-slate-600">{s.company}</td>
                      <td className={`p-3 text-right font-black ${s.type === 'inward' ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {s.type === 'inward' ? `+${s.reams}` : `-${s.reams}`} রিম
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Report 7: Plates */}
          {reportType === 'plates' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                  <tr>
                    <th className="p-3">পার্টির নাম</th>
                    <th className="p-3">বই বা কাজের নাম</th>
                    <th className="p-3 text-center">সাইজ</th>
                    <th className="p-3 text-center">প্লেট সংখ্যা</th>
                    <th className="p-3 text-center">অবস্থান</th>
                    <th className="p-3">ফেরত বিবরণ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {allPlates.map((plt) => (
                    <tr key={plt.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold">{plt.partyName}</td>
                      <td className="p-3">{plt.bookName}</td>
                      <td className="p-3 text-center font-bold">{plt.size}</td>
                      <td className="p-3 text-center font-black">{plt.plateCount}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                          {plt.location === 'press' ? 'প্রেস' : plt.location === 'godown' ? 'গোডাউন' : plt.location === 'sold' ? 'বিক্রি' : 'ফেরত'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">
                        {plt.location === 'returned'
                          ? `${plt.returnedThrough || 'সরাসরি'} (${formatDate(plt.returnDate || today, lang)})`
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Signatures on Print */}
      <div className="print-only p-4">
        <PrintSignatures />
      </div>
    </div>
  );
};
