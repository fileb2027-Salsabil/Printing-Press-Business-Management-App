import React from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { formatCurrency, toBanglaDigits } from '../../utils/calculations';
import { translations } from '../../utils/i18n';
import {
  TrendingUp,
  TrendingDown,
  CreditCard,
  Printer,
  Users,
  Scissors,
  Boxes,
  PlusCircle,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  FileText,
  BadgeDollarSign,
} from 'lucide-react';
import { PhoneLink } from '../common/PhoneLink';

interface DashboardProps {
  onNavigate: (tab: string) => void;
  onOpenQuickModal?: (type: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { db } = useDatabase();
  const lang = db.settings.language;
  const t = translations[lang];

  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.substring(0, 7); // YYYY-MM

  // Today's calculations
  const todayProductions = db.productions.filter((p) => p.date === today);
  const todayProductionReams = todayProductions.reduce((sum, p) => sum + (p.reams || 0), 0);
  const todayProductionForma = todayProductions.reduce((sum, p) => sum + (p.forma || 0), 0);

  const todayCollections = db.collections.filter((c) => c.date === today);
  const todayTotalCollection = todayCollections.reduce((sum, c) => sum + c.amount, 0);

  const todayTransactions = db.transactions.filter((tx) => tx.date === today);
  const todayIncome = todayTransactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const todayExpense = todayTransactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const todayCuttingRecords = db.cuttingRecords.filter((c) => c.date === today);
  const todayCuttingCost = todayCuttingRecords.reduce((sum, c) => sum + c.totalCost, 0);

  const todayPuttiSales = db.puttiSales.filter((p) => p.date === today);
  const todayPuttiKg = todayPuttiSales.reduce((sum, p) => sum + p.quantityKg, 0);
  const todayPuttiTk = todayPuttiSales.reduce((sum, p) => sum + p.grossSale, 0);

  // Today's attendance
  const activeEmployees = db.employees.filter((e) => e.isActive);
  const todayAttendance = db.attendance.filter((a) => a.date === today);
  const presentEmployeesCount = todayAttendance.filter((a) => a.status === 'present').length;
  const absentEmployeesCount = todayAttendance.filter((a) => a.status === 'absent').length;

  // Monthly summary
  const monthTransactions = db.transactions.filter((tx) => tx.date.startsWith(currentMonth));
  const monthlyIncome = monthTransactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const monthlyExpense = monthTransactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const monthlyNet = monthlyIncome - monthlyExpense;

  // Customer total outstanding dues
  const totalCustomerDue = db.parties.reduce((sum, party) => {
    const openingDue = party.openingDue || 0;
    const invTotal = db.invoices
      .filter((inv) => inv.partyId === party.id)
      .reduce((s, inv) => s + inv.grandTotal, 0);
    const colTotal = db.collections
      .filter((col) => col.partyId === party.id)
      .reduce((s, col) => s + col.amount, 0);
    return sum + (openingDue + invTotal - colTotal);
  }, 0);

  // Employee total advance balance (accounting for partial deductions and carry-forward)
  const totalAdvancesGiven = (db.advances || []).reduce((sum, a) => sum + (a.amount || 0), 0);
  const totalAdvancesDeducted = (db.payrolls || [])
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + (p.advanceDeduction || 0), 0);
  const totalEmployeeAdvance = Math.max(0, totalAdvancesGiven - totalAdvancesDeducted);

