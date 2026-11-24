export type Language = 'bn' | 'en';

export type Theme = 'light' | 'dark' | 'blue' | 'green' | 'maroon' | 'slate';

export type BanglaFont = 'Hind Siliguri' | 'Noto Sans Bengali' | 'Tiro Bangla';

export type UserRole = 'admin' | 'manager' | 'staff';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
}

export interface CompanySettings {
  name: string;
  nameEn: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string;
  owner: {
    name: string;
    address: string;
    phone: string;
    photoUrl?: string;
  };
  manager: {
    name: string;
    address: string;
    phone: string;
    photoUrl?: string;
  };
  openingDate: string;
  openingBalance: number;
  language: Language;
  font: BanglaFont;
  theme: Theme;
  sheetsPerReam: number; // default 500
  defaultOtRatePercent: number; // default 70 (%)
  standardMonthlyWorkHours: number; // default 208 (26 days * 8 hours)
  globalDefaultRatePerForma: number; // default printing rate
  calculationMethod: 'forma_impression' | 'copies_direct';
  adminPin: string;
  adminEmail?: string;
  isConfigured: boolean;
  numberFormat?: 'bn' | 'en'; // সংখ্যা প্রদর্শন: 'bn' (সহজ বাংলা) বা 'en' (ইংরেজি)
  governmentHolidays?: Record<string, string>; // date (YYYY-MM-DD) -> holiday name
}

