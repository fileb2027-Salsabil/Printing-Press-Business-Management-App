import React, { useState, useMemo } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { Book } from '../../types';
import { formatCurrency } from '../../utils/calculations';
import { translations } from '../../utils/i18n';
import { SmartNumberInput } from '../common/SmartNumberInput';
import {
  BookOpen,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  Users,
  Upload,
  X,
  Image as ImageIcon,
  AlertCircle,
  Sparkles,
  Layers,
  Copy,
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { validateAndProcessImage } from '../../utils/imageUpload';

interface BookManagerProps {
  onSelectParty?: (partyId: string) => void;
}

export const BookManager: React.FC<BookManagerProps> = ({ onSelectParty }) => {
  const { db, isReadOnly, canAccessModule, addBook, updateBook, deleteBook } = useDatabase();
  const canOpenParty = Boolean(onSelectParty && canAccessModule('parties'));
  const lang = db.settings.language;
  const t = translations[lang];

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);

  // Search inside party selection modal
  const [partySearchModal, setPartySearchModal] = useState('');
  const [bookPhotoError, setBookPhotoError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [allowDuplicateName, setAllowDuplicateName] = useState(false);
  const [isNameDropdownOpen, setIsNameDropdownOpen] = useState(false);

  const [form, setForm] = useState({
    name: '',
    code: '',
    forma: 1,
    plates: 4,
    size: '23*36 DD',
    defaultRate: db.settings.globalDefaultRatePerForma || 450,
    pagesInfo: '',
    photoUrl: '',
    notes: '',
    isActive: true,
    partyIds: [] as string[],
  });

  // Real-time matching of existing books by name
  const trimmedName = form.name.trim();
  const matchingBooks = useMemo(() => {
    if (!trimmedName || trimmedName.length < 2) return [];
    return db.books.filter(
      (b) => b.id !== editingBook?.id && b.name.toLowerCase().includes(trimmedName.toLowerCase())
    );
  }, [trimmedName, db.books, editingBook]);

  // Exact duplicate book check
  const exactDuplicateBook = useMemo(() => {
    if (!trimmedName) return null;
    return db.books.find(
      (b) => b.id !== editingBook?.id && b.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
  }, [trimmedName, db.books, editingBook]);

  const filteredBooks = db.books.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleBookPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setBookPhotoError('');
      const res = await validateAndProcessImage(file);
      setForm((prev) => ({ ...prev, photoUrl: res.dataUrl }));
    } catch (err: any) {
      setBookPhotoError(err.message || 'বইয়ের ছবি আপলোড ব্যর্থ হয়েছে');
    }
  };

  const handleOpenModal = (book?: Book) => {
    if (isReadOnly) return;
    setPartySearchModal('');
    setBookPhotoError('');
    setSuccessMessage('');
    setDuplicateWarning('');
    setAllowDuplicateName(false);
    setIsNameDropdownOpen(false);
    if (book) {
      setEditingBook(book);
      setForm({
        name: book.name,
        code: book.code,
        forma: book.forma,
        plates: book.plates,
        size: book.size || '23*36 DD',
        defaultRate: book.defaultRate,
        pagesInfo: book.pagesInfo || '',
        photoUrl: book.photoUrl || '',
        notes: book.notes || '',
        isActive: book.isActive,
        partyIds: book.partyIds || [],
      });
    } else {
      setEditingBook(null);
      setForm({
        name: '',
        code: `BK-${(db.books.length + 101).toString()}`,
        forma: 1,
        plates: 4,
        size: '23*36 DD',
        defaultRate: db.settings.globalDefaultRatePerForma || 450,
        pagesInfo: '',
        photoUrl: '',
        notes: '',
        isActive: true,
        partyIds: db.parties.length > 0 ? [db.parties[0].id] : [],
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    // Check for accidental duplicate entry
    if (!editingBook && exactDuplicateBook && !allowDuplicateName) {
      setDuplicateWarning(
        `সতর্কতা: "${form.name}" নামে ইতিমধ্যে বই রয়েছে! একই বই ২ বার বা বারবার যোগ হওয়া রোধ করতে সেভ আটকানো হয়েছে। আপনি নিশ্চিতভাবেই একই নামে আরেকটি নতুন বই যোগ করতে চাইলে নিচের চেকবক্সে টিক দিন।`
      );
      return;
    }

    if (editingBook) {
      updateBook(editingBook.id, form);
      setIsModalOpen(false);
    } else {
      addBook(form);
      setSuccessMessage(`বই "${form.name}" সফলভাবে যুক্ত হয়েছে! নতুন বই যোগ করতে পারেন।`);
      setForm((prev) => ({
        ...prev,
        name: '',
        code: `BK-${(db.books.length + 102).toString()}`,
        pagesInfo: '',
        notes: '',
        photoUrl: '',
      }));
      setAllowDuplicateName(false);
      setIsNameDropdownOpen(false);
      setDuplicateWarning('');
    }
  };

  const handleDelete = (book: Book) => {
    if (isReadOnly) return;
    setBookToDelete(book);
  };

  const toggleParty = (partyId: string) => {
    setForm((prev) => {
      const exists = prev.partyIds.includes(partyId);
      return {
        ...prev,
        partyIds: exists ? prev.partyIds.filter((id) => id !== partyId) : [...prev.partyIds, partyId],
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.bookList}</h2>
          <p className="text-xs text-slate-500">
            গ্লোবাল বইয়ের তালিকা | মোট বই: {db.books.length} টি
          </p>
        </div>

        {!isReadOnly && (
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addBook}</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
        <Search className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="বইয়ের নাম বা কোড দিয়ে খুঁজুন..."
          className="w-full text-xs outline-none bg-transparent"
        />
      </div>

      {/* Books Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b">
              <tr>
                <th className="p-3">কোড</th>
                <th className="p-3">বইয়ের নাম</th>
                <th className="p-3">সংযুক্ত পার্টিসমূহ</th>
                <th className="p-3 text-center">ফর্মা</th>
                <th className="p-3 text-center">প্লেট</th>
                <th className="p-3 text-right">ডিফল্ট রেট (৳)</th>
                <th className="p-3">বিবরণ / পৃষ্ঠা</th>
                <th className="p-3 text-center">স্ট্যাটাস</th>
                {!isReadOnly && <th className="p-3 text-right">অ্যাকশন</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredBooks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    কোনো বইয়ের তথ্য নেই। নতুন বই যোগ করুন।
                  </td>
                </tr>
              ) : (
                filteredBooks.map((book) => {
                  const assignedParties = db.parties.filter((p) => book.partyIds?.includes(p.id));
                  return (
                    <tr key={book.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono font-bold text-slate-800">{book.code}</td>
                      <td className="p-3">
                        <div className="flex items-center space-x-2.5">
                          {book.photoUrl ? (
                            <img
                              src={book.photoUrl}
                              alt={book.name}
                              className="w-9 h-9 rounded-lg object-cover border shrink-0 shadow-2xs"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0 border border-emerald-100">
                              <BookOpen className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-slate-900 block">{book.name}</span>
                            {book.size && (
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded inline-block mt-0.5 border ${
                                  book.size.includes('20*30') || book.size.includes('২০×৩০') || book.size.toLowerCase().includes('dc')
                                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                                    : book.size.includes('23*36') || book.size.includes('২৩×৩৬') || book.size.toLowerCase().includes('dd')
                                    ? 'bg-blue-50 text-blue-900 border-blue-300'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {book.size}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {assignedParties.length === 0 ? (
                            <span className="text-slate-400 italic">সকলের জন্য প্রযোজ্য</span>
                          ) : (
                            assignedParties.map((p) =>
                              canOpenParty ? (
                                <button
                                  type="button"
                                  key={p.id}
                                  onClick={() => onSelectParty?.(p.id)}
                                  title={`${p.name} পার্টির খাতায় যান`}
                                  className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-200 text-emerald-800 hover:text-emerald-950 border border-emerald-200 hover:border-emerald-400 rounded text-[10px] font-semibold underline decoration-emerald-400/70 underline-offset-2 transition cursor-pointer"
                                >
                                  {p.name}
                                </button>
                              ) : (
                                <span
                                  key={p.id}
                                  className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded text-[10px] font-semibold"
                                >
                                  {p.name}
                                </span>
                              )
                            )
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center font-bold">{book.forma}</td>
                      <td className="p-3 text-center font-bold">{book.plates}</td>
                      <td className="p-3 text-right font-bold text-emerald-700">
                        {formatCurrency(book.defaultRate, lang)}
                      </td>
                      <td className="p-3 text-slate-500">{book.pagesInfo || '-'}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            book.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {book.isActive ? 'সক্রিয়' : 'আর্কাইভ'}
                        </span>
                      </td>
                      {!isReadOnly && (
                        <td className="p-3 text-right">
                          <div className="flex justify-end space-x-1">
                            <button
                              onClick={() => handleOpenModal(book)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                              title="সম্পাদনা"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(book)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"
                              title="মুছুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add/Edit Book */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border my-auto max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              {editingBook ? 'বইয়ের তথ্য সংশোধন' : 'নতুন বই যোগ করুন'}
            </h3>
            {successMessage && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2 animate-in fade-in duration-200">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}
            <form onSubmit={handleSave} className="space-y-4">
              {duplicateWarning && (
                <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs font-bold flex items-start space-x-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{duplicateWarning}</span>
                </div>
              )}

              {/* Book Name & Code with Live Existing Book Lookup */}
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 relative">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">বইয়ের নাম *</label>
                      {matchingBooks.length > 0 && (
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">
                          {matchingBooks.length} টি মিল পাওয়া গেছে
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onFocus={() => setIsNameDropdownOpen(true)}
                      onChange={(e) => {
                        setForm({ ...form, name: e.target.value });
                        setAllowDuplicateName(false);
                        setIsNameDropdownOpen(true);
                        setDuplicateWarning('');
                      }}
                      placeholder="যেমন: সহজ নূরানী কোরআন শিক্ষা"
                      className="w-full border rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    />

                    {/* Auto-suggest dropdown when similar books exist */}
                    {isNameDropdownOpen && matchingBooks.length > 0 && !exactDuplicateBook && (
                      <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-xl shadow-xl p-2 max-h-48 overflow-y-auto space-y-1">
                        <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-600 border-b border-slate-100">
                          <span className="flex items-center space-x-1">
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            <span>আগে যোগ করা বইয়ের তালিকা ({matchingBooks.length} টি):</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsNameDropdownOpen(false)}
                            className="text-slate-400 hover:text-slate-600 p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {matchingBooks.map((mb) => {
                          const assigned = db.parties
                            .filter((p) => mb.partyIds?.includes(p.id))
                            .map((p) => p.name)
                            .join(', ');
                          return (
                            <div
                              key={mb.id}
                              onClick={() => {
                                setForm((prev) => ({
                                  ...prev,
                                  name: mb.name,
                                  forma: mb.forma,
                                  plates: mb.plates,
                                  size: mb.size || prev.size,
                                  defaultRate: mb.defaultRate,
                                  partyIds: mb.partyIds || prev.partyIds,
                                  pagesInfo: mb.pagesInfo || '',
                                  photoUrl: mb.photoUrl || '',
                                }));
                                setIsNameDropdownOpen(false);
                              }}
                              className="p-2 rounded-lg hover:bg-emerald-50 cursor-pointer transition flex items-center justify-between text-xs border border-transparent hover:border-emerald-200"
                            >
                              <div>
                                <span className="font-bold text-slate-900">{mb.name}</span>
                                <span className="text-[10px] text-slate-500 font-mono ml-2">({mb.code})</span>
                                {assigned && (
                                  <span className="text-[10px] text-emerald-700 block mt-0.5">পার্টি: {assigned}</span>
                                )}
                              </div>
                              <div className="text-right text-[10px] font-semibold text-slate-600">
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded mr-1 font-bold">
                                  {mb.size || 'সাইজ নেই'}
                                </span>
                                <span>{mb.forma} ফর্মা</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">কোড *</label>
                    <input
                      type="text"
                      required
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      placeholder="BK-101"
                      className="w-full border rounded-lg p-2.5 text-sm font-mono"
                    />
                  </div>
                </div>

                {/* Prominent Duplicate Book Alert & Safe Confirmation Box */}
                {exactDuplicateBook && (
                  <div className="p-3 bg-amber-50 border-2 border-amber-400 rounded-xl space-y-2 text-xs animate-in fade-in">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-bold text-amber-950 text-sm">
                          ⚠️ এই নামের বইটি ইতিমধ্যে তালিকায় বিদ্যমান!
                        </h4>
                        <p className="text-amber-900 text-xs mt-0.5">
                          বইয়ের নাম: <b className="text-slate-950">{exactDuplicateBook.name}</b> (কোড: {exactDuplicateBook.code})
                        </p>
                        <div className="flex flex-wrap gap-2 text-[10px] text-amber-950 font-semibold mt-1">
                          <span className="bg-amber-200/70 px-1.5 py-0.5 rounded">সাইজ: {exactDuplicateBook.size || 'নির্দিষ্ট নেই'}</span>
                          <span className="bg-amber-200/70 px-1.5 py-0.5 rounded">ফর্মা: {exactDuplicateBook.forma}</span>
                          <span className="bg-amber-200/70 px-1.5 py-0.5 rounded">প্লেট: {exactDuplicateBook.plates}</span>
                          <span className="bg-amber-200/70 px-1.5 py-0.5 rounded">
                            পার্টি: {db.parties.filter((p) => exactDuplicateBook.partyIds?.includes(p.id)).map((p) => p.name).join(', ') || 'গ্লোবাল'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="flex items-center space-x-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={allowDuplicateName}
                          onChange={(e) => {
                            setAllowDuplicateName(e.target.checked);
                            setDuplicateWarning('');
                          }}
                          className="rounded text-amber-700 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                        />
                        <span className="font-bold text-slate-900 text-xs">
                          হ্যাঁ, আমি নিশ্চিতভাবে একই নামে আরেকটি নতুন বই যোগ করতে চাই
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({
                            ...prev,
                            forma: exactDuplicateBook.forma,
                            plates: exactDuplicateBook.plates,
                            size: exactDuplicateBook.size || prev.size,
                            defaultRate: exactDuplicateBook.defaultRate,
                            partyIds: exactDuplicateBook.partyIds || prev.partyIds,
                            pagesInfo: exactDuplicateBook.pagesInfo || '',
                            photoUrl: exactDuplicateBook.photoUrl || '',
                          }));
                          setIsNameDropdownOpen(false);
                        }}
                        className="text-[11px] font-bold text-amber-900 hover:text-black underline text-left flex items-center space-x-1"
                      >
                        <Copy className="w-3 h-3 inline" />
                        <span>পূর্বের বইয়ের সাইজ/ফর্মা কপি করুন</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Technical Specifications with 20*30 DC and 23*36 DD sizes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ফর্মা সংখ্যা</label>
                  <SmartNumberInput
                    integer
                    min={0}
                    fallbackOnBlur={0}
                    value={form.forma}
                    onValueChange={(val) => setForm({ ...form, forma: val })}
                    className="w-full border rounded-lg p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">প্লেট সংখ্যা</label>
                  <SmartNumberInput
                    integer
                    min={0}
                    fallbackOnBlur={0}
                    value={form.plates}
                    onValueChange={(val) => setForm({ ...form, plates: val })}
                    className="w-full border rounded-lg p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">বই/প্লেট সাইজ *</label>
                  <select
                    value={form.size}
                    onChange={(e) => setForm({ ...form, size: e.target.value })}
                    className="w-full border rounded-lg p-2 text-xs font-bold text-slate-800 bg-white"
                  >
                    <option value="20*30 DC">20*30 DC (ডাবল ক্রাউন)</option>
                    <option value="23*36 DD">23*36 DD (ডাবল ডিমাই)</option>
                    <option value="২০×৩০">২০×৩০ (DC)</option>
                    <option value="২৩×৩৬">২৩×৩৬ (DD)</option>
                    <option value="২৫×৩৭">২৫×৩৭</option>
                    <option value="১৮×২৮">১৮×২৮</option>
                  </select>
                  {/* Quick-select size pill buttons */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {[
                      { id: '20*30 DC', label: '20*30 DC' },
                      { id: '23*36 DD', label: '23*36 DD' },
                      { id: '২৫×৩৭', label: '২৫×৩৭' },
                    ].map((sz) => (
                      <button
                        type="button"
                        key={sz.id}
                        onClick={() => setForm({ ...form, size: sz.id })}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                          form.size === sz.id ||
                          (sz.id === '20*30 DC' && (form.size === '২০×৩০' || form.size === '20*30')) ||
                          (sz.id === '23*36 DD' && (form.size === '২৩×৩৬' || form.size === '23*36'))
                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {sz.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ডিফল্ট রেট (৳)</label>
                  <SmartNumberInput
                    min={0}
                    fallbackOnBlur={0}
                    value={form.defaultRate}
                    onValueChange={(val) => setForm({ ...form, defaultRate: val })}
                    className="w-full border rounded-lg p-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">পৃষ্ঠা ও মলাট সংক্রান্ত বিবরণ</label>
                <input
                  type="text"
                  value={form.pagesInfo}
                  onChange={(e) => setForm({ ...form, pagesInfo: e.target.value })}
                  placeholder="যেমন: ১২৮ পৃষ্ঠা, চার কালার কভার"
                  className="w-full border rounded-lg p-2 text-sm"
                />
              </div>

              {/* Optional Book Cover / Photo */}
              <div className="border border-slate-200 p-3 rounded-xl bg-slate-50/70 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
                    <ImageIcon className="w-4 h-4 text-emerald-700" />
                    <span>বইয়ের কভার / ছবি (ঐচ্ছিক - বাধ্যতামূলক না)</span>
                  </label>
                  <label className="cursor-pointer text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-white border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center space-x-1 shadow-2xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{form.photoUrl ? 'ছবি পরিবর্তন' : 'ছবি আপলোড'}</span>
                    <input type="file" accept="image/*" onChange={handleBookPhotoUpload} className="hidden" />
                  </label>
                </div>

                {form.photoUrl && (
                  <div className="flex items-center space-x-3 p-2 bg-white rounded-lg border border-slate-200">
                    <img
                      src={form.photoUrl}
                      alt="Book Cover Preview"
                      className="w-12 h-14 rounded object-cover border shadow-xs"
                    />
                    <div className="flex-1">
                      <span className="text-xs font-bold text-slate-800 block">কভার ছবি যুক্ত হয়েছে</span>
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, photoUrl: '' }))}
                        className="text-[11px] text-rose-600 font-bold hover:underline"
                      >
                        ছবি মুছে ফেলুন
                      </button>
                    </div>
                  </div>
                )}
                {bookPhotoError && (
                  <p className="text-[11px] text-rose-600 font-semibold">{bookPhotoError}</p>
                )}
              </div>

              {/* Assign to parties with search bar */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2.5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                  <div>
                    <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <Users className="w-4 h-4 text-emerald-700" />
                      <span>পার্টি সংযুক্ত করুন (যার বই) *</span>
                    </label>
                    <span className="text-[11px] text-slate-500">
                      সার্চ করে সহজেই পার্টি খুঁজে বের করুন
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-700 font-bold bg-emerald-100/70 px-2 py-0.5 rounded-full">
                    ✓ প্লেটের অবস্থানে অটো যুক্ত হবে
                  </span>
                </div>

                {/* Selected Parties Badges */}
                {form.partyIds.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 p-2 bg-white rounded-lg border border-emerald-200">
                    <span className="text-[10px] font-bold text-emerald-800 mr-1">
                      সংযুক্ত পার্টি ({form.partyIds.length} টি):
                    </span>
                    {form.partyIds.map((pid) => {
                      const pty = db.parties.find((p) => p.id === pid);
                      return (
                        <span
                          key={pid}
                          className="inline-flex items-center space-x-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full text-xs font-bold"
                        >
                          <span>{pty?.name || 'অজ্ঞাত'}</span>
                          <button
                            type="button"
                            onClick={() => toggleParty(pid)}
                            className="text-emerald-700 hover:text-rose-600 ml-1 rounded-full p-0.5"
                            title="বাদ দিন"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Search Bar for Parties */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={partySearchModal}
                    onChange={(e) => setPartySearchModal(e.target.value)}
                    placeholder="পার্টির নাম বা ফোন নম্বর দিয়ে সার্চ করুন..."
                    className="w-full pl-8 pr-8 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:outline-emerald-600"
                  />
                  {partySearchModal && (
                    <button
                      type="button"
                      onClick={() => setPartySearchModal('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filtered Parties Checklist */}
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-1.5 space-y-1 bg-white">
                  {db.parties.length === 0 ? (
                    <p className="text-[11px] text-slate-400 p-2 text-center">কোনো পার্টি নেই।</p>
                  ) : (
                    (() => {
                      const matched = db.parties.filter(
                        (p) =>
                          p.name.toLowerCase().includes(partySearchModal.toLowerCase()) ||
                          (p.phone && p.phone.includes(partySearchModal)) ||
                          (p.contactPerson && p.contactPerson.toLowerCase().includes(partySearchModal.toLowerCase()))
                      );
                      if (matched.length === 0) {
                        return (
                          <div className="p-3 text-center text-slate-400 text-xs">
                            "{partySearchModal}" নামে কোনো পার্টি পাওয়া যায়নি।
                          </div>
                        );
                      }
                      return matched.map((p) => {
                        const isSelected = form.partyIds.includes(p.id);
                        return (
                          <label
                            key={p.id}
                            className={`flex items-center justify-between text-xs cursor-pointer p-2 rounded-lg border transition ${
                              isSelected
                                ? 'bg-emerald-50/80 border-emerald-300 font-bold text-emerald-900'
                                : 'bg-slate-50/50 border-transparent hover:bg-slate-100 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleParty(p.id)}
                                className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                              />
                              <span>{p.name}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {p.phone || p.contactPerson || ''}
                            </span>
                          </label>
                        );
                      });
                    })()
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">মন্তব্য</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
                  className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  {editingBook ? 'বাতিল' : 'সম্পন্ন / বন্ধ করুন'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  {editingBook ? 'সংরক্ষণ করুন' : 'সংরক্ষণ (নতুন এন্ট্রি চালু থাকবে)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Book Confirmation Modal */}
      <ConfirmModal
        isOpen={!!bookToDelete}
        title="বই মুছে ফেলা"
        message={`আপনি কি নিশ্চিত যে "${bookToDelete?.name}" বইটি তালিকা থেকে মুছে ফেলতে চান?`}
        onConfirm={() => {
          if (bookToDelete) {
            deleteBook(bookToDelete.id);
            setBookToDelete(null);
          }
        }}
        onCancel={() => setBookToDelete(null)}
      />
    </div>
  );
};
