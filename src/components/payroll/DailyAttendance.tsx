import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { AttendanceRecord, AttendanceStatus } from '../../types';
import {
  getDaysInMonth,
  formatDate,
  toBanglaDigits,
  calculateOtHoursFromShift,
  sortEmployeesByDesignation,
} from '../../utils/calculations';
import { translations } from '../../utils/i18n';
import { PrintHeader, PrintSignatures, triggerPrint } from '../common/PrintHeader';
import { SmartNumberInput } from '../common/SmartNumberInput';
import {
  CalendarCheck,
  Calendar,
  Check,
  X,
  Clock,
  Printer,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  CheckCircle2,
  Trash2,
  Plus,
  Sparkles,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

export const DailyAttendance: React.FC = () => {
  const { db, recordAttendance, updateSettings, updateEmployee, isReadOnly } = useDatabase();
  const lang = db.settings.language;
  const t = translations[lang];

  const dayNamesBn = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1); // 1-12
  const [selectedDay, setSelectedDay] = useState<number>(now.getDate());

  // Modal for attendance details
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState({
    employeeId: '',
    date: '',
    status: 'present' as AttendanceStatus,
    checkInTime: '09:00',
    checkOutTime: '18:00',
    otHours: 0,
    notes: '',
  });

  // Modal for managing Government Holidays (সরকারী ছুটি)
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [holidayForm, setHolidayForm] = useState({
    date: '',
    name: 'সরকারী ছুটি',
  });

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const monthString = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const currentDateString = `${monthString}-${String(selectedDay).padStart(2, '0')}`;

  const activeEmployees = sortEmployeesByDesignation(db.employees.filter((e) => e.isActive));

  // Click behavior mode (supports 1-tap attendance toggle OR 1-tap OT/detail entry on mobile & PC)
  const [cellClickMode, setCellClickMode] = useState<'toggle' | 'ot'>('toggle');
  const longPressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = React.useRef<boolean>(false);

  // Modal for Bulk Overtime (সবার বা নির্বাচিতদের একবারে ওভারটাইম দেওয়া)
  const [isBulkOtModalOpen, setIsBulkOtModalOpen] = useState(false);
  const [bulkOtDate, setBulkOtDate] = useState(currentDateString);
  const [bulkOtHours, setBulkOtHours] = useState<number>(2);
  const [selectedOtEmpIds, setSelectedOtEmpIds] = useState<string[]>([]);
  const [bulkOtSuccess, setBulkOtSuccess] = useState('');

  // Modal for Reordering Employees (কর্মচারীদের ক্রম/সিরিয়াল আগে বা পরে দেওয়া)
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);

  // Handle Bulk OT Submit
  const handleApplyBulkOt = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!bulkOtDate || bulkOtHours < 0 || isNaN(bulkOtHours) || selectedOtEmpIds.length === 0) return;

    selectedOtEmpIds.forEach((empId) => {
      const emp = db.employees.find((e) => e.id === empId);
      if (!emp) return;
      const existing = db.attendance.find((a) => a.employeeId === empId && a.date === bulkOtDate);

      recordAttendance({
        employeeId: emp.id,
        employeeName: emp.name,
        date: bulkOtDate,
        status: existing?.status || 'present',
        otHours: bulkOtHours,
        checkInTime: existing?.checkInTime || '09:00',
        checkOutTime: existing?.checkOutTime || '18:00',
        notes: existing?.notes || 'একবারে দেওয়া ওভারটাইম',
      });
    });

    setBulkOtSuccess(`সফলভাবে ${selectedOtEmpIds.length} জন কর্মচারীর ${formatDate(bulkOtDate, lang)} তারিখের জন্য ${bulkOtHours} ঘণ্টা ওভারটাইম সংরক্ষণ হয়েছে!`);
    setTimeout(() => {
      setBulkOtSuccess('');
      setIsBulkOtModalOpen(false);
    }, 1500);
  };

  // Toggle selection of all employees for OT
  const handleToggleSelectAllOt = () => {
    if (selectedOtEmpIds.length === activeEmployees.length) {
      setSelectedOtEmpIds([]);
    } else {
      setSelectedOtEmpIds(activeEmployees.map((e) => e.id));
    }
  };

  // Handle moving an employee up or down in the sequence
  const handleMoveEmployee = (empId: string, direction: 'up' | 'down') => {
    if (isReadOnly) return;
    const currentIndex = activeEmployees.findIndex((e) => e.id === empId);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= activeEmployees.length) return;

    const reordered = [...activeEmployees];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    reordered.forEach((emp, idx) => {
      updateEmployee(emp.id, { sortOrder: idx + 1 });
    });
  };

  const handleResetEmployeeOrder = () => {
    if (isReadOnly) return;
    activeEmployees.forEach((emp) => {
      updateEmployee(emp.id, { sortOrder: undefined });
    });
  };

  // Government holiday actions
  const handleSaveHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!holidayForm.date) return;
    const currentHolidays = { ...(db.settings.governmentHolidays || {}) };
    currentHolidays[holidayForm.date] = holidayForm.name.trim() || 'সরকারী ছুটি';
    updateSettings({ governmentHolidays: currentHolidays });
    setHolidayForm({ date: '', name: 'সরকারী ছুটি' });
  };

  const handleRemoveHoliday = (dateKey: string) => {
    if (isReadOnly) return;
    const currentHolidays = { ...(db.settings.governmentHolidays || {}) };
    delete currentHolidays[dateKey];
    updateSettings({ governmentHolidays: currentHolidays });
  };

  const handleOpenHolidayForDay = (day: number) => {
    if (isReadOnly) return;
    const dateStr = `${monthString}-${String(day).padStart(2, '0')}`;
    const existingName = db.settings.governmentHolidays?.[dateStr] || 'সরকারী ছুটি';
    setHolidayForm({ date: dateStr, name: existingName });
    setIsHolidayModalOpen(true);
  };

  const handleAddNationalHolidays = () => {
    if (isReadOnly) return;
    const nationalHolidays: Record<string, string> = {
      [`${selectedYear}-02-21`]: 'শহীদ দিবস ও আন্তর্জাতিক মাতৃভাষা দিবস',
      [`${selectedYear}-03-20`]: 'পবিত্র শব-ই-কদর',
      [`${selectedYear}-03-21`]: 'পবিত্র ঈদুল ফিতর',
      [`${selectedYear}-03-22`]: 'পবিত্র ঈদুল ফিতর (ছুটি)',
      [`${selectedYear}-03-26`]: 'স্বাধীনতা ও জাতীয় দিবস',
      [`${selectedYear}-04-14`]: 'পহেলা বৈশাখ (বাংলা নববর্ষ)',
      [`${selectedYear}-05-01`]: 'মে দিবস (আন্তর্জাতিক শ্রমিক দিবস)',
      [`${selectedYear}-05-28`]: 'পবিত্র ঈদুল আযহা',
      [`${selectedYear}-05-29`]: 'পবিত্র ঈদুল আযহা (ছুটি)',
      [`${selectedYear}-10-20`]: 'শুভ দুর্গাপূজা (বিজয়া দশমী)',
      [`${selectedYear}-12-16`]: 'মহান বিজয় দিবস',
      [`${selectedYear}-12-25`]: 'যিশু খ্রিস্টের জন্মদিন (বড়দিন)',
    };
    const current = { ...(db.settings.governmentHolidays || {}) };
    updateSettings({ governmentHolidays: { ...current, ...nationalHolidays } });
  };

  // Quick single-click toggle status for a specific day
  const handleToggleStatus = (employeeId: string, day: number) => {
    if (isReadOnly) return;
    const dateStr = `${monthString}-${String(day).padStart(2, '0')}`;
    const emp = db.employees.find((e) => e.id === employeeId);
    if (!emp) return;

    const existing = db.attendance.find(
      (a) => a.employeeId === employeeId && a.date === dateStr
    );

    const nextStatus: AttendanceStatus =
      !existing || existing.status === 'absent' || existing.status === 'holiday' || existing.status === 'leave'
        ? 'present'
        : 'absent';

    recordAttendance({
      employeeId,
      employeeName: emp.name,
      date: dateStr,
      status: nextStatus,
      otHours: existing?.otHours || 0,
      checkInTime: existing?.checkInTime,
      checkOutTime: existing?.checkOutTime,
      notes: existing?.notes,
    });
  };

  // Open modal for detailed edit
  const handleOpenDetailModal = (employeeId: string, day: number) => {
    if (isReadOnly) return;
    const dateStr = `${monthString}-${String(day).padStart(2, '0')}`;
    const existing = db.attendance.find(
      (a) => a.employeeId === employeeId && a.date === dateStr
    );

    setModalForm({
      employeeId,
      date: dateStr,
      status: existing?.status || 'present',
      checkInTime: existing?.checkInTime || '09:00',
      checkOutTime: existing?.checkOutTime || '18:00',
      otHours: existing?.otHours || 0,
      notes: existing?.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleCellTouchStart = (employeeId: string, day: number) => {
    if (isReadOnly) return;
    longPressFiredRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      handleOpenDetailModal(employeeId, day);
    }, 420);
  };

  const handleCellTouchCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleCellClick = (employeeId: string, day: number) => {
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }
    if (isReadOnly) return;
    if (cellClickMode === 'ot') {
      handleOpenDetailModal(employeeId, day);
    } else {
      handleToggleStatus(employeeId, day);
    }
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    const emp = db.employees.find((e) => e.id === modalForm.employeeId);
    if (!emp) return;

    recordAttendance({
      ...modalForm,
      employeeName: emp.name,
    });
    setIsModalOpen(false);
  };

  // Mark all active employees present for the selected day
  const handleMarkAllPresent = () => {
    if (isReadOnly) return;
    for (const emp of activeEmployees) {
      recordAttendance({
        employeeId: emp.id,
        employeeName: emp.name,
        date: currentDateString,
        status: 'present',
        otHours: 0,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.dailyAttendance}</h2>
          <p className="text-xs text-slate-500">
            মাস: {monthString} (মোট {daysInMonth} দিন) | সক্রিয় কর্মী: {activeEmployees.length} জন | শুক্রবার ও সরকারী ছুটি চিহ্নিত
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isReadOnly && (
            <>
              <button
                onClick={() => {
                  setBulkOtDate(currentDateString);
                  setBulkOtHours(2);
                  setSelectedOtEmpIds(activeEmployees.map((e) => e.id));
                  setIsBulkOtModalOpen(true);
                }}
                className="px-3.5 py-2 bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition shadow-2xs"
              >
                <Clock className="w-4 h-4 text-amber-700" />
                <span>একবারে ওভারটাইম দিন (Bulk OT)</span>
              </button>
              <button
                onClick={() => setIsReorderModalOpen(true)}
                className="px-3.5 py-2 bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition"
              >
                <ArrowUpDown className="w-4 h-4 text-slate-600" />
                <span>সিরিয়াল ক্রম সাজান</span>
              </button>
              <button
                onClick={() => {
                  setHolidayForm({ date: currentDateString, name: 'সরকারী ছুটি' });
                  setIsHolidayModalOpen(true);
                }}
                className="px-3.5 py-2 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition"
              >
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>সরকারী ছুটি নির্ধারণ</span>
              </button>
              <button
                onClick={handleMarkAllPresent}
                className="px-3.5 py-2 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>আজকের তারিখে সকলকে উপস্থিত মার্ক করুন</span>
              </button>
            </>
          )}
          <button
            onClick={() => triggerPrint()}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>হাজিরা শিট প্রিন্ট</span>
          </button>
        </div>
      </div>

      <div className="print-area space-y-4">
        <div className="print-only">
          <PrintHeader
            title="মাসিক কর্মচারী হাজিরা শিট (Attendance Sheet)"
            subtitle={`মাস: ${monthString} | মোট দিন: ${daysInMonth} দিন | শুক্রবার ও সরকারী ছুটি চিহ্নিত`}
          />
        </div>

        {/* Month & Year Selector Bar */}
        <div className="no-print bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span className="text-xs font-bold text-slate-700">মাস ও বছর নির্বাচন:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="border rounded p-1.5 text-xs font-bold text-slate-800"
            >
              {[
                { val: 1, name: 'জানুয়ারি (January)' },
                { val: 2, name: 'ফেব্রুয়ারি (February)' },
                { val: 3, name: 'মার্চ (March)' },
                { val: 4, name: 'এপ্রিল (April)' },
                { val: 5, name: 'মে (May)' },
                { val: 6, name: 'জুন (June)' },
                { val: 7, name: 'জুলাই (July)' },
                { val: 8, name: 'আগস্ট (August)' },
                { val: 9, name: 'সেপ্টেম্বর (September)' },
                { val: 10, name: 'অক্টোবর (October)' },
                { val: 11, name: 'নভেম্বর (November)' },
                { val: 12, name: 'ডিসেম্বর (December)' },
              ].map((m) => (
                <option key={m.val} value={m.val}>{m.name}</option>
              ))}
            </select>

            <SmartNumberInput
              integer
              min={2000}
              max={2100}
              fallbackOnBlur={now.getFullYear()}
              value={selectedYear}
              onValueChange={(val) => {
                if (val >= 2000 && val <= 2100) setSelectedYear(val);
              }}
              className="border rounded p-1.5 text-xs font-bold w-20 text-center"
            />
          </div>

          {!isReadOnly && (
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1">
              <button
                type="button"
                onClick={() => setCellClickMode('toggle')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                  cellClickMode === 'toggle'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Check className="w-3 h-3" />
                <span>হাজিরা টগল</span>
              </button>
              <button
                type="button"
                onClick={() => setCellClickMode('ot')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                  cellClickMode === 'ot'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>ওভারটাইম (OT) এন্ট্রি</span>
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center space-x-1">
              <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span>
              <span className="text-slate-600">উপস্থিত (✓)</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-3 h-3 rounded bg-rose-500 inline-block"></span>
              <span className="text-slate-600">অনুপস্থিত (✕)</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-3 h-3 rounded bg-rose-200 border border-rose-400 inline-block"></span>
              <span className="text-rose-700 font-bold">শুক্রবার (শুক্র)</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-3 h-3 rounded bg-indigo-200 border border-indigo-400 inline-block"></span>
              <span className="text-indigo-700 font-bold">সরকারী ছুটি (ছুটি)</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-3 h-3 rounded bg-amber-400 inline-block"></span>
              <span className="text-slate-600">ওভারটাইম (OT)</span>
            </span>
          </div>
        </div>

        {/* Attendance Master Grid (1 to M) */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                <tr>
                  <th className="p-2.5 sticky left-0 bg-slate-100 z-10 min-w-[140px] border-r">কর্মচারী</th>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                    const dateStr = `${monthString}-${String(d).padStart(2, '0')}`;
                    const dayOfWeek = new Date(selectedYear, selectedMonth - 1, d).getDay();
                    const isFriday = dayOfWeek === 5;
                    const govtHolidayName = db.settings.governmentHolidays?.[dateStr];
                    const isGovtHoliday = !!govtHolidayName;

                    return (
                      <th
                        key={d}
                        onClick={() => handleOpenHolidayForDay(d)}
                        className={`p-1 text-center min-w-[36px] border-r select-none cursor-pointer transition hover:brightness-95 ${
                          isFriday
                            ? 'bg-rose-100 text-rose-950 font-black border-rose-300'
                            : isGovtHoliday
                            ? 'bg-indigo-100 text-indigo-950 font-black border-indigo-300 ring-1 ring-inset ring-indigo-400'
                            : d === selectedDay
                            ? 'bg-emerald-100 text-emerald-900 font-black'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                        title={
                          isFriday
                            ? 'শুক্রবার (সাপ্তাহিক ছুটি) - ক্লিক করে ছুটি নির্ধারণ বা পরিবর্তন করুন'
                            : isGovtHoliday
                            ? `সরকারী ছুটি: ${govtHolidayName} - ক্লিক করে পরিবর্তন বা বাতিল করুন`
                            : `${d} তারিখ (${dayNamesBn[dayOfWeek]}) - ক্লিক করে সরকারী ছুটি হিসেবে যোগ করুন`
                        }
                      >
                        <div className="font-black text-xs leading-none">{d}</div>
                        <div className="mt-1 flex justify-center">
                          {isFriday ? (
                            <span className="text-[8px] font-black px-1 py-0.5 rounded bg-rose-200 text-rose-900 leading-none">
                              শুক্র
                            </span>
                          ) : isGovtHoliday ? (
                            <span className="text-[8px] font-black px-1 py-0.5 rounded bg-indigo-200 text-indigo-900 leading-none">
                              ছুটি
                            </span>
                          ) : (
                            <span className="text-[8.5px] font-medium text-slate-400 leading-none">
                              {dayNamesBn[dayOfWeek]}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                <th className="p-2.5 text-center min-w-[50px] bg-slate-100 border-l font-bold text-emerald-800">মোট উপস্থিত</th>
                <th className="p-2.5 text-center min-w-[50px] bg-slate-100 border-l font-bold text-rose-800">মোট অনুপস্থিত</th>
                <th className="p-2.5 text-center min-w-[50px] bg-slate-100 border-l font-bold text-amber-800">মোট OT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {activeEmployees.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth + 4} className="p-8 text-center text-slate-400">
                    কোনো সক্রিয় কর্মচারী নেই। কর্মচারী মেনু থেকে কর্মচারী যোগ করুন।
                  </td>
                </tr>
              ) : (
                activeEmployees.map((emp) => {
                  let presentCount = 0;
                  let absentCount = 0;
                  let totalOt = 0;

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 transition">
                      <td className="p-2 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r font-bold text-slate-900 min-w-[170px] max-w-[210px]">
                        <div className="flex items-center justify-between">
                          <div className="truncate mr-1">
                            <div className="truncate text-slate-900">{emp.name}</div>
                            <div className="text-[10px] text-slate-400 font-normal truncate">{emp.designation}</div>
                          </div>
                          {!isReadOnly && (
                            <div className="no-print flex items-center space-x-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveEmployee(emp.id, 'up');
                                }}
                                title="আগে দিন (উপরে নিন)"
                                className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded transition"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveEmployee(emp.id, 'down');
                                }}
                                title="পরে দিন (নিচে নিন)"
                                className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded transition"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                        const dateStr = `${monthString}-${String(d).padStart(2, '0')}`;
                        const dayOfWeek = new Date(selectedYear, selectedMonth - 1, d).getDay();
                        const isFriday = dayOfWeek === 5;
                        const govtHolidayName = db.settings.governmentHolidays?.[dateStr];
                        const isGovtHoliday = !!govtHolidayName;

                        const record = db.attendance.find(
                          (a) => a.employeeId === emp.id && a.date === dateStr
                        );

                        const isPresent = record?.status === 'present';
                        const isExplicitAbsent = record?.status === 'absent';

                        if (isPresent) presentCount++;
                        if (record?.otHours) totalOt += record.otHours;

                        return (
                          <td
                            key={d}
                            onDoubleClick={() => handleOpenDetailModal(emp.id, d)}
                            onClick={() => handleCellClick(emp.id, d)}
                            onTouchStart={() => handleCellTouchStart(emp.id, d)}
                            onTouchEnd={handleCellTouchCancel}
                            onTouchMove={handleCellTouchCancel}
                            onTouchCancel={handleCellTouchCancel}
                            onContextMenu={(e) => {
                              if (!isReadOnly) {
                                e.preventDefault();
                                handleOpenDetailModal(emp.id, d);
                              }
                            }}
                            className={`p-0.5 text-center border-r select-none transition ${isReadOnly ? 'cursor-default' : 'cursor-pointer'} ${
                              isPresent
                                ? isFriday
                                  ? 'bg-emerald-100 text-emerald-950 font-black hover:bg-emerald-200'
                                  : isGovtHoliday
                                  ? 'bg-emerald-100 text-emerald-950 font-black hover:bg-emerald-200'
                                  : 'bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100'
                                : isFriday
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold'
                                : isGovtHoliday
                                ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold'
                                : isExplicitAbsent
                                ? 'bg-rose-50 text-rose-600 font-bold hover:bg-rose-100'
                                : 'text-slate-300 hover:bg-slate-100'
                            }`}
                            title={
                              isPresent
                                ? `${emp.name}: ${
                                    isFriday
                                      ? 'শুক্রবারে উপস্থিত ✓ (ক্লিক করে পরিবর্তন করুন)'
                                      : isGovtHoliday
                                      ? `সরকারী ছুটিতে (${govtHolidayName}) উপস্থিত ✓ (ক্লিক করে পরিবর্তন করুন)`
                                      : 'উপস্থিত ✓'
                                  }`
                                : isFriday
                                ? `${emp.name}: শুক্রবার (অনুপস্থিত/ছুটি ✕ - ক্লিক করে উপস্থিত করুন)`
                                : isGovtHoliday
                                ? `${emp.name}: সরকারী ছুটি (${govtHolidayName}) - অনুপস্থিত ✕ (ক্লিক করে উপস্থিত করুন)`
                                : `${emp.name}: অনুপস্থিত ✕`
                            }
                          >
                            <div className="flex flex-col items-center justify-center min-h-[30px] py-0.5">
                              {isPresent ? (
                                <div className="flex flex-col items-center leading-none">
                                  <span className="font-black text-xs text-emerald-800">✓</span>
                                  {isFriday ? (
                                    <span className="text-[7px] font-black text-emerald-900 bg-emerald-200 px-1 py-0.5 rounded leading-none mt-0.5">
                                      উপস্থিত
                                    </span>
                                  ) : isGovtHoliday ? (
                                    <span className="text-[7px] font-black text-indigo-900 bg-indigo-200 px-1 py-0.5 rounded leading-none mt-0.5">
                                      উপস্থিত
                                    </span>
                                  ) : null}
                                </div>
                              ) : (
                                <div className="flex flex-col items-center leading-none">
                                  <span className={`font-black text-xs ${isFriday ? 'text-rose-600' : isGovtHoliday ? 'text-indigo-600' : 'text-rose-500'}`}>
                                    ✕
                                  </span>
                                  {isFriday ? (
                                    <span className="text-[7px] font-bold text-rose-700 bg-rose-100 px-1 py-0.5 rounded leading-none mt-0.5">
                                      অনুপস্থিত
                                    </span>
                                  ) : isGovtHoliday ? (
                                    <span className="text-[7px] font-bold text-indigo-700 bg-indigo-100 px-1 py-0.5 rounded leading-none mt-0.5">
                                      অনুপস্থিত
                                    </span>
                                  ) : null}
                                </div>
                              )}
                              {record?.otHours ? (
                                <span className="text-[8px] bg-amber-200 text-amber-900 font-bold px-0.5 rounded leading-none mt-0.5">
                                  {record.otHours}h
                                </span>
                              ) : null}
                            </div>
                          </td>
                        );
                      })}

                      <td className="p-2 text-center border-l font-bold text-emerald-700 bg-emerald-50/30">
                        {presentCount}
                      </td>
                      <td className="p-2 text-center border-l font-bold text-rose-600 bg-rose-50/30">
                        {daysInMonth - presentCount}
                      </td>
                      <td className="p-2 text-center border-l font-mono font-bold text-amber-700 bg-amber-50/30">
                        {totalOt}h
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50 border-t text-[11px] text-slate-500 flex flex-wrap justify-between gap-2">
          <span>* ঘরে ১-ক্লিক করলে উপস্থিত/অনুপস্থিত টগল হবে। ডাবল-ক্লিক, মোবাইলে চেপে ধরে অথবা উপরের "ওভারটাইম (OT) এন্ট্রি" মোডে ১-ট্যাপ করে সময় ও OT দিন।</span>
          <span>হাজিরা বোনাস ২৩ দিন বা পূর্ণ মাসের উপস্থিতিতে স্বয়ংক্রিয় গণনা হবে।</span>
        </div>

        <div className="print-only p-4">
          <PrintSignatures />
        </div>
      </div>
    </div>

      {/* Modal: Detailed Attendance & OT entry */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border my-auto max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-3">
              হাজিরা ও OT বিস্তারিত এন্ট্রি
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              তারিখ: <b>{modalForm.date}</b>
            </p>
            <form onSubmit={handleSaveModal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">হাজিরা স্ট্যাটাস</label>
                <select
                  value={modalForm.status}
                  onChange={(e) => setModalForm({ ...modalForm, status: e.target.value as any })}
                  className="w-full border rounded-lg p-2 text-xs font-bold"
                >
                  <option value="present">✓ উপস্থিত (Present)</option>
                  <option value="absent">✕ অনুপস্থিত (Absent)</option>
                  <option value="leave">ছুটি (Leave)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">উপস্থিতির সময়</label>
                  <input
                    type="time"
                    value={modalForm.checkInTime}
                    onChange={(e) => setModalForm({ ...modalForm, checkInTime: e.target.value })}
                    className="w-full border rounded p-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">প্রস্থানের সময়</label>
                  <input
                    type="time"
                    value={modalForm.checkOutTime}
                    onChange={(e) => setModalForm({ ...modalForm, checkOutTime: e.target.value })}
                    className="w-full border rounded p-1.5 text-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">ওভারটাইম ঘণ্টা (OT Hours)</label>
                  <button
                    type="button"
                    onClick={() =>
                      setModalForm((prev) => ({
                        ...prev,
                        otHours: calculateOtHoursFromShift(prev.checkOutTime, prev.checkInTime),
                      }))
                    }
                    className="text-[10px] font-bold text-emerald-700 hover:underline"
                  >
                    সময় থেকে হিসাব করুন
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setModalForm((prev) => ({
                        ...prev,
                        otHours: Math.max(0, Math.round((prev.otHours - 0.5) * 10) / 10),
                      }))
                    }
                    className="px-2.5 py-2 border rounded-lg text-xs font-black bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    −
                  </button>
                  <SmartNumberInput
                    min={0}
                    fallbackOnBlur={0}
                    value={modalForm.otHours}
                    onValueChange={(val) => setModalForm((prev) => ({ ...prev, otHours: val }))}
                    className="flex-1 border rounded-lg p-2 text-xs font-bold text-amber-800 text-center"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setModalForm((prev) => ({
                        ...prev,
                        otHours: Math.round((prev.otHours + 0.5) * 10) / 10,
                      }))
                    }
                    className="px-2.5 py-2 border rounded-lg text-xs font-black bg-amber-100 hover:bg-amber-200 text-amber-900"
                  >
                    +
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {Array.from({ length: 21 }, (_, h) => h).map((h) => (
                    <button
                      type="button"
                      key={h}
                      onClick={() => setModalForm((prev) => ({ ...prev, otHours: h }))}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold border transition ${
                        modalForm.otHours === h
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50'
                      }`}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">মন্তব্য</label>
                <input
                  type="text"
                  value={modalForm.notes}
                  onChange={(e) => setModalForm({ ...modalForm, notes: e.target.value })}
                  placeholder="যেমন: নাইট ডিউটি বা বিশেষ কাজ"
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

      {/* Modal: Government Holidays Management */}
      {isHolidayModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <span>সরকারী ছুটি নির্ধারণ ও ব্যবস্থাপনা</span>
              </h3>
              <button
                onClick={() => setIsHolidayModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between bg-indigo-100/70 p-3 rounded-xl border border-indigo-200">
              <div>
                <p className="text-xs font-bold text-indigo-950">জাতীয় সাধারণ ছুটিসমূহ</p>
                <p className="text-[11px] text-indigo-700">২১শে ফেব্রুয়ারি, ২৬শে মার্চ, ঈদ, পূজা, বিজয় দিবস ইত্যাদি</p>
              </div>
              <button
                type="button"
                onClick={handleAddNationalHolidays}
                className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold transition shrink-0 ml-2 shadow-xs"
              >
                সবগুলো যোগ করুন 🇧🇩
              </button>
            </div>

            <form onSubmit={handleSaveHoliday} className="space-y-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-200">
              <h4 className="text-xs font-bold text-indigo-900">নতুন ছুটি যোগ করুন</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">তারিখ *</label>
                  <input
                    type="date"
                    required
                    value={holidayForm.date}
                    onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                    className="w-full border rounded-lg p-2 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">ছুটির নাম *</label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: স্বাধীনতা দিবস"
                    value={holidayForm.name}
                    onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                    className="w-full border rounded-lg p-2 text-xs bg-white font-bold"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ছুটি হিসেবে চিহ্নিত করুন</span>
              </button>
            </form>

            {/* List of currently marked government holidays */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800">নির্ধারিত সরকারী ছুটির তালিকা:</h4>
              {Object.keys(db.settings.governmentHolidays || {}).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl">
                  এখনও কোনো সরকারী ছুটি নির্ধারণ করা হয়নি।
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border rounded-xl bg-white">
                  {Object.entries(db.settings.governmentHolidays || {})
                    .sort(([d1], [d2]) => d1.localeCompare(d2))
                    .map(([dateKey, holName]) => (
                      <div key={dateKey} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                        <div>
                          <span className="font-bold text-slate-900">{formatDate(dateKey, lang)}</span>
                          <span className="ml-2 text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                            {holName}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveHoliday(dateKey)}
                          className="text-rose-500 hover:text-rose-700 p-1 rounded"
                          title="ছুটি বাতিল করুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsHolidayModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900"
              >
                সম্পন্ন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Bulk Overtime (সবার বা নির্বাচিতদের একবারে ওভারটাইম দেওয়া) */}
      {isBulkOtModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <span>একবারে ওভারটাইম এন্ট্রি (Bulk Overtime)</span>
              </h3>
              <button
                onClick={() => setIsBulkOtModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bulkOtSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{bulkOtSuccess}</span>
              </div>
            )}

            <form onSubmit={handleApplyBulkOt} className="space-y-4">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">তারিখ নির্বাচন *</label>
                  <input
                    type="date"
                    required
                    value={bulkOtDate}
                    onChange={(e) => setBulkOtDate(e.target.value)}
                    className="w-full border rounded-lg p-2 text-xs font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ওভারটাইম ঘণ্টা (OT Hours) *</label>
                  <SmartNumberInput
                    min={0}
                    fallbackOnBlur={0}
                    required
                    value={bulkOtHours}
                    onValueChange={setBulkOtHours}
                    className="w-full border rounded-lg p-2 text-xs font-black text-amber-700 bg-white"
                  />
                </div>
                <div className="col-span-2 flex flex-wrap gap-1.5 pt-1 border-t">
                  <span className="text-[11px] text-slate-500 font-semibold self-center mr-1">দ্রুত ঘণ্টা নির্বাচন (০–২০):</span>
                  {Array.from({ length: 21 }, (_, h) => h).map((h) => (
                    <button
                      type="button"
                      key={h}
                      onClick={() => setBulkOtHours(h)}
                      className={`px-2 py-0.5 rounded text-xs font-bold border transition ${
                        bulkOtHours === h
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50'
                      }`}
                    >
                      {h} ঘণ্টা
                    </button>
                  ))}
                </div>
              </div>

              {/* Employee Selection: All or Pick Specific ones */}
              <div className="border rounded-xl p-3 bg-white space-y-2">
                <div className="flex items-center justify-between pb-1 border-b">
                  <span className="text-xs font-bold text-slate-800">
                    কর্মচারী নির্বাচন ({selectedOtEmpIds.length}/{activeEmployees.length} জন নির্বাচিত)
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleSelectAllOt}
                    className="text-xs font-bold text-emerald-700 hover:underline"
                  >
                    {selectedOtEmpIds.length === activeEmployees.length
                      ? 'সব বাতিল করুন'
                      : '✓ সবাইকে নির্বাচন করুন'}
                  </button>
                </div>

                <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 border rounded-lg">
                  {activeEmployees.map((emp) => {
                    const isSelected = selectedOtEmpIds.includes(emp.id);
                    return (
                      <label
                        key={emp.id}
                        className={`p-2 flex items-center justify-between cursor-pointer hover:bg-slate-50 text-xs transition ${
                          isSelected ? 'bg-amber-50/50 font-bold' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedOtEmpIds((prev) =>
                                isSelected ? prev.filter((id) => id !== emp.id) : [...prev, emp.id]
                              );
                            }}
                            className="rounded text-amber-600 focus:ring-amber-500"
                          />
                          <div>
                            <span className="text-slate-900 block">{emp.name}</span>
                            <span className="text-[10px] text-slate-400 font-normal">{emp.designation}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          বেতন: ৳{emp.monthlyBasicSalary}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsBulkOtModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={selectedOtEmpIds.length === 0}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ওভারটাইম সংরক্ষণ করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reorder Employees (সিরিয়াল ক্রম আগে/পরে পরিবর্তন) */}
      {isReorderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <ArrowUpDown className="w-5 h-5 text-emerald-700" />
                <span>কর্মচারীদের সিরিয়াল ক্রম সাজান</span>
              </h3>
              <button
                onClick={() => setIsReorderModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border">
              💡 পদবি অনুযায়ী সাজানো সিরিয়াল নিচে রয়েছে। আপনি চাইলে যে কোনো কর্মচারীর নাম <b>▲ আগে</b> বা <b>▼ পরে</b> স্থানান্তর করতে পারবেন।
            </p>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border rounded-xl bg-white">
              {activeEmployees.map((emp, idx) => (
                <div
                  key={emp.id}
                  className="p-2.5 flex items-center justify-between hover:bg-slate-50 text-xs transition"
                >
                  <div className="flex items-center space-x-2.5 truncate mr-2">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0 font-mono">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <p className="font-bold text-slate-900 truncate">{emp.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{emp.designation}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveEmployee(emp.id, 'up')}
                      className="px-2 py-1 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 disabled:opacity-30 rounded text-[11px] font-bold border transition flex items-center space-x-0.5"
                      title="উপরে নিন (আগে দিন)"
                    >
                      <ArrowUp className="w-3 h-3" />
                      <span>আগে</span>
                    </button>
                    <button
                      type="button"
                      disabled={idx === activeEmployees.length - 1}
                      onClick={() => handleMoveEmployee(emp.id, 'down')}
                      className="px-2 py-1 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 disabled:opacity-30 rounded text-[11px] font-bold border transition flex items-center space-x-0.5"
                      title="নিচে নিন (পরে দিন)"
                    >
                      <ArrowDown className="w-3 h-3" />
                      <span>পরে</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-2 border-t">
              <button
                type="button"
                onClick={handleResetEmployeeOrder}
                className="text-xs text-rose-600 hover:text-rose-800 font-bold hover:underline"
              >
                ডিফল্ট পদবি অনুযায়ী রিসেট করুন
              </button>
              <button
                type="button"
                onClick={() => setIsReorderModalOpen(false)}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold"
              >
                সম্পন্ন / বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
