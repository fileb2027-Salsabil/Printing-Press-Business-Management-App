import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db as firestoreDb, User } from '../firebase';
import {
  DatabaseState,
  SaaSRegistryState,
  SaaSPlatformSettings,
  RegisteredBusiness,
} from '../types';
import {
  handleFirestoreError,
  OperationType,
  isQuotaExhaustedError,
  isPermissionDeniedError,
} from './firestoreError';

export const DEFAULT_BUSINESS_ID = 'makkah_printers_shared';
export const SAAS_REGISTRY_DOC_ID = 'saas_platform_registry';

export const DEFAULT_PLATFORM_SETTINGS: SaaSPlatformSettings = {
  defaultTrialDays: 14,
  plans: {
    trial: {
      planType: 'trial',
      labelBn: 'ফ্রি ট্রায়াল (Free Trial)',
      durationDays: 14,
      basePrice: 0,
      descriptionBn: 'নতুন প্রেসের জন্য সীমিত দিনের ফ্রি ট্রায়াল',
    },
    monthly: {
      planType: 'monthly',
      labelBn: 'মাসিক প্যাকেজ (Monthly)',
      durationDays: 30,
      basePrice: 500,
      descriptionBn: 'প্রতি মাসে নবায়নযোগ্য সম্পূর্ণ প্রিন্টিং প্রেস সমাধান',
    },
    yearly: {
      planType: 'yearly',
      labelBn: 'বাৎসরিক প্যাকেজ (Yearly)',
      durationDays: 365,
      basePrice: 5000,
      descriptionBn: 'সারা বছরের সাশ্রয়ী পূর্ণাঙ্গ প্রেস হিসাব প্যাকেজ',
    },
    one_time: {
      planType: 'one_time',
      labelBn: 'এককালীন / আজীবন (Lifetime)',
      durationDays: null,
      basePrice: 15000,
      descriptionBn: 'একবার পেমেন্টে আজীবনের জন্য সকল পেইড ফিচার আনলক',
    },
  },
  freeModules: ['dashboard', 'parties', 'books', 'production', 'attendance'],
  paidModules: [
    'plates',
    'paperStock',
    'billing',
    'collections',
    'incomeExpense',
    'inkSuppliers',
    'employees',
    'combinedAttendance',
    'payroll',
    'cutting',
    'putti',
    'reports',
    'dataMgmt',
  ],
  supportPhone: '',
  supportEmail: 'fileb2027@gmail.com',
  paymentInstructions: 'নিচের যেকোনো পেমেন্ট মাধ্যমে ফি পাঠিয়ে ট্রানজেকশন আইডি (TrxID) সহ জমা দিন অথবা মেইন এডমিনের সাথে যোগাযোগ করুন।',
  paymentMethods: [
    {
      id: 'pm_bkash',
      name: 'বিকাশ (bKash)',
      accountType: 'পার্সোনাল / Send Money',
      accountNumber: '',
      instructions: 'Send Money করে নিচে ট্রানজেকশন আইডি (TrxID) ও প্রেরকের নম্বর দিন',
      enabled: true,
    },
    {
      id: 'pm_nagad',
      name: 'নগদ (Nagad)',
      accountType: 'পার্সোনাল / Send Money',
      accountNumber: '',
      instructions: 'Send Money করে নিচে ট্রানজেকশন আইডি (TrxID) ও প্রেরকের নম্বর দিন',
      enabled: true,
    },
    {
      id: 'pm_rocket',
      name: 'রকেট / ব্যাংক ট্রান্সফার',
      accountType: 'ব্যাংক / মোবাইল ব্যাংকিং',
      accountNumber: '',
      instructions: 'পেমেন্ট রেফারেন্স বা ট্রানজেকশন আইডি প্রদান করুন',
      enabled: false,
    },
  ],
  updatedAt: new Date().toISOString(),
};

export function createDefaultSaaSRegistry(defaultShopName: string = 'মক্কা প্রিন্টার্স'): SaaSRegistryState {
  const now = new Date().toISOString();
  const flagship: RegisteredBusiness = {
    id: DEFAULT_BUSINESS_ID,
    name: defaultShopName,
    nameEn: 'Makkah Printers',
    ownerUid: 'main_admin',
    ownerEmail: 'fileb2027@gmail.com',
    ownerName: 'মেইন এডমিন (MD. Salsabil)',
    phone: '',
    address: '',
    status: 'approved',
    planType: 'lifetime',
    customPrice: 0,
    discountType: 'amount',
    discountValue: 0,
    discountAmount: 0,
    finalPrice: 0,
    paidAmount: 0,
    durationDays: null,
    activatedAt: now,
    expiresAt: null,
    memberEmails: ['fileb2027@gmail.com'],
    notes: 'প্রধান / ফ্ল্যাগশিপ প্রেস অ্যাকাউন্ট',
    createdAt: now,
    updatedAt: now,
  };
  return {
    platformSettings: DEFAULT_PLATFORM_SETTINGS,
    businesses: [flagship],
    paymentRequests: [],
    partyAccounts: [],
    staffAccounts: [],
    updatedAt: now,
  };
}

