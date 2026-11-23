import React, { useEffect, useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { Party } from '../../types';
import { formatCurrency, formatDate, formatNumber, toBanglaDigits } from '../../utils/calculations';
import { translations } from '../../utils/i18n';
import { PrintHeader, PrintSignatures, triggerPrint } from '../common/PrintHeader';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  Users,
  Plus,
  Search,
  Printer,
  Phone,
  MapPin,
  Mail,
  FileText,
  CreditCard,
  Edit2,
  Trash2,
  BookOpen,
  ArrowLeft,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Upload,
  X,
  Image as ImageIcon,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';
import { validateAndProcessImage } from '../../utils/imageUpload';
import { PhoneLink } from '../common/PhoneLink';

interface PartyManagerProps {
  initialPartyId?: string | null;
  onClearInitialParty?: () => void;
}

export const PartyManager: React.FC<PartyManagerProps> = ({
  initialPartyId,
  onClearInitialParty,
}) => {
  const {
    db,
    isReadOnly,
    canManagePartyPortal,
    saasRegistry,
    activeBusinessId,
    addParty,
    updateParty,
    deleteParty,
    getPartyBalance,
    addBook,
    addCollection,
    upsertPartyPortalCredentials,
    reviewPartySignupRequest,
  } = useDatabase();
  const lang = db.settings.language;
  const numFmt = db.settings.numberFormat;
  const t = translations[lang];

  const [search, setSearch] = useState('');
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(initialPartyId || null);
  const [activeTab, setActiveTab] = useState<'summary' | 'productions' | 'books' | 'invoices' | 'collections' | 'ledger' | 'statement'>('summary');

  useEffect(() => {
    if (initialPartyId) {
      setSelectedPartyId(initialPartyId);
      setActiveTab('summary');
    }
  }, [initialPartyId]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false);
  const [isAddCollectionModalOpen, setIsAddCollectionModalOpen] = useState(false);
  const [partyPhotoError, setPartyPhotoError] = useState('');
  const [partySuccessMessage, setPartySuccessMessage] = useState('');
  const [bookSuccessMessage, setBookSuccessMessage] = useState('');
  const [collectionSuccessMessage, setCollectionSuccessMessage] = useState('');
  const [portalError, setPortalError] = useState('');
  const [savingPortal, setSavingPortal] = useState(false);
  const [showPortalPwd, setShowPortalPwd] = useState(false);
  const [isQuickPortalModalOpen, setIsQuickPortalModalOpen] = useState(false);
  const [linkPartySelection, setLinkPartySelection] = useState<Record<string, string>>({});
  const [reviewingAccId, setReviewingAccId] = useState<string | null>(null);

  // Form states
  const [partyForm, setPartyForm] = useState({
    name: '',
    contactPerson: '',
    address: '',
    phone: '',
    email: '',
    photoUrl: '',
    openingDue: 0,
    notes: '',
    isActive: true,
  });

  const [portalForm, setPortalForm] = useState({
    enabled: false,
    loginId: '',
    password: '',
  });

  const [bookForm, setBookForm] = useState({
    name: '',
    code: '',
    forma: 1,
    plates: 4,
    size: '২৩×৩৬',
    defaultRate: db.settings.globalDefaultRatePerForma || 450,
    pagesInfo: '',
    notes: '',
  });

  const [collectionForm, setCollectionForm] = useState({
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    receiptNo: `REC-${Date.now().toString().slice(-6)}`,
    paymentMethod: 'cash' as const,
    notes: '',
  });

  const selectedParty = db.parties.find((p) => p.id === selectedPartyId);

  // Filtered party list
  const filteredParties = db.parties.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.contactPerson.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search)
  );

  const [partyToDelete, setPartyToDelete] = useState<Party | null>(null);

  const handlePartyPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setPartyPhotoError('');
      const res = await validateAndProcessImage(file);
      setPartyForm((prev) => ({ ...prev, photoUrl: res.dataUrl }));
    } catch (err: any) {
      setPartyPhotoError(err.message || 'পার্টির ছবি আপলোড ব্যর্থ হয়েছে');
    }
  };

  const handleOpenAddModal = (party?: Party) => {
    if (isReadOnly) return;
    setPartyPhotoError('');
    setPartySuccessMessage('');
    setPortalError('');
    setShowPortalPwd(false);
    if (party) {
      setEditingParty(party);
      setPartyForm({
        name: party.name,
        contactPerson: party.contactPerson,
        address: party.address,
        phone: party.phone,
        email: party.email || '',
        photoUrl: party.photoUrl || '',
        openingDue: party.openingDue,
        notes: party.notes || '',
        isActive: party.isActive,
      });
      setPortalForm({
        enabled: !!party.portalEnabled,
        loginId: party.portalLoginId || '',
        password: party.portalPassword || '',
      });
    } else {
      setEditingParty(null);
      setPartyForm({
        name: '',
        contactPerson: '',
        address: '',
        phone: '',
        email: '',
        photoUrl: '',
        openingDue: 0,
        notes: '',
        isActive: true,
      });
      setPortalForm({
        enabled: false,
        loginId: '',
        password: '',
      });
    }
    setIsAddModalOpen(true);
  };

  const handleSaveParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyForm.name.trim()) return;
    setPortalError('');

    const hasPortalInput =
      canManagePartyPortal &&
      (portalForm.enabled || portalForm.loginId.trim().length > 0 || (editingParty?.portalLoginId || '').length > 0);

    if (editingParty) {
      updateParty(editingParty.id, partyForm);
      if (hasPortalInput) {
        setSavingPortal(true);
        try {
          const res = await upsertPartyPortalCredentials(
            editingParty.id,
            portalForm,
            { ...editingParty, ...partyForm }
          );
          if (!res.success) {
            setPortalError(res.error || 'পার্টি পোর্টাল লগইন সেটআপ ব্যর্থ হয়েছে।');
            return;
          }
        } finally {
          setSavingPortal(false);
        }
      }
      setIsAddModalOpen(false);
    } else {
      const created = addParty(partyForm);
      if (hasPortalInput && created.id) {
        setSavingPortal(true);
        try {
          const res = await upsertPartyPortalCredentials(created.id, portalForm, created);
          if (!res.success) {
            setPortalError(
              `পার্টি "${partyForm.name}" যুক্ত হয়েছে, তবে পোর্টাল সেটআপে ত্রুটি: ${res.error || 'ব্যর্থ'}`
            );
            setEditingParty(created);
            return;
          }
        } finally {
          setSavingPortal(false);
        }
      }
      setPartySuccessMessage(`পার্টি "${partyForm.name}" সফলভাবে যুক্ত হয়েছে! নতুন পার্টি যোগ করতে পারেন।`);
      setPartyForm({
        name: '',
        contactPerson: '',
        address: '',
        phone: '',
        email: '',
        photoUrl: '',
        openingDue: 0,
        notes: '',
        isActive: true,
      });
      setPortalForm({
        enabled: false,
        loginId: '',
        password: '',
      });
    }
  };

  const handleOpenQuickPortalModal = (party: Party) => {
    if (!canManagePartyPortal) return;
    setPortalError('');
    setShowPortalPwd(false);
    setPortalForm({
      enabled: !!party.portalEnabled,
      loginId: party.portalLoginId || '',
      password: party.portalPassword || '',
    });
    setIsQuickPortalModalOpen(true);
  };

  const handleSaveQuickPortal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty || !canManagePartyPortal) return;
    setPortalError('');
    setSavingPortal(true);
    try {
      const res = await upsertPartyPortalCredentials(selectedParty.id, portalForm, selectedParty);
      if (!res.success) {
        setPortalError(res.error || 'পোর্টাল লগইন সংরক্ষণ ব্যর্থ হয়েছে।');
        return;
      }
      setIsQuickPortalModalOpen(false);
    } finally {
      setSavingPortal(false);
    }
  };

  const handleReviewPendingPartyAccount = async (
    accountId: string,
    decision: 'approved' | 'rejected'
  ) => {
    if (!canManagePartyPortal) return;
    setReviewingAccId(accountId);
    try {
      const targetPartyId = linkPartySelection[accountId] || 'NEW';
      await reviewPartySignupRequest(accountId, decision, targetPartyId);
    } finally {
      setReviewingAccId(null);
    }
  };

  const handleDeleteParty = (party: Party) => {
    if (isReadOnly) return;
    setPartyToDelete(party);
  };

  // Add book to this party
  const handleSaveBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty || !bookForm.name.trim()) return;
    addBook({
      ...bookForm,
      isActive: true,
      partyIds: [selectedParty.id],
    });
    setBookSuccessMessage(`বই "${bookForm.name}" সফলভাবে এই পার্টির তালিকায় যুক্ত হয়েছে!`);
    setBookForm({
      name: '',
      code: '',
      forma: 1,
      plates: 4,
      size: '২৩×৩৬',
      defaultRate: db.settings.globalDefaultRatePerForma || 450,
      pagesInfo: '',
      notes: '',
    });
  };

  // Add collection for this party
  const handleSaveCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty || collectionForm.amount <= 0) return;
    addCollection({
      ...collectionForm,
      partyId: selectedParty.id,
      partyName: selectedParty.name,
    });
    setCollectionSuccessMessage(`কালেকশন সফলভাবে জমা হয়েছে (${formatCurrency(collectionForm.amount, lang)})!`);
    setCollectionForm((prev) => ({
      ...prev,
      amount: 0,
      receiptNo: `REC-${Date.now().toString().slice(-4)}`,
      notes: '',
    }));
  };

  // When a party is selected, show their full ledger / khata
  if (selectedParty) {
    const balance = getPartyBalance(selectedParty.id);
    const partyProductions = db.productions.filter((p) => p.partyId === selectedParty.id);
    const partyBooks = db.books.filter((b) => b.partyIds.includes(selectedParty.id));
    const partyInvoices = db.invoices.filter((inv) => inv.partyId === selectedParty.id);
    const partyCollections = db.collections.filter((col) => col.partyId === selectedParty.id);

    // Build unified ledger sorted by date
    interface LedgerEntry {
      date: string;
      type: 'opening' | 'invoice' | 'collection';
      description: string;
      refNo: string;
      debit: number; // party owes (bill)
      credit: number; // party paid (collection)
      runningBalance: number;
    }

    const ledgerEntries: LedgerEntry[] = [];
    let running = selectedParty.openingDue || 0;

    if (selectedParty.openingDue > 0) {
      ledgerEntries.push({
        date: selectedParty.createdAt.split('T')[0],
        type: 'opening',
        description: 'প্রারম্ভিক বকেয়া (Opening Due)',
        refNo: 'OPN-01',
        debit: selectedParty.openingDue,
        credit: 0,
        runningBalance: running,
      });
    }

    // Combine invoices and collections
    const events: Array<{ date: string; type: 'invoice' | 'collection'; obj: any }> = [
      ...partyInvoices.map((inv) => ({ date: inv.date, type: 'invoice' as const, obj: inv })),
      ...partyCollections.map((col) => ({ date: col.date, type: 'collection' as const, obj: col })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (const ev of events) {
      if (ev.type === 'invoice') {
        const inv = ev.obj;
        running += inv.grandTotal;
        ledgerEntries.push({
          date: inv.date,
          type: 'invoice',
          description: `ইনভয়েস/বিল: ${inv.items.map((i: any) => i.bookName).join(', ')}`,
          refNo: inv.invoiceNo,
          debit: inv.grandTotal,
          credit: 0,
          runningBalance: running,
        });
      } else {
        const col = ev.obj;
        running -= col.amount;
        ledgerEntries.push({
          date: col.date,
          type: 'collection',
          description: `জমা/কালেকশন (${col.paymentMethod}) ${col.notes ? `- ${col.notes}` : ''}`,
          refNo: col.receiptNo,
          debit: 0,
          credit: col.amount,
          runningBalance: running,
        });
      }
    }

    return (
      <div className="space-y-6">
        {/* Top bar */}
        <div className="no-print flex items-center justify-between">
          <button
            onClick={() => {
              setSelectedPartyId(null);
              onClearInitialParty?.();
            }}
            className="flex items-center space-x-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 px-3 py-2 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>পার্টি তালিকায় ফিরে যান</span>
          </button>

          <div className="flex items-center space-x-2">
            {!isReadOnly && (
              <>
                <button
                  onClick={() => setIsAddBookModalOpen(true)}
                  className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center space-x-1.5"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>বই যোগ করুন</span>
                </button>

                <button
                  onClick={() => setIsAddCollectionModalOpen(true)}
                  className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center space-x-1.5"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>কালেকশন জমা</span>
                </button>
              </>
            )}

            <button
              onClick={() => triggerPrint()}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট স্টেটমেন্ট</span>
            </button>
          </div>
        </div>

        {/* Printable Party Header */}
        <div className="print-only">
          <PrintHeader
            title="পার্টি খাতা ও লেনদেন বিবরণী"
            subtitle={`পার্টির নাম: ${selectedParty.name} | যোগাযোগ: ${selectedParty.contactPerson} (${selectedParty.phone})`}
          />
        </div>

        {/* Party Profile Banner */}
        <div className="no-print bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-3">
              {selectedParty.photoUrl ? (
                <img
                  src={selectedParty.photoUrl}
                  alt={selectedParty.name}
                  className="w-12 h-12 rounded-xl object-cover border border-emerald-300 shadow-xs shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg shrink-0">
                  {selectedParty.name.slice(0, 1)}
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selectedParty.name}</h2>
                <p className="text-xs text-slate-500">{selectedParty.contactPerson}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-3">
              <PhoneLink phone={selectedParty.phone} showWhatsApp={true} />
              <span className="flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{selectedParty.address}</span>
              </span>
              {selectedParty.email && (
                <span className="flex items-center space-x-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{selectedParty.email}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-right">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                বর্তমান বকেয়া ব্যালেন্স
              </span>
              <div className={`text-2xl font-black mt-1 ${balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {formatCurrency(balance, lang)}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                প্রারম্ভিক বকেয়া: {formatCurrency(selectedParty.openingDue, lang)}
              </p>
            </div>

            {canManagePartyPortal && (
              <button
                type="button"
                onClick={() => handleOpenQuickPortalModal(selectedParty)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 border transition ${
                  selectedParty.portalEnabled
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>
                  {selectedParty.portalEnabled && selectedParty.portalLoginId
                    ? `পোর্টাল চালু (${selectedParty.portalLoginId})`
                    : 'পোর্টাল লগইন সেটআপ (ঐচ্ছিক)'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="no-print border-b border-slate-200 flex space-x-2 overflow-x-auto pb-1">
          {[
            { id: 'summary', label: 'সারসংক্ষেপ' },
            { id: 'ledger', label: 'সম্পূর্ণ খাতা (Ledger)' },
            { id: 'productions', label: `প্রডাকশন (${partyProductions.length})` },
            { id: 'invoices', label: `বিল/ইনভয়েস (${partyInvoices.length})` },
            { id: 'collections', label: `কালেকশন (${partyCollections.length})` },
            { id: 'books', label: `বইয়ের তালিকা (${partyBooks.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Ledger / Khata (Default & Printable) */}
        {(activeTab === 'ledger' || activeTab === 'summary') && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800">
                পার্টির সম্পূর্ণ লেনদেনের খাতা (তারিখ অনুযায়ী)
              </h3>
              <span className="text-xs text-slate-500">মোট লেনদেন: {ledgerEntries.length} টি</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-700">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                  <tr>
                    <th className="p-3">তারিখ</th>
                    <th className="p-3">রেফারেন্স / ভাউচার</th>
                    <th className="p-3">বিবরণ</th>
                    <th className="p-3 text-right">বিল / পাওনা (৳)</th>
                    <th className="p-3 text-right">জমা / কালেকশন (৳)</th>
                    <th className="p-3 text-right">অবশিষ্ট বকেয়া (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {ledgerEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        এখনো কোনো লেনদেন বা প্রডাকশন রেকর্ড নেই।
                      </td>
                    </tr>
                  ) : (
                    ledgerEntries.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="p-3 whitespace-nowrap">{formatDate(row.date, lang)}</td>
                        <td className="p-3 font-mono font-semibold text-slate-800">{row.refNo}</td>
                        <td className="p-3">{row.description}</td>
                        <td className="p-3 text-right font-semibold text-slate-900">
                          {row.debit > 0 ? formatCurrency(row.debit, lang) : '-'}
                        </td>
                        <td className="p-3 text-right font-semibold text-emerald-700">
                          {row.credit > 0 ? formatCurrency(row.credit, lang) : '-'}
                        </td>
                        <td className="p-3 text-right font-bold text-amber-700">
                          {formatCurrency(row.runningBalance, lang)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-slate-100 font-bold border-t text-slate-900">
                  <tr>
                    <td colSpan={3} className="p-3 text-right">সর্বমোট:</td>
                    <td className="p-3 text-right">
                      {formatCurrency(ledgerEntries.reduce((s, r) => s + r.debit, 0), lang)}
                    </td>
                    <td className="p-3 text-right text-emerald-700">
                      {formatCurrency(ledgerEntries.reduce((s, r) => s + r.credit, 0), lang)}
                    </td>
                    <td className="p-3 text-right text-amber-700">
                      {formatCurrency(balance, lang)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="print-only p-4">
              <PrintSignatures />
            </div>
          </div>
        )}

        {/* Tab 2: Productions */}
        {activeTab === 'productions' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800">দৈনিক প্রডাকশন ইতিহাস</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                  <tr>
                    <th className="p-3">তারিখ</th>
                    <th className="p-3">বইয়ের নাম</th>
                    <th className="p-3">মেশিনম্যান</th>
                    <th className="p-3 text-center">আইটেম</th>
                    <th className="p-3 text-center">ফর্মা</th>
                    <th className="p-3 text-center">প্লেট</th>
                    <th className="p-3 text-center">ছাপা</th>
                    <th className="p-3 text-center">কপি</th>
                    <th className="p-3 text-center">রিম</th>
                    <th className="p-3 text-center">বিলের অবস্থা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {partyProductions.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-6 text-center text-slate-400">
                        এই পার্টির কোনো প্রডাকশন রেকর্ড নেই।
                      </td>
                    </tr>
                  ) : (
                    partyProductions.map((p) => {
                      const book = db.books.find((b) => b.id === p.bookId);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="p-3 whitespace-nowrap tabular-nums">{formatDate(p.date, lang, numFmt)}</td>
                          <td className="p-3 font-semibold text-slate-900">{book?.name || 'অজ্ঞাত বই'}</td>
                          <td className="p-3 whitespace-nowrap font-medium text-slate-700">{p.operatorName || '-'}</td>
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
                          <td className="p-3 text-center tabular-nums">{formatNumber(p.forma, lang, numFmt)}</td>
                          <td className="p-3 text-center tabular-nums">{formatNumber(p.plates, lang, numFmt)}</td>
                          <td className="p-3 text-center font-mono tabular-nums">{formatNumber(p.chhapa, lang, numFmt)}</td>
                          <td className="p-3 text-center tabular-nums">{formatNumber(p.copies, lang, numFmt)}</td>
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
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Invoices */}
        {activeTab === 'invoices' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800">বিল ও ইনভয়েসসমূহ</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                  <tr>
                    <th className="p-3">তারিখ</th>
                    <th className="p-3">ইনভয়েস নম্বর</th>
                    <th className="p-3 text-right">উপ-মোট</th>
                    <th className="p-3 text-right">ছাড়</th>
                    <th className="p-3 text-right">সর্বমোট</th>
                    <th className="p-3 text-right">প্রাপ্ত টাকা</th>
                    <th className="p-3 text-right">অবশিষ্ট বকেয়া</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {partyInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">
                        কোনো ইনভয়েস পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    partyInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="p-3">{formatDate(inv.date, lang)}</td>
                        <td className="p-3 font-mono font-bold text-slate-900">{inv.invoiceNo}</td>
                        <td className="p-3 text-right">{formatCurrency(inv.subtotal, lang)}</td>
                        <td className="p-3 text-right">{formatCurrency(inv.discount, lang)}</td>
                        <td className="p-3 text-right font-bold text-slate-900">{formatCurrency(inv.grandTotal, lang)}</td>
                        <td className="p-3 text-right text-emerald-700 font-semibold">{formatCurrency(inv.paidAmount, lang)}</td>
                        <td className="p-3 text-right font-black text-amber-700">{formatCurrency(inv.currentDue, lang)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Collections */}
        {activeTab === 'collections' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800">কালেকশন / প্রাপ্তি রেকর্ড</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                  <tr>
                    <th className="p-3">তারিখ</th>
                    <th className="p-3">রসিদ নম্বর</th>
                    <th className="p-3">পেমেন্ট মাধ্যম</th>
                    <th className="p-3">মন্তব্য</th>
                    <th className="p-3 text-right">টাকার পরিমাণ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {partyCollections.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">
                        কোনো কালেকশন জমা নেই।
                      </td>
                    </tr>
                  ) : (
                    partyCollections.map((col) => (
                      <tr key={col.id} className="hover:bg-slate-50">
                        <td className="p-3">{formatDate(col.date, lang)}</td>
                        <td className="p-3 font-mono font-bold">{col.receiptNo}</td>
                        <td className="p-3 uppercase text-[10px] font-bold text-slate-600">{col.paymentMethod}</td>
                        <td className="p-3 text-slate-500">{col.notes || '-'}</td>
                        <td className="p-3 text-right font-bold text-emerald-700">{formatCurrency(col.amount, lang)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Books */}
        {activeTab === 'books' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800">এই পার্টির বইয়ের তালিকা</h3>
              {!isReadOnly && (
                <button
                  onClick={() => setIsAddBookModalOpen(true)}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-bold"
                >
                  + বই যুক্ত করুন
                </button>
              )}
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {partyBooks.length === 0 ? (
                <div className="col-span-2 text-center py-6 text-slate-400">
                  এই পার্টির সাথে কোনো বই যুক্ত করা হয়নি।
                </div>
              ) : (
                partyBooks.map((b) => (
                  <div key={b.id} className="p-4 border rounded-xl bg-slate-50/50 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{b.name}</h4>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{b.code}</p>
                      <div className="flex space-x-3 text-xs text-slate-600 mt-2">
                        <span>ফর্মা: <b className="text-slate-800">{b.forma}</b></span>
                        <span>প্লেট: <b className="text-slate-800">{b.plates}</b></span>
                        <span>রেট: <b className="text-slate-800">{formatCurrency(b.defaultRate, lang)}</b></span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Modal: Add Book to Party */}
        {isAddBookModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border my-auto max-h-[92vh] overflow-y-auto">
              <h3 className="text-base font-bold text-slate-900 mb-2">
                "{selectedParty.name}" এর জন্য বই যোগ করুন
              </h3>
              {bookSuccessMessage && (
                <div className="mb-4 p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2 animate-in fade-in duration-200">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{bookSuccessMessage}</span>
                </div>
              )}
              <form onSubmit={handleSaveBook} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">বইয়ের নাম *</label>
                  <input
                    type="text"
                    required
                    value={bookForm.name}
                    onChange={(e) => setBookForm({ ...bookForm, name: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm"
                    placeholder="যেমন: সহজ নূরানী কোরআন শিক্ষা"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">বইয়ের কোড</label>
                    <input
                      type="text"
                      value={bookForm.code}
                      onChange={(e) => setBookForm({ ...bookForm, code: e.target.value })}
                      className="w-full border rounded-lg p-2 text-sm"
                      placeholder="BK-101"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ডিফল্ট রেট (৳)</label>
                    <input
                      type="number"
                      value={bookForm.defaultRate}
                      onChange={(e) => setBookForm({ ...bookForm, defaultRate: parseFloat(e.target.value) || 0 })}
                      className="w-full border rounded-lg p-2 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ফর্মা সংখ্যা</label>
                    <input
                      type="number"
                      value={bookForm.forma}
                      onChange={(e) => setBookForm({ ...bookForm, forma: parseInt(e.target.value, 10) || 1 })}
                      className="w-full border rounded-lg p-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">প্লেট সংখ্যা</label>
                    <input
                      type="number"
                      value={bookForm.plates}
                      onChange={(e) => setBookForm({ ...bookForm, plates: parseInt(e.target.value, 10) || 4 })}
                      className="w-full border rounded-lg p-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">প্লেটের সাইজ</label>
                  <select
                    value={bookForm.size}
                    onChange={(e) => setBookForm({ ...bookForm, size: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm font-bold text-slate-800 bg-white"
                  >
                    <option value="২৩×৩৬">২৩×৩৬ (23×36)</option>
                    <option value="২০×৩০">২০×৩০ (20×30)</option>
                    <option value="২৫×৩৭">২৫×৩৭ (25×37)</option>
                    <option value="১৮×২৮">১৮×২৮ (18×28)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">পৃষ্ঠা সংক্রান্ত বিবরণ</label>
                  <input
                    type="text"
                    value={bookForm.pagesInfo}
                    onChange={(e) => setBookForm({ ...bookForm, pagesInfo: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm"
                    placeholder="১২৮ পৃষ্ঠা, ৪ কালার"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddBookModalOpen(false);
                      setBookSuccessMessage('');
                    }}
                    className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    সম্পন্ন / বন্ধ করুন
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs"
                  >
                    বই সংরক্ষণ (নতুন এন্ট্রি চালু থাকবে)
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Collection for Party */}
        {isAddCollectionModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border my-auto max-h-[92vh] overflow-y-auto">
              <h3 className="text-base font-bold text-slate-900 mb-2">
                "{selectedParty.name}" এর কালেকশন জমা
              </h3>
              <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded mb-4">
                বর্তমান বকেয়া: <b>{formatCurrency(balance, lang)}</b>
              </p>
              {collectionSuccessMessage && (
                <div className="mb-4 p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2 animate-in fade-in duration-200">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{collectionSuccessMessage}</span>
                </div>
              )}
              <form onSubmit={handleSaveCollection} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">জমার পরিমাণ (টাকা) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={collectionForm.amount}
                    onChange={(e) => setCollectionForm({ ...collectionForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg p-2.5 text-base font-bold text-emerald-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">তারিখ</label>
                    <input
                      type="date"
                      value={collectionForm.date}
                      onChange={(e) => setCollectionForm({ ...collectionForm, date: e.target.value })}
                      className="w-full border rounded-lg p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">রসিদ নম্বর</label>
                    <input
                      type="text"
                      value={collectionForm.receiptNo}
                      onChange={(e) => setCollectionForm({ ...collectionForm, receiptNo: e.target.value })}
                      className="w-full border rounded-lg p-2 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">পেমেন্ট মাধ্যম</label>
                  <select
                    value={collectionForm.paymentMethod}
                    onChange={(e) => setCollectionForm({ ...collectionForm, paymentMethod: e.target.value as any })}
                    className="w-full border rounded-lg p-2 text-xs"
                  >
                    <option value="cash">নগদ (Cash)</option>
                    <option value="bank">ব্যাংক (Bank)</option>
                    <option value="bkash">বিকাশ (bKash)</option>
                    <option value="nagad">নগদ (Nagad)</option>
                    <option value="rocket">রকেট (Rocket)</option>
                    <option value="other">অন্যান্য</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">মন্তব্য</label>
                  <input
                    type="text"
                    value={collectionForm.notes}
                    onChange={(e) => setCollectionForm({ ...collectionForm, notes: e.target.value })}
                    className="w-full border rounded-lg p-2 text-xs"
                    placeholder="চেক নম্বর বা ট্রানজেকশন বিবরণ"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddCollectionModalOpen(false);
                      setCollectionSuccessMessage('');
                    }}
                    className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    সম্পন্ন / বন্ধ করুন
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs"
                  >
                    কালেকশন জমা (নতুন এন্ট্রি চালু থাকবে)
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Quick Modal: Party Portal Login Credentials (Owner/Manager/Super Admin Only) */}
        {isQuickPortalModalOpen && canManagePartyPortal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border my-auto space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-indigo-600" />
                    <span>পার্টি পোর্টাল লগইন সেটআপ</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedParty.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsQuickPortalModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {portalError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
                  {portalError}
                </div>
              )}

              <form onSubmit={handleSaveQuickPortal} className="space-y-3.5 text-xs">
                <label className="flex items-center justify-between p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl cursor-pointer">
                  <div>
                    <span className="font-bold text-indigo-950 block">পার্টি পোর্টাল অ্যাক্সেস চালু করুন</span>
                    <span className="text-[11px] text-indigo-700">পার্টি নিজের বই, বিলকৃত কাজ ও বকেয়া দেখতে পারবে</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={portalForm.enabled}
                    onChange={(e) => setPortalForm((p) => ({ ...p, enabled: e.target.checked }))}
                    className="w-4 h-4 accent-indigo-600"
                  />
                </label>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">পার্টি লগইন আইডি (ইংরেজি অক্ষর/সংখ্যা)</label>
                  <input
                    type="text"
                    value={portalForm.loginId}
                    onChange={(e) => setPortalForm((p) => ({ ...p, loginId: e.target.value }))}
                    placeholder="যেমন: almadina01"
                    className="w-full border border-slate-300 rounded-lg p-2.5 font-mono font-bold text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">পাসওয়ার্ড (কমপক্ষে ৪ অক্ষর)</label>
                  <div className="relative">
                    <input
                      type={showPortalPwd ? 'text' : 'password'}
                      value={portalForm.password}
                      onChange={(e) => setPortalForm((p) => ({ ...p, password: e.target.value }))}
                      placeholder="পার্টির লগইন পাসওয়ার্ড"
                      className="w-full border border-slate-300 rounded-lg p-2.5 pr-12 font-medium text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPortalPwd(!showPortalPwd)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPortalPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setIsQuickPortalModalOpen(false)}
                    className="px-4 py-2 border rounded-lg font-bold text-slate-600 hover:bg-slate-50"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={savingPortal}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs"
                  >
                    {savingPortal ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Master Party List View
  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.partyList}</h2>
          <p className="text-xs text-slate-500">
            মোট কাস্টমার/পার্টি: {db.parties.length} জন | খাতা ও লেনদেন দেখার জন্য পার্টিতে ক্লিক করুন
          </p>
        </div>

        {!isReadOnly && (
          <button
            onClick={() => handleOpenAddModal()}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addParty}</span>
          </button>
        )}
      </div>

      {/* Pending Party Self-Signup Requests Banner (Owner/Manager/Super Admin Only) */}
      {canManagePartyPortal &&
        (() => {
          const pendingAccounts = (saasRegistry.partyAccounts || []).filter(
            (a) => a.businessId === activeBusinessId && a.status === 'pending'
          );
          if (pendingAccounts.length === 0) return null;
          return (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
                  <h3 className="text-sm font-bold text-indigo-950">
                    পার্টি পোর্টাল সাইন-আপ অনুমোদনের অপেক্ষায় ({pendingAccounts.length} জন)
                  </h3>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {pendingAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="bg-white p-3.5 rounded-xl border border-indigo-200 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-slate-900">{acc.partyName}</p>
                        <p className="text-[11px] text-slate-500">
                          {acc.contactPerson} • {acc.phone}
                        </p>
                        <p className="text-[11px] font-mono text-indigo-700 font-bold mt-0.5">
                          আইডি: {acc.loginId}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        কোন পার্টির খাতার সাথে যুক্ত করবেন?
                      </label>
                      <select
                        value={linkPartySelection[acc.id] || 'NEW'}
                        onChange={(e) =>
                          setLinkPartySelection((prev) => ({ ...prev, [acc.id]: e.target.value }))
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 font-semibold"
                      >
                        <option value="NEW">+ নতুন পার্টি হিসেবে তৈরি ও লিংক করুন ({acc.partyName})</option>
                        {db.parties.map((p) => (
                          <option key={p.id} value={p.id}>
                            বিদ্যমান পার্টি: {p.name} ({p.phone})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={reviewingAccId === acc.id}
                        onClick={() => handleReviewPendingPartyAccount(acc.id, 'rejected')}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold transition"
                      >
                        বাতিল
                      </button>
                      <button
                        type="button"
                        disabled={reviewingAccId === acc.id}
                        onClick={() => handleReviewPendingPartyAccount(acc.id, 'approved')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs transition"
                      >
                        {reviewingAccId === acc.id ? 'প্রসেস হচ্ছে...' : 'অনুমোদন ও চালু'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

      {/* Search and Filter */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
        <Search className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="পার্টির নাম, ফোন নম্বর বা যোগাযোগকারীর নাম দিয়ে খুঁজুন..."
          className="w-full text-xs outline-none bg-transparent"
        />
      </div>

      {/* Parties Grid / Cards */}
      {filteredParties.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h4 className="font-bold text-slate-700 text-base">{t.emptyStateTitle}</h4>
          <p className="text-xs text-slate-500">{t.emptyStateSubtitle}</p>
          {!isReadOnly && (
            <button
              onClick={() => handleOpenAddModal()}
              className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold"
            >
              + প্রথম পার্টি যোগ করুন
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredParties.map((party) => {
            const balance = getPartyBalance(party.id);
            const bookCount = db.books.filter((b) => b.partyIds.includes(party.id)).length;
            const productionCount = db.productions.filter((p) => p.partyId === party.id).length;

            return (
              <div
                key={party.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-500/50 shadow-xs hover:shadow-md transition p-5 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div
                      onClick={() => setSelectedPartyId(party.id)}
                      className="cursor-pointer flex items-center space-x-3"
                    >
                      {party.photoUrl ? (
                        <img
                          src={party.photoUrl}
                          alt={party.name}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0">
                          {party.name.slice(0, 1)}
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-base text-slate-900 group-hover:text-emerald-700 transition">
                          {party.name}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">{party.contactPerson}</p>
                      </div>
                    </div>

                    {!isReadOnly && (
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleOpenAddModal(party)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md"
                          title="সম্পাদনা"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteParty(party)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                          title="মুছুন / নিষ্ক্রিয় করুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 mb-4">
                    <div className="flex items-center space-x-1.5">
                      <PhoneLink phone={party.phone} />
                    </div>
                    <p className="flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{party.address}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-xs py-2 bg-slate-50 rounded-xl mb-4">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">বই সংখ্যা</span>
                      <p className="font-bold text-slate-800">{bookCount}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">প্রডাকশন</span>
                      <p className="font-bold text-slate-800">{productionCount}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">বর্তমান বকেয়া</span>
                    <p className={`text-base font-black ${balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {formatCurrency(balance, lang)}
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedPartyId(party.id)}
                    className="px-3 py-1.5 bg-slate-900 group-hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1"
                  >
                    <span>খাতা দেখুন</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add/Edit Party */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border my-auto max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              {editingParty ? 'পার্টির তথ্য সংশোধন' : 'নতুন কাস্টমার / পার্টি যোগ করুন'}
            </h3>
            {partySuccessMessage && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2 animate-in fade-in duration-200">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{partySuccessMessage}</span>
              </div>
            )}
            <form onSubmit={handleSaveParty} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">পার্টির নাম *</label>
                <input
                  type="text"
                  required
                  value={partyForm.name}
                  onChange={(e) => setPartyForm({ ...partyForm, name: e.target.value })}
                  placeholder="যেমন: আল-মদিনা পাবলিকেশন্স"
                  className="w-full border rounded-lg p-2.5 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">যোগাযোগকারী ব্যক্তি</label>
                  <input
                    type="text"
                    value={partyForm.contactPerson}
                    onChange={(e) => setPartyForm({ ...partyForm, contactPerson: e.target.value })}
                    placeholder="মালিক বা ম্যানেজারের নাম"
                    className="w-full border rounded-lg p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ফোন নম্বর *</label>
                  <input
                    type="text"
                    required
                    value={partyForm.phone}
                    onChange={(e) => setPartyForm({ ...partyForm, phone: e.target.value })}
                    placeholder="০১৭XX-XXXXXX"
                    className="w-full border rounded-lg p-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ঠিকানা</label>
                <input
                  type="text"
                  value={partyForm.address}
                  onChange={(e) => setPartyForm({ ...partyForm, address: e.target.value })}
                  placeholder="৩৮ বাংলাবাজার, ঢাকা"
                  className="w-full border rounded-lg p-2.5 text-sm"
                />
              </div>

              {/* Optional Customer Photo / Logo */}
              <div className="border border-slate-200 p-3 rounded-xl bg-slate-50/70 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
                    <ImageIcon className="w-4 h-4 text-emerald-700" />
                    <span>কাস্টমার / পার্টির ছবি বা লোগো (ঐচ্ছিক - বাধ্যতামূলক না)</span>
                  </label>
                  <label className="cursor-pointer text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-white border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center space-x-1 shadow-2xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{partyForm.photoUrl ? 'ছবি পরিবর্তন' : 'ছবি আপলোড'}</span>
                    <input type="file" accept="image/*" onChange={handlePartyPhotoUpload} className="hidden" />
                  </label>
                </div>

                {partyForm.photoUrl && (
                  <div className="flex items-center space-x-3 p-2 bg-white rounded-lg border border-slate-200">
                    <img
                      src={partyForm.photoUrl}
                      alt="Party Preview"
                      className="w-12 h-12 rounded-lg object-cover border shadow-xs"
                    />
                    <div className="flex-1">
                      <span className="text-xs font-bold text-slate-800 block">ছবি যুক্ত হয়েছে</span>
                      <button
                        type="button"
                        onClick={() => setPartyForm((prev) => ({ ...prev, photoUrl: '' }))}
                        className="text-[11px] text-rose-600 font-bold hover:underline"
                      >
                        ছবি মুছে ফেলুন
                      </button>
                    </div>
                  </div>
                )}
                {partyPhotoError && (
                  <p className="text-[11px] text-rose-600 font-semibold">{partyPhotoError}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ইমেইল</label>
                  <input
                    type="email"
                    value={partyForm.email}
                    onChange={(e) => setPartyForm({ ...partyForm, email: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">প্রাথমিক বকেয়া (৳)</label>
                  <input
                    type="number"
                    value={partyForm.openingDue}
                    onChange={(e) => setPartyForm({ ...partyForm, openingDue: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg p-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">মন্তব্য</label>
                <textarea
                  rows={2}
                  value={partyForm.notes}
                  onChange={(e) => setPartyForm({ ...partyForm, notes: e.target.value })}
                  className="w-full border rounded-lg p-2 text-xs"
                />
              </div>

              {/* Optional Party Portal Login & Password — STRICTLY Owner, Manager, or Super Admin ONLY */}
              {canManagePartyPortal && (
                <div className="border border-indigo-200 bg-indigo-50/50 p-3.5 rounded-xl space-y-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-1.5">
                      <KeyRound className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="font-bold text-indigo-950">
                        পার্টি পোর্টাল লগইন আইডি ও পাসওয়ার্ড (ঐচ্ছিক - বাধ্যতামূলক না)
                      </span>
                    </div>
                    <label className="flex items-center space-x-1.5 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={portalForm.enabled}
                        onChange={(e) =>
                          setPortalForm((prev) => ({ ...prev, enabled: e.target.checked }))
                        }
                        className="w-4 h-4 accent-indigo-600"
                      />
                      <span className="font-bold text-indigo-800">চালু</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        লগইন আইডি (ইংরেজি অক্ষর/সংখ্যা)
                      </label>
                      <input
                        type="text"
                        value={portalForm.loginId}
                        onChange={(e) =>
                          setPortalForm((prev) => ({ ...prev, loginId: e.target.value }))
                        }
                        placeholder="যেমন: almadina01"
                        className="w-full border border-indigo-200 rounded-lg p-2 bg-white font-mono font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        পাসওয়ার্ড (কমপক্ষে ৪ অক্ষর)
                      </label>
                      <div className="relative">
                        <input
                          type={showPortalPwd ? 'text' : 'password'}
                          value={portalForm.password}
                          onChange={(e) =>
                            setPortalForm((prev) => ({ ...prev, password: e.target.value }))
                          }
                          placeholder="লগইন পাসওয়ার্ড দিন"
                          className="w-full border border-indigo-200 rounded-lg p-2 pr-9 bg-white text-xs font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPortalPwd(!showPortalPwd)}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                        >
                          {showPortalPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {portalError && (
                    <p className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded-lg">
                      {portalError}
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setPartySuccessMessage('');
                    setPortalError('');
                  }}
                  className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  {editingParty ? 'বাতিল' : 'সম্পন্ন / বন্ধ করুন'}
                </button>
                <button
                  type="submit"
                  disabled={savingPortal}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  {savingPortal
                    ? 'সংরক্ষণ হচ্ছে...'
                    : editingParty
                    ? 'সংরক্ষণ করুন'
                    : 'সংরক্ষণ (নতুন এন্ট্রি চালু থাকবে)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Party Confirmation Modal */}
      <ConfirmModal
        isOpen={!!partyToDelete}
        title="পার্টি মুছে ফেলা / নিষ্ক্রিয় করা"
        message={`আপনি কি নিশ্চিত যে "${partyToDelete?.name}" পার্টিটি মুছে ফেলতে চান?`}
        onConfirm={() => {
          if (partyToDelete) {
            deleteParty(partyToDelete.id);
            if (selectedPartyId === partyToDelete.id) {
              setSelectedPartyId(null);
            }
            setPartyToDelete(null);
          }
        }}
        onCancel={() => setPartyToDelete(null)}
      />
    </div>
  );
};
