/**
 * Makkah Printers Business & Accounting Calculation Engine
 * Updated with exact Makkah Printers Attendance Bonus (A >= 23 => 2*R)
 * and Overtime Rules (Regular work till 5:00 PM, Monthly OT = M * 5 hrs, Hourly OT = (B * 70%) / (M * 5)).
 */

import { formatAmountInWords, numberToBanglaWords, numberToEnglishWords } from './numberToWords';

export { formatAmountInWords, numberToBanglaWords, numberToEnglishWords };

export interface SalaryCalculationInput {
  monthlyBasicSalary: number; // B
  daysInMonth: number; // M
  presentDays: number; // A
  otHours?: number; // H (actual recorded OT hours)
  standardDailyOtHours?: number; // default 5 hrs/day
  standardMonthlyHours?: number; // optional custom standard monthly hours
  otRatePercent?: number; // default 70 (%)
  otherEarnings?: number;
  advanceDeduction?: number;
  otherDeductions?: number;
  previousSalaryPayments?: number;
}

export interface SalaryCalculationResult {
  daysInMonth: number; // M
  presentDays: number; // A
  absentDays: number; // D = M - A
  dailyRate: number; // R = B / M
  absenceDeduction: number; // D * R
  attendanceSalary: number; // A * R
  attendanceBonus: number; // 2 * R if A >= 23, else 0
  attendancePay: number; // attendanceSalary + attendanceBonus
  monthlyStandardOtHours: number; // M * 5
  monthlyOtAmount: number; // B * 70%
  hourlyOtRate: number; // (B * 70%) / (M * 5)
  otPay: number; // otHours * hourlyOtRate
  totalEarnedSalary?: number; // attendancePay + otPay
  netPayable: number; // attendancePay + otPay + otherEarnings - advance - deductions - previous
}

/**
 * Returns number of calendar days in a month (1-indexed month: 1=Jan, 2=Feb, etc.)
 * Accurately calculates leap years for February.
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Checks if a given year is a leap year
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Calculates OT hours worked beyond the regular 8-hour daily workday.
 * Standard workday is 8 hours (e.g., 09:00 to 17:00).
 * Any hours worked beyond 8 hours count as Overtime (OT).
 * e.g., outTime "20:30" (8:30 PM), inTime "09:00" => 3.5 hours OT.
 * e.g., outTime "17:00", inTime "09:00" => 0 hours OT.
 * e.g., outTime "22:00", inTime "09:00" => 5 hours OT.
 */
export function calculateOtHoursFromShift(outTime: string, inTime: string = '09:00'): number {
  if (!outTime) return 0;
  const inParts = (inTime || '09:00').split(':').map((p) => parseInt(p, 10));
  const outParts = outTime.split(':').map((p) => parseInt(p, 10));
  if (outParts.length < 2 || isNaN(outParts[0]) || isNaN(outParts[1])) return 0;

  const inMinutes =
    !isNaN(inParts[0]) && !isNaN(inParts[1]) ? inParts[0] * 60 + inParts[1] : 9 * 60;
  const outMinutes = outParts[0] * 60 + outParts[1];

  // Daily regular work = 8 hours (480 minutes)
  const regularWorkMinutes = 8 * 60;
  const regularEndMinutes = inMinutes + regularWorkMinutes;

  if (outMinutes <= regularEndMinutes) {
    return 0;
  }

  const otMinutes = outMinutes - regularEndMinutes;
  const otHours = Math.round((otMinutes / 60) * 100) / 100;
  return otHours;
}

/**
 * Updated Salary & OT Calculation:
 *
 * 1. Attendance Bonus Rule:
 *    - R = B / M
 *    - A = present days (constrained 0 to M)
 *    - D = M - A (absent days)
 *    - Attendance Salary = (M - D) * R = A * R
 *    - NEW RULE: If A >= 23, Attendance Bonus = 2 * R; else 0
 *    - Attendance Pay = Attendance Salary + Attendance Bonus
 *
 * 2. Overtime (OT) Rule:
 *    - Monthly Standard OT Hours = M * 5
 *      (e.g., 30 days = 150 hrs, 28 days = 140 hrs, 29 days = 145 hrs, 31 days = 155 hrs)
 *    - Monthly OT Allocation = B * 70%
 *    - Hourly OT Rate = (B * 70%) / (M * 5)
 *    - OT Pay = H * Hourly OT Rate
 *
 * 3. Final Net Payable = Attendance Pay + OT Pay + Other Earnings - Advance - Other Deductions - Previous Payments
 */
