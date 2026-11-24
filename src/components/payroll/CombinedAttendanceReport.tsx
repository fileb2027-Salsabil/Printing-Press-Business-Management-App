import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import {
  calculateSalary,
  formatCurrency,
  getDaysInMonth,
  roundToTwo,
  toBanglaDigits,
  sortEmployeesByDesignation,
} from '../../utils/calculations';
import { translations } from '../../utils/i18n';
import { PrintHeader, PrintSignatures, triggerPrint } from '../common/PrintHeader';
import { SmartNumberInput } from '../common/SmartNumberInput';
import {
  Layers,
  Calendar,
  Printer,
  Download,
  Search,
  Filter,
  CheckCircle,
} from 'lucide-react';

export const CombinedAttendanceReport: React.FC = () => {
  const { db, getEmployeeAdvanceBalance } = useDatabase();
  const lang = db.settings.language;
  const t = translations[lang];

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [search, setSearch] = useState('');

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const monthString = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  const activeEmployees = sortEmployeesByDesignation(db.employees.filter((e) => e.isActive));

  // Compute metrics for all employees
  const reportData = activeEmployees.map((emp) => {
    const empAttendance = db.attendance.filter(
      (a) => a.employeeId === emp.id && a.date.startsWith(monthString)
    );
    const presentCount = empAttendance.filter((a) => a.status === 'present').length;
    const otHours = empAttendance.reduce((sum, a) => sum + (a.otHours || 0), 0);
    const advanceDue = getEmployeeAdvanceBalance(emp.id);

    const calc = calculateSalary({
      monthlyBasicSalary: emp.monthlyBasicSalary,
      daysInMonth,
      presentDays: presentCount,
      otHours,
      standardDailyOtHours: 5,
      otRatePercent: emp.otRatePercent || db.settings.defaultOtRatePercent || 70,
      advanceDeduction: advanceDue,
    });

    return {
      emp,
      calc,
      otHours,
      advanceDue,
    };
  });

  const filteredData = reportData.filter(
    (row) =>
      row.emp.name.toLowerCase().includes(search.toLowerCase()) ||
      row.emp.designation.toLowerCase().includes(search.toLowerCase()) ||
      row.emp.employeeId.toLowerCase().includes(search.toLowerCase())
  );

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Employee ID',
      'Name',
      'Designation',
      'Basic Salary',
      'Days in Month',
      'Present Days',
      'Absent Days',
      'Daily Rate',
      'Attendance Salary',
      'Attendance Bonus',
      'Total Attendance Pay',
      'OT Hours',
      'OT Rate',
      'OT Pay',
      'Advance Deduction',
      'Net Payable',
    ];

    const rows = filteredData.map((r) => [
      r.emp.employeeId,
      r.emp.name,
      r.emp.designation,
      r.emp.monthlyBasicSalary,
      daysInMonth,
      r.calc.presentDays,
      r.calc.absentDays,
      r.calc.dailyRate,
      r.calc.attendanceSalary,
      r.calc.attendanceBonus,
      r.calc.attendancePay,
      r.otHours,
      r.calc.hourlyOtRate,
      r.calc.otPay,
      r.advanceDue,
      r.calc.netPayable,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_OT_Report_${monthString}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalBasic = filteredData.reduce((s, r) => s + r.emp.monthlyBasicSalary, 0);
  const totalAttendancePay = filteredData.reduce((s, r) => s + r.calc.attendancePay, 0);
  const totalBonus = filteredData.reduce((s, r) => s + r.calc.attendanceBonus, 0);
  const totalOtHours = filteredData.reduce((s, r) => s + (r.calc.otPay > 0 ? (r.calc.otPay / r.calc.hourlyOtRate) : 0), 0);
  const totalOtPay = filteredData.reduce((s, r) => s + r.calc.otPay, 0);
  const totalAdvances = filteredData.reduce((s, r) => s + r.advanceDue, 0);
  const totalNetPayable = filteredData.reduce((s, r) => s + r.calc.netPayable, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.navCombinedAttendance}</h2>
          <p className="text-xs text-slate-500">
            সকল কর্মচারীর সমন্বিত হাজিরা, ওভারটাইম (৭০%) ও বোনাস বিবরণী | মাস: {monthString}
          </p>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            <span>CSV এক্সপোর্ট</span>
          </button>
          <button
            onClick={() => triggerPrint()}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>প্রিন্ট রিপোর্ট</span>
          </button>
        </div>
      </div>

      <div className="print-area space-y-4">
        <div className="print-only">
          <PrintHeader
            title="সম্মিলিত কর্মচারী হাজিরা ও ওভারটাইম (OT) রিপোর্ট"
            subtitle={`মাস: ${monthString} (${daysInMonth} দিন, OT বেস: ${daysInMonth * 5} ঘণ্টা) | সর্বমোট নিট প্রদেয়: ${formatCurrency(totalNetPayable, lang)}`}
          />
        </div>

      {/* Filter and Date selection */}
      <div className="no-print bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-emerald-700" />
          <span className="text-xs font-bold text-slate-700">মাস ও বছর:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            className="border rounded p-1.5 text-xs font-bold text-slate-800"
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
              <option key={m.val} value={m.val}>{m.name}</option>
            ))}
          </select>

          <SmartNumberInput
            integer
            min={2000}
            max={2100}
            fallbackOnBlur={new Date().getFullYear()}
            value={selectedYear}
            onValueChange={(val) => {
              if (val >= 2000 && val <= 2100) setSelectedYear(val);
            }}
            className="border rounded p-1.5 text-xs font-bold w-20 text-center"
          />
        </div>

        <div className="flex-1 max-w-xs flex items-center space-x-2 px-2 bg-slate-50 border rounded-xl">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="কর্মচারীর নাম বা পদবি..."
            className="w-full text-xs py-1.5 outline-none bg-transparent"
          />
        </div>
      </div>

      {/* Master Combined Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b">
              <tr>
                <th className="p-3">কর্মচারীর নাম</th>
                <th className="p-3">পদবি</th>
                <th className="p-3 text-right">মূল বেতন (৳)</th>
                <th className="p-3 text-center">উপস্থিতি (A)</th>
                <th className="p-3 text-center">অনুপস্থিতি (D)</th>
                <th className="p-3 text-right">দৈনিক হার (R)</th>
                <th className="p-3 text-right">হাজিরা বেতন</th>
                <th className="p-3 text-right">বোনাস (২ দিন)</th>
                <th className="p-3 text-center">OT ঘণ্টা</th>
                <th className="p-3 text-right">OT রেট (৭০%)</th>
                <th className="p-3 text-right">OT টাকা</th>
                <th className="p-3 text-right">অগ্রিম কর্তন</th>
                <th className="p-3 text-right font-black text-slate-900">নিট প্রদেয় বেতন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-slate-400">
                    কোনো কর্মচারী পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredData.map(({ emp, calc, advanceDue }) => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-bold text-slate-900">
                      <div>{emp.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{emp.employeeId}</div>
                    </td>
                    <td className="p-3 text-slate-600">{emp.designation}</td>
                    <td className="p-3 text-right font-semibold">{formatCurrency(emp.monthlyBasicSalary, lang)}</td>
                    <td className="p-3 text-center font-bold text-emerald-700">
                      {calc.presentDays} <span className="text-[10px] text-slate-400">/ {daysInMonth}</span>
                    </td>
                    <td className="p-3 text-center font-bold text-rose-600">{calc.absentDays}</td>
                    <td className="p-3 text-right text-slate-500 font-mono">৳{calc.dailyRate}</td>
                    <td className="p-3 text-right font-semibold">{formatCurrency(calc.attendanceSalary, lang)}</td>
                    <td className="p-3 text-right font-bold text-emerald-700">
                      {calc.attendanceBonus > 0 ? (
                        <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                          +{formatCurrency(calc.attendanceBonus, lang)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-amber-800">
                      {calc.otPay > 0 ? `${roundToTwo(calc.otPay / calc.hourlyOtRate)}h` : '0h'}
                    </td>
                    <td className="p-3 text-right text-slate-500 font-mono">৳{calc.hourlyOtRate}/h</td>
                    <td className="p-3 text-right font-semibold text-amber-700">{formatCurrency(calc.otPay, lang)}</td>
                    <td className="p-3 text-right font-bold text-purple-700">
                      {advanceDue > 0 ? `- ${formatCurrency(advanceDue, lang)}` : '-'}
                    </td>
                    <td className="p-3 text-right font-black text-slate-900 text-sm bg-slate-50/50">
                      {formatCurrency(calc.netPayable, lang)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-100 font-bold border-t text-slate-900">
              <tr>
                <td colSpan={2} className="p-3 text-right">সর্বমোট:</td>
                <td className="p-3 text-right">{formatCurrency(totalBasic, lang)}</td>
                <td colSpan={3}></td>
                <td className="p-3 text-right">{formatCurrency(totalAttendancePay, lang)}</td>
                <td className="p-3 text-right text-emerald-800">{formatCurrency(totalBonus, lang)}</td>
                <td colSpan={2}></td>
                <td className="p-3 text-right text-amber-800">{formatCurrency(totalOtPay, lang)}</td>
                <td className="p-3 text-right text-purple-800">- {formatCurrency(totalAdvances, lang)}</td>
                <td className="p-3 text-right text-emerald-900 text-sm">{formatCurrency(totalNetPayable, lang)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="p-3 bg-slate-50 border-t text-[11px] text-slate-500">
          * বোনাসের নিয়ম: ঠিক ২৩ দিন উপস্থিত থাকলে অথবা পূর্ণ {daysInMonth} দিন উপস্থিত থাকলে ২ দিনের মূল বেতন অতিরিক্ত বোনাস। ওভারটাইম (OT) হার: সাধারণ দিন ৮ ঘণ্টা, OT তে দিন ধরা হয় ৫ ঘণ্টা (যেমন ৩০ দিনে ১৫০ ঘণ্টা, ৩১ দিনে ১৫৫ ঘণ্টা) অনুযায়ী মূল বেতনের ৭০%।
        </div>

        <div className="print-only p-4">
          <PrintSignatures />
        </div>
      </div>
    </div>
  </div>
  );
};