// Per-business in-memory cache to prevent redundant writes and unnecessary cloud quota drain
const businessPushCache = new Map<
  string,
  { jsonStr: string; updatedAt: string; chunkCount: number; chunks?: string[] }
>();

let lastPushedRegistryJson = '';
let lastPushedRegistryAt = '';

// Write serialization lock to prevent overlapping chunk writes/deletes
let activePushPromise: Promise<{
  success: boolean;
  updatedAt?: string;
  error?: string;
  isQuotaExhausted?: boolean;
}> | null = null;

const QUOTA_KEY = 'firestore_quota_exhausted_until';

export function isCloudQuotaExhausted(): boolean {
  try {
    const val = typeof localStorage !== 'undefined' ? localStorage.getItem(QUOTA_KEY) : null;
    if (!val) return false;
    const expiry = Number(val);
    if (Date.now() < expiry) {
      return true;
    } else {
      localStorage.removeItem(QUOTA_KEY);
      return false;
    }
  } catch {
    return false;
  }
}

export function clearCloudSyncSessionCache() {
  businessPushCache.clear();
  lastPushedRegistryJson = '';
  lastPushedRegistryAt = '';
}

export function markCloudQuotaExhausted(hours: number = 0.5) {
  try {
    const expiry = Date.now() + hours * 60 * 60 * 1000;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(QUOTA_KEY, expiry.toString());
    }
  } catch {
    // ignore storage issues
  }
}

export function resetQuotaExhaustedState() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(QUOTA_KEY);
    }
  } catch {
    // ignore storage issues
  }
}

export function getIsSessionQuotaExhausted(): boolean {
  return isCloudQuotaExhausted();
}

export function isLastPushedTimestamp(
  updatedAt?: string,
  businessId: string = DEFAULT_BUSINESS_ID
): boolean {
  const entry = businessPushCache.get(businessId);
  return Boolean(updatedAt && entry?.updatedAt && updatedAt === entry.updatedAt);
}

export function isLastPushedRegistryTimestamp(updatedAt?: string): boolean {
  return Boolean(updatedAt && lastPushedRegistryAt && updatedAt === lastPushedRegistryAt);
}

// Firestore document maximum limit is 1,048,576 bytes (1 MiB).
// We use 380,000 characters per chunk (~380 KB), guaranteeing every single
// chunk is safely under 40% of the limit regardless of UTF-8 byte expansion.
const CHUNK_SIZE = 380000;

export interface CloudManifest {
  updatedAt: string;
  updatedBy: string;
  chunkCount: number;
  totalBytes: number;
  version: number;
  data?: string; // Legacy fallback
}

