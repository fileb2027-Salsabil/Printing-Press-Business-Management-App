import React, { useMemo, useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { InkOrderSlip, InkOrderSlipItem, PurchaseUnit } from '../../types';
import { formatCurrency, formatDate, formatNumber } from '../../utils/calculations';
import { PrintHeader, triggerPrint } from '../common/PrintHeader';
import { ConfirmModal } from '../common/ConfirmModal';
import { SmartNumberInput } from '../common/SmartNumberInput';
import {
  Droplet,
  Plus,
  Search,
  Printer,
  FileDown,
  Edit2,
  Trash2,
  ArrowLeft,
  Store,
  CheckCircle2,
  AlertCircle,
  X,
  Check,
  Clock,
  DollarSign,
  ShoppingBag,
  Layers,
} from 'lucide-react';

const UNIT_OPTIONS: { value: PurchaseUnit; label: string }[] = [
  { value: 'কেজি', label: 'কেজি (Kg)' },
  { value: 'টিন', label: 'টিন (Tin)' },
  { value: 'পিস', label: 'পিস (Pcs)' },
  { value: 'পাউন্ড', label: 'পাউন্ড (Pound)' },
  { value: 'লিটার', label: 'লিটার (Liter)' },
  { value: 'ইঞ্চি', label: 'ইঞ্চি (Inch)' },
  { value: 'ফিট', label: 'ফিট (Feet)' },
  { value: 'রোল', label: 'রোল (Roll)' },
  { value: 'কার্টন', label: 'কার্টন (Carton)' },
  { value: 'গ্যালন', label: 'গ্যালন (Gallon)' },
  { value: 'বোতল', label: 'বোতল (Bottle)' },
  { value: 'সেট', label: 'সেট (Set)' },
  { value: 'অন্যান্য', label: 'অন্যান্য' },
];

const STATUS_CONFIG: Record<
  InkOrderSlip['status'],
  { label: string; badgeClass: string }
> = {
  pending: {
    label: 'অপেক্ষমাণ (Pending)',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  sent: {
    label: 'দোকানে প্রেরিত (Sent)',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  received_priced: {
    label: 'মালামাল ও দর প্রাপ্ত',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
};

export const InkOrderSlipManager: React.FC = () => {
  const {
    db,
    isReadOnly,
    addInkSupplier,
    addInkPurchase,
    getKnownInkItems,
    addInkOrderSlip,
    updateInkOrderSlip,
    deleteInkOrderSlip,
  } = useDatabase();

  const lang = db.settings.language;
  const numFmt = db.settings.numberFormat;
  const today = new Date().toISOString().split('T')[0];
  const inkOrderSlips = db.inkOrderSlips || [];
  const knownItems = useMemo(() => getKnownInkItems(), [getKnownInkItems]);

  // View State
  const [selectedSlipPrint, setSelectedSlipPrint] = useState<InkOrderSlip | null>(null);
  const [includePriceInPrint, setIncludePriceInPrint] = useState<boolean>(true);
  const [isBuilderOpen, setIsBuilderOpen] = useState<boolean>(false);
  const [editingSlip, setEditingSlip] = useState<InkOrderSlip | null>(null);
  const [slipToDelete, setSlipToDelete] = useState<InkOrderSlip | null>(null);

  // List filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InkOrderSlip['status']>('all');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Slip Builder Header State
  const [slipNo, setSlipNo] = useState('');
  const [orderDate, setOrderDate] = useState(today);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const [carrierName, setCarrierName] = useState('');
  const [slipStatus, setSlipStatus] = useState<InkOrderSlip['status']>('pending');
  const [slipNotes, setSlipNotes] = useState('');
  const [slipItems, setSlipItems] = useState<InkOrderSlipItem[]>([]);

  // Inline New Supplier Mini-Form
  const [showNewSupplierBox, setShowNewSupplierBox] = useState(false);
  const [newSupplierForm, setNewSupplierForm] = useState({
    name: '',
    proprietor: '',
    phone: '',
    address: '',
  });

  // Item Builder State (Unit price strictly OPTIONAL!)
  const [itemName, setItemName] = useState('');
  const [isItemDropdownOpen, setIsItemDropdownOpen] = useState(false);
  const [itemUnit, setItemUnit] = useState<PurchaseUnit>('কেজি');
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemUnitPrice, setItemUnitPrice] = useState<string>(''); // empty = not priced yet
  const [itemNotes, setItemNotes] = useState('');

  // Post-delivery Rate Entry Modal State
  const [pricingSlip, setPricingSlip] = useState<InkOrderSlip | null>(null);
  const [pricingValues, setPricingValues] = useState<Record<string, string>>({});
  const [postToLedger, setPostToLedger] = useState<boolean>(true);
  const [paymentType, setPaymentType] = useState<'due' | 'cash' | 'partial'>('due');
  const [paidAmount, setPaidAmount] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<string>('নগদ');
  const [invoiceNo, setInvoiceNo] = useState<string>('');
  const [pricingError, setPricingError] = useState<string>('');

  const selectedSupplier = useMemo(
    () => (db.inkSuppliers || []).find((s) => s.id === selectedSupplierId) || null,
    [db.inkSuppliers, selectedSupplierId]
  );

  const slipTotals = useMemo(() => {
    return slipItems.reduce(
      (acc, it) => {
        const rate = Number(it.unitPrice || 0);
        const total = rate > 0 ? Math.round(rate * (it.quantity || 0)) : 0;
        return {
          totalItems: acc.totalItems + 1,
          totalEstimatedAmount: acc.totalEstimatedAmount + total,
        };
      },
      { totalItems: 0, totalEstimatedAmount: 0 }
    );
  }, [slipItems]);

  const resetItemBuilder = () => {
    setItemName('');
    setIsItemDropdownOpen(false);
    setItemUnit('কেজি');
    setItemQuantity(1);
    setItemUnitPrice('');
    setItemNotes('');
  };

  const handleStartNewSlip = () => {
    if (isReadOnly) return;
    setEditingSlip(null);
    setSlipNo(`INK-${inkOrderSlips.length + 101}`);
    setOrderDate(today);
    setDeliveryDate('');
    setSelectedSupplierId('');
    setSupplierSearch('');
    setIsSupplierDropdownOpen(false);
    setCarrierName('');
    setSlipStatus('pending');
    setSlipNotes('');
    setSlipItems([]);
    setShowNewSupplierBox(false);
    setErrorMsg('');
    setSuccessMsg('');
    resetItemBuilder();
    setIsBuilderOpen(true);
  };

  const handleEditSlip = (slip: InkOrderSlip) => {
    if (isReadOnly) return;
    setEditingSlip(slip);
    setSlipNo(slip.slipNo);
    setOrderDate(slip.date);
    setDeliveryDate(slip.deliveryDate || '');
    setSelectedSupplierId(slip.supplierId);
    setSupplierSearch(slip.supplierName);
    setIsSupplierDropdownOpen(false);
    setCarrierName(slip.carrierName || '');
    setSlipStatus(slip.status || 'pending');
    setSlipNotes(slip.notes || '');
    setSlipItems(slip.items || []);
    setShowNewSupplierBox(false);
    setErrorMsg('');
    setSuccessMsg('');
    resetItemBuilder();
    setIsBuilderOpen(true);
  };

  const handleSelectSupplier = (supplierId: string) => {
    const sup = (db.inkSuppliers || []).find((s) => s.id === supplierId);
    if (!sup) return;
    setSelectedSupplierId(sup.id);
    setSupplierSearch(sup.name);
    setIsSupplierDropdownOpen(false);
    setShowNewSupplierBox(false);
    setErrorMsg('');
  };

  const handleSaveInlineSupplier = () => {
    if (isReadOnly) return;
    if (!newSupplierForm.name.trim()) {
      setErrorMsg('নতুন কালির দোকানের নাম লিখুন।');
      return;
    }
    const created = addInkSupplier({
      name: newSupplierForm.name.trim(),
      proprietor: newSupplierForm.proprietor.trim() || undefined,
      phone: newSupplierForm.phone.trim() || undefined,
      address: newSupplierForm.address.trim() || undefined,
      openingDue: 0,
      isActive: true,
    });
    if (created?.id) {
      setSelectedSupplierId(created.id);
      setSupplierSearch(created.name);
      setShowNewSupplierBox(false);
      setNewSupplierForm({ name: '', proprietor: '', phone: '', address: '' });
      setSuccessMsg(`নতুন কালির দোকান "${created.name}" সংরক্ষিত ও নির্বাচিত হয়েছে!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const handleAddItem = () => {
    setErrorMsg('');
    if (!itemName.trim()) {
      setErrorMsg('কালি বা মালামালের নাম লিখুন।');
      return;
    }
    const qty = Number(itemQuantity);
    if (!qty || qty <= 0) {
      setErrorMsg('সঠিক পরিমাণ লিখুন।');
      return;
    }
    const parsedPrice = itemUnitPrice.trim() !== '' ? Number(itemUnitPrice) : undefined;
    const validPrice =
      parsedPrice !== undefined && !Number.isNaN(parsedPrice) && parsedPrice > 0
        ? parsedPrice
        : undefined;

    const newItem: InkOrderSlipItem = {
      id: `ink_it_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      itemName: itemName.trim(),
      unit: itemUnit,
      quantity: qty,
      unitPrice: validPrice,
      totalAmount: validPrice ? Math.round(validPrice * qty) : undefined,
      notes: itemNotes.trim() || undefined,
    };

    setSlipItems((prev) => [...prev, newItem]);
    resetItemBuilder();
  };

  const handleUpdateSlipItemField = (
    itemId: string,
    field: 'quantity' | 'unitPrice',
    rawVal: string
  ) => {
    setSlipItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        if (field === 'quantity') {
          const qty = Math.max(0.01, parseFloat(rawVal) || 1);
          const rate = Number(it.unitPrice || 0);
          return {
            ...it,
            quantity: qty,
            totalAmount: rate > 0 ? Math.round(rate * qty) : undefined,
          };
        } else {
          const trimmed = rawVal.trim();
          const rate = trimmed === '' ? undefined : Math.max(0, parseFloat(trimmed) || 0);
          const validRate = rate && rate > 0 ? rate : undefined;
          return {
            ...it,
            unitPrice: validRate,
            totalAmount: validRate ? Math.round(validRate * it.quantity) : undefined,
          };
        }
      })
    );
  };

  const handleRemoveSlipItem = (itemId: string) => {
    setSlipItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  const handleSaveOrderSlip = (openPrintAfter: boolean) => {
    if (isReadOnly) return;
    setErrorMsg('');

    const finalSupplierId = selectedSupplierId;
    const finalSupplierName = selectedSupplier?.name || supplierSearch.trim();
    if (!finalSupplierName) {
      setErrorMsg('অনুগ্রহ করে কালির দোকানের নাম নির্বাচন করুন বা নতুন দোকান যোগ করুন।');
      return;
    }

    if (slipItems.length === 0) {
      setErrorMsg('অনুগ্রহ করে কমপক্ষে ১টি কালি বা মালামাল তালিকায় যোগ করুন।');
      return;
    }

    const hasAllRates =
      slipItems.length > 0 && slipItems.every((it) => Number(it.unitPrice || 0) > 0);
    const resolvedStatus: InkOrderSlip['status'] =
      hasAllRates && slipStatus === 'pending' ? 'received_priced' : slipStatus;

    const payload: Omit<InkOrderSlip, 'id' | 'createdAt' | 'updatedAt'> = {
      slipNo: slipNo.trim() || `INK-${inkOrderSlips.length + 101}`,
      date: orderDate || today,
      deliveryDate: deliveryDate || undefined,
      supplierId: finalSupplierId || `custom_${Date.now()}`,
      supplierName: finalSupplierName,
      supplierPhone: selectedSupplier?.phone,
      supplierAddress: selectedSupplier?.address,
      carrierName: carrierName.trim() || undefined,
      status: resolvedStatus,
      items: slipItems,
      totalItems: slipTotals.totalItems,
      totalEstimatedAmount: slipTotals.totalEstimatedAmount,
      postedToPurchases: editingSlip?.postedToPurchases || false,
      notes: slipNotes.trim() || undefined,
    };

    let savedSlip: InkOrderSlip;
    if (editingSlip) {
      updateInkOrderSlip(editingSlip.id, payload);
      savedSlip = { ...editingSlip, ...payload, updatedAt: new Date().toISOString() };
    } else {
      savedSlip = addInkOrderSlip(payload);
    }

    setIsBuilderOpen(false);
    setEditingSlip(null);

    if (openPrintAfter) {
      const hasRate = savedSlip.items.some((i) => Number(i.unitPrice || 0) > 0);
      setIncludePriceInPrint(hasRate);
      setSelectedSlipPrint(savedSlip);
    } else {
      setSuccessMsg(`কালির দোকান অর্ডার স্লিপ "${savedSlip.slipNo}" সংরক্ষিত হয়েছে!`);
      setTimeout(() => setSuccessMsg(''), 3500);
    }
  };

  // Open Post-Delivery Rate Entry Modal
  const handleOpenPricingModal = (slip: InkOrderSlip) => {
    if (isReadOnly) return;
    const initialMap: Record<string, string> = {};
    (slip.items || []).forEach((it) => {
      initialMap[it.id] =
        it.unitPrice && it.unitPrice > 0 ? String(it.unitPrice) : '';
    });
    setPricingSlip(slip);
    setPricingValues(initialMap);
    setPostToLedger(!slip.postedToPurchases);
    setPaymentType('due');
    setPaidAmount('0');
    setPaymentMethod('নগদ');
    setInvoiceNo(slip.slipNo);
    setPricingError('');
  };

  const pricingGrandTotal = useMemo(() => {
    if (!pricingSlip) return 0;
    return (pricingSlip.items || []).reduce((sum, it) => {
      const rate = parseFloat(pricingValues[it.id] || '0') || 0;
      return sum + Math.round(rate * (it.quantity || 0));
    }, 0);
  }, [pricingSlip, pricingValues]);

  const handleSavePostDeliveryPricing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pricingSlip || isReadOnly) return;
    setPricingError('');

    const updatedItems: InkOrderSlipItem[] = (pricingSlip.items || []).map((it) => {
      const raw = (pricingValues[it.id] || '').trim();
      const rate = raw === '' ? undefined : Math.max(0, parseFloat(raw) || 0);
      const validRate = rate && rate > 0 ? rate : undefined;
      return {
        ...it,
        unitPrice: validRate,
        totalAmount: validRate ? Math.round(validRate * it.quantity) : undefined,
      };
    });

    const newTotal = updatedItems.reduce(
      (s, it) => s + Number(it.totalAmount || 0),
      0
    );

    if (postToLedger && !pricingSlip.postedToPurchases) {
      const anyPriced = updatedItems.some((it) => Number(it.unitPrice || 0) > 0);
      if (!anyPriced) {
        setPricingError(
          'কালির মূল খাতায় যুক্ত করতে হলে কমপক্ষে ১টি আইটেমের দর (৳) লিখুন।'
        );
        return;
      }

      // Resolve supplier (create one if typed ad-hoc previously)
      let targetSupplierId = pricingSlip.supplierId;
      let targetSupplierName = pricingSlip.supplierName;
      const existingSup = (db.inkSuppliers || []).find(
        (s) =>
          s.id === targetSupplierId ||
          s.name.trim().toLowerCase() === targetSupplierName.trim().toLowerCase()
      );
      if (existingSup) {
        targetSupplierId = existingSup.id;
        targetSupplierName = existingSup.name;
      } else {
        const createdSup = addInkSupplier({
          name: targetSupplierName,
          phone: pricingSlip.supplierPhone,
          address: pricingSlip.supplierAddress,
          openingDue: 0,
          isActive: true,
        });
        targetSupplierId = createdSup.id;
        targetSupplierName = createdSup.name;
      }

      let remainingPartialPaid =
        paymentType === 'partial' ? Math.max(0, parseFloat(paidAmount) || 0) : 0;

      updatedItems.forEach((it) => {
        const rate = Number(it.unitPrice || 0);
        if (rate <= 0 || it.quantity <= 0) return;
        const itemTotal = Math.round(rate * it.quantity);

        let itemPayType: 'cash' | 'due' | 'partial' = paymentType;
        let itemPaid = 0;

        if (paymentType === 'cash') {
          itemPaid = itemTotal;
        } else if (paymentType === 'due') {
          itemPaid = 0;
        } else {
          // partial allocation across items cleanly
          itemPaid = Math.min(itemTotal, remainingPartialPaid);
          remainingPartialPaid = Math.max(0, remainingPartialPaid - itemPaid);
          if (itemPaid >= itemTotal) {
            itemPayType = 'cash';
          } else if (itemPaid <= 0) {
            itemPayType = 'due';
          } else {
            itemPayType = 'partial';
          }
        }

        addInkPurchase({
          supplierId: targetSupplierId,
          supplierName: targetSupplierName,
          date: today,
          itemName: it.itemName,
          unit: it.unit,
          quantity: it.quantity,
          unitPrice: rate,
          totalAmount: itemTotal,
          carrierName: pricingSlip.carrierName,
          paymentType: itemPayType,
          paidAmount: itemPaid,
          dueAmount: Math.max(0, itemTotal - itemPaid),
          paymentMethod,
          invoiceNo: invoiceNo.trim() || pricingSlip.slipNo,
          notes:
            [pricingSlip.slipNo ? `স্লিপ নং: ${pricingSlip.slipNo}` : '', it.notes || '']
              .filter(Boolean)
              .join(' | ') || undefined,
        });
      });
    }

    const willPost = Boolean(postToLedger && !pricingSlip.postedToPurchases);
    const updatedSlipData: Partial<InkOrderSlip> = {
      items: updatedItems,
      totalEstimatedAmount: newTotal,
      status: newTotal > 0 ? 'received_priced' : pricingSlip.status,
      postedToPurchases: pricingSlip.postedToPurchases || willPost,
    };

    updateInkOrderSlip(pricingSlip.id, updatedSlipData);

    if (selectedSlipPrint?.id === pricingSlip.id) {
      setSelectedSlipPrint({ ...pricingSlip, ...updatedSlipData });
      setIncludePriceInPrint(newTotal > 0);
    }

    setPricingSlip(null);
    setSuccessMsg(
      willPost
        ? `স্লিপ "${pricingSlip.slipNo}"-এর দর সংরক্ষণ এবং কালির মূল খাতায় ক্রয় হিসেবে যুক্ত হয়েছে!`
        : `স্লিপ "${pricingSlip.slipNo}"-এর দর সফলভাবে সংরক্ষিত হয়েছে!`
    );
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const filteredSlips = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inkOrderSlips.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (!q) return true;
      const itemMatch = (s.items || []).some((it) =>
        it.itemName.toLowerCase().includes(q)
      );
      return (
        s.slipNo.toLowerCase().includes(q) ||
        s.supplierName.toLowerCase().includes(q) ||
        (s.carrierName && s.carrierName.toLowerCase().includes(q)) ||
        itemMatch
      );
    });
  }, [inkOrderSlips, search, statusFilter]);

  const filteredKnownItems = useMemo(() => {
    const q = itemName.trim().toLowerCase();
    if (!q) return knownItems.slice(0, 14);
    return knownItems.filter((k) => k.toLowerCase().includes(q)).slice(0, 14);
  }, [knownItems, itemName]);

  // =======================================================
  // VIEW 1: PRINTABLE / CUSTOM PDF INK SHOP SLIP PREVIEW
  // =======================================================
  if (selectedSlipPrint) {
    const supObj = (db.inkSuppliers || []).find(
      (s) => s.id === selectedSlipPrint.supplierId
    );
    const statusInfo = STATUS_CONFIG[selectedSlipPrint.status || 'pending'];
    const hasAnyRate = (selectedSlipPrint.items || []).some(
      (it) => Number(it.unitPrice || 0) > 0
    );
    const showMoneyColumns = hasAnyRate && includePriceInPrint;

    return (
      <div className="space-y-4">
        {/* Top Action Bar */}
        <div className="no-print bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSelectedSlipPrint(null)}
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center space-x-1.5 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>তালিকায় ফিরে যান</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {hasAnyRate && (
              <label className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePriceInPrint}
                  onChange={(e) => setIncludePriceInPrint(e.target.checked)}
                  className="rounded text-emerald-700"
                />
                <span>দর ও টাকা সহ প্রিন্ট</span>
              </label>
            )}

            {!isReadOnly && (
              <button
                type="button"
                onClick={() => handleOpenPricingModal(selectedSlipPrint)}
                className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition"
              >
                <DollarSign className="w-4 h-4" />
                <span>{hasAnyRate ? 'দর আপডেট করুন' : 'দর বসান (পরে)'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                triggerPrint(
                  '.print-container',
                  `কালির_স্লিপ_${selectedSlipPrint.slipNo}_${selectedSlipPrint.supplierName}`,
                  { mode: 'pdf' }
                )
              }
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition"
            >
              <FileDown className="w-4 h-4" />
              <span>কাস্টম PDF ডাউনলোড</span>
            </button>

            <button
              type="button"
              onClick={() =>
                triggerPrint(
                  '.print-container',
                  `কালির_স্লিপ_${selectedSlipPrint.slipNo}_${selectedSlipPrint.supplierName}`
                )
              }
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition"
            >
              <Printer className="w-4 h-4" />
              <span>স্লিপ প্রিন্ট করুন</span>
            </button>
          </div>
        </div>

        {/* Printable Sheet */}
        <div className="bg-white rounded-2xl border border-slate-300 p-4 sm:p-5 shadow-sm max-w-4xl mx-auto print-container">
          <PrintHeader
            title="কালি ও প্রেস মালামাল অর্ডার স্লিপ (INK & MATERIAL ORDER SLIP)"
            documentNo={selectedSlipPrint.slipNo}
            date={selectedSlipPrint.date}
          />

          {/* Compact Supplier & Carrier Info (NO duplicate press name since PrintHeader already shows it) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 mb-2.5 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] leading-tight">
            <div className="col-span-2 sm:col-span-2 flex items-center gap-1.5 truncate">
              <span className="text-slate-500 font-semibold shrink-0">কালির দোকান:</span>
              <span className="font-black text-emerald-900 truncate">
                {selectedSlipPrint.supplierName}
              </span>
              {(supObj?.phone || selectedSlipPrint.supplierPhone) && (
                <span className="text-slate-600 font-semibold shrink-0">
                  ({supObj?.phone || selectedSlipPrint.supplierPhone})
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-slate-500 font-semibold shrink-0">বাহক:</span>
              <span className="font-bold text-slate-900 truncate">
                {selectedSlipPrint.carrierName || 'নির্ধারিত বাহক'}
              </span>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-2">
              <span className="text-slate-500 font-semibold shrink-0">
                প্রয়োজন:{' '}
                <strong className="text-slate-800 tabular-nums">
                  {selectedSlipPrint.deliveryDate
                    ? formatDate(selectedSlipPrint.deliveryDate, lang, numFmt)
                    : 'আজই'}
                </strong>
              </span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${statusInfo.badgeClass}`}
              >
                {statusInfo.label.split(' ')[0]}
              </span>
            </div>
            {(supObj?.address || selectedSlipPrint.supplierAddress) && (
              <div className="col-span-2 sm:col-span-4 text-[10px] text-slate-600 truncate">
                <span className="font-semibold">দোকানের ঠিকানা: </span>
                {supObj?.address || selectedSlipPrint.supplierAddress}
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto border border-slate-300 rounded-xl overflow-hidden">
            <table className="w-full text-[11px] leading-tight text-left border-collapse">
              <thead className="bg-slate-800 text-white font-bold">
                <tr>
                  <th className="px-2 py-1.5 text-center w-8">#</th>
                  <th className="px-2 py-1.5">কালি / মালামালের বিবরণ</th>
                  <th className="px-2 py-1.5 text-center">পরিমাণ ও একক</th>
                  {showMoneyColumns && (
                    <>
                      <th className="px-2 py-1.5 text-right">দর (৳)</th>
                      <th className="px-2 py-1.5 text-right">মোট (৳)</th>
                    </>
                  )}
                  <th className="px-2 py-1.5">বিশেষ নির্দেশনা / মন্তব্য</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                {selectedSlipPrint.items.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                    <td className="px-2 py-1.5 text-center font-bold tabular-nums">
                      {formatNumber(idx + 1, lang, numFmt)}
                    </td>
                    <td className="px-2 py-1.5 font-bold text-slate-900">{item.itemName}</td>
                    <td className="px-2 py-1.5 text-center font-black text-indigo-900 tabular-nums">
                      {formatNumber(item.quantity, lang, numFmt)} {item.unit}
                    </td>
                    {showMoneyColumns && (
                      <>
                        <td className="px-2 py-1.5 text-right tabular-nums">
                          {item.unitPrice ? formatCurrency(item.unitPrice, lang) : '-'}
                        </td>
                        <td className="px-2 py-1.5 text-right font-bold text-emerald-900 tabular-nums">
                          {item.totalAmount
                            ? formatCurrency(item.totalAmount, lang)
                            : '-'}
                        </td>
                      </>
                    )}
                    <td className="px-2 py-1.5 text-[10px] text-slate-600">
                      {item.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-emerald-50 border-t-2 border-slate-700 font-black text-slate-900">
                <tr>
                  <td colSpan={2} className="px-2 py-1.5 text-right">
                    সর্বমোট আইটেম: {formatNumber(selectedSlipPrint.totalItems, lang, numFmt)} টি
                  </td>
                  <td className="px-2 py-1.5 text-center"></td>
                  {showMoneyColumns && (
                    <>
                      <td className="px-2 py-1.5 text-right">মোট বিল:</td>
                      <td className="px-2 py-1.5 text-right text-emerald-900 tabular-nums">
                        {formatCurrency(selectedSlipPrint.totalEstimatedAmount || 0, lang)}
                      </td>
                    </>
                  )}
                  <td className="px-2 py-1.5"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {!showMoneyColumns && (
            <p className="mt-2 text-[10px] text-slate-500 italic">
              বি.দ্র.: অনুগ্রহপূর্বক উপরের তালিকা অনুযায়ী মালামাল বুঝিয়ে দিন। মালামাল প্রদানের পর দোকানদার/ম্যানেজার কর্তৃক দর সংযুক্ত করা হবে।
            </p>
          )}

          {selectedSlipPrint.notes && (
            <div className="mt-2.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-950">
              <span className="font-bold">বিশেষ নোট: </span>
              <span>{selectedSlipPrint.notes}</span>
            </div>
          )}

          <div className="print-signatures mt-8 pt-3 flex justify-between items-center text-[11px] text-slate-700 border-t border-dashed border-slate-300">
            <div className="text-center">
              <div className="w-32 sm:w-36 border-t border-slate-500 mb-1"></div>
              <p className="font-semibold">অর্ডারদাতা / ম্যানেজার</p>
            </div>
            <div className="text-center">
              <div className="w-32 sm:w-36 border-t border-slate-500 mb-1"></div>
              <p className="font-semibold">বাহকের স্বাক্ষর</p>
            </div>
            <div className="text-center">
              <div className="w-32 sm:w-36 border-t border-slate-500 mb-1"></div>
              <p className="font-semibold">দোকানদারের স্বাক্ষর</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =======================================================
  // MAIN LIST + BUILDER VIEW
  // =======================================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Droplet className="w-6 h-6 text-emerald-700" />
            <span>কালির দোকান অর্ডার স্লিপ</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            দোকানে পাঠানোর জন্য কালি ও মালামালের স্লিপ তৈরি করুন (দর বাধ্যতামূলক নয় — মালামাল আসার পরও দর বসাতে পারবেন)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isBuilderOpen && (
            <button
              type="button"
              onClick={() => triggerPrint('.print-container', 'কালির_দোকান_অর্ডার_তালিকা')}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition"
            >
              <Printer className="w-4 h-4" />
              <span>তালিকা প্রিন্ট</span>
            </button>
          )}
          {!isReadOnly && !isBuilderOpen && (
            <button
              type="button"
              onClick={handleStartNewSlip}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ নতুন কালির দোকান স্লিপ</span>
            </button>
          )}
        </div>
      </div>

      {successMsg && !isBuilderOpen && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* BUILDER PANEL */}
      {isBuilderOpen && !isReadOnly && (
        <div className="bg-white rounded-2xl border-2 border-emerald-200 shadow-lg overflow-hidden">
          <div className="bg-emerald-900 text-white px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <ShoppingBag className="w-5 h-5 text-emerald-300" />
              <div>
                <h3 className="text-sm sm:text-base font-bold">
                  {editingSlip
                    ? `কালির স্লিপ সম্পাদনা: ${editingSlip.slipNo}`
                    : 'নতুন কালির দোকান অর্ডার স্লিপ'}
                </h3>
                <p className="text-[11px] text-emerald-200">
                  দর ছাড়াই দোকানে পাঠানোর স্লিপ প্রিন্ট/PDF করুন — পরে দর বসাতে পারবেন
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsBuilderOpen(false);
                setEditingSlip(null);
              }}
              className="px-3 py-1.5 bg-emerald-800 hover:bg-rose-600 rounded-xl text-xs font-bold flex items-center space-x-1 transition"
            >
              <X className="w-4 h-4" />
              <span>বন্ধ করুন</span>
            </button>
          </div>

          <div className="p-5 space-y-5">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Step 1: Slip Header & Supplier */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">স্লিপ নম্বর</label>
                  <input
                    type="text"
                    value={slipNo}
                    onChange={(e) => setSlipNo(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">তারিখ *</label>
                  <input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    প্রয়োজন / ডেলিভারি তারিখ (ঐচ্ছিক)
                  </label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">অবস্থা</label>
                  <select
                    value={slipStatus}
                    onChange={(e) => setSlipStatus(e.target.value as InkOrderSlip['status'])}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold bg-white"
                  >
                    <option value="pending">অপেক্ষমাণ (Pending)</option>
                    <option value="sent">দোকানে প্রেরিত (Sent)</option>
                    <option value="received_priced">মালামাল ও দর প্রাপ্ত</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Supplier Picker + Inline Add */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-800">
                      ১. কালির দোকানের নাম *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewSupplierBox((prev) => !prev);
                        setNewSupplierForm((prev) => ({
                          ...prev,
                          name:
                            supplierSearch && !selectedSupplierId ? supplierSearch : prev.name,
                        }));
                      }}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-lg flex items-center space-x-1 transition"
                    >
                      <Store className="w-3 h-3" />
                      <span>+ নতুন দোকান যোগ</span>
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={supplierSearch}
                      onChange={(e) => {
                        setSupplierSearch(e.target.value);
                        setSelectedSupplierId('');
                        setIsSupplierDropdownOpen(true);
                      }}
                      onFocus={() => setIsSupplierDropdownOpen(true)}
                      placeholder="কালির দোকানের নাম লিখে খুঁজুন বা বাছুন..."
                      className="w-full border border-slate-300 rounded-xl pl-8 pr-20 py-2 text-xs font-bold bg-white text-slate-900"
                    />
                    {selectedSupplierId && (
                      <span className="absolute right-2 top-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        ✓ নির্বাচিত
                      </span>
                    )}
                  </div>

                  {isSupplierDropdownOpen && (
                    <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-52 overflow-y-auto">
                      {(db.inkSuppliers || [])
                        .filter(
                          (s) =>
                            !supplierSearch.trim() ||
                            s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
                            (s.phone && s.phone.includes(supplierSearch))
                        )
                        .map((s) => (
                          <button
                            type="button"
                            key={s.id}
                            onClick={() => handleSelectSupplier(s.id)}
                            className="w-full text-left px-3 py-2 hover:bg-emerald-50 border-b border-slate-100 flex items-center justify-between text-xs transition"
                          >
                            <div>
                              <span className="font-bold text-slate-900 block">{s.name}</span>
                              <span className="text-[10px] text-slate-400">
                                {s.phone || 'ফোন নেই'} {s.address ? `• ${s.address}` : ''}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-700">নির্বাচন</span>
                          </button>
                        ))}
                      <button
                        type="button"
                        onClick={() => {
                          setIsSupplierDropdownOpen(false);
                          setShowNewSupplierBox(true);
                          setNewSupplierForm((prev) => ({
                            ...prev,
                            name: supplierSearch.trim(),
                          }));
                        }}
                        className="w-full text-left px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center space-x-1.5 transition"
                      >
                        <Plus className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {supplierSearch.trim()
                            ? `+ নতুন কালির দোকান যোগ করুন: "${supplierSearch.trim()}"`
                            : '+ নতুন কালির দোকান তৈরি করুন'}
                        </span>
                      </button>
                    </div>
                  )}

                  {showNewSupplierBox && (
                    <div className="mt-2 p-3 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-950">
                          নতুন কালির দোকান সরাসরি যোগ করুন
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowNewSupplierBox(false)}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={newSupplierForm.name}
                          onChange={(e) =>
                            setNewSupplierForm({ ...newSupplierForm, name: e.target.value })
                          }
                          placeholder="দোকানের নাম *"
                          className="border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs font-bold bg-white"
                        />
                        <input
                          type="text"
                          value={newSupplierForm.phone}
                          onChange={(e) =>
                            setNewSupplierForm({ ...newSupplierForm, phone: e.target.value })
                          }
                          placeholder="মোবাইল নম্বর"
                          className="border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                        />
                        <input
                          type="text"
                          value={newSupplierForm.proprietor}
                          onChange={(e) =>
                            setNewSupplierForm({
                              ...newSupplierForm,
                              proprietor: e.target.value,
                            })
                          }
                          placeholder="মালিক / প্রতিনিধি"
                          className="border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                        />
                        <input
                          type="text"
                          value={newSupplierForm.address}
                          onChange={(e) =>
                            setNewSupplierForm({ ...newSupplierForm, address: e.target.value })
                          }
                          placeholder="ঠিকানা"
                          className="border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleSaveInlineSupplier}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1 transition"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>সংরক্ষণ ও নির্বাচন</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Carrier / Bearer Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    বাহকের নাম (যিনি দোকান থেকে মালামাল আনবেন)
                  </label>
                  <input
                    type="text"
                    value={carrierName}
                    onChange={(e) => setCarrierName(e.target.value)}
                    placeholder="বাহকের নাম লিখুন বা নিচে থেকে বাছুন..."
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold bg-white text-slate-900"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {db.employees
                      .filter((e) => e.isActive)
                      .slice(0, 6)
                      .map((emp) => (
                        <button
                          type="button"
                          key={emp.id}
                          onClick={() => setCarrierName(emp.name)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] border transition ${
                            carrierName === emp.name
                              ? 'bg-slate-800 text-white border-slate-800 font-bold'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {emp.name}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Add Ink / Material Items (Rate Optional!) */}
            <div className="bg-indigo-50/40 p-4 rounded-2xl border border-indigo-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-200 pb-2">
                <h4 className="text-xs sm:text-sm font-black text-indigo-950 flex items-center space-x-2">
                  <Droplet className="w-4 h-4 text-indigo-700" />
                  <span>২. কালি বা মালামাল যুক্ত করুন</span>
                </h4>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  দর বাধ্যতামূলক নয় — পরে মালামাল পেলে দর বসাতে পারবেন
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
                {/* Item Name + Autocomplete */}
                <div className="lg:col-span-4 relative">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    কালি বা মালামালের বিবরণ *
                  </label>
                  <input
                    type="text"
                    value={itemName}
                    onChange={(e) => {
                      setItemName(e.target.value);
                      setIsItemDropdownOpen(true);
                    }}
                    onFocus={() => setIsItemDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setIsItemDropdownOpen(false), 180)}
                    placeholder="যেমন: টয়ো ব্ল্যাক কালি, রোলার ওয়াশ, গাম..."
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold bg-white text-slate-900"
                  />
                  {isItemDropdownOpen && filteredKnownItems.length > 0 && (
                    <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                      {filteredKnownItems.map((nameOpt) => (
                        <button
                          type="button"
                          key={nameOpt}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setItemName(nameOpt);
                            setIsItemDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 border-b border-slate-100 text-xs font-semibold text-slate-800"
                        >
                          {nameOpt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quantity */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">পরিমাণ *</label>
                  <SmartNumberInput
                    min={0}
                    value={itemQuantity}
                    onValueChange={setItemQuantity}
                    className="w-full border border-indigo-300 rounded-xl px-2.5 py-2 text-xs font-black text-center bg-white"
                  />
                </div>

                {/* Unit */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">একক</label>
                  <select
                    value={itemUnit}
                    onChange={(e) => setItemUnit(e.target.value as PurchaseUnit)}
                    className="w-full border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold bg-white"
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Optional Unit Price */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    দর (৳) <span className="text-[10px] font-normal text-slate-500">(ঐচ্ছিক)</span>
                  </label>
                  <SmartNumberInput
                    min={0}
                    clearableToEmpty
                    value={itemUnitPrice}
                    onTextValueChange={setItemUnitPrice}
                    placeholder="পরে বসানো যাবে"
                    className="w-full border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold text-center bg-white"
                  />
                </div>

                <div className="lg:col-span-2">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="w-full py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1 shadow-sm transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>তালিকায় যোগ</span>
                  </button>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  placeholder="আইটেমের বিশেষ নির্দেশনা বা কালার/গ্রেড (ঐচ্ছিক, যেমন: ভালো মানের, জাপানি)"
                  className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-xs bg-white"
                />
              </div>
            </div>

            {/* Step 3: Added Items Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <Layers className="w-4 h-4 text-emerald-700" />
                  <span>
                    স্লিপে যুক্ত মালামাল ({formatNumber(slipItems.length, lang, numFmt)} টি)
                  </span>
                </h4>
                {slipTotals.totalEstimatedAmount > 0 && (
                  <span className="text-xs font-black text-emerald-800">
                    আনুমানিক মোট: {formatCurrency(slipTotals.totalEstimatedAmount, lang)}
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b">
                    <tr>
                      <th className="p-2.5 text-center">#</th>
                      <th className="p-2.5">মালামালের বিবরণ</th>
                      <th className="p-2.5 text-center">পরিমাণ</th>
                      <th className="p-2.5">একক</th>
                      <th className="p-2.5 text-center">দর (৳ — ঐচ্ছিক)</th>
                      <th className="p-2.5 text-right">মোট (৳)</th>
                      <th className="p-2.5 text-right">মুছুন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {slipItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400">
                          উপরে থেকে কালি বা মালামাল লিখে &quot;তালিকায় যোগ&quot; বাটনে ক্লিক করুন (একই স্লিপে একাধিক আইটেম যোগ করা যাবে)।
                        </td>
                      </tr>
                    ) : (
                      slipItems.map((it, idx) => (
                        <tr key={it.id} className="hover:bg-slate-50">
                          <td className="p-2.5 text-center font-bold tabular-nums">
                            {formatNumber(idx + 1, lang, numFmt)}
                          </td>
                          <td className="p-2.5">
                            <span className="font-bold text-slate-900 block">{it.itemName}</span>
                            {it.notes && (
                              <span className="text-[10px] text-slate-500">{it.notes}</span>
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            <SmartNumberInput
                              min={0}
                              value={it.quantity}
                              onTextValueChange={(val) =>
                                handleUpdateSlipItemField(it.id, 'quantity', val)
                              }
                              className="w-20 border border-indigo-300 rounded-lg px-2 py-1 text-xs font-black text-center"
                            />
                          </td>
                          <td className="p-2.5 font-bold text-slate-700">{it.unit}</td>
                          <td className="p-2.5 text-center">
                            <SmartNumberInput
                              min={0}
                              clearableToEmpty
                              value={it.unitPrice ?? ''}
                              placeholder="পরে"
                              onTextValueChange={(val) =>
                                handleUpdateSlipItemField(it.id, 'unitPrice', val)
                              }
                              className="w-24 border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-center"
                            />
                          </td>
                          <td className="p-2.5 text-right font-bold text-emerald-800 tabular-nums">
                            {it.totalAmount
                              ? formatCurrency(it.totalAmount, lang)
                              : <span className="text-slate-400 font-normal">দর বাকি</span>}
                          </td>
                          <td className="p-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveSlipItem(it.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                              title="বাদ দিন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes & Save Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3 pt-2">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  স্লিপের সার্বিক মন্তব্য (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={slipNotes}
                  onChange={(e) => setSlipNotes(e.target.value)}
                  placeholder="যেমন: ভালো মানের কালি পাঠাবেন, জরুরি..."
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white"
                />
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => handleSaveOrderSlip(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{editingSlip ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveOrderSlip(true)}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>সংরক্ষণ ও স্লিপ প্রিন্ট/PDF দেখুন</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SAVED INK ORDER SLIPS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print-container">
        <div className="print-only p-4">
          <PrintHeader title="কালির দোকান অর্ডার স্লিপ তালিকা" />
        </div>

        {/* Search & Filter */}
        <div className="no-print p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="স্লিপ নং, কালির দোকান, মালামাল বা বাহকের নাম দিয়ে খুঁজুন..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
            />
          </div>

          <div className="flex items-center space-x-1.5 overflow-x-auto">
            {(
              [
                { id: 'all', label: `সকল (${inkOrderSlips.length})` },
                { id: 'pending', label: 'অপেক্ষমাণ' },
                { id: 'sent', label: 'দোকানে প্রেরিত' },
                { id: 'received_priced', label: 'দর প্রাপ্ত' },
              ] as const
            ).map((f) => (
              <button
                type="button"
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                  statusFilter === f.id
                    ? 'bg-emerald-700 text-white'
                    : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b">
              <tr>
                <th className="p-3">তারিখ ও স্লিপ নং</th>
                <th className="p-3">কালির দোকান</th>
                <th className="p-3">মালামালের বিবরণ</th>
                <th className="p-3">বাহক</th>
                <th className="p-3 text-right">দর / মোট টাকা</th>
                <th className="p-3 text-center">অবস্থা</th>
                <th className="p-3 text-right no-print">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredSlips.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-400">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-bold text-slate-600">
                      এখনো কোনো কালির দোকানের স্লিপ তৈরি করা হয়নি
                    </p>
                    <p className="text-[11px] mt-1">
                      উপরে &quot;+ নতুন কালির দোকান স্লিপ&quot; বাটনে ক্লিক করে দোকানে পাঠানোর জন্য মালামালের তালিকা তৈরি করুন।
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSlips.map((slip) => {
                  const statusCfg = STATUS_CONFIG[slip.status || 'pending'];
                  const hasRate = (slip.items || []).some(
                    (it) => Number(it.unitPrice || 0) > 0
                  );
                  return (
                    <tr key={slip.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 whitespace-nowrap">
                        <span className="font-mono font-black text-emerald-800 block">
                          {slip.slipNo}
                        </span>
                        <span className="text-[10px] text-slate-500 tabular-nums">
                          {formatDate(slip.date, lang, numFmt)}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-slate-900 block">{slip.supplierName}</span>
                        {slip.supplierPhone && (
                          <span className="text-[10px] text-slate-500">{slip.supplierPhone}</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="space-y-0.5 max-w-xs">
                          {(slip.items || []).map((it) => (
                            <div key={it.id} className="text-[11px] text-slate-700 truncate">
                              • <b>{it.itemName}</b> ({formatNumber(it.quantity, lang, numFmt)}{' '}
                              {it.unit})
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 font-semibold text-slate-700 whitespace-nowrap">
                        {slip.carrierName || '-'}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        {hasRate ? (
                          <div>
                            <span className="font-black text-emerald-800 tabular-nums block">
                              {formatCurrency(slip.totalEstimatedAmount || 0, lang)}
                            </span>
                            {slip.postedToPurchases && (
                              <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                ✓ খাতায় যুক্ত
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            দর বাকি
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {!isReadOnly ? (
                          <select
                            value={slip.status || 'pending'}
                            onChange={(e) =>
                              updateInkOrderSlip(slip.id, {
                                status: e.target.value as InkOrderSlip['status'],
                              })
                            }
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${statusCfg.badgeClass}`}
                          >
                            <option value="pending">অপেক্ষমাণ</option>
                            <option value="sent">দোকানে প্রেরিত</option>
                            <option value="received_priced">মালামাল ও দর প্রাপ্ত</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.badgeClass}`}
                          >
                            {statusCfg.label}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right no-print whitespace-nowrap">
                        <div className="flex justify-end space-x-1">
                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={() => handleOpenPricingModal(slip)}
                              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition"
                              title="মালামাল আসার পর দর বসান ও মূল খাতায় যুক্ত করুন"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>{hasRate ? 'দর' : 'দর বসান'}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setIncludePriceInPrint(hasRate);
                              setSelectedSlipPrint(slip);
                            }}
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition"
                            title="স্লিপ দেখুন, প্রিন্ট বা PDF ডাউনলোড করুন"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>স্লিপ / PDF</span>
                          </button>
                          {!isReadOnly && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleEditSlip(slip)}
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                                title="সম্পাদনা"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setSlipToDelete(slip)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
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
          </table>
        </div>
      </div>

      {/* Post-Delivery Rate Entry Modal */}
      {pricingSlip && (
        <div className="no-print fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 my-auto max-h-[92vh] overflow-y-auto">
            <div className="bg-emerald-900 text-white px-5 py-3.5 flex items-center justify-between rounded-t-2xl">
              <div>
                <h3 className="text-sm sm:text-base font-bold flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-amber-300" />
                  <span>পরে দর বসান — {pricingSlip.slipNo}</span>
                </h3>
                <p className="text-[11px] text-emerald-200">
                  দোকান: {pricingSlip.supplierName} • তারিখ:{' '}
                  {formatDate(pricingSlip.date, lang, numFmt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPricingSlip(null)}
                className="p-1.5 text-emerald-200 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePostDeliveryPricing} className="p-5 space-y-4">
              {pricingError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                  {pricingError}
                </div>
              )}

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                    <tr>
                      <th className="p-2.5">মালামালের নাম</th>
                      <th className="p-2.5 text-center">পরিমাণ</th>
                      <th className="p-2.5 text-center">একক দর (৳)</th>
                      <th className="p-2.5 text-right">মোট (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(pricingSlip.items || []).map((it) => {
                      const rateNum = parseFloat(pricingValues[it.id] || '0') || 0;
                      const rowTotal = Math.round(rateNum * (it.quantity || 0));
                      return (
                        <tr key={it.id}>
                          <td className="p-2.5 font-bold text-slate-900">{it.itemName}</td>
                          <td className="p-2.5 text-center font-semibold">
                            {formatNumber(it.quantity, lang, numFmt)} {it.unit}
                          </td>
                          <td className="p-2.5 text-center">
                            <SmartNumberInput
                              min={0}
                              clearableToEmpty
                              value={pricingValues[it.id] ?? ''}
                              onTextValueChange={(val) =>
                                setPricingValues((prev) => ({
                                  ...prev,
                                  [it.id]: val,
                                }))
                              }
                              placeholder="দর লিখুন"
                              className="w-28 border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs font-black text-center bg-white"
                            />
                          </td>
                          <td className="p-2.5 text-right font-bold text-emerald-800 tabular-nums">
                            {rowTotal > 0 ? formatCurrency(rowTotal, lang) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-emerald-50 border-t font-black text-slate-900">
                    <tr>
                      <td colSpan={3} className="p-2.5 text-right">
                        সর্বমোট বিল:
                      </td>
                      <td className="p-2.5 text-right text-emerald-900 tabular-nums">
                        {formatCurrency(pricingGrandTotal, lang)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {!pricingSlip.postedToPurchases ? (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <label className="flex items-center space-x-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={postToLedger}
                      onChange={(e) => setPostToLedger(e.target.checked)}
                      className="rounded text-emerald-700"
                    />
                    <span>
                      কালির দোকানের মূল খাতায় (Ink Purchases) ক্রয় হিসাব হিসেবে যুক্ত করুন
                    </span>
                  </label>

                  {postToLedger && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          পেমেন্ট ধরন
                        </label>
                        <select
                          value={paymentType}
                          onChange={(e) =>
                            setPaymentType(e.target.value as 'due' | 'cash' | 'partial')
                          }
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold bg-white"
                        >
                          <option value="due">বাকি (Due)</option>
                          <option value="cash">নগদ (Cash)</option>
                          <option value="partial">আংশিক নগদ + বাকি</option>
                        </select>
                      </div>

                      {paymentType === 'partial' && (
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            নগদ প্রদান (৳)
                          </label>
                          <SmartNumberInput
                            min={0}
                            clearableToEmpty
                            value={paidAmount}
                            onTextValueChange={setPaidAmount}
                            className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold bg-white"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          পেমেন্ট মাধ্যম
                        </label>
                        <input
                          type="text"
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          placeholder="নগদ / বিকাশ / ব্যাংক"
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          চালান / মেমো নং
                        </label>
                        <input
                          type="text"
                          value={invoiceNo}
                          onChange={(e) => setInvoiceNo(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800">
                  ✓ এই স্লিপটি ইতিমধ্যে কালির দোকানের মূল খাতায় যুক্ত করা হয়েছে (দর আপডেট হলে কেবল স্লিপে আপডেট হবে)।
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setPricingSlip(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition"
                >
                  ✓ দর সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!slipToDelete}
        title="কালির দোকান স্লিপ মুছে ফেলুন"
        message={`আপনি কি নিশ্চিত যে "${slipToDelete?.slipNo}" (${slipToDelete?.supplierName}) স্লিপটি মুছে ফেলতে চান?`}
        onConfirm={() => {
          if (slipToDelete) {
            deleteInkOrderSlip(slipToDelete.id);
            setSlipToDelete(null);
          }
        }}
        onCancel={() => setSlipToDelete(null)}
      />
    </div>
  );
};
