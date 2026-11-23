import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { PayrollRecord, EmployeeAdvance } from '../../types';
import { formatCurrency, formatDate, getDaysInMonth, sortEmployeesByDesignation, getMonthNameBengali } from '../../utils/calculations';
import { translations } from '../../utils/i18n';
import { PrintHeader, PrintSignatures, PrintAmountInWords, triggerPrint } from '../common/PrintHeader';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  Banknote,
  Plus,
  Printer,
  Calendar,
  CheckCircle,
  Eye,
  ArrowLeft,
  CheckCircle2,
  Edit2,
  Trash2,
  Search,
  Filter,
  Users,
  AlertCircle,
  History,
} from 'lucide-react';

export const PayrollManager: React.FC = () => {
  const {
    db,
    generatePayrollForMonth,
    updatePayroll,
    deletePayroll,
    addAdvance,
    updateAdvance,
    deleteAdvance,
    getEmployeeAdvanceBalance,
    isReadOnly,
  } = useDatabase();
  const lang = db.settings.language;
  const t = translations[lang];

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const [activeTab, setActiveTab] = useState<'payroll' | 'advances'>('payroll');

  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const monthString = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  const [selectedSlip, setSelectedSlip] = useState<PayrollRecord | null>(null);
  const [selectedAdvanceSlip, setSelectedAdvanceSlip] = useState<EmployeeAdvance | null>(null);

  // Advance modal & management states
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState<EmployeeAdvance | null>(null);
  const [advanceToDelete, setAdvanceToDelete] = useState<EmployeeAdvance | null>(null);
  const [advanceSearch, setAdvanceSearch] = useState('');
  const [advanceEmployeeFilter, setAdvanceEmployeeFilter] = useState('');
  const [advanceSuccessMessage, setAdvanceSuccessMessage] = useState<string | null>(null);
  const [advanceForm, setAdvanceForm] = useState({
    employeeId: '',
    amount: '' as number | '',
    date: today,
    paymentMethod: 'cash',
    notes: '',
  });
  const [advanceError, setAdvanceError] = useState('');

  // Payroll adjustment modal states
  const [isEditPayrollModalOpen, setIsEditPayrollModalOpen] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<PayrollRecord | null>(null);
  const [autoDeductAdvance, setAutoDeductAdvance] = useState(true);
  const [payrollForm, setPayrollForm] = useState({
    presentDays: 30,
    attendanceSalary: 0,
    attendanceBonus: 0,
    otPay: 0,
    otHours: 0,
    advanceDeduction: 0,
    shouldDeductAdvance: true,
    totalAdvanceAvailable: 0,
    remainingAdvance: 0,
    previousUnpaidSalaryDue: 0,
    includePreviousUnpaidSalary: false,
    previousUnpaidSalaryAdded: 0,
    otherEarnings: 0,
    otherDeductions: 0,
    notes: '',
  });

  const [payrollToDelete, setPayrollToDelete] = useState<PayrollRecord | null>(null);
  const [payrollToPay, setPayrollToPay] = useState<PayrollRecord | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    paidDate: today,
    paymentMethod: 'cash',
    notes: '',
  });

  const activeEmployees = sortEmployeesByDesignation(db.employees.filter((e) => e.isActive));
  const monthPayrolls = sortEmployeesByDesignation(db.payrolls.filter((p) => p.monthYear === monthString));
  const totalPayroll = monthPayrolls.reduce((s, p) => s + p.netPayable, 0);

  // Advances records
  const allAdvances = db.advances || [];
  const filteredAdvances = allAdvances.filter((adv) => {
    const matchEmp = advanceEmployeeFilter ? adv.employeeId === advanceEmployeeFilter : true;
    const matchSearch = advanceSearch
      ? adv.employeeName.toLowerCase().includes(advanceSearch.toLowerCase()) ||
        (adv.notes && adv.notes.toLowerCase().includes(advanceSearch.toLowerCase()))
      : true;
    return matchEmp && matchSearch;
  });

  const totalAdvancesGiven = allAdvances.reduce((sum, a) => sum + (a.amount || 0), 0);
  const totalAdvancesDeducted = db.payrolls
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + (p.advanceDeduction || 0), 0);
  const totalAdvancesOutstanding = Math.max(0, totalAdvancesGiven - totalAdvancesDeducted);

  // GENERATE PAYROLL
  const handleGeneratePayroll = () => {
    if (isReadOnly) return;
    generatePayrollForMonth(monthString, undefined, autoDeductAdvance);
  };

  const getDefaultPaymentDateForMonth = (monthYear: string): string => {
    const parts = monthYear.split('-');
    if (parts.length === 2) {
      let year = parseInt(parts[0], 10);
      let month = parseInt(parts[1], 10);
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
      return `${year}-${String(month).padStart(2, '0')}-10`;
    }
    return today;
  };

  // ADVANCE HANDLERS
  const handleOpenAdvanceModal = (adv?: EmployeeAdvance) => {
    if (isReadOnly) return;
    setAdvanceError('');
    setAdvanceSuccessMessage(null);
    if (adv) {
      setEditingAdvance(adv);
      setAdvanceForm({
        employeeId: adv.employeeId,
        amount: adv.amount,
        date: adv.date,
        paymentMethod: adv.paymentMethod || 'cash',
        notes: adv.notes || '',
      });
    } else {
      setEditingAdvance(null);
      const defaultEmp = activeEmployees[0];
      setAdvanceForm({
        employeeId: defaultEmp?.id || '',
        amount: '',
        date: today,
        paymentMethod: 'cash',
        notes: '',
      });
    }
    setIsAdvanceModalOpen(true);
  };

  const handleSaveAdvance = (e: React.FormEvent, stayOpen = false) => {
    e.preventDefault();
    if (isReadOnly) return;
    setAdvanceError('');
    setAdvanceSuccessMessage(null);
    const emp = db.employees.find((e) => e.id === advanceForm.employeeId);
    const amt = typeof advanceForm.amount === 'number' ? advanceForm.amount : parseFloat(advanceForm.amount);
    if (!emp || !amt || amt <= 0) {
      setAdvanceError('অনুগ্রহ করে সঠিক কর্মচারী ও টাকার পরিমাণ দিন');
      return;
    }

    if (editingAdvance) {
      updateAdvance(editingAdvance.id, {
        employeeId: emp.id,
        employeeName: emp.name,
        amount: Math.round(amt),
        date: advanceForm.date,
        paymentMethod: advanceForm.paymentMethod,
        notes: advanceForm.notes,
      });
      setIsAdvanceModalOpen(false);
      setEditingAdvance(null);
    } else {
      addAdvance({
        employeeId: emp.id,
        employeeName: emp.name,
        amount: Math.round(amt),
        date: advanceForm.date,
        paymentMethod: advanceForm.paymentMethod,
        notes: advanceForm.notes,
      });

      if (stayOpen) {
        setAdvanceSuccessMessage(`✓ "${emp.name}" এর জন্য ৳${Math.round(amt)} সফলভাবে অগ্রিম হিসেবে জমা হয়েছে। আপনি চাইলে আরও অগ্রিম এন্ট্রি করতে পারেন।`);
        // Reset amount and notes for next entry, keep employee or let user pick another
        setAdvanceForm((prev) => ({
          ...prev,
          amount: '',
          notes: '',
        }));
      } else {
        setIsAdvanceModalOpen(false);
      }
    }
  };

  const handleConfirmDeleteAdvance = () => {
    if (isReadOnly) {
      setAdvanceToDelete(null);
      return;
    }
    if (advanceToDelete) {
      deleteAdvance(advanceToDelete.id);
      setAdvanceToDelete(null);
    }
  };

  // PAYROLL ADJUSTMENT HANDLERS
  const handleOpenEditPayroll = (pr: PayrollRecord) => {
    if (isReadOnly) return;
    const avail =
      pr.totalAdvanceAvailable !== undefined
        ? pr.totalAdvanceAvailable
        : getEmployeeAdvanceBalance(pr.employeeId, pr.status === 'paid' ? undefined : pr.id, pr.monthYear);
    const shouldDeduct =
      pr.shouldDeductAdvance !== undefined
        ? pr.shouldDeductAdvance
        : (pr.advanceDeduction > 0 || avail > 0);
    const initialDeduction = Math.round(pr.advanceDeduction);
    const remaining = Math.max(0, Math.round(avail) - initialDeduction);

    // Compute previous unpaid salary due
    let prevDue = pr.previousUnpaidSalaryDue || 0;
    if (prevDue === 0) {
      const earlierUnpaid = db.payrolls
        .filter((p) => p.employeeId === pr.employeeId && p.status === 'draft' && p.monthYear < pr.monthYear)
        .reduce((sum, p) => sum + p.netPayable, 0);
      prevDue = Math.round(earlierUnpaid);
    }
    const includePrev = pr.includePreviousUnpaidSalary || false;
    const prevAdded = pr.previousUnpaidSalaryAdded !== undefined ? pr.previousUnpaidSalaryAdded : (includePrev ? prevDue : 0);

    setEditingPayroll(pr);
    setPayrollForm({
      presentDays: pr.presentDays,
      attendanceSalary: pr.attendanceSalary,
      attendanceBonus: pr.attendanceBonus,
      otPay: pr.otPay,
      otHours: pr.otHours,
      advanceDeduction: initialDeduction,
      shouldDeductAdvance: shouldDeduct,
      totalAdvanceAvailable: avail,
      remainingAdvance: remaining,
      previousUnpaidSalaryDue: prevDue,
      includePreviousUnpaidSalary: includePrev,
      previousUnpaidSalaryAdded: prevAdded,
      otherEarnings: pr.otherEarnings || 0,
      otherDeductions: pr.otherDeductions || 0,
      notes: pr.notes || '',
    });
    setIsEditPayrollModalOpen(true);
  };

  const handleSavePayrollAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!editingPayroll) return;

    // Intermediate components retain precision; Math.round is applied ONLY at final total addition
    const attendancePay = payrollForm.attendanceSalary + payrollForm.attendanceBonus;
    const regularEarnings = attendancePay + payrollForm.otPay + payrollForm.otherEarnings;
    const prevSalaryToAdd = payrollForm.includePreviousUnpaidSalary
      ? (payrollForm.previousUnpaidSalaryAdded || payrollForm.previousUnpaidSalaryDue)
      : 0;
    const totalEarnings = regularEarnings + prevSalaryToAdd;

    const finalDeduction = payrollForm.shouldDeductAdvance
      ? Math.min(payrollForm.totalAdvanceAvailable, payrollForm.advanceDeduction)
      : 0;
    const remainingAdvance = Math.max(0, payrollForm.totalAdvanceAvailable - finalDeduction);
    const totalDeductions = finalDeduction + payrollForm.otherDeductions;

    // The formula (Math.round: >= 0.5 to 1, <= 0.49 to 0) applied ONLY at the final total money:
    const netPayable = Math.max(0, Math.round(totalEarnings - totalDeductions));
    const totalEarnedSalary = Math.round(regularEarnings);

    updatePayroll(editingPayroll.id, {
      presentDays: payrollForm.presentDays,
      attendanceSalary: payrollForm.attendanceSalary,
      attendanceBonus: payrollForm.attendanceBonus,
      attendancePay,
      otPay: payrollForm.otPay,
      otHours: payrollForm.otHours,
      advanceDeduction: finalDeduction,
      shouldDeductAdvance: payrollForm.shouldDeductAdvance,
      totalAdvanceAvailable: payrollForm.totalAdvanceAvailable,
      remainingAdvance,
      previousUnpaidSalaryDue: payrollForm.previousUnpaidSalaryDue,
      includePreviousUnpaidSalary: payrollForm.includePreviousUnpaidSalary,
      previousUnpaidSalaryAdded: prevSalaryToAdd,
      totalEarnedSalary,
      otherEarnings: payrollForm.otherEarnings,
      otherDeductions: payrollForm.otherDeductions,
      netPayable,
      notes: payrollForm.notes,
    });

    setIsEditPayrollModalOpen(false);
    setEditingPayroll(null);
  };

  const handleConfirmDeletePayroll = () => {
    if (isReadOnly) {
      setPayrollToDelete(null);
      return;
    }
    if (payrollToDelete) {
      deletePayroll(payrollToDelete.id);
      setPayrollToDelete(null);
    }
  };

  const handlePaySalary = (record: PayrollRecord) => {
    if (isReadOnly) return;
    setPaymentForm({
      paidDate: getDefaultPaymentDateForMonth(record.monthYear),
      paymentMethod: 'cash',
      notes: '',
    });
    setPayrollToPay(record);
  };

  const handleConfirmPaySalary = () => {
    if (isReadOnly) {
      setPayrollToPay(null);
      return;
    }
    if (!payrollToPay) return;
    updatePayroll(payrollToPay.id, {
      status: 'paid',
      paidDate: paymentForm.paidDate || today,
      notes: paymentForm.notes
        ? `${payrollToPay.notes ? payrollToPay.notes + ' | ' : ''}${paymentForm.notes}`
        : payrollToPay.notes,
    });
    setPayrollToPay(null);
  };

  // Single Advance Slip view
  if (selectedAdvanceSlip) {
    const emp = db.employees.find((e) => e.id === selectedAdvanceSlip.employeeId);
    return (
      <div className="space-y-6">
        <div className="no-print flex items-center justify-between">
          <button
            onClick={() => setSelectedAdvanceSlip(null)}
            className="flex items-center space-x-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 px-3 py-2 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>অগ্রিম তালিকায় ফিরে যান</span>
          </button>

          <button
            onClick={() => triggerPrint()}
            className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>অগ্রিম ভাউচার প্রিন্ট করুন</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs max-w-2xl mx-auto print-container">
          <PrintHeader
            title="কর্মচারী বেতন অগ্রিম ভাউচার (SALARY ADVANCE VOUCHER)"
            documentNo={`ADV-${selectedAdvanceSlip.id.slice(-6).toUpperCase()}`}
            date={selectedAdvanceSlip.date}
          />

          <div className="my-6 border bg-purple-50/20 p-5 rounded-xl text-xs space-y-3">
            <div className="flex justify-between border-b pb-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">প্রাপক কর্মচারী</span>
                <h3 className="text-base font-bold text-slate-900">{selectedAdvanceSlip.employeeName}</h3>
                <p className="text-slate-500">{emp?.designation || 'কর্মচারী'}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400">অগ্রিম প্রদানের তারিখ</span>
                <p className="font-bold text-slate-800">{formatDate(selectedAdvanceSlip.date, lang)}</p>
                <span className="text-slate-500 uppercase">{selectedAdvanceSlip.paymentMethod}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-purple-200 flex justify-between items-center">
              <div>
                <span className="text-xs font-semibold text-slate-600">অগ্রিম প্রদত্ত টাকার পরিমাণ:</span>
                <p className="font-black text-2xl text-purple-900 mt-1">
                  {formatCurrency(selectedAdvanceSlip.amount, lang)}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    selectedAdvanceSlip.isDeducted
                      ? 'bg-slate-100 text-slate-700'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {selectedAdvanceSlip.isDeducted
                    ? `বেতন থেকে কর্তনকৃত (${selectedAdvanceSlip.deductedPayrollMonth})`
                    : 'অবশিষ্ট বকেয়া'}
                </span>
              </div>
            </div>

            <PrintAmountInWords amount={selectedAdvanceSlip.amount} />

            {selectedAdvanceSlip.notes && (
              <div className="pt-2 text-slate-700">
                <span className="font-semibold block text-[11px] text-slate-400">অগ্রিমের কারণ / বিবরণ:</span>
                <p className="bg-white p-2.5 rounded border text-xs">{selectedAdvanceSlip.notes}</p>
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

  // Single Pay Slip view
  if (selectedSlip) {
    const emp = db.employees.find((e) => e.id === selectedSlip.employeeId);
    return (
      <div className="space-y-6">
        <div className="no-print flex items-center justify-between">
          <button
            onClick={() => setSelectedSlip(null)}
            className="flex items-center space-x-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 px-3 py-2 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>বেতন তালিকায় ফিরে যান</span>
          </button>

          <button
            onClick={() => triggerPrint()}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>পে-স্লিপ প্রিন্ট করুন</span>
          </button>
        </div>

        {/* Printable Pay Slip */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs max-w-2xl mx-auto print-container">
          <PrintHeader
            title="মাসিক বেতন স্লিপ (SALARY PAY SLIP)"
            documentNo={`SLIP-${selectedSlip.monthYear}-${selectedSlip.employeeName.slice(0, 3)}`}
            date={selectedSlip.paidDate || today}
          />

          <div className="my-6 border bg-slate-50/50 p-4 rounded-xl text-xs space-y-3">
            <div className="flex justify-between border-b pb-2">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">কর্মচারীর বিবরণ</p>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">{selectedSlip.employeeName}</h3>
                <p className="text-slate-500">{selectedSlip.designation}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-slate-400">বেতনের মাস</p>
                <p className="text-sm font-bold text-emerald-800 mt-0.5">{getMonthNameBengali(selectedSlip.monthYear)}</p>
                <p className="text-[11px] font-mono text-slate-500">({selectedSlip.monthYear})</p>
                <p className="text-slate-500 text-[10px]">মাসের মোট দিন: {selectedSlip.daysInMonth} দিন</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5 border-r pr-4">
                <p className="font-bold text-slate-700 text-xs uppercase mb-2">আয় / প্রদেয় অংশ</p>
                <div className="flex justify-between">
                  <span>মূল বেতন:</span>
                  <span className="font-semibold">{formatCurrency(selectedSlip.basicSalary, lang)}</span>
                </div>
                <div className="flex justify-between">
                  <span>উপস্থিতি ({selectedSlip.presentDays} দিন):</span>
                  <span className="font-semibold">{formatCurrency(selectedSlip.attendanceSalary, lang)}</span>
                </div>
                {selectedSlip.attendanceBonus > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>হাজিরা বোনাস:</span>
                    <span className="font-bold">+{formatCurrency(selectedSlip.attendanceBonus, lang)}</span>
                  </div>
                )}
                {selectedSlip.otPay > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span>ওভারটাইম ({selectedSlip.otHours}h @ ৳{selectedSlip.hourlyOtRate}):</span>
                    <span className="font-bold">+{formatCurrency(selectedSlip.otPay, lang)}</span>
                  </div>
                )}
                {selectedSlip.otherEarnings > 0 && (
                  <div className="flex justify-between text-blue-700">
                    <span>অন্যান্য সুবিধা / ভাতা:</span>
                    <span className="font-bold">+{formatCurrency(selectedSlip.otherEarnings, lang)}</span>
                  </div>
                )}

                {/* Gross Earned Salary */}
                <div className="pt-2 border-t mt-2 flex justify-between font-bold text-slate-900 bg-slate-100 p-2 rounded-lg">
                  <span className="text-xs">মোট অর্জিত বেতন:</span>
                  <span className="text-emerald-800 font-black text-xs">
                    {formatCurrency(
                      selectedSlip.totalEarnedSalary !== undefined
                        ? selectedSlip.totalEarnedSalary
                        : Math.round(
                            selectedSlip.attendanceSalary +
                              (selectedSlip.attendanceBonus || 0) +
                              (selectedSlip.otPay || 0) +
                              (selectedSlip.otherEarnings || 0)
                          ),
                      lang
                    )}
                  </span>
                </div>

                {selectedSlip.previousUnpaidSalaryAdded && selectedSlip.previousUnpaidSalaryAdded > 0 ? (
                  <div className="flex justify-between text-blue-800 text-[11px] font-bold bg-blue-50/80 p-1.5 rounded border border-blue-200 mt-1">
                    <span>পূর্ববর্তী বকেয়া বেতন যোগ:</span>
                    <span>+{formatCurrency(selectedSlip.previousUnpaidSalaryAdded, lang)}</span>
                  </div>
                ) : null}
              </div>

              <div className="space-y-1.5 pl-2">
                <p className="font-bold text-slate-700 text-xs uppercase mb-2">কর্তনসমূহ</p>
                <div className="flex justify-between text-purple-700">
                  <span>অগ্রিম কর্তন:</span>
                  <span className="font-bold">
                    {selectedSlip.advanceDeduction > 0
                      ? `- ${formatCurrency(selectedSlip.advanceDeduction, lang)}`
                      : '০'}
                  </span>
                </div>
                {selectedSlip.otherDeductions > 0 && (
                  <div className="flex justify-between text-rose-700">
                    <span>অন্যান্য কর্তন:</span>
                    <span className="font-bold">
                      - {formatCurrency(selectedSlip.otherDeductions, lang)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Advance Status & Carryover Box */}
            {(() => {
              const slipAdvAvail =
                selectedSlip.totalAdvanceAvailable !== undefined
                  ? selectedSlip.totalAdvanceAvailable
                  : (selectedSlip.advanceDeduction || 0) +
                    (selectedSlip.remainingAdvance || 0) ||
                    getEmployeeAdvanceBalance(selectedSlip.employeeId, selectedSlip.status === 'paid' ? undefined : selectedSlip.id);
              const slipRemAdv =
                selectedSlip.remainingAdvance !== undefined
                  ? selectedSlip.remainingAdvance
                  : Math.max(0, slipAdvAvail - (selectedSlip.advanceDeduction || 0));

              if (slipAdvAvail <= 0 && (selectedSlip.advanceDeduction || 0) <= 0 && slipRemAdv <= 0) {
                return null;
              }

              return (
                <div className="bg-purple-50/80 border border-purple-200 p-3 rounded-xl text-xs space-y-1.5 mt-2">
                  <div className="flex items-center justify-between border-b border-purple-200/80 pb-1">
                    <span className="font-bold text-purple-950 flex items-center space-x-1.5">
                      <Banknote className="w-3.5 h-3.5 text-purple-700" />
                      <span>অগ্রিম হিসাব ও সমন্বয় বিবরণী:</span>
                    </span>
                    <span className="text-[10px] text-purple-800 font-semibold bg-purple-100 px-2 py-0.5 rounded-full">
                      {selectedSlip.advanceDeduction > 0 ? 'এই মাসে সমন্বয়কৃত' : 'অগ্রিম বহাল'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[10px]">মোট বকেয়া অগ্রিম:</span>
                      <span className="font-bold text-slate-800">{formatCurrency(slipAdvAvail, lang)}</span>
                    </div>
                    <div>
                      <span className="text-purple-700 block text-[10px]">এই মাসে বেতন থেকে কর্তন:</span>
                      <span className="font-bold text-purple-900">
                        {selectedSlip.advanceDeduction > 0
                          ? `- ${formatCurrency(selectedSlip.advanceDeduction, lang)}`
                          : '০ (কর্তন করা হয়নি)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-amber-800 block text-[10px]">অবশিষ্ট বকেয়া অগ্রিম:</span>
                      <span className="font-black text-amber-900">{formatCurrency(slipRemAdv, lang)}</span>
                    </div>
                  </div>
                  {slipRemAdv > 0 ? (
                    <p className="text-[10px] text-amber-800 font-semibold pt-0.5">
                      * অবশিষ্ট {formatCurrency(slipRemAdv, lang)} পরবর্তী মাসের অগ্রিম হিসেবে বহাল থাকবে।
                    </p>
                  ) : (
                    <p className="text-[10px] text-emerald-700 font-medium pt-0.5">
                      ✓ এই কর্মচারীর আর কোনো বকেয়া অগ্রিম অবশিষ্ট নেই।
                    </p>
                  )}
                </div>
              );
            })()}

            <div className="border-t pt-3 flex justify-between items-center text-sm bg-white p-3 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-900">সর্বমোট নিট প্রদেয় বেতন:</span>
              <span className="font-black text-base text-emerald-800">
                {formatCurrency(selectedSlip.netPayable, lang)}
              </span>
            </div>

            <PrintAmountInWords amount={selectedSlip.netPayable} />

            <div className="pt-2 flex justify-between items-center text-[11px] text-slate-500">
              <span>স্ট্যাটাস: <b className="text-slate-800">{selectedSlip.status === 'paid' ? 'পরিশোধিত' : 'খসড়া'}</b></span>
              {selectedSlip.paidDate && (
                <span>পরিশোধের তারিখ: <b>{formatDate(selectedSlip.paidDate, lang)}</b></span>
              )}
            </div>
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
          <h2 className="text-xl font-bold text-slate-900">{t.navPayroll}</h2>
          <p className="text-xs text-slate-500">
            মাসিক বেতন গণনা, হাজিরা বোনাস, ওভারটাইম, অগ্রিম কর্তন ও পরিশোধ ব্যবস্থাপনা
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {!isReadOnly && (
            <>
              <button
                onClick={() => handleOpenAdvanceModal()}
                className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition"
              >
                <Banknote className="w-4 h-4" />
                <span>অগ্রিম প্রদান করুন</span>
              </button>
              {activeTab === 'payroll' && (
                <button
                  onClick={handleGeneratePayroll}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{monthPayrolls.length > 0 ? 'বেতন শিট পুনর্গণনা' : 'চলতি মাসের বেতন প্রস্তুত করুন'}</span>
                </button>
              )}
            </>
          )}
          <button
            onClick={() => triggerPrint()}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>প্রিন্ট শিট</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="no-print flex space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('payroll')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'payroll'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>মাসিক বেতন শিট ({monthPayrolls.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('advances')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'advances'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Banknote className="w-4 h-4" />
          <span>সকল অগ্রিম খাতা ও ইতিহাস ({allAdvances.length})</span>
        </button>
      </div>

      {/* TAB 1: Monthly Payroll Sheet */}
      {activeTab === 'payroll' && (
        <div className="space-y-4">
          {/* Month Selector Bar */}
          <div className="no-print bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <span className="text-xs font-bold text-slate-700">বেতনের মাস:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                className="border rounded p-1.5 text-xs font-bold text-slate-800 bg-white"
              >
                {[
                  { val: 1, name: 'জানুয়ারি' },
                  { val: 2, name: 'ফেব্রুয়ারি' },
                  { val: 3, name: 'মার্চ' },
                  { val: 4, name: 'এপ্রিল' },
                  { val: 5, name: 'মে' },
                  { val: 6, name: 'জুন' },
                  { val: 7, name: 'জুলাই' },
                  { val: 8, name: 'আগস্ট' },
                  { val: 9, name: 'সেপ্টেম্বর' },
                  { val: 10, name: 'অক্টোবর' },
                  { val: 11, name: 'নভেম্বর' },
                  { val: 12, name: 'ডিসেম্বর' },
                ].map((m) => (
                  <option key={m.val} value={m.val}>
                    {m.name}
                  </option>
                ))}
              </select>

              <input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10) || 2026)}
                className="border rounded p-1.5 text-xs font-bold w-20 text-center bg-white"
              />
            </div>

            <div className="flex items-center space-x-3">
              {!isReadOnly && (
                <label className="flex items-center space-x-1.5 cursor-pointer text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg select-none">
                  <input
                    type="checkbox"
                    checked={autoDeductAdvance}
                    onChange={(e) => setAutoDeductAdvance(e.target.checked)}
                    className="w-3.5 h-3.5 text-emerald-700 rounded border-slate-300"
                  />
                  <span>বকেয়া অগ্রিম স্বয়ংক্রিয় কর্তন</span>
                </label>
              )}
              <div className="text-xs text-slate-500 font-semibold">
                মাসের দিন: <b className="text-slate-800">{getDaysInMonth(selectedYear, selectedMonth)} দিন</b> | 
                সক্রিয় কর্মী: <b className="text-slate-800">{activeEmployees.length} জন</b>
              </div>
            </div>
          </div>

          {/* Payroll Table */}
          <div className="print-area space-y-4">
            <div className="print-only">
              <PrintHeader
                title="মাসিক বেতন শিট (Monthly Payroll Sheet)"
                subtitle={`মাস: ${monthString} (${getDaysInMonth(selectedYear, selectedMonth)} দিন, OT বেস: ${getDaysInMonth(selectedYear, selectedMonth) * 5} ঘণ্টা) | মোট প্রদেয় বেতন: ${formatCurrency(totalPayroll, lang)}`}
              />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                    <tr>
                      <th className="p-3">কর্মচারীর নাম</th>
                      <th className="p-3">পদবি</th>
                      <th className="p-3 text-right">মূল বেতন</th>
                      <th className="p-3 text-center">উপস্থিতি (দিন)</th>
                      <th className="p-3 text-right">হাজিরা বেতন</th>
                      <th className="p-3 text-right">হাজিরা বোনাস</th>
                      <th className="p-3 text-right">OT টাকা</th>
                      <th className="p-3 text-right">অগ্রিম কর্তন</th>
                      <th className="p-3 text-right font-black">নিট প্রদেয়</th>
                      <th className="p-3 text-center">অবস্থা</th>
                      <th className="p-3 text-right no-print">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {monthPayrolls.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="p-8 text-center text-slate-500 space-y-3">
                          <p className="text-sm font-semibold">এই মাসের বেতন এখনও প্রস্তুত করা হয়নি।</p>
                          {!isReadOnly && (
                            <button
                              onClick={handleGeneratePayroll}
                              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 shadow-xs"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>{monthString} মাসের বেতন শিট প্রস্তুত করুন</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      monthPayrolls.map((pr) => (
                        <tr key={pr.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 font-bold text-slate-900">{pr.employeeName}</td>
                          <td className="p-3 text-slate-600">{pr.designation}</td>
                          <td className="p-3 text-right font-semibold">{formatCurrency(pr.basicSalary, lang)}</td>
                          <td className="p-3 text-center font-bold text-emerald-700">
                            {pr.presentDays} <span className="text-[10px] text-slate-400">/ {pr.daysInMonth}</span>
                          </td>
                          <td className="p-3 text-right">{formatCurrency(pr.attendanceSalary, lang)}</td>
                          <td className="p-3 text-right font-bold text-emerald-700">
                            {pr.attendanceBonus > 0 ? `+${formatCurrency(pr.attendanceBonus, lang)}` : '-'}
                          </td>
                          <td className="p-3 text-right text-amber-700 font-semibold">{formatCurrency(pr.otPay, lang)}</td>
                          <td className="p-3 text-right text-purple-700 font-bold">
                            {pr.advanceDeduction > 0 ? (
                              <div>
                                <span>- {formatCurrency(pr.advanceDeduction, lang)}</span>
                                {(pr.remainingAdvance || 0) > 0 && (
                                  <span
                                    className="block text-[10px] text-amber-700 bg-amber-50 px-1 rounded font-normal mt-0.5"
                                    title="বেতনের চেয়ে বেশি অগ্রিম বা আংশিক কর্তন"
                                  >
                                    অবশিষ্ট: {formatCurrency(pr.remainingAdvance || 0, lang)}
                                  </span>
                                )}
                              </div>
                            ) : (pr.totalAdvanceAvailable || 0) > 0 ? (
                              <div>
                                <span className="text-slate-400 font-normal">০</span>
                                <span
                                  className="block text-[10px] text-purple-700 bg-purple-50 px-1 rounded font-normal mt-0.5"
                                  title="অগ্রিম কর্তন স্থগিত রাখা হয়েছে"
                                >
                                  অগ্রিম বহাল: {formatCurrency(pr.totalAdvanceAvailable || 0, lang)}
                                </span>
                              </div>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="p-3 text-right font-black text-slate-900 text-sm bg-slate-50/50">
                            {formatCurrency(pr.netPayable, lang)}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                pr.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {pr.status === 'paid' ? 'পরিশোধিত' : 'খসড়া'}
                            </span>
                          </td>
                          <td className="p-3 text-right no-print whitespace-nowrap">
                            <div className="flex justify-end items-center space-x-1">
                              <button
                                onClick={() => setSelectedSlip(pr)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                                title="পে-স্লিপ দেখুন ও প্রিন্ট করুন"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {!isReadOnly && (
                                <>
                                  <button
                                    onClick={() => handleOpenEditPayroll(pr)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                    title="হিসাব সমন্বয় / এডিট করুন"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setPayrollToDelete(pr)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                    title="রেকর্ড মুছুন"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                  {pr.status !== 'paid' && (
                                    <button
                                      onClick={() => handlePaySalary(pr)}
                                      className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[10px] font-bold ml-1"
                                    >
                                      পরিশোধ
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {monthPayrolls.length > 0 && (
                    <tfoot className="bg-slate-100 font-bold border-t text-slate-900">
                      <tr>
                        <td colSpan={8} className="p-3 text-right">সর্বমোট প্রদেয় বেতন:</td>
                        <td className="p-3 text-right text-emerald-800 text-sm">{formatCurrency(totalPayroll, lang)}</td>
                        <td colSpan={2} className="p-3"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              <div className="print-only p-4">
                <PrintSignatures />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Employee Advance Ledger */}
      {activeTab === 'advances' && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="no-print grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-purple-100 bg-purple-50/20 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-purple-700">মোট অগ্রিম প্রদান</span>
              <p className="text-xl font-black text-purple-900 mt-1">
                {formatCurrency(totalAdvancesGiven, lang)}
              </p>
              <span className="text-[10px] text-purple-600">{allAdvances.length} টি অগ্রিম ভাউচার</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500">বেতন থেকে কর্তন সম্পন্ন</span>
              <p className="text-xl font-black text-slate-800 mt-1">
                {formatCurrency(totalAdvancesDeducted, lang)}
              </p>
              <span className="text-[10px] text-slate-500">মাসিক বেতন থেকে সমন্বয়কৃত</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-amber-100 bg-amber-50/30 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-amber-700">অবশিষ্ট বকেয়া অগ্রিম</span>
              <p className="text-xl font-black text-amber-900 mt-1">
                {formatCurrency(totalAdvancesOutstanding, lang)}
              </p>
              <span className="text-[10px] text-amber-700">পরবর্তী বেতনে কর্তনযোগ্য</span>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="no-print bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 flex items-center space-x-2 w-full">
              <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
              <input
                type="text"
                value={advanceSearch}
                onChange={(e) => setAdvanceSearch(e.target.value)}
                placeholder="কর্মচারীর নাম বা কারণ দিয়ে অগ্রিম খুঁজুন..."
                className="w-full text-xs outline-none bg-transparent"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={advanceEmployeeFilter}
                onChange={(e) => setAdvanceEmployeeFilter(e.target.value)}
                className="border rounded-lg p-1.5 text-xs font-bold text-slate-700 bg-white"
              >
                <option value="">সকল কর্মচারী</option>
                {activeEmployees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Advances Table */}
          <div className="print-area space-y-4">
            <div className="print-only">
              <PrintHeader
                title="কর্মচারী অগ্রিম খাতা ও স্টেটমেন্ট (Employee Advance Ledger)"
                subtitle={`তারিখ: ${formatDate(today, lang)} | মোট বকেয়া অগ্রিম: ${formatCurrency(totalAdvancesOutstanding, lang)}`}
              />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                    <tr>
                      <th className="p-3">তারিখ</th>
                      <th className="p-3">কর্মচারীর নাম</th>
                      <th className="p-3 text-right">টাকার পরিমাণ</th>
                      <th className="p-3 text-center">পেমেন্ট মাধ্যম</th>
                      <th className="p-3 text-center">অবস্থা</th>
                      <th className="p-3">কর্তনের মাস</th>
                      <th className="p-3">মন্তব্য / কারণ</th>
                      <th className="p-3 text-right no-print">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredAdvances.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                          কোনো অগ্রিম রেকর্ড পাওয়া যায়নি। "+ অগ্রিম প্রদান করুন" বাটনে ক্লিক করে যোগ করুন।
                        </td>
                      </tr>
                    ) : (
                      filteredAdvances.map((adv) => (
                        <tr key={adv.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 text-slate-500 whitespace-nowrap">
                            {formatDate(adv.date, lang)}
                          </td>
                          <td className="p-3 font-bold text-slate-900">{adv.employeeName}</td>
                          <td className="p-3 text-right font-black text-purple-900 text-sm whitespace-nowrap">
                            {formatCurrency(adv.amount, lang)}
                          </td>
                          <td className="p-3 text-center uppercase text-[10px] font-bold text-slate-600">
                            {adv.paymentMethod}
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                adv.isDeducted
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : adv.deductedAmount && adv.deductedAmount > 0
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {adv.isDeducted
                                ? 'বেতন থেকে সমন্বিত'
                                : adv.deductedAmount && adv.deductedAmount > 0
                                ? `আংশিক কর্তন (বাকি ${formatCurrency(adv.amount - adv.deductedAmount, lang)})`
                                : 'সম্পূর্ণ বকেয়া'}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-600">
                            {adv.deductedPayrollMonth || '-'}
                          </td>
                          <td className="p-3 text-slate-500 max-w-xs truncate">{adv.notes || '-'}</td>
                          <td className="p-3 text-right no-print whitespace-nowrap">
                            <div className="flex justify-end items-center space-x-1">
                              <button
                                onClick={() => setSelectedAdvanceSlip(adv)}
                                className="p-1.5 text-purple-700 hover:bg-purple-50 rounded"
                                title="ভাউচার প্রিন্ট করুন"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              {!isReadOnly && (
                                <>
                                  <button
                                    onClick={() => handleOpenAdvanceModal(adv)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                    title="এডিট করুন"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setAdvanceToDelete(adv)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                    title="মুছুন"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t text-slate-900">
                    <tr>
                      <td colSpan={2} className="p-3 text-right">ফিল্টার অনুযায়ী মোট:</td>
                      <td className="p-3 text-right text-sm font-black text-purple-900">
                        {formatCurrency(
                          filteredAdvances.reduce((sum, a) => sum + (a.amount || 0), 0),
                          lang
                        )}
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
        </div>
      )}

      {/* Modal: Add/Edit Advance */}
      {isAdvanceModalOpen && (
        <div className="no-print fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border my-auto max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center space-x-2">
              <Banknote className="w-5 h-5 text-purple-700" />
              <span>{editingAdvance ? 'অগ্রিম প্রদান রেকর্ড সংশোধন' : 'কর্মচারীকে অগ্রিম প্রদান এন্ট্রি'}</span>
            </h3>

            {advanceSuccessMessage && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{advanceSuccessMessage}</span>
              </div>
            )}

            {advanceError && (
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
                {advanceError}
              </div>
            )}

            <form onSubmit={(e) => handleSaveAdvance(e, false)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">কর্মচারী নির্বাচন করুন *</label>
                <select
                  required
                  value={advanceForm.employeeId}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, employeeId: e.target.value })}
                  className="w-full border rounded-lg p-2 text-xs font-bold text-slate-900 bg-white"
                >
                  <option value="">কর্মচারী বাছুন</option>
                  {activeEmployees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} (বকেয়া অগ্রিম: ৳{getEmployeeAdvanceBalance(e.id)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">টাকার পরিমাণ (৳) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={advanceForm.amount}
                  onChange={(e) =>
                    setAdvanceForm({
                      ...advanceForm,
                      amount: e.target.value === '' ? '' : parseFloat(e.target.value),
                    })
                  }
                  className="w-full border rounded-lg p-2.5 text-base font-black text-purple-900 bg-white"
                  placeholder="৳ টাকার অংক"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">তারিখ</label>
                  <input
                    type="date"
                    required
                    value={advanceForm.date}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, date: e.target.value })}
                    className="w-full border rounded-lg p-2 text-xs font-bold text-slate-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">পেমেন্ট মাধ্যম</label>
                  <select
                    value={advanceForm.paymentMethod}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, paymentMethod: e.target.value })}
                    className="w-full border rounded-lg p-2 text-xs font-bold text-slate-900 bg-white"
                  >
                    <option value="cash">নগদ (Cash)</option>
                    <option value="bank">ব্যাংক</option>
                    <option value="bkash">বিকাশ</option>
                    <option value="nagad">নগদ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">মন্তব্য / কারণ</label>
                <input
                  type="text"
                  value={advanceForm.notes}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, notes: e.target.value })}
                  placeholder="অগ্রিমের কারণ বা বিশেষ বিবরণ"
                  className="w-full border rounded-lg p-2 text-xs bg-white"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdvanceModalOpen(false);
                    setAdvanceSuccessMessage(null);
                  }}
                  className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  {advanceSuccessMessage ? 'সম্পন্ন / বন্ধ করুন' : 'বাতিল'}
                </button>

                <div className="flex items-center space-x-2">
                  {!editingAdvance && (
                    <button
                      type="button"
                      onClick={(e) => handleSaveAdvance(e, true)}
                      className="px-3.5 py-2 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-lg text-xs font-bold border border-purple-300 shadow-xs cursor-pointer flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>সংরক্ষণ ও আরও যোগ করুন</span>
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                  >
                    {editingAdvance ? 'পরিবর্তন সংরক্ষণ করুন' : 'সংরক্ষণ ও বন্ধ করুন'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit / Adjust Payroll Record */}
      {isEditPayrollModalOpen && editingPayroll && (
        <div className="no-print fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border my-auto max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center space-x-2">
              <Edit2 className="w-5 h-5 text-blue-600" />
              <span>বেতন রেকর্ড সমন্বয় ও সংশোধন</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              কর্মচারী: <b className="text-slate-800">{editingPayroll.employeeName}</b> ({editingPayroll.monthYear})
            </p>

            <form onSubmit={handleSavePayrollAdjustment} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    উপস্থিত দিন ({editingPayroll.daysInMonth} দিনের মধ্যে)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={editingPayroll.daysInMonth}
                    value={payrollForm.presentDays}
                    onChange={(e) => {
                      const d = parseInt(e.target.value, 10) || 0;
                      const dailyRate = editingPayroll.basicSalary / editingPayroll.daysInMonth;
                      setPayrollForm({
                        ...payrollForm,
                        presentDays: d,
                        attendanceSalary: Math.round(((d * dailyRate) + Number.EPSILON) * 100) / 100,
                      });
                    }}
                    className="w-full border rounded p-1.5 text-xs font-bold text-slate-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    হাজিরা বেতন (৳)
                  </label>
                  <input
                    type="number"
                    value={payrollForm.attendanceSalary}
                    onChange={(e) =>
                      setPayrollForm({
                        ...payrollForm,
                        attendanceSalary: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full border rounded p-1.5 text-xs font-bold text-slate-900 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-emerald-800 mb-1">
                    হাজিরা বোনাস (৳)
                  </label>
                  <input
                    type="number"
                    value={payrollForm.attendanceBonus}
                    onChange={(e) =>
                      setPayrollForm({
                        ...payrollForm,
                        attendanceBonus: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full border rounded p-1.5 text-xs font-bold text-emerald-800 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-amber-800 mb-1">
                    ওভারটাইম টাকা (OT ৳)
                  </label>
                  <input
                    type="number"
                    value={payrollForm.otPay}
                    onChange={(e) =>
                      setPayrollForm({
                        ...payrollForm,
                        otPay: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full border rounded p-1.5 text-xs font-bold text-amber-800 bg-white"
                  />
                </div>
              </div>

              {/* Previous Unpaid Salary Section */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between border-b border-blue-200/70 pb-2">
                  <div className="flex items-center space-x-2">
                    <History className="w-4 h-4 text-blue-700" />
                    <span className="text-xs font-bold text-blue-950">পূর্ববর্তী অপরিশোধিত বকেয়া বেতন</span>
                  </div>
                  {payrollForm.previousUnpaidSalaryDue > 0 && (
                    <span className="text-xs font-black text-blue-900 bg-blue-100 px-2 py-0.5 rounded-full">
                      বকেয়া: {formatCurrency(payrollForm.previousUnpaidSalaryDue, lang)}
                    </span>
                  )}
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-blue-100 space-y-2">
                  <label className="flex items-start space-x-2 cursor-pointer select-none text-xs font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={payrollForm.includePreviousUnpaidSalary}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setPayrollForm({
                          ...payrollForm,
                          includePreviousUnpaidSalary: checked,
                          previousUnpaidSalaryAdded: checked
                            ? (payrollForm.previousUnpaidSalaryAdded || payrollForm.previousUnpaidSalaryDue)
                            : 0,
                        });
                      }}
                      className="w-4 h-4 text-blue-600 rounded border-blue-300 focus:ring-blue-600 mt-0.5"
                    />
                    <div>
                      <span>পূর্ববর্তী মাসের অপরিশোধিত বেতন এই মাসের বেতনের সাথে যোগ করুন</span>
                      <p className="text-[10px] text-slate-500 font-normal mt-0.5">
                        * স্বয়ংক্রিয়ভাবে যোগ হবে না; কেবল আপনি চাইলেই এই মাসের বেতনের সাথে যুক্ত হবে।
                      </p>
                    </div>
                  </label>

                  {payrollForm.includePreviousUnpaidSalary && (
                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] font-semibold text-blue-900">
                          এই মাসে যুক্ত করার পরিমাণ (৳):
                        </label>
                        {payrollForm.previousUnpaidSalaryDue > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setPayrollForm({
                                ...payrollForm,
                                previousUnpaidSalaryAdded: payrollForm.previousUnpaidSalaryDue,
                              })
                            }
                            className="text-[10px] bg-blue-100 hover:bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded font-bold cursor-pointer"
                          >
                            সম্পূর্ণ বকেয়া (৳{payrollForm.previousUnpaidSalaryDue})
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={payrollForm.previousUnpaidSalaryAdded}
                        onChange={(e) =>
                          setPayrollForm({
                            ...payrollForm,
                            previousUnpaidSalaryAdded: Math.round(parseFloat(e.target.value) || 0),
                          })
                        }
                        className="w-full border rounded p-1.5 text-xs font-bold text-blue-900 bg-white"
                        placeholder="৳ বকেয়া যোগের পরিমাণ"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Advance Adjustment Section */}
              <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-purple-200/70 pb-2">
                  <div className="flex items-center space-x-2">
                    <Banknote className="w-4 h-4 text-purple-700" />
                    <span className="text-xs font-bold text-purple-950">অগ্রিম কর্তন ও সমন্বয়</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-purple-700 font-semibold block">মোট বকেয়া অগ্রিম:</span>
                    <span className="text-xs font-black text-purple-900">
                      {formatCurrency(payrollForm.totalAdvanceAvailable, lang)}
                    </span>
                  </div>
                </div>

                {payrollForm.totalAdvanceAvailable > 0 ? (
                  <div className="space-y-2.5">
                    {/* Toggle Choice */}
                    <div className="bg-white p-2.5 rounded-lg border border-purple-100 flex items-center justify-between">
                      <label className="flex items-center space-x-2 cursor-pointer select-none text-xs font-bold text-slate-800">
                        <input
                          type="checkbox"
                          checked={payrollForm.shouldDeductAdvance}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const totalEarned =
                              payrollForm.attendanceSalary +
                              payrollForm.attendanceBonus +
                              payrollForm.otPay +
                              payrollForm.otherEarnings +
                              (payrollForm.includePreviousUnpaidSalary
                                ? payrollForm.previousUnpaidSalaryAdded || payrollForm.previousUnpaidSalaryDue
                                : 0);
                            const defaultAmt = checked
                              ? Math.min(totalEarned, payrollForm.totalAdvanceAvailable)
                              : 0;
                            setPayrollForm({
                              ...payrollForm,
                              shouldDeductAdvance: checked,
                              advanceDeduction: defaultAmt,
                              remainingAdvance: Math.max(0, payrollForm.totalAdvanceAvailable - defaultAmt),
                            });
                          }}
                          className="w-4 h-4 text-purple-700 rounded border-purple-300 focus:ring-purple-600"
                        />
                        <span>এই মাসের বেতন থেকে অগ্রিম কর্তন করুন</span>
                      </label>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          payrollForm.shouldDeductAdvance
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {payrollForm.shouldDeductAdvance ? 'কর্তন কার্যকর' : 'কর্তন স্থগিত'}
                      </span>
                    </div>

                    {payrollForm.shouldDeductAdvance ? (
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[11px] font-semibold text-purple-900">
                              এই মাসে কর্তনকৃত টাকার পরিমাণ (৳)
                            </label>
                            {/* Quick Helper Buttons */}
                            <div className="flex space-x-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const totalEarned =
                                    payrollForm.attendanceSalary +
                                    payrollForm.attendanceBonus +
                                    payrollForm.otPay +
                                    payrollForm.otherEarnings +
                                    (payrollForm.includePreviousUnpaidSalary
                                      ? payrollForm.previousUnpaidSalaryAdded || payrollForm.previousUnpaidSalaryDue
                                      : 0);
                                  const amt = Math.min(totalEarned, payrollForm.totalAdvanceAvailable);
                                  setPayrollForm({
                                    ...payrollForm,
                                    advanceDeduction: amt,
                                    remainingAdvance: Math.max(0, payrollForm.totalAdvanceAvailable - amt),
                                  });
                                }}
                                className="text-[10px] bg-purple-100 hover:bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded font-bold cursor-pointer"
                              >
                                সর্বোচ্চ কর্তন
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const amt = Math.round(payrollForm.totalAdvanceAvailable / 2);
                                  setPayrollForm({
                                    ...payrollForm,
                                    advanceDeduction: amt,
                                    remainingAdvance: Math.max(0, payrollForm.totalAdvanceAvailable - amt),
                                  });
                                }}
                                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold cursor-pointer"
                              >
                                ৫০% কর্তন
                              </button>
                            </div>
                          </div>
                          <input
                            type="number"
                            min="0"
                            max={payrollForm.totalAdvanceAvailable}
                            value={payrollForm.advanceDeduction}
                            onChange={(e) => {
                              const amt = parseFloat(e.target.value) || 0;
                              const bounded = Math.min(payrollForm.totalAdvanceAvailable, Math.max(0, amt));
                              setPayrollForm({
                                ...payrollForm,
                                advanceDeduction: bounded,
                                remainingAdvance: Math.max(0, payrollForm.totalAdvanceAvailable - bounded),
                              });
                            }}
                            className="w-full border rounded p-1.5 text-xs font-bold text-purple-900 bg-white"
                          />
                        </div>

                        {/* If advance is greater than earnings */}
                        {payrollForm.totalAdvanceAvailable >
                          payrollForm.attendanceSalary +
                            payrollForm.attendanceBonus +
                            payrollForm.otPay +
                            payrollForm.otherEarnings && (
                          <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-start space-x-1.5">
                            <span className="font-bold">⚠️ বেতন থেকে অগ্রিম বেশি:</span>
                            <span>
                              বেতনের চেয়ে অগ্রিম বেশি থাকায় অবশিষ্ট টাকা পরবর্তী মাসের অগ্রিম হিসেবে বহাল থাকবে।
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between items-center text-[11px] bg-white p-2 rounded-lg border border-purple-100">
                          <span className="text-slate-600 font-medium">পরবর্তী মাসের জন্য অবশিষ্ট অগ্রিম:</span>
                          <span className="font-black text-amber-900">
                            {formatCurrency(
                              Math.max(0, payrollForm.totalAdvanceAvailable - payrollForm.advanceDeduction),
                              lang
                            )}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-white rounded-lg border border-purple-100 text-[11px] text-slate-600 space-y-1">
                        <p className="font-bold text-purple-900">
                          ✓ এই মাসে কোনো অগ্রিম কাটা হবে না।
                        </p>
                        <p className="text-[10px] text-slate-500">
                          সম্পূর্ণ {formatCurrency(payrollForm.totalAdvanceAvailable, lang)} কর্মচারীর নামে বহাল থাকবে এবং বেতন স্লিপে প্রদর্শিত হবে।
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic py-1">
                    এই কর্মচারীর কোনো পূর্ববর্তী বা বর্তমান বকেয়া অগ্রিম নেই।
                  </p>
                )}
              </div>

              {/* Other Deductions */}
              <div>
                <label className="block text-[11px] font-semibold text-rose-700 mb-1">
                  অন্যান্য কর্তন (৳)
                </label>
                <input
                  type="number"
                  value={payrollForm.otherDeductions}
                  onChange={(e) =>
                    setPayrollForm({
                      ...payrollForm,
                      otherDeductions: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full border rounded p-1.5 text-xs font-bold text-rose-700 bg-white"
                />
              </div>

              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-emerald-950 block">আনুমানিক নিট প্রদেয়:</span>
                  <span className="text-[10px] text-emerald-700">
                    (মোট অর্জিত {payrollForm.includePreviousUnpaidSalary && payrollForm.previousUnpaidSalaryAdded > 0 ? '+ পূর্ববর্তী বকেয়া ' : ''}- কর্তনসমূহ)
                  </span>
                </div>
                <span className="font-black text-sm text-emerald-900">
                  {formatCurrency(
                    Math.max(
                      0,
                      Math.round(
                        payrollForm.attendanceSalary +
                          payrollForm.attendanceBonus +
                          payrollForm.otPay +
                          payrollForm.otherEarnings +
                          (payrollForm.includePreviousUnpaidSalary
                            ? (payrollForm.previousUnpaidSalaryAdded || payrollForm.previousUnpaidSalaryDue)
                            : 0) -
                          ((payrollForm.shouldDeductAdvance
                            ? Math.min(payrollForm.totalAdvanceAvailable, payrollForm.advanceDeduction)
                            : 0) +
                            payrollForm.otherDeductions)
                      )
                    ),
                    lang
                  )}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">মন্তব্য</label>
                <input
                  type="text"
                  value={payrollForm.notes}
                  onChange={(e) => setPayrollForm({ ...payrollForm, notes: e.target.value })}
                  placeholder="সমন্বয়ের কারণ বা বিশেষ নোট"
                  className="w-full border rounded p-2 text-xs bg-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsEditPayrollModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                >
                  সমন্বয় সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      {advanceToDelete && (
        <ConfirmModal
          isOpen={true}
          title="অগ্রিম রেকর্ড মুছে ফেলবেন?"
          message={`আপনি কি নিশ্চিত যে "${advanceToDelete.employeeName}" এর ${formatDate(advanceToDelete.date, lang)} তারিখের ${formatCurrency(advanceToDelete.amount, lang)} অগ্রিম রেকর্ডটি মুছে ফেলতে চান?`}
          confirmText="হ্যাঁ, মুছে ফেলুন"
          danger={true}
          onConfirm={handleConfirmDeleteAdvance}
          onCancel={() => setAdvanceToDelete(null)}
        />
      )}

      {payrollToDelete && (
        <ConfirmModal
          isOpen={true}
          title="বেতন রেকর্ড মুছে ফেলবেন?"
          message={`আপনি কি নিশ্চিত যে "${payrollToDelete.employeeName}" এর ${payrollToDelete.monthYear} মাসের বেতন রেকর্ডটি মুছে ফেলতে চান?`}
          confirmText="হ্যাঁ, মুছে ফেলুন"
          danger={true}
          onConfirm={handleConfirmDeletePayroll}
          onCancel={() => setPayrollToDelete(null)}
        />
      )}

      {/* Pay Salary Dedicated Modal */}
      {payrollToPay && (
        <div className="no-print fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border my-auto">
            <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <span>বেতন পরিশোধ ও ভাউচার সম্পাদন</span>
            </h3>

            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 mb-4 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-600">কর্মচারীর নাম:</span>
                <span className="font-bold text-slate-900">{payrollToPay.employeeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">বেতনের মাস:</span>
                <span className="font-bold text-emerald-900">
                  {getMonthNameBengali(payrollToPay.monthYear)} ({payrollToPay.monthYear})
                </span>
              </div>
              <div className="flex justify-between border-t border-emerald-200/60 pt-1.5">
                <span className="font-bold text-slate-800">পরিশোধযোগ্য নিট বেতন:</span>
                <span className="font-black text-emerald-800 text-sm">
                  {formatCurrency(payrollToPay.netPayable, lang)}
                </span>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleConfirmPaySalary();
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  পরিশোধের তারিখ *
                </label>
                <input
                  type="date"
                  required
                  value={paymentForm.paidDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paidDate: e.target.value })}
                  className="w-full border rounded-lg p-2 text-xs font-bold text-slate-900 bg-white"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  * মাস শেষ হওয়ার পর সাধারণত ১০ তারিখে বা সুবিধাজনক তারিখে পরিশোধের ব্যবস্থা রাখা হয়েছে।
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  পরিশোধের মাধ্যম *
                </label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="w-full border rounded-lg p-2 text-xs font-bold text-slate-900 bg-white"
                >
                  <option value="cash">নগদ (Cash)</option>
                  <option value="bank">ব্যাংক ট্রান্সফার</option>
                  <option value="bkash">বিকাশ (bKash)</option>
                  <option value="nagad">নগদ (Nagad)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  পেমেন্ট সংক্রান্ত মন্তব্য / রেফারেন্স
                </label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="যেমন: ক্যাশ ভাউচার বা ট্রানজেকশন আইডি"
                  className="w-full border rounded-lg p-2 text-xs bg-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setPayrollToPay(null)}
                  className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>হ্যাঁ, বেতন পরিশোধ সম্পন্ন করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
