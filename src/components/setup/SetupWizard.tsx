import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { CompanySettings, BanglaFont, Theme, Language } from '../../types';
import { validateAndProcessImage } from '../../utils/imageUpload';
import { Building2, User, Shield, Palette, CheckCircle2, Upload, Trash2, ArrowRight } from 'lucide-react';
import { SmartNumberInput } from '../common/SmartNumberInput';

export const SetupWizard: React.FC = () => {
  const { db, updateSettings } = useDatabase();
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<CompanySettings>({
    ...db.settings,
    isConfigured: true,
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await validateAndProcessImage(file);
      setForm((prev) => ({ ...prev, logoUrl: res.dataUrl }));
    } catch (err: any) {
      setError(err.message || 'লোগো আপলোড ব্যর্থ হয়েছে');
    }
  };

  const handleOwnerPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await validateAndProcessImage(file);
      setForm((prev) => ({
        ...prev,
        owner: { ...prev.owner, photoUrl: res.dataUrl },
      }));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleManagerPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await validateAndProcessImage(file);
      setForm((prev) => ({
        ...prev,
        manager: { ...prev.manager, photoUrl: res.dataUrl },
      }));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSave = () => {
    setLoading(true);
    try {
      updateSettings({
        ...form,
        isConfigured: true,
      });
    } catch (e: any) {
      setError(e.message || 'সেটিংস সংরক্ষণ ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickStart = () => {
    updateSettings({
      isConfigured: true,
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 p-6 text-white text-center relative">
          <div className="inline-flex items-center justify-center p-3 bg-white/10 rounded-full mb-3">
            <Building2 className="w-8 h-8 text-emerald-300" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {form.name ? `${form.name} — ` : ''}Press Management — প্রেস ম্যানেজমেন্ট
          </h1>
          <p className="text-emerald-200 text-sm mt-1">
            Designed by MD. Salsabil • প্রাথমিক সেটআপ উইজার্ড
          </p>

          <button
            onClick={handleQuickStart}
            className="absolute top-6 right-6 text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg font-medium transition"
          >
            ডিফল্ট সেটিংস দিয়ে শুরু করুন ⚡
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            onClick={() => setStep(1)}
            className={`flex-1 py-3 text-xs md:text-sm font-semibold flex items-center justify-center space-x-2 border-b-2 transition ${
              step === 1 ? 'border-emerald-600 text-emerald-700 bg-white' : 'border-transparent text-slate-500'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>১. প্রতিষ্ঠান ও লোগো</span>
          </button>
          <button
            onClick={() => setStep(2)}
            className={`flex-1 py-3 text-xs md:text-sm font-semibold flex items-center justify-center space-x-2 border-b-2 transition ${
              step === 2 ? 'border-emerald-600 text-emerald-700 bg-white' : 'border-transparent text-slate-500'
            }`}
          >
            <User className="w-4 h-4" />
            <span>২. মালিক ও পরিচালক</span>
          </button>
          <button
            onClick={() => setStep(3)}
            className={`flex-1 py-3 text-xs md:text-sm font-semibold flex items-center justify-center space-x-2 border-b-2 transition ${
              step === 3 ? 'border-emerald-600 text-emerald-700 bg-white' : 'border-transparent text-slate-500'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>৩. থিম ও হিসাব নীতি</span>
          </button>
          <button
            onClick={() => setStep(4)}
            className={`flex-1 py-3 text-xs md:text-sm font-semibold flex items-center justify-center space-x-2 border-b-2 transition ${
              step === 4 ? 'border-emerald-600 text-emerald-700 bg-white' : 'border-transparent text-slate-500'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>৪. নিরাপত্তা ও সমাপ্তি</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 border-l-4 border-rose-500 p-4 m-6 text-rose-700 text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-xs font-bold">✕</button>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 md:p-8 space-y-6 max-h-[65vh] overflow-y-auto">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-800 border-b pb-2">প্রতিষ্ঠানের প্রাথমিক বিবরণ</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">প্রতিষ্ঠানের নাম (বাংলা)</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="মক্কা প্রিন্টার্স"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name (English)</label>
                  <input
                    type="text"
                    value={form.nameEn}
                    onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Makkah Printers"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">প্রতিষ্ঠানের ঠিকানা</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="৩৭/১ বাংলাবাজার (দোতলা), ঢাকা-১১০০"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ফোন নম্বর</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ইমেইল</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Logo Upload */}
              <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {form.logoUrl ? (
                    <img src={form.logoUrl} alt="Logo" className="w-16 h-16 object-contain rounded-lg border bg-white" />
                  ) : (
                    <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center text-slate-400 font-bold">
                      লোগো
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">প্রতিষ্ঠানের লোগো আপলোড</h4>
                    <p className="text-xs text-slate-500">JPG, PNG বা WebP ফরম্যাট (সর্বোচ্চ ৩MB)</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <label className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center space-x-1">
                    <Upload className="w-3.5 h-3.5" />
                    <span>ছবি বাছুন</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                  {form.logoUrl && (
                    <button
                      onClick={() => setForm({ ...form, logoUrl: '' })}
                      className="text-rose-600 hover:bg-rose-50 p-2 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-800 border-b pb-2">মালিক ও পরিচালকের তথ্য</h2>
              
              {/* Owner */}
              <div className="p-4 border rounded-xl bg-slate-50/50 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-emerald-800">মালিকের প্রোফাইল</h3>
                  <label className="cursor-pointer text-xs text-emerald-700 font-semibold hover:underline flex items-center space-x-1">
                    <Upload className="w-3 h-3" />
                    <span>ছবি আপলোড</span>
                    <input type="file" accept="image/*" onChange={handleOwnerPhoto} className="hidden" />
                  </label>
                </div>

                <div className="flex items-center space-x-3 mb-2">
                  {form.owner.photoUrl ? (
                    <img src={form.owner.photoUrl} alt="Owner" className="w-12 h-12 rounded-full object-cover border" />
                  ) : (
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center font-bold">
                      মা
                    </div>
                  )}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="মালিকের নাম"
                      value={form.owner.name}
                      onChange={(e) => setForm({ ...form, owner: { ...form.owner, name: e.target.value } })}
                      className="border rounded p-2 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="ফোন নম্বর"
                      value={form.owner.phone}
                      onChange={(e) => setForm({ ...form, owner: { ...form.owner, phone: e.target.value } })}
                      className="border rounded p-2 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="ঠিকানা"
                      value={form.owner.address}
                      onChange={(e) => setForm({ ...form, owner: { ...form.owner, address: e.target.value } })}
                      className="border rounded p-2 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Manager */}
              <div className="p-4 border rounded-xl bg-slate-50/50 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-teal-800">পরিচালক / ম্যানেজারের প্রোফাইল</h3>
                  <label className="cursor-pointer text-xs text-teal-700 font-semibold hover:underline flex items-center space-x-1">
                    <Upload className="w-3 h-3" />
                    <span>ছবি আপলোড</span>
                    <input type="file" accept="image/*" onChange={handleManagerPhoto} className="hidden" />
                  </label>
                </div>

                <div className="flex items-center space-x-3 mb-2">
                  {form.manager.photoUrl ? (
                    <img src={form.manager.photoUrl} alt="Manager" className="w-12 h-12 rounded-full object-cover border" />
                  ) : (
                    <div className="w-12 h-12 bg-teal-100 text-teal-800 rounded-full flex items-center justify-center font-bold">
                      ম্যা
                    </div>
                  )}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="ম্যানেজারের নাম"
                      value={form.manager.name}
                      onChange={(e) => setForm({ ...form, manager: { ...form.manager, name: e.target.value } })}
                      className="border rounded p-2 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="ফোন নম্বর"
                      value={form.manager.phone}
                      onChange={(e) => setForm({ ...form, manager: { ...form.manager, phone: e.target.value } })}
                      className="border rounded p-2 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="ঠিকানা"
                      value={form.manager.address}
                      onChange={(e) => setForm({ ...form, manager: { ...form.manager, address: e.target.value } })}
                      className="border rounded p-2 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-800 border-b pb-2">হিসাব নীতি ও থিম কাস্টমাইজেশন</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">প্রাথমিক হিসাব শুরুর তারিখ</label>
                  <input
                    type="date"
                    value={form.openingDate}
                    onChange={(e) => setForm({ ...form, openingDate: e.target.value })}
                    className="w-full border rounded-lg p-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">প্রাথমিক নগদ / ব্যাংক ব্যালেন্স (৳)</label>
                  <SmartNumberInput
                    allowNegative
                    value={form.openingBalance}
                    onValueChange={(v) => setForm({ ...form, openingBalance: v })}
                    className="w-full border rounded-lg p-2.5 text-sm"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">এটি Opening Balance হিসেবে গণ্য হবে, কালেকশনের সাথে মিলবে না।</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ডিফল্ট ভাষা</label>
                  <select
                    value={form.language}
                    onChange={(e) => setForm({ ...form, language: e.target.value as Language })}
                    className="w-full border rounded-lg p-2.5 text-sm"
                  >
                    <option value="bn">বাংলা (Bengali)</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">বাংলা ফন্ট</label>
                  <select
                    value={form.font}
                    onChange={(e) => setForm({ ...form, font: e.target.value as BanglaFont })}
                    className="w-full border rounded-lg p-2.5 text-sm"
                  >
                    <option value="Hind Siliguri">হিন্দ শিলিগুড়ি (Hind Siliguri)</option>
                    <option value="Noto Sans Bengali">নোটো সান্স বেঙ্গলি (Noto Sans)</option>
                    <option value="Tiro Bangla">তিরো বাংলা (Tiro Bangla)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">পছন্দের কালার থিম</label>
                  <select
                    value={form.theme}
                    onChange={(e) => setForm({ ...form, theme: e.target.value as Theme })}
                    className="w-full border rounded-lg p-2.5 text-sm"
                  >
                    <option value="green">পান্না সবুজ (Emerald Green)</option>
                    <option value="blue">মহাসাগর নীল (Ocean Blue)</option>
                    <option value="maroon">রক্তিম মেরুন (Maroon)</option>
                    <option value="slate">আধুনিক ধূসর (Slate)</option>
                    <option value="dark">ডার্ক মোড (Dark Mode)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">প্রতি রিমে শিট সংখ্যা</label>
                  <SmartNumberInput
                    integer
                    min={1}
                    fallbackOnBlur={500}
                    value={form.sheetsPerReam}
                    onValueChange={(v) => setForm({ ...form, sheetsPerReam: Math.max(1, v) })}
                    className="w-full border rounded p-2 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ওভারটাইম হার (%)</label>
                  <SmartNumberInput
                    integer
                    value={form.defaultOtRatePercent}
                    disabled
                    className="w-full border rounded p-2 text-sm bg-slate-100 text-slate-500 cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-500">ব্যবসার নির্ধারিত ৭০% বাধ্যতামূলক</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">মাসিক স্বাভাবিক কর্মঘণ্টা (H)</label>
                  <SmartNumberInput
                    integer
                    min={1}
                    fallbackOnBlur={208}
                    value={form.standardMonthlyWorkHours}
                    onValueChange={(v) => setForm({ ...form, standardMonthlyWorkHours: Math.max(1, v) })}
                    className="w-full border rounded p-2 text-sm bg-white"
                  />
                  <span className="text-[10px] text-slate-500">ডিফল্ট ২০৮ ঘণ্টা (২৬ দিন × ৮ ঘণ্টা)</span>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-800 border-b pb-2">অ্যাডমিন নিরাপত্তা ও সমাপ্তি</h2>
              
              <div className="max-w-md mx-auto p-4 border rounded-xl bg-slate-50 space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  অ্যাডমিন পিন / পাসওয়ার্ড (Security PIN)
                </label>
                <input
                  type="password"
                  value={form.adminPin}
                  onChange={(e) => setForm({ ...form, adminPin: e.target.value })}
                  placeholder="যেমন: 1234"
                  className="w-full border rounded-lg p-2.5 text-center text-lg tracking-widest font-mono focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-slate-500 text-center">
                  ডেটাবেজ রিসেট ও গুরুত্বপূর্ণ আর্থিক পরিবর্তনের সময় এই পিন প্রয়োজন হবে। (ডিফল্ট: 1234)
                </p>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-800">
                  <p className="font-bold mb-1">প্রস্তুত! কোনো ডেমো বা ভুয়া ডেটা সংরক্ষণ করা হবে না</p>
                  <p>
                    সেটআপ সম্পন্ন করার পর একটি সম্পূর্ণ নতুন ও পরিষ্কার খাতা তৈরি হবে। আপনি নিজের প্রয়োজন অনুযায়ী
                    কাস্টমার, বই, প্রডাকশন এবং কর্মচারী এন্ট্রি শুরু করতে পারবেন।
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="bg-slate-100 p-4 border-t border-slate-200 flex justify-between items-center">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-200"
            >
              পূর্ববর্তী ধাপ
            </button>
          ) : (
            <div></div>
          )}

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center space-x-2"
            >
              <span>পরবর্তী ধাপ</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-bold flex items-center space-x-2 shadow-lg shadow-emerald-700/30"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'সংরক্ষণ হচ্ছে...' : 'সেটআপ সম্পন্ন করুন ও শুরু করুন'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