async function executePushDatabaseToCloud(
  dbState: DatabaseState,
  currentUser: User,
  force: boolean = false,
  businessId: string = DEFAULT_BUSINESS_ID
): Promise<{ success: boolean; updatedAt?: string; error?: string; isQuotaExhausted?: boolean }> {
  const docPath = `businesses/${businessId}`;

  if (!force && isCloudQuotaExhausted()) {
    return {
      success: false,
      isQuotaExhausted: true,
      error: 'দৈনিক ফ্রি ক্লাউড রাইট কোটা সীমা অতিক্রম করেছে।',
    };
  }

  const hasAnyRecords =
    (dbState.parties?.length || 0) > 0 ||
    (dbState.books?.length || 0) > 0 ||
    (dbState.productions?.length || 0) > 0 ||
    (dbState.invoices?.length || 0) > 0 ||
    (dbState.collections?.length || 0) > 0 ||
    (dbState.employees?.length || 0) > 0 ||
    (dbState.transactions?.length || 0) > 0 ||
    (dbState.plates?.length || 0) > 0 ||
    (dbState.paperStock?.length || 0) > 0 ||
    (dbState.inkSuppliers?.length || 0) > 0 ||
    (dbState.orderSlips?.length || 0) > 0 ||
    (dbState.inkOrderSlips?.length || 0) > 0;

  if (!force && !dbState.settings?.isConfigured && !hasAnyRecords) {
    return {
      success: false,
      error: 'অপ্রস্তুত ফাঁকা স্টেট ক্লাউডে ওভাররাইট করা হয়নি।',
    };
  }

  try {
    const jsonStr = JSON.stringify(dbState);
    const existingCache = businessPushCache.get(businessId);

    // If identical to last pushed version, skip write to save daily quota
    if (!force && existingCache && jsonStr === existingCache.jsonStr) {
      return {
        success: true,
        updatedAt: existingCache.updatedAt || new Date().toISOString(),
      };
    }

    const totalBytes = jsonStr.length;
    const chunkCount = Math.ceil(totalBytes / CHUNK_SIZE);
    const now = new Date().toISOString();
    const updatedBy = currentUser.email || currentUser.uid;
    const prevChunkCount = existingCache?.chunkCount || 0;
    const prevChunks = existingCache?.chunks;

    // 1. Slice into deterministic chunks and only write chunks that actually changed
    const chunksList: string[] = [];
    const chunkPromises: Promise<void>[] = [];
    for (let i = 0; i < chunkCount; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalBytes);
      const chunkContent = jsonStr.slice(start, end);
      chunksList.push(chunkContent);

      if (!force && prevChunks && prevChunks[i] === chunkContent) {
        continue;
      }

      const chunkDocRef = doc(firestoreDb, 'businesses', businessId, 'chunks', `chunk_${i}`);
      chunkPromises.push(
        setDoc(chunkDocRef, {
          index: i,
          content: chunkContent,
          updatedAt: now,
        })
      );
    }

    if (!force && chunkPromises.length === 0 && prevChunkCount === chunkCount) {
      return {
        success: true,
        updatedAt: existingCache?.updatedAt || now,
      };
    }

    if (chunkPromises.length > 0) {
      await Promise.all(chunkPromises);
    }

    // 2. Clean up previous extra chunks if chunk count decreased
    if (prevChunkCount > chunkCount) {
      const cleanupPromises: Promise<void>[] = [];
      for (let extra = chunkCount; extra < prevChunkCount; extra++) {
        const extraDocRef = doc(
          firestoreDb,
          'businesses',
          businessId,
          'chunks',
          `chunk_${extra}`
        );
        cleanupPromises.push(deleteDoc(extraDocRef).catch(() => {}));
      }
      await Promise.all(cleanupPromises);
    }

    // 3. Record timestamp before root manifest write so self-echo snapshot is ignored
    businessPushCache.set(businessId, {
      jsonStr,
      updatedAt: now,
      chunkCount,
      chunks: chunksList,
    });

    // 4. Update root document with manifest metadata
    const rootDocRef = doc(firestoreDb, 'businesses', businessId);
    await setDoc(rootDocRef, {
      updatedAt: now,
      updatedBy,
      chunkCount,
      totalBytes,
      version: 2,
    });

    if (isCloudQuotaExhausted()) {
      resetQuotaExhaustedState();
    }

    return { success: true, updatedAt: now };
  } catch (err: any) {
    if (isQuotaExhaustedError(err)) {
      markCloudQuotaExhausted(12);
      handleFirestoreError(err, OperationType.WRITE, docPath);
      return {
        success: false,
        isQuotaExhausted: true,
        error: 'ফায়ারবেস ক্লাউড স্টোরেজের দৈনিক ফ্রি রাইট কোটা সীমা অতিক্রম করেছে।',
      };
    }
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.WRITE, docPath);
    }
    console.warn('Cloud push error (offline/local backup remains intact):', err);
    return { success: false, error: err?.message || 'ক্লাউড সিঙ্ক ব্যর্থ হয়েছে' };
  }
}

/**
 * Serialized push of database state for a specific business to Firestore
 */
export async function pushDatabaseToCloud(
  dbState: DatabaseState,
  currentUser: User,
  force: boolean = false,
  businessId: string = DEFAULT_BUSINESS_ID
): Promise<{ success: boolean; updatedAt?: string; error?: string; isQuotaExhausted?: boolean }> {
  const prev = activePushPromise;
  const run = async () => {
    if (prev) {
      await prev.catch(() => {});
    }
    return executePushDatabaseToCloud(dbState, currentUser, force, businessId);
  };
  const nextPromise = run();
  activePushPromise = nextPromise;
  try {
    return await nextPromise;
  } finally {
    if (activePushPromise === nextPromise) {
      activePushPromise = null;
    }
  }
}

/**
 * Reassembles database state from Firestore chunks or legacy data for a given businessId.
 */
