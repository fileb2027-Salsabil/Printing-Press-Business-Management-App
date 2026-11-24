import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { Collection } from '../../types';
import { formatCurrency, formatDate } from '../../utils/calculations';
import { translations } from '../../utils/i18n';
import { PrintHeader, PrintSignatures, PrintAmountInWords, triggerPrint } from '../common/PrintHeader';
import { ConfirmModal } from '../common/ConfirmModal';
import { SmartNumberInput } from '../common/SmartNumberInput';
import {
  CreditCard,
  Plus,
  Search,
  Printer,
  Trash2,
  Calendar,
  Eye,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const DailyCollections: React.FC = () => {
  const { db, addCollection, deleteCollection, getPartyBalance, isReadOnly } = useDatabase();
  const lang = db.settings.language;
  const t = translations[lang];

  const today = new Date().toISOString().split('T')[0];
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<Collection | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<Collection | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [form, setForm] = useState({
    date: today,
    partyId: '',
    amount: 0,
    paymentMethod: 'cash' as const,
    receiptNo: `REC-${Date.now().toString().slice(-6)}`,
    invoiceId: '',
    notes: '',
  });

  const selectedParty = db.parties.find((p) => p.id === form.partyId);
  const partyDue = selectedParty ? getPartyBalance(selectedParty.id) : 0;
  const partyInvoices = selectedParty
    ? db.invoices.filter((inv) => inv.partyId === selectedParty.id)
    : [];

  const handleOpenModal = () => {
    if (isReadOnly) return;
    setErrorMessage('');
    setSuccessMessage('');
    const firstParty = db.parties[0];
    setForm({
      date: today,
      partyId: firstParty?.id || '',
      amount: 0,
      paymentMethod: 'cash',
      receiptNo: `REC-${Date.now().toString().slice(-6)}`,
      invoiceId: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setErrorMessage('');
    if (!selectedParty || form.amount <= 0) {
      setErrorMessage('অনুগ্রহ করে সঠিক পার্টি এবং জমার পরিমাণ দিন');
      return;
    }

    const saved = addCollection({
      receiptNo: form.receiptNo,
      date: form.date,
      partyId: selectedParty.id,
      partyName: selectedParty.name,
      amount: form.amount,
      paymentMethod: form.paymentMethod,
      invoiceId: form.invoiceId || undefined,
      notes: form.notes,
    });

    setSuccessMessage(`কালেকশন (${formatCurrency(form.amount, lang)}) সফলভাবে জমা হয়েছে! নতুন এন্ট্রি করতে পারেন।`);
    setTimeout(() => setSuccessMessage(''), 4500);

    // Reset fields ready for next entry
    setForm((prev) => ({
      ...prev,
      amount: 0,
      receiptNo: `REC-${Date.now().toString().slice(-6)}`,
      invoiceId: '',
      notes: '',
    }));
  };

  const handleDelete = (col: Collection) => {
    if (isReadOnly) return;
    setCollectionToDelete(col);
  };

  const filteredCollections = db.collections.filter((col) => {
    const matchDate = dateFilter ? col.date === dateFilter : true;
    const matchSearch = search
      ? col.partyName.toLowerCase().includes(search.toLowerCase()) ||
        col.receiptNo.toLowerCase().includes(search.toLowerCase())
      : true;
    return matchDate && matchSearch;
  });

  const totalCollected = filteredCollections.reduce((sum, col) => sum + col.amount, 0);

  // If viewing single money receipt voucher
  if (selectedReceipt) {
    const pty = db.parties.find((p) => p.id === selectedReceipt.partyId);
    const currBalance = pty ? getPartyBalance(pty.id) : 0;

    return (
      <div className="space-y-6">
        <div className="no-print flex items-center justify-between">
          <button
            onClick={() => setSelectedReceipt(null)}
            className="flex items-center space-x-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 px-3 py-2 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>কালেকশন তালিকায় ফিরে যান</span>
          </button>

          <button
            onClick={() => triggerPrint()}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>মানি রসিদ প্রিন্ট করুন</span>
          </button>
        </div>

        {/* Printable Money Receipt */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs max-w-2xl mx-auto print-container">
          <PrintHeader
            title="অর্থ প্রাপ্তির মানি রসিদ (MONEY RECEIPT)"
            documentNo={selectedReceipt.receiptNo}
            date={selectedReceipt.date}
          />

          <div className="my-6 space-y-4 text-xs text-slate-800 border p-5 rounded-xl bg-slate-50/50">
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">প্রাপ্তির তারিখ:</span>
              <span className="font-bold">{formatDate(selectedReceipt.date, lang)}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">গ্রাহক / পার্টির নাম:</span>
              <span className="font-bold text-slate-900 text-sm">{selectedReceipt.partyName}</span>
            </div>
            {pty && (
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 font-semibold">ঠিকানা ও ফোন:</span>
                <span>{pty.address} | {pty.phone}</span>
              </div>
            )}
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">পেমেন্ট মাধ্যম:</span>
              <span className="font-bold uppercase">{selectedReceipt.paymentMethod}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">প্রাপ্ত টাকার পরিমাণ:</span>
              <span className="text-base font-black text-emerald-800">
                {formatCurrency(selectedReceipt.amount, lang)}
              </span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">বর্তমান অবশিষ্ট বকেয়া:</span>
              <span className="font-bold text-amber-700">
                {formatCurrency(currBalance, lang)}
              </span>
            </div>
            {selectedReceipt.notes && (
              <div className="flex justify-between pt-1">
                <span className="text-slate-500 font-semibold">মন্তব্য / বিবরণ:</span>
                <span className="font-medium text-slate-700">{selectedReceipt.notes}</span>
              </div>
            )}
          </div>

          <PrintAmountInWords amount={selectedReceipt.amount} lang={lang} />

          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-center text-xs font-semibold mb-6">
            ধন্যবাদ! {db.settings.name || 'আমাদের'} এর সাথে লেনদেন করায় আমরা আনন্দিত।
          </div>

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
          <h2 className="text-xl font-bold text-slate-900">{t.collectionList}</h2>
          <p className="text-xs text-slate-500">
            দৈনিক পার্টি কালেকশন ও জমা রেজিস্টার | মোট আদায়: {formatCurrency(totalCollected, lang)}
          </p>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => triggerPrint()}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>প্রিন্ট তালিকা</span>
          </button>
          {!isReadOnly && (
            <button
              onClick={handleOpenModal}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addCollection}</span>
            </button>
          )}
        </div>
      </div>

      <div className="print-only">
        <PrintHeader
          title="দৈনিক কালেকশন বিবরণী (Daily Collection Sheet)"
          subtitle={`তারিখ: ${dateFilter || 'সর্বমোট'} | মোট আদায়: ${formatCurrency(totalCollected, lang)}`}
        />
      </div>

      {/* Filter Bar */}
      <div className="no-print bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px] flex items-center space-x-2 px-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="রসিদ নম্বর বা পার্টির নাম..."
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

      {/* Collections Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b">
              <tr>
                <th className="p-3">তারিখ</th>
                <th className="p-3">রসিদ নম্বর</th>
                <th className="p-3">পার্টির নাম</th>
                <th className="p-3">পেমেন্ট মাধ্যম</th>
                <th className="p-3">মন্তব্য</th>
                <th className="p-3 text-right">আদায়ের পরিমাণ (৳)</th>
                <th className="p-3 text-right no-print">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredCollections.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    কোনো কালেকশন জমা নেই। নতুন কালেকশন যোগ করুন।
                  </td>
                </tr>
              ) : (
                filteredCollections.map((col) => (
                  <tr key={col.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 whitespace-nowrap">{formatDate(col.date, lang)}</td>
                    <td className="p-3 font-mono font-bold text-slate-900">{col.receiptNo}</td>
                    <td className="p-3 font-bold text-slate-900">{col.partyName}</td>
                    <td className="p-3 uppercase text-[10px] font-bold text-slate-600">{col.paymentMethod}</td>
                    <td className="p-3 text-slate-500">{col.notes || '-'}</td>
                    <td className="p-3 text-right font-black text-emerald-700">
                      {formatCurrency(col.amount, lang)}
                    </td>
                    <td className="p-3 text-right no-print">
                      <div className="flex justify-end space-x-1">
                        <button
                          onClick={() => setSelectedReceipt(col)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                          title="মানি রসিদ দেখুন ও প্রিন্ট করুন"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {!isReadOnly && (
                          <button
                            onClick={() => handleDelete(col)}
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
                <td colSpan={5} className="p-3 text-right">সর্বমোট আদায়:</td>
                <td className="p-3 text-right text-emerald-800 text-sm">
                  {formatCurrency(totalCollected, lang)}
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

      {/* Modal: Add Collection */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border my-auto max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-3">
              নতুন কালেকশন জমা এন্ট্রি
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">পার্টি / কাস্টমার *</label>
                <select
                  required
                  value={form.partyId}
                  onChange={(e) => setForm({ ...form, partyId: e.target.value })}
                  className="w-full border rounded-lg p-2 text-xs font-bold text-slate-900"
                >
                  <option value="">পার্টি নির্বাচন করুন</option>
                  {db.parties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (বকেয়া: ৳{getPartyBalance(p.id)})
                    </option>
                  ))}
                </select>
                {selectedParty && (
                  <p className="text-[11px] text-amber-700 mt-1 font-semibold">
                    বর্তমান মোট বকেয়া: {formatCurrency(partyDue, lang)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">জমার পরিমাণ (টাকা) *</label>
                <SmartNumberInput
                  required
                  min={0}
                  fallbackOnBlur={0}
                  value={form.amount}
                  onValueChange={(val) => setForm({ ...form, amount: val })}
                  className="w-full border rounded-lg p-2.5 text-base font-black text-emerald-800"
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">রসিদ নম্বর</label>
                  <input
                    type="text"
                    value={form.receiptNo}
                    onChange={(e) => setForm({ ...form, receiptNo: e.target.value })}
                    className="w-full border rounded-lg p-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">পেমেন্ট মাধ্যম</label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as any })}
                  className="w-full border rounded-lg p-2 text-xs"
                >
                  <option value="cash">নগদ (Cash)</option>
                  <option value="bank">ব্যাংক (Bank Deposit / Cheque)</option>
                  <option value="bkash">বিকাশ (bKash)</option>
                  <option value="nagad">নগদ (Nagad)</option>
                  <option value="rocket">রকেট (Rocket)</option>
                  <option value="other">অন্যান্য</option>
                </select>
              </div>

              {partyInvoices.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">নির্দিষ্ট ইনভয়েসের বিপরীতে (ঐচ্ছিক)</label>
                  <select
                    value={form.invoiceId}
                    onChange={(e) => setForm({ ...form, invoiceId: e.target.value })}
                    className="w-full border rounded-lg p-2 text-xs"
                  >
                    <option value="">সাধারণ খাতা জমা (Unallocated)</option>
                    {partyInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNo} (বিল: ৳{inv.grandTotal})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">মন্তব্য</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="চেক নম্বর বা ডিপোজিট স্লিপ"
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
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>কালেকশন সংরক্ষণ (নতুন এন্ট্রি চালু থাকবে)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Collection Confirmation Modal */}
      <ConfirmModal
        isOpen={!!collectionToDelete}
        title="কালেকশন রসিদ মুছে ফেলা"
        message={`আপনি কি নিশ্চিত যে "${collectionToDelete?.receiptNo}" রসিদটি মুছে ফেলতে চান? এটি মুছে দিলে সংশ্লিষ্ট পার্টির বকেয়া আবার বৃদ্ধি পাবে।`}
        onConfirm={() => {
          if (collectionToDelete) {
            deleteCollection(collectionToDelete.id);
            setCollectionToDelete(null);
          }
        }}
        onCancel={() => setCollectionToDelete(null)}
      />
    </div>
  );
};
