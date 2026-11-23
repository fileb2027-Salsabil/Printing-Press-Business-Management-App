import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { CuttingWorker, PaperCuttingRecord, IncomeExpenseTransaction } from '../../types';
import { formatCurrency, formatDate } from '../../utils/calculations';
import {
  Scissors,
  Wallet,
  Printer,
  X,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { PrintHeader, PrintSignatures, triggerPrint } from '../common/PrintHeader';
import { ConfirmModal } from '../common/ConfirmModal';
import { PhoneLink } from '../common/PhoneLink';

interface CuttingWorkerLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: CuttingWorker | null;
  onOpenPayment: (worker: CuttingWorker) => void;
  onViewSlip: (record: PaperCuttingRecord) => void;
}

export const CuttingWorkerLedgerModal: React.FC<CuttingWorkerLedgerModalProps> = ({
  isOpen,
  onClose,
  worker,
  onOpenPayment,
  onViewSlip,
}) => {
  const { db, getCuttingWorkerLedger, deleteCuttingWorkerPayment, isReadOnly } = useDatabase();
  const lang = db.settings.language;
  const [subTab, setSubTab] = useState<'works' | 'payments'>('works');
  const [paymentToDelete, setPaymentToDelete] = useState<IncomeExpenseTransaction | null>(null);
  const [isPrintMode, setIsPrintMode] = useState(false);

  if (!isOpen || !worker) return null;

  const ledger = getCuttingWorkerLedger(worker.id);

  if (isPrintMode) {
    return (
      <div className="fixed inset-0 z-50 bg-white p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="no-print flex justify-between items-center pb-4 border-b">
            <button
              onClick={() => setIsPrintMode(false)}
              className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              ← খাতায় ফিরে যান
            </button>
            <button
              onClick={() => triggerPrint()}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট করুন</span>
            </button>
          </div>

          <div className="print-container space-y-6">
            <PrintHeader
              title="কাটিং কারিগরের কাজের খাতা ও লেনদেন বিবরণী"
              subtitle={`কারিগরের নাম: ${worker.name} | মোবাইল: ${worker.phone || 'N/A'} | ডিফল্ট রেট: ৳${worker.defaultRatePerReam}/রিম`}
            />

            {/* Summary Strip */}
            <div className="grid grid-cols-4 gap-3 text-center border p-4 rounded-xl bg-slate-50/70 text-xs">
              <div>
                <span className="text-slate-500 block font-medium">মোট কাটা কাগজ:</span>
                <span className="font-black text-slate-900 text-sm">{ledger.totalReams} রিম</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">মোট কাজের বিল:</span>
                <span className="font-black text-slate-900 text-sm">
                  {formatCurrency(ledger.totalEarned, lang)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">পরিশোধিত টাকা:</span>
                <span className="font-black text-emerald-700 text-sm">
                  {formatCurrency(ledger.totalPaid, lang)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">অবশিষ্ট পাওনা:</span>
                <span
                  className={`font-black text-sm ${
                    ledger.balanceDue > 0 ? 'text-rose-700' : 'text-emerald-700'
                  }`}
                >
                  {formatCurrency(ledger.balanceDue, lang)}
                </span>
              </div>
            </div>

            {/* Works Table */}
            <div>
              <h4 className="font-bold text-xs text-slate-900 mb-2 border-b pb-1">
                ১. কাগজ কাটিং কাজের বিবরণী ({ledger.records.length} টি কাজ)
              </h4>
              <table className="w-full text-xs text-left border">
                <thead className="bg-slate-100 font-bold border-b">
                  <tr>
                    <th className="p-2 border">তারিখ</th>
                    <th className="p-2 border">পার্টি</th>
                    <th className="p-2 border text-center">কাটা রিম</th>
                    <th className="p-2 border text-right">দর (৳)</th>
                    <th className="p-2 border text-right">মোট বিল (৳)</th>
                    <th className="p-2 border text-right">পরিশোধ (৳)</th>
                    <th className="p-2 border">মন্তব্য</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-medium">
                  {ledger.records.map((r) => (
                    <tr key={r.id}>
                      <td className="p-2 border">{formatDate(r.date, lang)}</td>
                      <td className="p-2 border">{r.partyName || '-'}</td>
                      <td className="p-2 border text-center font-bold">{r.reams} রিম</td>
                      <td className="p-2 border text-right">৳{r.ratePerReam}</td>
                      <td className="p-2 border text-right font-bold text-slate-900">
                        {formatCurrency(r.totalCost, lang)}
                      </td>
                      <td className="p-2 border text-right text-emerald-700">
                        {formatCurrency(
                          r.paidAmount !== undefined ? r.paidAmount : r.totalCost,
                          lang
                        )}
                      </td>
                      <td className="p-2 border text-slate-500">{r.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Payments Table */}
            <div>
              <h4 className="font-bold text-xs text-slate-900 mb-2 border-b pb-1">
                ২. টাকা পরিশোধ / লেনদেন ইতিহাস ({ledger.payments.length} টি পেমেন্ট)
              </h4>
              <table className="w-full text-xs text-left border">
                <thead className="bg-slate-100 font-bold border-b">
                  <tr>
                    <th className="p-2 border">তারিখ</th>
                    <th className="p-2 border">মাধ্যম</th>
                    <th className="p-2 border">বিবরণ / নোট</th>
                    <th className="p-2 border text-right">প্রদত্ত টাকা (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-medium">
                  {ledger.payments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-3 text-center text-slate-400">
                        আলাদা কোনো পেমেন্ট রেকর্ড নেই।
                      </td>
                    </tr>
                  ) : (
                    ledger.payments.map((p) => (
                      <tr key={p.id}>
                        <td className="p-2 border">{formatDate(p.date, lang)}</td>
                        <td className="p-2 border uppercase font-mono">{p.paymentMethod}</td>
                        <td className="p-2 border">{p.description}</td>
                        <td className="p-2 border text-right font-bold text-emerald-800">
                          {formatCurrency(p.amount, lang)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <PrintSignatures />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-6 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center space-x-3.5">
            {worker.photoUrl ? (
              <img
                src={worker.photoUrl}
                alt={worker.name}
                className="w-13 h-13 rounded-2xl object-cover border border-slate-200 shadow-xs"
              />
            ) : (
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-indigo-700 to-purple-800 text-white flex items-center justify-center font-black text-xl shadow-xs">
                {worker.name.slice(0, 1)}
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-black text-slate-950">{worker.name}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  কাটিং ম্যান খাতা
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium mt-0.5">
                <PhoneLink phone={worker.phone} />
                {worker.address && <span>• {worker.address}</span>}
                <span>• ডিফল্ট দর: ৳{worker.defaultRatePerReam}/রিম</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!isReadOnly && (
              <button
                onClick={() => onOpenPayment(worker)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>+ টাকা প্রদান</span>
              </button>
            )}
            <button
              onClick={() => setIsPrintMode(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition"
              title="কাটিং ম্যানের খাতা প্রিন্ট করুন"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">খাতা প্রিন্ট</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center space-x-1">
              <Scissors className="w-3.5 h-3.5 text-indigo-600" />
              <span>মোট কাটা কাগজ</span>
            </span>
            <p className="text-lg font-black text-slate-900 mt-1">
              {ledger.totalReams} <span className="text-xs font-medium text-slate-500">রিম</span>
            </p>
            <span className="text-[10px] text-slate-400">মোট {ledger.records.length} টি কাজ</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center space-x-1">
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              <span>মোট কাজের বিল</span>
            </span>
            <p className="text-lg font-black text-slate-900 mt-1">
              {formatCurrency(ledger.totalEarned, lang)}
            </p>
            <span className="text-[10px] text-slate-400">কাটিং পারিশ্রমিক</span>
          </div>

          <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200">
            <span className="text-[11px] font-semibold text-emerald-800 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>কাটিংম্যান নিয়েছে</span>
            </span>
            <p className="text-lg font-black text-emerald-800 mt-1">
              {formatCurrency(ledger.totalPaid, lang)}
            </p>
            <span className="text-[10px] text-emerald-600">মোট পরিশোধিত টাকা</span>
          </div>

          <div
            className={`p-3.5 rounded-2xl border ${
              ledger.balanceDue > 0
                ? 'bg-rose-50 border-rose-200'
                : 'bg-emerald-50 border-emerald-200'
            }`}
          >
            <span
              className={`text-[11px] font-semibold flex items-center space-x-1 ${
                ledger.balanceDue > 0 ? 'text-rose-800' : 'text-emerald-800'
              }`}
            >
              {ledger.balanceDue > 0 ? (
                <Clock className="w-3.5 h-3.5 text-rose-600" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span>কাটিংম্যান পাবে (বকেয়া)</span>
            </span>
            <p
              className={`text-lg font-black mt-1 ${
                ledger.balanceDue > 0 ? 'text-rose-700' : 'text-emerald-700'
              }`}
            >
              {ledger.balanceDue > 0
                ? formatCurrency(ledger.balanceDue, lang)
                : ledger.balanceDue < 0
                ? `${formatCurrency(Math.abs(ledger.balanceDue), lang)} (অগ্রিম)`
                : '৳০ (পরিশোধিত)'}
            </p>
            <span
              className={`text-[10px] font-medium ${
                ledger.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {ledger.balanceDue > 0 ? 'পরিশোধ বাকি আছে' : 'কোনো বকেয়া নেই'}
            </span>
          </div>
        </div>

        {/* Subtabs */}
        <div className="flex space-x-2 border-b border-slate-200 shrink-0">
          <button
            onClick={() => setSubTab('works')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition ${
              subTab === 'works'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            কাটিং কাজের তালিকা ({ledger.records.length})
          </button>
          <button
            onClick={() => setSubTab('payments')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition ${
              subTab === 'payments'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            টাকা লেনদেনের খাতা ({ledger.payments.length})
          </button>
        </div>

        {/* Tab 1: Works List */}
        <div className="flex-1 overflow-y-auto">
          {subTab === 'works' && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b">
                  <tr>
                    <th className="p-3">তারিখ</th>
                    <th className="p-3">পার্টি</th>
                    <th className="p-3 text-center">কাটা রিম</th>
                    <th className="p-3 text-right">দর (৳)</th>
                    <th className="p-3 text-right font-black">মোট বিল</th>
                    <th className="p-3 text-right">পরিশোধিত</th>
                    <th className="p-3 text-center">অবস্থা</th>
                    <th className="p-3 text-right">স্লিপ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {ledger.records.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        এই কাটিংম্যানের কোনো কাজের রেকর্ড নেই।
                      </td>
                    </tr>
                  ) : (
                    ledger.records.map((r) => {
                      const paid = r.paidAmount !== undefined ? r.paidAmount : r.totalCost;
                      const isDue = r.paymentStatus === 'due' || paid < r.totalCost;
                      return (
                        <tr key={r.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 whitespace-nowrap">{formatDate(r.date, lang)}</td>
                          <td className="p-3 font-semibold text-slate-800">
                            {r.partyName || '-'}
                          </td>
                          <td className="p-3 text-center font-bold text-slate-900">
                            {r.reams} রিম
                          </td>
                          <td className="p-3 text-right font-mono">৳{r.ratePerReam}</td>
                          <td className="p-3 text-right font-black text-slate-900">
                            {formatCurrency(r.totalCost, lang)}
                          </td>
                          <td className="p-3 text-right font-bold text-emerald-700">
                            {formatCurrency(paid, lang)}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isDue
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {r.paymentStatus === 'due'
                                ? 'বকেয়া'
                                : r.paymentStatus === 'partial'
                                ? 'আংশিক'
                                : 'পরিশোধিত'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => onViewSlip(r)}
                              className="p-1 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded"
                              title="কাটিং স্লিপ দেখুন ও প্রিন্ট করুন"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 2: Payments List */}
          {subTab === 'payments' && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b">
                  <tr>
                    <th className="p-3">তারিখ</th>
                    <th className="p-3">ভাউচার / আইডি</th>
                    <th className="p-3">মাধ্যম</th>
                    <th className="p-3">বিবরণ / মন্তব্য</th>
                    <th className="p-3 text-right font-black">প্রদত্ত টাকা</th>
                    {!isReadOnly && <th className="p-3 text-right">অ্যাকশন</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {ledger.payments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        আলাদা কোনো টাকা প্রদানের রেকর্ড নেই।
                      </td>
                    </tr>
                  ) : (
                    ledger.payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 whitespace-nowrap">{formatDate(p.date, lang)}</td>
                        <td className="p-3 font-mono text-slate-500">
                          {p.referenceNo || p.id.slice(-6)}
                        </td>
                        <td className="p-3 uppercase font-mono text-[11px] font-bold text-slate-700">
                          {p.paymentMethod}
                        </td>
                        <td className="p-3 text-slate-700">{p.description}</td>
                        <td className="p-3 text-right font-black text-emerald-700 text-sm">
                          {formatCurrency(p.amount, lang)}
                        </td>
                        {!isReadOnly && (
                          <td className="p-3 text-right">
                            <button
                              onClick={() => setPaymentToDelete(p)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                              title="পেমেন্ট এন্ট্রি মুছুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-100 shrink-0">
          <div className="text-xs text-slate-500">
            নতুন কাটিং যোগ করলে স্বয়ংক্রিয়ভাবে এই খাতায় কাটা রিম ও বিল হিসাব যুক্ত হয়।
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>

      {/* Delete Payment Confirm */}
      <ConfirmModal
        isOpen={!!paymentToDelete}
        title="পেমেন্ট রেকর্ড মুছে ফেলা"
        message={`আপনি কি নিশ্চিত যে এই ৳${paymentToDelete?.amount} পেমেন্ট রেকর্ডটি মুছে ফেলতে চান? এটি হিসাব থেকে বাদ দেওয়া হবে।`}
        onConfirm={() => {
          if (isReadOnly) {
            setPaymentToDelete(null);
            return;
          }
          if (paymentToDelete) {
            deleteCuttingWorkerPayment(paymentToDelete.id);
            setPaymentToDelete(null);
          }
        }}
        onCancel={() => setPaymentToDelete(null)}
      />
    </div>
  );
};
