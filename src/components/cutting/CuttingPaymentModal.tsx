import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { CuttingWorker } from '../../types';
import { formatCurrency } from '../../utils/calculations';
import { Wallet, X, Check, Calendar, CreditCard, FileText } from 'lucide-react';
import { SmartNumberInput } from '../common/SmartNumberInput';

interface CuttingPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: CuttingWorker | null;
}

export const CuttingPaymentModal: React.FC<CuttingPaymentModalProps> = ({
  isOpen,
  onClose,
  worker,
}) => {
  const { db, addCuttingWorkerPayment, getCuttingWorkerLedger, isReadOnly } = useDatabase();
  const lang = db.settings.language;
  const today = new Date().toISOString().split('T')[0];

  const stats = worker ? getCuttingWorkerLedger(worker.id) : null;
  const suggestedAmount = stats && stats.balanceDue > 0 ? stats.balanceDue : 0;

  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState<number | ''>(suggestedAmount || '');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen || !worker || isReadOnly) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setError('');

    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('অনুগ্রহ করে সঠিক টাকার পরিমাণ দিন।');
      return;
    }

    addCuttingWorkerPayment({
      workerId: worker.id,
      workerName: worker.name,
      date,
      amount: numAmount,
      paymentMethod,
      notes: notes.trim() || undefined,
    });

    setSuccessMessage(`পেমেন্ট সফলভাবে সংরক্ষিত হয়েছে (${formatCurrency(numAmount, lang)})!`);
    setAmount('');
    setNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-auto max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">কাটিংম্যানকে টাকা প্রদান</h3>
              <p className="text-xs text-slate-500 font-medium">{worker.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Balance Notice */}
        {stats && (
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
            <span className="text-slate-600">বর্তমান বকেয়া পাওনা:</span>
            <span
              className={`font-black text-sm ${
                stats.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-700'
              }`}
            >
              {formatCurrency(stats.balanceDue, lang)}
            </span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-semibold">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl font-bold flex items-center space-x-2 animate-in fade-in duration-200">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>প্রদানের তারিখ *</span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border rounded-lg p-2 text-xs font-medium"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center space-x-1">
              <Wallet className="w-3.5 h-3.5 text-emerald-600" />
              <span>প্রদত্ত টাকার পরিমাণ (৳) *</span>
            </label>
            <SmartNumberInput
              required
              min={0}
              clearableToEmpty
              placeholder="টাকার পরিমাণ লিখুন"
              value={amount}
              onTextValueChange={(s) =>
                setAmount(s === '' ? '' : Number.isFinite(parseFloat(s)) ? parseFloat(s) : '')
              }
              className="w-full border-2 border-emerald-500/40 rounded-lg p-2.5 text-base font-black text-slate-900 focus:outline-emerald-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center space-x-1">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              <span>পেমেন্ট মাধ্যম *</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full border rounded-lg p-2 text-xs font-semibold text-slate-800"
            >
              <option value="cash">নগদ (Cash)</option>
              <option value="bkash">বিকাশ (bKash)</option>
              <option value="nagad">নগদ (Nagad)</option>
              <option value="rocket">রকেট (Rocket)</option>
              <option value="bank">ব্যাংক ট্রান্সফার (Bank Transfer)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center space-x-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>মন্তব্য / রেফারেন্স (ঐচ্ছিক)</span>
            </label>
            <input
              type="text"
              placeholder="যেমন: সপ্তাহের কাটিং বিল পরিশোধ"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded-lg p-2 text-xs"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setSuccessMessage('');
                onClose();
              }}
              className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              সম্পন্ন / বন্ধ করুন
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold flex items-center space-x-1.5 shadow-xs transition"
            >
              <Check className="w-4 h-4" />
              <span>পরিশোধ সেভ করুন (নতুন এন্ট্রি চালু থাকবে)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
