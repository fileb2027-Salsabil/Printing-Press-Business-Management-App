import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { Employee, EmployeeAdvance } from '../../types';
import { formatCurrency, formatDate, sortEmployeesByDesignation } from '../../utils/calculations';
import { validateAndProcessImage } from '../../utils/imageUpload';
import { translations } from '../../utils/i18n';
import { PrintHeader, PrintSignatures, PrintAmountInWords, triggerPrint } from '../common/PrintHeader';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  UserCheck,
  Plus,
  Search,
  Printer,
  Phone,
  MapPin,
  Calendar,
  Edit2,
  Trash2,
  Upload,
  ArrowLeft,
  Banknote,
  DollarSign,
  Clock,
  CheckCircle,
  CheckCircle2,
  CreditCard,
} from 'lucide-react';
import { PhoneLink } from '../common/PhoneLink';
import { EmployeeIdCardModal } from './EmployeeIdCardModal';

export const EmployeeManager: React.FC = () => {
  const {
    db,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    addAdvance,
    deleteAdvance,
    getEmployeeAdvanceBalance,
    isReadOnly,
  } = useDatabase();
  const lang = db.settings.language;
  const t = translations[lang];

  const today = new Date().toISOString().split('T')[0];
  const [search, setSearch] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'attendance' | 'advances' | 'payrolls'>('summary');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [advanceSuccessMessage, setAdvanceSuccessMessage] = useState<string | null>(null);
  const [selectedAdvanceSlip, setSelectedAdvanceSlip] = useState<EmployeeAdvance | null>(null);
  const [selectedCardEmp, setSelectedCardEmp] = useState<Employee | null>(null);

  // Form states
  const [form, setForm] = useState({
    name: '',
    fatherName: '',
    employeeId: `EMP-00${db.employees.length + 1}`,
    photoUrl: '',
    designation: 'অফসেট মেশিন অপারেটর',
    phone: '',
    address: '',
    joiningDate: today,
    monthlyBasicSalary: 15000,
    standardMonthlyHours: db.settings.standardMonthlyWorkHours || 208,
    otRatePercent: 70,
    isActive: true,
    notes: '',
  });

  const [advanceForm, setAdvanceForm] = useState({
    amount: 0,
    date: today,
    paymentMethod: 'cash',
    notes: '',
  });

  const selectedEmployee = db.employees.find((e) => e.id === selectedEmpId);

  const handleOpenModal = (emp?: Employee) => {
    if (isReadOnly) return;
    if (emp) {
      setEditingEmp(emp);
      setForm({
        name: emp.name,
        fatherName: emp.fatherName || '',
        employeeId: emp.employeeId,
        photoUrl: emp.photoUrl || '',
        designation: emp.designation,
        phone: emp.phone,
        address: emp.address,
        joiningDate: emp.joiningDate,
        monthlyBasicSalary: emp.monthlyBasicSalary,
        standardMonthlyHours: emp.standardMonthlyHours || 208,
        otRatePercent: emp.otRatePercent || 70,
        isActive: emp.isActive,
        notes: emp.notes || '',
      });
    } else {
      setEditingEmp(null);
      setForm({
        name: '',
        fatherName: '',
        employeeId: `EMP-00${db.employees.length + 1}`,
        photoUrl: '',
        designation: 'অফসেট মেশিন অপারেটর',
        phone: '',
        address: '',
        joiningDate: today,
        monthlyBasicSalary: 15000,
        standardMonthlyHours: db.settings.standardMonthlyWorkHours || 208,
        otRatePercent: 70,
        isActive: true,
        notes: '',
      });
    }
    setIsModalOpen(true);
  };

  const [empToDelete, setEmpToDelete] = useState<Employee | null>(null);
  const [advanceToDelete, setAdvanceToDelete] = useState<EmployeeAdvance | null>(null);
  const [photoUploadError, setPhotoUploadError] = useState('');

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setPhotoUploadError('');
      const res = await validateAndProcessImage(file);
      setForm((prev) => ({ ...prev, photoUrl: res.dataUrl }));
    } catch (err: any) {
      setPhotoUploadError(err.message || 'ছবি আপলোড ব্যর্থ হয়েছে');
    }
  };

  const handleDelete = (emp: Employee) => {
    if (isReadOnly) return;
    setEmpToDelete(emp);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!form.name.trim()) return;

    if (editingEmp) {
      updateEmployee(editingEmp.id, form);
    } else {
      addEmployee(form);
    }
    setIsModalOpen(false);
  };

  const handleSaveAdvance = (e: React.FormEvent, stayOpen = false) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!selectedEmployee || advanceForm.amount <= 0) return;
    const roundedAmt = Math.round(advanceForm.amount);
    addAdvance({
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.name,
      amount: roundedAmt,
      date: advanceForm.date,
      paymentMethod: advanceForm.paymentMethod,
      notes: advanceForm.notes,
    });

    if (stayOpen) {
      setAdvanceSuccessMessage(`✓ "${selectedEmployee.name}" এর জন্য ৳${roundedAmt} অগ্রিম সফলভাবে জমা হয়েছে! আরও অগ্রিম এন্ট্রি করতে পারেন।`);
      setAdvanceForm((prev) => ({
        ...prev,
        amount: 0,
        notes: '',
      }));
    } else {
      setIsAdvanceModalOpen(false);
      setAdvanceSuccessMessage(null);
    }
  };

  const filteredEmployees = sortEmployeesByDesignation(
    db.employees.filter(
      (e) =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.employeeId.toLowerCase().includes(search.toLowerCase()) ||
        e.designation.toLowerCase().includes(search.toLowerCase())
    )
  );

  // If viewing employee advance slip
  if (selectedAdvanceSlip && selectedEmployee) {
    const totalAdvDue = getEmployeeAdvanceBalance(selectedEmployee.id);
    return (
      <div className="space-y-6">
        <div className="no-print flex items-center justify-between">
          <button
            onClick={() => setSelectedAdvanceSlip(null)}
            className="flex items-center space-x-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 px-3 py-2 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>প্রোফাইলে ফিরে যান</span>
          </button>

          <button
            onClick={() => triggerPrint()}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>অগ্রিম স্লিপ প্রিন্ট করুন</span>
          </button>
        </div>

        {/* Printable Advance Container */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs max-w-2xl mx-auto print-container">
          <PrintHeader
            title="কর্মচারীর অগ্রিম স্লিপ (EMPLOYEE ADVANCE SLIP)"
            documentNo={`ADV-${selectedAdvanceSlip.id.slice(-6)}`}
            date={selectedAdvanceSlip.date}
          />

          <div className="my-6 space-y-4 text-xs text-slate-800 border p-5 rounded-xl bg-slate-50/50">
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">কর্মচারীর নাম:</span>
              <span className="font-bold text-slate-900 text-sm">{selectedEmployee.name}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">আইডি ও পদবি:</span>
              <span className="font-semibold">{selectedEmployee.employeeId} — {selectedEmployee.designation}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">অগ্রিম প্রদানের তারিখ:</span>
              <span className="font-bold">{formatDate(selectedAdvanceSlip.date, lang)}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">পেমেন্ট মাধ্যম:</span>
              <span className="font-bold uppercase">{selectedAdvanceSlip.paymentMethod}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">অগ্রিম টাকার পরিমাণ:</span>
              <span className="text-base font-black text-purple-800">
                {formatCurrency(selectedAdvanceSlip.amount, lang)}
              </span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-semibold">মোট অবশিষ্ট অগ্রিম:</span>
              <span className="font-bold text-amber-700">
                {formatCurrency(totalAdvDue, lang)}
              </span>
            </div>
            {selectedAdvanceSlip.notes && (
              <div className="flex justify-between pt-1">
                <span className="text-slate-500 font-semibold">বিবরণ / কারণ:</span>
                <span className="font-medium text-slate-700">{selectedAdvanceSlip.notes}</span>
              </div>
            )}
          </div>

          <PrintAmountInWords amount={selectedAdvanceSlip.amount} lang={lang} />

          <PrintSignatures />
        </div>
      </div>
    );
  }

  // If viewing single employee detailed profile
  if (selectedEmployee) {
    const advanceBalance = getEmployeeAdvanceBalance(selectedEmployee.id);
    const empAttendance = db.attendance.filter((a) => a.employeeId === selectedEmployee.id);
    const empAdvances = db.advances.filter((a) => a.employeeId === selectedEmployee.id);
    const empPayrolls = db.payrolls.filter((p) => p.employeeId === selectedEmployee.id);

    return (
      <div className="space-y-6">
        <div className="no-print flex items-center justify-between">
          <button
            onClick={() => setSelectedEmpId(null)}
            className="flex items-center space-x-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 px-3 py-2 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>কর্মচারী তালিকায় ফিরে যান</span>
          </button>

          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedCardEmp(selectedEmployee)}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs"
              title="ডিজিটাল আইডি কার্ড তৈরি ও প্রিন্ট করুন"
            >
              <CreditCard className="w-4 h-4" />
              <span>আইডি কার্ড তৈরি</span>
            </button>
            {!isReadOnly && (
              <button
                onClick={() => setIsAdvanceModalOpen(true)}
                className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs"
              >
                <Banknote className="w-4 h-4" />
                <span>অগ্রিম প্রদান করুন</span>
              </button>
            )}
            <button
              onClick={() => triggerPrint()}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট প্রোফাইল</span>
            </button>
          </div>
        </div>

        <div className="print-only">
          <PrintHeader
            title="কর্মচারীর প্রোফাইল ও বিবরণী"
            subtitle={`${selectedEmployee.name} | ${selectedEmployee.designation} (${selectedEmployee.employeeId})`}
          />
        </div>

        {/* Profile Card Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center space-x-4">
            {selectedEmployee.photoUrl ? (
              <img
                src={selectedEmployee.photoUrl}
                alt={selectedEmployee.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500 shadow-xs"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-2xl">
                {selectedEmployee.name.slice(0, 1)}
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-slate-900">{selectedEmployee.name}</h2>
                <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-700">
                  {selectedEmployee.employeeId}
                </span>
              </div>
              <p className="text-xs font-semibold text-emerald-700 mt-0.5">{selectedEmployee.designation}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-2">
                {selectedEmployee.fatherName && (
                  <span className="flex items-center space-x-1">
                    <span className="text-slate-400">পিতা:</span>
                    <span className="font-semibold text-slate-800">{selectedEmployee.fatherName}</span>
                  </span>
                )}
                <PhoneLink phone={selectedEmployee.phone} showWhatsApp={true} />
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{selectedEmployee.address}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>যোগদান: {selectedEmployee.joiningDate}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-right space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">মাসিক মূল বেতন</span>
            <div className="text-xl font-black text-slate-900">
              {formatCurrency(selectedEmployee.monthlyBasicSalary, lang)}
            </div>
            <div className="text-[11px] text-purple-700 font-bold">
              অবশিষ্ট অগ্রিম: {formatCurrency(advanceBalance, lang)}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="no-print border-b border-slate-200 flex space-x-2">
          {[
            { id: 'summary', label: 'সারসংক্ষেপ' },
            { id: 'attendance', label: `হাজিরা (${empAttendance.length})` },
            { id: 'advances', label: `অগ্রিম রেজিস্টার (${empAdvances.length})` },
            { id: 'payrolls', label: `বেতন শিট (${empPayrolls.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
                activeTab === tab.id
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Advances */}
        {activeTab === 'advances' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800">কর্মচারীর অগ্রিম হিসাব রেজিস্টার</h3>
              {!isReadOnly && (
                <button
                  onClick={() => setIsAdvanceModalOpen(true)}
                  className="px-3 py-1.5 bg-purple-700 text-white rounded text-xs font-bold"
                >
                  + অগ্রিম প্রদান
                </button>
              )}
            </div>
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                <tr>
                  <th className="p-3">তারিখ</th>
                  <th className="p-3">পেমেন্ট মাধ্যম</th>
                  <th className="p-3">মন্তব্য</th>
                  <th className="p-3 text-center">কর্তনের অবস্থা</th>
                  <th className="p-3 text-right">টাকার পরিমাণ (৳)</th>
                  <th className="p-3 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {empAdvances.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">
                      কোনো অগ্রিম প্রদান করা হয়নি।
                    </td>
                  </tr>
                ) : (
                  empAdvances.map((adv) => (
                    <tr key={adv.id} className="hover:bg-slate-50">
                      <td className="p-3">{formatDate(adv.date, lang)}</td>
                      <td className="p-3 uppercase text-[10px] font-bold text-slate-600">{adv.paymentMethod}</td>
                      <td className="p-3 text-slate-600">{adv.notes || '-'}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            adv.isDeducted
                              ? 'bg-emerald-100 text-emerald-800'
                              : adv.deductedAmount && adv.deductedAmount > 0
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {adv.isDeducted
                            ? 'বেতন থেকে সমন্বিত'
                            : adv.deductedAmount && adv.deductedAmount > 0
                            ? `আংশিক কর্তন (বাকি ${formatCurrency(adv.amount - adv.deductedAmount, lang)})`
                            : 'সম্পূর্ণ বকেয়া'}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-purple-700">
                        {formatCurrency(adv.amount, lang)}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => setSelectedAdvanceSlip(adv)}
                            className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded text-[11px] font-bold flex items-center space-x-1"
                            title="অগ্রিম স্লিপ প্রিন্ট করুন"
                          >
                            <Printer className="w-3 h-3" />
                            <span>স্লিপ</span>
                          </button>
                          {!isReadOnly && (
                            <button
                              onClick={() => setAdvanceToDelete(adv)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                              title="অগ্রিম রেকর্ড মুছুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t">
                <tr>
                  <td colSpan={4} className="p-3 text-right">মোট অবশিষ্ট অগ্রিম:</td>
                  <td className="p-3 text-right text-purple-800 font-black">
                    {formatCurrency(advanceBalance, lang)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Tab: Attendance */}
        {activeTab === 'attendance' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b">
              <h3 className="text-sm font-bold text-slate-800">হাজিরা ইতিহাস</h3>
            </div>
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                <tr>
                  <th className="p-3">তারিখ</th>
                  <th className="p-3 text-center">স্ট্যাটাস</th>
                  <th className="p-3 text-center">ওভারটাইম ঘণ্টা</th>
                  <th className="p-3">মন্তব্য</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {empAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-400">
                      হাজিরা রেকর্ড নেই।
                    </td>
                  </tr>
                ) : (
                  empAttendance.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="p-3">{formatDate(a.date, lang)}</td>
                      <td className="p-3 text-center font-bold">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            a.status === 'present'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {a.status === 'present' ? '✓ উপস্থিত' : '✕ অনুপস্থিত'}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-semibold">{a.otHours} ঘণ্টা</td>
                      <td className="p-3 text-slate-500">{a.notes || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab: Payrolls */}
        {activeTab === 'payrolls' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b">
              <h3 className="text-sm font-bold text-slate-800">মাসিক বেতন শিট ও পরিশোধ ইতিহাস</h3>
            </div>
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                <tr>
                  <th className="p-3">মাস</th>
                  <th className="p-3 text-center">উপস্থিতি (দিন)</th>
                  <th className="p-3 text-right">মূল বেতন</th>
                  <th className="p-3 text-right">বোনাস</th>
                  <th className="p-3 text-right">OT টাকা</th>
                  <th className="p-3 text-right">অগ্রিম কর্তন</th>
                  <th className="p-3 text-right">নিট প্রদেয়</th>
                  <th className="p-3 text-center">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {empPayrolls.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400">
                      কোনো বেতন শিট তৈরি করা হয়নি।
                    </td>
                  </tr>
                ) : (
                  empPayrolls.map((pr) => (
                    <tr key={pr.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold">{pr.monthYear}</td>
                      <td className="p-3 text-center">{pr.presentDays} / {pr.daysInMonth}</td>
                      <td className="p-3 text-right">{formatCurrency(pr.attendanceSalary, lang)}</td>
                      <td className="p-3 text-right text-emerald-700 font-bold">{formatCurrency(pr.attendanceBonus, lang)}</td>
                      <td className="p-3 text-right">{formatCurrency(pr.otPay, lang)}</td>
                      <td className="p-3 text-right text-purple-700 font-bold">- {formatCurrency(pr.advanceDeduction, lang)}</td>
                      <td className="p-3 text-right font-black text-slate-900">{formatCurrency(pr.netPayable, lang)}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            pr.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {pr.status === 'paid' ? 'পরিশোধিত' : 'খসড়া'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal: Advance */}
        {isAdvanceModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border my-auto max-h-[92vh] overflow-y-auto">
              <h3 className="text-base font-bold text-slate-900 mb-2">
                "{selectedEmployee.name}" কে অগ্রিম প্রদান
              </h3>

              {advanceSuccessMessage && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{advanceSuccessMessage}</span>
                </div>
              )}

              <form onSubmit={(e) => handleSaveAdvance(e, false)} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">টাকার পরিমাণ (৳) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={advanceForm.amount || ''}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg p-2.5 text-base font-bold text-purple-800"
                    placeholder="৳ টাকার অংক"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">তারিখ</label>
                    <input
                      type="date"
                      value={advanceForm.date}
                      onChange={(e) => setAdvanceForm({ ...advanceForm, date: e.target.value })}
                      className="w-full border rounded-lg p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">পেমেন্ট মাধ্যম</label>
                    <select
                      value={advanceForm.paymentMethod}
                      onChange={(e) => setAdvanceForm({ ...advanceForm, paymentMethod: e.target.value })}
                      className="w-full border rounded-lg p-2 text-xs"
                    >
                      <option value="cash">নগদ (Cash)</option>
                      <option value="bank">ব্যাংক</option>
                      <option value="bkash">বিকাশ</option>
                      <option value="nagad">নগদ</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">মন্তব্য</label>
                  <input
                    type="text"
                    value={advanceForm.notes}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, notes: e.target.value })}
                    placeholder="অগ্রিমের কারণ বা বিবরণ"
                    className="w-full border rounded-lg p-2 text-xs"
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
                    <button
                      type="button"
                      onClick={(e) => handleSaveAdvance(e, true)}
                      className="px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-lg text-xs font-bold border border-purple-300 shadow-xs cursor-pointer flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>সংরক্ষণ ও আরও যোগ করুন</span>
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                    >
                      সংরক্ষণ ও বন্ধ করুন
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Master Employee List View
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.employeeList}</h2>
          <p className="text-xs text-slate-500">
            কর্মকর্তা ও কর্মচারীদের তালিকা ও প্রোফাইল ব্যবস্থাপনা | মোট কর্মী: {db.employees.length} জন
          </p>
        </div>

        {!isReadOnly && (
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addEmployee}</span>
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
          placeholder="কর্মচারীর নাম, পদবি বা আইডি দিয়ে খুঁজুন..."
          className="w-full text-xs outline-none bg-transparent"
        />
      </div>

      {/* Employees Grid */}
      {filteredEmployees.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <UserCheck className="w-12 h-12 text-slate-300 mx-auto" />
          <h4 className="font-bold text-slate-700 text-base">{t.emptyStateTitle}</h4>
          <p className="text-xs text-slate-500">কোনো কর্মচারী পাওয়া যায়নি। নতুন কর্মচারী যোগ করুন।</p>
          {!isReadOnly && (
            <button
              onClick={() => handleOpenModal()}
              className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold"
            >
              + প্রথম কর্মচারী যোগ করুন
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((emp) => {
            const advBalance = getEmployeeAdvanceBalance(emp.id);
            return (
              <div
                key={emp.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-500/50 shadow-xs hover:shadow-md transition p-5 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      {emp.photoUrl ? (
                        <img
                          src={emp.photoUrl}
                          alt={emp.name}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg">
                          {emp.name.slice(0, 1)}
                        </div>
                      )}
                      <div>
                        <h3
                          onClick={() => setSelectedEmpId(emp.id)}
                          className="font-bold text-base text-slate-900 group-hover:text-emerald-700 transition cursor-pointer"
                        >
                          {emp.name}
                        </h3>
                        <p className="text-xs text-slate-500 font-semibold">{emp.designation}</p>
                      </div>
                    </div>

                    <div className="flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCardEmp(emp);
                        }}
                        className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition"
                        title="ডিজিটাল আইডি কার্ড তৈরি ও প্রিন্ট করুন"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                      </button>
                      {!isReadOnly && (
                        <>
                          <button
                            onClick={() => handleOpenModal(emp)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md"
                            title="সম্পাদনা"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(emp)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                            title="মুছুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 mb-4">
                    <div className="flex items-center space-x-1.5">
                      <PhoneLink phone={emp.phone} />
                    </div>
                    <p className="flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{emp.address}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-xs py-2 bg-slate-50 rounded-xl mb-4">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">মূল বেতন</span>
                      <p className="font-bold text-slate-800">{formatCurrency(emp.monthlyBasicSalary, lang)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">অবশিষ্ট অগ্রিম</span>
                      <p className="font-bold text-purple-700">{formatCurrency(advBalance, lang)}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedEmpId(emp.id)}
                  className="w-full py-2 bg-slate-900 group-hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1"
                >
                  <span>প্রোফাইল ও খাতা দেখুন</span>
                  <span>→</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add/Edit Employee */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border my-auto max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              {editingEmp ? 'কর্মচারীর তথ্য সংশোধন' : 'নতুন কর্মচারী যোগ করুন'}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              {/* Photo Upload */}
              <div className="flex items-center space-x-4 border p-3 rounded-xl bg-slate-50">
                {form.photoUrl ? (
                  <img src={form.photoUrl} alt="Preview" className="w-14 h-14 rounded-xl object-cover border" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400 font-bold text-xs">
                    ছবি নেই
                  </div>
                )}
                <div>
                  <label className="cursor-pointer bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg inline-flex items-center space-x-1">
                    <Upload className="w-3.5 h-3.5" />
                    <span>ছবি নির্বাচন করুন</span>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                  <p className="text-[10px] text-slate-500 mt-1">JPG, PNG বা WebP (সর্বোচ্চ ৩MB)</p>
                  {photoUploadError && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1">{photoUploadError}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">কর্মচারীর নাম *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="যেমন: আব্দুল করিম"
                    className="w-full border rounded-lg p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">কর্মচারী আইডি</label>
                  <input
                    type="text"
                    value={form.employeeId}
                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">পদবি *</label>
                  <input
                    type="text"
                    required
                    value={form.designation}
                    onChange={(e) => setForm({ ...form, designation: e.target.value })}
                    placeholder="যেমন: অফসেট মেশিন অপারেটর"
                    className="w-full border rounded-lg p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    পিতার নাম <span className="text-slate-400 font-normal">(ঐচ্ছিক)</span>
                  </label>
                  <input
                    type="text"
                    value={form.fatherName}
                    onChange={(e) => setForm({ ...form, fatherName: e.target.value })}
                    placeholder="পিতার নাম লিখুন (ঐচ্ছিক)"
                    className="w-full border rounded-lg p-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ফোন নম্বর *</label>
                  <input
                    type="text"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="০১৭XX-XXXXXX"
                    className="w-full border rounded-lg p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ঠিকানা</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="বর্তমান/স্থায়ী ঠিকানা"
                    className="w-full border rounded-lg p-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">যোগদানের তারিখ</label>
                  <input
                    type="date"
                    value={form.joiningDate}
                    onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
                    className="w-full border rounded-lg p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">মাসিক মূল বেতন (৳) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={form.monthlyBasicSalary}
                    onChange={(e) => setForm({ ...form, monthlyBasicSalary: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg p-2 text-xs font-bold text-emerald-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">স্বাভাবিক কর্মঘণ্টা</label>
                  <input
                    type="number"
                    value={form.standardMonthlyHours}
                    onChange={(e) => setForm({ ...form, standardMonthlyHours: parseInt(e.target.value, 10) || 208 })}
                    className="w-full border rounded-lg p-2 text-xs"
                  />
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
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-600"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Employee Confirmation Modal */}
      <ConfirmModal
        isOpen={!!empToDelete}
        title="কর্মচারী মুছে ফেলা / নিষ্ক্রিয় করা"
        message={`আপনি কি নিশ্চিত যে "${empToDelete?.name}" কর্মচারীর প্রোফাইল নিষ্ক্রিয় বা মুছে ফেলতে চান?`}
        onConfirm={() => {
          if (empToDelete) {
            deleteEmployee(empToDelete.id);
            if (selectedEmpId === empToDelete.id) {
              setSelectedEmpId(null);
            }
            setEmpToDelete(null);
          }
        }}
        onCancel={() => setEmpToDelete(null)}
      />

      {/* Delete Advance Confirmation Modal */}
      <ConfirmModal
        isOpen={!!advanceToDelete}
        title="অগ্রিম রেকর্ড মুছে ফেলা"
        message={`আপনি কি নিশ্চিত যে এই ${formatCurrency(advanceToDelete?.amount || 0, lang)} টাকার অগ্রিম রেকর্ডটি মুছে ফেলতে চান?`}
        onConfirm={() => {
          if (advanceToDelete) {
            deleteAdvance(advanceToDelete.id);
            if (selectedAdvanceSlip?.id === advanceToDelete.id) {
              setSelectedAdvanceSlip(null);
            }
            setAdvanceToDelete(null);
          }
        }}
        onCancel={() => setAdvanceToDelete(null)}
      />

      {/* Employee ID Card Generator Modal */}
      {selectedCardEmp && (
        <EmployeeIdCardModal
          employee={selectedCardEmp}
          settings={db.settings}
          isOpen={!!selectedCardEmp}
          onClose={() => setSelectedCardEmp(null)}
        />
      )}
    </div>
  );
};
