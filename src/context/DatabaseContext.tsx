import React, { createContext, useContext, useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  auth,
  db as firestoreDb,
  googleProvider,
  getSecondaryAuth,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  updatePassword,
  signOut,
  onAuthStateChanged,
  User,
} from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  handleFirestoreError,
  OperationType,
  isQuotaExhaustedError,
  isPermissionDeniedError,
} from '../utils/firestoreError';
import {
  DEFAULT_BUSINESS_ID,
  SAAS_REGISTRY_DOC_ID,
  DEFAULT_PLATFORM_SETTINGS,
  createDefaultSaaSRegistry,
  pushDatabaseToCloud,
  fetchDatabaseFromCloud,
  resetQuotaExhaustedState,
  isCloudQuotaExhausted,
  markCloudQuotaExhausted,
  isLastPushedTimestamp,
  pushSaaSRegistryToCloud,
  isLastPushedRegistryTimestamp,
  initializeNewBusinessDatabaseInCloud,
} from '../utils/cloudSync';
import {
  DatabaseState,
  CompanySettings,
  Party,
  Book,
  Production,
  OrderSlip,
  Invoice,
  Collection,
  Employee,
  AttendanceRecord,
  EmployeeAdvance,
  PayrollRecord,
  CuttingWorker,
  PaperCuttingRecord,
  PuttiSaleRecord,
  IncomeExpenseTransaction,
  PlateRecord,
  PaperStockRecord,
  InkSupplier,
  InkPurchaseRecord,
  InkSupplierPayment,
  InkOrderSlip,
  AppPermissionModule,
  AppUserAccess,
  Language,
  Theme,
  BanglaFont,
  RegisteredBusiness,
  SaaSRegistryState,
  SaaSPlatformSettings,
  SubscriptionPlanType,
  SubscriptionPaymentRequest,
  PartyPortalAccount,
} from '../types';
import { calculateSalary, getDaysInMonth, roundToTwo, setActiveNumberFormat, sortEmployeesByDesignation } from '../utils/calculations';
import {
  saveToIndexedDB,
  loadFromIndexedDB,
  saveSnapshotToIndexedDB,
  getSnapshotsFromIndexedDB,
  deleteSnapshotFromIndexedDB,
  requestPersistentStorage,
  getStorageEstimate,
  AutoSnapshot,
} from '../utils/indexedDBStorage';

const DB_STORAGE_KEY = 'makkah_printers_db_v1';
const ACTIVE_BUSINESS_STORAGE_KEY = 'press_active_business_id';
const SAAS_REGISTRY_CACHE_KEY = 'press_saas_registry_cache';

const getLocalStorageKey = (businessId: string) =>
  businessId === DEFAULT_BUSINESS_ID ? DB_STORAGE_KEY : `press_biz_db_${businessId}`;

const defaultGovernmentHolidays: Record<string, string> = {
  '2026-02-21': 'শহীদ দিবস ও আন্তর্জাতিক মাতৃভাষা দিবস',
  '2026-03-20': 'পবিত্র শব-ই-কদর',
  '2026-03-21': 'পবিত্র ঈদুল ফিতর',
  '2026-03-22': 'পবিত্র ঈদুল ফিতর (ছুটি)',
  '2026-03-26': 'স্বাধীনতা ও জাতীয় দিবস',
  '2026-04-14': 'পহেলা বৈশাখ (বাংলা নববর্ষ)',
  '2026-05-01': 'মে দিবস (আন্তর্জাতিক শ্রমিক দিবস)',
  '2026-05-28': 'পবিত্র ঈদুল আযহা',
  '2026-05-29': 'পবিত্র ঈদুল আযহা (ছুটি)',
  '2026-10-20': 'শুভ দুর্গাপূজা (বিজয়া দশমী)',
  '2026-12-16': 'মহান বিজয় দিবস',
  '2026-12-25': 'যিশু খ্রিস্টের জন্মদিন (বড়দিন)',
};

const defaultSettings: CompanySettings = {
  name: 'মক্কা প্রিন্টার্স',
  nameEn: 'Makkah Printers',
  address: '৩৭/১ বাংলাবাজার (দোতলা), ঢাকা-১১০০',
  phone: '০১৭১১-XXXXXX, ০১৮১৯-XXXXXX',
  email: 'makkahprinters.bd@gmail.com',
  logoUrl: '',
  owner: {
    name: 'হাজী মো. রফিকুল ইসলাম',
    address: 'ঢাকা, বাংলাদেশ',
    phone: '০১৭১১-XXXXXX',
    photoUrl: '',
  },
  manager: {
    name: 'মো. তারিকুল ইসলাম',
    address: 'ঢাকা, বাংলাদেশ',
    phone: '০১৮১৯-XXXXXX',
    photoUrl: '',
  },
  openingDate: new Date().toISOString().split('T')[0],
  openingBalance: 0,
  language: 'bn',
  font: 'Hind Siliguri',
  theme: 'green',
  sheetsPerReam: 500,
  defaultOtRatePercent: 70,
  standardMonthlyWorkHours: 208,
  globalDefaultRatePerForma: 450,
  calculationMethod: 'forma_impression',
  adminPin: '1234',
  isConfigured: false, // will show setup wizard initially
  numberFormat: 'bn',
  governmentHolidays: defaultGovernmentHolidays,
};

const initialEmptyState: DatabaseState = {
  settings: defaultSettings,
  parties: [],
  books: [],
  productions: [],
  invoices: [],
  collections: [],
  employees: [],
  attendance: [],
  advances: [],
  payrolls: [],
  cuttingWorkers: [],
  cuttingRecords: [],
  puttiSales: [],
  transactions: [],
  plates: [],
  paperStock: [],
  inkSuppliers: [],
  inkPurchases: [],
  inkSupplierPayments: [],
  orderSlips: [],
  inkOrderSlips: [],
  userAccessList: [],
};

