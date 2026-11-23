import React, { useMemo, useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { OrderSlip, OrderSlipItem, ProductionItemType } from '../../types';
import { calculateProductionMetrics, formatDate, formatNumber } from '../../utils/calculations';
import { PrintHeader, triggerPrint } from '../common/PrintHeader';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  ClipboardList,
  Plus,
  Search,
  Printer,
  FileDown,
  Edit2,
  Trash2,
  ArrowLeft,
  BookOpen,
  UserPlus,
  BookPlus,
  CheckCircle2,
  AlertCircle,
  X,
  Palette,
  Layers,
  Check,
  Clock,
} from 'lucide-react';

const STATUS_CONFIG: Record<
  OrderSlip['status'],
  { label: string; badgeClass: string }
> = {
  pending: {
    label: 'অপেক্ষমাণ (Pending)',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  printing: {
    label: 'ছাপা চলছে (Printing)',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  completed: {
    label: 'ছাপা সম্পন্ন (Completed)',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
};

export const OrderSlipManager: React.FC = () => {
  const {
    db,
    isReadOnly,
    addParty,
    addBook,
    addOrderSlip,
    updateOrderSlip,
    deleteOrderSlip,
  } = useDatabase();

  const lang = db.settings.language;
  const numFmt = db.settings.numberFormat;
  const sheetsPerReam = db.settings.sheetsPerReam || 500;
  const today = new Date().toISOString().split('T')[0];

  const orderSlips = db.orderSlips || [];

  // View state
  const [selectedSlipPrint, setSelectedSlipPrint] = useState<OrderSlip | null>(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState<boolean>(false);
  const [editingSlip, setEditingSlip] = useState<OrderSlip | null>(null);
  const [slipToDelete, setSlipToDelete] = useState<OrderSlip | null>(null);

  // List filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderSlip['status']>('all');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Slip Header Form
  const [slipNo, setSlipNo] = useState('');
  const [orderDate, setOrderDate] = useState(today);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [partySearch, setPartySearch] = useState('');
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
  const [machineManName, setMachineManName] = useState('');
  const [slipStatus, setSlipStatus] = useState<OrderSlip['status']>('pending');
  const [slipNotes, setSlipNotes] = useState('');
  const [slipItems, setSlipItems] = useState<OrderSlipItem[]>([]);

  // Inline Quick New Party Drawer
  const [showNewPartyBox, setShowNewPartyBox] = useState(false);
  const [newPartyForm, setNewPartyForm] = useState({
    name: '',
    phone: '',
    contactPerson: '',
    address: '',
  });

  // Inline Quick New Book Drawer
  const [showNewBookBox, setShowNewBookBox] = useState(false);
  const [newBookForm, setNewBookForm] = useState({
    name: '',
    code: '',
    size: '২৩×৩৬',
    forma: 1,
    plates: 4,
  });

  // Book Item Builder Form (strictly NO rate/price fields!)
  const [bookSearch, setBookSearch] = useState('');
  const [isBookDropdownOpen, setIsBookDropdownOpen] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [itemType, setItemType] = useState<ProductionItemType>('book');
  const [itemForma, setItemForma] = useState<number>(1);
  const [itemPlates, setItemPlates] = useState<number>(4);
  const [itemCopies, setItemCopies] = useState<number>(1000);
  const [itemPaperSize, setItemPaperSize] = useState<string>('২৩×৩৬');
  const [itemPaperGsm, setItemPaperGsm] = useState<string>('৭০ গ্রাম');
  const [itemPaperType, setItemPaperType] = useState<string>('অফসেট পেপার');
  const [itemColorCount, setItemColorCount] = useState<number>(4);
  const [itemSingleColorType, setItemSingleColorType] = useState<'black' | 'color'>('black');
  const [itemNotes, setItemNotes] = useState<string>('');

  const selectedParty = useMemo(
    () => db.parties.find((p) => p.id === selectedPartyId) || null,
    [db.parties, selectedPartyId]
  );

  // Live metrics calculation for current book item being configured
  const liveMetrics = useMemo(() => {
    const safeForma = Math.max(1, itemForma || 1);
    const safeCopies = Math.max(1, itemCopies || 1);
    const calc = calculateProductionMetrics(
      safeForma,
      safeCopies,
      safeCopies,
      sheetsPerReam,
      'forma_impression'
    );
    return {
      chhapa: safeCopies * safeForma,
      sheets: calc.calculatedSheets,
      reams: calc.calculatedReams,
    };
  }, [itemForma, itemCopies, sheetsPerReam]);

  // Cumulative totals for all books added to current Order Slip
  const slipTotals = useMemo(() => {
    return slipItems.reduce(
      (acc, it) => ({
        totalBooks: acc.totalBooks + 1,
        totalForma: acc.totalForma + (it.forma || 0),
        totalPlates: acc.totalPlates + (it.plates || 0),
        totalCopies: acc.totalCopies + (it.copies || 0),
        totalChhapa: acc.totalChhapa + (it.chhapa || 0),
        totalSheets: acc.totalSheets + (it.sheets || 0),
        totalReams: Math.round((acc.totalReams + (it.reams || 0)) * 100) / 100,
      }),
      {
        totalBooks: 0,
        totalForma: 0,
        totalPlates: 0,
        totalCopies: 0,
        totalChhapa: 0,
        totalSheets: 0,
        totalReams: 0,
      }
    );
  }, [slipItems]);

  const resetItemBuilder = () => {
    setSelectedBookId('');
    setBookSearch('');
    setIsBookDropdownOpen(false);
    setItemType('book');
    setItemForma(1);
    setItemPlates(4);
    setItemCopies(1000);
    setItemPaperSize('২৩×৩৬');
    setItemPaperGsm('৭০ গ্রাম');
    setItemPaperType('অফসেট পেপার');
    setItemColorCount(4);
    setItemSingleColorType('black');
    setItemNotes('');
  };

  const handleStartNewSlip = () => {
    if (isReadOnly) return;
    setEditingSlip(null);
    const nextNumber = orderSlips.length + 101;
    setSlipNo(`ORD-${nextNumber}`);
    setOrderDate(today);
    setDeliveryDate('');
    setSelectedPartyId('');
    setPartySearch('');
    setIsPartyDropdownOpen(false);
    setMachineManName('');
    setSlipStatus('pending');
    setSlipNotes('');
    setSlipItems([]);
    setShowNewPartyBox(false);
    setShowNewBookBox(false);
    setErrorMsg('');
    setSuccessMsg('');
    resetItemBuilder();
    setIsBuilderOpen(true);
  };

  const handleEditSlip = (slip: OrderSlip) => {
    if (isReadOnly) return;
    setEditingSlip(slip);
    setSlipNo(slip.slipNo);
    setOrderDate(slip.date);
    setDeliveryDate(slip.deliveryDate || '');
    setSelectedPartyId(slip.partyId);
    setPartySearch(slip.partyName);
    setIsPartyDropdownOpen(false);
    setMachineManName(slip.machineManName || '');
    setSlipStatus(slip.status || 'pending');
    setSlipNotes(slip.notes || '');
    setSlipItems(slip.items || []);
    setShowNewPartyBox(false);
    setShowNewBookBox(false);
    setErrorMsg('');
    setSuccessMsg('');
    resetItemBuilder();
    setIsBuilderOpen(true);
  };

  const handleSelectParty = (partyId: string) => {
    const p = db.parties.find((pty) => pty.id === partyId);
    if (!p) return;
    setSelectedPartyId(p.id);
    setPartySearch(p.name);
    setIsPartyDropdownOpen(false);
    setShowNewPartyBox(false);
    setErrorMsg('');
  };

  const handleSelectBook = (bookId: string) => {
    const b = db.books.find((bk) => bk.id === bookId);
    if (!b) return;
    setSelectedBookId(b.id);
    setBookSearch(b.name);
    setItemForma(b.forma || 1);
    setItemPlates(b.plates || 4);
    if (b.size) setItemPaperSize(b.size);
    setIsBookDropdownOpen(false);
    setShowNewBookBox(false);
    setErrorMsg('');
  };

  // Inline create Party right inside Order Slip
  const handleSaveInlineParty = () => {
    if (isReadOnly) return;
    const trimmed = newPartyForm.name.trim();
    if (!trimmed) {
      setErrorMsg('নতুন পার্টির নাম লিখুন।');
      return;
    }
    const existing = db.parties.find(
      (p) => p.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      handleSelectParty(existing.id);
      setNewPartyForm({ name: '', phone: '', contactPerson: '', address: '' });
      return;
    }
    const created = addParty({
      name: trimmed,
      phone: newPartyForm.phone.trim(),
      contactPerson: newPartyForm.contactPerson.trim(),
      address: newPartyForm.address.trim(),
      openingDue: 0,
      isActive: true,
    });
    setSelectedPartyId(created.id);
    setPartySearch(created.name);
    setShowNewPartyBox(false);
    setIsPartyDropdownOpen(false);
    setNewPartyForm({ name: '', phone: '', contactPerson: '', address: '' });
    setSuccessMsg(`নতুন পার্টি "${created.name}" যুক্ত ও নির্বাচিত হয়েছে।`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Inline create Book right inside Order Slip (auto-linked to selected Party)
  const handleSaveInlineBook = () => {
    if (isReadOnly) return;
    const trimmed = newBookForm.name.trim();
    if (!trimmed) {
      setErrorMsg('নতুন বইয়ের নাম লিখুন।');
      return;
    }
    const existing = db.books.find(
      (b) => b.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      handleSelectBook(existing.id);
      setNewBookForm({ name: '', code: '', size: '২৩×৩৬', forma: 1, plates: 4 });
      return;
    }
    const created = addBook({
      name: trimmed,
      code: newBookForm.code.trim() || `BK-${(db.books.length + 101).toString()}`,
      size: newBookForm.size.trim() || '২৩×৩৬',
      forma: Math.max(1, Number(newBookForm.forma) || 1),
      plates: Math.max(1, Number(newBookForm.plates) || 4),
      defaultRate: db.settings.globalDefaultRatePerForma || 450,
      partyIds: selectedPartyId ? [selectedPartyId] : [],
      isActive: true,
    });
    setSelectedBookId(created.id);
    setBookSearch(created.name);
    setItemForma(created.forma);
    setItemPlates(created.plates);
    if (created.size) setItemPaperSize(created.size);
    setShowNewBookBox(false);
    setIsBookDropdownOpen(false);
    setNewBookForm({ name: '', code: '', size: '২৩×৩৬', forma: 1, plates: 4 });
    setSuccessMsg(`নতুন বই "${created.name}" যুক্ত ও নির্বাচিত হয়েছে।`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Add selected book item to current Order Slip
  const handleAddBookItem = () => {
    setErrorMsg('');
    let finalBook = db.books.find((b) => b.id === selectedBookId);

    if (!finalBook && bookSearch.trim()) {
      const matched = db.books.find(
        (b) => b.name.trim().toLowerCase() === bookSearch.trim().toLowerCase()
      );
      if (matched) {
        finalBook = matched;
      } else {
        // Quick create if user typed a new book name directly
        finalBook = addBook({
          name: bookSearch.trim(),
          code: `BK-${(db.books.length + 101).toString()}`,
          size: itemPaperSize || '২৩×৩৬',
          forma: Math.max(1, itemForma || 1),
          plates: Math.max(1, itemPlates || 4),
          defaultRate: db.settings.globalDefaultRatePerForma || 450,
          partyIds: selectedPartyId ? [selectedPartyId] : [],
          isActive: true,
        });
      }
    }

    if (!finalBook) {
      setErrorMsg('অনুগ্রহ করে বইয়ের নাম নির্বাচন করুন অথবা নতুন বই যোগ করুন।');
      return;
    }

    if (!itemCopies || itemCopies <= 0) {
      setErrorMsg('কত কপি ছাপানোর অর্ডার তা সঠিকভাবে লিখুন।');
      return;
    }

    const safeForma = Math.max(1, Number(itemForma) || 1);
    const safePlates = Math.max(1, Number(itemPlates) || 1);
    const safeCopies = Math.max(1, Number(itemCopies) || 1);
    const calc = calculateProductionMetrics(
      safeForma,
      safeCopies,
      safeCopies,
      sheetsPerReam,
      'forma_impression'
    );

    const newItem: OrderSlipItem = {
      id: `osi_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      bookId: finalBook.id,
      bookName: finalBook.name,
      bookCode: finalBook.code,
      itemType,
      forma: safeForma,
      plates: safePlates,
      copies: safeCopies,
      chhapa: safeCopies * safeForma,
      sheets: calc.calculatedSheets,
      reams: calc.calculatedReams,
      paperSize: itemPaperSize.trim() || finalBook.size || '২৩×৩৬',
      paperGsm: itemPaperGsm.trim(),
      paperType: itemPaperType.trim(),
      colorCount: itemColorCount,
      singleColorType: itemColorCount === 1 ? itemSingleColorType : undefined,
      notes: itemNotes.trim(),
    };

    setSlipItems((prev) => [...prev, newItem]);
    resetItemBuilder();
  };

  const handleUpdateSlipItemCopies = (itemId: string, newCopies: number) => {
    const safeCopies = Math.max(1, Number(newCopies) || 1);
    setSlipItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const calc = calculateProductionMetrics(
          it.forma,
          safeCopies,
          safeCopies,
          sheetsPerReam,
          'forma_impression'
        );
        return {
          ...it,
          copies: safeCopies,
          chhapa: safeCopies * it.forma,
          sheets: calc.calculatedSheets,
          reams: calc.calculatedReams,
        };
      })
    );
  };

  const handleRemoveSlipItem = (itemId: string) => {
    setSlipItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  const handleSaveOrderSlip = (openPrintAfterSave: boolean = false) => {
    if (isReadOnly) return;
    setErrorMsg('');

    let finalParty = selectedParty;
    if (!finalParty && partySearch.trim()) {
      const matched = db.parties.find(
        (p) => p.name.trim().toLowerCase() === partySearch.trim().toLowerCase()
      );
      if (matched) {
        finalParty = matched;
      } else {
        finalParty = addParty({
          name: partySearch.trim(),
          phone: '',
          contactPerson: '',
          address: '',
          openingDue: 0,
          isActive: true,
        });
      }
    }

    if (!finalParty) {
      setErrorMsg('অনুগ্রহ করে পার্টির নাম নির্বাচন করুন অথবা নতুন পার্টি যোগ করুন।');
      return;
    }

    // If user selected a book & copies in the builder but forgot to click "+ তালিকায় যোগ করুন", include it automatically!
    let finalItems = [...slipItems];
    if (finalItems.length === 0 && (selectedBookId || bookSearch.trim())) {
      let quickBook = db.books.find((b) => b.id === selectedBookId);
      if (!quickBook && bookSearch.trim()) {
        quickBook =
          db.books.find((b) => b.name.trim().toLowerCase() === bookSearch.trim().toLowerCase()) ||
          addBook({
            name: bookSearch.trim(),
            code: `BK-${(db.books.length + 101).toString()}`,
            size: itemPaperSize || '২৩×৩৬',
            forma: Math.max(1, itemForma || 1),
            plates: Math.max(1, itemPlates || 4),
            defaultRate: db.settings.globalDefaultRatePerForma || 450,
            partyIds: [finalParty.id],
            isActive: true,
          });
      }
      if (quickBook) {
        const safeForma = Math.max(1, Number(itemForma) || 1);
        const safePlates = Math.max(1, Number(itemPlates) || 1);
        const safeCopies = Math.max(1, Number(itemCopies) || 1);
        const calc = calculateProductionMetrics(
          safeForma,
          safeCopies,
          safeCopies,
          sheetsPerReam,
          'forma_impression'
        );
        finalItems = [
          {
            id: `osi_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            bookId: quickBook.id,
            bookName: quickBook.name,
            bookCode: quickBook.code,
            itemType,
            forma: safeForma,
            plates: safePlates,
            copies: safeCopies,
            chhapa: safeCopies * safeForma,
            sheets: calc.calculatedSheets,
            reams: calc.calculatedReams,
            paperSize: itemPaperSize.trim() || quickBook.size || '২৩×৩৬',
            paperGsm: itemPaperGsm.trim(),
            paperType: itemPaperType.trim(),
            colorCount: itemColorCount,
            singleColorType: itemColorCount === 1 ? itemSingleColorType : undefined,
            notes: itemNotes.trim(),
          },
        ];
      }
    }

    if (finalItems.length === 0) {
      setErrorMsg('অর্ডার স্লিপে কমপক্ষে একটি বই যোগ করুন।');
      return;
    }

    const totals = finalItems.reduce(
      (acc, it) => ({
        totalBooks: acc.totalBooks + 1,
        totalForma: acc.totalForma + (it.forma || 0),
        totalPlates: acc.totalPlates + (it.plates || 0),
        totalCopies: acc.totalCopies + (it.copies || 0),
        totalChhapa: acc.totalChhapa + (it.chhapa || 0),
        totalSheets: acc.totalSheets + (it.sheets || 0),
        totalReams: Math.round((acc.totalReams + (it.reams || 0)) * 100) / 100,
      }),
      {
        totalBooks: 0,
        totalForma: 0,
        totalPlates: 0,
        totalCopies: 0,
        totalChhapa: 0,
        totalSheets: 0,
        totalReams: 0,
      }
    );

    const payload = {
      slipNo: slipNo.trim() || `ORD-${orderSlips.length + 101}`,
      date: orderDate || today,
      partyId: finalParty.id,
      partyName: finalParty.name,
      partyPhone: finalParty.phone || '',
      machineManName: machineManName.trim(),
      deliveryDate: deliveryDate || undefined,
      status: slipStatus,
      items: finalItems,
      ...totals,
      notes: slipNotes.trim(),
    };

    let savedSlip: OrderSlip;
    if (editingSlip) {
      updateOrderSlip(editingSlip.id, payload);
      savedSlip = {
        ...editingSlip,
        ...payload,
        updatedAt: new Date().toISOString(),
      };
    } else {
      savedSlip = addOrderSlip(payload);
    }

    setIsBuilderOpen(false);
    setEditingSlip(null);
    if (openPrintAfterSave) {
      setSelectedSlipPrint(savedSlip);
    }
  };

  // Filtered list of saved Order Slips
  const filteredSlips = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orderSlips.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (!q) return true;
      const itemBookMatch = (s.items || []).some((it) =>
        it.bookName.toLowerCase().includes(q)
      );
      return (
        s.slipNo.toLowerCase().includes(q) ||
        s.partyName.toLowerCase().includes(q) ||
        (s.machineManName || '').toLowerCase().includes(q) ||
        itemBookMatch
      );
    });
  }, [orderSlips, search, statusFilter]);

  // Sorted books for dropdown (party's linked books first)
  const orderedBooks = useMemo(() => {
    const q = bookSearch.trim().toLowerCase();
    const matched = db.books.filter(
      (b) =>
        !q ||
        b.name.toLowerCase().includes(q) ||
        (b.code || '').toLowerCase().includes(q)
    );
    if (!selectedPartyId) return matched;
    return [...matched].sort((a, b) => {
      const aBelongs = a.partyIds?.includes(selectedPartyId) ? 1 : 0;
      const bBelongs = b.partyIds?.includes(selectedPartyId) ? 1 : 0;
      return bBelongs - aBelongs;
    });
  }, [db.books, bookSearch, selectedPartyId]);

  // =========================================================================
  // VIEW 1: PRINTABLE / PDF MACHINE MAN ORDER SLIP VIEW (NO RATES / NO PRICES)
  // =========================================================================
  if (selectedSlipPrint) {
    const partyObj = db.parties.find((p) => p.id === selectedSlipPrint.partyId);
    const statusInfo = STATUS_CONFIG[selectedSlipPrint.status || 'pending'];

    return (
      <div className="space-y-5">
        {/* Top Control Bar */}
        <div className="no-print flex flex-wrap items-center justify-between gap-2 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={() => setSelectedSlipPrint(null)}
            className="flex items-center space-x-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>অর্ডার স্লিপ তালিকায় ফিরে যান</span>
          </button>

          <div className="flex items-center flex-wrap gap-2">
            {!isReadOnly && (
              <button
                type="button"
                onClick={() => {
                  const s = selectedSlipPrint;
                  setSelectedSlipPrint(null);
                  handleEditSlip(s);
                }}
                className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>সংশোধন করুন</span>
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                triggerPrint(
                  '.print-container',
                  `অর্ডার_স্লিপ_${selectedSlipPrint.slipNo}_${selectedSlipPrint.partyName}`,
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
                  `অর্ডার_স্লিপ_${selectedSlipPrint.slipNo}_${selectedSlipPrint.partyName}`
                )
              }
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition"
            >
              <Printer className="w-4 h-4" />
              <span>মেশিনম্যান স্লিপ প্রিন্ট করুন</span>
            </button>
          </div>
        </div>

        {/* Printable Sheet */}
        <div className="bg-white rounded-2xl border border-slate-300 p-4 sm:p-5 shadow-sm max-w-4xl mx-auto print-container">
          <PrintHeader
            title="ছাপা অর্ডার স্লিপ (PRINT ORDER SLIP — মেশিনম্যান কপি)"
            documentNo={selectedSlipPrint.slipNo}
            date={selectedSlipPrint.date}
          />

          {/* Compact Party & Machine Man Metadata (No duplicate Press Name since PrintHeader shows it) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 mb-2.5 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] leading-tight">
            <div className="col-span-2 sm:col-span-2 flex items-center gap-1.5 truncate">
              <span className="text-slate-500 font-semibold shrink-0">পার্টি:</span>
              <span className="font-black text-emerald-900 truncate">
                {selectedSlipPrint.partyName}
              </span>
              {(partyObj?.phone || selectedSlipPrint.partyPhone) && (
                <span className="text-slate-600 font-semibold shrink-0">
                  ({partyObj?.phone || selectedSlipPrint.partyPhone})
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-slate-500 font-semibold shrink-0">মেশিনম্যান:</span>
              <span className="font-bold text-slate-900 truncate">
                {selectedSlipPrint.machineManName || 'নির্ধারিত মেশিনম্যান'}
              </span>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-2">
              <span className="text-slate-500 font-semibold shrink-0">
                ডেলিভারি:{' '}
                <strong className="text-slate-800 tabular-nums">
                  {selectedSlipPrint.deliveryDate
                    ? formatDate(selectedSlipPrint.deliveryDate, lang, numFmt)
                    : 'যথাশীঘ্রই'}
                </strong>
              </span>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${statusInfo.badgeClass}`}>
                {statusInfo.label.split(' ')[0]}
              </span>
            </div>
          </div>

          {/* Books Table — Strictly NO Rate / Price / Money Columns, Compact Rows for More Books */}
          <div className="overflow-x-auto border border-slate-300 rounded-xl overflow-hidden">
            <table className="w-full text-[11px] leading-tight text-left border-collapse">
              <thead className="bg-slate-800 text-white font-bold">
                <tr>
                  <th className="px-2 py-1.5 text-center w-8">#</th>
                  <th className="px-2 py-1.5">বইয়ের নাম ও ধরন</th>
                  <th className="px-2 py-1.5">কোন কাগজে ছাপা ও সাইজ/কালার</th>
                  <th className="px-2 py-1.5 text-center">ফর্মা</th>
                  <th className="px-2 py-1.5 text-center">প্লেট</th>
                  <th className="px-2 py-1.5 text-center">অর্ডার কপি</th>
                  <th className="px-2 py-1.5 text-center">মোট ছাপা</th>
                  <th className="px-2 py-1.5 text-center">শিট / রিম</th>
                  <th className="px-2 py-1.5">নির্দেশনা</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                {selectedSlipPrint.items.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                    <td className="px-2 py-1 text-center font-bold tabular-nums">
                      {formatNumber(idx + 1, lang, numFmt)}
                    </td>
                    <td className="px-2 py-1">
                      <div className="font-bold text-slate-900">{item.bookName}</div>
                      <div className="text-[9.5px] text-slate-500 flex items-center gap-1">
                        <span>{item.itemType === 'cover' ? '📕 কভার' : '📖 বই'}</span>
                        {item.bookCode && <span className="font-mono">• {item.bookCode}</span>}
                      </div>
                    </td>
                    <td className="px-2 py-1">
                      <div className="font-bold text-emerald-900">
                        {item.paperType || 'অফসেট পেপার'}{' '}
                        {item.paperGsm ? `(${item.paperGsm})` : ''}
                      </div>
                      <div className="text-[9.5px] text-slate-600">
                        সাইজ: {item.paperSize || '২৩×৩৬'} •{' '}
                        {item.colorCount === 1
                          ? item.singleColorType === 'color'
                            ? '১ কালার (রঙিন)'
                            : '১ কালার (কালো)'
                          : `${formatNumber(item.colorCount || 4, lang, numFmt)} কালার`}
                      </div>
                    </td>
                    <td className="px-2 py-1 text-center font-bold tabular-nums">
                      {formatNumber(item.forma, lang, numFmt)}
                    </td>
                    <td className="px-2 py-1 text-center font-bold tabular-nums">
                      {formatNumber(item.plates, lang, numFmt)}
                    </td>
                    <td className="px-2 py-1 text-center font-black text-indigo-900 tabular-nums">
                      {formatNumber(item.copies, lang, numFmt)}
                    </td>
                    <td className="px-2 py-1 text-center font-mono font-bold text-slate-900 tabular-nums">
                      {formatNumber(item.chhapa, lang, numFmt)}
                    </td>
                    <td className="px-2 py-1 text-center tabular-nums">
                      <span className="font-bold text-emerald-800">
                        {formatNumber(item.reams, lang, numFmt)} রিম
                      </span>{' '}
                      <span className="text-[9.5px] text-slate-500">
                        ({formatNumber(item.sheets, lang, numFmt)} শিট)
                      </span>
                    </td>
                    <td className="px-2 py-1 text-[10px] text-slate-600">
                      {item.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-emerald-50 border-t-2 border-slate-700 font-black text-slate-900">
                <tr>
                  <td colSpan={3} className="px-2 py-1.5 text-right">
                    সর্বমোট ({formatNumber(selectedSlipPrint.totalBooks, lang, numFmt)} টি বই):
                  </td>
                  <td className="px-2 py-1.5 text-center tabular-nums">
                    {formatNumber(selectedSlipPrint.totalForma, lang, numFmt)}
                  </td>
                  <td className="px-2 py-1.5 text-center tabular-nums">
                    {formatNumber(selectedSlipPrint.totalPlates, lang, numFmt)}
                  </td>
                  <td className="px-2 py-1.5 text-center text-indigo-900 tabular-nums">
                    {formatNumber(selectedSlipPrint.totalCopies, lang, numFmt)}
                  </td>
                  <td className="px-2 py-1.5 text-center font-mono tabular-nums">
                    {formatNumber(selectedSlipPrint.totalChhapa, lang, numFmt)}
                  </td>
                  <td className="px-2 py-1.5 text-center text-emerald-800 tabular-nums">
                    {formatNumber(selectedSlipPrint.totalReams, lang, numFmt)} রিম{' '}
                    <span className="text-[9.5px] font-semibold text-slate-600">
                      ({formatNumber(selectedSlipPrint.totalSheets, lang, numFmt)} শিট)
                    </span>
                  </td>
                  <td className="px-2 py-1.5"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {selectedSlipPrint.notes && (
            <div className="mt-2.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-950">
              <span className="font-bold">বিশেষ নির্দেশনা / নোট: </span>
              <span>{selectedSlipPrint.notes}</span>
            </div>
          )}

          {/* Custom Machine Man Signature Block */}
          <div className="print-signatures mt-6 pt-3 flex justify-between items-center text-[11px] text-slate-700 border-t border-dashed border-slate-300">
            <div className="text-center">
              <div className="w-32 sm:w-36 border-t border-slate-500 mb-1"></div>
              <p className="font-semibold">অর্ডারদাতা / ম্যানেজার</p>
            </div>
            <div className="text-center">
              <div className="w-32 sm:w-36 border-t border-slate-500 mb-1"></div>
              <p className="font-semibold">প্লেট ও কাগজ ইনচার্জ</p>
            </div>
            <div className="text-center">
              <div className="w-32 sm:w-36 border-t border-slate-500 mb-1"></div>
              <p className="font-semibold">মেশিনম্যানের স্বাক্ষর</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: ORDER SLIP CREATOR / EDITOR + LIST
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Header Strip */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <ClipboardList className="w-6 h-6 text-emerald-700" />
            <span>অর্ডার স্লিপ (মেশিনম্যান প্রিন্টিং অর্ডার)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            পার্টির নাম ও বই নির্বাচন করে ফর্মা, প্লেট, কপি ও রিম হিসাবসহ মেশিনম্যানের জন্য ছাপার অর্ডার স্লিপ তৈরি করুন (দর ছাড়া)
          </p>
        </div>

        {!isBuilderOpen && (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => triggerPrint(null, 'অর্ডার_স্লিপ_তালিকা', { mode: 'pdf' })}
              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition"
            >
              <FileDown className="w-4 h-4" />
              <span>তালিকা PDF</span>
            </button>
            {!isReadOnly && (
              <button
                type="button"
                onClick={handleStartNewSlip}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>+ নতুন অর্ডার স্লিপ তৈরি করুন</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ORDER SLIP BUILDER FORM */}
      {isBuilderOpen && (
        <div className="bg-white rounded-2xl border-2 border-emerald-600/30 shadow-lg overflow-hidden">
          {/* Press Identity Top Bar (First element inside Order Slip as requested) */}
          <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              {db.settings.logoUrl ? (
                <img
                  src={db.settings.logoUrl}
                  alt={db.settings.name}
                  className="w-12 h-12 rounded-xl object-contain bg-white p-1 border border-emerald-400"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center font-black text-xl border border-emerald-400">
                  {(db.settings.name || 'P')[0]}
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  ছাপা অর্ডার স্লিপ (মেশিনম্যান কপি — দর ব্যতীত)
                </p>
                <h3 className="text-lg sm:text-xl font-black tracking-tight">
                  {db.settings.name}
                </h3>
                <p className="text-[11px] text-slate-300">
                  {db.settings.address} {db.settings.phone ? `• ${db.settings.phone}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-end sm:self-center">
              <button
                type="button"
                onClick={() => {
                  setIsBuilderOpen(false);
                  setEditingSlip(null);
                }}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center space-x-1 transition"
              >
                <X className="w-4 h-4" />
                <span>বন্ধ করুন</span>
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-6">
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

            {/* Step 1: Order No, Date, Party Selection (+ Inline Add Party), Machine Man */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    স্লিপ নম্বর
                  </label>
                  <input
                    type="text"
                    value={slipNo}
                    onChange={(e) => setSlipNo(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    অর্ডার তারিখ *
                  </label>
                  <input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ডেলিভারি তারিখ (ঐচ্ছিক)
                  </label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    অবস্থা (Status)
                  </label>
                  <select
                    value={slipStatus}
                    onChange={(e) => setSlipStatus(e.target.value as OrderSlip['status'])}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold bg-white"
                  >
                    <option value="pending">অপেক্ষমাণ (Pending)</option>
                    <option value="printing">ছাপা চলছে (Printing)</option>
                    <option value="completed">ছাপা সম্পন্ন (Completed)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Party Search + Inline New Party Button */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-800">
                      ১. পার্টির নাম নির্বাচন করুন *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewPartyBox((prev) => !prev);
                        setNewPartyForm((prev) => ({
                          ...prev,
                          name: partySearch && !selectedPartyId ? partySearch : prev.name,
                        }));
                      }}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-lg flex items-center space-x-1 transition"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>+ নতুন পার্টি যোগ করুন</span>
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={partySearch}
                      onChange={(e) => {
                        setPartySearch(e.target.value);
                        setSelectedPartyId('');
                        setIsPartyDropdownOpen(true);
                      }}
                      onFocus={() => setIsPartyDropdownOpen(true)}
                      placeholder="পার্টির নাম বা ফোন নম্বর লিখে খুঁজুন..."
                      className="w-full border border-slate-300 rounded-xl pl-8 pr-20 py-2 text-xs font-bold bg-white text-slate-900"
                    />
                    {selectedPartyId && (
                      <span className="absolute right-2 top-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        ✓ নির্বাচিত
                      </span>
                    )}
                  </div>

                  {isPartyDropdownOpen && (
                    <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-56 overflow-y-auto">
                      {db.parties
                        .filter(
                          (p) =>
                            !partySearch.trim() ||
                            p.name.toLowerCase().includes(partySearch.toLowerCase()) ||
                            (p.phone && p.phone.includes(partySearch))
                        )
                        .map((p) => (
                          <button
                            type="button"
                            key={p.id}
                            onClick={() => handleSelectParty(p.id)}
                            className="w-full text-left px-3 py-2 hover:bg-emerald-50 border-b border-slate-100 flex items-center justify-between text-xs transition"
                          >
                            <div>
                              <span className="font-bold text-slate-900 block">{p.name}</span>
                              <span className="text-[10px] text-slate-400">
                                {p.phone || 'ফোন নেই'} {p.address ? `• ${p.address}` : ''}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-700">নির্বাচন</span>
                          </button>
                        ))}
                      <button
                        type="button"
                        onClick={() => {
                          setIsPartyDropdownOpen(false);
                          setShowNewPartyBox(true);
                          setNewPartyForm((prev) => ({
                            ...prev,
                            name: partySearch.trim(),
                          }));
                        }}
                        className="w-full text-left px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center space-x-1.5 transition"
                      >
                        <UserPlus className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {partySearch.trim()
                            ? `+ নতুন পার্টি যোগ করুন: "${partySearch.trim()}"`
                            : '+ সম্পূর্ণ নতুন পার্টি তৈরি করুন'}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Inline New Party Mini-Form */}
                  {showNewPartyBox && (
                    <div className="mt-2 p-3.5 bg-emerald-50/90 border border-emerald-300 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-950 flex items-center space-x-1.5">
                          <UserPlus className="w-3.5 h-3.5 text-emerald-700" />
                          <span>নতুন পার্টি সরাসরি যোগ করুন</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowNewPartyBox(false)}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={newPartyForm.name}
                          onChange={(e) =>
                            setNewPartyForm({ ...newPartyForm, name: e.target.value })
                          }
                          placeholder="পার্টির নাম *"
                          className="border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs font-bold bg-white"
                        />
                        <input
                          type="text"
                          value={newPartyForm.phone}
                          onChange={(e) =>
                            setNewPartyForm({ ...newPartyForm, phone: e.target.value })
                          }
                          placeholder="মোবাইল নম্বর"
                          className="border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                        />
                        <input
                          type="text"
                          value={newPartyForm.contactPerson}
                          onChange={(e) =>
                            setNewPartyForm({ ...newPartyForm, contactPerson: e.target.value })
                          }
                          placeholder="যোগাযোগকারীর নাম"
                          className="border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                        />
                        <input
                          type="text"
                          value={newPartyForm.address}
                          onChange={(e) =>
                            setNewPartyForm({ ...newPartyForm, address: e.target.value })
                          }
                          placeholder="ঠিকানা"
                          className="border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleSaveInlineParty}
                          className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1 transition"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>পার্টি সংরক্ষণ ও নির্বাচন করুন</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Machine Man Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    মেশিনম্যান / অপারেটরের নাম (যিনি বই ছাপাবেন)
                  </label>
                  <input
                    type="text"
                    list="order-slip-operators"
                    value={machineManName}
                    onChange={(e) => setMachineManName(e.target.value)}
                    placeholder="মেশিনম্যানের নাম লিখুন বা নিচে থেকে বাছুন..."
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold bg-white text-slate-900"
                  />
                  <datalist id="order-slip-operators">
                    {db.employees
                      .filter((e) => e.isActive)
                      .map((emp) => (
                        <option key={emp.id} value={emp.name}>
                          {emp.designation}
                        </option>
                      ))}
                  </datalist>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {db.employees
                      .filter((e) => e.isActive)
                      .slice(0, 6)
                      .map((emp) => (
                        <button
                          type="button"
                          key={emp.id}
                          onClick={() => setMachineManName(emp.name)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] border transition ${
                            machineManName === emp.name
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

            {/* Step 2: Select Book (+ Inline Add Book), Auto Forma & Plates, Copy Qty -> Auto Metrics */}
            <div className="bg-indigo-50/40 p-4 rounded-2xl border border-indigo-200 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-200 pb-2.5">
                <h4 className="text-xs sm:text-sm font-black text-indigo-950 flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-indigo-700" />
                  <span>২. ছাপানোর জন্য বই ও কপি যুক্ত করুন (দর ছাড়া)</span>
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewBookBox((prev) => !prev);
                    setNewBookForm((prev) => ({
                      ...prev,
                      name: bookSearch && !selectedBookId ? bookSearch : prev.name,
                    }));
                  }}
                  className="text-[11px] font-bold text-indigo-800 hover:text-indigo-950 bg-white hover:bg-indigo-100 border border-indigo-300 px-3 py-1 rounded-xl flex items-center space-x-1 shadow-2xs transition"
                >
                  <BookPlus className="w-3.5 h-3.5" />
                  <span>+ নতুন বই যোগ করুন</span>
                </button>
              </div>

              {/* Inline New Book Mini-Form (No Rate field!) */}
              {showNewBookBox && (
                <div className="p-3.5 bg-white border-2 border-indigo-300 rounded-xl space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-950 flex items-center space-x-1.5">
                      <BookPlus className="w-4 h-4 text-indigo-600" />
                      <span>
                        নতুন বই সরাসরি তৈরি করুন{' '}
                        {selectedParty ? `(পার্টি: ${selectedParty.name})` : ''}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowNewBookBox(false)}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                        বইয়ের নাম *
                      </label>
                      <input
                        type="text"
                        value={newBookForm.name}
                        onChange={(e) =>
                          setNewBookForm({ ...newBookForm, name: e.target.value })
                        }
                        placeholder="যেমন: আদর্শ নূরানী শিক্ষা"
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                        সাইজ
                      </label>
                      <input
                        type="text"
                        value={newBookForm.size}
                        onChange={(e) =>
                          setNewBookForm({ ...newBookForm, size: e.target.value })
                        }
                        placeholder="২৩×৩৬"
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                        ফর্মা *
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={newBookForm.forma}
                        onChange={(e) =>
                          setNewBookForm({
                            ...newBookForm,
                            forma: parseInt(e.target.value, 10) || 1,
                          })
                        }
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                        প্লেট *
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={newBookForm.plates}
                        onChange={(e) =>
                          setNewBookForm({
                            ...newBookForm,
                            plates: parseInt(e.target.value, 10) || 4,
                          })
                        }
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-center"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <input
                      type="text"
                      value={newBookForm.code}
                      onChange={(e) =>
                        setNewBookForm({ ...newBookForm, code: e.target.value })
                      }
                      placeholder="বইয়ের কোড (ঐচ্ছিক, খালি রাখলে অটো হবে)"
                      className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs w-64"
                    />
                    <button
                      type="button"
                      onClick={handleSaveInlineBook}
                      className="px-3.5 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1 transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>বই সংরক্ষণ ও নির্বাচন করুন</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Book Selector + Item Type + Auto-populated Forma & Plates + Copy Qty */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
                {/* Book Search Dropdown */}
                <div className="lg:col-span-5 relative">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    বই নির্বাচন করুন *
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={bookSearch}
                      onChange={(e) => {
                        setBookSearch(e.target.value);
                        setSelectedBookId('');
                        setIsBookDropdownOpen(true);
                      }}
                      onFocus={() => setIsBookDropdownOpen(true)}
                      placeholder="বইয়ের নাম বা কোড লিখে সার্চ করুন..."
                      className="w-full border border-slate-300 rounded-xl pl-8 pr-2 py-2 text-xs font-bold bg-white text-slate-900"
                    />
                  </div>

                  {isBookDropdownOpen && (
                    <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                      {orderedBooks.map((b) => {
                        const isPartyBook = selectedPartyId && b.partyIds?.includes(selectedPartyId);
                        return (
                          <button
                            type="button"
                            key={b.id}
                            onClick={() => handleSelectBook(b.id)}
                            className="w-full text-left px-3 py-2 hover:bg-indigo-50 border-b border-slate-100 flex items-center justify-between text-xs transition"
                          >
                            <div>
                              <div className="flex items-center space-x-1.5">
                                <span className="font-bold text-slate-900">{b.name}</span>
                                {isPartyBook && (
                                  <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">
                                    এই পার্টির বই
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {b.code} • ফর্মা: {b.forma} • প্লেট: {b.plates} • সাইজ: {b.size || '২৩×৩৬'}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-indigo-700">নির্বাচন</span>
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => {
                          setIsBookDropdownOpen(false);
                          setShowNewBookBox(true);
                          setNewBookForm((prev) => ({
                            ...prev,
                            name: bookSearch.trim(),
                          }));
                        }}
                        className="w-full text-left px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-bold flex items-center space-x-1.5 transition"
                      >
                        <BookPlus className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {bookSearch.trim()
                            ? `+ নতুন বই যোগ করুন: "${bookSearch.trim()}"`
                            : '+ তালিকা থেকে নতুন বই তৈরি করুন'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Item Type (Book / Cover) */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">আইটেম ধরন</label>
                  <select
                    value={itemType}
                    onChange={(e) => {
                      const val = e.target.value as ProductionItemType;
                      setItemType(val);
                      if (val === 'cover') {
                        setItemForma(1);
                        setItemPlates(4);
                        setItemColorCount(4);
                        setItemPaperType('আর্ট পেপার');
                      } else {
                        const b = db.books.find((bk) => bk.id === selectedBookId);
                        if (b) {
                          setItemForma(b.forma || 1);
                          setItemPlates(b.plates || 4);
                        }
                        if (itemPaperType === 'আর্ট পেপার') setItemPaperType('অফসেট পেপার');
                      }
                    }}
                    className="w-full border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold bg-white"
                  >
                    <option value="book">📖 বই (ভেতর)</option>
                    <option value="cover">📕 কভার</option>
                  </select>
                </div>

                {/* Auto Forma */}
                <div className="lg:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1 text-center">
                    ফর্মা
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={itemForma}
                    onChange={(e) => setItemForma(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full border border-slate-300 rounded-xl px-2 py-2 text-xs font-black text-center bg-white"
                  />
                </div>

                {/* Auto Plates */}
                <div className="lg:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1 text-center">
                    প্লেট
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={itemPlates}
                    onChange={(e) => setItemPlates(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full border border-slate-300 rounded-xl px-2 py-2 text-xs font-black text-center bg-white"
                  />
                </div>

                {/* Order Copies Input */}
                <div className="lg:col-span-3">
                  <label className="block text-xs font-bold text-indigo-950 mb-1">
                    ছাপানোর অর্ডার কপি *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={itemCopies}
                    onChange={(e) => setItemCopies(Math.max(1, parseInt(e.target.value, 10) || 0))}
                    className="w-full border-2 border-indigo-400 rounded-xl px-3 py-1.5 text-sm font-black text-indigo-900 text-center bg-white focus:outline-indigo-600"
                  />
                </div>
              </div>

              {/* Paper Type ("কোন কাগজে ছাপা হবে") & Size & Color specs */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start pt-2 border-t border-indigo-100">
                <div className="lg:col-span-3">
                  <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                    কোন কাগজে ছাপা হবে *
                  </label>
                  <input
                    type="text"
                    value={itemPaperType}
                    onChange={(e) => setItemPaperType(e.target.value)}
                    placeholder="যেমন: অফসেট, হোয়াইট, আর্ট পেপার..."
                    className="w-full border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs font-bold bg-white text-slate-900"
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {['অফসেট পেপার', 'হোয়াইট পেপার', 'আর্ট পেপার', 'নিউজপ্রিন্ট'].map((pt) => (
                      <button
                        type="button"
                        key={pt}
                        onClick={() => setItemPaperType(pt)}
                        className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold border transition ${
                          itemPaperType === pt
                            ? 'bg-emerald-700 text-white border-emerald-700'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-emerald-50'
                        }`}
                      >
                        {pt.replace(' পেপার', '')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">কাগজের সাইজ</label>
                  <input
                    type="text"
                    value={itemPaperSize}
                    onChange={(e) => setItemPaperSize(e.target.value)}
                    placeholder="২৩×৩৬"
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold bg-white"
                  />
                </div>
                <div className="lg:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">গ্রাম</label>
                  <input
                    type="text"
                    value={itemPaperGsm}
                    onChange={(e) => setItemPaperGsm(e.target.value)}
                    placeholder="৭০ গ্রাম"
                    className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold bg-white"
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center space-x-1">
                    <Palette className="w-3 h-3 text-indigo-600" />
                    <span>কালার</span>
                  </label>
                  <div className="flex gap-1">
                    {[1, 2, 4].map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => setItemColorCount(c)}
                        className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition ${
                          itemColorCount === c
                            ? 'bg-indigo-700 text-white border-indigo-700'
                            : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        {c} কালার
                      </button>
                    ))}
                  </div>
                  {itemColorCount === 1 && (
                    <div className="flex gap-1 mt-1">
                      <button
                        type="button"
                        onClick={() => setItemSingleColorType('black')}
                        className={`flex-1 py-0.5 rounded text-[9.5px] font-bold border ${
                          itemSingleColorType === 'black'
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        কালো
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemSingleColorType('color')}
                        className={`flex-1 py-0.5 rounded text-[9.5px] font-bold border ${
                          itemSingleColorType === 'color'
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        রঙিন
                      </button>
                    </div>
                  )}
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    বইয়ের নির্দেশনা
                  </label>
                  <input
                    type="text"
                    value={itemNotes}
                    onChange={(e) => setItemNotes(e.target.value)}
                    placeholder="যেমন: ২ সাইড ছাপা..."
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                  />
                </div>
                <div className="lg:col-span-2 flex items-end pt-4">
                  <button
                    type="button"
                    onClick={handleAddBookItem}
                    className="w-full py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>তালিকায় যোগ করুন</span>
                  </button>
                </div>
              </div>

              {/* Live Auto Calculation Strip (Chhapa, Sheets, Reams — NO Rates!) */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-white p-3 rounded-xl border border-indigo-200 text-center">
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 block">ফর্মা</span>
                  <span className="text-sm font-black text-slate-900 tabular-nums">
                    {formatNumber(itemForma, lang, numFmt)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 block">প্লেট</span>
                  <span className="text-sm font-black text-slate-900 tabular-nums">
                    {formatNumber(itemPlates, lang, numFmt)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 block">মোট ছাপা (কপি×ফর্মা)</span>
                  <span className="text-sm font-black text-indigo-800 font-mono tabular-nums">
                    {formatNumber(liveMetrics.chhapa, lang, numFmt)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 block">মোট শিট</span>
                  <span className="text-sm font-black text-slate-800 tabular-nums">
                    {formatNumber(liveMetrics.sheets, lang, numFmt)} শিট
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1 bg-emerald-50 rounded-lg p-1 border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-800 block">কাগজ লাগবে (রিম)</span>
                  <span className="text-sm font-black text-emerald-700 tabular-nums">
                    {formatNumber(liveMetrics.reams, lang, numFmt)} রিম
                  </span>
                </div>
              </div>
            </div>

            {/* Step 3: Added Books Table for This Order Slip */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <Layers className="w-4 h-4 text-emerald-700" />
                  <span>অর্ডার স্লিপে যুক্ত বইয়ের তালিকা ({formatNumber(slipItems.length, lang, numFmt)} টি)</span>
                </h4>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  মেশিনম্যান স্লিপ — কোনো দর প্রদর্শিত হবে না
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b">
                    <tr>
                      <th className="p-2.5 text-center">#</th>
                      <th className="p-2.5">বইয়ের নাম</th>
                      <th className="p-2.5">সাইজ ও কালার</th>
                      <th className="p-2.5 text-center">ফর্মা</th>
                      <th className="p-2.5 text-center">প্লেট</th>
                      <th className="p-2.5 text-center">অর্ডার কপি</th>
                      <th className="p-2.5 text-center">মোট ছাপা</th>
                      <th className="p-2.5 text-center">শিট ও রিম</th>
                      <th className="p-2.5 text-right">মুছুন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {slipItems.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-6 text-center text-slate-400">
                          উপরের বক্স থেকে বই, কপি ও ফর্মা দিয়ে &quot;তালিকায় যোগ করুন&quot; বাটনে ক্লিক করুন (একই অর্ডারে একাধিক বই যোগ করা যাবে)।
                        </td>
                      </tr>
                    ) : (
                      slipItems.map((it, idx) => (
                        <tr key={it.id} className="hover:bg-slate-50">
                          <td className="p-2.5 text-center font-bold tabular-nums">
                            {formatNumber(idx + 1, lang, numFmt)}
                          </td>
                          <td className="p-2.5">
                            <span className="font-bold text-slate-900 block">{it.bookName}</span>
                            <span className="text-[10px] text-slate-500">
                              {it.itemType === 'cover' ? '📕 কভার' : '📖 বই'}
                              {it.notes ? ` • ${it.notes}` : ''}
                            </span>
                          </td>
                          <td className="p-2.5 text-[11px] text-slate-700">
                            <span className="font-bold text-emerald-900 block">
                              {it.paperType || 'অফসেট পেপার'}
                            </span>
                            {it.paperSize} {it.paperGsm ? `(${it.paperGsm})` : ''} • {it.colorCount || 4} কালার
                          </td>
                          <td className="p-2.5 text-center font-bold tabular-nums">
                            {formatNumber(it.forma, lang, numFmt)}
                          </td>
                          <td className="p-2.5 text-center font-bold tabular-nums">
                            {formatNumber(it.plates, lang, numFmt)}
                          </td>
                          <td className="p-2.5 text-center">
                            <input
                              type="number"
                              min={1}
                              value={it.copies}
                              onChange={(e) =>
                                handleUpdateSlipItemCopies(it.id, parseInt(e.target.value, 10) || 1)
                              }
                              className="w-24 border border-indigo-300 rounded-lg px-2 py-1 text-xs font-black text-center text-indigo-900"
                            />
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold tabular-nums">
                            {formatNumber(it.chhapa, lang, numFmt)}
                          </td>
                          <td className="p-2.5 text-center font-bold text-emerald-700 tabular-nums">
                            {formatNumber(it.reams, lang, numFmt)} রিম
                            <span className="block text-[10px] font-normal text-slate-500">
                              ({formatNumber(it.sheets, lang, numFmt)} শিট)
                            </span>
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
                  {slipItems.length > 0 && (
                    <tfoot className="bg-emerald-50 font-black border-t border-emerald-200 text-slate-900">
                      <tr>
                        <td colSpan={3} className="p-2.5 text-right">
                          সর্বমোট ({formatNumber(slipTotals.totalBooks, lang, numFmt)} টি বই):
                        </td>
                        <td className="p-2.5 text-center tabular-nums">
                          {formatNumber(slipTotals.totalForma, lang, numFmt)}
                        </td>
                        <td className="p-2.5 text-center tabular-nums">
                          {formatNumber(slipTotals.totalPlates, lang, numFmt)}
                        </td>
                        <td className="p-2.5 text-center text-indigo-900 tabular-nums">
                          {formatNumber(slipTotals.totalCopies, lang, numFmt)}
                        </td>
                        <td className="p-2.5 text-center font-mono tabular-nums">
                          {formatNumber(slipTotals.totalChhapa, lang, numFmt)}
                        </td>
                        <td className="p-2.5 text-center text-emerald-800 tabular-nums">
                          {formatNumber(slipTotals.totalReams, lang, numFmt)} রিম
                          <span className="block text-[10px] font-semibold text-slate-600">
                            ({formatNumber(slipTotals.totalSheets, lang, numFmt)} শিট)
                          </span>
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* General Notes & Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3 pt-2">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  অর্ডার স্লিপের সার্বিক মন্তব্য / মেশিনম্যানের প্রতি নির্দেশনা
                </label>
                <input
                  type="text"
                  value={slipNotes}
                  onChange={(e) => setSlipNotes(e.target.value)}
                  placeholder="যেমন: কালি ভালোভাবে মিলিয়ে ছাপাবেন, জরুরি অর্ডার..."
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
                  <span>সংরক্ষণ ও মেশিনম্যান স্লিপ দেখুন</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SAVED ORDER SLIPS LIST */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print-container">
        <div className="print-only p-4">
          <PrintHeader title="ছাপা অর্ডার স্লিপ তালিকা (মেশিনম্যান অর্ডার)" />
        </div>

        {/* Search & Status Filter */}
        <div className="no-print p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="স্লিপ নং, পার্টি, বই বা মেশিনম্যানের নাম দিয়ে খুঁজুন..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
            />
          </div>

          <div className="flex items-center space-x-1.5 overflow-x-auto">
            {(
              [
                { id: 'all', label: `সকল (${orderSlips.length})` },
                { id: 'pending', label: 'অপেক্ষমাণ' },
                { id: 'printing', label: 'ছাপা চলছে' },
                { id: 'completed', label: 'সম্পন্ন' },
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
                <th className="p-3">পার্টির নাম</th>
                <th className="p-3">বইয়ের তালিকা</th>
                <th className="p-3">মেশিনম্যান</th>
                <th className="p-3 text-center">ফর্মা / প্লেট</th>
                <th className="p-3 text-center">অর্ডার কপি</th>
                <th className="p-3 text-center">মোট ছাপা ও রিম</th>
                <th className="p-3 text-center">অবস্থা</th>
                <th className="p-3 text-right no-print">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredSlips.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-400">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-bold text-slate-600">এখনো কোনো অর্ডার স্লিপ তৈরি করা হয়নি</p>
                    <p className="text-[11px] mt-1">
                      উপরে &quot;+ নতুন অর্ডার স্লিপ তৈরি করুন&quot; বাটনে ক্লিক করে পার্টির বইয়ের ছাপার অর্ডার তৈরি করুন।
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSlips.map((slip) => {
                  const statusCfg = STATUS_CONFIG[slip.status || 'pending'];
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
                        <span className="font-bold text-slate-900 block">{slip.partyName}</span>
                        {slip.partyPhone && (
                          <span className="text-[10px] text-slate-500">{slip.partyPhone}</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="space-y-0.5 max-w-xs">
                          {(slip.items || []).map((it) => (
                            <div key={it.id} className="text-[11px] text-slate-700 truncate">
                              • <b>{it.bookName}</b> ({formatNumber(it.copies, lang, numFmt)} কপি)
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 font-semibold text-slate-800 whitespace-nowrap">
                        {slip.machineManName || '-'}
                      </td>
                      <td className="p-3 text-center tabular-nums whitespace-nowrap">
                        <span className="font-bold text-slate-900">
                          {formatNumber(slip.totalForma, lang, numFmt)} ফর্মা
                        </span>
                        <span className="block text-[10px] text-slate-500">
                          {formatNumber(slip.totalPlates, lang, numFmt)} প্লেট
                        </span>
                      </td>
                      <td className="p-3 text-center font-black text-indigo-800 tabular-nums">
                        {formatNumber(slip.totalCopies, lang, numFmt)}
                      </td>
                      <td className="p-3 text-center tabular-nums whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 block">
                          {formatNumber(slip.totalChhapa, lang, numFmt)} ছাপা
                        </span>
                        <span className="text-[11px] font-bold text-emerald-700">
                          {formatNumber(slip.totalReams, lang, numFmt)} রিম
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {!isReadOnly ? (
                          <select
                            value={slip.status || 'pending'}
                            onChange={(e) =>
                              updateOrderSlip(slip.id, {
                                status: e.target.value as OrderSlip['status'],
                              })
                            }
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${statusCfg.badgeClass}`}
                          >
                            <option value="pending">অপেক্ষমাণ</option>
                            <option value="printing">ছাপা চলছে</option>
                            <option value="completed">ছাপা সম্পন্ন</option>
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
                          <button
                            type="button"
                            onClick={() => setSelectedSlipPrint(slip)}
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition"
                            title="মেশিনম্যান স্লিপ দেখুন, প্রিন্ট বা PDF ডাউনলোড করুন"
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

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!slipToDelete}
        title="অর্ডার স্লিপ মুছে ফেলুন"
        message={`আপনি কি নিশ্চিত যে "${slipToDelete?.slipNo}" (${slipToDelete?.partyName}) অর্ডার স্লিপটি মুছে ফেলতে চান?`}
        onConfirm={() => {
          if (slipToDelete) {
            deleteOrderSlip(slipToDelete.id);
            setSlipToDelete(null);
          }
        }}
        onCancel={() => setSlipToDelete(null)}
      />
    </div>
  );
};