export function calculateSalary(input: SalaryCalculationInput): SalaryCalculationResult {
  const {
    monthlyBasicSalary: B,
    daysInMonth: M,
    presentDays: A_raw,
    otHours = 0,
    standardDailyOtHours = 5,
    standardMonthlyHours,
    otRatePercent = 70,
    otherEarnings = 0,
    advanceDeduction = 0,
    otherDeductions = 0,
    previousSalaryPayments = 0,
  } = input;

  if (M <= 0) {
    throw new Error('Days in month M must be greater than 0');
  }

  // Constrain present days between 0 and M
  const A = Math.max(0, Math.min(M, A_raw));
  const D = M - A;

  // Daily base rate: R = B / M (retains 2-decimal precision, not rounded to integer)
  const exactDailyRate = B / M;
  const dailyRate = Math.round((exactDailyRate + Number.EPSILON) * 100) / 100;

  // Deduction for absence: D * exactDailyRate
  const absenceDeduction = Math.round((D * exactDailyRate + Number.EPSILON) * 100) / 100;

  // Attendance salary: A * exactDailyRate (retains 2-decimal precision)
  const attendanceSalary = Math.round((A * exactDailyRate + Number.EPSILON) * 100) / 100;

  // Mandatory revised bonus rule:
  // If A >= 23 (23 days or more in the month up to M):
  // Attendance Bonus = 2 * exactDailyRate
  // Otherwise 0.
  let attendanceBonus = 0;
  if (A >= 23) {
    attendanceBonus = Math.round((2 * exactDailyRate + Number.EPSILON) * 100) / 100;
  }

  // Attendance Pay = Attendance Salary + Attendance Bonus
  const attendancePay = attendanceSalary + attendanceBonus;

  // Overtime calculation adhering strictly to Makkah Printers rule:
  // Regular day = 8 hours, but for Overtime (OT), 1 day = 5 hours.
  // Monthly Standard OT Hours = Days In Month (M) * 5 hours
  // (e.g. 30 days = 150 hrs, 31 days = 155 hrs, 28 days = 140 hrs, 29 days = 145 hrs)
  const dailyOtHours = standardDailyOtHours && standardDailyOtHours > 0 ? standardDailyOtHours : 5;
  const monthlyStandardOtHours = M * dailyOtHours;

  // Monthly OT allocation = B * 70% (or configured otRatePercent)
  const monthlyOtAmount = B * (otRatePercent / 100);

  // Hourly OT Rate = (B * 70%) / (M * 5)
  const hourlyOtRate =
    monthlyStandardOtHours > 0 ? Math.round(((monthlyOtAmount / monthlyStandardOtHours) + Number.EPSILON) * 100) / 100 : 0;

  // Actual OT Pay = Approved OT Hours * Hourly OT Rate
  const otPay = Math.round(((Math.max(0, otHours) * (monthlyStandardOtHours > 0 ? monthlyOtAmount / monthlyStandardOtHours : 0)) + Number.EPSILON) * 100) / 100;

  // Gross total earned salary
  const rawTotalEarned = attendancePay + otPay + (otherEarnings || 0);

  // Math.round formula (>= 0.5 is 1, <= 0.49 is 0) applied ONLY at the final total addition:
  const totalEarnedSalary = Math.round(rawTotalEarned);

  // Final Net Payable:
  // Math.round applied strictly at the very end when totaling the money!
  const rawNetPayable =
    rawTotalEarned -
    (advanceDeduction || 0) -
    (otherDeductions || 0) -
    (previousSalaryPayments || 0);

  const netPayable = Math.max(0, Math.round(rawNetPayable));

  return {
    daysInMonth: M,
    presentDays: A,
    absentDays: D,
    dailyRate,
    absenceDeduction,
    attendanceSalary,
    attendanceBonus,
    attendancePay,
    monthlyStandardOtHours,
    monthlyOtAmount,
    hourlyOtRate,
    otPay,
    totalEarnedSalary,
    netPayable,
  };
}

