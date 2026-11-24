import React, { useState, useRef, useEffect } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { Production, ProductionItemType } from '../../types';
import { calculateProductionMetrics, formatDate, formatNumber } from '../../utils/calculations';
import { translations } from '../../utils/i18n';
import { PrintHeader, PrintSignatures, triggerPrint } from '../common/PrintHeader';
import { ConfirmModal } from '../common/ConfirmModal';
import { SmartNumberInput } from '../common/SmartNumberInput';
import {
  Printer,
  Plus,
  Search,
  Edit2,
  Trash2,
  Calendar,
  FileText,
  CheckCircle2,
  ArrowLeft,
  BookOpen,
  User,
  AlertCircle,
  Palette,
  Layers,
  Box,
  Bookmark,
} from 'lucide-react';
import { PhoneLink } from '../common/PhoneLink';

export const DailyProduction: React.FC = () => {
  const { db, isReadOnly, addProduction, updateProduction, deleteProduction, addParty, addBook, getPaperStockBalance } = useDatabase();
  const lang = db.settings.language;
  const numFmt = db.settings.numberFormat;
  const t = translations[lang];

  const today = new Date().toISOString().split('T')[0];
  const [dateFilter, setDateFilter] = useState('');
  const [partyFilter, setPartyFilter] = useState('');
  const [itemFilter, setItemFilter] = useState<'all' | 'book' | 'cover'>('all');
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProd, setEditingProd] = useState<Production | null>(null);
  const [selectedProdSlip, setSelectedProdSlip] = useState<Production | null>(null);
  const [prodToDelete, setProdToDelete] = useState<Production | null>(null);
  const [warningMessage, setWarningMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Ref to automatically focus first input for continuous data entry
  const partyInputRef = useRef<HTMLInputElement>(null);

  // Search & Combobox states for Party & Book
  const [partySearch, setPartySearch] = useState('');
  const [bookSearch, setBookSearch] = useState('');
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
  const [isBookDropdownOpen, setIsBookDropdownOpen] = useState(false);

  const [form, setForm] = useState({
    date: today,
    partyId: '',
    bookId: '',
    itemType: 'book' as ProductionItemType,
    operatorName: '',
    forma: 1,
    plates: 4,
    chhapa: 1000,
    copies: 1000,
    sheets: 500,
    reams: 1,
    calculationMethod: 'forma_impression',
    paperSize: '২৩×৩৬',
    paperGsm: '৭০ গ্রাম',
    paperType: 'অফসেট পেপার',
    colorCount: 4,
    singleColorType: 'black' as 'black' | 'color',
    notes: '',
  });

  // Focus the first input field whenever modal is opened
  useEffect(() => {
    if (isModalOpen) {
      setTimeout(() => {
        partyInputRef.current?.focus();
      }, 100);
    }
  }, [isModalOpen]);

  // When party changes, pre-select their first book if available
  const handlePartyChange = (partyId: string) => {
    const party = db.parties.find((p) => p.id === partyId);
    const partyBooks = db.books.filter((b) => b.partyIds?.includes(partyId));
    const firstBook = partyBooks[0] || db.books[0];
    setForm((prev) => ({
      ...prev,
      partyId,
      bookId: firstBook?.id || '',
      forma: firstBook?.forma || 1,
      plates: firstBook?.plates || 4,
    }));
    if (party) setPartySearch(party.name);
    if (firstBook) setBookSearch(firstBook.name);
    setIsPartyDropdownOpen(false);
    recalcMetrics(firstBook?.forma || form.forma, form.chhapa, form.copies);
  };

  const handleBookChange = (bookId: string) => {
    const book = db.books.find((b) => b.id === bookId);
    if (book) {
      setForm((prev) => ({
        ...prev,
        bookId,
        forma: book.forma,
        plates: book.plates,
        paperSize: book.size || prev.paperSize,
      }));
      setBookSearch(book.name);
      setIsBookDropdownOpen(false);
      recalcMetrics(book.forma, form.chhapa, form.copies);
    }
  };

  const handleQuickAddParty = (name: string) => {
    if (!name.trim()) return;
    const existing = db.parties.find(
      (p) => p.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    if (existing) {
      handlePartyChange(existing.id);
      return;
    }
    const created = addParty({
      name: name.trim(),
      contactPerson: '',
      address: '',
      phone: '',
      openingDue: 0,
      isActive: true,
    });
    setForm((prev) => ({ ...prev, partyId: created.id }));
    setPartySearch(created.name);
    setIsPartyDropdownOpen(false);
  };

  const handleQuickAddBook = (name: string) => {
    if (!name.trim()) return;
    const existing = db.books.find(
      (b) => b.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    if (existing) {
      handleBookChange(existing.id);
      return;
    }
    const created = addBook({
      name: name.trim(),
      code: `BK-${Date.now().toString().slice(-4)}`,
      forma: form.forma || 1,
      plates: form.plates || 4,
      defaultRate: db.settings.globalDefaultRatePerForma || 450,
      partyIds: form.partyId ? [form.partyId] : [],
      isActive: true,
    });
    setForm((prev) => ({
      ...prev,
      bookId: created.id,
      forma: created.forma,
      plates: created.plates,
    }));
    setBookSearch(created.name);
    setIsBookDropdownOpen(false);
  };

  const recalcMetrics = (forma: number, chhapa: number, copies: number) => {
    const metrics = calculateProductionMetrics(
      forma,
      chhapa,
      copies,
      db.settings.sheetsPerReam || 500,
      form.calculationMethod as any
    );
    setForm((prev) => ({
      ...prev,
      sheets: metrics.calculatedSheets,
      reams: metrics.calculatedReams,
    }));
  };

  const handleOpenModal = (prod?: Production) => {
    if (isReadOnly) return;
    setErrorMessage('');
    setSuccessMessage('');
    setIsPartyDropdownOpen(false);
    setIsBookDropdownOpen(false);

    if (prod) {
      setEditingProd(prod);
      const existingParty = db.parties.find((p) => p.id === prod.partyId);
      const existingBook = db.books.find((b) => b.id === prod.bookId);
      setPartySearch(existingParty?.name || '');
      setBookSearch(existingBook?.name || '');
      setForm({
        date: prod.date,
        partyId: prod.partyId,
        bookId: prod.bookId,
        itemType: prod.itemType || 'book',
        operatorName: prod.operatorName || '',
        forma: prod.forma,
        plates: prod.plates,
        chhapa: prod.chhapa,
        copies: prod.copies,
        sheets: prod.sheets,
        reams: prod.reams,
        calculationMethod: prod.calculationMethod || 'forma_impression',
        paperSize: prod.paperSize || '২৩×৩৬',
        paperGsm: prod.paperGsm || '৭০ গ্রাম',
        paperType: prod.paperType || 'অফসেট পেপার',
        colorCount: prod.colorCount !== undefined ? prod.colorCount : (prod.plates || 4),
        singleColorType: prod.singleColorType || 'black',
        notes: prod.notes || '',
      });
    } else {
      setEditingProd(null);
      const defaultParty = db.parties[0];
      const partyBooks = defaultParty ? db.books.filter((b) => b.partyIds?.includes(defaultParty.id)) : [];
      const defaultBook = partyBooks[0] || db.books[0];
      setPartySearch(defaultParty?.name || '');
      setBookSearch(defaultBook?.name || '');
      setForm({
        date: today,
        partyId: defaultParty?.id || '',
        bookId: defaultBook?.id || '',
        itemType: 'book',
        operatorName: '',
        forma: defaultBook?.forma || 1,
        plates: defaultBook?.plates || 4,
        chhapa: 1000,
        copies: 1000,
        sheets: 500,
        reams: 1,
        calculationMethod: 'forma_impression',
        paperSize: '২৩×৩৬',
        paperGsm: '৭০ গ্রাম',
        paperType: 'অফসেট পেপার',
        colorCount: 4,
        singleColorType: 'black',
        notes: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    let finalPartyId = form.partyId;
    if (!finalPartyId && partySearch.trim()) {
      const existing = db.parties.find(
        (p) => p.name.trim().toLowerCase() === partySearch.trim().toLowerCase()
      );
      if (existing) {
        finalPartyId = existing.id;
      } else {
        const createdParty = addParty({
          name: partySearch.trim(),
          contactPerson: '',
          address: '',
          phone: '',
          openingDue: 0,
          isActive: true,
        });
        finalPartyId = createdParty.id;
      }
    }

    if (!finalPartyId) {
      setErrorMessage('অনুগ্রহ করে সার্চ করে পার্টি নির্বাচন করুন অথবা নতুন পার্টির নাম লিখুন');
      return;
    }

    let finalBookId = form.bookId;
    if (!finalBookId && bookSearch.trim()) {
      const existingBook = db.books.find(
        (b) => b.name.trim().toLowerCase() === bookSearch.trim().toLowerCase()
      );
      if (existingBook) {
        finalBookId = existingBook.id;
      } else {
        const createdBook = addBook({
          name: bookSearch.trim(),
          code: `BK-${Date.now().toString().slice(-4)}`,
          forma: form.forma || 1,
          plates: form.plates || 4,
          defaultRate: db.settings.globalDefaultRatePerForma || 450,
          partyIds: [finalPartyId],
          isActive: true,
        });
        finalBookId = createdBook.id;
      }
    }

    if (!finalBookId) {
      setErrorMessage('অনুগ্রহ করে সার্চ করে বই নির্বাচন করুন অথবা নতুন বইয়ের নাম লিখুন');
      return;
    }

    const payload = {
      ...form,
      itemType: form.itemType || 'book',
      operatorName: form.operatorName.trim(),
      partyId: finalPartyId,
      bookId: finalBookId,
    };

    if (editingProd) {
      updateProduction(editingProd.id, payload);
      setIsModalOpen(false);
    } else {
      addProduction(payload);
      setSuccessMessage(`প্রডাকশন (${form.itemType === 'cover' ? 'কভার' : 'বই'}) সফলভাবে সেভ হয়েছে! নতুন এন্ট্রি করতে পারেন।`);
      setTimeout(() => setSuccessMessage(''), 4000);
      // Reset numeric and detail fields ready for next entry while preserving date and selected party
      setForm((prev) => ({
        ...prev,
        chhapa: 1000,
        copies: 1000,
        sheets: 500,
        reams: 1,
        notes: '',
      }));
      // Automatically return focus to the first field so user never needs to touch the mouse
      setTimeout(() => {
        partyInputRef.current?.focus();
        partyInputRef.current?.select();
      }, 50);
    }
  };

  const handleDelete = (prod: Production) => {
    if (isReadOnly) return;
    if (prod.isBilled) {
      setWarningMessage(
        'এই প্রডাকশনটির বিপরীতে ইনভয়েস তৈরি করা হয়েছে। প্রথমে ইনভয়েস ডিলিট বা পরিবর্তন করুন।'
      );
      return;
    }
    setProdToDelete(prod);
  };

  // Filtered productions
  const filteredProductions = db.productions.filter((p) => {
    const matchDate = dateFilter ? p.date === dateFilter : true;
    const matchParty = partyFilter ? p.partyId === partyFilter : true;
    const pItemType = p.itemType || 'book';
    const matchItem = itemFilter === 'all' ? true : pItemType === itemFilter;
    const party = db.parties.find((pty) => pty.id === p.partyId);
    const book = db.books.find((b) => b.id === p.bookId);
    const matchSearch = search
      ? party?.name.toLowerCase().includes(search.toLowerCase()) ||
        book?.name.toLowerCase().includes(search.toLowerCase()) ||
        (pItemType === 'cover' ? 'কভার cover'.includes(search.toLowerCase()) : 'বই book'.includes(search.toLowerCase()))
      : true;
    return matchDate && matchParty && matchItem && matchSearch;
  });

  const totalReams = filteredProductions.reduce((s, p) => s + p.reams, 0);
  const totalSheets = filteredProductions.reduce((s, p) => s + p.sheets, 0);
  const totalBookReams = filteredProductions.filter(p => (p.itemType || 'book') === 'book').reduce((s, p) => s + p.reams, 0);
  const totalCoverReams = filteredProductions.filter(p => p.itemType === 'cover').reduce((s, p) => s + p.reams, 0);

  if (selectedProdSlip) {
    const slipParty = db.parties.find((pty) => pty.id === selectedProdSlip.partyId);
    const slipBook = db.books.find((b) => b.id === selectedProdSlip.bookId);

    return (
      <div className="space-y-6">
        <div className="no-print flex items-center justify-between">
          <button
            onClick={() => setSelectedProdSlip(null)}
            className="flex items-center space-x-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 px-3 py-2 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>প্রডাকশন তালিকায় ফিরে যান</span>
          </button>

          <button
            onClick={() => triggerPrint()}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>প্রডাকশন স্লিপ প্রিন্ট করুন</span>
          </button>
        </div>

        {/* Printable Production Slip */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs max-w-2xl mx-auto print-container">
          <PrintHeader
            title="দৈনিক প্রডাকশন স্লিপ (PRODUCTION SLIP / JOB SLIP)"
            documentNo={`PROD-${selectedProdSlip.id.slice(-6)}`}
            date={selectedProdSlip.date}
          />

          <div className="my-6 space-y-4 text-xs text-slate-800 border p-5 rounded-xl bg-slate-50/50">
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">কাস্টমার / পার্টির নাম:</span>
              <span className="font-bold text-slate-900 text-sm">{slipParty?.name || 'অজ্ঞাত পার্টি'}</span>
            </div>
            {slipParty && (
              <div className="flex justify-between border-b pb-2 items-center">
                <span className="text-slate-500 font-semibold">যোগাযোগ ও ফোন:</span>
                <span className="flex items-center space-x-1 font-semibold">
                  <span>{slipParty.contactPerson || '-'} |</span>
                  <PhoneLink phone={slipParty.phone} showWhatsApp={true} />
                </span>
              </div>
            )}
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">কাজের বিবরণ / বইয়ের নাম:</span>
              <span className="font-bold text-slate-900 text-sm">{slipBook?.name || 'অজ্ঞাত বই'}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">ছাপার ধরন / আইটেম:</span>
              <span className="font-bold text-slate-900 text-sm">
                {selectedProdSlip.itemType === 'cover' ? '📕 কভার (Cover)' : '📖 বই (Book - ভেতরের ফর্মা)'}
              </span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">প্রডাকশন তারিখ:</span>
              <span className="font-bold tabular-nums">{formatDate(selectedProdSlip.date, lang, numFmt)}</span>
            </div>

            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">মেশিনম্যান / অপারেটর:</span>
              <span className="font-bold text-slate-800">{selectedProdSlip.operatorName || 'সাধারণ অপারেটর'}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-lg border">
              <div>
                <span className="text-slate-500 text-[11px] block">কাগজের সাইজ ও গ্রাম:</span>
                <span className="font-bold text-sm text-slate-900">
                  {selectedProdSlip.paperSize || 'অনির্দিষ্ট'} {selectedProdSlip.paperGsm ? `(${selectedProdSlip.paperGsm})` : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">কাগজের ধরন:</span>
                <span className="font-bold text-sm text-slate-900">{selectedProdSlip.paperType || 'অফসেট পেপার'}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">ছাপার কালার:</span>
                <span className="font-bold text-sm text-indigo-900">
                  {selectedProdSlip.colorCount ? `${formatNumber(selectedProdSlip.colorCount, lang, numFmt)} কালার` : '৪ কালার'}
                  {selectedProdSlip.colorCount === 1 ? (
                    selectedProdSlip.singleColorType === 'color' ? ' (🎨 রঙিন / স্পট)' : ' (⚫ কালো)'
                  ) : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">ফর্মা সংখ্যা:</span>
                <span className="font-bold text-sm text-slate-900 tabular-nums">{formatNumber(selectedProdSlip.forma, lang, numFmt)} ফর্মা</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">প্লেট সংখ্যা:</span>
                <span className="font-bold text-sm text-slate-900 tabular-nums">{formatNumber(selectedProdSlip.plates, lang, numFmt)} টি প্লেট</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">ছাপা / ইমপ্রেশন:</span>
                <span className="font-mono font-bold text-sm text-slate-900 tabular-nums">{formatNumber(selectedProdSlip.chhapa, lang, numFmt)}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">মুদ্রিত কপি:</span>
                <span className="font-bold text-sm text-slate-900 tabular-nums">{formatNumber(selectedProdSlip.copies, lang, numFmt)} কপি</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">মোট শিট (কাগজ):</span>
                <span className="font-mono font-bold text-sm text-slate-900 tabular-nums">{formatNumber(selectedProdSlip.sheets, lang, numFmt)} শিট</span>
              </div>
              <div className="col-span-2 bg-emerald-50/70 p-2 rounded border border-emerald-200 flex justify-between items-center">
                <span className="text-emerald-800 text-xs font-bold">কাগজের পরিমাণ (রিম):</span>
                <span className="font-black text-base text-emerald-800 tabular-nums">{formatNumber(selectedProdSlip.reams, lang, numFmt)} রিম</span>
              </div>
            </div>

            <div className="flex justify-between border-b pb-2 pt-1">
              <span className="text-slate-500 font-semibold">বিল স্ট্যাটাস:</span>
              <span className={`font-bold ${selectedProdSlip.isBilled ? 'text-emerald-700' : 'text-amber-700'}`}>
                {selectedProdSlip.isBilled ? 'বিল তৈরি সম্পন্ন' : 'বিল করা হয়নি (বকেয়া)'}
              </span>
            </div>

            {selectedProdSlip.notes && (
              <div className="flex justify-between pt-1">
                <span className="text-slate-500 font-semibold">মন্তব্য ও বিশেষ নির্দেশনা:</span>
                <span className="font-medium text-slate-700">{selectedProdSlip.notes}</span>
              </div>
            )}
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
          <h2 className="text-xl font-bold text-slate-900">{t.productionList}</h2>
          <p className="text-xs text-slate-500">
            দৈনিক অফসেট ছাপা ও প্রডাকশন এন্ট্রি | মোট রেকর্ড: {db.productions.length} টি
          </p>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => triggerPrint()}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>প্রিন্ট শিট</span>
          </button>
          {!isReadOnly && (
            <button
              onClick={() => handleOpenModal()}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addProduction}</span>
            </button>
          )}
        </div>
      </div>

      {/* Printable Header */}
      <div className="print-only">
        <PrintHeader
          title="দৈনিক প্রডাকশন শিট (Offset Printing Sheet)"
          subtitle={`তারিখ: ${dateFilter || 'সর্বমোট রিপোর্ট'} | মোট রিম: ${totalReams}`}
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
            placeholder="পার্টি বা বইয়ের নাম..."
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
            <button onClick={() => setDateFilter('')} className="text-[10px] text-slate-500 hover:text-black">
              সব তারিখ
            </button>
          )}
        </div>

        <div className="border-l pl-3">
          <select
            value={partyFilter}
            onChange={(e) => setPartyFilter(e.target.value)}
            className="text-xs border rounded p-1.5"
          >
            <option value="">সকল পার্টি</option>
            {db.parties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Item Type Filter (বই নাকি কভার) */}
        <div className="border-l pl-3">
          <select
            value={itemFilter}
            onChange={(e) => setItemFilter(e.target.value as 'all' | 'book' | 'cover')}
            className="text-xs border rounded p-1.5 font-medium bg-slate-50"
          >
            <option value="all">সকল আইটেম (বই ও কভার)</option>
            <option value="book">📖 শুধু বই (ভেতরের ফর্মা)</option>
            <option value="cover">📕 শুধু কভার</option>
          </select>
        </div>

        {/* Summary Badges for Book vs Cover */}
        <div className="border-l pl-3 flex items-center space-x-2 text-[11px]">
          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-bold tabular-nums">
            📖 বই: {formatNumber(totalBookReams, lang, numFmt)} রিম
          </span>
          <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 font-bold tabular-nums">
            📕 কভার: {formatNumber(totalCoverReams, lang, numFmt)} রিম
          </span>
        </div>
      </div>

      {/* Productions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b">
              <tr>
                <th className="p-3">তারিখ</th>
                <th className="p-3">পার্টির নাম</th>
                <th className="p-3">বইয়ের নাম</th>
                <th className="p-3">মেশিনম্যান</th>
                <th className="p-3 text-center">আইটেম</th>
                <th className="p-3">সাইজ ও গ্রাম</th>
                <th className="p-3 text-center">কালার</th>
                <th className="p-3 text-center">ফর্মা</th>
                <th className="p-3 text-center">প্লেট</th>
                <th className="p-3 text-center">ছাপা (ইমপ্রেশন)</th>
                <th className="p-3 text-center">কপি</th>
                <th className="p-3 text-center">মোট শিট</th>
                <th className="p-3 text-center">মোট রিম</th>
                <th className="p-3 text-center">বিলের অবস্থা</th>
                <th className="p-3 text-right no-print">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredProductions.length === 0 ? (
                <tr>
                  <td colSpan={15} className="p-8 text-center text-slate-400">
                    কোনো প্রডাকশন রেকর্ড পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredProductions.map((p) => {
                  const party = db.parties.find((pty) => pty.id === p.partyId);
                  const book = db.books.find((b) => b.id === p.bookId);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 whitespace-nowrap tabular-nums">{formatDate(p.date, lang, numFmt)}</td>
                      <td className="p-3 font-bold text-slate-900">{party?.name || 'অজ্ঞাত'}</td>
                      <td className="p-3 font-semibold text-slate-700">{book?.name || 'অজ্ঞাত বই'}</td>
                      <td className="p-3 font-medium text-slate-800 whitespace-nowrap">{p.operatorName || '-'}</td>
                      <td className="p-3 text-center whitespace-nowrap">
                        {p.itemType === 'cover' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            📕 কভার
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            📖 বই
                          </span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block">{p.paperSize || '২৩×৩৬'}</span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {p.paperGsm || '৭০ গ্রাম'}{p.paperType ? ` | ${p.paperType}` : ''}
                        </span>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        {p.colorCount === 1 ? (
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              p.singleColorType === 'color'
                                ? 'bg-pink-100 text-pink-800 border border-pink-200'
                                : 'bg-slate-200 text-slate-800 border border-slate-300'
                            }`}
                          >
                            {p.singleColorType === 'color' ? '🎨 ১ (রঙিন)' : '⚫ ১ (কালো)'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                            {p.colorCount ? `${formatNumber(p.colorCount, lang, numFmt)} কালার` : '৪ কালার'}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center tabular-nums font-semibold">{formatNumber(p.forma, lang, numFmt)}</td>
                      <td className="p-3 text-center tabular-nums font-semibold">{formatNumber(p.plates, lang, numFmt)}</td>
                      <td className="p-3 text-center font-mono tabular-nums font-semibold">{formatNumber(p.chhapa, lang, numFmt)}</td>
                      <td className="p-3 text-center tabular-nums font-semibold">{formatNumber(p.copies, lang, numFmt)}</td>
                      <td className="p-3 text-center tabular-nums font-semibold">{formatNumber(p.sheets, lang, numFmt)}</td>
                      <td className="p-3 text-center font-bold text-emerald-700 tabular-nums">{formatNumber(p.reams, lang, numFmt)}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.isBilled
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.isBilled ? 'বিল হয়েছে' : 'বকেয়া বিল'}
                        </span>
                      </td>
                      <td className="p-3 text-right no-print">
                        <div className="flex justify-end space-x-1">
                          <button
                            onClick={() => setSelectedProdSlip(p)}
                            className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded"
                            title="প্রডাকশন স্লিপ দেখুন ও প্রিন্ট করুন"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {!isReadOnly && (
                            <>
                              <button
                                onClick={() => handleOpenModal(p)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                                title="সম্পাদনা"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(p)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"
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
            <tfoot className="bg-slate-100 font-bold border-t text-slate-900">
              <tr>
                <td colSpan={11} className="p-3 text-right">
                  সর্বমোট (বই: {formatNumber(totalBookReams, lang, numFmt)} রিম, কভার: {formatNumber(totalCoverReams, lang, numFmt)} রিম):
                </td>
                <td className="p-3 text-center tabular-nums">{formatNumber(totalSheets, lang, numFmt)}</td>
                <td className="p-3 text-center text-emerald-800 tabular-nums">{formatNumber(totalReams, lang, numFmt)} রিম</td>
                <td colSpan={2} className="p-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="print-only p-4">
          <PrintSignatures />
        </div>
      </div>

      {/* Modal: Add/Edit Production with Direct Party & Book Typing */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border my-auto max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              {editingProd ? 'প্রডাকশন রেকর্ড সংশোধন' : 'নতুন দৈনিক প্রডাকশন এন্ট্রি'}
            </h3>

            {successMessage && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-between shadow-2xs animate-fade-in">
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
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              {/* Item Type Selector: Book vs Cover */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    ছাপার আইটেম / ধরন নির্বাচন করুন *
                  </label>
                  <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border">
                    {form.itemType === 'cover' ? '📕 কভার মোড' : '📖 বই মোড'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        itemType: 'book',
                        paperType: prev.paperType === 'আর্ট পেপার' ? 'অফসেট পেপার' : prev.paperType,
                      }));
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center space-x-2 transition ${
                      form.itemType === 'book'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>📖 বই (ভেতরের ফর্মা)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        itemType: 'cover',
                        forma: 1,
                        plates: 4,
                        colorCount: 4,
                        paperType: prev.paperType === 'অফসেট পেপার' ? 'আর্ট পেপার' : prev.paperType,
                      }));
                      recalcMetrics(1, form.chhapa, form.copies);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center space-x-2 transition ${
                      form.itemType === 'cover'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>📕 কভার (বইয়ের কভার)</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  {form.itemType === 'cover'
                    ? '💡 কভার সিলেক্ট করা হয়েছে। ফর্মা ১ ও ৪ কালার প্লেট স্বয়ংক্রিয়ভাবে কার্যকর হয়েছে।'
                    : '💡 বইয়ের ভেতরের ফর্মা ছাপা হবে।'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">তারিখ *</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full border rounded-lg p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">হিসাব পদ্ধতি</label>
                  <select
                    value={form.calculationMethod}
                    onChange={(e) => {
                      setForm({ ...form, calculationMethod: e.target.value });
                      recalcMetrics(form.forma, form.chhapa, form.copies);
                    }}
                    className="w-full border rounded-lg p-2 text-xs"
                  >
                    <option value="forma_impression">ফর্মা ও ইমপ্রেশন পদ্ধতি (Forma × Chhapa)</option>
                    <option value="copies_direct">কপি সরাসরি পদ্ধতি (Direct Copies)</option>
                  </select>
                </div>
              </div>

              {/* Party & Book Search Bars with Autocomplete & Quick Add */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Party Search Bar */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      পার্টি অনুসন্ধান বা যোগ করুন *
                    </label>
                    {form.partyId && (
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        ✓ নির্বাচিত
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3 pointer-events-none" />
                    <input
                      ref={partyInputRef}
                      type="text"
                      required
                      value={partySearch}
                      onChange={(e) => {
                        setPartySearch(e.target.value);
                        setForm((prev) => ({ ...prev, partyId: '' }));
                        setIsPartyDropdownOpen(true);
                      }}
                      onFocus={() => setIsPartyDropdownOpen(true)}
                      placeholder="পার্টির নাম বা ফোন দিয়ে সার্চ করুন..."
                      className="w-full border rounded-lg pl-8 pr-2 py-2 text-xs font-bold text-slate-900 bg-white"
                    />
                  </div>

                  {/* Party Dropdown */}
                  {isPartyDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-52 overflow-y-auto">
                      {db.parties
                        .filter(
                          (p) =>
                            p.name.toLowerCase().includes(partySearch.toLowerCase()) ||
                            (p.phone && p.phone.includes(partySearch))
                        )
                        .map((p) => (
                          <div
                            key={p.id}
                            onClick={() => handlePartyChange(p.id)}
                            className="p-2.5 hover:bg-emerald-50 cursor-pointer text-xs border-b border-slate-100 flex justify-between items-center transition"
                          >
                            <div>
                              <span className="font-bold text-slate-900 block">{p.name}</span>
                              <span className="text-[10px] text-slate-400">{p.phone || 'ফোন নেই'}</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500">নির্বাচন</span>
                          </div>
                        ))}

                      {partySearch.trim() && (
                        <div
                          onClick={() => handleQuickAddParty(partySearch)}
                          className="p-2.5 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 text-xs font-bold cursor-pointer flex items-center space-x-1.5 transition"
                        >
                          <Plus className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span>+ নতুন পার্টি হিসাবে যোগ করুন: "{partySearch}"</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Book Search Bar */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      বইয়ের নাম অনুসন্ধান বা যোগ করুন *
                    </label>
                    {form.bookId && (
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        ✓ নির্বাচিত
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={bookSearch}
                      onChange={(e) => {
                        setBookSearch(e.target.value);
                        setForm((prev) => ({ ...prev, bookId: '' }));
                        setIsBookDropdownOpen(true);
                      }}
                      onFocus={() => setIsBookDropdownOpen(true)}
                      placeholder="বইয়ের নাম বা কোড দিয়ে সার্চ করুন..."
                      className="w-full border rounded-lg pl-8 pr-2 py-2 text-xs font-bold text-slate-900 bg-white"
                    />
                  </div>

                  {/* Book Dropdown */}
                  {isBookDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-52 overflow-y-auto">
                      {db.books
                        .filter(
                          (b) =>
                            b.name.toLowerCase().includes(bookSearch.toLowerCase()) ||
                            b.code.toLowerCase().includes(bookSearch.toLowerCase())
                        )
                        .map((b) => {
                          const isPartyBook = form.partyId && b.partyIds?.includes(form.partyId);
                          return (
                            <div
                              key={b.id}
                              onClick={() => handleBookChange(b.id)}
                              className="p-2.5 hover:bg-emerald-50 cursor-pointer text-xs border-b border-slate-100 flex justify-between items-center transition"
                            >
                              <div>
                                <div className="flex items-center space-x-1.5">
                                  <span className="font-bold text-slate-900">{b.name}</span>
                                  {isPartyBook && (
                                    <span className="text-[9px] bg-blue-100 text-blue-800 px-1 py-0.2 rounded font-bold">
                                      এই পার্টির বই
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {b.code} | {b.forma} ফর্মা | {b.plates} প্লেট
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-slate-500">নির্বাচন</span>
                            </div>
                          );
                        })}

                      {bookSearch.trim() && (
                        <div
                          onClick={() => handleQuickAddBook(bookSearch)}
                          className="p-2.5 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 text-xs font-bold cursor-pointer flex items-center space-x-1.5 transition"
                        >
                          <Plus className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span>+ নতুন বই হিসাবে যোগ করুন: "{bookSearch}"</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Paper Custom Size, GSM & Type with specific Party Stock Deduction */}
              <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200 space-y-3">
                <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                  <span className="text-xs font-bold text-amber-950 flex items-center space-x-1.5">
                    <Box className="w-4 h-4 text-amber-700" />
                    <span>কাগজের সাইজ, গ্রাম (GSM) ও ধরন (পার্টির নিজস্ব স্টক থেকে খরচ হবে)</span>
                  </span>
                  <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-full">
                    প্লেট ও কাগজ খাতা লিংক
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Paper Size: 100% Custom writable */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      কাগজের সাইজ (ইচ্ছামত লিখুন) *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.paperSize}
                      onChange={(e) => setForm({ ...form, paperSize: e.target.value })}
                      placeholder="যেমন: ২৩×৩৬, ২০×৩০, ২৪×৩৬"
                      className="w-full border rounded-lg p-2 text-xs font-bold bg-white text-slate-900 border-amber-300 focus:ring-1 focus:ring-amber-500"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {['20*30 DC', '23*36 DD', '২৩×৩৬', '২০×৩০', '২৫×৩৭', '১৮×২৮', '২৪×৩৬'].map((s) => (
                        <button
                          type="button"
                          key={s}
                          onClick={() => setForm({ ...form, paperSize: s })}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                            form.paperSize === s ||
                            (s === '20*30 DC' && (form.paperSize === '২০×৩০' || form.paperSize === '20*30')) ||
                            (s === '23*36 DD' && (form.paperSize === '২৩×৩৬' || form.paperSize === '23*36'))
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Paper GSM: Custom writable with chips */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      কাগজের গ্রাম (GSM) *
                    </label>
                    <input
                      type="text"
                      value={form.paperGsm}
                      onChange={(e) => setForm({ ...form, paperGsm: e.target.value })}
                      placeholder="যেমন: ৭০ গ্রাম, ৬৫ গ্রাম, ৮০ গ্রাম"
                      className="w-full border rounded-lg p-2 text-xs font-bold bg-white text-slate-900 border-amber-300 focus:ring-1 focus:ring-amber-500"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {['৫৫ গ্রাম', '৬৫ গ্রাম', '৭০ গ্রাম', '৭৫ গ্রাম', '৮০ গ্রাম', '১০০ গ্রাম'].map((g) => (
                        <button
                          type="button"
                          key={g}
                          onClick={() => setForm({ ...form, paperGsm: g })}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                            form.paperGsm === g
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Paper Type */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      কাগজের ধরন
                    </label>
                    <input
                      type="text"
                      value={form.paperType}
                      onChange={(e) => setForm({ ...form, paperType: e.target.value })}
                      placeholder="যেমন: অফসেট পেপার, আর্ট পেপার"
                      className="w-full border rounded-lg p-2 text-xs font-bold bg-white text-slate-900 border-amber-300 focus:ring-1 focus:ring-amber-500"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {['অফসেট পেপার', 'হোয়াইট পেপার', 'আর্ট পেপার', 'নিউজপ্রিন্ট'].map((pt) => (
                        <button
                          type="button"
                          key={pt}
                          onClick={() => setForm({ ...form, paperType: pt })}
                          className={`px-1.5 py-0.5 rounded text-[10px] border transition ${
                            form.paperType === pt
                              ? 'bg-amber-600 text-white border-amber-600 font-bold'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50'
                          }`}
                        >
                          {pt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Live Party Stock Balance Indicator */}
                {form.partyId && (
                  <div className="bg-white p-2.5 rounded-lg border border-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1 shadow-2xs">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className="text-slate-600 font-medium">
                        নির্বাচিত পার্টির বর্তমান স্টক ব্যালেন্স:
                      </span>
                      <span
                        className={`font-black font-mono text-sm ${
                          getPaperStockBalance(form.paperSize, form.paperType, form.partyId, form.paperGsm) <= 0
                            ? 'text-rose-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        {getPaperStockBalance(form.paperSize, form.paperType, form.partyId, form.paperGsm).toFixed(2)} রিম
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-900 font-semibold bg-amber-100/70 px-2 py-0.5 rounded">
                      প্রডাকশন সেভ করলে শুধুমাত্র এই পার্টির স্টক থেকেই {form.reams} রিম খরচ হবে
                    </span>
                  </div>
                )}
              </div>

              {/* Printing Color Selection (কয় কালার ছাপা & ১ কালার হলে কালো না রঙিন) */}
              <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Palette className="w-4 h-4 text-indigo-700" />
                    <span>কয় কালার ছাপা হবে? *</span>
                  </label>
                  <span className="text-[10px] text-indigo-700 font-bold bg-indigo-100 px-2 py-0.5 rounded-full">
                    কালার সিলেকশন
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      type="button"
                      key={num}
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          colorCount: num,
                          plates: num === 1 ? (prev.plates > 2 ? 1 : prev.plates) : num * (prev.forma || 1),
                        }));
                      }}
                      className={`py-2 rounded-lg text-xs font-bold border transition ${
                        form.colorCount === num
                          ? 'bg-indigo-700 text-white border-indigo-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {num === 4 ? '৪ কালার (চার কালার)' : `${num} কালার`}
                    </button>
                  ))}
                </div>

                {/* If 1 Color: Explicitly select whether it is Black or Color/Spot */}
                {form.colorCount === 1 && (
                  <div className="pt-2 border-t border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold text-indigo-950">
                      ১ কালার এর ধরন নির্বাচন করুন:
                    </span>
                    <div className="flex space-x-2">
                      <label
                        className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center space-x-1.5 transition ${
                          form.singleColorType === 'black'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="radio"
                          name="singleColorType"
                          value="black"
                          checked={form.singleColorType === 'black'}
                          onChange={() => setForm((prev) => ({ ...prev, singleColorType: 'black' }))}
                          className="hidden"
                        />
                        <span>⚫ কালো কালার (Black)</span>
                      </label>

                      <label
                        className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center space-x-1.5 transition ${
                          form.singleColorType === 'color'
                            ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                            : 'bg-white text-pink-700 border-pink-200 hover:bg-pink-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="singleColorType"
                          value="color"
                          checked={form.singleColorType === 'color'}
                          onChange={() => setForm((prev) => ({ ...prev, singleColorType: 'color' }))}
                          className="hidden"
                        />
                        <span>🎨 রঙিন / স্পট কালার (Spot Color)</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ফর্মা</label>
                  <SmartNumberInput
                    integer
                    min={0}
                    fallbackOnBlur={0}
                    value={form.forma}
                    onValueChange={(f) => {
                      setForm({ ...form, forma: f });
                      recalcMetrics(f, form.chhapa, form.copies);
                    }}
                    className="w-full border rounded p-1.5 text-xs text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">প্লেট</label>
                  <SmartNumberInput
                    integer
                    min={0}
                    fallbackOnBlur={0}
                    value={form.plates}
                    onValueChange={(val) => setForm({ ...form, plates: val })}
                    className="w-full border rounded p-1.5 text-xs text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ছাপা (কাউন্টার)</label>
                  <SmartNumberInput
                    integer
                    min={0}
                    fallbackOnBlur={0}
                    value={form.chhapa}
                    onValueChange={(ch) => {
                      setForm({ ...form, chhapa: ch });
                      recalcMetrics(form.forma, ch, form.copies);
                    }}
                    className="w-full border rounded p-1.5 text-xs text-center font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">কপি সংখ্যা</label>
                  <SmartNumberInput
                    integer
                    min={0}
                    fallbackOnBlur={0}
                    value={form.copies}
                    onValueChange={(cp) => {
                      setForm({ ...form, copies: cp });
                      recalcMetrics(form.forma, form.chhapa, cp);
                    }}
                    className="w-full border rounded p-1.5 text-xs text-center font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <div>
                  <span className="block text-[11px] font-bold text-emerald-800">মোট শিট (Sheets)</span>
                  <SmartNumberInput
                    integer
                    min={0}
                    fallbackOnBlur={0}
                    value={form.sheets}
                    onValueChange={(sh) => {
                      setForm({
                        ...form,
                        sheets: sh,
                        reams: Math.round((sh / (db.settings.sheetsPerReam || 500)) * 100) / 100,
                      });
                    }}
                    className="w-full border border-emerald-300 rounded p-1.5 text-sm font-bold bg-white text-emerald-900"
                  />
                </div>
                <div>
                  <span className="block text-[11px] font-bold text-emerald-800">
                    মোট রিম (১ রিম = ৫০০ শিট / ১০০০ কপি)
                  </span>
                  <SmartNumberInput
                    min={0}
                    fallbackOnBlur={0}
                    value={form.reams}
                    onValueChange={(rm) => {
                      setForm({
                        ...form,
                        reams: rm,
                        sheets: Math.round(rm * (db.settings.sheetsPerReam || 500)),
                      });
                    }}
                    className="w-full border border-emerald-300 rounded p-1.5 text-sm font-bold bg-white text-emerald-900"
                  />
                </div>
              </div>

              {/* Machine Man / Operator Selection */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-800">
                    মেশিনম্যান / অপারেটরের নাম (কে ছাপাইছে)
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">
                    (অভ্যন্তরীণ রেকর্ড — বিলে প্রদর্শিত হবে না)
                  </span>
                </div>
                <input
                  type="text"
                  list="machine-operators-list"
                  value={form.operatorName}
                  onChange={(e) => setForm({ ...form, operatorName: e.target.value })}
                  placeholder="অপারেটরের নাম লিখুন বা নিচে থেকে বাছুন..."
                  className="w-full border rounded-lg p-2 text-xs font-semibold bg-white text-slate-900 border-slate-300 focus:ring-1 focus:ring-emerald-500"
                />
                <datalist id="machine-operators-list">
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
                        onClick={() => setForm({ ...form, operatorName: emp.name })}
                        className={`px-2 py-0.5 rounded text-[10px] border transition ${
                          form.operatorName === emp.name
                            ? 'bg-slate-800 text-white border-slate-800 font-bold'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {emp.name} ({emp.designation})
                      </button>
                    ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">মন্তব্য</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="কাগজের সাইজ বা বিশেষ কাজের বিবরণ"
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
                  <span>{editingProd ? 'আপডেট করুন' : 'সেভ করুন (নতুন এন্ট্রি চালু থাকবে)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Warning Dialog */}
      {warningMessage && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border text-center space-y-3 my-auto max-h-[92vh] overflow-y-auto">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
            <h4 className="font-bold text-slate-900 text-sm">সতর্কতা</h4>
            <p className="text-xs text-slate-600 leading-relaxed">{warningMessage}</p>
            <button
              onClick={() => setWarningMessage('')}
              className="w-full py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900"
            >
              ঠিক আছে
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!prodToDelete}
        title="প্রডাকশন রেকর্ড মুছে ফেলা"
        message="আপনি কি নিশ্চিত যে এই প্রডাকশন রেকর্ড মুছে ফেলতে চান? এটি মুছে দিলে উৎপাদন হিসাব থেকে বাদ পড়বে।"
        onConfirm={() => {
          if (prodToDelete) {
            deleteProduction(prodToDelete.id);
            setProdToDelete(null);
          }
        }}
        onCancel={() => setProdToDelete(null)}
      />
    </div>
  );
};

