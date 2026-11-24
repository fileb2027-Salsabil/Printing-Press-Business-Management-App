import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { InkSupplier, InkPurchaseRecord, InkSupplierPayment, PurchaseUnit } from '../../types';
import { formatCurrency, formatDate, formatNumber } from '../../utils/calculations';
import { PrintHeader, PrintSignatures, triggerPrint } from '../common/PrintHeader';
import { ConfirmModal } from '../common/ConfirmModal';
import { PhoneLink } from '../common/PhoneLink';
import { SmartNumberInput } from '../common/SmartNumberInput';
import {
  Droplet,
  Plus,
  Search,
  Printer,
  Edit2,
  Trash2,
  Store,
  DollarSign,
  Calendar,
  User,
  ShoppingBag,
  FileText,
  AlertCircle,
  CreditCard,
  ChevronDown,
  ArrowRight,
  X,
  CheckCircle,
} from 'lucide-react';

const UNIT_OPTIONS: { value: PurchaseUnit; label: string }[] = [
  { value: 'কেজি', label: 'কেজি (Kg)' },
  { value: 'পিস', label: 'পিস (Pcs)' },
  { value: 'টিন', label: 'টিন (Tin)' },
  { value: 'পাউন্ড', label: 'পাউন্ড (Pound)' },
  { value: 'লিটার', label: 'লিটার (Liter)' },
  { value: 'ইঞ্চি', label: 'ইঞ্চি (Inch)' },
  { value: 'ফিট', label: 'ফিট (Feet)' },
  { value: 'রোল', label: 'রোল (Roll)' },
  { value: 'কার্টন', label: 'কার্টন (Carton)' },
  { value: 'গ্যালন', label: 'গ্যালন (Gallon)' },
  { value: 'বোতল', label: 'বোতল (Bottle)' },
  { value: 'সেট', label: 'সেট (Set)' },
  { value: 'অন্যান্য', label: 'অন্যান্য (Custom)' },
];