/**
 * Bengali Month Name Formatter (e.g. '2026-01' -> 'জানুয়ারি ২০২৬ (January 2026)')
 */
export function getMonthNameBengali(monthYear: string): string {
  if (!monthYear) return '';
  const [yearStr, monthStr] = monthYear.split('-');
  const monthNum = parseInt(monthStr, 10);
  const monthsBn = [
    'জানুয়ারি',
    'ফেব্রুয়ারি',
    'মার্চ',
    'এপ্রিল',
    'মে',
    'জুন',
    'জুলাই',
    'আগস্ট',
    'সেপ্টেম্বর',
    'অক্টোবর',
    'নভেম্বর',
    'ডিসেম্বর',
  ];
  const monthsEn = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  if (monthNum >= 1 && monthNum <= 12) {
    return `${monthsBn[monthNum - 1]} ${yearStr} (${monthsEn[monthNum - 1]} ${yearStr})`;
  }
  return monthYear;
}

/**
 * Paper Cutting Cost: Quantity in Reams * Rate per Ream
 */
export function calculateCuttingCost(reams: number, ratePerReam: number): number {
  return roundToTwo(Math.max(0, reams) * Math.max(0, ratePerReam));
}

/**
 * Putti (Paper Scrap) Sale:
 * Gross = Quantity in Kg * Rate per Kg
 * Outstanding = Gross - Advance - Payments
 */
export function calculatePuttiSale(
  quantityKg: number,
  ratePerKg: number,
  advanceReceived: number = 0,
  otherPayments: number = 0
): { grossSale: number; outstandingDue: number } {
  const grossSale = roundToTwo(Math.max(0, quantityKg) * Math.max(0, ratePerKg));
  const outstandingDue = roundToTwo(
    Math.max(0, grossSale - Math.max(0, advanceReceived) - Math.max(0, otherPayments))
  );
  return { grossSale, outstandingDue };
}

/**
 * Offset printing production helpers:
 * Rule specified: 1 Ream = 500 Sheets, and 1 Ream = 1000 Copies
 * (১ রিম = ৫০০ শিট, এবং ১ রিম = ১০০০ কপি)
 */
export function calculateProductionMetrics(
  forma: number,
  chhapa: number,
  copies: number,
  sheetsPerReam: number = 500,
  method: 'forma_impression' | 'copies_direct' = 'forma_impression'
): { calculatedSheets: number; calculatedReams: number } {
  const safeForma = Math.max(1, forma || 1);
  const reamDivisorSheets = sheetsPerReam > 0 ? sheetsPerReam : 500;

  let calculatedSheets = 0;
  let calculatedReams = 0;

  if (method === 'forma_impression') {
    // 1000 copies = 1 ream = 500 sheets per forma
    const effectiveCopies = copies > 0 ? copies : (chhapa > 0 ? chhapa : 1000);
    const totalCopies = effectiveCopies * safeForma;
    calculatedReams = totalCopies / 1000;
    calculatedSheets = calculatedReams * reamDivisorSheets;
  } else {
    // copies_direct: 1000 copies = 1 ream = 500 sheets
    const totalCopies = (copies > 0 ? copies : 1000) * safeForma;
    calculatedReams = totalCopies / 1000;
    calculatedSheets = calculatedReams * reamDivisorSheets;
  }

  return {
    calculatedSheets: Math.round(calculatedSheets),
    calculatedReams: roundToTwo(calculatedReams),
  };
}

/**
 * Invoicing calculation:
 * Subtotal = sum of items (qty * rate)
 * Grand Total = Subtotal - discount + extraCharges
 * Current Due = Previous Due + Grand Total - Paid Amount
 */