  return (
    <div className="space-y-6">
      {/* Top Banner / Owner & Manager Profiles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Business Identity */}
        <div className="bg-gradient-to-br from-emerald-800 to-teal-900 rounded-2xl p-6 text-white shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              {db.settings.logoUrl ? (
                <img
                  src={db.settings.logoUrl}
                  alt={db.settings.name}
                  className="w-14 h-14 rounded-xl object-contain bg-white p-1"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center font-bold text-2xl text-white">
                  ম
                </div>
              )}
              <div>
                <h2 className="text-xl font-black">{db.settings.name}</h2>
                <p className="text-xs text-emerald-200">{db.settings.address}</p>
                <div className="mt-1">
                  <PhoneLink phone={db.settings.phone} className="text-xs" />
                </div>
              </div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-emerald-200">হিসাব শুরু:</span>
                <span className="font-semibold">{db.settings.openingDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-200">প্রারম্ভিক উদ্বৃত্ত:</span>
                <span className="font-semibold">{formatCurrency(db.settings.openingBalance, lang)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center text-xs text-emerald-200">
            <span>আজকের তারিখ: {today}</span>
            <span className="bg-emerald-700/80 px-2 py-0.5 rounded text-[10px] font-bold">
              সক্রিয় ব্যবসা
            </span>
          </div>
        </div>

        {/* Owner Profile Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-start space-x-4">
            {db.settings.owner.photoUrl ? (
              <img
                src={db.settings.owner.photoUrl}
                alt="Owner"
                className="w-16 h-16 rounded-2xl object-cover border border-emerald-200 shadow-xs"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xl">
                মালিক
              </div>
            )}
            <div className="flex-1">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded">
                স্বত্বাধিকারী / মালিক
              </span>
              <h3 className="font-bold text-base text-slate-900 mt-1">
                {db.settings.owner.name}
              </h3>
              <div className="text-xs text-slate-600 space-y-1 mt-2">
                <PhoneLink phone={db.settings.owner.phone} showWhatsApp={true} />
                <p className="flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{db.settings.owner.address}</span>
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('settings')}
            className="mt-3 text-xs text-emerald-700 font-semibold hover:underline text-right"
          >
            প্রোফাইল পরিবর্তন করুন →
          </button>
        </div>

        {/* Manager Profile Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-start space-x-4">
            {db.settings.manager.photoUrl ? (
              <img
                src={db.settings.manager.photoUrl}
                alt="Manager"
                className="w-16 h-16 rounded-2xl object-cover border border-teal-200 shadow-xs"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xl">
                ম্যানেজার
              </div>
            )}
            <div className="flex-1">
              <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider bg-teal-50 px-2 py-0.5 rounded">
                পরিচালক / ম্যানেজার
              </span>
              <h3 className="font-bold text-base text-slate-900 mt-1">
                {db.settings.manager.name}
              </h3>
              <div className="text-xs text-slate-600 space-y-1 mt-2">
                <PhoneLink phone={db.settings.manager.phone} showWhatsApp={true} />
                <p className="flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{db.settings.manager.address}</span>
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('settings')}
            className="mt-3 text-xs text-teal-700 font-semibold hover:underline text-right"
          >
            প্রোফাইল পরিবর্তন করুন →
          </button>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          {t.quickActions}
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          <button
            onClick={() => onNavigate('production')}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 transition text-xs font-semibold text-center"
          >
            <Printer className="w-5 h-5 mb-1.5 text-emerald-600" />
            <span>নতুন প্রডাকশন</span>
          </button>

          <button
            onClick={() => onNavigate('collections')}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-800 border border-slate-200 hover:border-blue-300 transition text-xs font-semibold text-center"
          >
            <CreditCard className="w-5 h-5 mb-1.5 text-blue-600" />
            <span>কালেকশন রসিদ</span>
          </button>

          <button
            onClick={() => onNavigate('billing')}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-800 border border-slate-200 hover:border-indigo-300 transition text-xs font-semibold text-center"
          >
            <FileText className="w-5 h-5 mb-1.5 text-indigo-600" />
            <span>নতুন বিল তৈরি</span>
          </button>

          <button
            onClick={() => onNavigate('income-expense')}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-800 border border-slate-200 hover:border-rose-300 transition text-xs font-semibold text-center"
          >
            <TrendingDown className="w-5 h-5 mb-1.5 text-rose-600" />
            <span>নতুন ব্যয় এন্ট্রি</span>
          </button>

          <button
            onClick={() => onNavigate('attendance')}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 hover:border-amber-300 transition text-xs font-semibold text-center"
          >
            <Calendar className="w-5 h-5 mb-1.5 text-amber-600" />
            <span>দৈনিক হাজিরা</span>
          </button>

          <button
            onClick={() => onNavigate('cutting')}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-purple-800 border border-slate-200 hover:border-purple-300 transition text-xs font-semibold text-center"
          >
            <Scissors className="w-5 h-5 mb-1.5 text-purple-600" />
            <span>কাগজ কাটিং</span>
          </button>

          <button
            onClick={() => onNavigate('putti')}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 hover:border-teal-300 transition text-xs font-semibold text-center"
          >
            <Boxes className="w-5 h-5 mb-1.5 text-teal-600" />
            <span>পট্টি বিক্রি</span>
          </button>
        </div>
      </div>

      {/* Today's Key Metrics Grid */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center space-x-2">
          <span>আজকের ব্যবসার সারসংক্ষেপ ({today})</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Today Production */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold">{t.todayProduction}</span>
              <Printer className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-lg font-black text-slate-900">
              {lang === 'bn' ? toBanglaDigits(todayProductionReams) : todayProductionReams} রিম
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {lang === 'bn' ? toBanglaDigits(todayProductionForma) : todayProductionForma} ফর্মা ছাপা
            </p>
          </div>

          {/* Today Collections */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold">{t.todayCollection}</span>
              <CreditCard className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-lg font-black text-blue-700">
              {formatCurrency(todayTotalCollection, lang)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {todayCollections.length} টি জমা রসিদ
            </p>
          </div>

          {/* Today Cutting Cost */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold">{t.todayCuttingCost}</span>
              <Scissors className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-lg font-black text-purple-700">
              {formatCurrency(todayCuttingCost, lang)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {todayCuttingRecords.length} টি কাটিং এন্ট্রি
            </p>
          </div>

          {/* Today Putti Sales */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold">{t.todayPuttiSale}</span>
              <Boxes className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-lg font-black text-teal-700">
              {formatCurrency(todayPuttiTk, lang)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {lang === 'bn' ? toBanglaDigits(todayPuttiKg) : todayPuttiKg} কেজি পট্টি
            </p>
          </div>

          {/* Today Attendance */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold">{t.todayAttendance}</span>
              <Users className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-lg font-black text-slate-900">
              <span className="text-emerald-600">{presentEmployeesCount}</span> /{' '}
              <span className="text-slate-400">{activeEmployees.length}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              অনুপস্থিত: <span className="text-rose-600 font-bold">{absentEmployeesCount}</span> জন
            </p>
          </div>

          {/* Today Cash Income / Expense */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold">আজকের ব্যয়</span>
              <TrendingDown className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-lg font-black text-rose-600">
              {formatCurrency(todayExpense, lang)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              আজকের আয়: {formatCurrency(todayIncome, lang)}
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Financial Health & Outstanding Balances */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Monthly Net Result */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h4 className="font-bold text-sm text-slate-800">চলতি মাসের আর্থিক সারসংক্ষেপ</h4>
              <p className="text-xs text-slate-500">মাস: {currentMonth}</p>
            </div>
            <div className={`p-2 rounded-lg ${monthlyNet >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {monthlyNet >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span>{t.monthlyIncome}:</span>
              <span className="font-bold text-emerald-600">{formatCurrency(monthlyIncome, lang)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>{t.monthlyExpense}:</span>
              <span className="font-bold text-rose-600">{formatCurrency(monthlyExpense, lang)}</span>
            </div>
            <div className="pt-2 border-t flex justify-between items-center text-sm font-black">
              <span>{t.monthlyNetProfit}:</span>
              <span className={monthlyNet >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                {formatCurrency(monthlyNet, lang)}
              </span>
            </div>
          </div>
        </div>

        {/* Customer Total Receivables */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h4 className="font-bold text-sm text-slate-800">{t.totalCustomerDue}</h4>
              <p className="text-xs text-slate-500">{db.parties.length} জন কাস্টমার/পার্টি</p>
            </div>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <BadgeDollarSign className="w-5 h-5" />
            </div>
          </div>

          <div>
            <div className="text-2xl font-black text-amber-600">
              {formatCurrency(totalCustomerDue, lang)}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              সব কাস্টমারের প্রারম্ভিক বকেয়া ও ইনভয়েস হতে মোট প্রাপ্য টাকা।
            </p>
          </div>

          <button
            onClick={() => onNavigate('parties')}
            className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold transition text-center"
          >
            পার্টি খাতা দেখুন →
          </button>
        </div>

        {/* Employee Total Advances */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h4 className="font-bold text-sm text-slate-800">{t.totalEmployeeAdvance}</h4>
              <p className="text-xs text-slate-500">{activeEmployees.length} জন সক্রিয় কর্মচারী</p>
            </div>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-700">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div>
            <div className="text-2xl font-black text-purple-600">
              {formatCurrency(totalEmployeeAdvance, lang)}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              কর্মচারীদের বিতরণকৃত অবশিষ্ট অগ্রিম টাকা (যা বেতন হতে কর্তনযোগ্য)।
            </p>
          </div>

          <button
            onClick={() => onNavigate('payroll')}
            className="w-full py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg text-xs font-bold transition text-center"
          >
            অগ্রিম ও বেতন শিট →
          </button>
        </div>
      </div>
    </div>
  );
};