export async function fetchDatabaseFromCloud(
  manifestData: any,
  businessId: string = DEFAULT_BUSINESS_ID
): Promise<DatabaseState | null> {
  const docPath = `businesses/${businessId}`;
  try {
    if (!manifestData) return null;

    // A. Multi-chunk structure (version 2)
    if (manifestData.chunkCount && manifestData.chunkCount > 0) {
      const chunkCount: number = manifestData.chunkCount;
      const chunkPromises = Array.from({ length: chunkCount }, (_, i) => {
        const chunkDocRef = doc(firestoreDb, 'businesses', businessId, 'chunks', `chunk_${i}`);
        return getDoc(chunkDocRef);
      });

      const chunkDocs = await Promise.all(chunkPromises);
      const parts: string[] = [];

      for (let i = 0; i < chunkDocs.length; i++) {
        const snap = chunkDocs[i];
        if (snap.exists()) {
          const data = snap.data();
          parts.push(data?.content || '');
        } else {
          console.warn(`Missing cloud chunk ${i} for ${businessId}`);
          return null;
        }
      }

      const fullJson = parts.join('');
      if (!fullJson) return null;
      const fetchedChunks: string[] = [];
      for (let i = 0; i < fullJson.length; i += CHUNK_SIZE) {
        fetchedChunks.push(fullJson.slice(i, i + CHUNK_SIZE));
      }
      businessPushCache.set(businessId, {
        jsonStr: fullJson,
        updatedAt: manifestData.updatedAt || '',
        chunkCount,
        chunks: fetchedChunks,
      });
      return JSON.parse(fullJson) as DatabaseState;
    }

    // B. Legacy single-document payload
    if (manifestData.data) {
      businessPushCache.set(businessId, {
        jsonStr: manifestData.data,
        updatedAt: manifestData.updatedAt || '',
        chunkCount: 0,
      });
      return JSON.parse(manifestData.data) as DatabaseState;
    }

    return null;
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      markCloudQuotaExhausted(12);
      return null;
    }
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.GET, docPath);
    }
    console.warn('Cloud fetch error:', err);
    return null;
  }
}

/**
 * Sync Master SaaS Platform Registry (Registered Businesses, Free Trial Days, Plans & Discounts)
 */
export async function fetchSaaSRegistryOnce(): Promise<SaaSRegistryState | null> {
  const docPath = `businesses/${SAAS_REGISTRY_DOC_ID}`;
  try {
    const regRef = doc(firestoreDb, 'businesses', SAAS_REGISTRY_DOC_ID);
    const snap = await getDoc(regRef);
    if (snap.exists()) {
      return snap.data() as SaaSRegistryState;
    }
    return null;
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.GET, docPath);
    }
    console.warn('fetchSaaSRegistryOnce warning:', err);
    return null;
  }
}

export async function pushSaaSRegistryToCloud(
  registry: SaaSRegistryState,
  force: boolean = false
): Promise<boolean> {
  if (!force && isCloudQuotaExhausted()) return false;

  const docPath = `businesses/${SAAS_REGISTRY_DOC_ID}`;
  try {
    const jsonStr = JSON.stringify(registry);
    if (!force && jsonStr === lastPushedRegistryJson) {
      return true;
    }
    const now = new Date().toISOString();
    lastPushedRegistryAt = now;
    lastPushedRegistryJson = jsonStr;

    const regRef = doc(firestoreDb, 'businesses', SAAS_REGISTRY_DOC_ID);
    await setDoc(regRef, {
      ...registry,
      updatedAt: now,
    });
    if (isCloudQuotaExhausted()) {
      resetQuotaExhaustedState();
    }
    return true;
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      markCloudQuotaExhausted(0.5);
      return false;
    }
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.WRITE, docPath);
    }
    console.warn('Failed to push SaaS registry:', err);
    return false;
  }
}

/**
 * Initialize a brand-new isolated business database in Firestore
 */
export async function initializeNewBusinessDatabaseInCloud(
  business: RegisteredBusiness,
  initialSettings: any,
  currentUser: User
): Promise<boolean> {
  const now = new Date().toISOString();
  const initialBizState: DatabaseState = {
    settings: {
      ...initialSettings,
      name: business.name,
      nameEn: business.nameEn || business.name,
      address: business.address || '',
      phone: business.phone || '',
      email: business.ownerEmail,
      adminEmail: business.ownerEmail,
      isConfigured: true,
    },
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
    userAccessList: [
      {
        uid: currentUser.uid,
        email: business.ownerEmail,
        displayName: business.ownerName || business.name,
        status: 'approved',
        role: 'admin',
        businessId: business.id,
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
          userAccess: false,
        },
        requestedAt: now,
        approvedAt: now,
        approvedBy: 'system',
      },
    ],
  };
  const res = await pushDatabaseToCloud(initialBizState, currentUser, false, business.id);
  return res.success;
}