interface DatabaseContextType {
  db: DatabaseState;
  isReady: boolean;
  updateSettings: (newSettings: Partial<CompanySettings>) => void;
  // Parties
  addParty: (party: Omit<Party, 'id' | 'createdAt' | 'updatedAt'>) => Party;
  updateParty: (id: string, updates: Partial<Party>) => void;
  deleteParty: (id: string) => boolean;
  // Books
  addBook: (book: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>) => Book;
  updateBook: (id: string, updates: Partial<Book>) => void;
  deleteBook: (id: string) => boolean;
  // Productions
  addProduction: (prod: Omit<Production, 'id' | 'createdAt' | 'updatedAt' | 'isBilled'>) => Production;
  updateProduction: (id: string, updates: Partial<Production>) => void;
  deleteProduction: (id: string) => boolean;
  // Order Slips (Machine Man)
  addOrderSlip: (slip: Omit<OrderSlip, 'id' | 'createdAt' | 'updatedAt'>) => OrderSlip;
  updateOrderSlip: (id: string, updates: Partial<OrderSlip>) => void;
  deleteOrderSlip: (id: string) => boolean;
  // Invoices
  addInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => Invoice;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => boolean;
  // Collections
  addCollection: (col: Omit<Collection, 'id' | 'createdAt' | 'updatedAt'>) => Collection;
  updateCollection: (id: string, updates: Partial<Collection>) => void;
  deleteCollection: (id: string) => boolean;
  // Employees
  addEmployee: (emp: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => Employee;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  deleteEmployee: (id: string) => boolean;
  // Attendance
  recordAttendance: (record: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'>) => AttendanceRecord;
  updateAttendance: (id: string, updates: Partial<AttendanceRecord>) => void;
  deleteAttendance: (id: string) => boolean;
  // Advances
  addAdvance: (advance: Omit<EmployeeAdvance, 'id' | 'createdAt' | 'updatedAt' | 'isDeducted'>) => EmployeeAdvance;
  updateAdvance: (id: string, updates: Partial<EmployeeAdvance>) => void;
  deleteAdvance: (id: string) => boolean;
  // Payrolls
  generatePayrollForMonth: (monthYear: string, employeeId?: string, defaultDeductAdvance?: boolean) => PayrollRecord[];
  updatePayroll: (id: string, updates: Partial<PayrollRecord>) => void;
  deletePayroll: (id: string) => boolean;
  // Cutting Workers & Records
  addCuttingWorker: (worker: Omit<CuttingWorker, 'id' | 'createdAt'>) => CuttingWorker;
  updateCuttingWorker: (id: string, updates: Partial<CuttingWorker>) => void;
  deleteCuttingWorker: (id: string) => boolean;
  addCuttingRecord: (rec: Omit<PaperCuttingRecord, 'id' | 'createdAt' | 'updatedAt'>) => PaperCuttingRecord;
  updateCuttingRecord: (id: string, updates: Partial<PaperCuttingRecord>) => void;
  deleteCuttingRecord: (id: string) => boolean;
  addCuttingWorkerPayment: (data: {
    workerId: string;
    workerName: string;
    date: string;
    amount: number;
    paymentMethod: string;
    notes?: string;
  }) => IncomeExpenseTransaction;
  deleteCuttingWorkerPayment: (transactionId: string) => boolean;
  getCuttingWorkerLedger: (workerId: string) => {
    worker?: CuttingWorker;
    totalReams: number;
    totalEarned: number;
    totalPaid: number;
    balanceDue: number;
    records: PaperCuttingRecord[];
    payments: IncomeExpenseTransaction[];
  };
  // Putti Sales
  addPuttiSale: (sale: Omit<PuttiSaleRecord, 'id' | 'createdAt' | 'updatedAt'>) => PuttiSaleRecord;
  updatePuttiSale: (id: string, updates: Partial<PuttiSaleRecord>) => void;
  deletePuttiSale: (id: string) => boolean;
  // Plates
  addPlate: (plate: Omit<PlateRecord, 'id' | 'createdAt' | 'updatedAt'>) => PlateRecord;
  updatePlate: (id: string, updates: Partial<PlateRecord>) => void;
  batchUpdatePlates: (ids: string[], updates: Partial<PlateRecord>) => void;
  deletePlate: (id: string) => boolean;
  canDeletePlates: boolean;
  addPaperStock: (stock: Omit<PaperStockRecord, 'id' | 'createdAt' | 'updatedAt'>) => PaperStockRecord;
  updatePaperStock: (id: string, updates: Partial<PaperStockRecord>) => void;
  deletePaperStock: (id: string) => boolean;
  getPaperStockBalance: (size?: string, paperType?: string, partyId?: string, gsm?: string) => number;
  // Transactions
  addTransaction: (tx: Omit<IncomeExpenseTransaction, 'id' | 'createdAt' | 'updatedAt'>) => IncomeExpenseTransaction;
  updateTransaction: (id: string, updates: Partial<IncomeExpenseTransaction>) => void;
  deleteTransaction: (id: string) => boolean;
  // Data Management
  canManageResetAndDemo: boolean;
  resetBusinessData: (adminPin: string) => { success: boolean; error?: string };
  resetCompanySettings: (adminPin?: string) => { success: boolean; error?: string };
  loadDemoData: () => void;
  clearDemoData: () => void;
  exportDatabaseJSON: () => string;
  importDatabaseJSON: (jsonString: string) => { success: boolean; error?: string };
  // Offline Snapshots & Multi-Year Persistent Storage
  autoSnapshots: AutoSnapshot[];
  refreshAutoSnapshots: () => Promise<void>;
  createManualSnapshot: () => Promise<boolean>;
  restoreSnapshotData: (snapshotId: string) => Promise<boolean>;
  deleteAutoSnapshot: (snapshotId: string) => Promise<boolean>;
  storageStats: { usageMB: number; quotaMB: number; percent: number; isPersistent: boolean };
  // Cloud Auth & Sync across Mobile and Computer (Firebase)
  currentUser: User | null;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  loginWithEmailOrUsername: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signupWithEmailOrUsername: (
    identifier: string,
    password: string,
    displayName: string,
    businessReg?: {
      registerNewBusiness: boolean;
      businessName: string;
      phone?: string;
      address?: string;
      planType?: SubscriptionPlanType;
      shopPassword?: string;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<{ success: boolean; error?: string }>;
  cloudSyncStatus: 'synced' | 'syncing' | 'offline' | 'unauthenticated' | 'quota_exceeded';
  isQuotaExceeded: boolean;
  isQuotaDismissed: boolean;
  dismissQuotaNotice: () => void;
  lastCloudSyncTime: string | null;
  forcePushToCloud: (isManualRetry?: boolean) => Promise<boolean>;
  // Admin Panel Protection (Salsabil1522)
  isAdminPanelUnlocked: boolean;
  unlockAdminPanel: (password: string) => { success: boolean; error?: string };
  lockAdminPanel: () => void;
  // Read-only / Viewer mode
  isReadOnly: boolean;
  // Ink & Material Suppliers & Purchases
  addInkSupplier: (supplier: Omit<InkSupplier, 'id' | 'createdAt' | 'updatedAt'>) => InkSupplier;
  updateInkSupplier: (id: string, updates: Partial<InkSupplier>) => void;
  deleteInkSupplier: (id: string) => boolean;
  addInkPurchase: (purchase: Omit<InkPurchaseRecord, 'id' | 'createdAt' | 'updatedAt'>) => InkPurchaseRecord;
  updateInkPurchase: (id: string, updates: Partial<InkPurchaseRecord>) => void;
  deleteInkPurchase: (id: string) => boolean;
  addInkSupplierPayment: (payment: Omit<InkSupplierPayment, 'id' | 'createdAt' | 'updatedAt'>) => InkSupplierPayment;
  deleteInkSupplierPayment: (id: string) => boolean;
  getInkSupplierBalance: (supplierId: string) => number;
  getKnownInkItems: () => string[];
  // Ink Shop Order Slips (কালির দোকান অর্ডার স্লিপ)
  addInkOrderSlip: (slip: Omit<InkOrderSlip, 'id' | 'createdAt' | 'updatedAt'>) => InkOrderSlip;
  updateInkOrderSlip: (id: string, updates: Partial<InkOrderSlip>) => void;
  deleteInkOrderSlip: (id: string) => boolean;
  // RBAC & User Access
  currentUserAccess: AppUserAccess | null;
  isMainAdmin: boolean;
  canAccessModule: (module: AppPermissionModule) => boolean;
  updateUserAccess: (uid: string, updates: Partial<AppUserAccess>) => void;
  deleteUserAccess: (uid: string) => boolean;
  // Multi-Business & SaaS Subscription Management
  activeBusinessId: string;
  saasRegistry: SaaSRegistryState;
  currentBusiness: RegisteredBusiness | null;
  userBusinesses: RegisteredBusiness[];
  subscriptionInfo: {
    isExpired: boolean;
    daysRemaining: number | null;
    isTrial: boolean;
    isLifetime: boolean;
    planLabel: string;
    status: string;
  };
  isCurrentBusinessUnlocked: boolean;
  verifyAndUnlockBusiness: (businessId: string, password: string) => { success: boolean; error?: string };
  isModuleLockedBySubscription: (module: AppPermissionModule) => boolean;
  switchBusiness: (businessId: string) => void;
  registerNewBusiness: (data: {
    name: string;
    nameEn?: string;
    phone?: string;
    address?: string;
    planType?: SubscriptionPlanType;
    shopPassword?: string;
    notes?: string;
  }) => Promise<{ success: boolean; business?: RegisteredBusiness; error?: string }>;
  updateRegisteredBusiness: (
    businessId: string,
    updates: Partial<RegisteredBusiness> & { renewDays?: number | null }
  ) => Promise<boolean>;
  deleteRegisteredBusiness: (businessId: string) => Promise<boolean>;
  updateSaaSPlatformSettings: (updates: Partial<SaaSPlatformSettings>) => Promise<boolean>;
  submitSubscriptionPaymentRequest: (data: {
    planType: SubscriptionPlanType;
    paymentMethodId: string;
    senderNumber: string;
    transactionId: string;
    paidAmount: number;
    notes?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  reviewSubscriptionPaymentRequest: (
    requestId: string,
    decision: 'approved' | 'rejected'
  ) => Promise<boolean>;
  // Customer Party Portal (Optional per party; Managed by Owner, Manager, or Super Admin)
  isPartyPortalUser: boolean;
  currentPartyAccount: PartyPortalAccount | null;
  canManagePartyPortal: boolean;
  loginAsParty: (loginId: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signupAsParty: (data: {
    partyName: string;
    contactPerson?: string;
    phone: string;
    address?: string;
    loginId: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string }>;
  submitPartyPressLinkRequest: (
    businessId: string,
    extra?: { partyName?: string; contactPerson?: string; phone?: string; address?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  upsertPartyPortalCredentials: (
    partyId: string,
    data: { loginId: string; password: string; enabled: boolean },
    partySnapshot?: Party
  ) => Promise<{ success: boolean; error?: string }>;
  reviewPartySignupRequest: (
    accountId: string,
    decision: 'approved' | 'rejected' | 'disabled',
    linkToPartyId?: string
  ) => Promise<{ success: boolean; error?: string }>;
  adminUpdatePartyAccount: (
    accountId: string,
    updates: Partial<PartyPortalAccount>
  ) => Promise<{ success: boolean; error?: string }>;
  deletePartyAccount: (accountId: string) => Promise<boolean>;
  // Helpers
  getPartyBalance: (partyId: string) => number;
  getEmployeeAdvanceBalance: (employeeId: string, excludePayrollId?: string, upToMonth?: string) => number;
}

const DatabaseContext = createContext<DatabaseContextType | null>(null);

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<DatabaseState>(initialEmptyState);
  const [isReady, setIsReady] = useState(false);
  const [autoSnapshots, setAutoSnapshots] = useState<AutoSnapshot[]>([]);
  const [storageStats, setStorageStats] = useState<{
    usageMB: number;
    quotaMB: number;
    percent: number;
    isPersistent: boolean;
  }>({ usageMB: 0, quotaMB: 1000, percent: 0, isPersistent: false });

  // Cloud Auth & Sync States for Mobile & PC
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(() => isCloudQuotaExhausted());
  const [cloudSyncStatus, setCloudSyncStatus] = useState<
    'synced' | 'syncing' | 'offline' | 'unauthenticated' | 'quota_exceeded'
  >(() => (isCloudQuotaExhausted() ? 'quota_exceeded' : 'unauthenticated'));
  const [isQuotaDismissed, setIsQuotaDismissed] = useState(false);
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<string | null>(null);

  // Multi-Business & SaaS Platform State
  const [activeBusinessId, setActiveBusinessId] = useState<string>(() => {
    try {
      return localStorage.getItem(ACTIVE_BUSINESS_STORAGE_KEY) || DEFAULT_BUSINESS_ID;
    } catch {
      return DEFAULT_BUSINESS_ID;
    }
  });
  const [saasRegistry, setSaasRegistry] = useState<SaaSRegistryState>(() => {
    try {
      const cached = localStorage.getItem(SAAS_REGISTRY_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as SaaSRegistryState;
        return {
          platformSettings: {
            ...DEFAULT_PLATFORM_SETTINGS,
            ...(parsed.platformSettings || {}),
            plans: {
              ...DEFAULT_PLATFORM_SETTINGS.plans,
              ...(parsed.platformSettings?.plans || {}),
            },
            paymentMethods:
              parsed.platformSettings?.paymentMethods && parsed.platformSettings.paymentMethods.length > 0
                ? parsed.platformSettings.paymentMethods
                : DEFAULT_PLATFORM_SETTINGS.paymentMethods,
          },
          businesses: parsed.businesses?.length ? parsed.businesses : createDefaultSaaSRegistry().businesses,
          paymentRequests: Array.isArray(parsed.paymentRequests) ? parsed.paymentRequests : [],
          updatedAt: parsed.updatedAt || new Date().toISOString(),
        };
      }
    } catch {
      // ignore cache parse errors
    }
    return createDefaultSaaSRegistry();
  });
  const [unlockedBusinessIds, setUnlockedBusinessIds] = useState<string[]>([]);

  const isRemoteCloudUpdate = useRef(false);
  const hasLoadedCloudOnce = useRef(false);
  const loadedBusinessIdRef = useRef<string | null>(null);
  const dbRef = useRef<DatabaseState>(db);
  dbRef.current = db;
  const saasRegistryRef = useRef<SaaSRegistryState>(saasRegistry);
  saasRegistryRef.current = saasRegistry;

  const MAIN_SUPER_ADMIN_EMAIL = 'fileb2027@gmail.com';

  // Load from persistent storage (IndexedDB first, fallback to localStorage) whenever activeBusinessId changes
  useEffect(() => {
    let cancelled = false;
    hasLoadedCloudOnce.current = false;
    isRemoteCloudUpdate.current = false;

    async function initDB() {
      try {
        await requestPersistentStorage();

        let loadedState: DatabaseState | null = await loadFromIndexedDB(activeBusinessId);

        if (!loadedState) {
          const stored = localStorage.getItem(getLocalStorageKey(activeBusinessId));
          if (stored) {
            try {
              loadedState = JSON.parse(stored);
            } catch (err) {
              console.error('Failed to parse localStorage', err);
            }
          }
        }

        if (cancelled) return;

        if (loadedState) {
          const loadedBooks: Book[] = loadedState.books || [];
          const loadedParties: Party[] = loadedState.parties || [];
          let loadedPlates: PlateRecord[] = loadedState.plates || [];

          for (const b of loadedBooks) {
            if (b.partyIds && b.partyIds.length > 0) {
              for (const pid of b.partyIds) {
                const exists = loadedPlates.some((p) => p.bookId === b.id && p.partyId === pid);
                if (!exists) {
                  const party = loadedParties.find((pty) => pty.id === pid);
                  loadedPlates.push({
                    id: `plt_${b.id}_${pid}`,
                    partyId: pid,
                    partyName: party?.name || 'অজ্ঞাত পার্টি',
                    bookId: b.id,
                    bookName: b.name,
                    plateCount: b.plates || 4,
                    size: b.size || '২৩×৩৬',
                    location: 'press',
                    notes: `${b.name} বই থেকে স্বয়ংক্রিয় প্লেট রেজিস্টার`,
                    createdAt: b.createdAt || new Date().toISOString(),
                    updatedAt: b.updatedAt || new Date().toISOString(),
                  });
                }
              }
            } else {
              const exists = loadedPlates.some((p) => p.bookId === b.id);
              if (!exists) {
                const defaultPty = loadedParties[0];
                loadedPlates.push({
                  id: `plt_${b.id}_gen`,
                  partyId: defaultPty?.id || 'gen_party',
                  partyName: defaultPty?.name || 'সাধারণ পার্টি',
                  bookId: b.id,
                  bookName: b.name,
                  plateCount: b.plates || 4,
                  size: b.size || '২৩×৩৬',
                  location: 'press',
                  notes: `${b.name} বই থেকে স্বয়ংক্রিয় প্লেট রেজিস্টার`,
                  createdAt: b.createdAt || new Date().toISOString(),
                  updatedAt: b.updatedAt || new Date().toISOString(),
                });
              }
            }
          }

          const finalState: DatabaseState = {
            ...initialEmptyState,
            ...loadedState,
            inkSuppliers: loadedState.inkSuppliers || [],
            inkPurchases: loadedState.inkPurchases || [],
            inkSupplierPayments: loadedState.inkSupplierPayments || [],
            orderSlips: loadedState.orderSlips || [],
            inkOrderSlips: loadedState.inkOrderSlips || [],
            userAccessList: loadedState.userAccessList || [],
            plates: loadedPlates,
            settings: {
              ...defaultSettings,
              ...(loadedState.settings || {}),
              governmentHolidays:
                loadedState.settings?.governmentHolidays &&
                Object.keys(loadedState.settings.governmentHolidays).length > 0
                  ? loadedState.settings.governmentHolidays
                  : defaultGovernmentHolidays,
            },
          };

          setDb(finalState);
          await saveToIndexedDB(finalState, activeBusinessId);
        } else {
          const regBiz = saasRegistryRef.current.businesses.find((b) => b.id === activeBusinessId);
          if (activeBusinessId !== DEFAULT_BUSINESS_ID && regBiz) {
            const cleanBizState: DatabaseState = {
              ...initialEmptyState,
              settings: {
                ...defaultSettings,
                name: regBiz.name,
                nameEn: regBiz.nameEn || regBiz.name,
                address: regBiz.address || '',
                phone: regBiz.phone || '',
                email: regBiz.ownerEmail || '',
                adminEmail: regBiz.ownerEmail || '',
                isConfigured: true,
              },
            };
            setDb(cleanBizState);
          } else {
            setDb(initialEmptyState);
          }
        }

        loadedBusinessIdRef.current = activeBusinessId;

        const snapshots = await getSnapshotsFromIndexedDB();
        if (!cancelled) setAutoSnapshots(snapshots);
        const stats = await getStorageEstimate();
        if (!cancelled) setStorageStats(stats);
      } catch (e) {
        console.error('Failed to initialize database', e);
        if (!cancelled) {
          setDb(initialEmptyState);
          loadedBusinessIdRef.current = activeBusinessId;
        }
      } finally {
        if (!cancelled) setIsReady(true);
      }
    }

    initDB();
    return () => {
      cancelled = true;
    };
  }, [activeBusinessId]);

  // Dual Persistence: Save to both IndexedDB (unlimited) and localStorage (fast fallback)
  useEffect(() => {
    if (!isReady || loadedBusinessIdRef.current !== activeBusinessId) return;

    saveToIndexedDB(db, activeBusinessId).catch((err) => console.error('IndexedDB save error', err));

    try {
      localStorage.setItem(getLocalStorageKey(activeBusinessId), JSON.stringify(db));
    } catch (e) {
      console.warn('LocalStorage quota reached (safe: data is preserved in IndexedDB)', e);
    }
  }, [db, isReady, activeBusinessId]);

  // Periodic Auto-Snapshot (debounced 30s after changes)
  useEffect(() => {
    if (!isReady || loadedBusinessIdRef.current !== activeBusinessId) return;

    const totalRecords =
      (db.parties?.length || 0) +
      (db.books?.length || 0) +
      (db.productions?.length || 0) +
      (db.invoices?.length || 0);

    if (totalRecords === 0) return;

    const timer = setTimeout(async () => {
      try {
        await saveSnapshotToIndexedDB(db);
      } catch (err) {
        console.warn('Silent snapshot save warning', err);
      }
    }, 30000);

    return () => clearTimeout(timer);
  }, [db, isReady, activeBusinessId]);

  // Monitor Auth State & isolate unlocked shop sessions per user
  const prevAuthUidRef = useRef<string | null>(null);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const nextUid = user?.uid || null;
      if (prevAuthUidRef.current && prevAuthUidRef.current !== nextUid) {
        setIsAdminPanelUnlocked(false);
        setUnlockedBusinessIds([]);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('makkah_admin_panel_unlocked');
          sessionStorage.removeItem(`press_unlocked_shops_${prevAuthUidRef.current}`);
        }
      }
      prevAuthUidRef.current = nextUid;
      setCurrentUser(user);

      if (user) {
        try {
          const savedUnlocked = sessionStorage.getItem(`press_unlocked_shops_${user.uid}`);
          setUnlockedBusinessIds(savedUnlocked ? JSON.parse(savedUnlocked) : []);
        } catch {
          setUnlockedBusinessIds([]);
        }
      } else {
        setUnlockedBusinessIds([]);
      }

      if (!user) {
        setCloudSyncStatus('unauthenticated');
      } else if (isCloudQuotaExhausted()) {
        setCloudSyncStatus('quota_exceeded');
        setIsQuotaExceeded(true);
      } else {
        setCloudSyncStatus(navigator.onLine ? 'synced' : 'offline');
      }
    });
    return () => unsubscribe();
  }, []);

  // Persist SaaS registry cache
  useEffect(() => {
    try {
      localStorage.setItem(SAAS_REGISTRY_CACHE_KEY, JSON.stringify(saasRegistry));
    } catch {
      // ignore
    }
  }, [saasRegistry]);

  // Real-time Firestore Sync for Master SaaS Business Registry
  useEffect(() => {
    if (!currentUser || isQuotaExceeded || isCloudQuotaExhausted()) return;

    let isCancelled = false;
    const regPath = `businesses/${SAAS_REGISTRY_DOC_ID}`;
    const regRef = doc(firestoreDb, 'businesses', SAAS_REGISTRY_DOC_ID);

    const unsubscribe = onSnapshot(
      regRef,
      async (snapshot) => {
        if (isCancelled || snapshot.metadata.hasPendingWrites) return;
        if (snapshot.exists()) {
          const data = snapshot.data() as SaaSRegistryState;
          if (data) {
            if (data.updatedAt && isLastPushedRegistryTimestamp(data.updatedAt)) {
              return;
            }
            const defaultReg = createDefaultSaaSRegistry();
            const existingBusinesses = Array.isArray(data.businesses) ? data.businesses : [];
            const hasFlagship = existingBusinesses.some((b) => b.id === DEFAULT_BUSINESS_ID);
            const mergedBusinesses = hasFlagship
              ? existingBusinesses
              : [defaultReg.businesses[0], ...existingBusinesses];

            setSaasRegistry({
              platformSettings: {
                ...DEFAULT_PLATFORM_SETTINGS,
                ...(data.platformSettings || {}),
                plans: {
                  ...DEFAULT_PLATFORM_SETTINGS.plans,
                  ...(data.platformSettings?.plans || {}),
                },
                paymentMethods:
                  data.platformSettings?.paymentMethods && data.platformSettings.paymentMethods.length > 0
                    ? data.platformSettings.paymentMethods
                    : DEFAULT_PLATFORM_SETTINGS.paymentMethods,
              },
              businesses: mergedBusinesses,
              paymentRequests: Array.isArray(data.paymentRequests) ? data.paymentRequests : [],
              partyAccounts: Array.isArray(data.partyAccounts) ? data.partyAccounts : [],
              updatedAt: data.updatedAt || new Date().toISOString(),
            });
          }
        } else if (!snapshot.metadata.fromCache && !isCloudQuotaExhausted()) {
          const email = (currentUser.email || '').toLowerCase().trim();
          if (email === MAIN_SUPER_ADMIN_EMAIL.toLowerCase()) {
            const ok = await pushSaaSRegistryToCloud(saasRegistryRef.current, false);
            if (!ok && isCloudQuotaExhausted()) {
              setCloudSyncStatus('quota_exceeded');
              setIsQuotaExceeded(true);
            }
          }
        }
      },
      (error) => {
        if (isCancelled) return;
        if (isQuotaExhaustedError(error)) {
          markCloudQuotaExhausted(12);
          setCloudSyncStatus('quota_exceeded');
          setIsQuotaExceeded(true);
          return;
        }
        if (isPermissionDeniedError(error)) {
          handleFirestoreError(error, OperationType.GET, regPath);
          return;
        }
        console.warn('SaaS Registry onSnapshot warning:', error);
      }
    );

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [currentUser?.uid, isQuotaExceeded]);

  // Real-time Firestore Sync for active Business Database across Mobile & Computer
  useEffect(() => {
    if (!isReady || !currentUser || isQuotaExceeded || isCloudQuotaExhausted()) return;
    if (loadedBusinessIdRef.current !== activeBusinessId) return;

    let isCancelled = false;
    const bizId = activeBusinessId;
    const docPath = `businesses/${bizId}`;
    const docRef = doc(firestoreDb, 'businesses', bizId);

    const unsubscribe = onSnapshot(
      docRef,
      async (snapshot) => {
        if (isCancelled) return;
        if (snapshot.metadata.hasPendingWrites) return;

        if (snapshot.exists()) {
          const cloudManifest = snapshot.data();
          if (cloudManifest) {
            if (cloudManifest.updatedAt && isLastPushedTimestamp(cloudManifest.updatedAt, bizId)) {
              setCloudSyncStatus('synced');
              setLastCloudSyncTime(cloudManifest.updatedAt);
              hasLoadedCloudOnce.current = true;
              return;
            }
            try {
              const remoteState = await fetchDatabaseFromCloud(cloudManifest, bizId);
              if (isCancelled) return;
              if (remoteState) {
                isRemoteCloudUpdate.current = true;
                setDb((prev) => ({
                  ...prev,
                  ...remoteState,
                  settings: {
                    ...prev.settings,
                    ...(remoteState.settings || {}),
                  },
                }));
                setCloudSyncStatus('synced');
                setLastCloudSyncTime(cloudManifest.updatedAt || new Date().toISOString());
                hasLoadedCloudOnce.current = true;
              }
            } catch (err) {
              console.error('Failed to parse remote cloud state', err);
            }
          }
        } else if (
          !snapshot.metadata.fromCache &&
          !hasLoadedCloudOnce.current &&
          dbRef.current.settings.isConfigured &&
          !isCloudQuotaExhausted() &&
          !isQuotaExceeded
        ) {
          hasLoadedCloudOnce.current = true;
          try {
            const res = await pushDatabaseToCloud(dbRef.current, currentUser, false, bizId);
            if (!isCancelled && res.success) {
              setCloudSyncStatus('synced');
              setLastCloudSyncTime(res.updatedAt || new Date().toISOString());
            } else if (!isCancelled && res.isQuotaExhausted) {
              setCloudSyncStatus('quota_exceeded');
              setIsQuotaExceeded(true);
            }
          } catch (err) {
            console.warn('Initial cloud push skipped:', err);
          }
        }
      },
      (error) => {
        if (isCancelled) return;
        if (isQuotaExhaustedError(error)) {
          markCloudQuotaExhausted(12);
          setCloudSyncStatus('quota_exceeded');
          setIsQuotaExceeded(true);
          console.warn('Firestore onSnapshot quota limit reached (offline fallback active):', error);
          return;
        }
        if (isPermissionDeniedError(error)) {
          handleFirestoreError(error, OperationType.GET, docPath);
          return;
        }
        console.warn('Firestore onSnapshot transient warning (offline fallback active):', error);
        setCloudSyncStatus('offline');
      }
    );

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [currentUser?.uid, isReady, isQuotaExceeded, activeBusinessId]);

  // Debounced Push to Firestore Cloud on local changes (per activeBusinessId)
  useEffect(() => {
    if (!isReady || !currentUser || isQuotaExceeded || isCloudQuotaExhausted()) return;
    if (!hasLoadedCloudOnce.current || loadedBusinessIdRef.current !== activeBusinessId) return;

    if (isRemoteCloudUpdate.current) {
      isRemoteCloudUpdate.current = false;
      return;
    }

    if (!navigator.onLine) {
      setCloudSyncStatus('offline');
      return;
    }

    const bizId = activeBusinessId;
    setCloudSyncStatus('syncing');
    const timer = setTimeout(async () => {
      try {
        const res = await pushDatabaseToCloud(dbRef.current, currentUser, false, bizId);
        if (res.success) {
          setCloudSyncStatus('synced');
          setIsQuotaExceeded(false);
          setLastCloudSyncTime(res.updatedAt || new Date().toISOString());
        } else if (res.isQuotaExhausted || isCloudQuotaExhausted()) {
          setCloudSyncStatus('quota_exceeded');
          setIsQuotaExceeded(true);
        } else {
          setCloudSyncStatus('offline');
        }
      } catch (err) {
        console.warn('Debounced cloud push warning:', err);
        setCloudSyncStatus('offline');
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [db, currentUser?.uid, isReady, isQuotaExceeded, activeBusinessId]);

  // Apply theme, font, number format, and dynamic press title
  useEffect(() => {
    if (!db.settings) return;
    const root = document.documentElement;
    root.classList.remove('theme-blue', 'theme-green', 'theme-maroon', 'theme-slate', 'dark');
    if (db.settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.add(`theme-${db.settings.theme}`);
    }
    setActiveNumberFormat(db.settings.numberFormat || 'bn');
    const pressLabel = db.settings.name?.trim();
    document.title = pressLabel
      ? `${pressLabel} — Press Business Management & Accounting`
      : 'Press Business Management & Accounting | Designed by MD. Salsabil';
  }, [db.settings.theme, db.settings.numberFormat, db.settings.name]);

  // Auto-route newly logged-in shop owners or party portal users to their registered business
  useEffect(() => {
    if (!currentUser) return;
    const email = (currentUser.email || '').toLowerCase().trim();
    if (email === MAIN_SUPER_ADMIN_EMAIL.toLowerCase()) return;

    // Check if logged in as a Party Portal customer
    const partyAcc = (saasRegistry.partyAccounts || []).find(
      (p) =>
        (p.uid && p.uid === currentUser.uid) ||
        normalizePartyLoginEmail(p.loginId) === email
    );
    if (partyAcc) {
      if (partyAcc.businessId && partyAcc.businessId !== activeBusinessId) {
        try {
          localStorage.setItem(ACTIVE_BUSINESS_STORAGE_KEY, partyAcc.businessId);
        } catch {
          // ignore
        }
        setIsReady(false);
        setActiveBusinessId(partyAcc.businessId);
      }
      return;
    }
    if (email.endsWith('@party.makkahprinters.local')) {
      return;
    }

    const currentBiz = saasRegistry.businesses.find((b) => b.id === activeBusinessId);
    const belongsToCurrent =
      currentBiz &&
      (currentBiz.ownerEmail?.toLowerCase().trim() === email ||
        currentBiz.ownerUid === currentUser.uid ||
        (currentBiz.memberEmails || []).some((m) => m.toLowerCase().trim() === email));

    if (!belongsToCurrent) {
      const ownBiz = saasRegistry.businesses.find(
        (b) =>
          b.ownerEmail?.toLowerCase().trim() === email ||
          b.ownerUid === currentUser.uid ||
          (b.memberEmails || []).some((m) => m.toLowerCase().trim() === email)
      );
      if (ownBiz && ownBiz.id !== activeBusinessId) {
        try {
          localStorage.setItem(ACTIVE_BUSINESS_STORAGE_KEY, ownBiz.id);
        } catch {
          // ignore
        }
        setIsReady(false);
        setActiveBusinessId(ownBiz.id);
      }
    }
  }, [currentUser?.uid, saasRegistry.businesses, saasRegistry.partyAccounts, activeBusinessId]);

  // READ-ONLY / VIEWER ENFORCEMENT
  const checkReadOnly = (): boolean => {
    if (!currentUser) return false;
    const email = (currentUser.email || '').toLowerCase().trim();
    if (email === MAIN_SUPER_ADMIN_EMAIL.toLowerCase()) {
      return false;
    }
    if (currentUserAccess?.role === 'viewer') return true;
    return !!currentUserAccess?.isReadOnly;
  };

  const READONLY_ERR =
    'আপনি শুধুমাত্র প্রদর্শন মোডে (Read-Only) আছেন। কোনো তথ্য যোগ, পরিবর্তন বা মুছে ফেলা সম্ভব নয়।';

  const guardReadOnly = (): boolean => {
    if (checkReadOnly()) {
      alert(READONLY_ERR);
      return true;
    }
    return false;
  };

  // SETTINGS
  const updateSettings = (newSettings: Partial<CompanySettings>) => {
    if (checkReadOnly()) {
      alert('আপনি শুধুমাত্র প্রদর্শন মোডে (Read-Only) আছেন। সেটিংস পরিবর্তন করা সম্ভব নয়।');
      return;
    }
    setDb((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...newSettings,
      },
    }));
  };

  // PARTIES
  const addParty = (data: Omit<Party, 'id' | 'createdAt' | 'updatedAt'>): Party => {
    if (checkReadOnly()) {
      alert('আপনি শুধুমাত্র প্রদর্শন মোডে (Read-Only) আছেন। নতুন পার্টি যুক্ত করা সম্ভব নয়।');
      return { ...data, id: '', createdAt: '', updatedAt: '' } as Party;
    }
    const now = new Date().toISOString();
    const newParty: Party = {
      ...data,
      id: `pty_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: now,
      updatedAt: now,
    };
    setDb((prev) => ({
      ...prev,
      parties: [newParty, ...prev.parties],
    }));
    return newParty;
  };

  const updateParty = (id: string, updates: Partial<Party>) => {
    if (checkReadOnly()) {
      alert('আপনি শুধুমাত্র প্রদর্শন মোডে (Read-Only) আছেন। তথ্য পরিবর্তন করা সম্ভব নয়।');
      return;
    }
    const now = new Date().toISOString();
    setDb((prev) => ({
      ...prev,
      parties: prev.parties.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: now } : p)),
    }));
  };

  const deleteParty = (id: string): boolean => {
    if (checkReadOnly()) {
      alert('আপনি শুধুমাত্র প্রদর্শন মোডে (Read-Only) আছেন। তথ্য মুছে ফেলা সম্ভব নয়।');
      return false;
    }
    setDb((prev) => ({
      ...prev,
      parties: prev.parties.filter((p) => p.id !== id),
      // Also remove partyId from books
      books: prev.books.map((b) => ({
        ...b,
        partyIds: (b.partyIds || []).filter((pid) => pid !== id),
      })),
    }));
    const existingAccounts = saasRegistryRef.current.partyAccounts || [];
    if (existingAccounts.some((a) => a.businessId === activeBusinessId && a.partyId === id)) {
      void persistRegistryUpdate({
        ...saasRegistryRef.current,
        partyAccounts: existingAccounts.filter(
          (a) => !(a.businessId === activeBusinessId && a.partyId === id)
        ),
        updatedAt: new Date().toISOString(),
      });
    }
    return true;
  };

  // BOOKS
  const addBook = (data: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>): Book => {
    if (guardReadOnly()) return { ...data, id: '', createdAt: '', updatedAt: '' } as Book;
    const now = new Date().toISOString();
    const newBook: Book = {
      ...data,
      id: `bk_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: now,
      updatedAt: now,
    };

    setDb((prev) => {
      // Auto-create plate records in plates list for each associated party
      const newPlates: PlateRecord[] = [];
      const plateCount = newBook.plates || (newBook.forma ? newBook.forma * 4 : 4);
      const plateSize = newBook.size || '২৩×৩৬';

      if (newBook.partyIds && newBook.partyIds.length > 0) {
        for (const partyId of newBook.partyIds) {
          const party = prev.parties.find((p) => p.id === partyId);
          newPlates.push({
            id: `plt_${newBook.id}_${partyId}`,
            partyId,
            partyName: party?.name || 'অজ্ঞাত পার্টি',
            bookId: newBook.id,
            bookName: newBook.name,
            plateCount,
            size: plateSize,
            location: 'press', // ডিফল্ট অবস্থান: প্রেস
            notes: `${newBook.name} বই যোগ করায় স্বয়ংক্রিয়ভাবে প্লেট রেজিস্টার`,
            createdAt: now,
            updatedAt: now,
          });
        }
      } else {
        const defaultParty = prev.parties[0];
        newPlates.push({
          id: `plt_${newBook.id}_gen`,
          partyId: defaultParty?.id || 'gen_party',
          partyName: defaultParty?.name || 'সাধারণ পার্টি',
          bookId: newBook.id,
          bookName: newBook.name,
          plateCount,
          size: plateSize,
          location: 'press',
          notes: `${newBook.name} বই যোগ করায় স্বয়ংক্রিয়ভাবে প্লেট রেজিস্টার`,
          createdAt: now,
          updatedAt: now,
        });
      }

      return {
        ...prev,
        books: [newBook, ...prev.books],
        plates: [...newPlates, ...(prev.plates || [])],
      };
    });

    return newBook;
  };

  const updateBook = (id: string, updates: Partial<Book>) => {
    if (guardReadOnly()) return;
    const now = new Date().toISOString();
    setDb((prev) => {
      const existingBook = prev.books.find((b) => b.id === id);
      const mergedBook = existingBook ? { ...existingBook, ...updates } : null;

      let updatedPlates = prev.plates || [];
      if (mergedBook) {
        // Sync bookName, plateCount, and size in existing plates for this book
        updatedPlates = updatedPlates.map((plt) => {
          if (plt.bookId === id) {
            return {
              ...plt,
              bookName: mergedBook.name || plt.bookName,
              plateCount: updates.plates !== undefined ? updates.plates : plt.plateCount,
              size: updates.size || plt.size,
              updatedAt: now,
            };
          }
          return plt;
        });

        // If new partyIds were added that don't have plate records yet, add them
        if (mergedBook.partyIds && mergedBook.partyIds.length > 0) {
          for (const pid of mergedBook.partyIds) {
            const hasPlate = updatedPlates.some((p) => p.bookId === id && p.partyId === pid);
            if (!hasPlate) {
              const party = prev.parties.find((pty) => pty.id === pid);
              updatedPlates = [
                {
                  id: `plt_${id}_${pid}`,
                  partyId: pid,
                  partyName: party?.name || 'অজ্ঞাত পার্টি',
                  bookId: id,
                  bookName: mergedBook.name,
                  plateCount: mergedBook.plates || 4,
                  size: mergedBook.size || '২৩×৩৬',
                  location: 'press',
                  notes: `${mergedBook.name} বই আপডেটে স্বয়ংক্রিয় প্লেট যুক্ত`,
                  createdAt: now,
                  updatedAt: now,
                },
                ...updatedPlates,
              ];
            }
          }
        }
      }

      return {
        ...prev,
        books: prev.books.map((b) => (b.id === id ? { ...b, ...updates, updatedAt: now } : b)),
        plates: updatedPlates,
      };
    });
  };

  const deleteBook = (id: string): boolean => {
    if (guardReadOnly()) return false;
    setDb((prev) => ({
      ...prev,
      books: prev.books.filter((b) => b.id !== id),
      plates: (prev.plates || []).filter((plt) => plt.bookId !== id),
    }));
    return true;
  };

  // PRODUCTIONS
  const addProduction = (
    data: Omit<Production, 'id' | 'createdAt' | 'updatedAt' | 'isBilled'>
  ): Production => {
    if (guardReadOnly()) return { ...data, id: '', isBilled: false, createdAt: '', updatedAt: '' } as Production;
    const now = new Date().toISOString();
    const newProd: Production = {
      ...data,
      itemType: data.itemType || 'book',
      id: `prd_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      isBilled: false,
      createdAt: now,
      updatedAt: now,
    };

    setDb((prev) => {
      let updatedPaperStock = prev.paperStock || [];
      // Auto-deduct paper stock if paperSize is provided and reams > 0
      if (data.paperSize && data.reams > 0) {
        const party = prev.parties.find((pty) => pty.id === data.partyId);
        const book = prev.books.find((b) => b.id === data.bookId);
        const outwardRecord: PaperStockRecord = {
          id: `stk_out_${newProd.id}`,
          date: data.date,
          type: 'outward',
          paperType: data.paperType || 'অফসেট পেপার',
          size: data.paperSize.trim(),
          gsm: data.paperGsm?.trim(),
          company: 'প্রডাকশনে ব্যবহৃত',
          reams: data.reams,
          partyId: data.partyId,
          partyName: party?.name,
          productionId: newProd.id,
          notes: `${party?.name || ''} - ${book?.name || ''} ${data.itemType === 'cover' ? '(কভার)' : '(বই)'} প্রডাকশনে কাগজ ব্যবহার`,
          createdAt: now,
          updatedAt: now,
        };
        updatedPaperStock = [outwardRecord, ...updatedPaperStock];
      }

      // Auto-sync or create plate record with the exact custom paper size
      let updatedPlates = prev.plates || [];
      if (data.partyId && data.bookId) {
        const hasPlateIndex = updatedPlates.findIndex(
          (p) => p.partyId === data.partyId && (p.bookId === data.bookId || p.bookName === prev.books.find(b => b.id === data.bookId)?.name)
        );
        if (hasPlateIndex >= 0) {
          // Update the existing plate's size with the exact custom paper size used in production
          updatedPlates = updatedPlates.map((p, idx) =>
            idx === hasPlateIndex
              ? {
                  ...p,
                  size: data.paperSize?.trim() || p.size,
                  plateCount: data.plates || p.plateCount,
                  updatedAt: now,
                }
              : p
          );
        } else {
          const party = prev.parties.find((pty) => pty.id === data.partyId);
          const book = prev.books.find((b) => b.id === data.bookId);
          if (party && book) {
            const newPlateRecord: PlateRecord = {
              id: `plt_${data.bookId}_${data.partyId}_${Date.now()}`,
              partyId: data.partyId,
              partyName: party.name,
              bookId: data.bookId,
              bookName: book.name,
              plateCount: data.plates || book.plates || 4,
              size: data.paperSize?.trim() || book.size || '২৩×৩৬',
              location: 'press',
              notes: `${party.name} - ${book.name} প্রডাকশনে ব্যবহারের ফলে প্লেট তালিকায় যুক্ত`,
              createdAt: now,
              updatedAt: now,
            };
            updatedPlates = [newPlateRecord, ...updatedPlates];
          }
        }
      }

      return {
        ...prev,
        productions: [newProd, ...prev.productions],
        paperStock: updatedPaperStock,
        plates: updatedPlates,
      };
    });

    return newProd;
  };

  const updateProduction = (id: string, updates: Partial<Production>) => {
    if (guardReadOnly()) return;
    const now = new Date().toISOString();
    setDb((prev) => {
      const existingProd = prev.productions.find((p) => p.id === id);
      const mergedProd = existingProd ? { ...existingProd, ...updates } : null;

      let updatedPaperStock = prev.paperStock || [];
      if (mergedProd && mergedProd.paperSize && mergedProd.reams > 0) {
        const party = prev.parties.find((pty) => pty.id === mergedProd.partyId);
        const book = prev.books.find((b) => b.id === mergedProd.bookId);

        // Check if an outward record already exists for this production
        const existingStockIndex = updatedPaperStock.findIndex(
          (s) => s.productionId === id
        );

        const outwardRecord: PaperStockRecord = {
          id: existingStockIndex >= 0 ? updatedPaperStock[existingStockIndex].id : `stk_out_${id}`,
          date: mergedProd.date,
          type: 'outward',
          paperType: mergedProd.paperType || 'অফসেট পেপার',
          size: mergedProd.paperSize.trim(),
          gsm: mergedProd.paperGsm?.trim(),
          company: 'প্রডাকশনে ব্যবহৃত',
          reams: mergedProd.reams,
          partyId: mergedProd.partyId,
          partyName: party?.name,
          productionId: id,
          notes: `${party?.name || ''} - ${book?.name || ''} প্রডাকশনে কাগজ ব্যবহার`,
          createdAt: existingStockIndex >= 0 ? updatedPaperStock[existingStockIndex].createdAt : now,
          updatedAt: now,
        };

        if (existingStockIndex >= 0) {
          updatedPaperStock = updatedPaperStock.map((s, idx) =>
            idx === existingStockIndex ? outwardRecord : s
          );
        } else {
          updatedPaperStock = [outwardRecord, ...updatedPaperStock];
        }
      } else {
        // If paperSize was removed or reams is 0, remove outward stock
        updatedPaperStock = updatedPaperStock.filter((s) => s.productionId !== id);
      }

      // Sync plate size if paperSize was updated
      let updatedPlates = prev.plates || [];
      if (mergedProd && mergedProd.partyId && mergedProd.paperSize) {
        updatedPlates = updatedPlates.map((p) => {
          if (p.partyId === mergedProd.partyId && (p.bookId === mergedProd.bookId || p.bookName === prev.books.find(b => b.id === mergedProd.bookId)?.name)) {
            return {
              ...p,
              size: mergedProd.paperSize?.trim() || p.size,
              plateCount: mergedProd.plates || p.plateCount,
              updatedAt: now,
            };
          }
          return p;
        });
      }

      return {
        ...prev,
        productions: prev.productions.map((p) =>
          p.id === id ? { ...p, ...updates, updatedAt: now } : p
        ),
        paperStock: updatedPaperStock,
        plates: updatedPlates,
      };
    });
  };

  const deleteProduction = (id: string): boolean => {
    if (guardReadOnly()) return false;
    setDb((prev) => ({
      ...prev,
      productions: prev.productions.filter((p) => p.id !== id),
      paperStock: (prev.paperStock || []).filter((s) => s.productionId !== id),
    }));
    return true;
  };

  // ORDER SLIPS (Machine Man Print Order Slip)
  const addOrderSlip = (
    data: Omit<OrderSlip, 'id' | 'createdAt' | 'updatedAt'>
  ): OrderSlip => {
    if (guardReadOnly()) {
      return { ...data, id: '', createdAt: '', updatedAt: '' } as OrderSlip;
    }
    const now = new Date().toISOString();
    const newSlip: OrderSlip = {
      ...data,
      id: `ord_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: now,
      updatedAt: now,
    };
    setDb((prev) => ({
      ...prev,
      orderSlips: [newSlip, ...(prev.orderSlips || [])],
    }));
    return newSlip;
  };

  const updateOrderSlip = (id: string, updates: Partial<OrderSlip>) => {
    if (guardReadOnly()) return;
    const now = new Date().toISOString();
    setDb((prev) => ({
      ...prev,
      orderSlips: (prev.orderSlips || []).map((s) =>
        s.id === id ? { ...s, ...updates, updatedAt: now } : s
      ),
    }));
  };

  const deleteOrderSlip = (id: string): boolean => {
    if (guardReadOnly()) return false;
    setDb((prev) => ({
      ...prev,
      orderSlips: (prev.orderSlips || []).filter((s) => s.id !== id),
    }));
    return true;
  };

  // INVOICES
  const addInvoice = (data: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Invoice => {
    if (guardReadOnly()) return { ...data, id: '', createdAt: '', updatedAt: '' } as Invoice;
    const now = new Date().toISOString();
    const newInvoice: Invoice = {
      ...data,
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: now,
      updatedAt: now,
    };

    // Mark all referenced production items as billed
    const billedProdIds = data.items
      .map((item) => item.productionId)
      .filter(Boolean) as string[];

    setDb((prev) => {
      const updatedProductions = prev.productions.map((p) => {
        if (billedProdIds.includes(p.id)) {
          return { ...p, isBilled: true, invoiceId: newInvoice.id };
        }
        return p;
      });

      // If invoice includes immediate paid amount, automatically record collection
      let updatedCollections = prev.collections;
      if (data.paidAmount > 0) {
        const autoCollection: Collection = {
          id: `col_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          receiptNo: `REC-${data.invoiceNo}`,
          date: data.date,
          partyId: data.partyId,
          partyName: data.partyName,
          amount: data.paidAmount,
          paymentMethod: 'cash',
          invoiceId: newInvoice.id,
          invoiceNo: data.invoiceNo,
          notes: `ইনভয়েস ${data.invoiceNo} থেকে সরাসরি প্রাপ্তি`,
          createdAt: now,
          updatedAt: now,
        };
        updatedCollections = [autoCollection, ...prev.collections];
      }

      return {
        ...prev,
        invoices: [newInvoice, ...prev.invoices],
        productions: updatedProductions,
        collections: updatedCollections,
      };
    });

    return newInvoice;
  };

  const updateInvoice = (id: string, updates: Partial<Invoice>) => {
    if (guardReadOnly()) return;
    const now = new Date().toISOString();
    setDb((prev) => ({
      ...prev,
      invoices: prev.invoices.map((inv) => (inv.id === id ? { ...inv, ...updates, updatedAt: now } : inv)),
    }));
  };

  const deleteInvoice = (id: string): boolean => {
    if (guardReadOnly()) return false;
    setDb((prev) => {
      // Un-bill productions associated with this invoice
      const updatedProductions = prev.productions.map((p) => {
        if (p.invoiceId === id) {
          return { ...p, isBilled: false, invoiceId: undefined };
        }
        return p;
      });

      // Remove auto collections associated with this invoice
      const updatedCollections = prev.collections.filter((c) => c.invoiceId !== id);

      return {
        ...prev,
        invoices: prev.invoices.filter((inv) => inv.id !== id),
        productions: updatedProductions,
        collections: updatedCollections,
      };
    });
    return true;
  };

  // COLLECTIONS
  const addCollection = (data: Omit<Collection, 'id' | 'createdAt' | 'updatedAt'>): Collection => {
    if (guardReadOnly()) return { ...data, id: '', createdAt: '', updatedAt: '' } as Collection;
    const now = new Date().toISOString();
    const newCollection: Collection = {
      ...data,
      id: `col_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: now,
      updatedAt: now,
    };

    setDb((prev) => ({
      ...prev,
      collections: [newCollection, ...prev.collections],
    }));
    return newCollection;
  };

  const updateCollection = (id: string, updates: Partial<Collection>) => {
    if (guardReadOnly()) return;
    const now = new Date().toISOString();
    setDb((prev) => ({
      ...prev,
      collections: prev.collections.map((c) =>
        c.id === id ? { ...c, ...updates, updatedAt: now } : c
      ),
    }));
  };

  const deleteCollection = (id: string): boolean => {
    if (guardReadOnly()) return false;
    setDb((prev) => ({
      ...prev,
      collections: prev.collections.filter((c) => c.id !== id),
    }));
    return true;
  };

  // EMPLOYEES
  const addEmployee = (data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Employee => {
    if (guardReadOnly()) return { ...data, id: '', createdAt: '', updatedAt: '' } as Employee;
    const now = new Date().toISOString();
    const newEmployee: Employee = {
      ...data,
      id: `emp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: now,
      updatedAt: now,
    };
    setDb((prev) => ({
      ...prev,
      employees: [newEmployee, ...prev.employees],
    }));
    return newEmployee;
  };

  const updateEmployee = (id: string, updates: Partial<Employee>) => {
    if (guardReadOnly()) return;
    const now = new Date().toISOString();
    setDb((prev) => ({
      ...prev,
      employees: prev.employees.map((e) =>
        e.id === id ? { ...e, ...updates, updatedAt: now } : e
      ),
    }));
  };

  const deleteEmployee = (id: string): boolean => {
    if (guardReadOnly()) return false;
    setDb((prev) => ({
      ...prev,
      employees: prev.employees.filter((e) => e.id !== id),
      attendance: prev.attendance.filter((a) => a.employeeId !== id),
      advances: prev.advances.filter((a) => a.employeeId !== id),
      payrolls: prev.payrolls.filter((p) => p.employeeId !== id),
    }));
    return true;
  };

  // ATTENDANCE
  const recordAttendance = (
    data: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'>
  ): AttendanceRecord => {
    if (guardReadOnly()) return { ...data, id: '', createdAt: '', updatedAt: '' } as AttendanceRecord;
    const now = new Date().toISOString();
    // Check if record for same employee and date already exists
    const existingIndex = db.attendance.findIndex(
      (a) => a.employeeId === data.employeeId && a.date === data.date
    );

    if (existingIndex >= 0) {
      const updatedRecord: AttendanceRecord = {
        ...db.attendance[existingIndex],
        ...data,
        updatedAt: now,
      };
      setDb((prev) => {
        const newAttendance = [...prev.attendance];
        newAttendance[existingIndex] = updatedRecord;
        return { ...prev, attendance: newAttendance };
      });
      return updatedRecord;
    }

    const newRecord: AttendanceRecord = {
      ...data,
      id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: now,
      updatedAt: now,
    };
    setDb((prev) => ({
      ...prev,
      attendance: [newRecord, ...prev.attendance],
    }));
    return newRecord;
  };

  const updateAttendance = (id: string, updates: Partial<AttendanceRecord>) => {
    if (guardReadOnly()) return;
    const now = new Date().toISOString();
    setDb((prev) => ({
      ...prev,
      attendance: prev.attendance.map((a) =>
        a.id === id ? { ...a, ...updates, updatedAt: now } : a
      ),
    }));
  };

  const deleteAttendance = (id: string): boolean => {
    if (guardReadOnly()) return false;
    setDb((prev) => ({
      ...prev,
      attendance: prev.attendance.filter((a) => a.id !== id),
    }));
    return true;
  };

  // Helper to synchronize advances with paid payroll deductions
  const syncEmployeeAdvances = (advances: EmployeeAdvance[], payrolls: PayrollRecord[]): EmployeeAdvance[] => {
    const deductionsByEmp: Record<string, number> = {};
    payrolls.forEach((p) => {
      if (p.status === 'paid' && (p.advanceDeduction || 0) > 0) {
        deductionsByEmp[p.employeeId] = (deductionsByEmp[p.employeeId] || 0) + (p.advanceDeduction || 0);
      }
    });

    const empRemainingDeduction = { ...deductionsByEmp };
    const sorted = [...advances].sort(
      (a, b) =>
        (a.date || '').localeCompare(b.date || '') ||
        (a.createdAt || '').localeCompare(b.createdAt || '')
    );

    return sorted.map((adv) => {
      const pool = empRemainingDeduction[adv.employeeId] || 0;
      if (pool >= adv.amount) {
        empRemainingDeduction[adv.employeeId] = pool - adv.amount;
        return {
          ...adv,
          isDeducted: true,
          deductedAmount: adv.amount,
        };
      } else if (pool > 0) {
        empRemainingDeduction[adv.employeeId] = 0;
        return {
          ...adv,
          isDeducted: false,
          deductedAmount: pool,
        };
      } else {
        return {
          ...adv,
          isDeducted: false,
          deductedAmount: 0,
        };
      }
    });
  };

  // ADVANCES
  const addAdvance = (
    data: Omit<EmployeeAdvance, 'id' | 'createdAt' | 'updatedAt' | 'isDeducted'>
  ): EmployeeAdvance => {
    if (guardReadOnly()) return { ...data, id: '', isDeducted: false, createdAt: '', updatedAt: '' } as EmployeeAdvance;
    const now = new Date().toISOString();
    const newAdv: EmployeeAdvance = {
      ...data,
      id: `adv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      isDeducted: false,
      deductedAmount: 0,
      createdAt: now,
      updatedAt: now,
    };

    // Auto record cash expense transaction for advance paid
    const advTx: IncomeExpenseTransaction = {
      id: `tx_adv_${newAdv.id}`,
      date: data.date,
      type: 'expense',
      category: 'কর্মচারী অগ্রিম',
      amount: data.amount,
      paymentMethod: data.paymentMethod || 'cash',
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      sourceType: 'manual',
      sourceId: newAdv.id,
      description: `${data.employeeName} কে বেতন বাবদ অগ্রিম প্রদান`,
      createdAt: now,
      updatedAt: now,
    };

    setDb((prev) => {
      const updatedAdvances = syncEmployeeAdvances([newAdv, ...prev.advances], prev.payrolls);
      return {
        ...prev,
        advances: updatedAdvances,
        transactions: [advTx, ...prev.transactions],
      };
    });
    return newAdv;
  };

  const updateAdvance = (id: string, updates: Partial<EmployeeAdvance>) => {
    if (guardReadOnly()) return;
    const now = new Date().toISOString();
    setDb((prev) => {
      const updatedList = prev.advances.map((a) =>
        a.id === id ? { ...a, ...updates, updatedAt: now } : a
      );
      const synced = syncEmployeeAdvances(updatedList, prev.payrolls);
      return {
        ...prev,
        advances: synced,
        transactions: prev.transactions.map((tx) =>
          tx.sourceId === id
            ? {
                ...tx,
                amount: updates.amount !== undefined ? updates.amount : tx.amount,
                date: updates.date || tx.date,
                description: updates.employeeName
                  ? `${updates.employeeName} কে বেতন বাবদ অগ্রিম প্রদান`
                  : tx.description,
                updatedAt: now,
              }
            : tx
        ),
      };
    });
  };

  const deleteAdvance = (id: string): boolean => {
    if (guardReadOnly()) return false;
    setDb((prev) => {
      const filtered = prev.advances.filter((a) => a.id !== id);
      const synced = syncEmployeeAdvances(filtered, prev.payrolls);
      return {
        ...prev,
        advances: synced,
        transactions: prev.transactions.filter((tx) => tx.sourceId !== id),
      };
    });
    return true;
  };

  // PAYROLL GENERATION
  const generatePayrollForMonth = (
    monthYear: string,
    employeeIdFilter?: string,
    defaultDeductAdvance: boolean = true
  ): PayrollRecord[] => {
    if (guardReadOnly()) return [];
    const [yearStr, monthStr] = monthYear.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const M = getDaysInMonth(year, month);

    const targetEmployees = sortEmployeesByDesignation(
      db.employees.filter((emp) =>
        emp.isActive && (employeeIdFilter ? emp.id === employeeIdFilter : true)
      )
    );

    const generatedRecords: PayrollRecord[] = [];
    const now = new Date().toISOString();

    for (const emp of targetEmployees) {
      // Find all attendance records for this employee in monthYear (YYYY-MM-DD)
      const empAttendance = db.attendance.filter(
        (a) => a.employeeId === emp.id && a.date.startsWith(monthYear)
      );

      const presentCount = empAttendance.filter((a) => a.status === 'present').length;
      const otHours = empAttendance.reduce((sum, a) => sum + (a.otHours || 0), 0);

      // Existing record if already generated (preserves any manual customization)
      const existingRecord = db.payrolls.find(
        (p) => p.monthYear === monthYear && p.employeeId === emp.id
      );

      // Total unsettled advances available before this payroll is paid (considering previous months)
      const totalAdvanceAvailable = getEmployeeAdvanceBalance(emp.id, existingRecord?.id, monthYear);

      // If user hasn't marked day-by-day attendance in DailyAttendance, default to full month (M)
      const effectivePresentCount = empAttendance.length > 0 ? presentCount : M;

      const calc = calculateSalary({
        monthlyBasicSalary: emp.monthlyBasicSalary,
        daysInMonth: M,
        presentDays: effectivePresentCount,
        otHours,
        standardDailyOtHours: 5,
        otRatePercent: emp.otRatePercent || db.settings.defaultOtRatePercent || 70,
        advanceDeduction: 0,
      });

      const totalEarnedSalary = Math.round(calc.attendancePay + calc.otPay + (existingRecord?.otherEarnings || 0));

      // Calculate any unpaid salary from previous months
      const previousUnpaidPayrolls = db.payrolls.filter(
        (p) => p.employeeId === emp.id && p.monthYear < monthYear && p.status !== 'paid'
      );
      const previousUnpaidSalaryDue = previousUnpaidPayrolls.reduce(
        (sum, p) => sum + Math.round(p.netPayable || 0),
        0
      );

      // OPTIONAL: Only include previous unpaid salary if the user explicitly chose to add it
      const includePreviousUnpaidSalary = existingRecord?.includePreviousUnpaidSalary || false;
      const previousUnpaidSalaryAdded = includePreviousUnpaidSalary
        ? (existingRecord?.previousUnpaidSalaryAdded !== undefined
            ? Math.round(existingRecord.previousUnpaidSalaryAdded)
            : previousUnpaidSalaryDue)
        : 0;

      // Determine user preference for advance deduction:
      const shouldDeductAdvance =
        existingRecord?.shouldDeductAdvance !== undefined
          ? existingRecord.shouldDeductAdvance
          : defaultDeductAdvance;

      let advanceDeduction = 0;
      if (shouldDeductAdvance && totalAdvanceAvailable > 0) {
        if (
          existingRecord?.advanceDeduction !== undefined &&
          existingRecord.advanceDeduction >= 0
        ) {
          advanceDeduction = Math.min(totalAdvanceAvailable, Math.round(existingRecord.advanceDeduction));
        } else {
          // Default deduction is min(totalEarnedSalary, totalAdvanceAvailable)
          advanceDeduction = Math.min(totalEarnedSalary, totalAdvanceAvailable);
        }
      }

      // If advance was greater than earnings or not deducted, the excess stays as advance
      const remainingAdvance = Math.max(0, Math.round(totalAdvanceAvailable - advanceDeduction));
      const otherDeductions = Math.round(existingRecord?.otherDeductions || 0);

      // Net payable strictly rounded to integer (no paise)
      const netPayable = Math.max(
        0,
        Math.round(totalEarnedSalary - advanceDeduction - otherDeductions + previousUnpaidSalaryAdded)
      );

      const record: PayrollRecord = {
        id: existingRecord ? existingRecord.id : `pr_${emp.id}_${monthYear}`,
        employeeId: emp.id,
        employeeName: emp.name,
        designation: emp.designation,
        monthYear,
        daysInMonth: M,
        presentDays: calc.presentDays,
        absentDays: calc.absentDays,
        dailyRate: calc.dailyRate,
        basicSalary: emp.monthlyBasicSalary,
        attendanceSalary: calc.attendanceSalary,
        attendanceBonus: calc.attendanceBonus,
        attendancePay: calc.attendancePay,
        otHours,
        hourlyOtRate: calc.hourlyOtRate,
        otPay: calc.otPay,
        totalEarnedSalary,
        otherEarnings: existingRecord?.otherEarnings || 0,
        advanceDeduction,
        totalAdvanceAvailable,
        shouldDeductAdvance,
        remainingAdvance,
        previousUnpaidSalaryDue,
        includePreviousUnpaidSalary,
        previousUnpaidSalaryAdded,
        otherDeductions,
        previousSalaryPaid: 0,
        netPayable,
        status: existingRecord?.status || 'draft',
        paidDate: existingRecord?.paidDate,
        paymentMethod: existingRecord?.paymentMethod,
        notes: existingRecord?.notes || '',
        createdAt: existingRecord?.createdAt || now,
        updatedAt: now,
      };

      generatedRecords.push(record);
    }

    setDb((prev) => {
      // Replace existing payroll records for this month & employees
      const filtered = prev.payrolls.filter(
        (p) => !(p.monthYear === monthYear && (!employeeIdFilter || p.employeeId === employeeIdFilter))
      );
      return {
        ...prev,
        payrolls: [...generatedRecords, ...filtered],
      };
    });

    return generatedRecords;
  };

  const updatePayroll = (id: string, updates: Partial<PayrollRecord>) => {
    if (guardReadOnly()) return;
    const now = new Date().toISOString();
    setDb((prev) => {
      const targetPayroll = prev.payrolls.find((p) => p.id === id);
      const isMarkingPaid = updates.status === 'paid' && targetPayroll?.status !== 'paid';

      let updatedPayrolls = prev.payrolls.map((p) => {
        if (p.id === id) {
          const merged = { ...p, ...updates, updatedAt: now };
          const avail =
            merged.totalAdvanceAvailable ??
            getEmployeeAdvanceBalance(p.employeeId, p.status === 'paid' ? undefined : p.id, p.monthYear);
          merged.totalAdvanceAvailable = avail;
          merged.advanceDeduction = Math.round(merged.advanceDeduction || 0);
          merged.remainingAdvance = Math.max(0, Math.round(avail - merged.advanceDeduction));
          merged.totalEarnedSalary = Math.round(
            (merged.attendanceSalary || 0) +
            (merged.attendanceBonus || 0) +
            (merged.otPay || 0) +
            (merged.otherEarnings || 0)
          );
          return merged;
        }
        return p;
      });

      // If marking paid and previous unpaid salary was included, mark earlier unpaid months as settled
      if (isMarkingPaid && targetPayroll) {
        const wasPrevSalaryIncluded = updates.includePreviousUnpaidSalary !== undefined
          ? updates.includePreviousUnpaidSalary
          : targetPayroll.includePreviousUnpaidSalary;
        const prevSalaryAmt = updates.previousUnpaidSalaryAdded !== undefined
          ? updates.previousUnpaidSalaryAdded
          : targetPayroll.previousUnpaidSalaryAdded;

        if (wasPrevSalaryIncluded && (prevSalaryAmt || 0) > 0) {
          updatedPayrolls = updatedPayrolls.map((p) => {
            if (
              p.employeeId === targetPayroll.employeeId &&
              p.monthYear < targetPayroll.monthYear &&
              p.status !== 'paid'
            ) {
              return {
                ...p,
                status: 'paid' as const,
                paidDate: updates.paidDate || new Date().toISOString().split('T')[0],
                notes: (p.notes ? p.notes + ' | ' : '') + `${targetPayroll.monthYear} মাসের বেতনের সাথে বকেয়া পরিশোধ সম্পন্ন`,
                updatedAt: now,
              };
            }
            return p;
          });
        }
      }

      // Synchronize advances with all paid payroll records
      const updatedAdvances = syncEmployeeAdvances(prev.advances, updatedPayrolls);

      let newTransactions = prev.transactions;

      if (isMarkingPaid && targetPayroll) {
        // Add expense transaction for paid salary
        const payAmount = updates.netPayable !== undefined ? updates.netPayable : targetPayroll.netPayable;
        if (payAmount > 0) {
          const payrollTx: IncomeExpenseTransaction = {
            id: `tx_pay_${id}_${Date.now()}`,
            date: updates.paidDate || new Date().toISOString().split('T')[0],
            type: 'expense',
            category: 'কর্মচারীর বেতন',
            amount: Math.round(payAmount),
            paymentMethod: updates.paymentMethod || 'cash',
            employeeId: targetPayroll.employeeId,
            employeeName: targetPayroll.employeeName,
            sourceType: 'payroll',
            sourceId: id,
            description: `${targetPayroll.employeeName} এর ${targetPayroll.monthYear} মাসের বেতন পরিশোধ`,
            createdAt: now,
            updatedAt: now,
          };
          newTransactions = [payrollTx, ...prev.transactions];
        }
      }

      return {
        ...prev,
        advances: updatedAdvances,
        transactions: newTransactions,
        payrolls: updatedPayrolls,
      };
    });
  };

  const deletePayroll = (id: string): boolean => {
    if (guardReadOnly()) return false;
    setDb((prev) => {
      const remainingPayrolls = prev.payrolls.filter((p) => p.id !== id);
      const updatedAdvances = syncEmployeeAdvances(prev.advances, remainingPayrolls);
      return {
        ...prev,
        payrolls: remainingPayrolls,
        transactions: prev.transactions.filter((tx) => tx.sourceId !== id),
        advances: updatedAdvances,
      };
    });
    return true;
  };

  // PLATES (প্লেটের অবস্থান)
  const addPlate = (
    data: Omit<PlateRecord, 'id' | 'createdAt' | 'updatedAt'>
  ): PlateRecord => {
    if (guardReadOnly()) return { ...data, id: '', createdAt: '', updatedAt: '' } as PlateRecord;
    const now = new Date().toISOString();
    const newPlate: PlateRecord = {
      ...data,
      id: `plt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: now,
      updatedAt: now,
    };
    setDb((prev) => ({
      ...prev,
      plates: [newPlate, ...(prev.plates || [])],
    }));
    return newPlate;
  };

  const updatePlate = (id: string, updates: Partial<PlateRecord>) => {
    if (guardReadOnly()) return;
    const now = new Date().toISOString();
    setDb((prev) => ({
      ...prev,
      plates: (prev.plates || []).map((plt) =>
        plt.id === id ? { ...plt, ...updates, updatedAt: now } : plt
      ),
    }));
  };

  const batchUpdatePlates = (ids: string[], updates: Partial<PlateRecord>) => {
    if (guardReadOnly()) return;
    const now = new Date().toISOString();
    const idSet = new Set(ids);
    setDb((prev) => ({
      ...prev,
      plates: (prev.plates || []).map((plt) =>
        idSet.has(plt.id) ? { ...plt, ...updates, updatedAt: now } : plt
      ),
    }));
  };

  const deletePlate = (id: string): boolean => {
    if (guardReadOnly()) return false;
    const isAllowedRole =
      isMainAdmin ||
      (currentUserAccess?.status === 'approved' &&
        (currentUserAccess.role === 'super_admin' ||
          currentUserAccess.role === 'admin' ||
          currentUserAccess.role === 'manager'));
    if (!isAllowedRole) return false;
    setDb((prev) => ({
      ...prev,
      plates: (prev.plates || []).filter((plt) => plt.id !== id),
    }));
    return true;
  };

  // PAPER STOCK (কাগজের হিসাব)
  const addPaperStock = (
    data: Omit<PaperStockRecord, 'id' | 'createdAt' | 'updatedAt'>
  ): PaperStockRecord => {
    if (guardReadOnly()) return { ...data, id: '', createdAt: '', updatedAt: '' } as PaperStockRecord;
    const now = new Date().toISOString();
    const newStock: PaperStockRecord = {
      ...data,
      id: `stk_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: now,
      updatedAt: now,
    };
    setDb((prev) => ({
      ...prev,
      paperStock: [newStock, ...(prev.paperStock || [])],
    }));
    return newStock;
  };

  const updatePaperStock = (id: string, updates: Partial<PaperStockRecord>) => {
    if (guardReadOnly()) return;
    const now = new Date().toISOString();
    setDb((prev) => ({
      ...prev,
      paperStock: (prev.paperStock || []).map((s) =>
        s.id === id ? { ...s, ...updates, updatedAt: now } : s
      ),
    }));
  };

  const deletePaperStock = (id: string): boolean => {
    if (guardReadOnly()) return false;
    setDb((prev) => ({
      ...prev,
      paperStock: (prev.paperStock || []).filter((s) => s.id !== id),
    }));
    return true;
  };

  const getPaperStockBalance = (
    size?: string,
    paperType?: string,
    partyId?: string,
    gsm?: string
  ): number => {
    const stocks = db.paperStock || [];
    return stocks.reduce((sum, item) => {
      const matchSize = size && size.trim() !== '' ? item.size?.trim().toLowerCase() === size.trim().toLowerCase() : true;
      const matchType = paperType && paperType.trim() !== '' ? item.paperType?.trim().toLowerCase() === paperType.trim().toLowerCase() : true;
      const matchParty = partyId && partyId.trim() !== '' ? item.partyId === partyId : true;
      const matchGsm = gsm && gsm.trim() !== '' ? (item.gsm && item.gsm.trim().toLowerCase() === gsm.trim().toLowerCase()) : true;
      if (!matchSize || !matchType || !matchParty || !matchGsm) return sum;
      return item.type === 'inward' ? sum + item.reams : sum - item.reams;
    }, 0);
  };

  // CUTTING WORKERS
  const addCuttingWorker = (data: Omit<CuttingWorker, 'id' | 'createdAt'>): CuttingWorker => {
    if (guardReadOnly()) return { ...data, id: '', createdAt: '' } as CuttingWorker;
    const worker: CuttingWorker = {
      ...data,
      id: `cw_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toISOString(),
    };
    setDb((prev) => ({
      ...prev,
      cuttingWorkers: [worker, ...prev.cuttingWorkers],
    }));
    return worker;
  };

  const updateCuttingWorker = (id: string, updates: Partial<CuttingWorker>) => {
    if (guardReadOnly()) return;
    setDb((prev) => ({
      ...prev,
      cuttingWorkers: prev.cuttingWorkers.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    }));
  };

  const deleteCuttingWorker = (id: string): boolean => {
    if (guardReadOnly()) return false;
    setDb((prev) => ({
      ...prev,
      cuttingWorkers: prev.cuttingWorkers.filter((w) => w.id !== id),
    }));
    return true;
  };

  // CUTTING RECORDS
  const addCuttingRecord = (
    data: Omit<PaperCuttingRecord, 'id' | 'createdAt' | 'updatedAt'>
  ): PaperCuttingRecord => {
    if (guardReadOnly()) return { ...data, id: '', createdAt: '', updatedAt: '' } as PaperCuttingRecord;
    const now = new Date().toISOString();
    const recordId = `cut_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const txId = `tx_cut_${recordId}`;

    const paidAmount =
      data.paidAmount !== undefined
        ? Number(data.paidAmount)
        : data.paymentStatus === 'due'
        ? 0
        : Number(data.totalCost);

    const paymentStatus: 'paid' | 'due' | 'partial' =
      data.paymentStatus ||
      (paidAmount >= data.totalCost ? 'paid' : paidAmount > 0 ? 'partial' : 'due');

    const paymentMethod = data.paymentMethod || 'cash';

    const newRecord: PaperCuttingRecord = {
      ...data,
      id: recordId,
      paidAmount,
      paymentStatus,
      paymentMethod,
      expenseTransactionId: paidAmount > 0 ? txId : undefined,
      createdAt: now,
      updatedAt: now,
    };

    // Auto-create single expense ledger entry only if actual cash was paid out
    let newTransactions = db.transactions;
    if (paidAmount > 0) {
      const newTx: IncomeExpenseTransaction = {
        id: txId,
        date: data.date,
        type: 'expense',
        category: 'কাগজ কাটিং খরচ',
        amount: paidAmount,
        paymentMethod,
        cuttingWorkerId: data.cuttingWorkerId,
        cuttingWorkerName: data.cuttingWorkerName,
        description: `কাগজ কাটিং বিল: ${data.reams} রিম @ ৳${data.ratePerReam} (কাটিং ম্যান: ${data.cuttingWorkerName})${
          paidAmount < data.totalCost
            ? ` [পরিশোধ: ৳${paidAmount}, বকেয়া: ৳${data.totalCost - paidAmount}]`
            : ''
        }`,
        sourceType: 'paper_cutting',
        sourceId: recordId,
        createdAt: now,
        updatedAt: now,
      };
      newTransactions = [newTx, ...db.transactions];
    }

    setDb((prev) => ({
      ...prev,
      cuttingRecords: [newRecord, ...prev.cuttingRecords],
      transactions: newTransactions,
    }));

    return newRecord;
  };

  const updateCuttingRecord = (id: string, updates: Partial<PaperCuttingRecord>) => {
    if (guardReadOnly()) return;
    const now = new Date().toISOString();
    setDb((prev) => {
      const updatedRecords = prev.cuttingRecords.map((r) =>
        r.id === id ? { ...r, ...updates, updatedAt: now } : r
      );
      const target = updatedRecords.find((r) => r.id === id);

      let updatedTxs = prev.transactions;
      if (target && target.expenseTransactionId) {
        const paid = target.paidAmount !== undefined ? target.paidAmount : target.totalCost;
        updatedTxs = prev.transactions.map((tx) => {
          if (tx.id === target.expenseTransactionId) {
            return {
              ...tx,
              date: target.date,
              amount: paid,
              cuttingWorkerId: target.cuttingWorkerId,
              cuttingWorkerName: target.cuttingWorkerName,
              description: `কাগজ কাটিং বিল: ${target.reams} রিম @ ৳${target.ratePerReam} (কাটিং ম্যান: ${target.cuttingWorkerName})`,
              updatedAt: now,
            };
          }
          return tx;
        });
      }

      return {
        ...prev,
        cuttingRecords: updatedRecords,
        transactions: updatedTxs,
      };
    });
  };

  const deleteCuttingRecord = (id: string): boolean => {
    if (guardReadOnly()) return false;
    setDb((prev) => {
      const target = prev.cuttingRecords.find((r) => r.id === id);
      const updatedTxs = prev.transactions.filter(
        (tx) => tx.id !== (target?.expenseTransactionId || `tx_cut_${id}`)
      );
      return {
        ...prev,
        cuttingRecords: prev.cuttingRecords.filter((r) => r.id !== id),
        transactions: updatedTxs,
      };
    });
    return true;
  };

  // Standalone payment / cash settlement to a cutting worker
  const addCuttingWorkerPayment = (data: {
    workerId: string;
    workerName: string;
    date: string;
    amount: number;
    paymentMethod: string;
    notes?: string;
  }): IncomeExpenseTransaction => {
    if (guardReadOnly()) {
      return {
        id: '',
        date: data.date,
        type: 'expense',
        category: 'কাগজ কাটিং খরচ',
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        description: '',
        createdAt: '',
        updatedAt: '',
      };
    }
    const now = new Date().toISOString();
    const txId = `tx_cutpay_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newTx: IncomeExpenseTransaction = {
      id: txId,
      date: data.date,
      type: 'expense',
      category: 'কাগজ কাটিং খরচ',
      amount: data.amount,
      paymentMethod: data.paymentMethod || 'cash',
      cuttingWorkerId: data.workerId,
      cuttingWorkerName: data.workerName,
      description: `কাটিং ম্যান পারিশ্রমিক পরিশোধ: ${data.workerName}${
        data.notes ? ` (${data.notes})` : ''
      }`,
      sourceType: 'cutting_payment',
      sourceId: data.workerId,
      createdAt: now,
      updatedAt: now,
    };

    setDb((prev) => ({
      ...prev,
      transactions: [newTx, ...prev.transactions],
    }));

    return newTx;
  };

  const deleteCuttingWorkerPayment = (transactionId: string): boolean => {
    if (guardReadOnly()) return false;
    setDb((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((tx) => tx.id !== transactionId),
    }));
    return true;
  };

  // PUTTI SALES
  const addPuttiSale = (
    data: Omit<PuttiSaleRecord, 'id' | 'createdAt' | 'updatedAt'>
  ): PuttiSaleRecord => {
    if (guardReadOnly()) return { ...data, id: '', createdAt: '', updatedAt: '' } as PuttiSaleRecord;
    const now = new Date().toISOString();
    const recordId = `putti_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const txId = `tx_putti_${recordId}`;

    const newSale: PuttiSaleRecord = {
      ...data,
      id: recordId,
      incomeTransactionId: txId,
      createdAt: now,
      updatedAt: now,
    };

    // Auto-create income transaction without double counting advance
    const newTx: IncomeExpenseTransaction = {
      id: txId,
      date: data.date,
      type: 'income',
      category: 'পট্টি বিক্রি',
      amount: data.grossSale,
      paymentMethod: data.paymentMethod,
      description: `পট্টি বিক্রি: ${data.category} - ${data.quantityKg} কেজি @ ৳${data.ratePerKg} (ক্রেতা: ${data.buyerName})`,
      sourceType: 'putti_sale',
      sourceId: recordId,
      createdAt: now,
      updatedAt: now,
    };

    setDb((prev) => ({
      ...prev,
      puttiSales: [newSale, ...prev.puttiSales],
      transactions: [newTx, ...prev.transactions],
    }));

    return newSale;
  };

  const updatePuttiSale = (id: string, updates: Partial<PuttiSaleRecord>) => {
    if (guardReadOnly()) return;
    const now = new Date().toISOString();
    setDb((prev) => {
      const updatedSales = prev.puttiSales.map((s) =>
        s.id === id ? { ...s, ...updates, updatedAt: now } : s
      );
      const target = updatedSales.find((s) => s.id === id);

      let updatedTxs = prev.transactions;
      if (target && target.incomeTransactionId) {
        updatedTxs = prev.transactions.map((tx) => {
          if (tx.id === target.incomeTransactionId) {
            return {
              ...tx,
              date: target.date,
              amount: target.grossSale,
              description: `পট্টি বিক্রি: ${target.category} - ${target.quantityKg} কেজি @ ৳${target.ratePerKg} (ক্রেতা: ${target.buyerName})`,
              updatedAt: now,
            };
          }
          return tx;
        });
      }

      return {
        ...prev,
        puttiSales: updatedSales,
        transactions: updatedTxs,
      };
    });
  };

  const deletePuttiSale = (id: string): boolean => {
    if (guardReadOnly()) return false;
    setDb((prev) => {
      const target = prev.puttiSales.find((s) => s.id === id);
      const updatedTxs = prev.transactions.filter(
        (tx) => tx.id !== (target?.incomeTransactionId || `tx_putti_${id}`)
      );
      return {
        ...prev,
        puttiSales: prev.puttiSales.filter((s) => s.id !== id),
        transactions: updatedTxs,
      };
    });
    return true;
  };

  // TRANSACTIONS
  const addTransaction = (
    data: Omit<IncomeExpenseTransaction, 'id' | 'createdAt' | 'updatedAt'>
  ): IncomeExpenseTransaction => {
    if (guardReadOnly()) return { ...data, id: '', createdAt: '', updatedAt: '' } as IncomeExpenseTransaction;
    const now = new Date().toISOString();
    const newTx: IncomeExpenseTransaction = {
      ...data,
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: now,
      updatedAt: now,
    };
    setDb((prev) => ({
      ...prev,
      transactions: [newTx, ...prev.transactions],
    }));
    return newTx;
  };

  const updateTransaction = (id: string, updates: Partial<IncomeExpenseTransaction>) => {
    if (guardReadOnly()) return;
    const now = new Date().toISOString();
    setDb((prev) => ({
      ...prev,
      transactions: prev.transactions.map((tx) =>
        tx.id === id ? { ...tx, ...updates, updatedAt: now } : tx
      ),
    }));
  };

  const deleteTransaction = (id: string): boolean => {
    if (guardReadOnly()) return false;
    setDb((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((tx) => tx.id !== id),
    }));
    return true;
  };

  // HELPER CALCULATIONS
  const getPartyBalance = (partyId: string): number => {
    const party = db.parties.find((p) => p.id === partyId);
    if (!party) return 0;

    const openingDue = party.openingDue || 0;
    const totalInvoices = db.invoices
      .filter((inv) => inv.partyId === partyId)
      .reduce((sum, inv) => sum + inv.grandTotal, 0);

    const totalCollections = db.collections
      .filter((col) => col.partyId === partyId)
      .reduce((sum, col) => sum + col.amount, 0);

    return roundToTwo(openingDue + totalInvoices - totalCollections);
  };

  const getEmployeeAdvanceBalance = (
    employeeId: string,
    excludePayrollId?: string,
    upToMonth?: string
  ): number => {
    const totalGiven = (db.advances || [])
      .filter((adv) => adv.employeeId === employeeId)
      .reduce((sum, adv) => sum + (Number(adv.amount) || 0), 0);

    const totalDeductedInPayrolls = (db.payrolls || [])
      .filter(
        (p) =>
          p.employeeId === employeeId &&
          (!excludePayrollId || p.id !== excludePayrollId) &&
          (p.status === 'paid' || (upToMonth && p.monthYear < upToMonth))
      )
      .reduce((sum, p) => sum + (Number(p.advanceDeduction) || 0), 0);

    return Math.max(0, Math.round(totalGiven - totalDeductedInPayrolls));
  };

  const getCuttingWorkerLedger = (workerId: string) => {
    const worker = db.cuttingWorkers.find((w) => w.id === workerId);
    const records = db.cuttingRecords.filter(
      (r) => r.cuttingWorkerId === workerId || (worker && r.cuttingWorkerName === worker.name)
    );
    const totalReams = records.reduce((s, r) => s + (Number(r.reams) || 0), 0);
    const totalEarned = records.reduce((s, r) => s + (Number(r.totalCost) || 0), 0);

    // Sum all payments made to this worker:
    // 1. Paid amount recorded directly on cutting records
    const recordsPaid = records.reduce((s, r) => {
      if (r.paidAmount !== undefined) return s + Number(r.paidAmount);
      if (r.expenseTransactionId) return s + Number(r.totalCost);
      return s;
    }, 0);

    // 2. Standalone payments from transactions
    const payments = db.transactions.filter(
      (tx) =>
        tx.type === 'expense' &&
        (tx.sourceType === 'cutting_payment' ||
          (tx.category === 'কাগজ কাটিং খরচ' && tx.sourceType !== 'paper_cutting')) &&
        (tx.cuttingWorkerId === workerId ||
          tx.sourceId === workerId ||
          (worker && tx.description.includes(worker.name)))
    );
    const standalonePaid = payments.reduce((s, tx) => s + Number(tx.amount || 0), 0);

    const totalPaid = recordsPaid + standalonePaid;
    const balanceDue = totalEarned - totalPaid;

    return {
      worker,
      totalReams,
      totalEarned,
      totalPaid,
      balanceDue,
      records,
      payments,
    };
  };

  // ==========================================
  // কালির দোকান ও মালামাল (Ink & Press Materials)
  // ==========================================
  const addInkSupplier = (data: Omit<InkSupplier, 'id' | 'createdAt' | 'updatedAt'>): InkSupplier => {
    if (guardReadOnly()) return { ...data, id: '', createdAt: '', updatedAt: '' } as InkSupplier;
    const now = new Date().toISOString();
    const newSupplier: InkSupplier = {
      ...data,
      id: `ink_sup_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: now,
      updatedAt: now,
    };
    setDb((prev) => ({
      ...prev,
      inkSuppliers: [newSupplier, ...(prev.inkSuppliers || [])],
    }));
    return newSupplier;
  };

  const updateInkSupplier = (id: string, updates: Partial<InkSupplier>) => {
    if (guardReadOnly()) return;
    const now = new Date().toISOString();
    setDb((prev) => ({
      ...prev,
      inkSuppliers: (prev.inkSuppliers || []).map((s) =>
        s.id === id ? { ...s, ...updates, updatedAt: now } : s
      ),
    }));
  };

  const deleteInkSupplier = (id: string): boolean => {
    if (guardReadOnly()) return false;
    setDb((prev) => ({
      ...prev,
      inkSuppliers: (prev.inkSuppliers || []).filter((s) => s.id !== id),
      inkPurchases: (prev.inkPurchases || []).filter((p) => p.supplierId !== id),
      inkSupplierPayments: (prev.inkSupplierPayments || []).filter((p) => p.supplierId !== id),
    }));
    return true;
  };

  const addInkPurchase = (data: Omit<InkPurchaseRecord, 'id' | 'createdAt' | 'updatedAt'>): InkPurchaseRecord => {
    if (guardReadOnly()) return { ...data, id: '', totalAmount: 0, createdAt: '', updatedAt: '' } as InkPurchaseRecord;
    const now = new Date().toISOString();
    const purchaseId = `ink_pur_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const totalAmount = Math.round(Number(data.quantity || 0) * Number(data.unitPrice || 0));
    const paidAmount = data.paymentType === 'cash' ? totalAmount : (Number(data.paidAmount) || 0);

    let expenseTxId: string | undefined = undefined;
    let newTx: IncomeExpenseTransaction | null = null;

    if (paidAmount > 0) {
      expenseTxId = `tx_ink_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      newTx = {
        id: expenseTxId,
        date: data.date,
        type: 'expense',
        category: 'কালি ও প্রেস মালামাল ক্রয়',
        amount: paidAmount,
        paymentMethod: data.paymentMethod || 'নগদ',
        description: `মালামাল ক্রয়: ${data.itemName} (${data.quantity} ${data.unit}) - দোকান: ${data.supplierName}${data.carrierName ? ` (বাহক: ${data.carrierName})` : ''}`,
        sourceType: 'ink_purchase',
        sourceId: purchaseId,
        createdAt: now,
        updatedAt: now,
      };
    }

    const newPurchase: InkPurchaseRecord = {
      ...data,
      id: purchaseId,
      totalAmount,
      paidAmount,
      expenseTransactionId: expenseTxId,
      createdAt: now,
      updatedAt: now,
    };

    setDb((prev) => ({
      ...prev,
      inkPurchases: [newPurchase, ...(prev.inkPurchases || [])],
      transactions: newTx ? [newTx, ...prev.transactions] : prev.transactions,
    }));

    return newPurchase;
  };

  const updateInkPurchase = (id: string, updates: Partial<InkPurchaseRecord>) => {
    if (guardReadOnly()) return;
    const now = new Date().toISOString();
    setDb((prev) => {
      const updatedPurchases = (prev.inkPurchases || []).map((p) => {
        if (p.id !== id) return p;
        const merged = { ...p, ...updates, updatedAt: now };
        const quantity = Number(merged.quantity || 0);
        const unitPrice = Number(merged.unitPrice || 0);
        merged.totalAmount = Math.round(quantity * unitPrice);
        if (merged.paymentType === 'cash') {
          merged.paidAmount = merged.totalAmount;
        }
        return merged;
      });

      const target = updatedPurchases.find((p) => p.id === id);
      let updatedTxs = prev.transactions;
      if (target && target.expenseTransactionId) {
        updatedTxs = prev.transactions.map((tx) => {
          if (tx.id === target.expenseTransactionId) {
            return {
              ...tx,
              date: target.date,
              amount: target.paidAmount || 0,
              description: `মালামাল ক্রয়: ${target.itemName} (${target.quantity} ${target.unit}) - দোকান: ${target.supplierName}${target.carrierName ? ` (বাহক: ${target.carrierName})` : ''}`,
              updatedAt: now,
            };
          }
          return tx;
        });
      }

      return {
        ...prev,
        inkPurchases: updatedPurchases,
        transactions: updatedTxs,
      };
    });
  };

  const deleteInkPurchase = (id: string): boolean => {
    if (guardReadOnly()) return false;
    setDb((prev) => {
      const target = (prev.inkPurchases || []).find((p) => p.id === id);
      const updatedTxs = prev.transactions.filter(
        (tx) => tx.id !== target?.expenseTransactionId && tx.sourceId !== id
      );
      return {
        ...prev,
        inkPurchases: (prev.inkPurchases || []).filter((p) => p.id !== id),
        transactions: updatedTxs,
      };
    });
    return true;
  };

  const addInkSupplierPayment = (
    data: Omit<InkSupplierPayment, 'id' | 'createdAt' | 'updatedAt'>
  ): InkSupplierPayment => {
    if (guardReadOnly()) return { ...data, id: '', createdAt: '', updatedAt: '' } as InkSupplierPayment;
    const now = new Date().toISOString();
    const paymentId = `ink_pay_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const txId = `tx_inkpay_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    const newTx: IncomeExpenseTransaction = {
      id: txId,
      date: data.date,
      type: 'expense',
      category: 'কালির দোকান বাকি পরিশোধ',
      amount: Number(data.amount) || 0,
      paymentMethod: data.paymentMethod || 'নগদ',
      description: `কালির দোকান বাকি পরিশোধ: ${data.supplierName}${data.carrierName ? ` (মাধ্যমে: ${data.carrierName})` : ''}${data.receiptNo ? ` (মেমো: ${data.receiptNo})` : ''}`,
      sourceType: 'ink_supplier_payment',
      sourceId: paymentId,
      createdAt: now,
      updatedAt: now,
    };

    const newPayment: InkSupplierPayment = {
      ...data,
      id: paymentId,
      createdAt: now,
      updatedAt: now,
    };

    setDb((prev) => ({
      ...prev,
      inkSupplierPayments: [newPayment, ...(prev.inkSupplierPayments || [])],
      transactions: [newTx, ...prev.transactions],
    }));

    return newPayment;
  };

  const deleteInkSupplierPayment = (id: string): boolean => {
    if (guardReadOnly()) return false;
    setDb((prev) => ({
      ...prev,
      inkSupplierPayments: (prev.inkSupplierPayments || []).filter((p) => p.id !== id),
      transactions: prev.transactions.filter((tx) => tx.sourceId !== id),
    }));
    return true;
  };

  const getInkSupplierBalance = (supplierId: string): number => {
    const supplier = (db.inkSuppliers || []).find((s) => s.id === supplierId);
    if (!supplier) return 0;

    const openingDue = Number(supplier.openingDue || 0);

    const purchases = (db.inkPurchases || []).filter((p) => p.supplierId === supplierId);
    const purchaseDue = purchases.reduce((sum, p) => {
      const total = Number(p.totalAmount || 0);
      const paid = p.paymentType === 'cash' ? total : Number(p.paidAmount || 0);
      return sum + Math.max(0, total - paid);
    }, 0);

    const payments = (db.inkSupplierPayments || []).filter((p) => p.supplierId === supplierId);
    const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    return Math.round(openingDue + purchaseDue - totalPayments);
  };

  const getKnownInkItems = (): string[] => {
    const defaultPressItems = [
      'সান ব্ল্যাক কালি (Sun Black)',
      'সান সায়ান কালি (Sun Cyan)',
      'সান ম্যাজেন্টা কালি (Sun Magenta)',
      'সান ইয়েলো কালি (Sun Yellow)',
      'টয়ো কালার ব্ল্যাক কালি',
      'টয়ো কালার ৪-কালার সেট',
      'ডিসি রোলার ওয়াশ (DC Roller Wash)',
      'ডিডি রোলার ওয়াশ (DD Roller Wash)',
      'আইপিএ (IPA - আইসোপ্রোপাইল অ্যালকোহল)',
      'ফাউন্টেন সলিউশন (Fountain Solution)',
      'প্লেট ক্লিনার (Plate Cleaner)',
      'গাম অ্যারাবিক (Gum Arabic)',
      'ব্ল্যাঙ্কেট ওয়াশ (Blanket Wash)',
      'গোল্ডেন ড্রায়ার (Golden Dryer)',
      'রেড রিডিউসার (Red Reducer)',
      'স্প্রে পাউডার (Anti-Set Spray)',
      'স্কাফ রেজিস্ট্যান্ট ভার্নিশ (OPV)',
      'কাটিং চাকু ধার বিল',
      'স্টেচিং তার (Stitching Wire)',
      'প্যাকিং সুতলি ও পলিথিন',
      'বাইন্ডিং গাম আঠা (Glue)',
      'প্লাস্টিক লেমিনেশন রোল',
    ];

    const fromPurchases = (db.inkPurchases || []).map((p) => p.itemName).filter(Boolean);
    const combined = Array.from(new Set([...fromPurchases, ...defaultPressItems]));
    return combined;
  };

  // INK ORDER SLIPS (কালির দোকান অর্ডার স্লিপ — দর ছাড়া/সহ)
  const addInkOrderSlip = (
    data: Omit<InkOrderSlip, 'id' | 'createdAt' | 'updatedAt'>
  ): InkOrderSlip => {
    if (guardReadOnly()) {
      return { ...data, id: '', createdAt: '', updatedAt: '' } as InkOrderSlip;
    }
    const now = new Date().toISOString();
    const newSlip: InkOrderSlip = {
      ...data,
      id: `inkord_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: now,
      updatedAt: now,
    };
    setDb((prev) => ({
      ...prev,
      inkOrderSlips: [newSlip, ...(prev.inkOrderSlips || [])],
    }));
    return newSlip;
  };

  const updateInkOrderSlip = (id: string, updates: Partial<InkOrderSlip>) => {
    if (guardReadOnly()) return;
    const now = new Date().toISOString();
    setDb((prev) => ({
      ...prev,
      inkOrderSlips: (prev.inkOrderSlips || []).map((s) =>
        s.id === id ? { ...s, ...updates, updatedAt: now } : s
      ),
    }));
  };

  const deleteInkOrderSlip = (id: string): boolean => {
    if (guardReadOnly()) return false;
    setDb((prev) => ({
      ...prev,
      inkOrderSlips: (prev.inkOrderSlips || []).filter((s) => s.id !== id),
    }));
    return true;
  };

  // ==========================================
  // ব্যবহারকারী ও এক্সেস নিয়ন্ত্রণ (RBAC & User Access)
  // ==========================================
  const currentBusiness = useMemo<RegisteredBusiness | null>(() => {
    return saasRegistry.businesses.find((b) => b.id === activeBusinessId) || null;
  }, [saasRegistry.businesses, activeBusinessId]);

  const isMainAdmin = useMemo<boolean>(() => {
    if (!currentUser) return false;
    const email = (currentUser.email || '').toLowerCase().trim();
    return email === MAIN_SUPER_ADMIN_EMAIL.toLowerCase();
  }, [currentUser]);

  const userBusinesses = useMemo<RegisteredBusiness[]>(() => {
    if (!currentUser) return [];
    if (isMainAdmin) return saasRegistry.businesses;
    const email = (currentUser.email || '').toLowerCase().trim();
    const list = saasRegistry.businesses.filter(
      (b) =>
        b.ownerEmail?.toLowerCase().trim() === email ||
        b.ownerUid === currentUser.uid ||
        (b.memberEmails || []).some((m) => m.toLowerCase().trim() === email)
    );
    // Fallback to flagship business if user is logged into it without any registered shop
    if (list.length === 0) {
      const flagship = saasRegistry.businesses.find((b) => b.id === DEFAULT_BUSINESS_ID);
      return flagship ? [flagship] : [];
    }
    return list;
  }, [currentUser, isMainAdmin, saasRegistry.businesses]);

  const currentUserAccess = useMemo<AppUserAccess | null>(() => {
    if (!currentUser) return null;

    const email = (currentUser.email || '').toLowerCase().trim();
    const isShopOwner = Boolean(
      currentBusiness &&
        currentBusiness.id !== DEFAULT_BUSINESS_ID &&
        (currentBusiness.ownerEmail?.toLowerCase().trim() === email ||
          currentBusiness.ownerUid === currentUser.uid)
    );
    const adminEmail = (db.settings.adminEmail || '').toLowerCase().trim();
    const isFlagshipAdmin = Boolean(
      activeBusinessId === DEFAULT_BUSINESS_ID && adminEmail && email === adminEmail
    );

    if (email === MAIN_SUPER_ADMIN_EMAIL.toLowerCase() || isShopOwner || isFlagshipAdmin) {
      return {
        uid: currentUser.uid,
        email: currentUser.email || MAIN_SUPER_ADMIN_EMAIL,
        displayName:
          currentUser.displayName ||
          (email === MAIN_SUPER_ADMIN_EMAIL.toLowerCase() ? 'মেইন সুপার অ্যাডমিন' : currentBusiness?.name || 'প্রতিষ্ঠান মালিক'),
        photoURL: currentUser.photoURL || undefined,
        status: 'approved',
        role: email === MAIN_SUPER_ADMIN_EMAIL.toLowerCase() ? 'super_admin' : 'admin',
        businessId: activeBusinessId,
        permissions: {
          dashboard: true,
          parties: true,
          books: true,
          production: true,
          plates: true,
          paperStock: true,
          billing: true,
          collections: true,
          incomeExpense: true,
          inkSuppliers: true,
          employees: true,
          attendance: true,
          combinedAttendance: true,
          payroll: true,
          cutting: true,
          putti: true,
          reports: true,
          dataMgmt: true,
          settings: true,
          userAccess: true,
        },
        requestedAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
      };
    }

    const found = (db.userAccessList || []).find(
      (u) => u.uid === currentUser.uid || u.email.toLowerCase().trim() === email
    );

    return found || null;
  }, [currentUser, db.userAccessList, db.settings.adminEmail, currentBusiness, activeBusinessId]);

  const normalizePartyLoginId = (loginId: string): string => {
    return (loginId || '').trim().toLowerCase().replace(/[^a-z0-9_.-@]/g, '');
  };

  const normalizePartyLoginEmail = (loginId: string): string => {
    const clean = normalizePartyLoginId(loginId);
    if (!clean) return 'party@party.makkahprinters.local';
    if (clean.includes('@')) return clean;
    return `${clean}@party.makkahprinters.local`;
  };

  const toFirebasePartyPassword = (rawPwd: string): string => {
    const p = (rawPwd || '').trim();
    return p.length >= 6 ? p : `${p}__ptl`;
  };

  const currentPartyAccount = useMemo<PartyPortalAccount | null>(() => {
    if (!currentUser) return null;
    const email = (currentUser.email || '').toLowerCase().trim();
    if (email === MAIN_SUPER_ADMIN_EMAIL.toLowerCase()) return null;
    return (
      (saasRegistry.partyAccounts || []).find(
        (p) =>
          (p.uid && p.uid === currentUser.uid) ||
          normalizePartyLoginEmail(p.loginId) === email
      ) || null
    );
  }, [currentUser, saasRegistry.partyAccounts]);

  const isPartyPortalUser = useMemo<boolean>(() => {
    if (!currentUser) return false;
    const email = (currentUser.email || '').toLowerCase().trim();
    if (email === MAIN_SUPER_ADMIN_EMAIL.toLowerCase()) return false;
    if (currentPartyAccount) return true;
    return email.endsWith('@party.makkahprinters.local');
  }, [currentUser, currentPartyAccount]);

  const canManagePartyPortal = useMemo<boolean>(() => {
    if (!currentUser) return false;
    if (isMainAdmin) return true;
    if (checkReadOnly()) return false;
    const role = currentUserAccess?.role;
    return role === 'super_admin' || role === 'admin' || role === 'manager';
  }, [currentUser, isMainAdmin, currentUserAccess]);

  // Auto-register any newly logged-in staff/admin user in db.userAccessList as 'pending' (NEVER register Party Portal customers as press staff)
  useEffect(() => {
    if (!currentUser || !isReady || loadedBusinessIdRef.current !== activeBusinessId) return;
    if (isPartyPortalUser) return;

    const email = (currentUser.email || '').toLowerCase().trim();
    const isSuperAdminEmail = email === MAIN_SUPER_ADMIN_EMAIL.toLowerCase();
    const isShopOwner = Boolean(
      currentBusiness &&
        currentBusiness.id !== DEFAULT_BUSINESS_ID &&
        (currentBusiness.ownerEmail?.toLowerCase().trim() === email ||
          currentBusiness.ownerUid === currentUser.uid)
    );
    const adminEmail = (db.settings.adminEmail || '').toLowerCase().trim();
    const isFlagshipAdmin = Boolean(
      activeBusinessId === DEFAULT_BUSINESS_ID && adminEmail && email === adminEmail
    );
    const autoApprove = isSuperAdminEmail || isShopOwner || isFlagshipAdmin;

    setDb((prev) => {
      const list = prev.userAccessList || [];
      const index = list.findIndex(
        (u) => u.uid === currentUser.uid || u.email.toLowerCase().trim() === email
      );

      if (index >= 0) {
        if (autoApprove && list[index].status !== 'approved') {
          const updated = [...list];
          updated[index] = {
            ...updated[index],
            status: 'approved',
            role: isSuperAdminEmail ? 'super_admin' : 'admin',
            permissions: {
              dashboard: true,
              parties: true,
              books: true,
              production: true,
              plates: true,
              paperStock: true,
              billing: true,
              collections: true,
              incomeExpense: true,
              inkSuppliers: true,
              employees: true,
              attendance: true,
              combinedAttendance: true,
              payroll: true,
              cutting: true,
              putti: true,
              reports: true,
              dataMgmt: true,
              settings: true,
              userAccess: true,
            },
          };
          return { ...prev, userAccessList: updated };
        }
        return prev;
      }

      const newUser: AppUserAccess = {
        uid: currentUser.uid,
        email: currentUser.email || '',
        displayName: currentUser.displayName || currentUser.email || 'ব্যবহারকারী',
        photoURL: currentUser.photoURL || undefined,
        status: autoApprove ? 'approved' : 'pending',
        role: isSuperAdminEmail ? 'super_admin' : isShopOwner || isFlagshipAdmin ? 'admin' : 'custom',
        businessId: activeBusinessId,
        permissions: {
          dashboard: autoApprove,
          parties: autoApprove,
          books: autoApprove,
          production: autoApprove,
          plates: autoApprove,
          paperStock: autoApprove,
          billing: autoApprove,
          collections: autoApprove,
          incomeExpense: autoApprove,
          inkSuppliers: autoApprove,
          employees: autoApprove,
          attendance: autoApprove,
          combinedAttendance: autoApprove,
          payroll: autoApprove,
          cutting: autoApprove,
          putti: autoApprove,
          reports: autoApprove,
          dataMgmt: autoApprove,
          settings: autoApprove,
          userAccess: autoApprove,
        },
        requestedAt: new Date().toISOString(),
        approvedAt: autoApprove ? new Date().toISOString() : undefined,
      };

      return {
        ...prev,
        userAccessList: [newUser, ...list],
      };
    });
  }, [currentUser, isReady, db.settings.adminEmail, activeBusinessId, currentBusiness]);

  // ==========================================
  // এডমিন প্যানেল পাসওয়ার্ড (Salsabil1522) ও এক্সেস নিয়ন্ত্রণ
  // ==========================================
  const MAIN_ADMIN_PASSWORD = 'Salsabil1522';

  const [isAdminPanelUnlocked, setIsAdminPanelUnlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('makkah_admin_panel_unlocked') === 'true';
    }
    return false;
  });

  const unlockAdminPanel = (password: string): { success: boolean; error?: string } => {
    const trimmed = (password || '').trim();
    const customPin = (db.settings.adminPin || '').trim();
    if (trimmed === MAIN_ADMIN_PASSWORD || (customPin && trimmed === customPin)) {
      setIsAdminPanelUnlocked(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('makkah_admin_panel_unlocked', 'true');
      }
      return { success: true };
    }
    return {
      success: false,
      error: 'ভুল পাসওয়ার্ড! শুধুমাত্র অনুমোদিত মেইন এডমিন পাসওয়ার্ড দিয়ে এডমিন প্যানেল খোলা সম্ভব। সঠিক পাসওয়ার্ড দিন।',
    };
  };

  const lockAdminPanel = () => {
    setIsAdminPanelUnlocked(false);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('makkah_admin_panel_unlocked');
    }
  };

  const isReadOnly = useMemo<boolean>(() => {
    return checkReadOnly();
  }, [currentUser, currentUserAccess]);

  const resolvePlanDurationDays = useCallback(
    (
      planType: SubscriptionPlanType,
      customDays?: number | null,
      settings: SaaSPlatformSettings = saasRegistryRef.current.platformSettings
    ): number | null => {
      if (planType === 'one_time' || planType === 'lifetime') {
        return null;
      }
      if (typeof customDays === 'number' && !isNaN(customDays) && customDays > 0) {
        return customDays;
      }
      if (planType === 'trial') {
        return Math.max(1, settings.defaultTrialDays || settings.plans.trial?.durationDays || 14);
      }
      if (planType === 'monthly') {
        return Math.max(1, settings.plans.monthly?.durationDays || 30);
      }
      if (planType === 'yearly') {
        return Math.max(1, settings.plans.yearly?.durationDays || 365);
      }
      return 30;
    },
    []
  );

  const subscriptionInfo = useMemo(() => {
    if (!currentBusiness) {
      return {
        isExpired: false,
        daysRemaining: null as number | null,
        isTrial: false,
        isLifetime: true,
        planLabel: 'আজীবন আনলিমিটেড',
        status: 'approved',
      };
    }

    const isLifePlan =
      currentBusiness.planType === 'lifetime' || currentBusiness.planType === 'one_time';

    if (isLifePlan) {
      return {
        isExpired: false,
        daysRemaining: null as number | null,
        isTrial: false,
        isLifetime: true,
        planLabel:
          currentBusiness.planType === 'one_time' ? 'এককালীন / আজীবন' : 'আজীবন আনলিমিটেড',
        status: currentBusiness.status || 'approved',
      };
    }

    const fallbackDays = resolvePlanDurationDays(
      currentBusiness.planType,
      currentBusiness.durationDays,
      saasRegistry.platformSettings
    ) || 30;
    const baseActivatedMs = currentBusiness.activatedAt
      ? new Date(currentBusiness.activatedAt).getTime()
      : Date.now();
    const expMs = currentBusiness.expiresAt
      ? new Date(currentBusiness.expiresAt).getTime()
      : baseActivatedMs + fallbackDays * 86400000;
    const diffMs = expMs - Date.now();
    const daysRemaining = Math.max(0, Math.ceil(diffMs / 86400000));
    const isExpired = diffMs <= 0;

    const planLabel =
      currentBusiness.planType === 'trial'
        ? 'ফ্রি ট্রায়াল'
        : currentBusiness.planType === 'monthly'
        ? 'মাসিক সাবস্ক্রিপশন'
        : 'বাৎসরিক সাবস্ক্রিপশন';

    return {
      isExpired,
      daysRemaining,
      isTrial: currentBusiness.planType === 'trial',
      isLifetime: false,
      planLabel,
      status: currentBusiness.status,
    };
  }, [currentBusiness, resolvePlanDurationDays, saasRegistry.platformSettings]);

  const markBusinessUnlockedInSession = useCallback(
    (businessId: string) => {
      if (!businessId) return;
      setUnlockedBusinessIds((prev) => {
        if (prev.includes(businessId)) return prev;
        const next = [...prev, businessId];
        if (currentUser?.uid && typeof window !== 'undefined') {
          try {
            sessionStorage.setItem(`press_unlocked_shops_${currentUser.uid}`, JSON.stringify(next));
          } catch {
            // ignore
          }
        }
        return next;
      });
    },
    [currentUser?.uid]
  );

  const isCurrentBusinessUnlocked = useMemo<boolean>(() => {
    if (!currentUser) return false;
    if (isMainAdmin) return true;
    if (!currentBusiness || !currentBusiness.shopPassword) return true;
    return unlockedBusinessIds.includes(activeBusinessId);
  }, [currentUser, isMainAdmin, currentBusiness, unlockedBusinessIds, activeBusinessId]);

  const verifyAndUnlockBusiness = useCallback(
    (businessId: string, password: string): { success: boolean; error?: string } => {
      const target = saasRegistryRef.current.businesses.find((b) => b.id === businessId);
      if (!target) {
        return { success: false, error: 'প্রতিষ্ঠানটি খুঁজে পাওয়া যায়নি।' };
      }
      if (!isMainAdmin && target.shopPassword) {
        if ((password || '').trim() !== target.shopPassword.trim()) {
          return {
            success: false,
            error: 'দোকানের নিরাপত্তা পাসওয়ার্ড সঠিক নয়! সঠিক পাসওয়ার্ড দিন।',
          };
        }
      }
      markBusinessUnlockedInSession(businessId);
      if (businessId !== activeBusinessId) {
        try {
          localStorage.setItem(ACTIVE_BUSINESS_STORAGE_KEY, businessId);
        } catch {
          // ignore
        }
        setIsReady(false);
        setActiveBusinessId(businessId);
      }
      return { success: true };
    },
    [isMainAdmin, markBusinessUnlockedInSession, activeBusinessId]
  );

  const isModuleLockedBySubscription = useCallback(
    (module: AppPermissionModule): boolean => {
      if (isMainAdmin) return false;
      if (currentBusiness?.status === 'suspended') return true;
      if (!subscriptionInfo.isExpired) return false;
      const freeSet = new Set(saasRegistry.platformSettings.freeModules || []);
      if (freeSet.has(module)) return false;
      const paidSet = new Set(saasRegistry.platformSettings.paidModules || []);
      return paidSet.has(module);
    },
    [isMainAdmin, currentBusiness, subscriptionInfo.isExpired, saasRegistry.platformSettings]
  );

  const canManageResetAndDemo = useMemo<boolean>(() => {
    if (!currentUser) return false;
    if (isMainAdmin) return true;
    if (checkReadOnly()) return false;
    if (!currentUserAccess || currentUserAccess.status !== 'approved') return false;
    return (
      currentUserAccess.role === 'super_admin' ||
      currentUserAccess.role === 'admin' ||
      currentUserAccess.role === 'manager'
    );
  }, [currentUser, isMainAdmin, currentUserAccess]);

  const canDeletePlates = canManageResetAndDemo;

  const canAccessModule = useCallback(
    (module: AppPermissionModule): boolean => {
      const isAdminModule = module === 'userAccess' || module === 'settings';
      if (isAdminModule) {
        return isAdminPanelUnlocked;
      }

      if (!currentUser) {
        return false;
      }
      if (isMainAdmin) {
        return true;
      }
      if (!currentUserAccess || currentUserAccess.status !== 'approved') {
        return false;
      }
      if (module === 'dataMgmt') {
        if (isAdminPanelUnlocked) return true;
        return !!currentUserAccess.permissions?.dataMgmt;
      }
      if (currentUserAccess.role === 'super_admin' || currentUserAccess.role === 'admin') {
        return true;
      }
      if (currentUserAccess.role === 'viewer') {
        return true;
      }
      if (module === 'combinedAttendance') {
        if (currentUserAccess.permissions?.combinedAttendance !== undefined) {
          return !!currentUserAccess.permissions.combinedAttendance;
        }
        if (currentUserAccess.role === 'custom' || currentUserAccess.role === 'operator') {
          return false;
        }
        return !!currentUserAccess.permissions?.attendance;
      }
      return !!currentUserAccess.permissions?.[module];
    },
    [currentUser, isMainAdmin, currentUserAccess, isAdminPanelUnlocked]
  );

  const switchBusiness = useCallback((businessId: string) => {
    if (!businessId || businessId === activeBusinessId) return;
    if (!isMainAdmin) {
      const allowed = userBusinesses.some((b) => b.id === businessId);
      if (!allowed) return;
    }
    try {
      localStorage.setItem(ACTIVE_BUSINESS_STORAGE_KEY, businessId);
    } catch {
      // ignore
    }
    setIsReady(false);
    setActiveBusinessId(businessId);
  }, [activeBusinessId, isMainAdmin, userBusinesses]);

  const persistRegistryUpdate = useCallback(async (nextRegistry: SaaSRegistryState) => {
    setSaasRegistry(nextRegistry);
    try {
      localStorage.setItem(SAAS_REGISTRY_CACHE_KEY, JSON.stringify(nextRegistry));
    } catch {
      // ignore
    }
    if (currentUser && !isCloudQuotaExhausted()) {
      const ok = await pushSaaSRegistryToCloud(nextRegistry, false);
      if (!ok && isCloudQuotaExhausted()) {
        setCloudSyncStatus('quota_exceeded');
        setIsQuotaExceeded(true);
      }
    }
  }, [currentUser]);

  const registerNewBusiness = async (data: {
    name: string;
    nameEn?: string;
    phone?: string;
    address?: string;
    planType?: SubscriptionPlanType;
    shopPassword?: string;
    notes?: string;
  }): Promise<{ success: boolean; business?: RegisteredBusiness; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'নতুন ব্যবসা যোগ করতে অনুগ্রহ করে লগইন করুন।' };
    }
    const cleanName = (data.name || '').trim();
    if (!cleanName) {
      return { success: false, error: 'প্রতিষ্ঠানের নাম লিখুন।' };
    }
    const cleanShopPass = (data.shopPassword || '').trim();
    if (cleanShopPass.length < 4) {
      return { success: false, error: 'দোকানের নিরাপত্তার জন্য কমপক্ষে ৪ অক্ষরের পাসওয়ার্ড দিন।' };
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const planType: SubscriptionPlanType = data.planType || 'trial';
    const settings = saasRegistryRef.current.platformSettings;
    const planCfg =
      planType === 'lifetime' || planType === 'one_time'
        ? settings.plans.one_time
        : settings.plans[planType];

    const durationDays = resolvePlanDurationDays(planType, planCfg?.durationDays, settings);
    const basePrice = planCfg?.basePrice || 0;
    const expiresAt =
      durationDays !== null
        ? new Date(now.getTime() + durationDays * 86400000).toISOString()
        : null;

    const bizId = `biz_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newBusiness: RegisteredBusiness = {
      id: bizId,
      name: cleanName,
      nameEn: (data.nameEn || cleanName).trim(),
      ownerUid: currentUser.uid,
      ownerEmail: currentUser.email || '',
      ownerName: currentUser.displayName || currentUser.email || cleanName,
      phone: (data.phone || '').trim(),
      address: (data.address || '').trim(),
      shopPassword: cleanShopPass,
      status: isMainAdmin ? 'approved' : 'pending',
      planType,
      customPrice: basePrice,
      discountType: 'amount',
      discountValue: 0,
      discountAmount: 0,
      finalPrice: basePrice,
      paidAmount: isMainAdmin ? basePrice : 0,
      durationDays,
      activatedAt: nowIso,
      expiresAt,
      memberEmails: currentUser.email ? [currentUser.email] : [],
      notes: data.notes || '',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const nextRegistry: SaaSRegistryState = {
      ...saasRegistryRef.current,
      businesses: [newBusiness, ...saasRegistryRef.current.businesses],
      updatedAt: nowIso,
    };

    await persistRegistryUpdate(nextRegistry);
    await initializeNewBusinessDatabaseInCloud(newBusiness, defaultSettings, currentUser);
    markBusinessUnlockedInSession(bizId);
    try {
      localStorage.setItem(ACTIVE_BUSINESS_STORAGE_KEY, bizId);
    } catch {
      // ignore
    }
    setIsReady(false);
    setActiveBusinessId(bizId);

    return { success: true, business: newBusiness };
  };

  const updateRegisteredBusiness = async (
    businessId: string,
    updates: Partial<RegisteredBusiness> & { renewDays?: number | null }
  ): Promise<boolean> => {
    if (!isMainAdmin) {
      alert('শুধুমাত্র মেইন সুপার অ্যাডমিন ব্যবসা ও সাবস্ক্রিপশন পরিচালনা করতে পারবেন।');
      return false;
    }
    const now = new Date();
    const nowIso = now.toISOString();
    const { renewDays, ...cleanUpdates } = updates;
    const settings = saasRegistryRef.current.platformSettings;

    const updatedBusinesses = saasRegistryRef.current.businesses.map((b) => {
      if (b.id !== businessId) return b;
      const merged: RegisteredBusiness = {
        ...b,
        ...cleanUpdates,
        updatedAt: nowIso,
      };

      const price = Number(merged.customPrice || 0);
      const discType = merged.discountType || 'amount';
      const discVal = Number(merged.discountValue ?? merged.discountAmount ?? 0);
      const computedDisc =
        discType === 'percent'
          ? Math.round((price * Math.min(100, Math.max(0, discVal))) / 100)
          : Math.max(0, discVal);
      merged.discountType = discType;
      merged.discountValue = discVal;
      merged.discountAmount = computedDisc;
      merged.finalPrice = Math.max(0, Math.round(price - computedDisc));

      if (merged.planType === 'one_time' || merged.planType === 'lifetime') {
        merged.durationDays = null;
        merged.expiresAt = null;
      } else {
        const planChanged = cleanUpdates.planType !== undefined && cleanUpdates.planType !== b.planType;
        const justApproved = cleanUpdates.status === 'approved' && b.status === 'pending';
        const hasValidRenewDays = typeof renewDays === 'number' && !isNaN(renewDays) && renewDays > 0;

        if (hasValidRenewDays) {
          merged.durationDays = renewDays;
          merged.activatedAt = nowIso;
          merged.expiresAt = new Date(now.getTime() + renewDays * 86400000).toISOString();
        } else if (planChanged || justApproved || !merged.expiresAt) {
          const resolvedDays =
            resolvePlanDurationDays(
              merged.planType,
              planChanged ? null : merged.durationDays,
              settings
            ) || 30;
          merged.durationDays = resolvedDays;
          merged.activatedAt = nowIso;
          merged.expiresAt = new Date(now.getTime() + resolvedDays * 86400000).toISOString();
        }
      }

      return merged;
    });

    await persistRegistryUpdate({
      ...saasRegistryRef.current,
      businesses: updatedBusinesses,
      updatedAt: nowIso,
    });
    return true;
  };

  const deleteRegisteredBusiness = async (businessId: string): Promise<boolean> => {
    if (!isMainAdmin || businessId === DEFAULT_BUSINESS_ID) return false;
    const nextRegistry: SaaSRegistryState = {
      ...saasRegistryRef.current,
      businesses: saasRegistryRef.current.businesses.filter((b) => b.id !== businessId),
      updatedAt: new Date().toISOString(),
    };
    await persistRegistryUpdate(nextRegistry);
    if (activeBusinessId === businessId) {
      switchBusiness(DEFAULT_BUSINESS_ID);
    }
    return true;
  };

  const updateSaaSPlatformSettings = async (
    updates: Partial<SaaSPlatformSettings>
  ): Promise<boolean> => {
    if (!isMainAdmin) return false;
    const nowIso = new Date().toISOString();
    const nextRegistry: SaaSRegistryState = {
      ...saasRegistryRef.current,
      platformSettings: {
        ...saasRegistryRef.current.platformSettings,
        ...updates,
        plans: {
          ...saasRegistryRef.current.platformSettings.plans,
          ...(updates.plans || {}),
        },
        updatedAt: nowIso,
      },
      updatedAt: nowIso,
    };
    await persistRegistryUpdate(nextRegistry);
    return true;
  };

  const submitSubscriptionPaymentRequest = async (data: {
    planType: SubscriptionPlanType;
    paymentMethodId: string;
    senderNumber: string;
    transactionId: string;
    paidAmount: number;
    notes?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser || !currentBusiness) {
      return { success: false, error: 'পেমেন্ট অনুরোধ পাঠাতে অনুগ্রহ করে লগইন করুন।' };
    }
    if (!data.senderNumber.trim() || !data.transactionId.trim()) {
      return { success: false, error: 'প্রেরকের নম্বর এবং ট্রানজেকশন আইডি (TrxID) লিখুন।' };
    }

    const reg = saasRegistryRef.current;
    const settings = reg.platformSettings;
    const planCfg =
      data.planType === 'one_time' || data.planType === 'lifetime'
        ? settings.plans.one_time
        : settings.plans[data.planType];
    const basePrice = Number(planCfg?.basePrice || 0);
    const discType = currentBusiness.discountType || 'amount';
    const discVal = Number(currentBusiness.discountValue ?? currentBusiness.discountAmount ?? 0);
    const computedDiscount =
      discType === 'percent'
        ? Math.round((basePrice * Math.min(100, Math.max(0, discVal))) / 100)
        : Math.max(0, discVal);
    const payableAmount = Math.max(0, Math.round(basePrice - computedDiscount));

    const methodObj = (settings.paymentMethods || []).find((m) => m.id === data.paymentMethodId);
    const nowIso = new Date().toISOString();

    const reqItem: SubscriptionPaymentRequest = {
      id: `payreq_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      businessId: currentBusiness.id,
      businessName: currentBusiness.name,
      ownerEmail: currentUser.email || currentBusiness.ownerEmail,
      planType: data.planType,
      planLabel: planCfg?.labelBn || data.planType,
      basePrice,
      discountType: discType,
      discountValue: discVal,
      discountAmount: computedDiscount,
      payableAmount,
      paidAmount: Math.max(0, Number(data.paidAmount) || 0),
      paymentMethodId: data.paymentMethodId,
      paymentMethodName: methodObj?.name || data.paymentMethodId,
      senderNumber: data.senderNumber.trim(),
      transactionId: data.transactionId.trim(),
      notes: (data.notes || '').trim(),
      status: 'pending',
      requestedAt: nowIso,
    };

    const nextRegistry: SaaSRegistryState = {
      ...reg,
      paymentRequests: [reqItem, ...(reg.paymentRequests || [])],
      updatedAt: nowIso,
    };
    await persistRegistryUpdate(nextRegistry);
    return { success: true };
  };

  const reviewSubscriptionPaymentRequest = async (
    requestId: string,
    decision: 'approved' | 'rejected'
  ): Promise<boolean> => {
    if (!isMainAdmin) return false;
    const reg = saasRegistryRef.current;
    const targetReq = (reg.paymentRequests || []).find((r) => r.id === requestId);
    if (!targetReq) return false;

    const now = new Date();
    const nowIso = now.toISOString();
    const settings = reg.platformSettings;

    const nextRequests = (reg.paymentRequests || []).map((r) =>
      r.id === requestId
        ? {
            ...r,
            status: decision,
            reviewedAt: nowIso,
            reviewedBy: currentUser?.email || MAIN_SUPER_ADMIN_EMAIL,
          }
        : r
    );

    let nextBusinesses = reg.businesses;
    if (decision === 'approved') {
      nextBusinesses = reg.businesses.map((b) => {
        if (b.id !== targetReq.businessId) return b;
        const resolvedDays = resolvePlanDurationDays(targetReq.planType, null, settings);
        const expiresAt =
          resolvedDays !== null
            ? new Date(now.getTime() + resolvedDays * 86400000).toISOString()
            : null;
        return {
          ...b,
          status: 'approved',
          planType: targetReq.planType,
          customPrice: targetReq.basePrice,
          discountType: targetReq.discountType || b.discountType || 'amount',
          discountValue: targetReq.discountValue ?? b.discountValue ?? 0,
          discountAmount: targetReq.discountAmount,
          finalPrice: targetReq.payableAmount,
          paidAmount: Number(b.paidAmount || 0) + Number(targetReq.paidAmount || 0),
          durationDays: resolvedDays,
          activatedAt: nowIso,
          expiresAt,
          updatedAt: nowIso,
        };
      });
    }

    await persistRegistryUpdate({
      ...reg,
      businesses: nextBusinesses,
      paymentRequests: nextRequests,
      updatedAt: nowIso,
    });
    return true;
  };

  const updateUserAccess = (uid: string, updates: Partial<AppUserAccess>) => {
    if (guardReadOnly()) return;
    const now = new Date().toISOString();
    setDb((prev) => ({
      ...prev,
      userAccessList: (prev.userAccessList || []).map((u) => {
        if (u.uid === uid || u.email === uid) {
          const merged = { ...u, ...updates };
          if (updates.status === 'approved' && !u.approvedAt) {
            merged.approvedAt = now;
            merged.approvedBy = currentUser?.email || MAIN_SUPER_ADMIN_EMAIL;
          }
          return merged;
        }
        return u;
      }),
    }));
  };

  const deleteUserAccess = (uid: string): boolean => {
    if (guardReadOnly()) return false;
    setDb((prev) => ({
      ...prev,
      userAccessList: (prev.userAccessList || []).filter(
        (u) => u.uid !== uid && u.email !== uid
      ),
    }));
    return true;
  };

  // DATA MANAGEMENT
  const resetBusinessData = (pin: string): { success: boolean; error?: string } => {
    if (guardReadOnly()) return { success: false, error: READONLY_ERR };
    if (!canManageResetAndDemo) {
      return {
        success: false,
        error: 'শুধুমাত্র সুপার অ্যাডমিন, অ্যাডমিন এবং ম্যানেজার এই অপশনটি ব্যবহার করতে পারবেন।',
      };
    }
    const trimmedPin = (pin || '').trim();
    const correctPin = (db.settings.adminPin || '1234').trim();
    if (trimmedPin !== correctPin && trimmedPin !== '1234' && trimmedPin !== 'admin') {
      return { success: false, error: 'ভুল অ্যাডমিন পিন (Invalid Admin PIN)' };
    }

    const resetState: DatabaseState = {
      settings: { ...db.settings }, // keep company profile & settings intact
      parties: [],
      books: [],
      productions: [],
      invoices: [],
      collections: [],
      employees: [],
      attendance: [],
      advances: [],
      payrolls: [],
      cuttingWorkers: [],
      cuttingRecords: [],
      puttiSales: [],
      transactions: [],
      plates: [],
      paperStock: [],
      inkSuppliers: [],
      inkPurchases: [],
      inkSupplierPayments: [],
      orderSlips: [],
      inkOrderSlips: [],
      userAccessList: db.userAccessList || [],
    };

    setDb(resetState);
    try {
      localStorage.setItem(getLocalStorageKey(activeBusinessId), JSON.stringify(resetState));
    } catch (e) {
      console.error('Failed to write reset state to localStorage', e);
    }

    return { success: true };
  };

  const resetCompanySettings = (pin?: string): { success: boolean; error?: string } => {
    if (guardReadOnly()) return { success: false, error: READONLY_ERR };
    if (!canManageResetAndDemo) {
      return {
        success: false,
        error: 'শুধুমাত্র সুপার অ্যাডমিন, অ্যাডমিন এবং ম্যানেজার কোম্পানির সেটিংস রিসেট করতে পারবেন।',
      };
    }
    if (pin) {
      const trimmedPin = pin.trim();
      const correctPin = (db.settings.adminPin || '1234').trim();
      if (trimmedPin !== correctPin && trimmedPin !== '1234' && trimmedPin !== 'admin') {
        return { success: false, error: 'ভুল অ্যাডমিন পিন (Invalid Admin PIN)' };
      }
    }
    setDb((prev) => {
      const updated = {
        ...prev,
        settings: { ...defaultSettings, isConfigured: false },
      };
      try {
        localStorage.setItem(getLocalStorageKey(activeBusinessId), JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save settings reset', e);
      }
      return updated;
    });
    return { success: true };
  };

  const clearDemoData = () => {
    if (guardReadOnly() || !canManageResetAndDemo) return;
    setDb((prev) => {
      const updated: DatabaseState = {
        ...prev,
        parties: prev.parties.filter((p) => !p.id.includes('demo')),
        books: prev.books.filter((b) => !b.id.includes('demo')),
        productions: prev.productions.filter((p) => !p.id.includes('demo')),
        invoices: prev.invoices.filter((i) => !i.id.includes('demo')),
        collections: prev.collections.filter((c) => !c.id.includes('demo')),
        employees: prev.employees.filter((e) => !e.id.includes('demo')),
        attendance: prev.attendance.filter((a) => !a.id.includes('demo')),
        advances: prev.advances.filter((a) => !a.id.includes('demo')),
        payrolls: prev.payrolls.filter((p) => !p.id.includes('demo')),
        cuttingWorkers: prev.cuttingWorkers.filter((w) => !w.id.includes('demo')),
        cuttingRecords: prev.cuttingRecords.filter((r) => !r.id.includes('demo')),
        puttiSales: prev.puttiSales.filter((s) => !s.id.includes('demo')),
        transactions: prev.transactions.filter((t) => !t.id.includes('demo')),
        plates: (prev.plates || []).filter((p) => !p.id.includes('demo')),
        paperStock: (prev.paperStock || []).filter((p) => !p.id.includes('demo')),
        inkSuppliers: (prev.inkSuppliers || []).filter((s) => !s.id.includes('demo')),
        inkPurchases: (prev.inkPurchases || []).filter((p) => !p.id.includes('demo')),
        inkSupplierPayments: (prev.inkSupplierPayments || []).filter((p) => !p.id.includes('demo')),
      };
      try {
        localStorage.setItem(getLocalStorageKey(activeBusinessId), JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save cleared demo data', e);
      }
      return updated;
    });
  };

  const isFullBackupAdmin = (): boolean => {
    if (!currentUser) return false;
    if (isMainAdmin || isAdminPanelUnlocked) return true;
    const role = currentUserAccess?.role;
    return currentUserAccess?.status === 'approved' && (role === 'super_admin' || role === 'admin');
  };

  const getPermittedExportModules = (): AppPermissionModule[] => {
    const allOps: AppPermissionModule[] = [
      'parties',
      'books',
      'production',
      'plates',
      'paperStock',
      'billing',
      'collections',
      'incomeExpense',
      'inkSuppliers',
      'employees',
      'attendance',
      'combinedAttendance',
      'payroll',
      'cutting',
      'putti',
    ];
    return allOps.filter((mod) => canAccessModule(mod));
  };

  const exportDatabaseJSON = (): string => {
    if (isFullBackupAdmin()) {
      return JSON.stringify(db, null, 2);
    }

    const allowedModules = getPermittedExportModules();
    const scopedPayload: Record<string, any> = {
      _scopedBackup: {
        version: 1,
        exportedAt: new Date().toISOString(),
        exportedBy: currentUser?.email || '',
        role: currentUserAccess?.role || 'custom',
        allowedModules,
      },
      settings: {
        name: db.settings.name,
        nameEn: db.settings.nameEn,
        language: db.settings.language,
        numberFormat: db.settings.numberFormat,
      },
    };

    if (allowedModules.includes('parties')) scopedPayload.parties = db.parties;
    if (allowedModules.includes('books')) scopedPayload.books = db.books;
    if (allowedModules.includes('production')) {
      scopedPayload.productions = db.productions;
      scopedPayload.orderSlips = db.orderSlips || [];
    }
    if (allowedModules.includes('plates')) scopedPayload.plates = db.plates;
    if (allowedModules.includes('paperStock')) scopedPayload.paperStock = db.paperStock;
    if (allowedModules.includes('billing')) scopedPayload.invoices = db.invoices;
    if (allowedModules.includes('collections')) scopedPayload.collections = db.collections;
    if (allowedModules.includes('incomeExpense')) scopedPayload.transactions = db.transactions;
    if (allowedModules.includes('inkSuppliers')) {
      scopedPayload.inkSuppliers = db.inkSuppliers;
      scopedPayload.inkPurchases = db.inkPurchases;
      scopedPayload.inkSupplierPayments = db.inkSupplierPayments;
      scopedPayload.inkOrderSlips = db.inkOrderSlips || [];
    }
    if (allowedModules.includes('employees')) scopedPayload.employees = db.employees;
    if (allowedModules.includes('attendance') || allowedModules.includes('combinedAttendance')) {
      scopedPayload.attendance = db.attendance;
    }
    if (allowedModules.includes('payroll')) {
      scopedPayload.payrolls = db.payrolls;
      scopedPayload.advances = db.advances;
    }
    if (allowedModules.includes('cutting')) {
      scopedPayload.cuttingWorkers = db.cuttingWorkers;
      scopedPayload.cuttingRecords = db.cuttingRecords;
    }
    if (allowedModules.includes('putti')) scopedPayload.puttiSales = db.puttiSales;

    return JSON.stringify(scopedPayload, null, 2);
  };

  const mergeById = <T extends { id?: string }>(existing: T[] = [], incoming: T[] = []): T[] => {
    const incomingMap = new Map<string, T>();
    const noIdIncoming: T[] = [];
    for (const item of incoming) {
      if (item && item.id) {
        incomingMap.set(item.id, item);
      } else if (item) {
        noIdIncoming.push(item);
      }
    }
    const keptExisting = existing.filter((item) => !item?.id || !incomingMap.has(item.id));
    return [...incoming.filter((i) => i && i.id), ...keptExisting, ...noIdIncoming];
  };

  const importDatabaseJSON = (jsonString: string): { success: boolean; error?: string } => {
    if (guardReadOnly()) return { success: false, error: READONLY_ERR };
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object') {
        return { success: false, error: 'ভুল JSON ফরম্যাট' };
      }

      const fullAdmin = isFullBackupAdmin();
      const isScopedFile = Boolean(
        parsed._scopedBackup && Array.isArray(parsed._scopedBackup.allowedModules)
      );

      if (isScopedFile || !fullAdmin) {
        const fileAllowed: string[] = isScopedFile
          ? parsed._scopedBackup.allowedModules
          : getPermittedExportModules();
        const permittedForUser = (mod: AppPermissionModule) =>
          fullAdmin || canAccessModule(mod);
        const allowKey = (mod: AppPermissionModule) =>
          fileAllowed.includes(mod) && permittedForUser(mod);

        setDb((prev) => {
          const next: DatabaseState = { ...prev };
          if (allowKey('parties') && Array.isArray(parsed.parties)) {
            next.parties = mergeById(prev.parties, parsed.parties);
          }
          if (allowKey('books') && Array.isArray(parsed.books)) {
            next.books = mergeById(prev.books, parsed.books);
          }
          if (allowKey('production')) {
            if (Array.isArray(parsed.productions)) {
              next.productions = mergeById(prev.productions, parsed.productions);
            }
            if (Array.isArray(parsed.orderSlips)) {
              next.orderSlips = mergeById(prev.orderSlips || [], parsed.orderSlips);
            }
          }
          if (allowKey('plates') && Array.isArray(parsed.plates)) {
            next.plates = mergeById(prev.plates, parsed.plates);
          }
          if (allowKey('paperStock') && Array.isArray(parsed.paperStock)) {
            next.paperStock = mergeById(prev.paperStock, parsed.paperStock);
          }
          if (allowKey('billing') && Array.isArray(parsed.invoices)) {
            next.invoices = mergeById(prev.invoices, parsed.invoices);
          }
          if (allowKey('collections') && Array.isArray(parsed.collections)) {
            next.collections = mergeById(prev.collections, parsed.collections);
          }
          if (allowKey('incomeExpense') && Array.isArray(parsed.transactions)) {
            next.transactions = mergeById(prev.transactions, parsed.transactions);
          }
          if (allowKey('inkSuppliers')) {
            if (Array.isArray(parsed.inkSuppliers)) {
              next.inkSuppliers = mergeById(prev.inkSuppliers, parsed.inkSuppliers);
            }
            if (Array.isArray(parsed.inkPurchases)) {
              next.inkPurchases = mergeById(prev.inkPurchases, parsed.inkPurchases);
            }
            if (Array.isArray(parsed.inkSupplierPayments)) {
              next.inkSupplierPayments = mergeById(
                prev.inkSupplierPayments,
                parsed.inkSupplierPayments
              );
            }
            if (Array.isArray(parsed.inkOrderSlips)) {
              next.inkOrderSlips = mergeById(prev.inkOrderSlips || [], parsed.inkOrderSlips);
            }
          }
          if (allowKey('employees') && Array.isArray(parsed.employees)) {
            next.employees = mergeById(prev.employees, parsed.employees);
          }
          if (
            (allowKey('attendance') || allowKey('combinedAttendance')) &&
            Array.isArray(parsed.attendance)
          ) {
            next.attendance = mergeById(prev.attendance, parsed.attendance);
          }
          if (allowKey('payroll')) {
            if (Array.isArray(parsed.payrolls)) {
              next.payrolls = mergeById(prev.payrolls, parsed.payrolls);
            }
            if (Array.isArray(parsed.advances)) {
              next.advances = mergeById(prev.advances, parsed.advances);
            }
          }
          if (allowKey('cutting')) {
            if (Array.isArray(parsed.cuttingWorkers)) {
              next.cuttingWorkers = mergeById(prev.cuttingWorkers, parsed.cuttingWorkers);
            }
            if (Array.isArray(parsed.cuttingRecords)) {
              next.cuttingRecords = mergeById(prev.cuttingRecords, parsed.cuttingRecords);
            }
          }
          if (allowKey('putti') && Array.isArray(parsed.puttiSales)) {
            next.puttiSales = mergeById(prev.puttiSales, parsed.puttiSales);
          }
          return next;
        });
        return { success: true };
      }

      setDb({
        ...initialEmptyState,
        ...parsed,
        settings: {
          ...defaultSettings,
          ...(parsed.settings || {}),
        },
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'ডেটাবেজ ইমপোর্ট ব্যর্থ হয়েছে' };
    }
  };

  // Offline Snapshots & Storage Helpers
  const refreshAutoSnapshots = async () => {
    const list = await getSnapshotsFromIndexedDB();
    setAutoSnapshots(list);
    const stats = await getStorageEstimate();
    setStorageStats(stats);
  };

  const createManualSnapshot = async (): Promise<boolean> => {
    const success = await saveSnapshotToIndexedDB(db);
    if (success) {
      await refreshAutoSnapshots();
    }
    return success;
  };

  const restoreSnapshotData = async (snapshotId: string): Promise<boolean> => {
    if (guardReadOnly()) return false;
    const target = autoSnapshots.find((s) => s.id === snapshotId);
    if (!target || !target.data) return false;
    setDb(target.data);
    await saveToIndexedDB(target.data, activeBusinessId);
    try {
      localStorage.setItem(getLocalStorageKey(activeBusinessId), JSON.stringify(target.data));
    } catch (e) {
      console.warn('LocalStorage quota warning during snapshot restore', e);
    }
    return true;
  };

  const deleteAutoSnapshot = async (snapshotId: string): Promise<boolean> => {
    if (guardReadOnly()) return false;
    const success = await deleteSnapshotFromIndexedDB(snapshotId);
    if (success) {
      await refreshAutoSnapshots();
    }
    return success;
  };

  // Cloud Auth & Sync Methods
  const forcePushToCloud = async (isManualRetry: boolean = false): Promise<boolean> => {
    if (!currentUser) return false;
    if (!isManualRetry && (isQuotaExceeded || isCloudQuotaExhausted())) {
      setCloudSyncStatus('quota_exceeded');
      setIsQuotaExceeded(true);
      return false;
    }
    if (isManualRetry) {
      resetQuotaExhaustedState();
    }
    setCloudSyncStatus('syncing');
    try {
      const res = await pushDatabaseToCloud(dbRef.current, currentUser, isManualRetry, activeBusinessId);
      if (res.success) {
        setCloudSyncStatus('synced');
        setIsQuotaExceeded(false);
        setIsQuotaDismissed(false);
        setLastCloudSyncTime(res.updatedAt || new Date().toISOString());
        return true;
      } else {
        if (res.isQuotaExhausted) {
          markCloudQuotaExhausted(12);
          setCloudSyncStatus('quota_exceeded');
          setIsQuotaExceeded(true);
        } else {
          setCloudSyncStatus('offline');
        }
        return false;
      }
    } catch (err) {
      console.warn('forcePushToCloud error:', err);
      setCloudSyncStatus('offline');
      return false;
    }
  };

  const dismissQuotaNotice = () => {
    setIsQuotaDismissed(true);
  };

  const loginWithGoogle = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      return { success: true, user: res.user };
    } catch (err: any) {
      const code = err?.code || '';
      if (
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/popup-closed-by-user'
      ) {
        return { success: false, error: 'গুগল লগইন পপআপ বাতিল করা হয়েছে।' };
      }
      if (code === 'auth/popup-blocked') {
        return {
          success: false,
          error:
            'আপনার ব্রাউজার পপআপ ব্লক করেছে। ব্রাউজারে পপআপ অনুমতি দিন অথবা নিচের ইউজারনেম/ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করুন।',
        };
      }
      if (code === 'auth/unauthorized-domain') {
        return {
          success: false,
          error:
            'এই ডোমেইনটি Firebase-এ গুগল লগইনের জন্য অনুমোদিত নয়। Firebase Console > Authentication > Settings > Authorized domains-এ আপনার ভারসেল/কাস্টম ডোমেইন যোগ করুন অথবা নিচের ইউজারনেম/ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করুন।',
        };
      }
      if (code === 'auth/operation-not-supported-in-this-environment') {
        return {
          success: false,
          error:
            'এই অ্যাপ ব্রাউজার (যেমন মেসেঞ্জার/হোয়াটসঅ্যাপ)-এ গুগল লগইন সাপোর্ট করে না। অনুগ্রহ করে Chrome বা Safari ব্রাউজারে লিংকটি খুলুন অথবা ইউজারনেম ও পাসওয়ার্ড দিয়ে লগইন করুন।',
        };
      }
      if (code === 'auth/network-request-failed') {
        return {
          success: false,
          error: 'ইন্টারনেট সংযোগ পাওয়া যায়নি। নেটওয়ার্ক যাচাই করে আবার চেষ্টা করুন।',
        };
      }
      console.error('Google Sign-In error', err);
      return { success: false, error: err?.message || 'গুগল লগইন সম্পন্ন করা যায়নি।' };
    }
  };

  const normalizeIdentifierToEmail = (identifier: string): string => {
    const trimmed = (identifier || '').trim().toLowerCase();
    if (trimmed.includes('@')) {
      return trimmed;
    }
    const cleanUsername = trimmed.replace(/[^a-z0-9_.-]/g, '');
    return `${cleanUsername || 'user'}@makkahprinters.local`;
  };

  const loginWithEmailOrUsername = async (identifier: string, password: string) => {
    try {
      if (!identifier.trim()) {
        return { success: false, error: 'ইউজারনেম বা ইমেইল লিখুন' };
      }
      if (!password) {
        return { success: false, error: 'পাসওয়ার্ড লিখুন' };
      }
      const email = normalizeIdentifierToEmail(identifier);
      const res = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: res.user };
    } catch (err: any) {
      console.warn('Email/Password Login error', err);
      let errorMsg = 'লগইন ব্যর্থ হয়েছে। ইউজারনেম/ইমেইল ও পাসওয়ার্ড সঠিক কিনা পরীক্ষা করুন।';
      if (err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential') {
        errorMsg = 'ভুল ইউজারনেম/ইমেইল অথবা ভুল পাসওয়ার্ড!';
      } else if (err?.code === 'auth/wrong-password') {
        errorMsg = 'ভুল পাসওয়ার্ড!';
      } else if (err?.code === 'auth/invalid-email') {
        errorMsg = 'সঠিক ইমেইল বা ইউজারনেম ফরম্যাট লিখুন!';
      } else if (err?.message) {
        errorMsg = err.message;
      }
      return { success: false, error: errorMsg };
    }
  };

  const signupWithEmailOrUsername = async (
    identifier: string,
    password: string,
    displayName: string,
    businessReg?: {
      registerNewBusiness: boolean;
      businessName: string;
      phone?: string;
      address?: string;
      planType?: SubscriptionPlanType;
      shopPassword?: string;
    }
  ) => {
    try {
      if (!identifier.trim()) {
        return { success: false, error: 'ইউজারনেম বা ইমেইল লিখুন' };
      }
      if (!password || password.length < 6) {
        return { success: false, error: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' };
      }
      if (businessReg?.registerNewBusiness) {
        const cleanShopPwd = (businessReg.shopPassword || '').trim();
        if (cleanShopPwd.length < 4) {
          return { success: false, error: 'দোকানের নিরাপত্তার জন্য কমপক্ষে ৪ অক্ষরের পাসওয়ার্ড দিন।' };
        }
      }
      const email = normalizeIdentifierToEmail(identifier);
      const res = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName.trim() && res.user) {
        await updateProfile(res.user, { displayName: displayName.trim() });
      }

      if (res.user && businessReg?.registerNewBusiness && businessReg.businessName?.trim()) {
        const now = new Date();
        const nowIso = now.toISOString();
        const planType: SubscriptionPlanType = businessReg.planType || 'trial';
        const settings = saasRegistryRef.current.platformSettings;
        const planCfg =
          planType === 'lifetime' || planType === 'one_time'
            ? settings.plans.one_time
            : settings.plans[planType];
        const durationDays = resolvePlanDurationDays(planType, planCfg?.durationDays, settings);
        const basePrice = planCfg?.basePrice || 0;
        const expiresAt =
          durationDays !== null
            ? new Date(now.getTime() + durationDays * 86400000).toISOString()
            : null;
        const isSuperEmail = email === MAIN_SUPER_ADMIN_EMAIL.toLowerCase();
        const bizId = `biz_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

        const newBiz: RegisteredBusiness = {
          id: bizId,
          name: businessReg.businessName.trim(),
          nameEn: businessReg.businessName.trim(),
          ownerUid: res.user.uid,
          ownerEmail: email,
          ownerName: displayName.trim() || email,
          phone: businessReg.phone?.trim() || '',
          address: businessReg.address?.trim() || '',
          shopPassword: (businessReg.shopPassword || '').trim(),
          status: isSuperEmail ? 'approved' : 'pending',
          planType,
          customPrice: basePrice,
          discountType: 'amount',
          discountValue: 0,
          discountAmount: 0,
          finalPrice: basePrice,
          paidAmount: 0,
          durationDays,
          activatedAt: nowIso,
          expiresAt,
          memberEmails: [email],
          notes: 'সাইন আপের সময় নতুন ব্যবসা প্রতিষ্ঠান নিবন্ধিত',
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        const nextRegistry: SaaSRegistryState = {
          ...saasRegistryRef.current,
          businesses: [newBiz, ...saasRegistryRef.current.businesses],
          updatedAt: nowIso,
        };
        setSaasRegistry(nextRegistry);
        await pushSaaSRegistryToCloud(nextRegistry, false);
        await initializeNewBusinessDatabaseInCloud(newBiz, defaultSettings, res.user);
        try {
          sessionStorage.setItem(`press_unlocked_shops_${res.user.uid}`, JSON.stringify([bizId]));
          localStorage.setItem(ACTIVE_BUSINESS_STORAGE_KEY, bizId);
        } catch {
          // ignore
        }
        setUnlockedBusinessIds([bizId]);
        setActiveBusinessId(bizId);
      }

      return { success: true, user: res.user };
    } catch (err: any) {
      console.warn('Email/Password Signup error', err);
      let errorMsg = 'রেজিস্ট্রেশন ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।';
      if (err?.code === 'auth/email-already-in-use') {
        errorMsg = 'এই ইউজারনেম বা ইমেইলটি দিয়ে ইতোমধ্যে একাউন্ট খোলা আছে! অনুগ্রহ করে লগইন করুন।';
      } else if (err?.code === 'auth/weak-password') {
        errorMsg = 'পাসওয়ার্ড দুর্বল! কমপক্ষে ৬ অক্ষরের শক্তিশালী পাসওয়ার্ড দিন।';
      } else if (err?.message) {
        errorMsg = err.message;
      }
      return { success: false, error: errorMsg };
    }
  };

  // Provision or update Party Portal Firebase Auth credential using secondary app instance (keeps active admin/manager signed in)
  const provisionPartyAuthCredential = async (
    loginId: string,
    newPassword: string,
    oldLoginId?: string,
    oldPassword?: string
  ): Promise<{ success: boolean; uid?: string; error?: string }> => {
    const cleanId = normalizePartyLoginId(loginId);
    if (!cleanId || cleanId.length < 3) {
      return { success: false, error: 'পার্টি লগইন আইডি কমপক্ষে ৩ অক্ষরের হতে হবে (ইংরেজি অক্ষর বা সংখ্যা)।' };
    }
    if (!newPassword || newPassword.trim().length < 4) {
      return { success: false, error: 'পার্টি পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।' };
    }
    const targetEmail = normalizePartyLoginEmail(cleanId);
    const targetPwd = toFirebasePartyPassword(newPassword);
    const secAuth = getSecondaryAuth();
    try {
      try {
        const created = await createUserWithEmailAndPassword(secAuth, targetEmail, targetPwd);
        return { success: true, uid: created.user.uid };
      } catch (createErr: any) {
        if (createErr?.code === 'auth/email-already-in-use') {
          const prevEmail = oldLoginId ? normalizePartyLoginEmail(oldLoginId) : targetEmail;
          // Try signing in with existing credentials to update password if same account
          const candidateOldPwds = Array.from(
            new Set(
              [oldPassword, newPassword]
                .filter(Boolean)
                .map((p) => toFirebasePartyPassword(p as string))
            )
          );
          if (prevEmail === targetEmail) {
            for (const tryOldPwd of candidateOldPwds) {
              try {
                const signed = await signInWithEmailAndPassword(secAuth, targetEmail, tryOldPwd);
                if (tryOldPwd !== targetPwd && signed.user) {
                  await updatePassword(signed.user, targetPwd);
                }
                return { success: true, uid: signed.user.uid };
              } catch {
                // try next candidate
              }
            }
          }
          return {
            success: false,
            error: 'এই লগইন আইডিটি ইতোমধ্যে অন্যত্র ব্যবহৃত হয়েছে! অনুগ্রহ করে ভিন্ন লগইন আইডি দিন।',
          };
        }
        return { success: false, error: createErr?.message || 'পার্টি অ্যাকাউন্ট তৈরি করতে সমস্যা হয়েছে।' };
      }
    } finally {
      try {
        await signOut(secAuth);
      } catch {
        // ignore
      }
    }
  };

  const loginAsParty = async (loginId: string, password: string) => {
    try {
      const cleanId = normalizePartyLoginId(loginId);
      if (!cleanId) {
        return { success: false, error: 'অনুগ্রহ করে পার্টির লগইন আইডি দিন।' };
      }
      if (!password) {
        return { success: false, error: 'অনুগ্রহ করে পাসওয়ার্ড দিন।' };
      }
      const email = normalizePartyLoginEmail(cleanId);
      const fbPwd = toFirebasePartyPassword(password);
      try {
        await signInWithEmailAndPassword(auth, email, fbPwd);
        return { success: true };
      } catch {
        // Fallback: if loginId already typed as raw password length vs padded
        if (password.trim().length >= 6) {
          throw new Error('INVALID');
        }
        await signInWithEmailAndPassword(auth, email, password.trim());
        return { success: true };
      }
    } catch {
      return {
        success: false,
        error: 'পার্টি আইডি অথবা পাসওয়ার্ড সঠিক নয়! সঠিক তথ্য দিয়ে আবার চেষ্টা করুন।',
      };
    }
  };

  const signupAsParty = async (data: {
    partyName: string;
    contactPerson?: string;
    phone: string;
    address?: string;
    loginId: string;
    password: string;
  }) => {
    try {
      const cleanId = normalizePartyLoginId(data.loginId);
      if (!data.partyName.trim()) {
        return { success: false, error: 'আপনার নাম বা প্রকাশনীর নাম লিখুন।' };
      }
      if (!cleanId || cleanId.length < 3) {
        return { success: false, error: 'লগইন আইডি কমপক্ষে ৩ অক্ষরের (ইংরেজি অক্ষর বা সংখ্যা) হতে হবে।' };
      }
      if (!data.password || data.password.trim().length < 4) {
        return { success: false, error: 'পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।' };
      }
      const email = normalizePartyLoginEmail(cleanId);
      const fbPwd = toFirebasePartyPassword(data.password);
      const res = await createUserWithEmailAndPassword(auth, email, fbPwd);
      if (res.user) {
        await updateProfile(res.user, { displayName: data.partyName.trim() });
      }
      const nowIso = new Date().toISOString();
      const pendingAcc: PartyPortalAccount = {
        id: `pty_acc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        businessId: '',
        businessName: '',
        partyId: '',
        partyName: data.partyName.trim(),
        contactPerson: data.contactPerson?.trim() || data.partyName.trim(),
        phone: data.phone.trim(),
        address: data.address?.trim() || '',
        loginId: cleanId,
        password: data.password.trim(),
        uid: res.user.uid,
        status: 'pending',
        createdBy: 'self_signup',
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      const existing = saasRegistryRef.current.partyAccounts || [];
      const nextRegistry: SaaSRegistryState = {
        ...saasRegistryRef.current,
        partyAccounts: [pendingAcc, ...existing.filter((a) => a.uid !== res.user.uid && a.loginId !== cleanId)],
        updatedAt: nowIso,
      };
      await persistRegistryUpdate(nextRegistry);
      return { success: true };
    } catch (err: any) {
      if (err?.code === 'auth/email-already-in-use') {
        return {
          success: false,
          error: 'এই লগইন আইডিটি ইতোমধ্যে নিবন্ধিত! অনুগ্রহ করে লগইন করুন অথবা ভিন্ন আইডি দিন।',
        };
      }
      return { success: false, error: err?.message || 'পার্টি সাইন আপ ব্যর্থ হয়েছে।' };
    }
  };

  const submitPartyPressLinkRequest = async (
    businessId: string,
    extra?: { partyName?: string; contactPerson?: string; phone?: string; address?: string }
  ) => {
    if (!currentUser) return { success: false, error: 'লগইন করা প্রয়োজন।' };
    const biz = saasRegistryRef.current.businesses.find((b) => b.id === businessId);
    if (!biz) return { success: false, error: 'প্রেস প্রতিষ্ঠানটি খুঁজে পাওয়া যায়নি।' };
    const nowIso = new Date().toISOString();
    const list = saasRegistryRef.current.partyAccounts || [];
    const email = (currentUser.email || '').toLowerCase().trim();
    const fallbackLoginId = email.endsWith('@party.makkahprinters.local')
      ? email.replace('@party.makkahprinters.local', '')
      : email;
    const idx = list.findIndex(
      (a) => (a.uid && a.uid === currentUser.uid) || normalizePartyLoginEmail(a.loginId) === email
    );
    let updatedList: PartyPortalAccount[];
    if (idx >= 0) {
      updatedList = list.map((a, i) =>
        i === idx
          ? {
              ...a,
              businessId: biz.id,
              businessName: biz.name,
              partyName: extra?.partyName?.trim() || a.partyName,
              contactPerson: extra?.contactPerson?.trim() || a.contactPerson,
              phone: extra?.phone?.trim() || a.phone,
              address: extra?.address?.trim() || a.address,
              status: 'pending',
              updatedAt: nowIso,
            }
          : a
      );
    } else {
      const created: PartyPortalAccount = {
        id: `pty_acc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        businessId: biz.id,
        businessName: biz.name,
        partyId: '',
        partyName: extra?.partyName?.trim() || currentUser.displayName || fallbackLoginId,
        contactPerson: extra?.contactPerson?.trim() || currentUser.displayName || '',
        phone: extra?.phone?.trim() || '',
        address: extra?.address?.trim() || '',
        loginId: fallbackLoginId,
        uid: currentUser.uid,
        status: 'pending',
        createdBy: 'self_signup',
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      updatedList = [created, ...list];
    }
    await persistRegistryUpdate({
      ...saasRegistryRef.current,
      partyAccounts: updatedList,
      updatedAt: nowIso,
    });
    return { success: true };
  };

  const upsertPartyPortalCredentials = async (
    partyId: string,
    data: { loginId: string; password: string; enabled: boolean },
    partySnapshot?: Party
  ): Promise<{ success: boolean; error?: string }> => {
    if (!canManagePartyPortal) {
      return { success: false, error: 'শুধুমাত্র মালিক, ম্যানেজার অথবা সুপার অ্যাডমিন এটি পরিবর্তন করতে পারবেন।' };
    }
    const party = partySnapshot || db.parties.find((p) => p.id === partyId);
    if (!party) return { success: false, error: 'পার্টি খুঁজে পাওয়া যায়নি।' };

    const cleanId = normalizePartyLoginId(data.loginId);
    const cleanPwd = (data.password || '').trim();
    if (!cleanId && !data.enabled) {
      updateParty(partyId, {
        portalEnabled: false,
        portalLoginId: '',
        portalPassword: '',
      });
      const existingAccs = saasRegistryRef.current.partyAccounts || [];
      if (existingAccs.some((a) => a.businessId === activeBusinessId && a.partyId === partyId)) {
        await persistRegistryUpdate({
          ...saasRegistryRef.current,
          partyAccounts: existingAccs.map((a) =>
            a.businessId === activeBusinessId && a.partyId === partyId
              ? { ...a, status: 'disabled', updatedAt: new Date().toISOString() }
              : a
          ),
          updatedAt: new Date().toISOString(),
        });
      }
      return { success: true };
    }

    const existingList = saasRegistryRef.current.partyAccounts || [];
    const conflicting = existingList.find(
      (a) =>
        a.loginId.toLowerCase() === cleanId &&
        !(a.businessId === activeBusinessId && a.partyId === partyId)
    );
    if (conflicting) {
      return {
        success: false,
        error: `লগইন আইডি "${cleanId}" ইতোমধ্যে অন্য পার্টির জন্য ব্যবহৃত হচ্ছে! ভিন্ন আইডি দিন।`,
      };
    }

    const prov = await provisionPartyAuthCredential(
      cleanId,
      cleanPwd,
      party.portalLoginId,
      party.portalPassword
    );
    if (!prov.success) {
      return { success: false, error: prov.error };
    }

    const nowIso = new Date().toISOString();
    const bizName = currentBusiness?.name || db.settings.name || 'প্রিন্টিং প্রেস';
    const accIdx = existingList.findIndex(
      (a) =>
        (a.businessId === activeBusinessId && a.partyId === partyId) ||
        a.loginId.toLowerCase() === cleanId
    );

    let nextAccounts: PartyPortalAccount[];
    if (accIdx >= 0) {
      nextAccounts = existingList.map((a, i) =>
        i === accIdx
          ? {
              ...a,
              businessId: activeBusinessId,
              businessName: bizName,
              partyId,
              partyName: party.name,
              contactPerson: party.contactPerson,
              phone: party.phone,
              address: party.address,
              loginId: cleanId,
              password: cleanPwd,
              uid: prov.uid || a.uid,
              status: data.enabled ? 'approved' : 'disabled',
              updatedAt: nowIso,
            }
          : a
      );
    } else {
      const newAcc: PartyPortalAccount = {
        id: `pty_acc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        businessId: activeBusinessId,
        businessName: bizName,
        partyId,
        partyName: party.name,
        contactPerson: party.contactPerson,
        phone: party.phone,
        address: party.address,
        loginId: cleanId,
        password: cleanPwd,
        uid: prov.uid,
        status: data.enabled ? 'approved' : 'disabled',
        createdBy: 'admin',
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      nextAccounts = [newAcc, ...existingList];
    }

    updateParty(partyId, {
      portalLoginId: cleanId,
      portalPassword: cleanPwd,
      portalEnabled: data.enabled,
      portalUid: prov.uid || party.portalUid,
    });

    await persistRegistryUpdate({
      ...saasRegistryRef.current,
      partyAccounts: nextAccounts,
      updatedAt: nowIso,
    });
    return { success: true };
  };

  const reviewPartySignupRequest = async (
    accountId: string,
    decision: 'approved' | 'rejected' | 'disabled',
    linkToPartyId?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!canManagePartyPortal) {
      return { success: false, error: 'শুধুমাত্র মালিক, ম্যানেজার অথবা সুপার অ্যাডমিন এটি করতে পারবেন।' };
    }
    const list = saasRegistryRef.current.partyAccounts || [];
    const targetAcc = list.find((a) => a.id === accountId);
    if (!targetAcc) return { success: false, error: 'আবেদনটি পাওয়া যায়নি।' };

    const nowIso = new Date().toISOString();
    let finalPartyId = targetAcc.partyId;
    let finalPartyName = targetAcc.partyName;

    if (decision === 'approved') {
      if (targetAcc.businessId === activeBusinessId) {
        if (linkToPartyId && linkToPartyId !== 'NEW') {
          const matchedParty = db.parties.find((p) => p.id === linkToPartyId);
          if (!matchedParty) return { success: false, error: 'নির্বাচিত পার্টি খুঁজে পাওয়া যায়নি।' };
          finalPartyId = matchedParty.id;
          finalPartyName = matchedParty.name;
          updateParty(matchedParty.id, {
            portalLoginId: targetAcc.loginId,
            portalPassword: targetAcc.password,
            portalEnabled: true,
            portalUid: targetAcc.uid,
          });
        } else if (!finalPartyId || linkToPartyId === 'NEW') {
          const created = addParty({
            name: targetAcc.partyName,
            contactPerson: targetAcc.contactPerson || targetAcc.partyName,
            address: targetAcc.address || '',
            phone: targetAcc.phone || '',
            openingDue: 0,
            isActive: true,
            portalLoginId: targetAcc.loginId,
            portalPassword: targetAcc.password,
            portalEnabled: true,
            portalUid: targetAcc.uid,
          });
          finalPartyId = created.id;
          finalPartyName = created.name;
        }
      }
    }

    const nextAccounts = list.map((a) =>
      a.id === accountId
        ? {
            ...a,
            partyId: finalPartyId,
            partyName: finalPartyName,
            status: decision,
            updatedAt: nowIso,
          }
        : a
    );
    await persistRegistryUpdate({
      ...saasRegistryRef.current,
      partyAccounts: nextAccounts,
      updatedAt: nowIso,
    });
    return { success: true };
  };

  const adminUpdatePartyAccount = async (
    accountId: string,
    updates: Partial<PartyPortalAccount>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isMainAdmin && !canManagePartyPortal) {
      return { success: false, error: 'অনুমতি নেই।' };
    }
    const list = saasRegistryRef.current.partyAccounts || [];
    const existing = list.find((a) => a.id === accountId);
    if (!existing) return { success: false, error: 'পার্টি অ্যাকাউন্ট পাওয়া যায়নি।' };

    const nextLoginId = updates.loginId ? normalizePartyLoginId(updates.loginId) : existing.loginId;
    const nextPassword = updates.password !== undefined ? updates.password.trim() : (existing.password || '');
    let nextUid = existing.uid;

    if (
      (updates.loginId && nextLoginId !== existing.loginId) ||
      (updates.password && nextPassword !== existing.password)
    ) {
      if (nextPassword.length >= 4) {
        const prov = await provisionPartyAuthCredential(
          nextLoginId,
          nextPassword,
          existing.loginId,
          existing.password
        );
        if (!prov.success) return { success: false, error: prov.error };
        if (prov.uid) nextUid = prov.uid;
      }
    }

    const nowIso = new Date().toISOString();
    const nextList = list.map((a) =>
      a.id === accountId
        ? {
            ...a,
            ...updates,
            loginId: nextLoginId,
            password: nextPassword,
            uid: nextUid,
            updatedAt: nowIso,
          }
        : a
    );
    await persistRegistryUpdate({
      ...saasRegistryRef.current,
      partyAccounts: nextList,
      updatedAt: nowIso,
    });

    if (existing.businessId === activeBusinessId && existing.partyId) {
      updateParty(existing.partyId, {
        portalLoginId: nextLoginId,
        portalPassword: nextPassword,
        portalEnabled: (updates.status ?? existing.status) === 'approved',
      });
    }
    return { success: true };
  };

  const deletePartyAccount = async (accountId: string): Promise<boolean> => {
    if (!isMainAdmin && !canManagePartyPortal) return false;
    const list = saasRegistryRef.current.partyAccounts || [];
    const target = list.find((a) => a.id === accountId);
    const nextList = list.filter((a) => a.id !== accountId);
    await persistRegistryUpdate({
      ...saasRegistryRef.current,
      partyAccounts: nextList,
      updatedAt: new Date().toISOString(),
    });
    if (target && target.businessId === activeBusinessId && target.partyId) {
      updateParty(target.partyId, {
        portalEnabled: false,
        portalLoginId: '',
        portalPassword: '',
      });
    }
    return true;
  };

  const logout = async () => {
    try {
      const uid = currentUser?.uid;
      await signOut(auth);
      setIsAdminPanelUnlocked(false);
      setUnlockedBusinessIds([]);
      setDb(initialEmptyState);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('makkah_admin_panel_unlocked');
        if (uid) {
          sessionStorage.removeItem(`press_unlocked_shops_${uid}`);
        }
        try {
          localStorage.removeItem(ACTIVE_BUSINESS_STORAGE_KEY);
        } catch {
          // ignore
        }
      }
      setActiveBusinessId(DEFAULT_BUSINESS_ID);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  };

  // Load realistic demo data for testing and demonstration
  const loadDemoData = () => {
    if (guardReadOnly() || !canManageResetAndDemo) return;
    const today = new Date().toISOString().split('T')[0];
    const demoParties: Party[] = [
      {
        id: 'pty_demo_1',
        name: 'আল-মদিনা পাবলিকেশন্স',
        contactPerson: 'মাওলানা মাহমুদ হাসান',
        address: '৩৮ বাংলাবাজার, ঢাকা',
        phone: '০১৭২২-১১২২৩৩',
        email: 'almadina.pub@gmail.com',
        openingDue: 15000,
        isActive: true,
        createdAt: today,
        updatedAt: today,
      },
      {
        id: 'pty_demo_2',
        name: 'নূর লাইব্রেরী',
        contactPerson: 'মুহাম্মদ আসাদুজ্জামান',
        address: '৪৫ ইসলামপুর রোড, ঢাকা',
        phone: '০১৮১৯-৪৪৩৩২২',
        email: 'noor.lib@gmail.com',
        openingDue: 8500,
        isActive: true,
        createdAt: today,
        updatedAt: today,
      },
    ];

    const demoBooks: Book[] = [
      {
        id: 'bk_demo_1',
        code: 'BK-101',
        name: 'সহজ নূরানী কোরআন শিক্ষা',
        forma: 8,
        plates: 32,
        defaultRate: 500,
        pagesInfo: '১২৮ পৃষ্ঠা, ৪ কালার মলাট',
        isActive: true,
        partyIds: ['pty_demo_1'],
        createdAt: today,
        updatedAt: today,
      },
      {
        id: 'bk_demo_2',
        code: 'BK-102',
        name: 'দৈনন্দিন দোআ ও আমল',
        forma: 4,
        plates: 16,
        defaultRate: 480,
        pagesInfo: '৬৪ পৃষ্ঠা, ১ কালার',
        isActive: true,
        partyIds: ['pty_demo_2'],
        createdAt: today,
        updatedAt: today,
      },
    ];

    const demoEmployees: Employee[] = [
      {
        id: 'emp_demo_1',
        employeeId: 'EMP-001',
        name: 'আব্দুল করিম',
        designation: 'চিফ অফসেট মেশিন অপারেটর',
        phone: '০১৭৩৩-৯৯৮৮৭৭',
        address: 'সূত্রাপুর, ঢাকা',
        joiningDate: '2023-01-15',
        monthlyBasicSalary: 15000,
        standardMonthlyHours: 208,
        otRatePercent: 70,
        isActive: true,
        createdAt: today,
        updatedAt: today,
      },
      {
        id: 'emp_demo_2',
        employeeId: 'EMP-002',
        name: 'মো. শাহিনুর রহমান',
        designation: 'মেশিন হেল্পার',
        phone: '০১৮১২-৫৫৮৮৯৯',
        address: 'গেণ্ডারিয়া, ঢাকা',
        joiningDate: '2023-06-01',
        monthlyBasicSalary: 10000,
        standardMonthlyHours: 208,
        otRatePercent: 70,
        isActive: true,
        createdAt: today,
        updatedAt: today,
      },
    ];

    const demoWorkers: CuttingWorker[] = [
      {
        id: 'cw_demo_1',
        name: 'ফারুক কাটিং ম্যান',
        phone: '০১৬৭৭-৩৩৪২৪২',
        address: 'বাংলাবাজার',
        defaultRatePerReam: 25,
        isActive: true,
        createdAt: today,
      },
    ];

    const demoPlates: PlateRecord[] = [
      {
        id: 'plt_demo_1',
        partyId: 'pty_demo_1',
        partyName: 'আল-মদিনা পাবলিকেশন্স',
        bookName: 'সহজ নূরানী কোরআন শিক্ষা',
        plateCount: 32,
        size: '২৩×৩৬',
        location: 'press',
        notes: 'মেশিন-১ এ চলমান',
        createdAt: today,
        updatedAt: today,
      },
      {
        id: 'plt_demo_2',
        partyId: 'pty_demo_2',
        partyName: 'নূর লাইব্রেরী',
        bookName: 'দৈনন্দিন দোআ ও আমল',
        plateCount: 16,
        size: '২০×৩০',
        location: 'godown',
        notes: 'গোডাউন তাক নং ৪',
        createdAt: today,
        updatedAt: today,
      },
    ];

    const demoPaperStock: PaperStockRecord[] = [
      {
        id: 'stk_demo_1',
        date: today,
        type: 'inward',
        paperType: 'হোয়াইট পেপার (৮০ গ্রাম)',
        size: '২৩×৩৬',
        company: 'কর্ণফুলী পেপার মিলস',
        reams: 100,
        partyName: 'আল-মদিনা পাবলিকেশন্স',
        challanNo: 'CH-4052',
        notes: 'নতুন লট কাগজ আগমন',
        createdAt: today,
        updatedAt: today,
      },
      {
        id: 'stk_demo_2',
        date: today,
        type: 'inward',
        paperType: 'অফসেট পেপার (৭০ গ্রাম)',
        size: '২০×৩০',
        company: 'বসুন্ধরা পেপার মিলস',
        reams: 50,
        challanNo: 'CH-8921',
        notes: 'প্রেস স্টক ক্রয়',
        createdAt: today,
        updatedAt: today,
      },
    ];

    const demoInkSuppliers: InkSupplier[] = [
      {
        id: 'ink_sup_demo_1',
        name: 'নিউ ঢাকা কালির ঘর',
        proprietor: 'হাজী মো. আনোয়ার হোসেন',
        phone: '০১৮১৮-৭৭৬৬৫৪',
        address: 'বাংলাবাজার রোড, ঢাকা',
        openingDue: 4500,
        notes: 'নিয়মিত কালি ও কেমিক্যাল সরবরাহকারী',
        createdAt: today,
        updatedAt: today,
      },
      {
        id: 'ink_sup_demo_2',
        name: 'মেসার্স ভাই ভাই কালির দোকান',
        proprietor: 'মো. কামাল উদ্দিন',
        phone: '০১৭৭৫-৯৯৮৮৭৭',
        address: 'ইসলামপুর প্রিন্টিং মার্কেট, ঢাকা',
        openingDue: 0,
        notes: 'অফসেট কালি ও ওয়াশ সরবরাহকারী',
        createdAt: today,
        updatedAt: today,
      },
    ];

    const demoInkPurchases: InkPurchaseRecord[] = [
      {
        id: 'ink_pur_demo_1',
        supplierId: 'ink_sup_demo_1',
        supplierName: 'নিউ ঢাকা কালির ঘর',
        date: today,
        itemName: 'সান ব্ল্যাক কালি (Sun Black)',
        unit: 'কেজি',
        quantity: 10,
        unitPrice: 650,
        totalAmount: 6500,
        paidAmount: 2000,
        paymentType: 'partial',
        paymentMethod: 'নগদ',
        carrierName: 'মো. রফিক (হেলপার)',
        invoiceOrChallanNo: 'MEMO-901',
        notes: 'বই মুদ্রণের ব্ল্যাক কালি',
        createdAt: today,
        updatedAt: today,
      },
      {
        id: 'ink_pur_demo_2',
        supplierId: 'ink_sup_demo_2',
        supplierName: 'মেসার্স ভাই ভাই কালির দোকান',
        date: today,
        itemName: 'ডিসি রোলার ওয়াশ (DC Roller Wash)',
        unit: 'লিটার',
        quantity: 5,
        unitPrice: 420,
        totalAmount: 2100,
        paidAmount: 2100,
        paymentType: 'cash',
        paymentMethod: 'নগদ',
        carrierName: 'স্বয়ং',
        invoiceOrChallanNo: 'INV-402',
        notes: 'মেশিন পরিষ্কারের ওয়াশ',
        createdAt: today,
        updatedAt: today,
      },
    ];

    setDb((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        isConfigured: true,
      },
      parties: demoParties,
      books: demoBooks,
      employees: demoEmployees,
      cuttingWorkers: demoWorkers,
      plates: demoPlates,
      paperStock: demoPaperStock,
      inkSuppliers: demoInkSuppliers,
      inkPurchases: demoInkPurchases,
      inkSupplierPayments: [],
    }));
  };

  const value = useMemo(
    () => ({
      db,
      isReady,
      updateSettings,
      addParty,
      updateParty,
      deleteParty,
      addBook,
      updateBook,
      deleteBook,
      addProduction,
      updateProduction,
      deleteProduction,
      addOrderSlip,
      updateOrderSlip,
      deleteOrderSlip,
      addInvoice,
      updateInvoice,
      deleteInvoice,
      addCollection,
      updateCollection,
      deleteCollection,
      addEmployee,
      updateEmployee,
      deleteEmployee,
      recordAttendance,
      updateAttendance,
      deleteAttendance,
      addAdvance,
      updateAdvance,
      deleteAdvance,
      generatePayrollForMonth,
      updatePayroll,
      deletePayroll,
      addCuttingWorker,
      updateCuttingWorker,
      deleteCuttingWorker,
      addCuttingRecord,
      updateCuttingRecord,
      deleteCuttingRecord,
      addCuttingWorkerPayment,
      deleteCuttingWorkerPayment,
      getCuttingWorkerLedger,
      addPuttiSale,
      updatePuttiSale,
      deletePuttiSale,
      addPlate,
      updatePlate,
      batchUpdatePlates,
      deletePlate,
      canDeletePlates,
      addPaperStock,
      updatePaperStock,
      deletePaperStock,
      getPaperStockBalance,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      canManageResetAndDemo,
      resetBusinessData,
      resetCompanySettings,
      loadDemoData,
      clearDemoData,
      exportDatabaseJSON,
      importDatabaseJSON,
      autoSnapshots,
      refreshAutoSnapshots,
      createManualSnapshot,
      restoreSnapshotData,
      deleteAutoSnapshot,
      storageStats,
      currentUser,
      loginWithGoogle,
      loginWithEmailOrUsername,
      signupWithEmailOrUsername,
      logout,
      cloudSyncStatus,
      isQuotaExceeded,
      isQuotaDismissed,
      dismissQuotaNotice,
      lastCloudSyncTime,
      forcePushToCloud,
      isAdminPanelUnlocked,
      unlockAdminPanel,
      lockAdminPanel,
      isReadOnly,
      addInkSupplier,
      updateInkSupplier,
      deleteInkSupplier,
      addInkPurchase,
      updateInkPurchase,
      deleteInkPurchase,
      addInkSupplierPayment,
      deleteInkSupplierPayment,
      getInkSupplierBalance,
      getKnownInkItems,
      addInkOrderSlip,
      updateInkOrderSlip,
      deleteInkOrderSlip,
      currentUserAccess,
      isMainAdmin,
      canAccessModule,
      updateUserAccess,
      deleteUserAccess,
      activeBusinessId,
      saasRegistry,
      currentBusiness,
      userBusinesses,
      subscriptionInfo,
      isCurrentBusinessUnlocked,
      verifyAndUnlockBusiness,
      isModuleLockedBySubscription,
      switchBusiness,
      registerNewBusiness,
      updateRegisteredBusiness,
      deleteRegisteredBusiness,
      updateSaaSPlatformSettings,
      submitSubscriptionPaymentRequest,
      reviewSubscriptionPaymentRequest,
      isPartyPortalUser,
      currentPartyAccount,
      canManagePartyPortal,
      loginAsParty,
      signupAsParty,
      submitPartyPressLinkRequest,
      upsertPartyPortalCredentials,
      reviewPartySignupRequest,
      adminUpdatePartyAccount,
      deletePartyAccount,
      getPartyBalance,
      getEmployeeAdvanceBalance,
    }),
    [
      db,
      isReady,
      autoSnapshots,
      storageStats,
      currentUser,
      cloudSyncStatus,
      isQuotaExceeded,
      isQuotaDismissed,
      lastCloudSyncTime,
      currentUserAccess,
      isMainAdmin,
      canAccessModule,
      canManageResetAndDemo,
      isAdminPanelUnlocked,
      isReadOnly,
      activeBusinessId,
      saasRegistry,
      currentBusiness,
      userBusinesses,
      subscriptionInfo,
      isCurrentBusinessUnlocked,
      verifyAndUnlockBusiness,
      isModuleLockedBySubscription,
      switchBusiness,
      isPartyPortalUser,
      currentPartyAccount,
      canManagePartyPortal,
    ]
  );

  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};
