import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { BanglaFont, CompanySettings, Language, Theme } from '../../types';
import { validateAndProcessImage } from '../../utils/imageUpload';
import { translations } from '../../utils/i18n';
import {
  Settings,
  Building2,
  User,
  Palette,
  Shield,
  Upload,
  CheckCircle,
  Save,
  Lock,
} from 'lucide-react';

export const SettingsManager: React.FC = () => {
  const { db, updateSettings, isReadOnly } = useDatabase();
  const lang = db.settings.language;
  const t = translations[lang];

  const [form, setForm] = useState<CompanySettings>(db.settings);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImageError(null);
      const res = await validateAndProcessImage(file);
      setForm((prev) => ({ ...prev, logoUrl: res.dataUrl }));
    } catch (err: any) {
      setImageError(err.message || 'ছবি আপলোড ব্যর্থ হয়েছে');
    }
  };

  const handleOwnerPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImageError(null);
      const res = await validateAndProcessImage(file);
      setForm((prev) => ({
        ...prev,
        owner: { ...prev.owner, photoUrl: res.dataUrl },
      }));
    } catch (err: any) {
      setImageError(err.message || 'ছবি আপলোড ব্যর্থ হয়েছে');
    }
  };

  const handleManagerPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImageError(null);
      const res = await validateAndProcessImage(file);
      setForm((prev) => ({
        ...prev,
        manager: { ...prev.manager, photoUrl: res.dataUrl },
      }));
    } catch (err: any) {
      setImageError(err.message || 'ছবি আপলোড ব্যর্থ হয়েছে');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    updateSettings(form);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.settingsTitle}</h2>
          <p className="text-xs text-slate-500">
            প্রতিষ্ঠানের প্রোফাইল, লোগো, মালিক, থিম, ফন্ট ও ব্যবসায়িক নীতি পরিচালনা করুন
          </p>
        </div>

        {savedSuccess && (
          <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg flex items-center space-x-1">
            <CheckCircle className="w-4 h-4" />
            <span>সেটিংস সংরক্ষিত হয়েছে!</span>
          </span>
        )}
      </div>

      {isReadOnly && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold flex items-center space-x-2">
          <Lock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>শুধুমাত্র প্রদর্শন মোড (Read-Only): আপনি শুধুমাত্র প্রতিষ্ঠানের তথ্য দেখতে পারবেন, কোনো পরিবর্তন বা সংরক্ষণ করতে পারবেন না।</span>
        </div>
      )}

      {imageError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
          {imageError}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <fieldset disabled={isReadOnly} className="space-y-6">
        {/* Section 1: Company Profile & Logo */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-base text-slate-900 flex items-center space-x-2 border-b pb-2">
            <Building2 className="w-5 h-5 text-emerald-700" />
            <span>{t.companyInfo}</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">প্রতিষ্ঠানের নাম (বাংলা)</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name (English)</label>
              <input
                type="text"
                value={form.nameEn}
                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ঠিকানা</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full border rounded-lg p-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ফোন নম্বর</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ইমেইল</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm"
              />
            </div>
          </div>

          {/* Logo upload */}
          <div className="border border-dashed p-3 rounded-xl bg-slate-50 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="Logo" className="w-12 h-12 object-contain bg-white rounded border" />
              ) : (
                <div className="w-12 h-12 bg-emerald-700 text-white rounded flex items-center justify-center font-bold">
                  {(form.name || 'P').charAt(0)}
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-slate-800">প্রতিষ্ঠানের লোগো</p>
                <p className="text-[10px] text-slate-500">প্রিন্ট ভাউচার ও হেডারে প্রদর্শিত হবে</p>
              </div>
            </div>

            {!isReadOnly && (
              <label className="cursor-pointer bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1">
                <Upload className="w-3.5 h-3.5" />
                <span>লোগো পরিবর্তন</span>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
            )}
          </div>
        </div>

        {/* Section 2: Owner & Manager */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-base text-slate-900 flex items-center space-x-2 border-b pb-2">
            <User className="w-5 h-5 text-emerald-700" />
            <span>মালিক ও ম্যানেজারের প্রোফাইল</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Owner */}
            <div className="p-4 border rounded-xl bg-slate-50/50 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-emerald-800 uppercase">মালিক / স্বত্বাধিকারী</span>
                {!isReadOnly && (
                  <label className="cursor-pointer text-[11px] text-emerald-700 font-bold hover:underline">
                    ছবি আপলোড
                    <input type="file" accept="image/*" onChange={handleOwnerPhoto} className="hidden" />
                  </label>
                )}
              </div>
              <input
                type="text"
                placeholder="মালিকের নাম"
                value={form.owner.name}
                onChange={(e) => setForm({ ...form, owner: { ...form.owner, name: e.target.value } })}
                className="w-full border rounded p-2 text-xs"
              />
              <input
                type="text"
                placeholder="ফোন নম্বর"
                value={form.owner.phone}
                onChange={(e) => setForm({ ...form, owner: { ...form.owner, phone: e.target.value } })}
                className="w-full border rounded p-2 text-xs"
              />
              <input
                type="text"
                placeholder="ঠিকানা"
                value={form.owner.address}
                onChange={(e) => setForm({ ...form, owner: { ...form.owner, address: e.target.value } })}
                className="w-full border rounded p-2 text-xs"
              />
            </div>

            {/* Manager */}
            <div className="p-4 border rounded-xl bg-slate-50/50 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-teal-800 uppercase">পরিচালক / ম্যানেজার</span>
                {!isReadOnly && (
                  <label className="cursor-pointer text-[11px] text-teal-700 font-bold hover:underline">
                    ছবি আপলোড
                    <input type="file" accept="image/*" onChange={handleManagerPhoto} className="hidden" />
                  </label>
                )}
              </div>
              <input
                type="text"
                placeholder="ম্যানেজারের নাম"
                value={form.manager.name}
                onChange={(e) => setForm({ ...form, manager: { ...form.manager, name: e.target.value } })}
                className="w-full border rounded p-2 text-xs"
              />
              <input
                type="text"
                placeholder="ফোন নম্বর"
                value={form.manager.phone}
                onChange={(e) => setForm({ ...form, manager: { ...form.manager, phone: e.target.value } })}
                className="w-full border rounded p-2 text-xs"
              />
              <input
                type="text"
                placeholder="ঠিকানা"
                value={form.manager.address}
                onChange={(e) => setForm({ ...form, manager: { ...form.manager, address: e.target.value } })}
                className="w-full border rounded p-2 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Theme & Bangla Font */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-base text-slate-900 flex items-center space-x-2 border-b pb-2">
            <Palette className="w-5 h-5 text-emerald-700" />
            <span>{t.themeAndAppearance}</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">কালার থিম</label>
              <select
                value={form.theme}
                onChange={(e) => setForm({ ...form, theme: e.target.value as Theme })}
                className="w-full border rounded-lg p-2 text-xs font-bold"
              >
                <option value="green">পান্না সবুজ (Emerald Green)</option>
                <option value="blue">মহাসাগর নীল (Ocean Blue)</option>
                <option value="maroon">রক্তিম মেরুন (Maroon)</option>
                <option value="slate">আধুনিক ধূসর (Slate)</option>
                <option value="dark">ডার্ক মোড (Dark Mode)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t.banglaFont}</label>
              <select
                value={form.font}
                onChange={(e) => setForm({ ...form, font: e.target.value as BanglaFont })}
                className="w-full border rounded-lg p-2 text-xs font-bold"
              >
                <option value="Hind Siliguri">হিন্দ শিলিগুড়ি (Hind Siliguri)</option>
                <option value="Noto Sans Bengali">নোটো সান্স বেঙ্গলি (Noto Sans)</option>
                <option value="Tiro Bangla">তিরো বাংলা (Tiro Bangla)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ডিফল্ট ভাষা</label>
              <select
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value as Language })}
                className="w-full border rounded-lg p-2 text-xs font-bold"
              >
                <option value="bn">বাংলা (Bengali)</option>
                <option value="en">English</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">সংখ্যা প্রদর্শন পদ্ধতি</label>
              <select
                value={form.numberFormat || 'bn'}
                onChange={(e) => setForm({ ...form, numberFormat: e.target.value as 'bn' | 'en' })}
                className="w-full border rounded-lg p-2 text-xs font-bold bg-amber-50/70 border-amber-300 text-slate-900"
              >
                <option value="bn">সহজ বাংলা সংখ্যা (০, ১, ২, ৩...)</option>
                <option value="en">ইংরেজি সংখ্যা (0, 1, 2, 3...)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Printing & Accounting Parameters */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-base text-slate-900 flex items-center space-x-2 border-b pb-2">
            <Shield className="w-5 h-5 text-emerald-700" />
            <span>ব্যবসায়িক ও হিসাবরক্ষণ প্যারামিটার</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">প্রতি রিমে শিট সংখ্যা</label>
              <input
                type="number"
                value={form.sheetsPerReam}
                onChange={(e) => setForm({ ...form, sheetsPerReam: parseInt(e.target.value, 10) || 500 })}
                className="w-full border rounded p-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ওভারটাইম হার (%)</label>
              <input
                type="number"
                value={form.defaultOtRatePercent}
                disabled
                className="w-full border rounded p-2 text-xs bg-slate-100 text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">মাসিক স্বাভাবিক কর্মঘণ্টা (H)</label>
              <input
                type="number"
                value={form.standardMonthlyWorkHours}
                onChange={(e) => setForm({ ...form, standardMonthlyWorkHours: parseInt(e.target.value, 10) || 208 })}
                className="w-full border rounded p-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">অ্যাডমিন পিন (PIN)</label>
              <input
                type="password"
                value={form.adminPin}
                onChange={(e) => setForm({ ...form, adminPin: e.target.value })}
                className="w-full border rounded p-2 text-xs font-mono font-bold"
              />
            </div>
          </div>
        </div>

        </fieldset>

        {/* Save button */}
        {!isReadOnly && (
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs transition"
            >
              <Save className="w-4 h-4" />
              <span>সেটিংস পরিবর্তন সংরক্ষণ করুন</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