export const InkSupplierManager: React.FC = () => {
  const {
    db,
    addInkSupplier,
    updateInkSupplier,
    deleteInkSupplier,
    addInkPurchase,
    updateInkPurchase,
    deleteInkPurchase,
    addInkSupplierPayment,
    deleteInkSupplierPayment,
    getInkSupplierBalance,
    getKnownInkItems,
    isReadOnly,
  } = useDatabase();

  const [activeTab, setActiveTab] = useState<'purchases' | 'suppliers' | 'payments' | 'ledger'>('purchases');
  const [search, setSearch] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<InkSupplier | null>(null);

  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<InkPurchaseRecord | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentSupplierId, setPaymentSupplierId] = useState<string>('');

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'supplier' | 'purchase' | 'payment';
    id: string;
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'supplier',
    id: '',
    title: '',
    message: '',
  });

  // Autocomplete suggestions for item name
  const [showItemSuggestions, setShowItemSuggestions] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const itemNameInputRef = useRef<HTMLInputElement>(null);
  const knownItems = useMemo(() => getKnownInkItems(), [getKnownInkItems]);

  // Keep dialog open for rapid multiple entry
  const [keepDialogOpen, setKeepDialogOpen] = useState(true);
  const [lastSavedNotice, setLastSavedNotice] = useState<string | null>(null);

  // Form states
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    proprietor: '',
    phone: '',
    address: '',
    openingDue: 0,
    notes: '',
  });

  const [purchaseForm, setPurchaseForm] = useState({
    supplierId: '',
    date: new Date().toISOString().split('T')[0],
    itemName: '',
    unit: 'কেজি' as PurchaseUnit,
    quantity: 1,
    unitPrice: 0,
    paymentType: 'due' as 'cash' | 'due' | 'partial',
    paidAmount: 0,
    paymentMethod: 'নগদ',
    carrierName: '',
    invoiceOrChallanNo: '',
    notes: '',
  });

  const [paymentForm, setPaymentForm] = useState({
    supplierId: '',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    paymentMethod: 'নগদ',
    carrierName: '',
    receiptNo: '',
    notes: '',
  });

  // Close autocomplete on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setShowItemSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered item suggestions based on current input
  const filteredSuggestions = useMemo(() => {
    const q = purchaseForm.itemName.trim().toLowerCase();
    if (!q) return knownItems.slice(0, 10);
    return knownItems
      .filter((item) => item.toLowerCase().includes(q))
      .slice(0, 12);
  }, [purchaseForm.itemName, knownItems]);

  // Total summary calculations
  const totalSuppliers = (db.inkSuppliers || []).length;
  const totalPurchasesAmount = (db.inkPurchases || []).reduce(
    (sum, p) => sum + Number(p.totalAmount || 0),
    0
  );
  const totalNetDue = (db.inkSuppliers || []).reduce(
    (sum, s) => sum + getInkSupplierBalance(s.id),
    0
  );

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const currentMonthPurchases = (db.inkPurchases || []).filter((p) =>
    p.date.startsWith(currentMonthStr)
  );
  const currentMonthPurchasesAmount = currentMonthPurchases.reduce(
    (sum, p) => sum + Number(p.totalAmount || 0),
    0
  );

  // Filtered purchases
  const filteredPurchases = useMemo(() => {
    return (db.inkPurchases || []).filter((p) => {
      const matchSupplier = selectedSupplierId === 'all' || p.supplierId === selectedSupplierId;
      const matchSearch =
        p.itemName.toLowerCase().includes(search.toLowerCase()) ||
        p.supplierName.toLowerCase().includes(search.toLowerCase()) ||
        (p.carrierName && p.carrierName.toLowerCase().includes(search.toLowerCase())) ||
        (p.invoiceOrChallanNo && p.invoiceOrChallanNo.toLowerCase().includes(search.toLowerCase()));
      const matchStart = !startDate || p.date >= startDate;
      const matchEnd = !endDate || p.date <= endDate;
      return matchSupplier && matchSearch && matchStart && matchEnd;
    });
  }, [db.inkPurchases, selectedSupplierId, search, startDate, endDate]);

  // Open supplier modal
  const openSupplierModal = (supplier?: InkSupplier) => {
    if (isReadOnly) return;
    if (supplier) {
      setEditingSupplier(supplier);
      setSupplierForm({
        name: supplier.name,
        proprietor: supplier.proprietor || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        openingDue: supplier.openingDue || 0,
        notes: supplier.notes || '',
      });
    } else {
      setEditingSupplier(null);
      setSupplierForm({
        name: '',
        proprietor: '',
        phone: '',
        address: '',
        openingDue: 0,
        notes: '',
      });
    }
    setIsSupplierModalOpen(true);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!supplierForm.name.trim()) return;

    if (editingSupplier) {
      updateInkSupplier(editingSupplier.id, {
        name: supplierForm.name.trim(),
        proprietor: supplierForm.proprietor.trim() || undefined,
        phone: supplierForm.phone.trim() || undefined,
        address: supplierForm.address.trim() || undefined,
        openingDue: Number(supplierForm.openingDue) || 0,
        notes: supplierForm.notes.trim() || undefined,
      });
    } else {
      addInkSupplier({
        name: supplierForm.name.trim(),
        proprietor: supplierForm.proprietor.trim() || undefined,
        phone: supplierForm.phone.trim() || undefined,
        address: supplierForm.address.trim() || undefined,
        openingDue: Number(supplierForm.openingDue) || 0,
        notes: supplierForm.notes.trim() || undefined,
      });
    }

    setIsSupplierModalOpen(false);
  };

  // Open purchase modal
  const openPurchaseModal = (purchase?: InkPurchaseRecord) => {
    if (isReadOnly) return;
    const defaultSupplier = (db.inkSuppliers || [])[0]?.id || '';
    if (purchase) {
      setEditingPurchase(purchase);
      setPurchaseForm({
        supplierId: purchase.supplierId,
        date: purchase.date,
        itemName: purchase.itemName,
        unit: purchase.unit,
        quantity: purchase.quantity,
        unitPrice: purchase.unitPrice,
        paymentType: purchase.paymentType,
        paidAmount: purchase.paidAmount || 0,
        paymentMethod: purchase.paymentMethod || 'নগদ',
        carrierName: purchase.carrierName || '',
        invoiceOrChallanNo: purchase.invoiceOrChallanNo || '',
        notes: purchase.notes || '',
      });
    } else {
      setEditingPurchase(null);
      setPurchaseForm({
        supplierId: selectedSupplierId !== 'all' ? selectedSupplierId : defaultSupplier,
        date: new Date().toISOString().split('T')[0],
        itemName: '',
        unit: 'কেজি',
        quantity: 1,
        unitPrice: 0,
        paymentType: 'due',
        paidAmount: 0,
        paymentMethod: 'নগদ',
        carrierName: '',
        invoiceOrChallanNo: '',
        notes: '',
      });
    }
    setShowItemSuggestions(false);
    setLastSavedNotice(null);
    setIsPurchaseModalOpen(true);
  };

  const handleSavePurchase = (e: React.FormEvent, closeImmediately = false) => {
    e.preventDefault();
    if (isReadOnly) {
      alert('আপনি শুধুমাত্র প্রদর্শন মোডে (Read-Only) আছেন। নতুন মালামাল এন্ট্রি করা সম্ভব নয়।');
      return;
    }
    if (!purchaseForm.supplierId) {
      alert('অনুগ্রহ করে কালির দোকান নির্বাচন করুন');
      return;
    }
    if (!purchaseForm.itemName.trim()) {
      alert('অনুগ্রহ করে মালামালের নাম/বিবরণ লিখুন');
      return;
    }

    const supplier = (db.inkSuppliers || []).find((s) => s.id === purchaseForm.supplierId);
    const supplierName = supplier?.name || 'অজ্ঞাত দোকান';
    const totalAmount = Math.round(Number(purchaseForm.quantity) * Number(purchaseForm.unitPrice));
    const paid =
      purchaseForm.paymentType === 'cash'
        ? totalAmount
        : purchaseForm.paymentType === 'due'
        ? 0
        : Number(purchaseForm.paidAmount) || 0;

    const savedItemName = purchaseForm.itemName.trim();
    const savedQuantity = purchaseForm.quantity;
    const savedUnit = purchaseForm.unit;

    if (editingPurchase) {
      updateInkPurchase(editingPurchase.id, {
        supplierId: purchaseForm.supplierId,
        supplierName,
        date: purchaseForm.date,
        itemName: savedItemName,
        unit: purchaseForm.unit,
        quantity: Number(purchaseForm.quantity) || 1,
        unitPrice: Number(purchaseForm.unitPrice) || 0,
        totalAmount,
        paidAmount: paid,
        paymentType: purchaseForm.paymentType,
        paymentMethod: purchaseForm.paymentMethod,
        carrierName: purchaseForm.carrierName.trim() || undefined,
        invoiceOrChallanNo: purchaseForm.invoiceOrChallanNo.trim() || undefined,
        notes: purchaseForm.notes.trim() || undefined,
      });
      setIsPurchaseModalOpen(false);
      setEditingPurchase(null);
      setLastSavedNotice(null);
    } else {
      addInkPurchase({
        supplierId: purchaseForm.supplierId,
        supplierName,
        date: purchaseForm.date,
        itemName: savedItemName,
        unit: purchaseForm.unit,
        quantity: Number(purchaseForm.quantity) || 1,
        unitPrice: Number(purchaseForm.unitPrice) || 0,
        totalAmount,
        paidAmount: paid,
        paymentType: purchaseForm.paymentType,
        paymentMethod: purchaseForm.paymentMethod,
        carrierName: purchaseForm.carrierName.trim() || undefined,
        invoiceOrChallanNo: purchaseForm.invoiceOrChallanNo.trim() || undefined,
        notes: purchaseForm.notes.trim() || undefined,
      });

      if (!closeImmediately && keepDialogOpen) {
        // Keep modal open for next item entry
        setLastSavedNotice(
          `"${savedItemName}" (${formatNumber(savedQuantity)} ${savedUnit} - ${formatCurrency(totalAmount)}) সফলভাবে যুক্ত হয়েছে!`
        );
        setPurchaseForm((prev) => ({
          ...prev,
          itemName: '',
          quantity: 1,
          unitPrice: 0,
          paidAmount: 0,
          notes: '',
        }));
        setTimeout(() => {
          itemNameInputRef.current?.focus();
        }, 100);
      } else {
        setIsPurchaseModalOpen(false);
        setLastSavedNotice(null);
      }
    }
  };

  // Open Payment Modal
  const openPaymentModal = (supplierId?: string) => {
    if (isReadOnly) return;
    const targetSupplierId = supplierId || (selectedSupplierId !== 'all' ? selectedSupplierId : (db.inkSuppliers || [])[0]?.id || '');
    setPaymentSupplierId(targetSupplierId);
    setPaymentForm({
      supplierId: targetSupplierId,
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      paymentMethod: 'নগদ',
      carrierName: '',
      receiptNo: '',
      notes: '',
    });
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!paymentForm.supplierId) {
      alert('অনুগ্রহ করে কালির দোকান নির্বাচন করুন');
      return;
    }
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      alert('পরিশোধের পরিমাণ লিখুন');
      return;
    }

    const supplier = (db.inkSuppliers || []).find((s) => s.id === paymentForm.supplierId);
    const supplierName = supplier?.name || 'কালির দোকান';

    addInkSupplierPayment({
      supplierId: paymentForm.supplierId,
      supplierName,
      date: paymentForm.date,
      amount: Number(paymentForm.amount),
      paymentMethod: paymentForm.paymentMethod,
      carrierName: paymentForm.carrierName.trim() || undefined,
      receiptNo: paymentForm.receiptNo.trim() || undefined,
      notes: paymentForm.notes.trim() || undefined,
    });

    setIsPaymentModalOpen(false);
  };

  // Handle Deletion
  const confirmDelete = () => {
    if (isReadOnly) {
      setDeleteConfirm((prev) => ({ ...prev, isOpen: false }));
      return;
    }
    if (deleteConfirm.type === 'supplier') {
      deleteInkSupplier(deleteConfirm.id);
    } else if (deleteConfirm.type === 'purchase') {
      deleteInkPurchase(deleteConfirm.id);
    } else if (deleteConfirm.type === 'payment') {
      deleteInkSupplierPayment(deleteConfirm.id);
    }
    setDeleteConfirm((prev) => ({ ...prev, isOpen: false }));
  };

  // Ledger details for selected supplier
  const ledgerData = useMemo(() => {
    if (selectedSupplierId === 'all') return null;
    const supplier = (db.inkSuppliers || []).find((s) => s.id === selectedSupplierId);
    if (!supplier) return null;

    const purchases = (db.inkPurchases || [])
      .filter((p) => p.supplierId === selectedSupplierId)
      .sort((a, b) => (a.date > b.date ? 1 : -1));

    const payments = (db.inkSupplierPayments || [])
      .filter((p) => p.supplierId === selectedSupplierId)
      .sort((a, b) => (a.date > b.date ? 1 : -1));

    // Combine into chronological entries
    type LedgerRow = {
      id: string;
      date: string;
      type: 'purchase' | 'payment';
      description: string;
      unitInfo?: string;
      debitPurchase: number; // মালামাল ক্রয়
      creditPaid: number; // নগদ পরিশোধ
      carrier?: string;
      ref?: string;
    };

    const rows: LedgerRow[] = [];

    purchases.forEach((p) => {
      const paid = p.paymentType === 'cash' ? p.totalAmount : Number(p.paidAmount || 0);
      rows.push({
        id: p.id,
        date: p.date,
        type: 'purchase',
        description: `${p.itemName} (${p.quantity} ${p.unit} @ ৳${p.unitPrice})`,
        unitInfo: `${p.quantity} ${p.unit}`,
        debitPurchase: p.totalAmount,
        creditPaid: paid,
        carrier: p.carrierName,
        ref: p.invoiceOrChallanNo || (p.paymentType === 'cash' ? 'নগদ ক্রয়' : p.paymentType === 'partial' ? 'আংশিক পরিশোধ' : 'বাকি ক্রয়'),
      });
    });

    payments.forEach((pay) => {
      rows.push({
        id: pay.id,
        date: pay.date,
        type: 'payment',
        description: `বাকি পরিশোধ (${pay.paymentMethod})`,
        debitPurchase: 0,
        creditPaid: pay.amount,
        carrier: pay.carrierName,
        ref: pay.receiptNo ? `রসিদ নং: ${pay.receiptNo}` : 'বাকি পরিশোধ',
      });
    });

    rows.sort((a, b) => (a.date > b.date ? 1 : -1));

    let runningDue = Number(supplier.openingDue || 0);
    const rowsWithBalance = rows.map((r) => {
      runningDue = runningDue + r.debitPurchase - r.creditPaid;
      return {
        ...r,
        currentDue: runningDue,
      };
    });

    const totalDebit = rows.reduce((s, r) => s + r.debitPurchase, 0);
    const totalCredit = rows.reduce((s, r) => s + r.creditPaid, 0);
    const netBalanceDue = Number(supplier.openingDue || 0) + totalDebit - totalCredit;

    return {
      supplier,
      rows: rowsWithBalance,
      openingDue: Number(supplier.openingDue || 0),
      totalDebit,
      totalCredit,
      netBalanceDue,
    };
  }, [selectedSupplierId, db.inkSuppliers, db.inkPurchases, db.inkSupplierPayments]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Droplet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
                  কালির দোকান ও মালামাল ক্রয়ের খাতা
                </h1>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  ইনভেন্টরি ও লেজার
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                কালির দোকান, বিভিন্ন কেমিক্যাল ও প্রেস মালামাল ক্রয়, নগদ ও বাকি হিসাব ব্যবস্থাপনা
              </p>
            </div>
          </div>

          {isReadOnly ? (
            <div className="bg-amber-50 border border-amber-300 text-amber-800 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2">
              <span>🔒 শুধুমাত্র দেখার এক্সেস (Read-Only Mode)</span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => openPurchaseModal()}
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>মালামাল ক্রয় এন্ট্রি</span>
              </button>
              <button
                onClick={() => openPaymentModal()}
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 transition active:scale-95"
              >
                <DollarSign className="w-4 h-4" />
                <span>বাকি পরিশোধ</span>
              </button>
              <button
                onClick={() => openSupplierModal()}
                className="inline-flex items-center space-x-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition"
              >
                <Store className="w-4 h-4" />
                <span>নতুন দোকান যুক্ত করুন</span>
              </button>
            </div>
          )}
        </div>

        {/* 4 Overview Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-medium">মোট দোকান / সাপ্লায়ার</span>
              <Store className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-lg sm:text-2xl font-bold text-slate-800">
              {formatNumber(totalSuppliers)} টি
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-medium">চলতি মাসে ক্রয়</span>
              <ShoppingBag className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-lg sm:text-2xl font-bold text-blue-700">
              {formatCurrency(currentMonthPurchasesAmount)}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-medium">মোট মালামাল ক্রয়</span>
              <FileText className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-lg sm:text-2xl font-bold text-purple-700">
              {formatCurrency(totalPurchasesAmount)}
            </div>
          </div>

          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between text-rose-600 mb-1">
              <span className="text-xs font-semibold">দোকানদারদের মোট বকেয়া</span>
              <AlertCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-lg sm:text-2xl font-bold text-rose-700">
              {formatCurrency(totalNetDue)}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-4 pt-2 space-x-2 sm:space-x-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('purchases')}
          className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition flex items-center space-x-2 ${
            activeTab === 'purchases'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>মালামাল ক্রয়ের খাতা ({formatNumber(filteredPurchases.length)})</span>
        </button>

        <button
          onClick={() => setActiveTab('suppliers')}
          className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition flex items-center space-x-2 ${
            activeTab === 'suppliers'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>কালির দোকান তালিকা ({formatNumber((db.inkSuppliers || []).length)})</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition flex items-center space-x-2 ${
            activeTab === 'payments'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>বাকি পরিশোধের খাতা ({formatNumber((db.inkSupplierPayments || []).length)})</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition flex items-center space-x-2 ${
            activeTab === 'ledger'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>দোকান লেজার ও স্টেটমেন্ট</span>
        </button>
      </div>

      {/* TAB 1: PURCHASES LIST */}
      {activeTab === 'purchases' && (
        <div className="bg-white rounded-b-2xl p-4 sm:p-6 shadow-xs border border-t-0 border-slate-200 space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="flex flex-1 flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="মালামালের নাম, দোকান, চালান বা বাহকের নাম দিয়ে খুঁজুন..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-emerald-500"
                />
              </div>

              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white focus:outline-emerald-500"
              >
                <option value="all">সব কালির দোকান ({formatNumber((db.inkSuppliers || []).length)})</option>
                {(db.inkSuppliers || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                title="শুরুর তারিখ"
              />
              <span className="text-slate-400 text-xs">থেকে</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                title="শেষ তারিখ"
              />
              {(startDate || endDate || search || selectedSupplierId !== 'all') && (
                <button
                  onClick={() => {
                    setSearch('');
                    setSelectedSupplierId('all');
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="text-xs text-rose-600 hover:underline px-1"
                >
                  ফিল্টার মুছুন
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          {filteredPurchases.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Droplet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-600 text-sm font-semibold">কোনো মালামাল ক্রয়ের রেকর্ড পাওয়া যায়নি</p>
              <p className="text-slate-400 text-xs mt-1">
                উপরের &quot;মালামাল ক্রয় এন্ট্রি&quot; বাটনে ক্লিক করে নতুন মালামাল এন্ট্রি করুন
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-xl">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">তারিখ</th>
                    <th className="py-3 px-3">দোকানের নাম</th>
                    <th className="py-3 px-3">মালামালের নাম ও বিবরণ</th>
                    <th className="py-3 px-3 text-right">পরিমাণ</th>
                    <th className="py-3 px-3 text-right">দর (প্রতি একক)</th>
                    <th className="py-3 px-3 text-right">মোট টাকা</th>
                    <th className="py-3 px-3 text-center">পরিশোধের ধরন</th>
                    <th className="py-3 px-3 text-right">বাকি টাকা</th>
                    <th className="py-3 px-3">বাহক / মেমো নং</th>
                    {!isReadOnly && <th className="py-3 px-3 text-right">অ্যাকশন</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPurchases.map((purchase) => {
                    const paid =
                      purchase.paymentType === 'cash'
                        ? purchase.totalAmount
                        : Number(purchase.paidAmount || 0);
                    const due = Math.max(0, purchase.totalAmount - paid);

                    return (
                      <tr key={purchase.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 font-medium text-slate-600 whitespace-nowrap">
                          {formatDate(purchase.date)}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          {purchase.supplierName}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          <div>{purchase.itemName}</div>
                          {purchase.notes && (
                            <div className="text-[11px] text-slate-400 font-normal">{purchase.notes}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-700 whitespace-nowrap">
                          {formatNumber(purchase.quantity)} {purchase.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-700 whitespace-nowrap">
                          ৳{formatNumber(purchase.unitPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                          {formatCurrency(purchase.totalAmount)}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {purchase.paymentType === 'cash' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                              নগদ পরিশোধ
                            </span>
                          ) : purchase.paymentType === 'due' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                              পুরো বাকি
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                              আংশিক পরিশোধ (৳{formatNumber(paid)})
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold whitespace-nowrap">
                          {due > 0 ? (
                            <span className="text-rose-600">{formatCurrency(due)}</span>
                          ) : (
                            <span className="text-slate-400">০</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                          {purchase.carrierName && <div>বাহক: {purchase.carrierName}</div>}
                          {purchase.invoiceOrChallanNo && (
                            <div className="text-slate-400">মেমো: {purchase.invoiceOrChallanNo}</div>
                          )}
                          {!purchase.carrierName && !purchase.invoiceOrChallanNo && '-'}
                        </td>
                        {!isReadOnly && (
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() => openPurchaseModal(purchase)}
                                className="p-1 hover:bg-slate-200 rounded text-slate-600"
                                title="সম্পাদনা"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() =>
                                  setDeleteConfirm({
                                    isOpen: true,
                                    type: 'purchase',
                                    id: purchase.id,
                                    title: 'ক্রয় রেকর্ড মুছে ফেলুন',
                                    message: `আপনি কি "${purchase.itemName}" (${formatCurrency(purchase.totalAmount)}) এর ক্রয় রেকর্ড মুছে ফেলতে চান?`,
                                  })
                                }
                                className="p-1 hover:bg-rose-100 rounded text-rose-600"
                                title="মুছে ফেলুন"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SUPPLIERS LIST */}
      {activeTab === 'suppliers' && (
        <div className="bg-white rounded-b-2xl p-4 sm:p-6 shadow-xs border border-t-0 border-slate-200 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm sm:text-base font-bold text-slate-800">
              কালির দোকান ও সরবরাহকারীদের তালিকা ও বর্তমান বকেয়া
            </h3>
            {!isReadOnly && (
              <button
                onClick={() => openSupplierModal()}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>নতুন দোকান যুক্ত করুন</span>
              </button>
            )}
          </div>

          {(db.inkSuppliers || []).length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Store className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-600 text-sm font-semibold">কোনো কালির দোকান যুক্ত করা হয়নি</p>
              <p className="text-slate-400 text-xs mt-1">
                দোকানের নাম ও পূর্বের বাকি থাকলে তা দিয়ে নতুন দোকান যুক্ত করুন
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(db.inkSuppliers || []).map((supplier) => {
                const balanceDue = getInkSupplierBalance(supplier.id);
                const supplierPurchases = (db.inkPurchases || []).filter(
                  (p) => p.supplierId === supplier.id
                );
                const totalBought = supplierPurchases.reduce((s, p) => s + Number(p.totalAmount || 0), 0);

                return (
                  <div
                    key={supplier.id}
                    className="bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-2xl p-4 transition flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                            <Store className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{supplier.name}</h4>
                            {supplier.proprietor && (
                              <p className="text-[11px] text-slate-500">প্রোপ্রাইটর: {supplier.proprietor}</p>
                            )}
                          </div>
                        </div>

                        {!isReadOnly && (
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => openSupplierModal(supplier)}
                              className="p-1 hover:bg-white rounded text-slate-500"
                              title="সম্পাদনা"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteConfirm({
                                  isOpen: true,
                                  type: 'supplier',
                                  id: supplier.id,
                                  title: 'দোকান মুছে ফেলুন',
                                  message: `আপনি কি "${supplier.name}" মুছে ফেলতে চান? এতে এই দোকানের সমস্ত মালামাল ক্রয়ের রেকর্ডও মুছে যাবে!`,
                                })
                              }
                              className="p-1 hover:bg-rose-100 rounded text-rose-600"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 space-y-1 text-xs text-slate-600">
                        {supplier.phone && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400">মোবাইল:</span>
                            <PhoneLink phone={supplier.phone} />
                          </div>
                        )}
                        {supplier.address && (
                          <div className="flex items-start gap-1.5">
                            <span className="text-slate-400">ঠিকানা:</span>
                            <span className="truncate">{supplier.address}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[11px]">পূর্বের বাকি</span>
                          <span className="font-bold text-slate-700">
                            {formatCurrency(supplier.openingDue || 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">মোট মালামাল ক্রয়</span>
                          <span className="font-bold text-slate-800">{formatCurrency(totalBought)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-slate-400 block">বর্তমান নিট বকেয়া</span>
                        <span
                          className={`text-base font-bold ${
                            balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {formatCurrency(balanceDue)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!isReadOnly && (
                          <button
                            onClick={() => openPaymentModal(supplier.id)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition"
                          >
                            পরিশোধ
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedSupplierId(supplier.id);
                            setActiveTab('ledger');
                          }}
                          className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition"
                        >
                          লেজার
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PAYMENTS LIST */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-b-2xl p-4 sm:p-6 shadow-xs border border-t-0 border-slate-200 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm sm:text-base font-bold text-slate-800">
              কালির দোকানে বাকি পরিশোধের খাতা
            </h3>
            {!isReadOnly && (
              <button
                onClick={() => openPaymentModal()}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>বাকি পরিশোধ এন্ট্রি</span>
              </button>
            )}
          </div>

          {(db.inkSupplierPayments || []).length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-600 text-sm font-semibold">কোনো বাকি পরিশোধের রেকর্ড পাওয়া যায়নি</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-xl">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">তারিখ</th>
                    <th className="py-3 px-3">দোকানের নাম</th>
                    <th className="py-3 px-3 text-right">পরিশোধের পরিমাণ</th>
                    <th className="py-3 px-3">পরিশোধের মাধ্যম</th>
                    <th className="py-3 px-3">কার মাধ্যমে পাঠানো হলো</th>
                    <th className="py-3 px-3">রসিদ / মেমো রেফারেন্স</th>
                    <th className="py-3 px-3">মন্তব্য</th>
                    {!isReadOnly && <th className="py-3 px-3 text-right">অ্যাকশন</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(db.inkSupplierPayments || []).map((pay) => (
                    <tr key={pay.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-medium text-slate-600 whitespace-nowrap">
                        {formatDate(pay.date)}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{pay.supplierName}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                        {formatCurrency(pay.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{pay.paymentMethod}</td>
                      <td className="py-2.5 px-3 text-slate-700">{pay.carrierName || '-'}</td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono">{pay.receiptNo || '-'}</td>
                      <td className="py-2.5 px-3 text-slate-500">{pay.notes || '-'}</td>
                      {!isReadOnly && (
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() =>
                              setDeleteConfirm({
                                isOpen: true,
                                type: 'payment',
                                id: pay.id,
                                title: 'পরিশোধ রেকর্ড মুছে ফেলুন',
                                message: `আপনি কি ${pay.supplierName} এর ${formatCurrency(pay.amount)} পরিশোধের রেকর্ড মুছে ফেলতে চান?`,
                              })
                            }
                            className="p-1 hover:bg-rose-100 rounded text-rose-600"
                            title="মুছে ফেলুন"
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
        </div>
      )}

      {/* TAB 4: LEDGER & STATEMENT */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-b-2xl p-4 sm:p-6 shadow-xs border border-t-0 border-slate-200 space-y-6">
          {/* Top selection bar */}
          <div className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <label htmlFor="ink-ledger-shop-select" className="text-xs font-bold text-slate-700 whitespace-nowrap">
                দোকান নির্বাচন করুন:
              </label>
              <select
                id="ink-ledger-shop-select"
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full sm:w-64 px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm bg-white font-medium focus:outline-emerald-500"
              >
                <option value="all">-- একটি কালির দোকান নির্বাচন করুন --</option>
                {(db.inkSuppliers || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {ledgerData && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => triggerPrint()}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>স্টেটমেন্ট প্রিন্ট করুন</span>
                </button>
              </div>
            )}
          </div>

          {!ledgerData ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-600 text-sm font-semibold">কোনো দোকান নির্বাচন করা হয়নি</p>
              <p className="text-slate-400 text-xs mt-1">
                উপরের ড্রপডাউন থেকে কালির দোকান নির্বাচন করে বিস্তারিত লেজার দেখুন
              </p>
            </div>
          ) : (
            <div className="printable-statement space-y-4">
              {/* Printable Header */}
              <PrintHeader
                title={`কালির দোকান হিসাব ও স্টেটমেন্ট: ${ledgerData.supplier.name}`}
                subtitle={`ঠিকানা: ${ledgerData.supplier.address || 'বাংলাবাজার, ঢাকা'} | মোবাইল: ${ledgerData.supplier.phone || '-'}`}
              />

              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 text-xs block">পূর্বের বাকি (Opening Due)</span>
                  <span className="text-sm sm:text-base font-bold text-slate-800">
                    {formatCurrency(ledgerData.openingDue)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-xs block">মোট মালামাল ক্রয়</span>
                  <span className="text-sm sm:text-base font-bold text-blue-700">
                    {formatCurrency(ledgerData.totalDebit)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-xs block">মোট নগদ পরিশোধ</span>
                  <span className="text-sm sm:text-base font-bold text-emerald-700">
                    {formatCurrency(ledgerData.totalCredit)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-xs block">বর্তমান নিট বকেয়া</span>
                  <span
                    className={`text-sm sm:text-base font-bold ${
                      ledgerData.netBalanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {formatCurrency(ledgerData.netBalanceDue)}
                  </span>
                </div>
              </div>

              {/* Ledger Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-xl">
                  <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">তারিখ</th>
                      <th className="py-2.5 px-3">বিবরণ (মালামাল / ট্রানজেকশন)</th>
                      <th className="py-2.5 px-3">বাহক / মেমো নং</th>
                      <th className="py-2.5 px-3 text-right">ক্রয় (ডেবিট)</th>
                      <th className="py-2.5 px-3 text-right">পরিশোধ (ক্রেডিট)</th>
                      <th className="py-2.5 px-3 text-right font-bold">চলতি বকেয়া (Balance Due)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledgerData.openingDue > 0 && (
                      <tr className="bg-amber-50/50">
                        <td className="py-2 px-3 font-medium text-slate-500">-</td>
                        <td className="py-2 px-3 font-bold text-slate-700" colSpan={2}>
                          পূর্বের প্রারম্ভিক বাকি (Opening Due)
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-700">
                          {formatCurrency(ledgerData.openingDue)}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-400">০</td>
                        <td className="py-2 px-3 text-right font-bold text-rose-600">
                          {formatCurrency(ledgerData.openingDue)}
                        </td>
                      </tr>
                    )}

                    {ledgerData.rows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          এই দোকানের কোনো ক্রয় বা পরিশোধের হিসাব নেই
                        </td>
                      </tr>
                    ) : (
                      ledgerData.rows.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-medium text-slate-600 whitespace-nowrap">
                            {formatDate(row.date)}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {row.description}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {row.carrier && <span className="mr-1">বাহক: {row.carrier}</span>}
                            {row.ref && <span className="text-slate-400">({row.ref})</span>}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                            {row.debitPurchase > 0 ? formatCurrency(row.debitPurchase) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-emerald-700 whitespace-nowrap">
                            {row.creditPaid > 0 ? formatCurrency(row.creditPaid) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                            {formatCurrency(row.currentDue)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={3} className="py-3 px-3 text-right">
                        সর্বমোট যোগফল:
                      </td>
                      <td className="py-3 px-3 text-right text-slate-900">
                        {formatCurrency(ledgerData.totalDebit + ledgerData.openingDue)}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-700">
                        {formatCurrency(ledgerData.totalCredit)}
                      </td>
                      <td className="py-3 px-3 text-right text-rose-700 text-sm">
                        {formatCurrency(ledgerData.netBalanceDue)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Signatures for Print */}
              <PrintSignatures />
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 1: ADD / EDIT INK PURCHASE (WITH AUTOCOMPLETE) */}
      {/* ==================================================== */}
      {isPurchaseModalOpen && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Droplet className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-800">
                  {editingPurchase ? 'মালামাল ক্রয় এন্ট্রি সম্পাদনা' : 'নতুন কালি ও প্রেস মালামাল ক্রয় এন্ট্রি'}
                </h3>
              </div>
              <button
                onClick={() => setIsPurchaseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="space-y-4 text-xs">
              {/* Notice for continuous entries */}
              {lastSavedNotice && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-3.5 py-2.5 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold">{lastSavedNotice}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLastSavedNotice(null)}
                    className="text-emerald-600 hover:text-emerald-800 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Row 1: Supplier & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">কালির দোকান / সরবরাহকারী *</label>
                  <select
                    value={purchaseForm.supplierId}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierId: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:outline-emerald-500"
                  >
                    <option value="">-- দোকান নির্বাচন করুন --</option>
                    {(db.inkSuppliers || []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">তারিখ *</label>
                  <input
                    type="date"
                    value={purchaseForm.date}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, date: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-emerald-500"
                  />
                </div>
              </div>

              {/* Row 2: Item Name with Autocomplete */}
              <div className="relative" ref={autocompleteRef}>
                <label className="block text-slate-700 font-bold mb-1">
                  মালামালের বিবরণ / কালির নাম *
                  <span className="text-[11px] font-normal text-slate-400 ml-1">
                    (লিখলে পূর্বের বা স্ট্যান্ডার্ড নাম স্বয়ংক্রিয় ভেসে উঠবে)
                  </span>
                </label>
                <input
                  ref={itemNameInputRef}
                  type="text"
                  placeholder="যেমন: সান ব্ল্যাক কালি, ডিসি ওয়াশ, আইপিএ, রেড রিডিউসার..."
                  value={purchaseForm.itemName}
                  onChange={(e) => {
                    setPurchaseForm({ ...purchaseForm, itemName: e.target.value });
                    setShowItemSuggestions(true);
                  }}
                  onFocus={() => setShowItemSuggestions(true)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:outline-emerald-500"
                />

                {/* Autocomplete Dropdown */}
                {showItemSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-100">
                    <div className="p-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-bold bg-slate-50">
                      সাজেশন (ক্লিক করে নির্বাচন করুন):
                    </div>
                    {filteredSuggestions.map((item) => (
                      <button
                        type="button"
                        key={item}
                        onClick={() => {
                          setPurchaseForm({ ...purchaseForm, itemName: item });
                          setShowItemSuggestions(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-emerald-50 hover:text-emerald-700 text-xs font-medium text-slate-700 transition flex items-center justify-between"
                      >
                        <span>{item}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Row 3: Unit, Quantity, Rate */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">একক / পরিমাপ *</label>
                  <select
                    value={purchaseForm.unit}
                    onChange={(e) =>
                      setPurchaseForm({ ...purchaseForm, unit: e.target.value as PurchaseUnit })
                    }
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl bg-white font-medium focus:outline-emerald-500"
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">পরিমাণ *</label>
                  <SmartNumberInput
                    min={0}
                    value={purchaseForm.quantity}
                    onValueChange={(v) => setPurchaseForm({ ...purchaseForm, quantity: v })}
                    required
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl font-bold text-right focus:outline-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">দর (প্রতি একক) *</label>
                  <SmartNumberInput
                    min={0}
                    value={purchaseForm.unitPrice}
                    onValueChange={(v) => setPurchaseForm({ ...purchaseForm, unitPrice: v })}
                    required
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl font-bold text-right focus:outline-emerald-500"
                  />
                </div>
              </div>

              {/* Calculated Total Bar */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                <span className="text-emerald-900 font-bold">
                  মোট ক্রয় মূল্য ({formatNumber(purchaseForm.quantity)} {purchaseForm.unit} × ৳{formatNumber(purchaseForm.unitPrice)}):
                </span>
                <span className="text-base sm:text-lg font-bold text-emerald-800">
                  {formatCurrency(Math.round(purchaseForm.quantity * purchaseForm.unitPrice))}
                </span>
              </div>

              {/* Row 4: Payment Type (নগদ না বাকি) */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <label className="block text-slate-700 font-bold">পরিশোধের অবস্থা (বাকি না নগদ) *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPurchaseForm({ ...purchaseForm, paymentType: 'due', paidAmount: 0 })}
                    className={`py-2 px-2 text-center rounded-xl font-bold border transition ${
                      purchaseForm.paymentType === 'due'
                        ? 'bg-rose-50 border-rose-500 text-rose-700'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    পুরো বাকি (Due)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const total = Math.round(purchaseForm.quantity * purchaseForm.unitPrice);
                      setPurchaseForm({ ...purchaseForm, paymentType: 'cash', paidAmount: total });
                    }}
                    className={`py-2 px-2 text-center rounded-xl font-bold border transition ${
                      purchaseForm.paymentType === 'cash'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    নগদ পরিশোধ (Cash)
                  </button>

                  <button
                    type="button"
                    onClick={() => setPurchaseForm({ ...purchaseForm, paymentType: 'partial' })}
                    className={`py-2 px-2 text-center rounded-xl font-bold border transition ${
                      purchaseForm.paymentType === 'partial'
                        ? 'bg-amber-50 border-amber-500 text-amber-700'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    আংশিক নগদ (Partial)
                  </button>
                </div>
              </div>

              {/* If Partial, enter paid amount */}
              {purchaseForm.paymentType === 'partial' && (
                <div className="grid grid-cols-2 gap-3 bg-amber-50/50 p-3 rounded-xl border border-amber-200">
                  <div>
                    <label className="block text-amber-900 font-bold mb-1">এখন কত টাকা পরিশোধ করলেন?</label>
                    <SmartNumberInput
                      min={0}
                      max={Math.round(purchaseForm.quantity * purchaseForm.unitPrice)}
                      value={purchaseForm.paidAmount}
                      onValueChange={(v) => setPurchaseForm({ ...purchaseForm, paidAmount: v })}
                      required
                      className="w-full px-3 py-2 border border-amber-300 rounded-xl font-bold text-right bg-white"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <span className="text-[11px] text-slate-500">বাকি থাকবে:</span>
                    <span className="text-sm font-bold text-rose-600">
                      {formatCurrency(
                        Math.max(
                          0,
                          Math.round(purchaseForm.quantity * purchaseForm.unitPrice) -
                            (purchaseForm.paidAmount || 0)
                        )
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Row 5: Carrier (কালি কে নিয়ে আসলো) & Invoice/Challan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    কালি কে নিয়ে আসলো / বাহকের নাম (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    placeholder="যেমন: হেলপার রফিক, কর্মচারী সুমন, স্বয়ং..."
                    value={purchaseForm.carrierName}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, carrierName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    চালান / ইনভয়েস / মেমো নম্বর (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    placeholder="যেমন: MEMO-1029"
                    value={purchaseForm.invoiceOrChallanNo}
                    onChange={(e) =>
                      setPurchaseForm({ ...purchaseForm, invoiceOrChallanNo: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-emerald-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">মন্তব্য (ঐচ্ছিক)</label>
                <input
                  type="text"
                  placeholder="অন্য কোনো তথ্য বা বিবরণ..."
                  value={purchaseForm.notes}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-emerald-500"
                />
              </div>

              {/* Continuous Entry Toggle */}
              {!editingPurchase && (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={keepDialogOpen}
                      onChange={(e) => setKeepDialogOpen(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      পরপর একাধিক মালামাল এন্ট্রি করতে ডায়ালগ বক্স খোলা রাখুন
                    </span>
                  </label>
                  <span className="text-[11px] text-slate-500 hidden sm:inline">
                    (দোকান, তারিখ ও মেমো অপরিবর্তিত থাকবে)
                  </span>
                </div>
              )}

              {/* Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsPurchaseModalOpen(false);
                    setLastSavedNotice(null);
                  }}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-bold"
                >
                  {editingPurchase ? 'বাতিল' : 'বন্ধ করুন'}
                </button>
                <div className="flex items-center space-x-2">
                  {!editingPurchase && (
                    <button
                      type="button"
                      onClick={(e) => handleSavePurchase(e, false)}
                      className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl font-bold transition flex items-center space-x-1"
                      title="এই মালামাল সেভ করে পরেরটি লিখতে ডায়ালগ খোলা থাকবে"
                    >
                      <Plus className="w-4 h-4" />
                      <span>সংরক্ষণ ও আরও যোগ করুন</span>
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 transition"
                  >
                    {editingPurchase ? 'আপডেট করুন' : 'সংরক্ষণ ও শেষ করুন'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: ADD / EDIT INK SUPPLIER                     */}
      {/* ==================================================== */}
      {isSupplierModalOpen && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Store className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-800">
                  {editingSupplier ? 'কালির দোকান তথ্য সম্পাদনা' : 'নতুন কালির দোকান যুক্ত করুন'}
                </h3>
              </div>
              <button
                onClick={() => setIsSupplierModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">কালির দোকানের নাম *</label>
                <input
                  type="text"
                  placeholder="যেমন: নিউ ঢাকা কালির ঘর, ভাই ভাই কালির দোকান..."
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">স্বত্বাধিকারী / ব্যক্তির নাম</label>
                <input
                  type="text"
                  placeholder="যেমন: হাজী মো. আনোয়ার হোসেন"
                  value={supplierForm.proprietor}
                  onChange={(e) => setSupplierForm({ ...supplierForm, proprietor: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">মোবাইল নম্বর</label>
                  <input
                    type="text"
                    placeholder="০১৭xxxxxxxx"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    পূর্বের বাকি (Opening Due)
                  </label>
                  <SmartNumberInput
                    min={0}
                    placeholder="০"
                    value={supplierForm.openingDue}
                    onValueChange={(v) => setSupplierForm({ ...supplierForm, openingDue: v })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-right focus:outline-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">ঠিকানা</label>
                <input
                  type="text"
                  placeholder="যেমন: ৩৭/২ বাংলাবাজার রোড, ঢাকা"
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">মন্তব্য</label>
                <input
                  type="text"
                  placeholder="অন্য কোনো তথ্য..."
                  value={supplierForm.notes}
                  onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-bold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20"
                >
                  {editingSupplier ? 'আপডেট করুন' : 'দোকান যুক্ত করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 3: ADD INK PAYMENT (বাকি পরিশোধ)                 */}
      {/* ==================================================== */}
      {isPaymentModalOpen && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-800">কালির দোকান বাকি পরিশোধ</h3>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">কালির দোকান নির্বাচন করুন *</label>
                <select
                  value={paymentForm.supplierId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, supplierId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:outline-blue-500"
                >
                  <option value="">-- দোকান নির্বাচন করুন --</option>
                  {(db.inkSuppliers || []).map((s) => {
                    const due = getInkSupplierBalance(s.id);
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name} (বকেয়া: {formatCurrency(due)})
                      </option>
                    );
                  })}
                </select>
              </div>

              {paymentForm.supplierId && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-rose-900 font-medium">বর্তমানে মোট বকেয়া:</span>
                  <span className="font-bold text-rose-700 text-base">
                    {formatCurrency(getInkSupplierBalance(paymentForm.supplierId))}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">তারিখ *</label>
                  <input
                    type="date"
                    value={paymentForm.date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">পরিশোধের পরিমাণ *</label>
                  <SmartNumberInput
                    min={0}
                    placeholder="৳ ০"
                    value={paymentForm.amount}
                    onValueChange={(v) => setPaymentForm({ ...paymentForm, amount: v })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-right text-emerald-700 focus:outline-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">পরিশোধের মাধ্যম</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-blue-500"
                  >
                    <option value="নগদ">নগদ (Cash)</option>
                    <option value="বিকাশ">বিকাশ (bKash)</option>
                    <option value="নগদ ডিজিটাল">নগদ (Nagad App)</option>
                    <option value="রকেট">রকেট (Rocket)</option>
                    <option value="ব্যাংক চেক">ব্যাংক চেক (Cheque)</option>
                    <option value="ব্যাংক ট্রান্সফার">ব্যাংক ট্রান্সফার</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">কার মাধ্যমে দেওয়া হলো</label>
                  <input
                    type="text"
                    placeholder="যেমন: মো. সুমন"
                    value={paymentForm.carrierName}
                    onChange={(e) => setPaymentForm({ ...paymentForm, carrierName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  রসিদ বা মানি রিসিট নম্বর (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: MR-5049"
                  value={paymentForm.receiptNo}
                  onChange={(e) => setPaymentForm({ ...paymentForm, receiptNo: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">মন্তব্য</label>
                <input
                  type="text"
                  placeholder="অন্য কোনো বিবরণ..."
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-bold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-600/20"
                >
                  পরিশোধ এন্ট্রি করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.title}
        message={deleteConfirm.message}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
