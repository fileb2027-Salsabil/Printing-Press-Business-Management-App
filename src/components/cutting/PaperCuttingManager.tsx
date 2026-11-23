import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { CuttingWorker, PaperCuttingRecord } from '../../types';
import {
  calculateCuttingCost,
  formatCurrency,
  formatDate,
} from '../../utils/calculations';
import { validateAndProcessImage } from '../../utils/imageUpload';
import { translations } from '../../utils/i18n';
import { PrintHeader, PrintSignatures, PrintAmountInWords, triggerPrint } from '../common/PrintHeader';
import { ConfirmModal } from '../common/ConfirmModal';
import { CuttingWorkerLedgerModal } from './CuttingWorkerLedgerModal';
import { CuttingPaymentModal } from './CuttingPaymentModal';
import {
  Scissors,
  Plus,
  Search,
  Printer,
  Trash2,
  Edit2,
  Calendar,
  Upload,
  User,
  ArrowLeft,
  BookOpen,
  Wallet,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { PhoneLink } from '../common/PhoneLink';

export const PaperCuttingManager: React.FC = () => {
  const {
    db,
    addCuttingWorker,
    updateCuttingWorker,
    deleteCuttingWorker,
    addCuttingRecord,
    deleteCuttingRecord,
    getCuttingWorkerLedger,
    isReadOnly,
  } = useDatabase();
  const lang = db.settings.language;
  const t = translations[lang];

  const today = new Date().toISOString().split('T')[0];
  const [activeTab, setActiveTab] = useState<'records' | 'workers'>('records');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Modals
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [recordSuccessMessage, setRecordSuccessMessage] = useState('');
  const [workerSuccessMessage, setWorkerSuccessMessage] = useState('');
  const [editingWorker, setEditingWorker] = useState<CuttingWorker | null>(null);
  const [selectedCuttingSlip, setSelectedCuttingSlip] = useState<PaperCuttingRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<PaperCuttingRecord | null>(null);
  const [workerToDelete, setWorkerToDelete] = useState<CuttingWorker | null>(null);
  const [workerUploadError, setWorkerUploadError] = useState('');

  // Worker Ledger and Payment modals
  const [selectedWorkerForLedger, setSelectedWorkerForLedger] = useState<CuttingWorker | null>(null);
  const [selectedWorkerForPayment, setSelectedWorkerForPayment] = useState<CuttingWorker | null>(null);

  // Forms
  const [recordForm, setRecordForm] = useState({
    date: today,
    partyId: '',
    reams: 50,
    ratePerReam: 25,
    cuttingWorkerId: '',
    paymentStatus: 'paid' as 'paid' | 'due' | 'partial',
    paidAmount: 1250,
    paymentMethod: 'cash',
    notes: '',
  });

  const [workerForm, setWorkerForm] = useState({
    name: '',
    phone: '',
    address: '',
    photoUrl: '',
    defaultRatePerReam: 25,
    notes: '',
    isActive: true,
  });

  const handleOpenRecordModal = () => {
    if (isReadOnly) return;
    const firstWorker = db.cuttingWorkers[0];
    const initialRate = firstWorker?.defaultRatePerReam || 25;
    const initialCost = 50 * initialRate;
    setRecordSuccessMessage('');
    setRecordForm({
      date: today,
      partyId: db.parties[0]?.id || '',
      reams: 50,
      ratePerReam: initialRate,
      cuttingWorkerId: firstWorker?.id || '',
      paymentStatus: 'paid',
      paidAmount: initialCost,
      paymentMethod: 'cash',
      notes: '',
    });
    setIsRecordModalOpen(true);
  };

  const handleOpenWorkerModal = (worker?: CuttingWorker) => {
    if (isReadOnly) return;
    setWorkerUploadError('');
    setWorkerSuccessMessage('');
    if (worker) {
      setEditingWorker(worker);
      setWorkerForm({
        name: worker.name,
        phone: worker.phone || '',
        address: worker.address || '',
        photoUrl: worker.photoUrl || '',
        defaultRatePerReam: worker.defaultRatePerReam || 25,
        notes: worker.notes || '',
        isActive: worker.isActive !== false,
      });
    } else {
      setEditingWorker(null);
      setWorkerForm({
        name: '',
        phone: '',
        address: '',
        photoUrl: '',
        defaultRatePerReam: 25,
        notes: '',
        isActive: true,
      });
    }
    setIsWorkerModalOpen(true);
  };

  const handleWorkerSelect = (workerId: string) => {
    const worker = db.cuttingWorkers.find((w) => w.id === workerId);
    const rate = worker?.defaultRatePerReam || recordForm.ratePerReam;
    const cost = recordForm.reams * rate;
    setRecordForm((prev) => ({
      ...prev,
      cuttingWorkerId: workerId,
      ratePerReam: rate,
      paidAmount: prev.paymentStatus === 'paid' ? cost : prev.paymentStatus === 'due' ? 0 : prev.paidAmount,
    }));
  };

  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    const worker = db.cuttingWorkers.find((w) => w.id === recordForm.cuttingWorkerId);
    const party = db.parties.find((p) => p.id === recordForm.partyId);

    const totalCost = calculateCuttingCost(recordForm.reams, recordForm.ratePerReam);
    const paidAmount =
      recordForm.paymentStatus === 'paid'
        ? totalCost
        : recordForm.paymentStatus === 'due'
        ? 0
        : Number(recordForm.paidAmount) || 0;

    addCuttingRecord({
      date: recordForm.date,
      partyId: party?.id,
      partyName: party?.name,
      reams: recordForm.reams,
      ratePerReam: recordForm.ratePerReam,
      totalCost,
      cuttingWorkerId: recordForm.cuttingWorkerId,
      cuttingWorkerName: worker?.name || 'সাধারণ কাটিং ম্যান',
      paidAmount,
      paymentStatus: recordForm.paymentStatus,
      paymentMethod: recordForm.paymentMethod,
      notes: recordForm.notes,
    });

    setRecordSuccessMessage(`কাটিং এন্ট্রি সফলভাবে সংরক্ষিত হয়েছে (${recordForm.reams} রিম)! নতুন এন্ট্রি করতে পারেন।`);
    setRecordForm((prev) => ({
      ...prev,
      reams: 50,
      notes: '',
      paidAmount: prev.paymentStatus === 'paid' ? 50 * prev.ratePerReam : prev.paidAmount,
    }));
  };

  const handleSaveWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!workerForm.name.trim()) return;
    if (editingWorker) {
      updateCuttingWorker(editingWorker.id, workerForm);
      setIsWorkerModalOpen(false);
    } else {
      addCuttingWorker(workerForm);
      setWorkerSuccessMessage(`কাটিং ম্যান "${workerForm.name}" সফলভাবে যুক্ত হয়েছে! নতুন কাটিং ম্যান যোগ করতে পারেন।`);
      setWorkerForm({
        name: '',
        phone: '',
        address: '',
        photoUrl: '',
        defaultRatePerReam: 25,
        notes: '',
        isActive: true,
      });
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setWorkerUploadError('');
      const res = await validateAndProcessImage(file);
      setWorkerForm((prev) => ({ ...prev, photoUrl: res.dataUrl }));
    } catch (err: any) {
      setWorkerUploadError(err.message || 'ছবি আপলোড ব্যর্থ হয়েছে');
    }
  };

  const filteredRecords = db.cuttingRecords.filter((rec) => {
    const matchDate = dateFilter ? rec.date === dateFilter : true;
    const matchSearch = search
      ? rec.cuttingWorkerName.toLowerCase().includes(search.toLowerCase()) ||
        (rec.partyName && rec.partyName.toLowerCase().includes(search.toLowerCase()))
      : true;
    return matchDate && matchSearch;
  });

  const totalCuttingReams = filteredRecords.reduce((s, r) => s + r.reams, 0);
  const totalCuttingCost = filteredRecords.reduce((s, r) => s + r.totalCost, 0);

  if (selectedCuttingSlip) {
    return (
      <div className="space-y-6">
        <div className="no-print flex items-center justify-between">
          <button
            onClick={() => setSelectedCuttingSlip(null)}
            className="flex items-center space-x-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 px-3 py-2 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>কাটিং তালিকায় ফিরে যান</span>
          </button>

          <button
            onClick={() => triggerPrint()}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>কাটিং স্লিপ প্রিন্ট করুন</span>
          </button>
        </div>

        {/* Printable Cutting Slip */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs max-w-2xl mx-auto print-container">
          <PrintHeader
            title="কাগজ কাটিং স্লিপ (PAPER CUTTING SLIP / VOUCHER)"
            documentNo={`CUT-${selectedCuttingSlip.id.slice(-6)}`}
            date={selectedCuttingSlip.date}
          />

          <div className="my-6 space-y-4 text-xs text-slate-800 border p-5 rounded-xl bg-slate-50/50">
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">কাটিং ম্যান / কর্মীর নাম:</span>
              <span className="font-bold text-slate-900 text-sm">{selectedCuttingSlip.cuttingWorkerName}</span>
            </div>
            {selectedCuttingSlip.partyName && (
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 font-semibold">সংশ্লিষ্ট কাস্টমার / পার্টি:</span>
                <span className="font-semibold">{selectedCuttingSlip.partyName}</span>
              </div>
            )}
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">কাটিংয়ের তারিখ:</span>
              <span className="font-bold">{formatDate(selectedCuttingSlip.date, lang)}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">কাটা কাগজের পরিমাণ (রিম):</span>
              <span className="font-bold text-sm text-slate-900">{selectedCuttingSlip.reams} রিম</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">প্রতি রিমের কাটিং দর:</span>
              <span className="font-bold">৳ {selectedCuttingSlip.ratePerReam} / রিম</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">মোট কাটিং পারিশ্রমিক / ব্যয়:</span>
              <span className="text-base font-black text-rose-700">
                {formatCurrency(selectedCuttingSlip.totalCost, lang)}
              </span>
            </div>
            {selectedCuttingSlip.notes && (
              <div className="flex justify-between pt-1">
                <span className="text-slate-500 font-semibold">মন্তব্য ও কাজের মাপ:</span>
                <span className="font-medium text-slate-700">{selectedCuttingSlip.notes}</span>
              </div>
            )}
          </div>

          <PrintAmountInWords amount={selectedCuttingSlip.totalCost} lang={lang} />

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
          <h2 className="text-xl font-bold text-slate-900">{t.paperCutting}</h2>
          <p className="text-xs text-slate-500">
            প্রেসের দৈনিক কাগজ কাটিং খরচ ও কাটিং ম্যানদের হিসাব রেজিস্টার
          </p>
        </div>

        <div className="flex space-x-2">
          {!isReadOnly && (
            <>
              <button
                onClick={() => handleOpenWorkerModal()}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition"
              >
                <User className="w-4 h-4" />
                <span>+ কাটিং ম্যান যোগ</span>
              </button>
              <button
                onClick={handleOpenRecordModal}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন কাটিং এন্ট্রি</span>
              </button>
            </>
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
          title="কাগজ কাটিং খরচের হিসাব (Paper Cutting Expense Report)"
          subtitle={`মোট রিম কাটা হয়েছে: ${totalCuttingReams} রিম | মোট কাটিং খরচ: ${formatCurrency(totalCuttingCost, lang)}`}
        />
      </div>

      {/* Tabs */}
      <div className="no-print border-b border-slate-200 flex space-x-2">
        <button
          onClick={() => setActiveTab('records')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
            activeTab === 'records' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          কাটিং রেকর্ডসমূহ ({db.cuttingRecords.length})
        </button>
        <button
          onClick={() => setActiveTab('workers')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
            activeTab === 'workers' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          কাটিং ম্যান তালিকা ({db.cuttingWorkers.length})
        </button>
      </div>

      {activeTab === 'records' && (
        <>
          {/* Filter Bar */}
          <div className="no-print bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[200px] flex items-center space-x-2 px-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="কাটিং ম্যান বা পার্টির নাম..."
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

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                  <tr>
                    <th className="p-3">তারিখ</th>
                    <th className="p-3">কাটিং ম্যান</th>
                    <th className="p-3">পার্টির নাম</th>
                    <th className="p-3 text-center">কাটা রিম</th>
                    <th className="p-3 text-right">প্রতি রিমের দর (৳)</th>
                    <th className="p-3 text-right font-black">মোট বিল (৳)</th>
                    <th className="p-3 text-center">পেমেন্ট অবস্থা</th>
                    <th className="p-3">মন্তব্য</th>
                    <th className="p-3 text-right no-print">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        কোনো কাগজ কাটিং রেকর্ড নেই।
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r) => {
                      const paid = r.paidAmount !== undefined ? r.paidAmount : r.totalCost;
                      const isDue = r.paymentStatus === 'due' || paid < r.totalCost;
                      return (
                        <tr key={r.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 whitespace-nowrap">{formatDate(r.date, lang)}</td>
                          <td className="p-3 font-bold text-slate-900">{r.cuttingWorkerName}</td>
                          <td className="p-3 text-slate-600">{r.partyName || '-'}</td>
                          <td className="p-3 text-center font-bold text-slate-800">{r.reams} রিম</td>
                          <td className="p-3 text-right font-mono">৳{r.ratePerReam}</td>
                          <td className="p-3 text-right font-black text-slate-900 text-sm">
                            {formatCurrency(r.totalCost, lang)}
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
                                ? `আংশিক (৳${paid})`
                                : 'পরিশোধিত'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500">{r.notes || '-'}</td>
                          <td className="p-3 text-right no-print">
                            <div className="flex justify-end space-x-1">
                              <button
                                onClick={() => setSelectedCuttingSlip(r)}
                                className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded"
                                title="কাটিং স্লিপ দেখুন ও প্রিন্ট করুন"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              {!isReadOnly && (
                                <button
                                  onClick={() => setRecordToDelete(r)}
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
                    <td className="p-3 text-center text-slate-800">{totalCuttingReams} রিম</td>
                    <td></td>
                    <td className="p-3 text-right text-rose-700 text-sm">{formatCurrency(totalCuttingCost, lang)}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="print-only p-4">
              <PrintSignatures />
            </div>
          </div>
        </>
      )}

      {/* Workers Tab */}
      {activeTab === 'workers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {db.cuttingWorkers.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400">
              কোনো কাটিং ম্যান যুক্ত করা হয়নি। উপরে <b>"+ কাটিং ম্যান যোগ"</b> বাটনে চাপুন।
            </div>
          ) : (
            db.cuttingWorkers.map((w) => {
              const stats = getCuttingWorkerLedger(w.id);
              const isDue = stats.balanceDue > 0;
              return (
                <div
                  key={w.id}
                  className="bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition p-5 space-y-4 flex flex-col justify-between"
                >
                  {/* Top: Info & Actions */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {w.photoUrl ? (
                        <img
                          src={w.photoUrl}
                          alt={w.name}
                          className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-xs"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-700 to-purple-800 text-white flex items-center justify-center font-black text-lg shadow-xs">
                          {w.name.slice(0, 1)}
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">{w.name}</h3>
                        <div className="my-1">
                          <PhoneLink phone={w.phone} />
                        </div>
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
                          ডিফল্ট দর: ৳{w.defaultRatePerReam}/রিম
                        </span>
                      </div>
                    </div>

                    {!isReadOnly && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenWorkerModal(w)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="কাটিং ম্যান তথ্য এডিট করুন"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setWorkerToDelete(w)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="মুছুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Summary Metric Badges */}
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block font-semibold">কাটা কাগজ</span>
                      <p className="font-black text-slate-900 mt-0.5">{stats.totalReams} <span className="text-[9px] font-normal text-slate-500">রিম</span></p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block font-semibold">মোট বিল</span>
                      <p className="font-black text-slate-900 mt-0.5">{formatCurrency(stats.totalEarned, lang)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-700 block font-semibold">পরিশোধ</span>
                      <p className="font-black text-emerald-700 mt-0.5">{formatCurrency(stats.totalPaid, lang)}</p>
                    </div>
                  </div>

                  {/* Net Due Balance Alert */}
                  <div
                    className={`px-3 py-2 rounded-xl border flex items-center justify-between text-xs font-bold ${
                      isDue
                        ? 'bg-rose-50 border-rose-200 text-rose-800'
                        : stats.balanceDue < 0
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}
                  >
                    <span className="flex items-center space-x-1.5 text-[11px]">
                      {isDue ? (
                        <Clock className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      )}
                      <span>{isDue ? 'কাটিংম্যান পাবে (বকেয়া):' : stats.balanceDue < 0 ? 'অগ্রিম নিয়েছে:' : 'হিসাব পরিশোধিত:'}</span>
                    </span>
                    <span className="text-sm font-black">
                      {isDue
                        ? formatCurrency(stats.balanceDue, lang)
                        : stats.balanceDue < 0
                        ? formatCurrency(Math.abs(stats.balanceDue), lang)
                        : '৳০'}
                    </span>
                  </div>

                  {/* Bottom Action Buttons */}
                  <div className={`grid ${isReadOnly ? 'grid-cols-1' : 'grid-cols-2'} gap-2 pt-1 border-t border-slate-100`}>
                    <button
                      onClick={() => setSelectedWorkerForLedger(w)}
                      className="py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 border border-indigo-200 transition"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                      <span>খাতা / লেজার</span>
                    </button>
                    {!isReadOnly && (
                      <button
                        onClick={() => setSelectedWorkerForPayment(w)}
                        className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-xs transition"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        <span>+ টাকা প্রদান</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal: Add Cutting Record */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border my-auto max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-3">
              নতুন কাগজ কাটিং এন্ট্রি
            </h3>
            {recordSuccessMessage && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{recordSuccessMessage}</span>
              </div>
            )}
            <form onSubmit={handleSaveRecord} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">কাটিং ম্যান নির্বাচন করুন *</label>
                <select
                  required
                  value={recordForm.cuttingWorkerId}
                  onChange={(e) => handleWorkerSelect(e.target.value)}
                  className="w-full border rounded-lg p-2 text-xs font-bold text-slate-900"
                >
                  <option value="">কাটিং ম্যান বাছুন</option>
                  {db.cuttingWorkers.map((w) => (
                    <option key={w.id} value={w.id}>{w.name} (দর: ৳{w.defaultRatePerReam})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">তারিখ</label>
                  <input
                    type="date"
                    value={recordForm.date}
                    onChange={(e) => setRecordForm({ ...recordForm, date: e.target.value })}
                    className="w-full border rounded-lg p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">পার্টি (ঐচ্ছিক)</label>
                  <select
                    value={recordForm.partyId}
                    onChange={(e) => setRecordForm({ ...recordForm, partyId: e.target.value })}
                    className="w-full border rounded-lg p-2 text-xs"
                  >
                    <option value="">পার্টি বাছুন</option>
                    {db.parties.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">কাটা রিমের সংখ্যা *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={recordForm.reams}
                    onChange={(e) => setRecordForm({ ...recordForm, reams: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded p-2 text-sm font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">প্রতি রিমের দর (৳) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={recordForm.ratePerReam}
                    onChange={(e) => setRecordForm({ ...recordForm, ratePerReam: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded p-2 text-sm font-bold text-center"
                  />
                </div>
              </div>

              <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex justify-between items-center text-xs">
                <span className="font-semibold text-rose-800">মোট কাটিং কাজের বিল:</span>
                <span className="text-base font-black text-rose-700">
                  {formatCurrency(calculateCuttingCost(recordForm.reams, recordForm.ratePerReam), lang)}
                </span>
              </div>

              {/* Cutting Worker Payment Status in Form */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2.5">
                <span className="font-bold text-xs text-slate-800 block">
                  কাটিংম্যানের টাকা পরিশোধ অবস্থা:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const cost = calculateCuttingCost(recordForm.reams, recordForm.ratePerReam);
                      setRecordForm({
                        ...recordForm,
                        paymentStatus: 'paid',
                        paidAmount: cost,
                      });
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition ${
                      recordForm.paymentStatus === 'paid'
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    নগদ পরিশোধ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRecordForm({
                        ...recordForm,
                        paymentStatus: 'due',
                        paidAmount: 0,
                      });
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition ${
                      recordForm.paymentStatus === 'due'
                        ? 'bg-rose-700 text-white border-rose-700'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    বকেয়া রাখা
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRecordForm({
                        ...recordForm,
                        paymentStatus: 'partial',
                      });
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition ${
                      recordForm.paymentStatus === 'partial'
                        ? 'bg-indigo-700 text-white border-indigo-700'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    আংশিক পরিশোধ
                  </button>
                </div>

                {recordForm.paymentStatus === 'partial' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      এখন কত টাকা পরিশোধ করা হয়েছে? (৳) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      max={calculateCuttingCost(recordForm.reams, recordForm.ratePerReam)}
                      value={recordForm.paidAmount}
                      onChange={(e) =>
                        setRecordForm({
                          ...recordForm,
                          paidAmount: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full border rounded p-1.5 text-xs font-bold"
                    />
                  </div>
                )}

                {recordForm.paymentStatus !== 'due' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      পেমেন্ট মাধ্যম
                    </label>
                    <select
                      value={recordForm.paymentMethod}
                      onChange={(e) =>
                        setRecordForm({ ...recordForm, paymentMethod: e.target.value })
                      }
                      className="w-full border rounded p-1.5 text-xs font-medium"
                    >
                      <option value="cash">নগদ (Cash)</option>
                      <option value="bkash">বিকাশ (bKash)</option>
                      <option value="nagad">নগদ (Nagad)</option>
                      <option value="bank">ব্যাংক (Bank)</option>
                    </select>
                  </div>
                )}

                <p className="text-[10px] text-emerald-700 font-semibold pt-1 border-t border-slate-200">
                  ✓ এই কাজের রিম ও বিল স্বয়ংক্রিয়ভাবে সংশ্লিষ্ট কাটিংম্যানের খাতায় যুক্ত হবে।
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">মন্তব্য</label>
                <input
                  type="text"
                  value={recordForm.notes}
                  onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })}
                  placeholder="কাগজের সাইজ বা কাটিং বিবরণ"
                  className="w-full border rounded-lg p-2 text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setIsRecordModalOpen(false);
                    setRecordSuccessMessage('');
                  }}
                  className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  সম্পন্ন / বন্ধ করুন
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  সংরক্ষণ (নতুন এন্ট্রি চালু থাকবে)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Worker */}
      {isWorkerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border my-auto max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-3">
              {editingWorker ? 'কাটিং ম্যান তথ্য এডিট / সংশোধন' : 'নতুন কাটিং ম্যান যোগ করুন'}
            </h3>
            {workerSuccessMessage && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{workerSuccessMessage}</span>
              </div>
            )}
            <form onSubmit={handleSaveWorker} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">নাম *</label>
                <input
                  type="text"
                  required
                  value={workerForm.name}
                  onChange={(e) => setWorkerForm({ ...workerForm, name: e.target.value })}
                  placeholder="যেমন: ফারুক কাটিং ম্যান"
                  className="w-full border rounded-lg p-2 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ফোন নম্বর</label>
                  <input
                    type="text"
                    value={workerForm.phone}
                    onChange={(e) => setWorkerForm({ ...workerForm, phone: e.target.value })}
                    className="w-full border rounded-lg p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ডিফল্ট দর (৳/রিম)</label>
                  <input
                    type="number"
                    value={workerForm.defaultRatePerReam}
                    onChange={(e) => setWorkerForm({ ...workerForm, defaultRatePerReam: parseFloat(e.target.value) || 25 })}
                    className="w-full border rounded-lg p-2 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ঠিকানা</label>
                <input
                  type="text"
                  value={workerForm.address}
                  onChange={(e) => setWorkerForm({ ...workerForm, address: e.target.value })}
                  className="w-full border rounded-lg p-2 text-xs"
                />
              </div>

              {/* Photo */}
              <div className="border p-3 rounded-lg bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">ছবি (ঐচ্ছিক):</span>
                  <label className="cursor-pointer text-xs font-bold text-indigo-700 hover:underline">
                    {workerForm.photoUrl ? 'ছবি পরিবর্তন করুন' : 'ছবি আপলোড করুন'}
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                </div>
                {workerForm.photoUrl && (
                  <div className="flex items-center space-x-3 pt-1 border-t border-slate-200">
                    <img
                      src={workerForm.photoUrl}
                      alt="Preview"
                      className="w-12 h-12 rounded-lg object-cover border"
                    />
                    <div className="flex-1">
                      <span className="text-[11px] text-emerald-700 font-bold block">ছবি যুক্ত আছে</span>
                      <button
                        type="button"
                        onClick={() => setWorkerForm((prev) => ({ ...prev, photoUrl: '' }))}
                        className="text-[10px] text-rose-600 hover:underline font-bold"
                      >
                        ছবি মুছে ফেলুন
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {workerUploadError && (
                <p className="text-[11px] text-rose-600 font-semibold">{workerUploadError}</p>
              )}

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setIsWorkerModalOpen(false);
                    setWorkerSuccessMessage('');
                  }}
                  className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  {editingWorker ? 'বাতিল' : 'সম্পন্ন / বন্ধ করুন'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  {editingWorker ? 'আপডেট করুন' : 'সংরক্ষণ (নতুন এন্ট্রি চালু থাকবে)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Cutting Record Confirmation Modal */}
      <ConfirmModal
        isOpen={!!recordToDelete}
        title="কাটিং রেকর্ড মুছে ফেলা"
        message={`আপনি কি নিশ্চিত যে এই কাটিং রেকর্ডটি মুছে ফেলতে চান?`}
        onConfirm={() => {
          if (recordToDelete) {
            deleteCuttingRecord(recordToDelete.id);
            setRecordToDelete(null);
          }
        }}
        onCancel={() => setRecordToDelete(null)}
      />

      {/* Delete Cutting Worker Confirmation Modal */}
      <ConfirmModal
        isOpen={!!workerToDelete}
        title="কাটিং কারিগর মুছে ফেলা"
        message={`আপনি কি নিশ্চিত যে "${workerToDelete?.name}" কাটিং কারিগরকে তালিকা থেকে মুছে ফেলতে চান?`}
        onConfirm={() => {
          if (workerToDelete) {
            deleteCuttingWorker(workerToDelete.id);
            setWorkerToDelete(null);
          }
        }}
        onCancel={() => setWorkerToDelete(null)}
      />

      {/* Cutting Worker Full Ledger Modal */}
      <CuttingWorkerLedgerModal
        isOpen={!!selectedWorkerForLedger}
        onClose={() => setSelectedWorkerForLedger(null)}
        worker={selectedWorkerForLedger}
        onOpenPayment={(w) => setSelectedWorkerForPayment(w)}
        onViewSlip={(slip) => setSelectedCuttingSlip(slip)}
      />

      {/* Cutting Worker Payment Modal */}
      <CuttingPaymentModal
        isOpen={!!selectedWorkerForPayment}
        onClose={() => setSelectedWorkerForPayment(null)}
        worker={selectedWorkerForPayment}
      />
    </div>
  );
};