export interface Party {
  id: string;
  name: string;
  contactPerson: string;
  address: string;
  phone: string;
  email?: string;
  photoUrl?: string; // ঐচ্ছিক ছবি
  openingDue: number;
  notes?: string;
  isActive: boolean;
  portalLoginId?: string;
  portalPassword?: string;
  portalEnabled?: boolean;
  portalUid?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Book {
  id: string;
  code: string;
  name: string;
  forma: number;
  plates: number;
  size?: string; // যেমন: ২৩×৩৬, ২০×৩০
  defaultRate: number; // rate per forma or thousand
  pagesInfo?: string;
  photoUrl?: string; // ঐচ্ছিক কভার বা বইয়ের ছবি
  notes?: string;
  isActive: boolean;
  partyIds: string[]; // Associated parties
  createdAt: string;
  updatedAt: string;
}

export type ProductionItemType = 'book' | 'cover'; // 'বই' (ভেতরের ফর্মা) নাকি 'কভার'
 
export interface Production {
  id: string;
  date: string;
  partyId: string;
  bookId: string;
  itemType?: ProductionItemType; // 'book' (বই) বা 'cover' (কভার)
  forma: number;
  plates: number;
  chhapa: number; // printing impressions / counter
  copies: number;
  sheets: number;
  reams: number;
  calculationMethod: string;
  paperSize?: string; // e.g. ২৩×৩৬, ২০×৩০ or any custom size
  paperType?: string; // e.g. অফসেট, হোয়াইট পেপার, আর্ট পেপার, ইত্যাদি
  paperGsm?: string; // e.g. ৬৫ গ্রাম, ৭০ গ্রাম, ৮০ গ্রাম, ইত্যাদি
  colorCount?: number; // কয় কালার ছাপা (1, 2, 3, 4 etc.)
  singleColorType?: 'black' | 'color'; // ১ কালার হলে কালো নাকি রঙিন
  operatorName?: string; // মেশিনম্যান / কে ছাপাইছে
  notes?: string;
  isBilled: boolean;
  invoiceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderSlipItem {
  id: string;
  bookId: string;
  bookName: string;
  bookCode?: string;
  itemType: ProductionItemType;
  forma: number;
  plates: number;
  copies: number;
  chhapa: number; // কপি × ফর্মা
  sheets: number;
  reams: number;
  paperSize?: string;
  paperType?: string;
  paperGsm?: string;
  colorCount?: number;
  singleColorType?: 'black' | 'color';
  notes?: string;
}

export interface OrderSlip {
  id: string;
  slipNo: string;
  date: string;
  partyId: string;
  partyName: string;
  partyPhone?: string;
  machineManName?: string;
  deliveryDate?: string;
  status: 'pending' | 'printing' | 'completed';
  items: OrderSlipItem[];
  totalBooks: number;
  totalForma: number;
  totalPlates: number;
  totalCopies: number;
  totalChhapa: number;
  totalSheets: number;
  totalReams: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type BillingBasis = 'plate' | 'ream' | 'forma';

export interface InvoiceItem {
  id: string;
  productionId?: string;
  productionDate?: string; // দৈনিক প্রডাকশনের কাজের তারিখ
  itemType?: ProductionItemType;
  bookId: string;
  bookName: string;
  forma: number;
  plates: number;
  copies: number;
  reams: number;
  quantity: number;
  billingBasis?: BillingBasis; // 'plate' (≤২০০০ কপি: দর × প্লেট) অথবা 'ream' (>২০০০ কপি: দর × রিম)
  unit?: string; // 'প্লেট' | 'রিম' | 'ফর্মা'
  rate: number;
  amount: number;
  description?: string;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  date: string;
  partyId: string;
  partyName: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  extraCharges: number;
  grandTotal: number;
  previousDue: number;
  paidAmount: number;
  currentDue: number;
  includePreviousDue?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  receiptNo: string;
  date: string;
  partyId: string;
  partyName: string;
  amount: number;
  paymentMethod: 'cash' | 'bank' | 'bkash' | 'nagad' | 'rocket' | 'other';
  invoiceId?: string;
  invoiceNo?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  fatherName?: string; // পিতার নাম (ঐচ্ছিক)
  photoUrl?: string;
  designation: string;
  phone: string;
  address: string;
  joiningDate: string;
  monthlyBasicSalary: number;
  standardMonthlyHours: number; // e.g. 208
  otRatePercent: number; // 70%
  isActive: boolean;
  sortOrder?: number; // কাস্টম সিরিয়াল ক্রম (ঐচ্ছিক ম্যানুয়াল সাজানোর জন্য)
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'leave' | 'holiday';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
  otHours: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeAdvance {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  amount: number;
  paymentMethod: string;
  isDeducted: boolean;
  deductedAmount?: number;
  deductedPayrollMonth?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  monthYear: string; // YYYY-MM
  daysInMonth: number; // M
  presentDays: number; // A
  absentDays: number; // D
  dailyRate: number; // R
  basicSalary: number; // B
  attendanceSalary: number; // (M - D) * R = A * R
  attendanceBonus: number; // 2 * R if A === 23 or A === M else 0
  attendancePay: number; // attendanceSalary + attendanceBonus
  otHours: number;
  hourlyOtRate: number; // (B / H) * 0.70
  otPay: number; // otHours * hourlyOtRate
  otherEarnings: number;
  advanceDeduction: number;
  totalAdvanceAvailable?: number; // মোট বকেয়া অগ্রিম (পরিশোধের আগে পর্যন্ত)
  shouldDeductAdvance?: boolean; // এই মাসে অগ্রিম কর্তন কার্যকর কি না
  remainingAdvance?: number; // বেতন থেকে বেশি হলে বা কর্তন না করলে অবশিষ্ট অগ্রিম
  otherDeductions: number;
  previousSalaryPaid: number;
  previousUnpaidSalaryDue?: number; // পূর্ববর্তী অপরিশোধিত মাসের মোট বকেয়া বেতন
  includePreviousUnpaidSalary?: boolean; // এই মাসের বেতনে পূর্বের বকেয়া বেতন যোগ করবেন কিনা
  previousUnpaidSalaryAdded?: number; // প্রকৃতপক্ষে এই মাসের বিলে যোগ করা পূর্বের বকেয়া বেতন
  totalEarnedSalary?: number; // মোট কত টাকা বেতন হয়েছে (গ্রস আয়)
  netPayable: number;
  status: 'draft' | 'approved' | 'paid';
  paidDate?: string;
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CuttingWorker {
  id: string;
  name: string;
  phone: string;
  address?: string;
  photoUrl?: string;
  defaultRatePerReam: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

export interface PaperCuttingRecord {
  id: string;
  date: string;
  partyId?: string;
  partyName?: string;
  reams: number;
  ratePerReam: number;
  totalCost: number;
  cuttingWorkerId: string;
  cuttingWorkerName: string;
  paidAmount?: number; // কাটিংম্যানকে তৎক্ষণাৎ পরিশোধিত টাকা
  paymentStatus?: 'paid' | 'due' | 'partial'; // পেমেন্ট অবস্থা
  paymentMethod?: string; // নগদ, বিকাশ, ব্যাংক ইত্যাদি
  notes?: string;
  expenseTransactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export type PuttiCategory =
  | 'সাদা'
  | 'সাদা-২'
  | 'নিউজ'
  | 'নিউজ-২'
  | 'খাস্তা'
  | 'মলাট'
  | '২নং';

export interface PuttiSaleRecord {
  id: string;
  date: string;
  category: PuttiCategory;
  quantityKg: number;
  ratePerKg: number;
  grossSale: number;
  buyerName: string;
  sellerName: string;
  advanceReceived: number; // advance deducted from buyer's deposit
  cashReceived?: number; // cash collected directly if no advance or excess
  outstandingDue: number; // remaining due if any
  paymentMethod: string; // 'cash' | 'due' | 'advance' | 'mixed'
  settlementMode?: 'advance' | 'cash' | 'due' | 'mixed';
  notes?: string;
  incomeTransactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PuttiBuyerAdvance {
  id: string;
  date: string;
  buyerName: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
  createdAt: string;
}

export interface IncomeExpenseTransaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  paymentMethod: string;
  partyId?: string;
  partyName?: string;
  employeeId?: string;
  employeeName?: string;
  cuttingWorkerId?: string;
  cuttingWorkerName?: string;
  referenceNo?: string;
  sourceType?: 'manual' | 'paper_cutting' | 'putti_sale' | 'collection' | 'payroll' | 'cutting_payment' | 'ink_purchase' | 'ink_supplier_payment';
  sourceId?: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export type PlateLocation = 'press' | 'godown' | 'sold' | 'returned';

export interface PlateRecord {
  id: string;
  partyId: string;
  partyName: string;
  bookId?: string;
  bookName: string;
  lotNo?: string; // কত নম্বর লটে আছে (গোডাউনে থাকলে)
  plateCount: number;
  size: string; // যেমন: ২৩×৩৬, ২০×৩০
  location: PlateLocation; // 'press' | 'godown' | 'sold' | 'returned'
  returnDate?: string;
  returnedThrough?: string; // কার মাধ্যমে ফেরত
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PaperStockType = 'inward' | 'outward';

export interface PaperStockRecord {
  id: string;
  date: string;
  type: PaperStockType; // 'inward' = আসলো, 'outward' = খরচ/বিয়োগ
  paperType: string; // কী কাগজ: হোয়াইট পেপার, নিউজপ্রিন্ট, আর্ট পেপার, অফসেট পেপার, কার্ট্রিজ ইত্যাদি
  size: string; // সাইজ: ২৩×৩৬, ২০×৩০, ২৫×৩৭, ১৮×২৮ বা যেকোনো কাস্টম সাইজ
  gsm?: string; // কত গ্রাম এর কাগজ (যেমন: ৫৫ গ্রাম, ৬৫ গ্রাম, ৭০ গ্রাম, ৮০ গ্রাম, ইত্যাদি)
  company: string; // কোম্পানি / মিল: কর্ণফুলী, বসুন্ধরা, পারটেক্স, মেঘনা ইত্যাদি
  reams: number; // কত রিম
  sheetsPerReam?: number;
  partyId?: string;
  partyName?: string;
  challanNo?: string;
  productionId?: string; // linked production if auto-deducted
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// কালির দোকান ও মালামাল ক্রয় (Ink & Press Materials)
// ==========================================

export interface InkSupplier {
  id: string;
  name: string; // কালির দোকান বা সাপ্লায়ারের নাম
  proprietor?: string; // স্বত্বাধিকারী / ব্যক্তির নাম
  contactPerson?: string; // মালিক বা প্রতিনিধির নাম
  phone?: string; // মোবাইল নম্বর (কল করার সুবিধা থাকবে)
  address?: string; // ঠিকানা / মার্কেট
  openingDue: number; // কালির দোকানে পূর্বের বাকি
  notes?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PurchaseUnit =
  | 'কেজি'
  | 'পিস'
  | 'টিন'
  | 'পাউন্ড'
  | 'লিটার'
  | 'ইঞ্চি'
  | 'ফিট'
  | 'রোল'
  | 'কার্টন'
  | 'গ্যালন'
  | 'বোতল'
  | 'সেট'
  | 'অন্যান্য'
  | string;

export interface InkPurchaseRecord {
  id: string;
  supplierId: string; // কালির দোকান আইডি
  supplierName: string; // কালির দোকান নাম
  date: string; // ক্রয়ের তারিখ YYYY-MM-DD
  itemName: string; // বিবরণ মানে কি কি নিলাম (কালির নাম / মালামালের বিবরণ)
  unit: PurchaseUnit; // কেজি, পিস, টিন, পাউন্ড, লিটার, ইঞ্চি, ফিট ইত্যাদি
  quantity: number; // পরিমাণ
  unitPrice: number; // দর
  totalAmount: number; // মোট (পরিমাণ * দর)
  carrierName?: string; // কালি কে নিয়ে আসলো বা মাধ্যম এর নাম (অপশনাল)
  paymentType: 'cash' | 'due' | 'partial'; // বাকি না নগদ
  paidAmount?: number; // নগদ পরিশোধকৃত টাকা
  dueAmount?: number; // অবশিষ্ট বাকি টাকা
  paymentMethod?: string; // নগদ, বিকাশ, ব্যাংক
  invoiceNo?: string; // মেমো / চালান নম্বর
  invoiceOrChallanNo?: string; // মেমো নম্বর
  expenseTransactionId?: string; // ক্যাশ বুক খরচ ট্রানজেকশন রেফারেন্স
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InkSupplierPayment {
  id: string;
  supplierId: string;
  supplierName: string;
  date: string;
  amount: number;
  paymentMethod: string; // cash, bank, bkash, nagad, etc.
  carrierName?: string; // কার মাধ্যমে দেওয়া হলো
  receiptNo?: string; // রসিদ বা মেমো রেফারেন্স
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InkOrderSlipItem {
  id: string;
  itemName: string; // কালি বা প্রেস মালামালের নাম
  unit: PurchaseUnit; // কেজি, টিন, পিস, লিটার ইত্যাদি
  quantity: number; // পরিমাণ
  unitPrice?: number; // ঐচ্ছিক — পরে বসানো যাবে
  totalAmount?: number; // quantity * unitPrice
  notes?: string;
}

export interface InkOrderSlip {
  id: string;
  slipNo: string;
  date: string;
  supplierId: string;
  supplierName: string;
  supplierPhone?: string;
  supplierAddress?: string;
  carrierName?: string; // বাহক / কে আনবে
  deliveryDate?: string;
  status: 'pending' | 'sent' | 'received_priced';
  items: InkOrderSlipItem[];
  totalItems: number;
  totalEstimatedAmount: number;
  postedToPurchases?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// ব্যবহারকারী ও এক্সেস নিয়ন্ত্রণ (RBAC & User Access)
// ==========================================

export type AppPermissionModule =
  | 'dashboard'
  | 'parties'
  | 'books'
  | 'production'
  | 'plates'
  | 'paperStock'
  | 'billing'
  | 'collections'
  | 'incomeExpense'
  | 'inkSuppliers'
  | 'employees'
  | 'attendance'
  | 'combinedAttendance'
  | 'payroll'
  | 'cutting'
  | 'putti'
  | 'reports'
  | 'dataMgmt'
  | 'settings'
  | 'userAccess';

export type UserApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface AppUserAccess {
  uid: string;
  email: string;
  loginUsername?: string; // অ্যাডমিন কর্তৃক সেট করা ইউজারনেম (ঐচ্ছিক)
  assignedPassword?: string; // অ্যাডমিন কর্তৃক সেট করা পাসওয়ার্ড রেফারেন্স
  displayName: string;
  photoURL?: string;
  status: UserApprovalStatus; // 'pending' | 'approved' | 'rejected'
  role: 'super_admin' | 'admin' | 'manager' | 'operator' | 'accountant' | 'viewer' | 'custom';
  isReadOnly?: boolean; // শুধুমাত্র দেখতে পারবে, পরিবর্তন করতে পারবে না
  businessId?: string;
  permissions: Record<AppPermissionModule, boolean>;
  requestedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  notes?: string;
}

// ==========================================
// মাল্টি-বিজনেস, ফ্রি ট্রায়াল ও সাবস্ক্রিপশন (SaaS)
// ==========================================

export type SubscriptionPlanType = 'trial' | 'monthly' | 'yearly' | 'one_time' | 'lifetime';

export type BusinessApprovalStatus = 'pending' | 'approved' | 'suspended';

export interface SubscriptionPlanConfig {
  planType: SubscriptionPlanType;
  labelBn: string;
  durationDays: number | null; // null = আজীবন / এককালীন
  basePrice: number;
  descriptionBn: string;
}

export interface PaymentMethodConfig {
  id: string;
  name: string;
  accountType: string;
  accountNumber: string;
  instructions?: string;
  enabled: boolean;
}

export interface SubscriptionPaymentRequest {
  id: string;
  businessId: string;
  businessName: string;
  ownerEmail: string;
  planType: SubscriptionPlanType;
  planLabel: string;
  basePrice: number;
  discountType?: 'amount' | 'percent';
  discountValue?: number;
  discountAmount: number;
  payableAmount: number;
  paidAmount: number;
  paymentMethodId: string;
  paymentMethodName: string;
  senderNumber: string;
  transactionId: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface SaaSPlatformSettings {
  defaultTrialDays: number;
  plans: {
    trial: SubscriptionPlanConfig;
    monthly: SubscriptionPlanConfig;
    yearly: SubscriptionPlanConfig;
    one_time: SubscriptionPlanConfig;
  };
  freeModules: AppPermissionModule[];
  paidModules: AppPermissionModule[];
  supportPhone?: string;
  supportEmail?: string;
  paymentInstructions?: string;
  paymentMethods?: PaymentMethodConfig[];
  updatedAt: string;
}

export interface RegisteredBusiness {
  id: string;
  name: string;
  nameEn?: string;
  ownerUid: string;
  ownerEmail: string;
  ownerName: string;
  phone?: string;
  address?: string;
  shopPassword?: string;
  status: BusinessApprovalStatus;
  planType: SubscriptionPlanType;
  customPrice: number;
  discountType?: 'amount' | 'percent';
  discountValue?: number;
  discountAmount: number;
  finalPrice: number;
  paidAmount: number;
  durationDays: number | null; // null = আজীবন / এককালীন
  activatedAt: string;
  expiresAt: string | null; // null = আজীবন
  memberEmails?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartyPortalAccount {
  id: string;
  businessId: string;
  businessName: string;
  partyId: string;
  partyName: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  loginId: string;
  password?: string;
  uid?: string;
  status: 'pending' | 'approved' | 'rejected' | 'disabled';
  createdBy: 'admin' | 'self_signup';
  createdAt: string;
  updatedAt: string;
}

export interface SaaSRegistryState {
  platformSettings: SaaSPlatformSettings;
  businesses: RegisteredBusiness[];
  paymentRequests?: SubscriptionPaymentRequest[];
  partyAccounts?: PartyPortalAccount[];
  updatedAt: string;
}

export interface DatabaseState {
  settings: CompanySettings;
  parties: Party[];
  books: Book[];
  productions: Production[];
  invoices: Invoice[];
  collections: Collection[];
  employees: Employee[];
  attendance: AttendanceRecord[];
  advances: EmployeeAdvance[];
  payrolls: PayrollRecord[];
  cuttingWorkers: CuttingWorker[];
  cuttingRecords: PaperCuttingRecord[];
  puttiSales: PuttiSaleRecord[];
  transactions: IncomeExpenseTransaction[];
  plates: PlateRecord[];
  paperStock: PaperStockRecord[];
  inkSuppliers: InkSupplier[];
  inkPurchases: InkPurchaseRecord[];
  inkSupplierPayments: InkSupplierPayment[];
  orderSlips?: OrderSlip[];
  inkOrderSlips?: InkOrderSlip[];
  userAccessList?: AppUserAccess[];
}

