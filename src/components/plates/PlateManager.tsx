import React, { useState, useRef, useEffect } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { PlateRecord, PlateLocation } from '../../types';
import { formatDate } from '../../utils/calculations';
import { translations } from '../../utils/i18n';
import { PrintHeader, PrintSignatures, triggerPrint } from '../common/PrintHeader';
import { ConfirmModal } from '../common/ConfirmModal';
import { SmartNumberInput } from '../common/SmartNumberInput';
import {
  Disc,
  Plus,
  Search,
  Edit2,
  Trash2,
  Printer,
  ArrowLeft,
  CheckCircle2,
  Building,
  Package,
  ArrowRightLeft,
  Filter,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';

const GODOWN_OPTIONS = ['গোডাউন-১', 'গোডাউন-২'] as const;
const LOT_PRESETS = ['লট-১', 'লট-২', 'লট-৩', 'লট-৪', 'লট-৫', 'লট-৬', 'লট-৭', 'লট-৮', 'লট-৯', 'লট-১০'];

const getEffectiveGodownName = (plt: Pick<PlateRecord, 'godownName'>) =>
  plt.godownName === 'গোডাউন-২' ? 'গোডাউন-২' : 'গোডাউন-১';

export const PlateManager: React.FC = () => {
  const { db, isReadOnly, canDeletePlates, addPlate, updatePlate, batchUpdatePlates, deletePlate, addParty, addBook } = useDatabase();
  const lang = db.settings.language;
  const t = translations[lang];

  const today = new Date().toISOString().split('T')[0];
  const plates = db.plates || [];

  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState<'all' | PlateLocation | 'godown-1' | 'godown-2'>('all');
  const [selectedPartyFilter, setSelectedPartyFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlate, setEditingPlate] = useState<PlateRecord | null>(null);
  const [plateToDelete, setPlateToDelete] = useState<PlateRecord | null>(null);
  const [selectedPlateSlip, setSelectedPlateSlip] = useState<PlateRecord | null>(null);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Batch Operations State
  const [selectedPlateIds, setSelectedPlateIds] = useState<string[]>([]);
  const [isBatchReturnModalOpen, setIsBatchReturnModalOpen] = useState(false);
  const [batchReturnDate, setBatchReturnDate] = useState(today);
  const [batchReturnedThrough, setBatchReturnedThrough] = useState('');
  const [batchReturnNotes, setBatchReturnNotes] = useState('');

  const [isBatchLocationModalOpen, setIsBatchLocationModalOpen] = useState(false);
  const [batchTargetLocation, setBatchTargetLocation] = useState<PlateLocation>('godown');
  const [batchGodownName, setBatchGodownName] = useState<string>('গোডাউন-১');
  const [batchLotNo, setBatchLotNo] = useState('লট-১');

  const firstInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [partyInput, setPartyInput] = useState('');
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [bookInput, setBookInput] = useState('');
  const [godownName, setGodownName] = useState<string>('গোডাউন-১');
  const [lotNo, setLotNo] = useState('লট-১');
  const [plateCount, setPlateCount] = useState<number | ''>(4);
  const [size, setSize] = useState('২৩×৩৬');
  const [location, setLocation] = useState<PlateLocation>('press');
  const [returnDate, setReturnDate] = useState(today);
  const [returnedThrough, setReturnedThrough] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isModalOpen) {
      setTimeout(() => firstInputRef.current?.focus(), 80);
    }
  }, [isModalOpen]);

  // Auto-complete party search suggestions
  const [partySuggestionsOpen, setPartySuggestionsOpen] = useState(false);
  const matchingParties = db.parties.filter((p) =>
    p.name.toLowerCase().includes(partyInput.toLowerCase()) ||
    p.phone?.includes(partyInput)
  );

  // Filtered Plates
  const filteredPlates = plates.filter((plt) => {
    const matchSearch = search
      ? plt.partyName.toLowerCase().includes(search.toLowerCase()) ||
        plt.bookName.toLowerCase().includes(search.toLowerCase()) ||
        plt.size.toLowerCase().includes(search.toLowerCase()) ||
        (plt.godownName && plt.godownName.toLowerCase().includes(search.toLowerCase())) ||
        (plt.lotNo && plt.lotNo.toLowerCase().includes(search.toLowerCase())) ||
        (plt.returnedThrough && plt.returnedThrough.toLowerCase().includes(search.toLowerCase()))
      : true;
    const matchLoc =
      locationFilter === 'all'
        ? true
        : locationFilter === 'godown-1'
        ? plt.location === 'godown' && getEffectiveGodownName(plt) === 'গোডাউন-১'
        : locationFilter === 'godown-2'
        ? plt.location === 'godown' && getEffectiveGodownName(plt) === 'গোডাউন-২'
        : plt.location === locationFilter;
    const matchParty = selectedPartyFilter ? plt.partyId === selectedPartyFilter : true;
    return matchSearch && matchLoc && matchParty;
  });

  // Aggregations
  const totalCount = plates.reduce((sum, p) => sum + (p.plateCount || 0), 0);
  const inPressCount = plates
    .filter((p) => p.location === 'press')
    .reduce((sum, p) => sum + (p.plateCount || 0), 0);
  const inGodownCount = plates
    .filter((p) => p.location === 'godown')
    .reduce((sum, p) => sum + (p.plateCount || 0), 0);
  const inGodown1Count = plates
    .filter((p) => p.location === 'godown' && getEffectiveGodownName(p) === 'গোডাউন-১')
    .reduce((sum, p) => sum + (p.plateCount || 0), 0);
  const inGodown2Count = plates
    .filter((p) => p.location === 'godown' && getEffectiveGodownName(p) === 'গোডাউন-২')
    .reduce((sum, p) => sum + (p.plateCount || 0), 0);
  const soldCount = plates
    .filter((p) => p.location === 'sold')
    .reduce((sum, p) => sum + (p.plateCount || 0), 0);
  const returnedCount = plates
    .filter((p) => p.location === 'returned')
    .reduce((sum, p) => sum + (p.plateCount || 0), 0);

  // Batch Selection & Operations
  const selectedPlates = plates.filter((p) => selectedPlateIds.includes(p.id));
  const selectedTotalPlateCount = selectedPlates.reduce((sum, p) => sum + (p.plateCount || 0), 0);

  const handleToggleSelectPlate = (id: string) => {
    setSelectedPlateIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisible = () => {
    const visibleIds = filteredPlates.map((p) => p.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedPlateIds.includes(id));
    if (allSelected) {
      setSelectedPlateIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedPlateIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleSelectAllForParty = (partyId: string) => {
    const partyPlateIds = plates.filter((p) => p.partyId === partyId).map((p) => p.id);
    setSelectedPlateIds((prev) => Array.from(new Set([...prev, ...partyPlateIds])));
  };

  const handleBatchMoveLocation = (targetLoc: PlateLocation, customLot?: string, customGodown?: string) => {
    if (isReadOnly || selectedPlateIds.length === 0) return;
    const selectedGodown = targetLoc === 'godown' ? (customGodown || batchGodownName || 'গোডাউন-১') : undefined;
    const lot = targetLoc === 'godown' ? (customLot || batchLotNo || 'লট-১') : undefined;
    batchUpdatePlates(selectedPlateIds, {
      location: targetLoc,
      godownName: selectedGodown,
      lotNo: lot,
    });
    const locNames: Record<PlateLocation, string> = {
      press: 'প্রেসে স্থানান্তর',
      godown: `${selectedGodown || 'গোডাউন-১'} (${lot || 'লট-১'})`,
      sold: 'বিক্রি সম্পন্ন',
      returned: 'পার্টিকে ফেরত',
    };
    setSuccessMessage(
      `✓ নির্বাচিত ${selectedPlateIds.length} টি বই/প্লেটের অবস্থান সফলভাবে "${locNames[targetLoc]}" করা হয়েছে!`
    );
    setSelectedPlateIds([]);
    setIsBatchLocationModalOpen(false);
    setTimeout(() => setSuccessMessage(''), 6000);
  };

  const handleConfirmBatchReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!batchReturnedThrough.trim()) {
      alert('কার মাধ্যমে ফেরত দেওয়া হয়েছে তা লিখুন');
      return;
    }
    batchUpdatePlates(selectedPlateIds, {
      location: 'returned',
      returnDate: batchReturnDate,
      returnedThrough: batchReturnedThrough.trim(),
      notes: batchReturnNotes.trim() || undefined,
    });
    setSuccessMessage(
      `✓ নির্বাচিত ${selectedPlateIds.length} টি বইয়ের মোট ${selectedTotalPlateCount} টি প্লেট সফলভাবে ফেরত হিসেবে আপডেট করা হয়েছে!`
    );
    setSelectedPlateIds([]);
    setIsBatchReturnModalOpen(false);
    setBatchReturnedThrough('');
    setBatchReturnNotes('');
    setTimeout(() => setSuccessMessage(''), 6000);
  };

  const handleOpenModal = (plate?: PlateRecord) => {
    if (isReadOnly) return;
    setFormError('');
    setSuccessMessage('');
    if (plate) {
      setEditingPlate(plate);
      setSelectedPartyId(plate.partyId);
      setPartyInput(plate.partyName);
      setBookInput(plate.bookName || '');
      setGodownName(plate.godownName || 'গোডাউন-১');
      setLotNo(plate.lotNo || 'লট-১');
      setPlateCount(plate.plateCount);
      setSize(plate.size || '২৩×৩৬');
      setLocation(plate.location);
      setReturnDate(plate.returnDate || today);
      setReturnedThrough(plate.returnedThrough || '');
      setNotes(plate.notes || '');
    } else {
      setEditingPlate(null);
      const defaultParty = db.parties[0];
      setSelectedPartyId(defaultParty?.id || '');
      setPartyInput(defaultParty?.name || '');
      setBookInput('');
      setGodownName('গোডাউন-১');
      setLotNo('লট-১');
      setPlateCount(4);
      setSize('২৩×৩৬');
      setLocation('press');
      setReturnDate(today);
      setReturnedThrough('');
      setNotes('');
    }
    setPartySuggestionsOpen(false);
    setIsModalOpen(true);
  };

  const handleSelectParty = (pty: { id: string; name: string }) => {
    setSelectedPartyId(pty.id);
    setPartyInput(pty.name);
    setPartySuggestionsOpen(false);
    // Auto populate book if party has books
    const partyBooks = db.books.filter((b) => b.partyIds?.includes(pty.id));
    if (partyBooks.length > 0 && !bookInput) {
      setBookInput(partyBooks[0].name);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!partyInput.trim()) {
      setFormError('অনুগ্রহ করে পার্টির নাম লিখুন বা নির্বাচন করুন');
      return;
    }
    const countNum = typeof plateCount === 'number' ? plateCount : parseInt(plateCount, 10);
    if (!countNum || countNum <= 0) {
      setFormError('সঠিক প্লেট সংখ্যা লিখুন');
      return;
    }
    if (location === 'returned') {
      if (!returnedThrough.trim()) {
        setFormError('প্লেট ফেরত দেওয়ার ক্ষেত্রে "কার মাধ্যমে ফেরত" নাম ও পরিচয় লেখা বাধ্যতামূলক');
        return;
      }
    }

    let finalPartyId = selectedPartyId;
    let finalPartyName = partyInput.trim();

    // Check if party exists or create
    const existingParty = db.parties.find(
      (p) => p.name.trim().toLowerCase() === finalPartyName.toLowerCase()
    );
    if (existingParty) {
      finalPartyId = existingParty.id;
      finalPartyName = existingParty.name;
    } else if (!finalPartyId) {
      const createdParty = addParty({
        name: finalPartyName,
        contactPerson: '',
        address: '',
        phone: '',
        openingDue: 0,
        isActive: true,
      });
      finalPartyId = createdParty.id;
    }

    const finalBookName = bookInput.trim() || 'পার্টির সামগ্রিক প্লেট';

    const payload = {
      partyId: finalPartyId,
      partyName: finalPartyName,
      bookName: finalBookName,
      godownName: location === 'godown' ? (godownName || 'গোডাউন-১') : undefined,
      lotNo: location === 'godown' ? lotNo.trim() || 'লট-১' : undefined,
      plateCount: countNum,
      size: size.trim(),
      location,
      returnDate: location === 'returned' ? returnDate : undefined,
      returnedThrough: location === 'returned' ? returnedThrough.trim() : undefined,
      notes: notes.trim(),
    };

    if (editingPlate) {
      updatePlate(editingPlate.id, payload);
      setIsModalOpen(false);
    } else {
      addPlate(payload);
      setSuccessMessage(
        `প্লেট সফলভাবে সংরক্ষিত হয়েছে (${payload.partyName}${payload.godownName ? `, ${payload.godownName}` : ''}${payload.lotNo ? ` (${payload.lotNo})` : ''}, ${payload.plateCount} টি)! পরবর্তী এন্ট্রি করতে পারেন।`
      );
      setBookInput('');
      setLotNo('লট-১');
      setPlateCount(4);
      setNotes('');
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 50);
    }
  };

  const handleConfirmDelete = () => {
    if (plateToDelete) {
      deletePlate(plateToDelete.id);
      setPlateToDelete(null);
    }
  };

  const getLocationBadge = (loc: PlateLocation, plateGodownName?: string) => {
    switch (loc) {
      case 'press':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center space-x-1">
            <Building className="w-3 h-3" />
            <span>প্রেসে আছে</span>
          </span>
        );
      case 'godown':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center space-x-1">
            <Package className="w-3 h-3" />
            <span>{plateGodownName || 'গোডাউন-১'}</span>
          </span>
        );
      case 'sold':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200 inline-flex items-center space-x-1">
            <span>বিক্রি সম্পন্ন</span>
          </span>
        );
      case 'returned':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center space-x-1">
            <ArrowRightLeft className="w-3 h-3" />
            <span>পার্টিকে ফেরত</span>
          </span>
        );
      default:
        return null;
    }
  };

  // Full Page Printable Plate Slip
  if (selectedPlateSlip) {
    return (
      <div className="space-y-6">
        <div className="no-print flex items-center justify-between">
          <button
            onClick={() => setSelectedPlateSlip(null)}
            className="flex items-center space-x-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 px-3.5 py-2 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>প্লেট তালিকায় ফিরে যান</span>
          </button>

          <button
            onClick={() => triggerPrint()}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>সরাসরি প্রিন্ট করুন</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs max-w-2xl mx-auto print-container">
          <PrintHeader
            title={
              selectedPlateSlip.location === 'returned'
                ? 'প্লেট ফেরত ও হস্তান্তর প্রত্যয়ন স্লিপ'
                : 'প্লেট সংরক্ষণ ও হস্তান্তর স্লিপ'
            }
            documentNo={`PLT-${selectedPlateSlip.id.slice(-6).toUpperCase()}`}
            date={selectedPlateSlip.returnDate || selectedPlateSlip.createdAt.split('T')[0]}
          />

          <div className="my-6 space-y-4 text-xs text-slate-800 border p-5 rounded-xl bg-slate-50/50">
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">কাস্টমার / পার্টির নাম:</span>
              <div className="text-right">
                <span className="font-bold text-slate-900 text-sm block">{selectedPlateSlip.partyName}</span>
                <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                  পার্টির মোট বই: {db.books.filter((b) => b.partyIds?.includes(selectedPlateSlip.partyId)).length} টি
                </span>
              </div>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">বই বা কাজের নাম:</span>
              <span className="font-bold text-slate-900 text-sm">{selectedPlateSlip.bookName}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-lg border">
              <div>
                <span className="text-slate-500 text-[11px] block">প্লেটের সাইজ:</span>
                <span className="font-bold text-sm text-slate-900">{selectedPlateSlip.size}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">মোট প্লেট সংখ্যা:</span>
                <span className="font-bold text-base text-emerald-800">{selectedPlateSlip.plateCount} টি</span>
              </div>
            </div>

            <div className="flex justify-between border-b pb-2 pt-1">
              <span className="text-slate-500 font-semibold">বর্তমান অবস্থান:</span>
              <span>{getLocationBadge(selectedPlateSlip.location, selectedPlateSlip.godownName)}</span>
            </div>

            {selectedPlateSlip.location === 'godown' && (
              <div className="space-y-1.5 bg-amber-50/70 p-2.5 rounded-lg border border-amber-200">
                <div className="flex justify-between">
                  <span className="text-amber-900 font-semibold">গোডাউনের নাম:</span>
                  <span className="font-black text-amber-950 text-xs">{getEffectiveGodownName(selectedPlateSlip)}</span>
                </div>
                <div className="flex justify-between border-t border-amber-200/70 pt-1.5">
                  <span className="text-amber-900 font-bold">গোডাউনের লট নম্বর (Lot No):</span>
                  <span className="font-black text-amber-950 text-sm">{selectedPlateSlip.lotNo || 'লট উল্লেখ নেই'}</span>
                </div>
              </div>
            )}

            {selectedPlateSlip.location === 'returned' && (
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-emerald-900 font-semibold">ফেরতের তারিখ:</span>
                  <span className="font-bold text-emerald-950">
                    {formatDate(selectedPlateSlip.returnDate || today, lang)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-900 font-semibold">কার মাধ্যমে ফেরত গ্রহণ:</span>
                  <span className="font-bold text-sm text-emerald-950 underline">
                    {selectedPlateSlip.returnedThrough || 'সরাসরি পার্টি'}
                  </span>
                </div>
              </div>
            )}

            {selectedPlateSlip.notes && (
              <div className="pt-2 text-slate-600">
                <span className="font-semibold block text-[11px] text-slate-400">মন্তব্য:</span>
                <p className="bg-white p-2.5 rounded border text-xs">{selectedPlateSlip.notes}</p>
              </div>
            )}
          </div>

          <div className="mt-8">
            <PrintSignatures />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">পার্টির প্লেট এর অবস্থান ও ট্র্যাকিং</h2>
          <p className="text-xs text-slate-500">
            প্রেসে থাকা, গোডাউন, বিক্রি ও পার্টিকে ফেরতের হিসাব (কার মাধ্যমে ফেরত তারিখসহ সংরক্ষণ)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {!isReadOnly && (
            <button
              onClick={() => handleOpenModal()}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন প্লেট এন্ট্রি</span>
            </button>
          )}
          <button
            onClick={() => triggerPrint()}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>সরাসরি প্রিন্ট</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="no-print grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400">মোট প্লেট</span>
          <p className="text-lg font-black text-slate-900 mt-0.5">{totalCount} টি</p>
          <span className="text-[10px] text-slate-500">{plates.length} টি রেকর্ড</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-blue-100 bg-blue-50/20 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-blue-600">প্রেসে আছে</span>
          <p className="text-lg font-black text-blue-800 mt-0.5">{inPressCount} টি</p>
          <span className="text-[10px] text-blue-600">মেশিনে চলমান বা প্রস্তুত</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-amber-100 bg-amber-50/20 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-amber-600">গোডাউনে আছে</span>
          <p className="text-lg font-black text-amber-800 mt-0.5">{inGodownCount} টি</p>
          <span className="text-[10px] text-amber-700 font-semibold">গোডাউন-১: {inGodown1Count} | গোডাউন-২: {inGodown2Count}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-purple-100 bg-purple-50/20 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-purple-600">বিক্রি হয়েছে</span>
          <p className="text-lg font-black text-purple-800 mt-0.5">{soldCount} টি</p>
          <span className="text-[10px] text-purple-600">স্ক্র্যাপ / পুরাতন বিক্রি</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/20 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase font-bold text-emerald-700">পার্টিকে ফেরত</span>
          <p className="text-lg font-black text-emerald-800 mt-0.5">{returnedCount} টি</p>
          <span className="text-[10px] text-emerald-600">তারিখ ও ব্যক্তির মাধ্যমে ফেরত</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="no-print bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="flex-1 flex items-center space-x-2 w-full">
          <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="পার্টির নাম, বইয়ের নাম, গোডাউন/লট বা ফেরত গ্রহীতার নাম দিয়ে খুঁজুন..."
            className="w-full text-xs outline-none bg-transparent"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value as any)}
            className="border rounded-lg p-1.5 text-xs font-bold text-slate-700 bg-white"
          >
            <option value="all">সকল অবস্থান</option>
            <option value="press">প্রেসে আছে</option>
            <option value="godown">গোডাউনে আছে (সকল)</option>
            <option value="godown-1">গোডাউন-১</option>
            <option value="godown-2">গোডাউন-২</option>
            <option value="sold">বিক্রি সম্পন্ন</option>
            <option value="returned">পার্টিকে ফেরত</option>
          </select>

          <select
            value={selectedPartyFilter}
            onChange={(e) => setSelectedPartyFilter(e.target.value)}
            className="border rounded-lg p-1.5 text-xs font-bold text-slate-700 bg-white max-w-[200px]"
          >
            <option value="">সকল পার্টি ({db.parties.length} টি)</option>
            {db.parties.map((p) => {
              const bookCount = db.books.filter((b) => b.partyIds?.includes(p.id)).length;
              return (
                <option key={p.id} value={p.id}>
                  {p.name} (বই: {bookCount} টি)
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Selected Party Summary Banner */}
      {selectedPartyFilter && (() => {
        const pty = db.parties.find((p) => p.id === selectedPartyFilter);
        const partyBooks = db.books.filter((b) => b.partyIds?.includes(selectedPartyFilter));
        const partyPlates = plates.filter((p) => p.partyId === selectedPartyFilter);
        const partyPlatesCount = partyPlates.reduce((sum, p) => sum + (p.plateCount || 0), 0);
        return (
          <div className="no-print bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shadow-2xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wide">পার্টি প্রোফাইল ও প্লেট তথ্য</span>
              <h4 className="text-sm font-bold text-emerald-950 mt-0.5">{pty?.name}</h4>
              <p className="text-xs text-emerald-800">
                এই পার্টির মোট বই: <b className="text-emerald-950 font-black">{partyBooks.length} টি</b>
                {partyBooks.length > 0 && ` (${partyBooks.map((b) => b.name).slice(0, 3).join(', ')}${partyBooks.length > 3 ? '...' : ''})`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="bg-white border border-emerald-300 text-emerald-900 px-2.5 py-1 rounded-lg font-bold">
                মোট বই: {partyBooks.length} টি
              </span>
              <span className="bg-emerald-700 text-white px-2.5 py-1 rounded-lg font-bold">
                মোট প্লেট: {partyPlatesCount} টি
              </span>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => handleSelectAllForParty(selectedPartyFilter)}
                  className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1 shadow-2xs"
                  title="এই পার্টির সব বইয়ের প্লেট একসাথে সিলেক্ট করুন"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>এই পার্টির সব প্লেট সিলেক্ট করুন</span>
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Floating / Sticky Batch Actions Toolbar */}
      {!isReadOnly && selectedPlateIds.length > 0 && (
        <div className="no-print bg-slate-900 text-white rounded-2xl p-3 sm:p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-3 animate-in fade-in border border-slate-700">
          <div className="flex items-center space-x-3">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
            <div>
              <p className="text-xs sm:text-sm font-bold">
                {selectedPlateIds.length} টি বই/প্লেট রেকর্ড নির্বাচিত
              </p>
              <p className="text-[11px] text-slate-300">
                মোট প্লেট সংখ্যা: <b className="text-emerald-400">{selectedTotalPlateCount} টি</b>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleBatchMoveLocation('press')}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center space-x-1.5 shadow-sm"
              title="নির্বাচিত সব প্লেট একসাথে প্রেসে স্থানান্তর করুন"
            >
              <Building className="w-3.5 h-3.5" />
              <span>একসাথে প্রেসে নিন</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setBatchTargetLocation('godown');
                setBatchGodownName('গোডাউন-১');
                setBatchLotNo('লট-১');
                setIsBatchLocationModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition flex items-center space-x-1.5 shadow-sm"
              title="নির্বাচিত সব প্লেট একসাথে গোডাউনে লট নম্বর সহ পাঠান"
            >
              <Package className="w-3.5 h-3.5" />
              <span>গোডাউনে পাঠান (লট নং)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setBatchReturnDate(today);
                setBatchReturnedThrough('');
                setBatchReturnNotes('');
                setIsBatchReturnModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center space-x-1.5 shadow-md"
              title="পার্টি বই বা প্লেট ফেরত নিলে একবারে তা সম্পন্ন করুন"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>একবারে পার্টিকে ফেরত দিন</span>
            </button>

            <button
              type="button"
              onClick={() => handleBatchMoveLocation('sold')}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white transition"
              title="নির্বাচিত সব প্লেট বিক্রি সম্পন্ন হিসেবে মার্ক করুন"
            >
              <span>বিক্রি মার্ক</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPlateIds([])}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              ✕ বাতিল
            </button>
          </div>
        </div>
      )}

      {/* Printable Area / Table */}
      <div className="print-area space-y-4">
        <div className="print-only">
          <PrintHeader
            title="পার্টির প্লেটের বর্তমান অবস্থান ও ফেরত রেজিস্টার"
            subtitle={`তারিখ: ${formatDate(today, lang)} | মোট প্লেট: ${totalCount} টি`}
          />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                <tr>
                  {!isReadOnly && (
                    <th className="p-3 text-center no-print w-10">
                      <input
                        type="checkbox"
                        checked={
                          filteredPlates.length > 0 &&
                          filteredPlates.every((p) => selectedPlateIds.includes(p.id))
                        }
                        onChange={handleSelectAllVisible}
                        className="rounded text-emerald-700 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        title="সবগুলো একসাথে নির্বাচন করুন"
                      />
                    </th>
                  )}
                  <th className="p-3">তারিখ</th>
                  <th className="p-3">পার্টির নাম</th>
                  <th className="p-3">বই বা কাজের নাম</th>
                  <th className="p-3 text-center">সাইজ</th>
                  <th className="p-3 text-center">প্লেট সংখ্যা</th>
                  <th className="p-3 text-center">অবস্থান</th>
                  <th className="p-3 text-center">গোডাউন লট</th>
                  <th className="p-3">ফেরত বিবরণ (কার মাধ্যমে ও তারিখ)</th>
                  <th className="p-3">মন্তব্য</th>
                  <th className="p-3 text-right no-print">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredPlates.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-400">
                      কোনো প্লেট রেকর্ড পাওয়া যায়নি। "+ নতুন প্লেট এন্ট্রি" বাটনে ক্লিক করে যোগ করুন।
                    </td>
                  </tr>
                ) : (
                  filteredPlates.map((plt) => {
                    const isSelected = selectedPlateIds.includes(plt.id);
                    return (
                      <tr
                        key={plt.id}
                        className={`hover:bg-slate-50 transition ${
                          isSelected ? 'bg-emerald-50/80 font-semibold' : ''
                        }`}
                      >
                        {!isReadOnly && (
                          <td className="p-3 text-center no-print w-10">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectPlate(plt.id)}
                              className="rounded text-emerald-700 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="p-3 text-slate-500 whitespace-nowrap">
                          {formatDate(plt.returnDate || plt.createdAt.split('T')[0], lang)}
                        </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{plt.partyName}</div>
                        {(() => {
                          const pId = plt.partyId;
                          const bookCount = db.books.filter((b) => b.partyIds?.includes(pId)).length;
                          return (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 mt-0.5 whitespace-nowrap">
                              বই: {bookCount} টি
                            </span>
                          );
                        })()}
                      </td>
                      <td className="p-3 text-slate-800 font-semibold">{plt.bookName}</td>
                      <td className="p-3 text-center font-bold text-slate-700 whitespace-nowrap">
                        {plt.size}
                      </td>
                      <td className="p-3 text-center font-black text-slate-900 text-sm">
                        {plt.plateCount}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1.5">
                          {getLocationBadge(plt.location, plt.godownName)}
                          {!isReadOnly && (
                            <select
                              value={
                                plt.location === 'godown'
                                  ? getEffectiveGodownName(plt) === 'গোডাউন-২'
                                    ? 'godown-2'
                                    : 'godown-1'
                                  : plt.location
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'returned') {
                                  handleOpenModal({ ...plt, location: 'returned' });
                                } else if (val === 'godown-1' || val === 'godown-2') {
                                  const chosenGodown = val === 'godown-2' ? 'গোডাউন-২' : 'গোডাউন-১';
                                  handleOpenModal({ ...plt, location: 'godown', godownName: chosenGodown });
                                } else {
                                  updatePlate(plt.id, { location: val as PlateLocation });
                                }
                              }}
                              className="no-print text-[11px] font-bold rounded border border-slate-200 px-1.5 py-0.5 bg-white text-slate-700 hover:border-emerald-600 focus:outline-none transition cursor-pointer shadow-2xs"
                              title="প্লেটের অবস্থান দ্রুত পরিবর্তন করুন"
                            >
                              <option value="press">🏢 প্রেসে</option>
                              <option value="godown-1">📦 গোডাউন-১</option>
                              <option value="godown-2">📦 গোডাউন-২</option>
                              <option value="sold">💰 বিক্রি</option>
                              <option value="returned">↩️ ফেরত</option>
                            </select>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        {plt.location === 'godown' ? (
                          <div className="inline-flex flex-col items-center gap-0.5">
                            <span className="text-[10px] font-bold text-amber-800">
                              {getEffectiveGodownName(plt)}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              {plt.lotNo || 'লট-১'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        {plt.location === 'returned' ? (
                          <div className="text-xs">
                            <span className="font-bold text-emerald-900 block">
                              গ্রহণকারী: {plt.returnedThrough || 'সরাসরি'}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              তারিখ: {formatDate(plt.returnDate || today, lang)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-500 max-w-xs truncate">{plt.notes || '-'}</td>
                      <td className="p-3 text-right no-print whitespace-nowrap">
                        <div className="flex justify-end items-center space-x-1">
                          <button
                            onClick={() => setSelectedPlateSlip(plt)}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded"
                            title="স্লিপ দেখুন ও প্রিন্ট করুন"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {!isReadOnly && (
                            <button
                              onClick={() => handleOpenModal(plt)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                              title="এডিট / পরিবর্তন করুন"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDeletePlates && (
                            <button
                              onClick={() => setPlateToDelete(plt)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                              title="মুছুন (শুধুমাত্র অ্যাডমিন/ম্যানেজার)"
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
                <td colSpan={5} className="p-3 text-right">
                  ফিল্টার অনুযায়ী সর্বমোট প্লেট:
                </td>
                <td className="p-3 text-center text-sm font-black text-emerald-800">
                  {filteredPlates.reduce((sum, p) => sum + (p.plateCount || 0), 0)} টি
                </td>
                <td colSpan={5} className="p-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="print-only p-4">
          <PrintSignatures />
        </div>
      </div>
    </div>

    {/* Modal: Add/Edit Plate Record */}
    {isModalOpen && (
      <div className="no-print fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
        <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border my-auto max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center space-x-2">
              <Disc className="w-5 h-5 text-emerald-700" />
              <span>{editingPlate ? 'প্লেট রেকর্ড সংশোধন ও আপডেট' : 'নতুন প্লেট রেকর্ড এন্ট্রি'}</span>
            </h3>

            {formError && (
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
                {formError}
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              {/* Party Selection with Search/Autocomplete */}
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  পার্টি / কাস্টমারের নাম *
                </label>
                <div className="relative">
                  <input
                    ref={firstInputRef}
                    type="text"
                    required
                    value={partyInput}
                    onChange={(e) => {
                      setPartyInput(e.target.value);
                      setSelectedPartyId('');
                      setPartySuggestionsOpen(true);
                    }}
                    onFocus={() => setPartySuggestionsOpen(true)}
                    placeholder="পার্টির নাম লিখুন বা সার্চ করে বাছুন..."
                    className="w-full border rounded-lg p-2.5 text-xs font-bold text-slate-900"
                  />
                  {partySuggestionsOpen && matchingParties.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                      {matchingParties.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => handleSelectParty(p)}
                          className="p-2 hover:bg-emerald-50 cursor-pointer text-xs border-b border-slate-100 flex justify-between items-center"
                        >
                          <span className="font-bold text-slate-800">{p.name}</span>
                          <span className="text-[11px] text-slate-400">{p.phone || ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Book Name - Optional */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    বই বা কাজের নাম (ঐচ্ছিক)
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    (শুধু পার্টির প্লেট হিসেবেও সংরক্ষণ করা যাবে)
                  </span>
                </div>
                <input
                  type="text"
                  value={bookInput}
                  onChange={(e) => setBookInput(e.target.value)}
                  placeholder="যেমন: সহজ নূরানী কোরআন শিক্ষা (ফাঁকা রাখলে পার্টির সামগ্রিক প্লেট হিসেবে থাকবে)"
                  className="w-full border rounded-lg p-2.5 text-xs font-bold text-slate-900"
                />
              </div>

              {/* Plate count & Size */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    প্লেট সংখ্যা *
                  </label>
                  <SmartNumberInput
                    integer
                    required
                    min={0}
                    clearableToEmpty
                    value={plateCount}
                    onTextValueChange={(s) =>
                      setPlateCount(s === '' ? '' : Number.isFinite(parseInt(s, 10)) ? parseInt(s, 10) : '')
                    }
                    className="w-full border rounded-lg p-2 text-xs font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    প্লেটের সাইজ
                  </label>
                  <select
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className="w-full border rounded-lg p-2 text-xs font-bold text-slate-900"
                  >
                    <option value="২৩×৩৬">২৩×৩৬ (23×36)</option>
                    <option value="২০×৩০">২০×৩০ (20×30)</option>
                    <option value="২৫×৩৭">২৫×৩৭ (25×37)</option>
                    <option value="১৮×২৮">১৮×২৮ (18×28)</option>
                    <option value="অন্যান্য">অন্যান্য সাইজ</option>
                  </select>
                </div>
              </div>

              {/* Location Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  প্লেটের বর্তমান অবস্থান *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <button
                    type="button"
                    onClick={() => setLocation('press')}
                    className={`py-2 px-1 text-center rounded-lg border text-xs font-bold transition ${
                      location === 'press'
                        ? 'border-blue-400 bg-blue-50/50 ring-2 ring-emerald-600 text-slate-900 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    প্রেস
                  </button>
                  {GODOWN_OPTIONS.map((gName) => (
                    <button
                      type="button"
                      key={gName}
                      onClick={() => {
                        setLocation('godown');
                        setGodownName(gName);
                      }}
                      className={`py-2 px-1 text-center rounded-lg border text-xs font-bold transition ${
                        location === 'godown' && godownName === gName
                          ? 'border-amber-400 bg-amber-50/70 ring-2 ring-emerald-600 text-slate-900 shadow-xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {gName}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setLocation('sold')}
                    className={`py-2 px-1 text-center rounded-lg border text-xs font-bold transition ${
                      location === 'sold'
                        ? 'border-purple-400 bg-purple-50/50 ring-2 ring-emerald-600 text-slate-900 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    বিক্রি
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocation('returned')}
                    className={`py-2 px-1 text-center rounded-lg border text-xs font-bold transition col-span-2 sm:col-span-1 ${
                      location === 'returned'
                        ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-600 text-slate-900 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    ফেরত
                  </button>
                </div>
              </div>

              {/* Conditional Godown-1 / Godown-2 & Lot Number (1-10 Selectable + Manual) */}
              {location === 'godown' && (
                <div className="p-3.5 bg-amber-50/70 border border-amber-300 rounded-xl space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-amber-950">
                      গোডাউন ও লট নম্বর (Lot No 1–10 / ম্যানুয়াল) *
                    </label>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                      {godownName}
                    </span>
                  </div>

                  {/* Godown-1 vs Godown-2 Switcher */}
                  <div className="grid grid-cols-2 gap-2">
                    {GODOWN_OPTIONS.map((gName) => (
                      <button
                        type="button"
                        key={gName}
                        onClick={() => setGodownName(gName)}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-bold transition ${
                          godownName === gName
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-100/60'
                        }`}
                      >
                        📦 {gName}
                      </button>
                    ))}
                  </div>

                  {/* Selectable Lot 1 to 10 */}
                  <div>
                    <span className="block text-[11px] font-bold text-amber-900 mb-1">
                      লট নম্বর সিলেক্ট করুন (১ থেকে ১০):
                    </span>
                    <div className="grid grid-cols-5 gap-1.5">
                      {LOT_PRESETS.map((presetLot) => (
                        <button
                          type="button"
                          key={presetLot}
                          onClick={() => setLotNo(presetLot)}
                          className={`py-1 px-1 rounded-lg border text-[11px] font-bold transition ${
                            lotNo.trim() === presetLot
                              ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                              : 'bg-white text-slate-800 border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          {presetLot}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Manual Lot Input + Dropdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                    <div>
                      <label className="block text-[10px] font-bold text-amber-900 mb-0.5">
                        অথবা তালিকা থেকে বাছুন:
                      </label>
                      <select
                        value={LOT_PRESETS.includes(lotNo.trim()) ? lotNo.trim() : ''}
                        onChange={(e) => {
                          if (e.target.value) setLotNo(e.target.value);
                        }}
                        className="w-full border border-amber-300 rounded-lg p-2 text-xs font-bold text-slate-900 bg-white"
                      >
                        <option value="">-- লট ১–১০ বাছুন --</option>
                        {LOT_PRESETS.map((presetLot) => (
                          <option key={presetLot} value={presetLot}>
                            {presetLot}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-amber-900 mb-0.5">
                        ম্যানুয়াল লট লিখুন (ইচ্ছামত):
                      </label>
                      <input
                        type="text"
                        value={lotNo}
                        onChange={(e) => setLotNo(e.target.value)}
                        placeholder="যেমন: লট-১১, তাক-৩ বা যেকোনো নাম"
                        className="w-full border rounded-lg p-2 text-xs font-bold text-slate-900 bg-white border-amber-300"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional Return Fields (কার মাধ্যমে ফেরত ও তারিখ) */}
              {location === 'returned' && (
                <div className="p-3.5 bg-emerald-50/60 border border-emerald-300 rounded-xl space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>পার্টি ফেরত গ্রহণের বিস্তারিত তথ্য:</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                      কার মাধ্যমে ফেরত নিয়েছেন? (ব্যক্তির নাম ও ফোন নম্বর) *
                    </label>
                    <input
                      type="text"
                      required={location === 'returned'}
                      value={returnedThrough}
                      onChange={(e) => setReturnedThrough(e.target.value)}
                      placeholder="যেমন: মেসার্স আলম (ম্যানেজার), ০১৭..."
                      className="w-full border border-emerald-400 bg-white rounded-lg p-2 text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                      ফেরত দেওয়ার তারিখ *
                    </label>
                    <input
                      type="date"
                      required={location === 'returned'}
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="w-full border border-emerald-400 bg-white rounded-lg p-2 text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">মন্তব্য</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="রেকর্ড সংক্রান্ত কোনো বিশেষ নোট..."
                  className="w-full border rounded-lg p-2 text-xs"
                />
              </div>

              {/* Footer buttons */}
              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setSuccessMessage('');
                  }}
                  className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  {editingPlate ? 'বাতিল' : 'সম্পন্ন / বন্ধ করুন'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  {editingPlate ? 'পরিবর্তন সংরক্ষণ করুন' : 'সংরক্ষণ (নতুন এন্ট্রি চালু থাকবে)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Batch Change Location */}
      {isBatchLocationModalOpen && (
        <div className="no-print fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border my-auto max-h-[92vh] overflow-y-auto space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Package className="w-4 h-4 text-amber-600" />
                <span>একসাথে প্লেটের অবস্থান পরিবর্তন</span>
              </h3>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                {selectedPlateIds.length} টি রেকর্ড
              </span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border text-xs space-y-1">
              <p className="font-bold text-slate-800">
                মোট নির্বাচিত প্লেট: <span className="text-emerald-700">{selectedTotalPlateCount} টি</span>
              </p>
              <div className="max-h-28 overflow-y-auto text-[11px] text-slate-600 divide-y divide-slate-200">
                {selectedPlates.map((sp) => (
                  <div key={sp.id} className="py-1 flex justify-between">
                    <span className="truncate max-w-[200px]">{sp.bookName}</span>
                    <span className="font-bold">{sp.plateCount} প্লেট</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  কোথায় পাঠাতে চান? (নতুন অবস্থান নির্বাচন করুন) *
                </label>
                <select
                  value={
                    batchTargetLocation === 'godown'
                      ? batchGodownName === 'গোডাউন-২'
                        ? 'godown-2'
                        : 'godown-1'
                      : batchTargetLocation
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'godown-1' || val === 'godown-2') {
                      setBatchTargetLocation('godown');
                      setBatchGodownName(val === 'godown-2' ? 'গোডাউন-২' : 'গোডাউন-১');
                    } else {
                      setBatchTargetLocation(val as PlateLocation);
                    }
                  }}
                  className="w-full border rounded-lg p-2 text-xs font-bold bg-white text-slate-900"
                >
                  <option value="godown-1">📦 গোডাউন-১ এ পাঠান (লট নম্বর সহ)</option>
                  <option value="godown-2">📦 গোডাউন-২ এ পাঠান (লট নম্বর সহ)</option>
                  <option value="press">🏢 প্রেসে আনুন</option>
                  <option value="sold">💰 বিক্রি সম্পন্ন মার্ক করুন</option>
                </select>
              </div>

              {batchTargetLocation === 'godown' && (
                <div className="space-y-2 p-3 bg-amber-50/70 rounded-xl border border-amber-200">
                  <div className="grid grid-cols-2 gap-2">
                    {GODOWN_OPTIONS.map((gName) => (
                      <button
                        type="button"
                        key={gName}
                        onClick={() => setBatchGodownName(gName)}
                        className={`py-1.5 rounded-lg border text-xs font-bold transition ${
                          batchGodownName === gName
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-white text-amber-900 border-amber-300'
                        }`}
                      >
                        {gName}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {LOT_PRESETS.map((presetLot) => (
                      <button
                        type="button"
                        key={presetLot}
                        onClick={() => setBatchLotNo(presetLot)}
                        className={`py-1 rounded border text-[11px] font-bold transition ${
                          batchLotNo.trim() === presetLot
                            ? 'bg-emerald-700 text-white border-emerald-700'
                            : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        {presetLot}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      গোডাউন লট নম্বর (সিলেক্ট বা ম্যানুয়াল) *
                    </label>
                    <input
                      type="text"
                      required
                      value={batchLotNo}
                      onChange={(e) => setBatchLotNo(e.target.value)}
                      placeholder="যেমন: লট-১ বা ম্যানুয়াল লিখুন"
                      className="w-full border border-amber-300 rounded-lg p-2 text-xs font-bold text-slate-900 bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsBatchLocationModalOpen(false)}
                className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={() => handleBatchMoveLocation(batchTargetLocation, batchLotNo, batchGodownName)}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs"
              >
                ✓ এক ক্লিকে অবস্থান পরিবর্তন করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Batch Return to Party */}
      {isBatchReturnModalOpen && (
        <div className="no-print fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border my-auto max-h-[92vh] overflow-y-auto space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <ArrowRightLeft className="w-4 h-4 text-emerald-700" />
                <span>পার্টিকে একবারে প্লেট ফেরত দেওয়ার এন্ট্রি</span>
              </h3>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full">
                {selectedPlateIds.length} টি বই নির্বাচিত
              </span>
            </div>

            <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 text-xs space-y-1.5">
              <div className="flex justify-between items-center text-emerald-950 font-bold">
                <span>একবারে ফেরত দেওয়া হচ্ছে:</span>
                <span>মোট {selectedTotalPlateCount} টি প্লেট</span>
              </div>
              <div className="max-h-32 overflow-y-auto text-[11px] text-slate-700 divide-y divide-emerald-200/60 pr-1">
                {selectedPlates.map((sp) => (
                  <div key={sp.id} className="py-1 flex justify-between items-center">
                    <span className="font-semibold truncate max-w-[240px]">
                      {sp.bookName} ({sp.partyName})
                    </span>
                    <span className="font-mono font-bold bg-white px-1.5 py-0.2 rounded border border-emerald-300">
                      {sp.plateCount} প্লেট
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleConfirmBatchReturn} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ফেরত দেওয়ার তারিখ *
                  </label>
                  <input
                    type="date"
                    required
                    value={batchReturnDate}
                    onChange={(e) => setBatchReturnDate(e.target.value)}
                    className="w-full border rounded-lg p-2 text-xs font-bold bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    কার মাধ্যমে ফেরত (গ্রহীতা) *
                  </label>
                  <input
                    type="text"
                    required
                    value={batchReturnedThrough}
                    onChange={(e) => setBatchReturnedThrough(e.target.value)}
                    placeholder="যেমন: পার্টির ম্যানেজার বা মো. রফিক"
                    className="w-full border rounded-lg p-2 text-xs font-bold bg-white text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  বিশেষ মন্তব্য / বিবরণ (ঐচ্ছিক)
                </label>
                <textarea
                  rows={2}
                  value={batchReturnNotes}
                  onChange={(e) => setBatchReturnNotes(e.target.value)}
                  placeholder="যেমন: পার্টির পক্ষ থেকে সমস্ত প্লেট যাচাই করে বুঝে নেওয়া হয়েছে..."
                  className="w-full border rounded-lg p-2 text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsBatchReturnModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-md"
                >
                  ✓ একবারে সব প্লেট ফেরত নিশ্চিত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {canDeletePlates && plateToDelete && (
        <ConfirmModal
          isOpen={true}
          title="প্লেট রেকর্ড মুছে ফেলবেন?"
          message={`আপনি কি নিশ্চিত যে "${plateToDelete.partyName}" এর "${plateToDelete.bookName}" (${plateToDelete.plateCount} টি প্লেট) রেকর্ডটি মুছে ফেলতে চান?`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPlateToDelete(null)}
          confirmText="হ্যাঁ, মুছে ফেলুন"
          cancelText="না, ফিরে যান"
          danger={true}
        />
      )}
    </div>
  );
};
