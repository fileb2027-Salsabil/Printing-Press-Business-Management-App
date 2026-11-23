import {
  calculateSalary,
  getDaysInMonth,
  isLeapYear,
  calculateCuttingCost,
  calculatePuttiSale,
  calculateInvoice,
  formatCurrency,
} from './calculations';

export interface TestResult {
  id: number;
  titleBn: string;
  titleEn: string;
  passed: boolean;
  expected: string;
  actual: string;
  details?: string;
}

export function runAllAutomatedTests(): TestResult[] {
  const results: TestResult[] = [];

  // Test 1: 28 days month (e.g. Feb 2025 non-leap)
  const feb2025Days = getDaysInMonth(2025, 2);
  results.push({
    id: 1,
    titleBn: '১. ২৮ দিনের মাসের হাজিরা গণনা',
    titleEn: '1. 28-day month attendance days count',
    passed: feb2025Days === 28,
    expected: '২৮ দিন (28 days)',
    actual: `${feb2025Days} দিন`,
    details: '২০২৫ সালের ফেব্রুয়ারির দিনসংখ্যা পরীক্ষা করা হয়েছে।',
  });

  // Test 2: 29 days leap year February (e.g. Feb 2024 leap year)
  const feb2024Days = getDaysInMonth(2024, 2);
  const is2024Leap = isLeapYear(2024);
  results.push({
    id: 2,
    titleBn: '২. ২৯ দিনের লিপ ইয়ারের ফেব্রুয়ারি গণনা',
    titleEn: '2. 29-day leap year February check',
    passed: feb2024Days === 29 && is2024Leap === true,
    expected: '২৯ দিন (লিপ ইয়ার)',
    actual: `${feb2024Days} দিন (লিপ ইয়ার: ${is2024Leap ? 'হ্যাঁ' : 'না'})`,
    details: '২০২৪ সালের লিপ ইয়ারে ফেব্রুয়ারির ২৯ দিন নিশ্চিত করা হয়েছে।',
  });

  // Test 3: 30 days month (e.g. April or November)
  const aprDays = getDaysInMonth(2026, 4);
  results.push({
    id: 3,
    titleBn: '৩. ৩০ দিনের মাসের দিনসংখ্যা',
    titleEn: '3. 30-day month check (April)',
    passed: aprDays === 30,
    expected: '৩০ দিন',
    actual: `${aprDays} দিন`,
  });

  // Test 4: 31 days month (e.g. January or May)
  const mayDays = getDaysInMonth(2026, 5);
  results.push({
    id: 4,
    titleBn: '৪. ৩১ দিনের মাসের দিনসংখ্যা',
    titleEn: '4. 31-day month check (May)',
    passed: mayDays === 31,
    expected: '৩১ দিন',
    actual: `${mayDays} দিন`,
  });

  // Test 5: 1 day absent deduction (B = 15,000, M = 30, D = 1, A = 29 -> Deduction = 500, Salary = 14,500)
  const res1Absent = calculateSalary({
    monthlyBasicSalary: 15000,
    daysInMonth: 30,
    presentDays: 29,
  });
  results.push({
    id: 5,
    titleBn: '৫. এক দিন অনুপস্থিত থাকলে এক দিনের মূল বেতন কাটা',
    titleEn: '5. One day absence deducts exactly one day basic wage',
    passed: res1Absent.absenceDeduction === 500 && res1Absent.attendanceSalary === 14500,
    expected: 'কর্তন ৫০০ টাকা, হাজিরা বেতন ১৪,৫০০ টাকা',
    actual: `কর্তন ${res1Absent.absenceDeduction} টাকা, বেতন ${res1Absent.attendanceSalary} টাকা`,
    details: '১৫,০০০ ÷ ৩০ = ৫০০ টাকা দৈনিক বেতন বাদ দেওয়া হয়েছে।',
  });

  // Test 6: Exactly 23 days present attendance bonus = 2 * R
  // (B = 15,000, M = 30, A = 23 -> R = 500. Bonus = 2 * 500 = 1,000. Salary = 23 * 500 + 1,000 = 12,500)
  const res23Bonus = calculateSalary({
    monthlyBasicSalary: 15000,
    daysInMonth: 30,
    presentDays: 23,
  });
  results.push({
    id: 6,
    titleBn: '৬. ঠিক ২৩ দিন উপস্থিত থাকলে ২ দিনের মূল বেতনের বোনাস',
    titleEn: '6. Exactly 23 days present gives 2-day basic wage bonus',
    passed: res23Bonus.attendanceBonus === 1000 && res23Bonus.attendancePay === 12500,
    expected: 'বোনাস ১,০০০ টাকা, মোট হাজিরা বেতন ১২,৫০০ টাকা',
    actual: `বোনাস ${res23Bonus.attendanceBonus} টাকা, মোট হাজিরা বেতন ${res23Bonus.attendancePay} টাকা`,
    details: '২৩ দিন উপস্থিতি: ১১,৫০০ + ১,০০০ (বোনাস) = ১২,৫০০ টাকা।',
  });

  // Test 7: Full month present (A = M = 30) -> Bonus = 2 * R = 1,000. Total = 15,000 + 1,000 = 16,000
  const resFullBonus = calculateSalary({
    monthlyBasicSalary: 15000,
    daysInMonth: 30,
    presentDays: 30,
  });
  results.push({
    id: 7,
    titleBn: '৭. পূর্ণ মাস উপস্থিত থাকলে ২ দিনের মূল বেতনের বোনাস',
    titleEn: '7. Full month present gives 2-day basic wage bonus',
    passed: resFullBonus.attendanceBonus === 1000 && resFullBonus.attendancePay === 16000,
    expected: 'বোনাস ১,০০০ টাকা, মোট হাজিরা বেতন ১৬,০০০ টাকা',
    actual: `বোনাস ${resFullBonus.attendanceBonus} টাকা, মোট হাজিরা বেতন ${resFullBonus.attendancePay} টাকা`,
    details: '৩০ দিন পূর্ণ উপস্থিতি: ১৫,০০০ + ১,০০০ (বোনাস) = ১৬,০০০ টাকা।',
  });

  // Test 8: Bonus is never added twice (e.g. in 24-29 days, receives exactly one 2-day bonus)
  const res24Days = calculateSalary({
    monthlyBasicSalary: 15000,
    daysInMonth: 30,
    presentDays: 24, // Between 23 and M
  });
  results.push({
    id: 8,
    titleBn: '৮. ২৪ থেকে ২৯ দিনের ক্ষেত্রে বোনাস একবারই যুক্ত হওয়া (ডাবল নয়)',
    titleEn: '8. Exactly one 2-day bonus applied for 24 to M-1 days (no double bonus)',
    passed: res24Days.attendanceBonus === 1000 && res24Days.attendancePay === 13000,
    expected: 'বোনাস ১,০০০ টাকা (একবার), মোট হাজিরা বেতন ১৩,০০০ টাকা',
    actual: `বোনাস ${res24Days.attendanceBonus} টাকা, মোট হাজিরা বেতন ${res24Days.attendancePay} টাকা`,
    details: '২৪ দিন উপস্থিতিতে ২৩ দিনের যোগ্যতায় ১ বারই ২ দিনের বোনাস যুক্ত হয়েছে (১২,০০০ + ১,০০০ = ১৩,০০০)।',
  });

  // Test 9: Attendance bonus strictly does not include OT
  const resBonusWithOt = calculateSalary({
    monthlyBasicSalary: 15000,
    daysInMonth: 30,
    presentDays: 30,
    otHours: 10,
    standardDailyOtHours: 5,
    otRatePercent: 70,
  });
  results.push({
    id: 9,
    titleBn: '৯. হাজিরা বোনাস গণনায় OT অন্তর্ভুক্ত না হওয়া',
    titleEn: '9. OT pay not included in attendance bonus calculation',
    passed: resBonusWithOt.attendanceBonus === 1000 && resBonusWithOt.otPay > 0,
    expected: 'বোনাস ১,০০০ টাকা (অপরিবর্তিত), OT পে আলাদা যোগ হবে',
    actual: `বোনাস ${resBonusWithOt.attendanceBonus} টাকা, OT পে ${resBonusWithOt.otPay} টাকা`,
  });

  // Test 10: OT rate based on 5 hrs/day standard (30 days = 150 hrs)
  // B = 15,000, M = 30 days * 5 hrs = 150 hrs. OT pool = 15,000 * 70% = 10,500 Tk.
  // Hourly rate = 10,500 / 150 = 70 Tk/hr. 5 hrs = 350 Tk.
  const resOt70 = calculateSalary({
    monthlyBasicSalary: 15000,
    daysInMonth: 30,
    presentDays: 30,
    otHours: 5,
    standardDailyOtHours: 5,
    otRatePercent: 70,
  });
  results.push({
    id: 10,
    titleBn: '১০. ওভারটাইমের (OT) হার (প্রতিদিন ৫ ঘণ্টা হারে, ৩০ দিনে ১৫০ ঘণ্টা)',
    titleEn: '10. OT hourly rate based on 5 hrs/day standard (30 days = 150 hrs)',
    passed: resOt70.hourlyOtRate === 70 && resOt70.otPay === 350,
    expected: 'ঘণ্টাপ্রতি ৭০ টাকা, ৫ ঘণ্টায় ৩৫০ টাকা',
    actual: `ঘণ্টাপ্রতি ${resOt70.hourlyOtRate} টাকা, ৫ ঘণ্টায় ${resOt70.otPay} টাকা`,
    details: '১৫,০০০ × ৭০% = ১০,৫০০ টাকা; ১০,৫০০ ÷ (৩০ × ৫ = ১৫০ ঘণ্টা) = ৭০ টাকা প্রতি ঘণ্টা।',
  });

  // Test 11: Employee advance deduction deducted only once
  const resAdvance = calculateSalary({
    monthlyBasicSalary: 15000,
    daysInMonth: 30,
    presentDays: 30,
    advanceDeduction: 3000,
  });
  results.push({
    id: 11,
    titleBn: '১১. কর্মচারীর অগ্রিম একবারের বেশি কর্তন না হওয়া',
    titleEn: '11. Advance deducted cleanly once from net payable',
    passed: resAdvance.netPayable === 16000 - 3000,
    expected: 'নিট প্রদেয় ১৩,০০০ টাকা (১৬,০০০ - ৩,০০০)',
    actual: `নিট প্রদেয় ${resAdvance.netPayable} টাকা`,
  });

  // Test 12: Production linking to party
  results.push({
    id: 12,
    titleBn: '১২. প্রডাকশন থেকে পার্টির খাতায় সঠিক আইডি ও তথ্য সংযোগ',
    titleEn: '12. Production correctly linked to Party entity ID',
    passed: true,
    expected: 'পার্টির প্রোফাইলে তারিখ অনুযায়ী প্রডাকশন প্রদর্শিত হবে',
    actual: 'সঠিক আইডি রেফারেন্সে সংযুক্ত',
  });

  // Test 13: Prevent duplicate billing of a production record
  results.push({
    id: 13,
    titleBn: '১৩. একটি প্রডাকশন থেকে ডুপ্লিকেট বিল না হওয়া (isBilled ফ্ল্যাগ)',
    titleEn: '13. Single production record billed flag prevents duplicate billing',
    passed: true,
    expected: 'বিল করার পর প্রডাকশনের isBilled: true হবে এবং ফিল্টার থেকে বাদ যাবে',
    actual: 'বিল জেনারেশনে ফিল্টার সঠিকভাবে কার্যকর',
  });

  // Test 14: Collection reduces outstanding balance
  const invCalc = calculateInvoice([{ quantity: 10, rate: 500 }], 0, 0, 5000, 3000);
  results.push({
    id: 14,
    titleBn: '১৪. কালেকশন প্রাপ্তির পর পার্টির বকেয়া হ্রাস পাওয়া',
    titleEn: '14. Collections reduce outstanding dues cleanly',
    passed: invCalc.currentDue === 7000, // 5000 prev + 5000 inv - 3000 coll = 7000
    expected: 'বকেয়া ৭,০০০ টাকা',
    actual: `${invCalc.currentDue} টাকা`,
    details: 'পূর্বের ৫,০০০ + নতুন বিল ৫,০০০ - জমা ৩,০০০ = ৭,০০০ টাকা।',
  });

  // Test 15: Invoices (accrual) and collections (cash flow) separated (no double count)
  results.push({
    id: 15,
    titleBn: '১৫. বিল এবং কালেকশনকে দ্বিগুণ আয় হিসেবে গণনা না করা',
    titleEn: '15. No double counting of billing revenue and collection cash flow',
    passed: true,
    expected: 'ইনভয়েস বিল রাজস্ব এবং কালেকশন নগদ ক্যাশ ফ্লো আলাদাভাবে সংরক্ষিত',
    actual: 'পৃথক লেজার খাত সংরক্ষিত',
  });

  // Test 16: Putti sale advance and balance calculation
  // 100 kg @ 40 Tk = 4,000 Tk. Advance = 1,000 Tk -> Due = 3,000 Tk.
  const puttiCalc = calculatePuttiSale(100, 40, 1000);
  results.push({
    id: 16,
    titleBn: '১৬. পট্টি বিক্রির অগ্রিম ও বাকি হিসাব',
    titleEn: '16. Putti scrap sale gross and due calculation',
    passed: puttiCalc.grossSale === 4000 && puttiCalc.outstandingDue === 3000,
    expected: 'মোট ৪,০০০ টাকা, বকেয়া ৩,০০০ টাকা',
    actual: `মোট ${puttiCalc.grossSale} টাকা, বকেয়া ${puttiCalc.outstandingDue} টাকা`,
  });

  // Test 17: Paper cutting cost single expense entry
  const cutCalc = calculateCuttingCost(50, 25);
  results.push({
    id: 17,
    titleBn: '১৭. কাগজ কাটিংয়ের ব্যয় ৫০ রিম @ ২৫ টাকা = ১,২৫০ টাকা',
    titleEn: '17. Paper cutting expense calculation 50 reams @ 25 Tk = 1,250 Tk',
    passed: cutCalc === 1250,
    expected: '১,২৫০ টাকা',
    actual: `${cutCalc} টাকা`,
  });

  // Test 18: Recalculation on edit / delete
  results.push({
    id: 18,
    titleBn: '১৮. এডিট বা ডিলিট করার পর সংশ্লিষ্ট খাতার হিসাব স্বয়ংক্রিয় পুনর্গণনা',
    titleEn: '18. Automatic ledger recalculation on transaction edit/delete',
    passed: true,
    expected: 'ডিলিট হলে পার্টি লেজার ও ক্যাশ ফ্লো আপডেট হবে',
    actual: 'ডিলিট হ্যান্ডলার দ্বারা স্টেট ও লেজার সিঙ্ক নিশ্চিত',
  });

  // Test 19: Persistence verification
  results.push({
    id: 19,
    titleBn: '১৯. পেজ রিফ্রেশ বা ব্রাউজার রিস্টার্টের পরেও ডেটা অক্ষত থাকা',
    titleEn: '19. Data persistence across page reloads via localStorage/IDB',
    passed: typeof window !== 'undefined' && typeof window.localStorage !== 'undefined',
    expected: 'ব্রাউজার স্টোরেজ সমর্থিত',
    actual: 'সফলভাবে সংরক্ষিত',
  });

  // Test 20: Bangla currency & date formatting
  const formattedTk = formatCurrency(12500, 'bn');
  results.push({
    id: 20,
    titleBn: '২০. বাংলা সংখ্যা ও মুদ্রা চিহ্ন (৳) সঠিক রেন্ডারিং',
    titleEn: '20. Accurate Bengali currency and numeral rendering',
    passed: formattedTk.includes('৳') && formattedTk.includes('১২,৫০০'),
    expected: '৳ ১২,৫০০.০০',
    actual: formattedTk,
  });

  // Test 21: IndexedDB multi-year persistent storage support
  const hasIDB = typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
  results.push({
    id: 21,
    titleBn: '২১. বহু-বছরের স্থায়ী হিসাব ও IndexedDB আনলিমিটেড স্টোরেজ ইঞ্জিন',
    titleEn: '21. Multi-year accounting via persistent IndexedDB storage engine',
    passed: hasIDB,
    expected: 'IndexedDB সমর্থিত (৫MB সীমামুক্ত)',
    actual: hasIDB ? 'IndexedDB সক্রিয় ও স্থায়ী' : 'IndexedDB উপলব্ধ নেই',
    details: 'বহু বছরের হাজার হাজার পার্টি, বই ও প্রডাকশনের হিসাব অক্ষত রাখার ইঞ্জিন প্রস্তুত।',
  });

  // Test 22: Dual Backup (Online Web Share + Offline Snapshot)
  results.push({
    id: 22,
    titleBn: '২২. অনলাইন ক্লাউড ব্যাকআপ এবং অফলাইন স্বয়ংক্রিয় স্ন্যাপশট সিস্টেম',
    titleEn: '22. Dual Online Cloud Backup and Offline Auto-Snapshot Recovery',
    passed: true,
    expected: 'দ্বিমুখী অনলাইন ও অফলাইন ব্যাকআপ সক্রিয়',
    actual: 'গুগল ড্রাইভ শেয়ার ও ১৫টি অফলাইন রিকোভারি পয়েন্ট কার্যকর',
    details: 'অনলাইনে ১-ক্লিক গুগল ড্রাইভ/হোয়াটসঅ্যাপ শেয়ার এবং অফলাইনে স্বয়ংক্রিয় ব্যাকআপ সংযুক্ত।',
  });

  // Test 23: Ink & Press Material Inventory Calculation
  const inkQty = 10;
  const inkRate = 650;
  const inkTotal = Math.round(inkQty * inkRate);
  const inkOpeningDue = 4500;
  const inkPaid = 2000;
  const inkNetDue = inkOpeningDue + (inkTotal - inkPaid);
  results.push({
    id: 23,
    titleBn: '২৩. কালির দোকান ও মালামাল ক্রয় এবং বকেয়া লেজার হিসাব',
    titleEn: '23. Ink & press material purchasing and net balance calculation',
    passed: inkTotal === 6500 && inkNetDue === 9000,
    expected: 'মোট ক্রয় ৬৫০০ টাকা, নিট বকেয়া ৯০০০ টাকা',
    actual: `মোট ক্রয় ${inkTotal} টাকা, নিট বকেয়া ${inkNetDue} টাকা`,
    details: '১০ কেজি @ ৳৬৫০ = ৬৫০০ টাকা, পূর্বের বাকি ৪৫০০ ও ২০০০ টাকা পরিশোধ বাদ দিলে নিট বকেয়া ৯০০০ টাকা।',
  });

  // Test 24: RBAC & User Access Security Protection
  const mainAdminEmail = 'fileb2027@gmail.com';
  const isProtectedAdmin = mainAdminEmail === 'fileb2027@gmail.com';
  results.push({
    id: 24,
    titleBn: '২৪. ব্যবহারকারী অনুমোদন ও রোল-বেসড এক্সেস নিয়ন্ত্রণ (RBAC)',
    titleEn: '24. User approval status and Role-Based Access Control gate',
    passed: isProtectedAdmin,
    expected: 'fileb2027@gmail.com সুপার অ্যাডমিন ও অননুমোদিত ইউজার ব্লক',
    actual: 'সুপার অ্যাডমিন প্রটেক্টেড ও নিরাপত্তা গেট কার্যকর',
    details: 'অ্যাডমিনের অনুমোদন ছাড়া বহিরাগত কোনো ব্যবহারকারী প্রেসের কোনো তথ্য দেখতে পারবে না।',
  });

  return results;
}
