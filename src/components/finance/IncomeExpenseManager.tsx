import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { IncomeExpenseTransaction } from '../../types';
import { formatCurrency, formatDate } from '../../utils/calculations';
import { translations } from '../../utils/i18n';
import { PrintHeader, PrintSignatures, PrintAmountInWords, triggerPrint } from '../common/PrintHeader';
import { ConfirmModal } from '../common/ConfirmModal';
import { SmartNumberInput } from '../common/SmartNumberInput';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  Printer,
  Trash2,
  Calendar,
  Filter,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const IncomeExpenseManager: React.FC = () => {
  const { db, addTransaction, deleteTransaction, isReadOnly } = useDatabase();
  const lang = db.settings.language;
  const t = translations[lang];

  const today = new Date().toISOString().split('T')[0];
  const [activeType, setActiveType] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'income' | 'expense'>('expense');
  const [selectedTxSlip, setSelectedTxSlip] = useState<IncomeExpenseTransaction | null>(null);
  const [txToDelete, setTxToDelete] = useState<IncomeExpenseTransaction | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [form, setForm] = useState({
    date: today,
    type: 'expense' as 'income' | 'expense',
    category: 'কাগজ ও কাঁচামাল',
    amount: 0,
    paymentMethod: 'cash',
    partyId: '',
    employeeId: '',
    referenceNo: '',
    description: '',
  });

  const incomeCategories = [
    'প্রিন্টিং বিল থেকে আয়',
    'পট্টি বিক্রি',
    'ডিজাইন চার্জ',
    'অন্যান্য আয়',
  ];

  const expenseCategories = [
    'কাগজ কাটিং খরচ',
    'কর্মচারী বেতন',
    'ওভারটাইম',
    'কাগজ ও কাঁচামাল',
    'বিদ্যুৎ ও ইউটিলিটি',
    'দোকান / প্রেসের ভাড়া',
    'কালি ও কেমিক্যাল',
    'প্লেট ও সিটিপি খরচ',
    'পরিবহন খরচ',
    'মেরামত ও রক্ষণাবেক্ষণ',
    'নাস্তা ও আপ্যায়ন',
    'অন্যান্য ব্যয়',
  ];

  const handleOpenModal = (type: 'income' | 'expense') => {
    if (isReadOnly) return;
    setErrorMessage('');
    setSuccessMessage('');
    setModalType(type);
    setForm({
      date: today,
      type,
      category: type === 'income' ? incomeCategories[0] : expenseCategories[0],
      amount: 0,
      paymentMethod: 'cash',
      partyId: '',
      employeeId: '',
      referenceNo: `REF-${Date.now().toString().slice(-6)}`,
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setErrorMessage('');
    if (form.amount <= 0 || !form.category) {
      setErrorMessage('অনুগ্রহ করে সঠিক পরিমাণ ও খাত দিন');
      return;
    }

    addTransaction({
      ...form,
      sourceType: 'manual',
    });

    setSuccessMessage(`${modalType === 'income' ? 'আয়' : 'ব্যয়'} লেনদেন (${formatCurrency(form.amount, lang)}) সফলভাবে সেভ হয়েছে! নতুন এন্ট্রি করতে পারেন।`);
    setTimeout(() => setSuccessMessage(''), 4500);

    setForm((prev) => ({
      ...prev,
      amount: 0,
      referenceNo: `REF-${Date.now().toString().slice(-6)}`,
      description: '',
    }));
  };

  const handleDelete = (tx: IncomeExpenseTransaction) => {
    if (isReadOnly) return;
    setTxToDelete(tx);
  };

  // Filtered transactions
  const filteredTransactions = db.transactions.filter((tx) => {
    const matchType = activeType === 'all' ? true : tx.type === activeType;
    const matchCategory = categoryFilter ? tx.category === categoryFilter : true;
    const matchDate = dateFilter ? tx.date === dateFilter : true;
    const matchSearch = search
      ? tx.category.toLowerCase().includes(search.toLowerCase()) ||
        tx.description.toLowerCase().includes(search.toLowerCase())
      : true;
    return matchType && matchCategory && matchDate && matchSearch;
  });

  const totalIncome = filteredTransactions
    .filter((tx) => tx.type === 'income')
    .reduce((s, tx) => s + tx.amount, 0);

  const totalExpense = filteredTransactions
    .filter((tx) => tx.type === 'expense')
    .reduce((s, tx) => s + tx.amount, 0);

  const netBalance = totalIncome - totalExpense;

  if (selectedTxSlip) {
    const isExpense = selectedTxSlip.type === 'expense';
    return (
      <div className="space-y-6">
        <div className="no-print flex items-center justify-between">
          <button
            onClick={() => setSelectedTxSlip(null)}
            className="flex items-center space-x-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 px-3 py-2 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>আয়-ব্যয় তালিকায় ফিরে যান</span>
          </button>

          <button
            onClick={() => triggerPrint()}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>{isExpense ? 'পেমেন্ট রসিদ প্রিন্ট করুন' : 'আদায় রসিদ প্রিন্ট করুন'}</span>
          </button>
        </div>

        {/* Printable Payment Voucher Container */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs max-w-2xl mx-auto print-container">
          <PrintHeader
            title={isExpense ? 'পেমেন্ট রসিদ / ডেবিট ভাউচার (PAYMENT VOUCHER)' : 'জমা রসিদ / ক্রেডিট ভাউচার (RECEIPT VOUCHER)'}
            documentNo={selectedTxSlip.referenceNo || `TX-${selectedTxSlip.id.slice(-6)}`}
            date={selectedTxSlip.date}
          />

          <div className="my-6 space-y-4 text-xs text-slate-800 border p-5 rounded-xl bg-slate-50/50">
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">লেনদেনের ধরন:</span>
              <span className={`font-bold text-sm ${isExpense ? 'text-rose-700' : 'text-emerald-700'}`}>
                {isExpense ? 'ব্যয় / খরচ প্রদান (Payment)' : 'আয় / অর্থ গ্রহণ (Receipt)'}
              </span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">হিসাবের খাত / ক্যাটাগরি:</span>
              <span className="font-bold text-slate-900 text-sm">{selectedTxSlip.category}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">তারিখ:</span>
              <span className="font-bold">{formatDate(selectedTxSlip.date, lang)}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">পেমেন্ট মাধ্যম:</span>
              <span className="font-bold uppercase">{selectedTxSlip.paymentMethod}</span>
            </div>
            {selectedTxSlip.referenceNo && (
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 font-semibold">রেফারেন্স / চেক নম্বর:</span>
                <span className="font-mono font-bold">{selectedTxSlip.referenceNo}</span>
              </div>
            )}
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">টাকার পরিমাণ:</span>
              <span className={`text-base font-black ${isExpense ? 'text-rose-700' : 'text-emerald-700'}`}>
                {formatCurrency(selectedTxSlip.amount, lang)}
              </span>
            </div>
            {selectedTxSlip.description && (
              <div className="flex justify-between pt-1">
                <span className="text-slate-500 font-semibold">বিবরণ / উদ্দেশ্য:</span>
                <span className="font-medium text-slate-700">{selectedTxSlip.description}</span>
              </div>
            )}
          </div>

          <PrintAmountInWords amount={selectedTxSlip.amount} lang={lang} />

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
          <h2 className="text-xl font-bold text-slate-900">{t.incomeExpenseLedger}</h2>
          <p className="text-xs text-slate-500">
            প্রতিদিনের সকল আয়-ব্যয়ের খাতা ও ক্যাটাগরিভিত্তিক হিসাব
          </p>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => triggerPrint()}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>প্রিন্ট রিপোর্ট</span>
          </button>
          {!isReadOnly && (
            <>
              <button
                onClick={() => handleOpenModal('income')}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition"
              >
                <TrendingUp className="w-4 h-4" />
                <span>+ নতুন আয়</span>
              </button>
              <button
                onClick={() => handleOpenModal('expense')}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition"
              >
                <TrendingDown className="w-4 h-4" />
                <span>+ নতুন ব্যয়</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Printable Header */}
      <div className="print-only">
        <PrintHeader
          title="আয় ও ব্যয়ের বিবরণী (Income & Expense Statement)"
          subtitle={`মোট আয়: ${formatCurrency(totalIncome, lang)} | মোট ব্যয়: ${formatCurrency(totalExpense, lang)} | নিট: ${formatCurrency(netBalance, lang)}`}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex justify-between items-center">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase">মোট আয়</span>
            <div className="text-xl font-black text-emerald-700 mt-1">
              {formatCurrency(totalIncome, lang)}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex justify-between items-center">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase">মোট ব্যয়</span>
            <div className="text-xl font-black text-rose-600 mt-1">
              {formatCurrency(totalExpense, lang)}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex justify-between items-center">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase">নিট লাভ / উদ্বৃত্ত</span>
            <div className={`text-xl font-black mt-1 ${netBalance >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
              {formatCurrency(netBalance, lang)}
            </div>
          </div>
          <div className={`p-2.5 rounded-lg ${netBalance >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Tab Bar */}
      <div className="no-print bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center">
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveType('all')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
              activeType === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            সব লেনদেন
          </button>
          <button
            onClick={() => setActiveType('income')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
              activeType === 'income' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            শুধু আয়
          </button>
          <button
            onClick={() => setActiveType('expense')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
              activeType === 'expense' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            শুধু ব্যয়
          </button>
        </div>

        <div className="flex-1 min-w-[180px] flex items-center space-x-2 px-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="খাত বা বিবরণ খুঁজুন..."
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
            <button onClick={() => setDateFilter('')} className="text-[10px] text-slate-500">
              সব তারিখ
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b">
              <tr>
                <th className="p-3">তারিখ</th>
                <th className="p-3">ধরন</th>
                <th className="p-3">খাত / ক্যাটাগরি</th>
                <th className="p-3">বিবরণ / নোট</th>
                <th className="p-3">পেমেন্ট মাধ্যম</th>
                <th className="p-3 text-right">পরিমাণ (৳)</th>
                <th className="p-3 text-right no-print">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    কোনো লেনদেন রেকর্ড পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 whitespace-nowrap">{formatDate(tx.date, lang)}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tx.type === 'income'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {tx.type === 'income' ? 'আয়' : 'ব্যয়'}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-800">{tx.category}</td>
                    <td className="p-3 text-slate-600">{tx.description}</td>
                    <td className="p-3 uppercase text-[10px] font-bold text-slate-500">{tx.paymentMethod}</td>
                    <td
                      className={`p-3 text-right font-black text-sm ${
                        tx.type === 'income' ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount, lang)}
                    </td>
                    <td className="p-3 text-right no-print">
                      <div className="flex justify-end space-x-1">
                        <button
                          onClick={() => setSelectedTxSlip(tx)}
                          className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded"
                          title="ভাউচার বা রসিদ দেখুন ও প্রিন্ট করুন"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        {!isReadOnly && (
                          <button
                            onClick={() => handleDelete(tx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                            title="মুছুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-100 font-bold border-t text-slate-900">
              <tr>
                <td colSpan={5} className="p-3 text-right">নিট ব্যালেন্স:</td>
                <td className="p-3 text-right font-black text-sm">
                  {formatCurrency(netBalance, lang)}
                </td>
                <td className="p-3 no-print"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="print-only p-4">
          <PrintSignatures />
        </div>
      </div>

      {/* Modal: Add Income or Expense */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border my-auto max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-3">
              {modalType === 'income' ? 'নতুন আয় এন্ট্রি' : 'নতুন ব্যয় এন্ট্রি'}
            </h3>
            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl flex items-center justify-between mb-3 shadow-2xs animate-fade-in">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMessage}</span>
                </div>
                <span className="text-[10px] bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded-full font-semibold">
                  পরবর্তী এন্ট্রি প্রস্তুত
                </span>
              </div>
            )}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center space-x-2 mb-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">টাকার পরিমাণ (৳) *</label>
                <SmartNumberInput
                  required
                  min={0}
                  fallbackOnBlur={0}
                  value={form.amount}
                  onValueChange={(val) => setForm({ ...form, amount: val })}
                  className={`w-full border rounded-lg p-2.5 text-base font-bold ${
                    modalType === 'income' ? 'text-emerald-800' : 'text-rose-700'
                  }`}
                  placeholder="৳ 0.00"
                />
              </div>

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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">খাত / ক্যাটাগরি *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full border rounded-lg p-2 text-xs font-semibold text-slate-800"
                  >
                    {(modalType === 'income' ? incomeCategories : expenseCategories).map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">পেমেন্ট মাধ্যম</label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                  className="w-full border rounded-lg p-2 text-xs"
                >
                  <option value="cash">নগদ (Cash)</option>
                  <option value="bank">ব্যাংক (Bank)</option>
                  <option value="bkash">বিকাশ (bKash)</option>
                  <option value="nagad">নগদ (Nagad)</option>
                  <option value="rocket">রকেট (Rocket)</option>
                  <option value="other">অন্যান্য</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">বিবরণ / রসিদ রেফারেন্স</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="খরচের বিবরণ বা ভাউচার নম্বর"
                  className="w-full border rounded-lg p-2 text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setSuccessMessage('');
                  }}
                  className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  সম্পন্ন / বন্ধ করুন
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs transition ${
                    modalType === 'income'
                      ? 'bg-emerald-700 hover:bg-emerald-800'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>সংরক্ষণ (নতুন এন্ট্রি চালু থাকবে)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Transaction Confirmation Modal */}
      <ConfirmModal
        isOpen={!!txToDelete}
        title="লেনদেন মুছে ফেলা"
        message={`আপনি কি নিশ্চিত যে এই ${txToDelete?.type === 'income' ? 'আয়' : 'ব্যয়'} লেনদেনটি (${formatCurrency(txToDelete?.amount || 0, lang)}) মুছে ফেলতে চান?`}
        onConfirm={() => {
          if (txToDelete) {
            deleteTransaction(txToDelete.id);
            setTxToDelete(null);
          }
        }}
        onCancel={() => setTxToDelete(null)}
      />
    </div>
  );
};
