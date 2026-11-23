import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { Invoice, InvoiceItem, BillingBasis } from '../../types';
import { formatCurrency, formatDate, formatNumber, toBanglaDigits } from '../../utils/calculations';
import { translations } from '../../utils/i18n';
import { PrintHeader, PrintSignatures, PrintAmountInWords, triggerPrint } from '../common/PrintHeader';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  FileText,
  Plus,
  Search,
  Printer,
  Trash2,
  Eye,
  CheckCircle,
  Calendar,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { PhoneLink } from '../common/PhoneLink';

export const BillingManager: React.FC = () => {
  const { db, addInvoice, deleteInvoice, getPartyBalance, isReadOnly } = useDatabase();
  const lang = db.settings.language;
  const numFmt = db.settings.numberFormat;
  const t = translations[lang];

  const today = new Date().toISOString().split('T')[0];
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [invToDelete, setInvToDelete] = useState<Invoice | null>(null);

  // Form State for new invoice
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [invoiceNo, setInvoiceNo] = useState(`INV-${new Date().getFullYear()}-${(db.invoices.length + 1001).toString()}`);
  const [includePreviousDue, setIncludePreviousDue] = useState(false);
  const [unbilledCategoryFilter, setUnbilledCategoryFilter] = useState<'all' | 'dc' | 'dd' | 'cover'>('all');
  const [selectedProdIds, setSelectedProdIds] = useState<string[]>([]);
  const [customItems, setCustomItems] = useState<InvoiceItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [extraCharges, setExtraCharges] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [formError, setFormError] = useState('');

  const selectedParty = db.parties.find((p) => p.id === selectedPartyId);
  const previousDue = selectedParty ? getPartyBalance(selectedParty.id) : 0;

  // Unbilled productions for selected party
  const unbilledProductions = db.productions.filter(
    (p) => p.partyId === selectedPartyId && !p.isBilled
  );

  // Helper to categorize production into DC, DD, or Cover
  const getProductionCategory = (
    p: { itemType?: string; paperSize?: string; bookId?: string },
    b?: { size?: string }
  ): 'cover' | 'dc' | 'dd' | 'other' => {
    if (p.itemType === 'cover') return 'cover';
    const sizeStr = `${p.paperSize || ''} ${b?.size || ''}`.toLowerCase();
    if (
      sizeStr.includes('dc') ||
      sizeStr.includes('20*30') ||
      sizeStr.includes('20×30') ||
      sizeStr.includes('২০×৩০') ||
      sizeStr.includes('২০*৩০')
    ) {
      return 'dc';
    }
    if (
      sizeStr.includes('dd') ||
      sizeStr.includes('23*36') ||
      sizeStr.includes('23×৩৬') ||
      sizeStr.includes('২৩×৩৬') ||
      sizeStr.includes('২৩*৩৬')
    ) {
      return 'dd';
    }
    return 'other';
  };

  const handleOpenCreateModal = () => {
    if (isReadOnly) return;
    const firstParty = db.parties[0];
    const initialPartyId = firstParty?.id || '';
    setSelectedPartyId(initialPartyId);
    setInvoiceDate(today);
    setInvoiceNo(`INV-${new Date().getFullYear()}-${(db.invoices.length + 1001).toString()}`);
    setIncludePreviousDue(false);
    setUnbilledCategoryFilter('all');
    setSelectedProdIds([]);
    setCustomItems([]);
    setDiscount(0);
    setExtraCharges(0);
    setPaidAmount(0);
    setInvoiceNotes('');
    setFormError('');
    setIsCreateModalOpen(true);
  };

  // Helper to build InvoiceItems with productionDate included, DC/DD/Cover tags, and printing rate rules:
  // - Copies <= 2000: plate basis (দর × প্লেট সংখ্যা)
  // - Copies > 2000: ream basis (দর × মোট রিম)
  const buildCustomItems = (prodIds: string[]): InvoiceItem[] => {
    return prodIds.map((id) => {
      const p = db.productions.find((prod) => prod.id === id)!;
      const b = db.books.find((book) => book.id === p.bookId);
      const isCover = p.itemType === 'cover';
      const cat = getProductionCategory(p, b);
      const catLabel = isCover
        ? 'কভার'
        : cat === 'dc'
        ? '20*30 DC'
        : cat === 'dd'
        ? '23*36 DD'
        : (p.paperSize || b?.size || 'বই');

      // Rule: <= 2000 copies is calculated per plate (প্লেট হিসেবে দর)
      // > 2000 copies is calculated per ream (রিম হিসেবে দর)
      const copies = p.copies || 0;
      const isPlateBasis = copies <= 2000;
      const billingBasis: BillingBasis = isPlateBasis ? 'plate' : 'ream';
      const unit = isPlateBasis ? 'প্লেট' : 'রিম';
      const qty = isPlateBasis ? (p.plates || 1) : (p.reams || 1);

      // Default rate: if plate basis, use default plate rate (450 or book rate); if ream basis, use ream rate (250 or book rate)
      const rate = b?.defaultRate || (isPlateBasis ? (db.settings.globalDefaultRatePerForma || 450) : 250);

      const displayName = isCover
        ? `${b?.name || 'অজ্ঞাত বই'} (কভার)`
        : `${b?.name || 'অজ্ঞাত বই'} [${catLabel}]`;
      const desc = isCover
        ? `কভার ছাপা | ${copies} কপি, ৪ কালার (${p.plates} প্লেট), ${p.reams} রিম [${isPlateBasis ? 'প্লেট হিসেবে দর (≤২০০০ কপি)' : 'রিম হিসেবে দর (>২০০০ কপি)'}]`
        : `বই ছাপা [${catLabel}] | ${copies} কপি, ${p.plates} প্লেট, ${p.reams} রিম [${isPlateBasis ? 'প্লেট হিসেবে দর (≤২০০০ কপি)' : 'রিম হিসেবে দর (>২০০০ কপি)'}]`;

      return {
        id: `item_${p.id}`,
        productionId: p.id,
        productionDate: p.date,
        bookId: p.bookId,
        bookName: displayName,
        itemType: p.itemType || 'book',
        forma: p.forma,
        plates: p.plates,
        copies: p.copies,
        reams: p.reams,
        billingBasis,
        unit,
        quantity: qty,
        rate,
        amount: Math.round(qty * rate * 100) / 100,
        description: desc,
      };
    });
  };

  // Toggle selection of unbilled production item
  const handleToggleProd = (prodId: string) => {
    const exists = selectedProdIds.includes(prodId);
    const newSelected = exists
      ? selectedProdIds.filter((id) => id !== prodId)
      : [...selectedProdIds, prodId];
    setSelectedProdIds(newSelected);
    setCustomItems(buildCustomItems(newSelected));
  };

  // Select only DC productions (20*30 DC)
  const handleSelectOnlyDc = () => {
    const dcIds = unbilledProductions
      .filter((p) => {
        const b = db.books.find((book) => book.id === p.bookId);
        return getProductionCategory(p, b) === 'dc';
      })
      .map((p) => p.id);
    setSelectedProdIds(dcIds);
    setCustomItems(buildCustomItems(dcIds));
    setUnbilledCategoryFilter('dc');
  };

  // Select only DD productions (23*36 DD)
  const handleSelectOnlyDd = () => {
    const ddIds = unbilledProductions
      .filter((p) => {
        const b = db.books.find((book) => book.id === p.bookId);
        return getProductionCategory(p, b) === 'dd';
      })
      .map((p) => p.id);
    setSelectedProdIds(ddIds);
    setCustomItems(buildCustomItems(ddIds));
    setUnbilledCategoryFilter('dd');
  };

  // Select only Cover productions
  const handleSelectOnlyCover = () => {
    const coverIds = unbilledProductions
      .filter((p) => {
        const b = db.books.find((book) => book.id === p.bookId);
        return getProductionCategory(p, b) === 'cover';
      })
      .map((p) => p.id);
    setSelectedProdIds(coverIds);
    setCustomItems(buildCustomItems(coverIds));
    setUnbilledCategoryFilter('cover');
  };

  // Select all productions combined
  const handleSelectAllCombined = () => {
    const allIds = unbilledProductions.map((p) => p.id);
    setSelectedProdIds(allIds);
    setCustomItems(buildCustomItems(allIds));
    setUnbilledCategoryFilter('all');
  };

  // Clear all selections
  const handleClearAllSelected = () => {
    setSelectedProdIds([]);
    setCustomItems([]);
  };

  // Select all or deselect all unbilled productions in one click
  const handleToggleSelectAll = () => {
    if (selectedProdIds.length === unbilledProductions.length) {
      handleClearAllSelected();
    } else {
      handleSelectAllCombined();
    }
  };

  const handleRateChange = (index: number, newRate: number) => {
    setCustomItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        rate: newRate,
        amount: Math.round(next[index].quantity * newRate * 100) / 100,
      };
      return next;
    });
  };

  const handleQtyChange = (index: number, newQty: number) => {
    setCustomItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        quantity: newQty,
        amount: Math.round(newQty * next[index].rate * 100) / 100,
      };
      return next;
    });
  };

  const handleBasisChange = (index: number, newBasis: BillingBasis) => {
    setCustomItems((prev) => {
      const next = [...prev];
      const item = next[index];
      const prod = item.productionId ? db.productions.find((p) => p.id === item.productionId) : null;
      let newQty = item.quantity;
      let newUnit = 'প্লেট';

      if (newBasis === 'plate') {
        newQty = prod?.plates || item.plates || 1;
        newUnit = 'প্লেট';
      } else if (newBasis === 'ream') {
        newQty = prod?.reams || item.reams || 1;
        newUnit = 'রিম';
      } else if (newBasis === 'forma') {
        newQty = prod?.forma || item.forma || 1;
        newUnit = 'ফর্মা';
      }

      next[index] = {
        ...item,
        billingBasis: newBasis,
        unit: newUnit,
        quantity: newQty,
        amount: Math.round(newQty * item.rate * 100) / 100,
      };
      return next;
    });
  };

  const subtotal = customItems.reduce((sum, item) => sum + item.amount, 0);
  const grandTotal = Math.max(0, subtotal - discount + extraCharges);
  const effectivePreviousDue = includePreviousDue ? previousDue : 0;
  const netDueAfterBill = effectivePreviousDue + grandTotal - paidAmount;

  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setFormError('');
    if (!selectedParty || customItems.length === 0) {
      setFormError('অনুগ্রহ করে অন্তত একটি প্রডাকশন কাজ নির্বাচন করুন');
      return;
    }

    const saved = addInvoice({
      invoiceNo,
      date: invoiceDate,
      partyId: selectedParty.id,
      partyName: selectedParty.name,
      items: customItems,
      subtotal,
      discount,
      extraCharges,
      grandTotal,
      includePreviousDue,
      previousDue: effectivePreviousDue,
      paidAmount,
      currentDue: netDueAfterBill,
      notes: invoiceNotes,
    });

    setIsCreateModalOpen(false);
    setSelectedInvoice(saved);
  };

  const handleDeleteInvoice = (inv: Invoice) => {
    if (isReadOnly) return;
    setInvToDelete(inv);
  };

  const filteredInvoices = db.invoices.filter(
    (inv) =>
      inv.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
      inv.partyName.toLowerCase().includes(search.toLowerCase())
  );

  // If viewing single invoice voucher
  if (selectedInvoice) {
    return (
      <div className="space-y-6">
        <div className="no-print flex items-center justify-between">
          <button
            onClick={() => setSelectedInvoice(null)}
            className="flex items-center space-x-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 px-3 py-2 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ইনভয়েস তালিকায় ফিরে যান</span>
          </button>

          <button
            onClick={() => triggerPrint()}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>ইনভয়েস প্রিন্ট করুন</span>
          </button>
        </div>

        {/* Printable Invoice Container */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs max-w-4xl mx-auto print-container">
          <PrintHeader
            title="বিল / ইনভয়েস (BILL / INVOICE)"
            documentNo={selectedInvoice.invoiceNo}
            date={selectedInvoice.date}
          />

          {/* Party and Invoice Details */}
          <div className="grid grid-cols-2 gap-6 my-6 text-xs text-slate-800 border bg-slate-50/50 p-4 rounded-xl">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">গ্রাহক / পার্টির বিবরণ</p>
              <h3 className="text-base font-bold text-slate-900 mt-1">{selectedInvoice.partyName}</h3>
              {selectedParty && (
                <div className="mt-1 space-y-0.5 text-slate-600">
                  <p>যোগাযোগ: {selectedParty.contactPerson}</p>
                  <p>ঠিকানা: {selectedParty.address}</p>
                  <div className="flex items-center space-x-1">
                    <span>ফোন:</span>
                    <PhoneLink phone={selectedParty.phone} showWhatsApp={true} />
                  </div>
                </div>
              )}
            </div>

            <div className="text-right space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase">ইনভয়েস সারাংশ</p>
              <p className="font-mono font-bold text-slate-900 text-sm">{selectedInvoice.invoiceNo}</p>
              <p>তারিখ: <b>{formatDate(selectedInvoice.date, lang)}</b></p>
              {selectedInvoice.includePreviousDue !== false && selectedInvoice.previousDue > 0 && (
                <p>পূর্বের বকেয়া: <b>{formatCurrency(selectedInvoice.previousDue, lang)}</b></p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-xs text-left my-6 border">
            <thead className="bg-slate-100 text-slate-800 font-bold border-b">
              <tr>
                <th className="p-3 text-center">ক্রমিক</th>
                <th className="p-3">কাজের তারিখ</th>
                <th className="p-3">কাজের বিবরণ / বইয়ের নাম</th>
                <th className="p-3 text-center">ফর্মা</th>
                <th className="p-3 text-center">ছাপার বিবরণ (কপি/রিম)</th>
                <th className="p-3 text-center">বিলিং পরিমাণ ও একক</th>
                <th className="p-3 text-right">দর / রেট (৳)</th>
                <th className="p-3 text-right">মোট টাকা (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {selectedInvoice.items.map((item, idx) => {
                const prod = item.productionId ? db.productions.find((p) => p.id === item.productionId) : null;
                const workDate = item.productionDate || prod?.date;
                const isPlate = item.billingBasis === 'plate' || (!item.billingBasis && (item.copies || 0) <= 2000);
                const unitLabel = item.unit || (isPlate ? 'প্লেট' : 'রিম');

                return (
                  <tr key={idx}>
                    <td className="p-3 text-center tabular-nums">{idx + 1}</td>
                    <td className="p-3 whitespace-nowrap tabular-nums font-semibold text-slate-800">
                      {workDate ? formatDate(workDate, lang, numFmt) : '-'}
                    </td>
                    <td className="p-3">
                      <p className="font-bold text-slate-900">{item.bookName}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${
                          isPlate
                            ? 'bg-amber-50 text-amber-900 border-amber-300'
                            : 'bg-blue-50 text-blue-900 border-blue-300'
                        }`}>
                          {isPlate ? '★ প্লেট হিসেবে দর (≤২,০০০ কপি)' : '★ রিম হিসেবে দর (>২,০০০ কপি)'}
                        </span>
                        {item.description && <span className="text-[10px] text-slate-500">{item.description}</span>}
                      </div>
                    </td>
                    <td className="p-3 text-center tabular-nums">{formatNumber(item.forma, lang, numFmt)}</td>
                    <td className="p-3 text-center tabular-nums">
                      <span className="font-semibold">{formatNumber(item.copies, lang, numFmt)} কপি</span>
                      {item.reams ? <span className="text-slate-500 text-[10px] block">({formatNumber(item.reams, lang, numFmt)} রিম)</span> : null}
                    </td>
                    <td className="p-3 text-center font-bold tabular-nums">
                      {formatNumber(item.quantity, lang, numFmt)} <span className="text-[10px] font-semibold text-slate-600">{unitLabel}</span>
                    </td>
                    <td className="p-3 text-right tabular-nums whitespace-nowrap">
                      {formatCurrency(item.rate, lang)} <span className="text-[10px] text-slate-500">/{unitLabel}</span>
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900 tabular-nums">
                      {formatCurrency(item.amount, lang)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t font-semibold text-slate-800 bg-slate-50">
              <tr>
                <td colSpan={7} className="p-2.5 text-right">উপ-মোট (Subtotal):</td>
                <td className="p-2.5 text-right font-bold tabular-nums">{formatCurrency(selectedInvoice.subtotal, lang)}</td>
              </tr>
              {selectedInvoice.discount > 0 && (
                <tr>
                  <td colSpan={7} className="p-2.5 text-right text-rose-600">বিশেষ ছাড় (Discount):</td>
                  <td className="p-2.5 text-right font-bold text-rose-600 tabular-nums">- {formatCurrency(selectedInvoice.discount, lang)}</td>
                </tr>
              )}
              {selectedInvoice.extraCharges > 0 && (
                <tr>
                  <td colSpan={7} className="p-2.5 text-right">অতিরিক্ত চার্জ:</td>
                  <td className="p-2.5 text-right font-bold tabular-nums">{formatCurrency(selectedInvoice.extraCharges, lang)}</td>
                </tr>
              )}
              <tr className="bg-slate-100 text-sm font-black text-slate-900 border-t border-b">
                <td colSpan={7} className="p-3 text-right">চলতি বিল সর্বমোট (Grand Total):</td>
                <td className="p-3 text-right text-emerald-800 tabular-nums">{formatCurrency(selectedInvoice.grandTotal, lang)}</td>
              </tr>
              {selectedInvoice.includePreviousDue !== false && selectedInvoice.previousDue > 0 && (
                <tr>
                  <td colSpan={7} className="p-2 text-right">পূর্বের বকেয়া:</td>
                  <td className="p-2 text-right tabular-nums">{formatCurrency(selectedInvoice.previousDue, lang)}</td>
                </tr>
              )}
              <tr>
                <td colSpan={7} className="p-2 text-right text-emerald-700">নগদ প্রাপ্তি / জমা:</td>
                <td className="p-2 text-right text-emerald-700 font-bold tabular-nums">- {formatCurrency(selectedInvoice.paidAmount, lang)}</td>
              </tr>
              <tr className="bg-amber-50 text-amber-900 font-black text-sm border-t">
                <td colSpan={7} className="p-3 text-right">
                  {selectedInvoice.includePreviousDue !== false && selectedInvoice.previousDue > 0
                    ? 'সর্বমোট প্রদেয় / বর্তমান মোট বকেয়া (Net Due):'
                    : 'চলতি বিলের অবশিষ্ট বকেয়া (Current Bill Due):'}
                </td>
                <td className="p-3 text-right tabular-nums">{formatCurrency(selectedInvoice.currentDue, lang)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Amount In Words */}
          <PrintAmountInWords amount={selectedInvoice.grandTotal} lang={lang} />

          {selectedInvoice.notes && (
            <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 mb-6">
              <b>শর্তাবলী ও মন্তব্য:</b> {selectedInvoice.notes}
            </div>
          )}

          <PrintSignatures />
        </div>
      </div>
    );
  }

  // Master Invoice List View
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.invoiceList}</h2>
          <p className="text-xs text-slate-500">
            প্রিন্টিং বিল ও ইনভয়েস রেজিস্টার | মোট ইস্যুকৃত বিল: {db.invoices.length} টি
          </p>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => triggerPrint()}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition"
          >
            <Printer className="w-4 h-4" />
            <span>প্রিন্ট তালিকা</span>
          </button>
          {!isReadOnly && (
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>{t.createInvoice}</span>
            </button>
          )}
        </div>
      </div>

      <div className="print-only">
        <PrintHeader
          title="প্রিন্টিং বিল ও ইনভয়েস রেজিস্টার (Billing Register)"
          subtitle={`মোট ইস্যুকৃত বিল: ${filteredInvoices.length} টি`}
        />
      </div>

      {/* Search Bar */}
      <div className="no-print bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
        <Search className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ইনভয়েস নম্বর বা পার্টির নাম..."
          className="w-full text-xs outline-none bg-transparent"
        />
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b">
              <tr>
                <th className="p-3">তারিখ</th>
                <th className="p-3">ইনভয়েস নম্বর</th>
                <th className="p-3">পার্টির নাম</th>
                <th className="p-3">কাজের বিবরণ</th>
                <th className="p-3 text-right">চলতি বিল</th>
                <th className="p-3 text-right">জমা</th>
                <th className="p-3 text-right">বকেয়া</th>
                <th className="p-3 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    কোনো ইনভয়েস তৈরি করা হয়নি। নতুন বিল তৈরি করতে উপরের বাটনে ক্লিক করুন।
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 whitespace-nowrap">{formatDate(inv.date, lang)}</td>
                    <td className="p-3 font-mono font-bold text-slate-900">{inv.invoiceNo}</td>
                    <td className="p-3 font-bold text-slate-800">{inv.partyName}</td>
                    <td className="p-3 text-slate-600 truncate max-w-xs">
                      {inv.items.map((i) => i.bookName).join(', ')}
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      {formatCurrency(inv.grandTotal, lang)}
                    </td>
                    <td className="p-3 text-right text-emerald-700 font-semibold">
                      {formatCurrency(inv.paidAmount, lang)}
                    </td>
                    <td className="p-3 text-right font-black text-amber-700">
                      {formatCurrency(inv.currentDue, lang)}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end space-x-1">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                          title="ভাউচার দেখুন"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setTimeout(() => triggerPrint(), 80);
                          }}
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                          title="ইনভয়েস প্রিন্ট করুন"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        {!isReadOnly && (
                          <button
                            onClick={() => handleDeleteInvoice(inv)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                            title="বিল মুছুন"
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
          </table>
        </div>
      </div>

      {/* Modal: Create Invoice with Unbilled Production Selection */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border my-auto max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              নতুন প্রিন্টিং বিল তৈরি করুন
            </h3>
            {formError && (
              <div className="p-3 mb-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                {formError}
              </div>
            )}
            <form onSubmit={handleSaveInvoice} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">পার্টি / কাস্টমার নির্বাচন করুন *</label>
                  <select
                    required
                    value={selectedPartyId}
                    onChange={(e) => {
                      setSelectedPartyId(e.target.value);
                      setSelectedProdIds([]);
                      setCustomItems([]);
                    }}
                    className="w-full border rounded-lg p-2 text-xs font-bold text-slate-900"
                  >
                    <option value="">পার্টি বাছুন</option>
                    {db.parties.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} (বকেয়া: ৳{getPartyBalance(p.id)})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">তারিখ</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full border rounded-lg p-2 text-xs"
                  />
                </div>
              </div>

              {/* Optional Previous Due inclusion option */}
              {previousDue > 0 && (
                <div className="flex items-center space-x-2.5 p-3 bg-amber-50/80 rounded-xl border border-amber-200">
                  <input
                    type="checkbox"
                    id="includePreviousDue"
                    checked={includePreviousDue}
                    onChange={(e) => setIncludePreviousDue(e.target.checked)}
                    className="rounded text-emerald-700 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="includePreviousDue" className="text-xs font-bold text-slate-800 cursor-pointer flex-1">
                    বর্তমান বিলে পূর্বের বকেয়া ({formatCurrency(previousDue, lang)}) যুক্ত করবেন? (ঐচ্ছিক)
                    <span className="block text-[11px] font-normal text-slate-500 mt-0.5">
                      {includePreviousDue
                        ? '✓ হ্যাঁ, বর্তমান বিলে পূর্বের বকেয়া যোগ করে সর্বমোট হিসাব ও প্রিন্ট হবে'
                        : '✕ না (টিক না দিলে পূর্বের বকেয়া বিলে অটোমেটিক আসবে না, শুধু বর্তমান কাজের বিল হবে)'}
                    </span>
                  </label>
                </div>
              )}

              {/* Unbilled Productions Checklist with Separate / Combined Billing Options */}
              {(() => {
                const dcCount = unbilledProductions.filter((p) => {
                  const b = db.books.find((book) => book.id === p.bookId);
                  return getProductionCategory(p, b) === 'dc';
                }).length;

                const ddCount = unbilledProductions.filter((p) => {
                  const b = db.books.find((book) => book.id === p.bookId);
                  return getProductionCategory(p, b) === 'dd';
                }).length;

                const coverCount = unbilledProductions.filter((p) => {
                  const b = db.books.find((book) => book.id === p.bookId);
                  return getProductionCategory(p, b) === 'cover';
                }).length;

                const filteredUnbilled = unbilledProductions.filter((p) => {
                  if (unbilledCategoryFilter === 'all') return true;
                  const b = db.books.find((book) => book.id === p.bookId);
                  const cat = getProductionCategory(p, b);
                  if (unbilledCategoryFilter === 'dc') return cat === 'dc';
                  if (unbilledCategoryFilter === 'dd') return cat === 'dd';
                  if (unbilledCategoryFilter === 'cover') return cat === 'cover';
                  return true;
                });

                // Detect current selected bill composition
                const selectedItemsCats = selectedProdIds.map((id) => {
                  const p = db.productions.find((prod) => prod.id === id);
                  if (!p) return 'other';
                  const b = db.books.find((book) => book.id === p.bookId);
                  return getProductionCategory(p, b);
                });
                const hasDc = selectedItemsCats.includes('dc');
                const hasDd = selectedItemsCats.includes('dd');
                const hasCover = selectedItemsCats.includes('cover');

                let modeBadgeText = '';
                if (selectedProdIds.length > 0) {
                  if (hasDc && !hasDd && !hasCover) modeBadgeText = '💡 মোড: শুধু ২০×৩০ DC সাইজের আলাদা বিল প্রস্তুত হচ্ছে';
                  else if (hasDd && !hasDc && !hasCover) modeBadgeText = '💡 মোড: শুধু ২৩×৩৬ DD সাইজের আলাদা বিল প্রস্তুত হচ্ছে';
                  else if (hasCover && !hasDc && !hasDd) modeBadgeText = '💡 মোড: শুধু বইয়ের কভারের আলাদা বিল প্রস্তুত হচ্ছে';
                  else modeBadgeText = '💡 মোড: DC, DD ও কভার একসাথে কম্বাইন্ড বিল প্রস্তুত হচ্ছে';
                }

                return (
                  <div className="border rounded-xl p-3 bg-slate-50 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                          <span>প্রডাকশন তালিকা ({unbilledProductions.length} টি বকেয়া)</span>
                          {selectedProdIds.length > 0 && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                              {selectedProdIds.length} টি নির্বাচিত
                            </span>
                          )}
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          আপনি চাইলে DC, DD ও কভার আলাদা বিল করতে পারবেন অথবা ইচ্ছা হলে একসাথে বিল করতে পারবেন
                        </span>
                      </div>

                      {/* Quick One-Click Filter & Select Buttons */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          disabled={dcCount === 0}
                          onClick={handleSelectOnlyDc}
                          className="px-2 py-1 text-[11px] font-bold rounded-lg border transition bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                          title="শুধু ২০*৩০ DC সাইজের সব কাজ নির্বাচন করুন"
                        >
                          ✓ শুধু DC বাছুন ({dcCount})
                        </button>
                        <button
                          type="button"
                          disabled={ddCount === 0}
                          onClick={handleSelectOnlyDd}
                          className="px-2 py-1 text-[11px] font-bold rounded-lg border transition bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                          title="শুধু ২৩*৩৬ DD সাইজের সব কাজ নির্বাচন করুন"
                        >
                          ✓ শুধু DD বাছুন ({ddCount})
                        </button>
                        <button
                          type="button"
                          disabled={coverCount === 0}
                          onClick={handleSelectOnlyCover}
                          className="px-2 py-1 text-[11px] font-bold rounded-lg border transition bg-purple-50 text-purple-900 border-purple-300 hover:bg-purple-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                          title="শুধু বইয়ের কভারের সব কাজ নির্বাচন করুন"
                        >
                          ✓ শুধু কভার ({coverCount})
                        </button>
                        <button
                          type="button"
                          disabled={unbilledProductions.length === 0}
                          onClick={handleSelectAllCombined}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg border transition bg-emerald-700 text-white border-emerald-700 hover:bg-emerald-800 disabled:opacity-40 shadow-2xs"
                          title="সব কাজ একসাথে বিল করতে নির্বাচন করুন"
                        >
                          ✓ সব একসাথে বাছুন
                        </button>
                        {selectedProdIds.length > 0 && (
                          <button
                            type="button"
                            onClick={handleClearAllSelected}
                            className="px-2 py-1 text-[11px] font-bold rounded-lg border transition bg-white text-rose-600 border-rose-300 hover:bg-rose-50 shadow-2xs"
                          >
                            ✕ বাতিল
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Mode Notice Banner */}
                    {modeBadgeText && (
                      <div className="p-2 bg-emerald-50 border border-emerald-300 rounded-lg text-[11px] font-bold text-emerald-900 flex items-center justify-between animate-in fade-in">
                        <span>{modeBadgeText}</span>
                        <span className="text-[10px] text-emerald-700 underline cursor-pointer" onClick={handleClearAllSelected}>
                          পুনরায় বাছুন
                        </span>
                      </div>
                    )}

                    {/* Category Tabs to filter the view */}
                    <div className="flex flex-wrap gap-1 bg-slate-200/70 p-1 rounded-xl text-xs">
                      {[
                        { id: 'all', label: 'সব কাজ', count: unbilledProductions.length },
                        { id: 'dc', label: '২০*৩০ DC', count: dcCount },
                        { id: 'dd', label: '২৩*৩৬ DD', count: ddCount },
                        { id: 'cover', label: 'বইয়ের কভার', count: coverCount },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setUnbilledCategoryFilter(tab.id as any)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                            unbilledCategoryFilter === tab.id
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <span>{tab.label}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full">
                            {tab.count}
                          </span>
                        </button>
                      ))}
                    </div>

                    {unbilledProductions.length === 0 ? (
                      <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded text-center">
                        এই পার্টির জন্য কোনো বকেয়া প্রডাকশন নেই। দৈনিক প্রডাকশন থেকে আগে এন্ট্রি করুন অথবা পার্টি পরিবর্তন করুন।
                      </p>
                    ) : filteredUnbilled.length === 0 ? (
                      <p className="text-xs text-slate-500 bg-white p-3 rounded border text-center">
                        এই ক্যাটাগরির কোনো বকেয়া কাজ নেই। অন্য ক্যাটাগরি নির্বাচন করুন।
                      </p>
                    ) : (
                      <div className="max-h-48 overflow-y-auto divide-y divide-slate-200 border rounded-lg bg-white">
                        {filteredUnbilled.map((p) => {
                          const book = db.books.find((b) => b.id === p.bookId);
                          const isSelected = selectedProdIds.includes(p.id);
                          const isCover = p.itemType === 'cover';
                          const cat = getProductionCategory(p, book);

                          return (
                            <label
                              key={p.id}
                              className={`flex items-center justify-between p-2.5 text-xs cursor-pointer hover:bg-emerald-50/50 transition ${
                                isSelected ? 'bg-emerald-50/90 font-bold border-l-4 border-l-emerald-600' : ''
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleProd(p.id)}
                                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                                />
                                <div className="flex items-center space-x-1.5">
                                  <span className="tabular-nums font-semibold text-slate-700">
                                    {formatDate(p.date, lang, numFmt)}
                                  </span>
                                  <span>—</span>
                                  <span className="font-bold text-slate-900">{book?.name || 'অজ্ঞাত বই'}</span>
                                  {isCover ? (
                                    <span className="text-[10px] bg-purple-100 text-purple-900 px-1.5 py-0.2 rounded font-bold border border-purple-300">
                                      📕 কভার
                                    </span>
                                  ) : cat === 'dc' ? (
                                    <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-bold border border-amber-300">
                                      ২০*৩০ DC
                                    </span>
                                  ) : cat === 'dd' ? (
                                    <span className="text-[10px] bg-blue-100 text-blue-900 px-1.5 py-0.2 rounded font-bold border border-blue-300">
                                      ২৩*৩৬ DD
                                    </span>
                                  ) : (
                                    <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-bold border border-slate-300">
                                      {p.paperSize || book?.size || 'বই'}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-slate-600 text-right tabular-nums text-[11px]">
                                <span>{formatNumber(p.forma, lang, numFmt)} ফর্মা</span> |{' '}
                                <span>{formatNumber(p.copies, lang, numFmt)} কপি</span> |{' '}
                                <span>{formatNumber(p.reams, lang, numFmt)} রিম</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Editable Rate and Items */}
              {customItems.length > 0 && (
                <div className="border rounded-xl p-3 bg-white space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1 pb-1">
                    <h4 className="text-xs font-bold text-slate-800">নির্বাচিত আইটেমের দর ও পরিমাণ নির্ধারণ</h4>
                    <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                      স্বয়ংক্রিয় নিয়ম: ২০০০ কপি বা নিচে = প্লেট হিসেবে দর, ২০০০ কপির উপরে = রিম হিসেবে দর
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {customItems.map((item, idx) => {
                      const isPlate = item.billingBasis === 'plate' || (!item.billingBasis && (item.copies || 0) <= 2000);
                      const unitLabel = item.unit || (isPlate ? 'প্লেট' : 'রিম');

                      return (
                        <div key={item.id} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1 border-b border-slate-200/60">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-900">{item.bookName}</span>
                              <span className="text-[10px] text-slate-500 tabular-nums">
                                (ছাপা: {formatNumber(item.copies, lang, numFmt)} কপি | {formatNumber(item.forma, lang, numFmt)} ফর্মা | {formatNumber(item.plates, lang, numFmt)} প্লেট | {formatNumber(item.reams, lang, numFmt)} রিম)
                              </span>
                            </div>

                            <div className="flex items-center space-x-1.5">
                              <label className="text-[10px] font-bold text-slate-500">দর ধরার নিয়ম:</label>
                              <select
                                value={item.billingBasis || (isPlate ? 'plate' : 'ream')}
                                onChange={(e) => handleBasisChange(idx, e.target.value as BillingBasis)}
                                className="text-[11px] font-bold border rounded-lg px-2 py-0.5 bg-white text-slate-800 cursor-pointer shadow-2xs"
                              >
                                <option value="plate">প্লেট হিসেবে (দর/প্লেট)</option>
                                <option value="ream">রিম হিসেবে (দর/রিম)</option>
                                <option value="forma">ফর্মা হিসেবে (দর/ফর্মা)</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-4">
                              <label className="text-[10px] text-slate-500 block mb-0.5">
                                বিলিং পরিমাণ ({unitLabel}):
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="any"
                                  min="0.01"
                                  value={item.quantity}
                                  onChange={(e) => handleQtyChange(idx, parseFloat(e.target.value) || 0)}
                                  className="w-full border rounded-lg p-1.5 text-center font-bold bg-white text-slate-900"
                                />
                                <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-semibold pointer-events-none">
                                  {unitLabel}
                                </span>
                              </div>
                            </div>

                            <div className="col-span-4">
                              <label className="text-[10px] text-slate-500 block mb-0.5">
                                দর / রেট (৳ প্রতি {unitLabel}):
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={item.rate}
                                  onChange={(e) => handleRateChange(idx, parseFloat(e.target.value) || 0)}
                                  className="w-full border rounded-lg p-1.5 text-center font-bold text-emerald-800 bg-white"
                                />
                                <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-semibold pointer-events-none">
                                  ৳
                                </span>
                              </div>
                            </div>

                            <div className="col-span-4 text-right">
                              <label className="text-[10px] text-slate-500 block mb-0.5">মোট আইটেম মূল্য:</label>
                              <div className="text-sm font-black text-slate-900 bg-white py-1 px-2 rounded-lg border border-slate-200 tabular-nums">
                                {formatCurrency(item.amount, lang)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Financial Calculation Summary */}
              <div className="bg-slate-50 p-4 rounded-xl border grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-600 mb-1">ছাড় / Discount (৳):</label>
                    <input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      className="w-full border rounded p-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">অতিরিক্ত চার্জ (৳):</label>
                    <input
                      type="number"
                      value={extraCharges}
                      onChange={(e) => setExtraCharges(parseFloat(e.target.value) || 0)}
                      className="w-full border rounded p-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">নগদ প্রাপ্ত টাকা (কালেকশন জমা):</label>
                    <input
                      type="number"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                      className="w-full border rounded p-1.5 font-bold text-emerald-700 bg-white"
                    />
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border space-y-2 text-right">
                  <div className="flex justify-between">
                    <span className="text-slate-500">উপ-মোট:</span>
                    <span className="font-bold">{formatCurrency(subtotal, lang)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">চলতি বিল সর্বমোট:</span>
                    <span className="font-bold text-emerald-700">{formatCurrency(grandTotal, lang)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1">
                    <span className="text-slate-500">পূর্বের বকেয়া:</span>
                    <span className={`font-semibold ${includePreviousDue ? 'text-slate-800' : 'text-slate-400'}`}>
                      {includePreviousDue ? formatCurrency(previousDue, lang) : '০ (যুক্ত করা হয়নি)'}
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>জমা প্রাপ্তি:</span>
                    <span>- {formatCurrency(paidAmount, lang)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 text-sm font-black text-amber-700">
                    <span>বর্তমান বকেয়া:</span>
                    <span>{formatCurrency(netDueAfterBill, lang)}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">মন্তব্য / শর্তাবলী</label>
                <input
                  type="text"
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  placeholder="যেমন: দ্রুত ডেলিভারি সম্পন্ন"
                  className="w-full border rounded-lg p-2 text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-600"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={customItems.length === 0}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold"
                >
                  ইনভয়েস তৈরি ও সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!invToDelete}
        title="বিল / ইনভয়েস মুছে ফেলা"
        message={`আপনি কি নিশ্চিত যে "${invToDelete?.invoiceNo}" বিলটি মুছে ফেলতে চান? এটি মুছে দিলে সংযুক্ত প্রডাকশনগুলো পুনরায় বকেয়া বিলে ফেরত যাবে।`}
        onConfirm={() => {
          if (invToDelete) {
            deleteInvoice(invToDelete.id);
            setInvToDelete(null);
          }
        }}
        onCancel={() => setInvToDelete(null)}
      />
    </div>
  );
};