export function calculateInvoice(
  items: Array<{ quantity: number; rate: number }>,
  discount: number = 0,
  extraCharges: number = 0,
  previousDue: number = 0,
  paidAmount: number = 0
): { subtotal: number; grandTotal: number; currentDue: number } {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  const grandTotal = Math.max(0, subtotal - discount + extraCharges);
  const currentDue = previousDue + grandTotal - paidAmount;

  return {
    subtotal: roundToTwo(subtotal),
    grandTotal: roundToTwo(grandTotal),
    currentDue: roundToTwo(currentDue),
  };
}

/**
 * Number rounding to 2 decimal places
 */
export function roundToTwo(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Convert English digits to Bengali digits
 */
export function toBanglaDigits(value: number | string): string {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(value).replace(/[0-9]/g, (digit) => banglaDigits[parseInt(digit, 10)]);
}

/**
 * Convert Bengali (০-৯) or Arabic-Indic (٠-٩) digits to ASCII English digits (0-9)
 */
export function toEnglishDigits(value: number | string): string {
  const str = String(value ?? '');
  return str
    .replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

/**
 * Parse number cleanly from localized Bengali/English numeric input string
 */
export function parseLocalizedNumber(value: number | string, fallback: number = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  const normalized = toEnglishDigits(value).replace(/,/g, '').trim();
  if (!normalized || normalized === '-' || normalized === '.' || normalized === '-.') {
    return fallback;
  }
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

let activeGlobalNumberFormat: 'bn' | 'en' = 'bn';

export function setActiveNumberFormat(fmt?: 'bn' | 'en') {
  if (fmt === 'bn' || fmt === 'en') {
    activeGlobalNumberFormat = fmt;
  }
}

export function getActiveNumberFormat(): 'bn' | 'en' {
  return activeGlobalNumberFormat;
}

/**
 * Format any general number (quantity, counter, copies, sheets, reams)
 * with comma separators and clean Bengali or English digits.
 */
export function formatNumber(
  value: number | string,
  lang: 'bn' | 'en' = 'bn',
  numberFormat?: 'bn' | 'en'
): string {
  if (value === null || value === undefined || value === '') return '0';
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) return String(value);

  const formatted = num.toLocaleString('en-US');
  const targetFmt = numberFormat || activeGlobalNumberFormat || (lang === 'bn' ? 'bn' : 'en');
  const useBangla = targetFmt === 'bn';
  return useBangla ? toBanglaDigits(formatted) : formatted;
}

/**
 * Format currency in Bangladeshi Taka (BDT)
 */
export function formatCurrency(
  amount: number,
  lang: 'bn' | 'en' = 'bn',
  showSymbol: boolean = true,
  numberFormat?: 'bn' | 'en'
): string {
  const safeAmount = isNaN(amount) ? 0 : amount;
  const formatted = Math.abs(safeAmount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const sign = safeAmount < 0 ? '-' : '';
  const prefix = showSymbol ? (lang === 'bn' ? '৳ ' : 'BDT ') : '';
  const targetFmt = numberFormat || activeGlobalNumberFormat || (lang === 'bn' ? 'bn' : 'en');
  const useBangla = targetFmt === 'bn';

  if (useBangla) {
    return `${sign}${prefix}${toBanglaDigits(formatted)}`;
  }
  return `${sign}${prefix}${formatted}`;
}

/**
 * Format date in Bangladeshi style (DD/MM/YYYY)
 */
export function formatDate(
  dateString: string,
  lang: 'bn' | 'en' = 'bn',
  numberFormat?: 'bn' | 'en'
): string {
  if (!dateString) return '';
  const targetFmt = numberFormat || activeGlobalNumberFormat || (lang === 'bn' ? 'bn' : 'en');
  const useBangla = targetFmt === 'bn';
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      const formatted = `${day}/${month}/${year}`;
      return useBangla ? toBanglaDigits(formatted) : formatted;
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const formatted = `${day}/${month}/${year}`;
    return useBangla ? toBanglaDigits(formatted) : formatted;
  } catch {
    return dateString;
  }
}

/**
 * Printing Press Employee Designation Hierarchy Rank
 * Orders employees by authority and operational seniority (ম্যানেজার > ফোরম্যান > মাস্টার > মেশিনম্যান > কাটিং > বাইন্ডিং > সহকারী > অন্যান্য)
 */
export function getDesignationRank(designation?: string): number {
  if (!designation) return 99;
  const d = designation.toLowerCase().trim();
  if (
    d.includes('স্বত্বাধিকারী') ||
    d.includes('মালিক') ||
    d.includes('ডিরেক্টর') ||
    d.includes('ম্যানেজার') ||
    d.includes('manager') ||
    d.includes('ইনচার্জ') ||
    d.includes('incharge') ||
    d.includes('ইন-চার্জ')
  ) {
    if (d.includes('সহকারী') || d.includes('assistant')) return 2;
    return 1;
  }
  if (d.includes('ফোরম্যান') || d.includes('foreman') || d.includes('সুপারভাইজার') || d.includes('supervisor')) return 2;
  if (
    d.includes('চিফ') ||
    d.includes('chief') ||
    d.includes('হেড') ||
    d.includes('head') ||
    d.includes('মাস্টার') ||
    d.includes('master') ||
    d.includes('সিনিয়র') ||
    d.includes('senior')
  ) {
    return 3;
  }
  if (
    d.includes('মেশিনম্যান') ||
    d.includes('machineman') ||
    d.includes('মেশিন ম্যান') ||
    d.includes('অপারেটর') ||
    d.includes('operator') ||
    d.includes('প্রিন্টার') ||
    d.includes('printer')
  ) {
    if (d.includes('সহকারী') || d.includes('assistant') || d.includes('ফিডার') || d.includes('feeder') || d.includes('হেলপার') || d.includes('helper')) {
      return 7;
    }
    return 4;
  }
  if (d.includes('কাটিং') || d.includes('cutting') || d.includes('কাটার') || d.includes('cutter')) return 5;
  if (
    d.includes('বাইন্ডিং') ||
    d.includes('binding') ||
    d.includes('ফোল্ডিং') ||
    d.includes('folding') ||
    d.includes('কারিগর') ||
    d.includes('artisan') ||
    d.includes('পেস্টিং') ||
    d.includes('pasting')
  ) {
    return 6;
  }
  if (d.includes('সহকারী') || d.includes('assistant') || d.includes('ফিডার') || d.includes('feeder') || d.includes('হেলপার') || d.includes('helper')) return 7;
  if (
    d.includes('ডেলিভারি') ||
    d.includes('delivery') ||
    d.includes('প্যাকার') ||
    d.includes('packer') ||
    d.includes('পিওন') ||
    d.includes('peon') ||
    d.includes('দারোয়ান') ||
    d.includes('security') ||
    d.includes('গার্ড') ||
    d.includes('guard') ||
    d.includes('ক্লিনার') ||
    d.includes('cleaner')
  ) {
    return 8;
  }
  return 10;
}

/**
 * Sorts employee records by their custom sortOrder (if specified) or by designation hierarchy ranking
 */
export function sortEmployeesByDesignation<T extends { designation?: string; name?: string; employeeName?: string; sortOrder?: number }>(
  list: T[]
): T[] {
  return [...list].sort((a, b) => {
    // 1. If user set an explicit sortOrder (moving employees up or down), honor it first:
    const hasOrderA = typeof a.sortOrder === 'number' && a.sortOrder >= 0;
    const hasOrderB = typeof b.sortOrder === 'number' && b.sortOrder >= 0;

    if (hasOrderA && hasOrderB) {
      if (a.sortOrder !== b.sortOrder) return (a.sortOrder || 0) - (b.sortOrder || 0);
    } else if (hasOrderA) {
      return -1;
    } else if (hasOrderB) {
      return 1;
    }

    // 2. Default: Sort by printing press designation rank hierarchy
    const rankA = getDesignationRank(a.designation);
    const rankB = getDesignationRank(b.designation);
    if (rankA !== rankB) return rankA - rankB;

    const nameA = a.name || a.employeeName || '';
    const nameB = b.name || b.employeeName || '';
    return nameA.localeCompare(nameB, 'bn');
  });
}

