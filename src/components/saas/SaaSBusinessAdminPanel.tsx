import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import {
  AppPermissionModule,
  AppUserAccess,
  BusinessApprovalStatus,
  PaymentMethodConfig,
  PartyPortalAccount,
  RegisteredBusiness,
  SaaSPlatformSettings,
  SubscriptionPlanType,
} from '../../types';
import { formatDate } from '../../utils/calculations';
import { DEFAULT_BUSINESS_ID } from '../../utils/cloudSync';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  Crown,
  Edit2,
  Eye,
  EyeOff,
  Gift,
  KeyRound,
  Lock,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  UserCheck,
  Users,
  UserX,
  X,
  XCircle,
  Save,
  Wrench,
  UserPlus,
} from 'lucide-react';

interface SaaSBusinessAdminPanelProps {
  onNavigate?: (tab: string) => void;
}

const ALL_CONFIGURABLE_MODULES: { key: AppPermissionModule; label: string; category: string }[] = [
  { key: 'dashboard', label: 'ড্যাশবোর্ড', category: 'সাধারণ' },
  { key: 'parties', label: 'পার্টি খাতা', category: 'ব্যবসায়িক' },
  { key: 'books', label: 'বই ব্যবস্থাপনা', category: 'প্রোডাকশন' },
  { key: 'production', label: 'ছাপা ও প্রোডাকশন', category: 'প্রোডাকশন' },
  { key: 'plates', label: 'প্লেট রেজিস্টার', category: 'প্রোডাকশন' },
  { key: 'paperStock', label: 'কাগজ স্টক', category: 'ইনভেন্টরি' },
  { key: 'billing', label: 'বিল ও চালান', category: 'হিসাব' },
  { key: 'collections', label: 'তাগাদা ও কালেকশন', category: 'হিসাব' },
  { key: 'incomeExpense', label: 'দৈনিক আয়-ব্যয় (ক্যাশ বুক)', category: 'হিসাব' },
  { key: 'inkSuppliers', label: 'কালির দোকান ও মালামাল', category: 'ইনভেন্টরি' },
  { key: 'employees', label: 'কর্মচারী ব্যবস্থাপনা', category: 'এইচআর' },
  { key: 'attendance', label: 'দৈনিক হাজিরা খাতা', category: 'এইচআর' },
  { key: 'combinedAttendance', label: 'সম্মিলিত হাজিরা রিপোর্ট', category: 'এইচআর' },
  { key: 'payroll', label: 'বেতন বিল ও পে-রোল', category: 'এইচআর' },
  { key: 'cutting', label: 'কাটিং ও ফিনিশিং খাতা', category: 'প্রোডাকশন' },
  { key: 'putti', label: 'পুট্টি / ছাঁট কাগজ বিক্রয়', category: 'ব্যবসায়িক' },
  { key: 'reports', label: 'রিপোর্ট ও বিশ্লেষণ', category: 'হিসাব' },
  { key: 'dataMgmt', label: 'ডাটা ব্যাকআপ ও রিস্টোর', category: 'সিস্টেম' },
];

export const SaaSBusinessAdminPanel: React.FC<SaaSBusinessAdminPanelProps> = ({ onNavigate }) => {
  const {
    db,
    saasRegistry,
    activeBusinessId,
    switchBusiness,
    registerNewBusiness,
    updateRegisteredBusiness,
    deleteRegisteredBusiness,
    updateSaaSPlatformSettings,
    reviewSubscriptionPaymentRequest,
    adminUpdatePartyAccount,
    deletePartyAccount,
    provisionStaffUser,
    updateUserAccess,
    deleteUserAccess,
    setMyLoginPassword,
    currentUser,
  } = useDatabase();

  const [subTab, setSubTab] = useState<'businesses' | 'packages' | 'staff-accounts' | 'party-accounts'>('businesses');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'expired' | 'suspended'>('all');

  // Staff Accounts Admin Control State
  const [staffSearch, setStaffSearch] = useState('');
  const [staffBizFilter, setStaffBizFilter] = useState('all');
  const [staffStatusFilter, setStaffStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [editingStaffTarget, setEditingStaffTarget] = useState<AppUserAccess | null>(null);
  const [staffStatusField, setStaffStatusField] = useState<AppUserAccess['status']>('approved');
  const [deleteStaffTarget, setDeleteStaffTarget] = useState<AppUserAccess | null>(null);

  // Party Portal Admin Control State
  const [partySearch, setPartySearch] = useState('');
  const [partyBizFilter, setPartyBizFilter] = useState('all');
  const [editingPartyAcc, setEditingPartyAcc] = useState<PartyPortalAccount | null>(null);
  const [editPartyLoginId, setEditPartyLoginId] = useState('');
  const [editPartyPwd, setEditPartyPwd] = useState('');
  const [showEditPartyPwd, setShowEditPartyPwd] = useState(false);
  const [editPartyStatus, setEditPartyStatus] = useState<PartyPortalAccount['status']>('approved');
  const [editPartyBizId, setEditPartyBizId] = useState('');
  const [editPartyAccError, setEditPartyAccError] = useState('');
  const [savingPartyAcc, setSavingPartyAcc] = useState(false);
  const [deletePartyAccTarget, setDeletePartyAccTarget] = useState<PartyPortalAccount | null>(null);
  const [visiblePwdMap, setVisiblePwdMap] = useState<Record<string, boolean>>({});

  // Edit Business Modal State
  const [editingBiz, setEditingBiz] = useState<RegisteredBusiness | null>(null);
  const [editStatus, setEditStatus] = useState<BusinessApprovalStatus>('approved');
  const [editPlan, setEditPlan] = useState<SubscriptionPlanType>('trial');
  const [editCustomPrice, setEditCustomPrice] = useState<number>(0);
  const [editDiscountType, setEditDiscountType] = useState<'amount' | 'percent'>('amount');
  const [editDiscountValue, setEditDiscountValue] = useState<number>(0);
  const [editPaid, setEditPaid] = useState<number>(0);
  const [editRenewDays, setEditRenewDays] = useState<string>('');
  const [editShopPassword, setEditShopPassword] = useState<string>('');
  const [showEditShopPwd, setShowEditShopPwd] = useState<boolean>(false);
  const [editNotes, setEditNotes] = useState<string>('');
  const [savingBiz, setSavingBiz] = useState(false);

  // Add Business Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newPlan, setNewPlan] = useState<SubscriptionPlanType>('trial');
  const [newShopPassword, setNewShopPassword] = useState('');
  const [addBizError, setAddBizError] = useState('');
  const [addingBiz, setAddingBiz] = useState(false);

  // Confirm Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState<RegisteredBusiness | null>(null);

  // Platform Settings State
  const [platformForm, setPlatformForm] = useState<SaaSPlatformSettings>(saasRegistry.platformSettings);
  const [savedNotice, setSavedNotice] = useState('');
  const [reviewingReqId, setReviewingReqId] = useState<string | null>(null);

  // Super Admin Own Password Modal State
  const [isMyPwdModalOpen, setIsMyPwdModalOpen] = useState(false);
  const [myNewPwd, setMyNewPwd] = useState('');
  const [myConfirmPwd, setMyConfirmPwd] = useState('');
  const [showMyPwd, setShowMyPwd] = useState(false);
  const [myPwdError, setMyPwdError] = useState('');
  const [savingMyPwd, setSavingMyPwd] = useState(false);

  // Super Admin Staff User Provisioning Modal State
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffBizId, setStaffBizId] = useState(activeBusinessId);
  const [staffName, setStaffName] = useState('');
  const [staffIdentifier, setStaffIdentifier] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [showStaffPwd, setShowStaffPwd] = useState(false);
  const [staffRole, setStaffRole] = useState<
    'super_admin' | 'admin' | 'manager' | 'accountant' | 'operator' | 'viewer' | 'custom'
  >('manager');
  const [staffReadOnly, setStaffReadOnly] = useState(false);
  const [staffPerms, setStaffPerms] = useState<Record<AppPermissionModule, boolean>>({
    dashboard: true,
    parties: true,
    books: true,
    production: true,
    plates: true,
    paperStock: true,
    billing: true,
    collections: true,
    incomeExpense: false,
    inkSuppliers: true,
    employees: true,
    attendance: true,
    combinedAttendance: true,
    payroll: false,
    cutting: true,
    putti: true,
    reports: true,
    dataMgmt: false,
    settings: false,
    userAccess: false,
  });
  const [staffError, setStaffError] = useState('');
  const [savingStaff, setSavingStaff] = useState(false);

  const applyStaffRolePreset = (
    role: 'super_admin' | 'admin' | 'manager' | 'accountant' | 'operator' | 'viewer' | 'custom'
  ) => {
    setStaffRole(role);
    if (role === 'viewer') {
      setStaffReadOnly(true);
      setStaffPerms({
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
        dataMgmt: false,
        settings: false,
        userAccess: false,
      });
    } else if (role === 'super_admin' || role === 'admin') {
      setStaffReadOnly(false);
      const allTrue: any = { settings: true, userAccess: role === 'super_admin' };
      ALL_CONFIGURABLE_MODULES.forEach((m) => (allTrue[m.key] = true));
      setStaffPerms(allTrue);
    } else if (role === 'manager') {
      setStaffReadOnly(false);
      setStaffPerms({
        dashboard: true,
        parties: true,
        books: true,
        production: true,
        plates: true,
        paperStock: true,
        billing: true,
        collections: true,
        incomeExpense: false,
        inkSuppliers: true,
        employees: true,
        attendance: true,
        combinedAttendance: true,
        payroll: false,
        cutting: true,
        putti: true,
        reports: true,
        dataMgmt: false,
        settings: false,
        userAccess: false,
      });
    } else if (role === 'accountant') {
      setStaffReadOnly(false);
      setStaffPerms({
        dashboard: true,
        parties: true,
        books: false,
        production: false,
        plates: false,
        paperStock: false,
        billing: true,
        collections: true,
        incomeExpense: true,
        inkSuppliers: true,
        employees: false,
        attendance: false,
        combinedAttendance: false,
        payroll: true,
        cutting: false,
        putti: true,
        reports: true,
        dataMgmt: false,
        settings: false,
        userAccess: false,
      });
    } else if (role === 'operator') {
      setStaffReadOnly(false);
      setStaffPerms({
        dashboard: true,
        parties: false,
        books: true,
        production: true,
        plates: true,
        paperStock: true,
        billing: false,
        collections: false,
        incomeExpense: false,
        inkSuppliers: false,
        employees: false,
        attendance: false,
        combinedAttendance: false,
        payroll: false,
        cutting: true,
        putti: false,
        reports: false,
        dataMgmt: false,
        settings: false,
        userAccess: false,
      });
    }
  };

  const openStaffProvisionModal = (bizId?: string) => {
    setEditingStaffTarget(null);
    setStaffBizId(bizId || activeBusinessId || (saasRegistry.businesses[0]?.id ?? DEFAULT_BUSINESS_ID));
    setStaffName('');
    setStaffIdentifier('');
    setStaffPassword('');
    setShowStaffPwd(false);
    setStaffStatusField('approved');
    setStaffError('');
    applyStaffRolePreset('manager');
    setIsStaffModalOpen(true);
  };

  const openEditStaffModal = (user: AppUserAccess) => {
    setEditingStaffTarget(user);
    setStaffBizId(user.businessId || activeBusinessId || DEFAULT_BUSINESS_ID);
    setStaffName(user.displayName || '');
    setStaffIdentifier(user.loginUsername || user.email || '');
    setStaffPassword('');
    setShowStaffPwd(false);
    setStaffStatusField(user.status || 'approved');
    setStaffRole(user.role || 'operator');
    setStaffReadOnly(user.role === 'viewer' || !!user.isReadOnly);
    const p: Record<AppPermissionModule, boolean> = {
      dashboard: !!user.permissions?.dashboard,
      parties: !!user.permissions?.parties,
      books: !!user.permissions?.books,
      production: !!user.permissions?.production,
      plates: !!user.permissions?.plates,
      paperStock: !!user.permissions?.paperStock,
      billing: !!user.permissions?.billing,
      collections: !!user.permissions?.collections,
      incomeExpense: !!user.permissions?.incomeExpense,
      inkSuppliers: !!user.permissions?.inkSuppliers,
      employees: !!user.permissions?.employees,
      attendance: !!user.permissions?.attendance,
      combinedAttendance: !!user.permissions?.combinedAttendance,
      payroll: !!user.permissions?.payroll,
      cutting: !!user.permissions?.cutting,
      putti: !!user.permissions?.putti,
      reports: !!user.permissions?.reports,
      dataMgmt: !!user.permissions?.dataMgmt,
      settings: !!user.permissions?.settings,
      userAccess: !!user.permissions?.userAccess,
    };
    setStaffPerms(p);
    setStaffError('');
    setIsStaffModalOpen(true);
  };

  const handleSaveStaffUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError('');

    if (editingStaffTarget && !staffPassword.trim()) {
      updateUserAccess(
        editingStaffTarget.uid,
        {
          displayName: staffName.trim() || editingStaffTarget.displayName,
          role: staffRole,
          status: staffStatusField,
          isReadOnly: staffRole === 'viewer' ? true : staffReadOnly,
          permissions: staffPerms,
        },
        editingStaffTarget.businessId || staffBizId
      );
      setIsStaffModalOpen(false);
      setEditingStaffTarget(null);
      setSavedNotice(`"${staffName.trim() || editingStaffTarget.displayName}"-এর এক্সেস ও অনুমতি আপডেট হয়েছে!`);
      setTimeout(() => setSavedNotice(''), 5000);
      return;
    }

    setSavingStaff(true);
    try {
      const res = await provisionStaffUser({
        businessId: staffBizId,
        displayName: staffName,
        identifier: editingStaffTarget
          ? editingStaffTarget.loginUsername || editingStaffTarget.email
          : staffIdentifier,
        password: staffPassword.trim(),
        role: staffRole,
        isReadOnly: staffReadOnly,
        permissions: staffPerms,
        status: staffStatusField,
        existingUid: editingStaffTarget?.uid,
        oldAssignedPassword: editingStaffTarget?.assignedPassword,
      });
      if (!res.success) {
        setStaffError(res.error || 'ইউজার তৈরি করা যায়নি।');
        return;
      }
      const chosenBiz = (saasRegistry.businesses || []).find((b) => b.id === staffBizId);
      setIsStaffModalOpen(false);
      setEditingStaffTarget(null);
      setSavedNotice(
        editingStaffTarget
          ? `"${staffName.trim()}" এর পাসওয়ার্ড ও এক্সেস আপডেট হয়েছে!`
          : `"${chosenBiz?.name || 'নির্বাচিত প্রেস'}"-এর জন্য নতুন ইউজার "${staffName.trim()}" (${staffIdentifier.trim()}) সফলভাবে সেট করা হয়েছে!`
      );
      setTimeout(() => setSavedNotice(''), 6000);
    } finally {
      setSavingStaff(false);
    }
  };

  React.useEffect(() => {
    setPlatformForm(saasRegistry.platformSettings);
  }, [saasRegistry.platformSettings]);

  const getBizExpiryInfo = (biz: RegisteredBusiness) => {
    if (biz.planType === 'lifetime' || biz.planType === 'one_time') {
      return { isExpired: false, daysLeft: null as number | null };
    }
    const fallbackDays =
      biz.durationDays ??
      (biz.planType === 'yearly'
        ? saasRegistry.platformSettings.plans.yearly.durationDays || 365
        : biz.planType === 'monthly'
        ? saasRegistry.platformSettings.plans.monthly.durationDays || 30
        : saasRegistry.platformSettings.defaultTrialDays || 7);
    const expMs = biz.expiresAt
      ? new Date(biz.expiresAt).getTime()
      : new Date(biz.activatedAt || biz.createdAt || Date.now()).getTime() + fallbackDays * 86400000;
    const diff = expMs - Date.now();
    return {
      isExpired: diff <= 0,
      daysLeft: Math.max(0, Math.ceil(diff / 86400000)),
    };
  };

  const businesses = saasRegistry.businesses || [];
  const paymentRequests = saasRegistry.paymentRequests || [];
  const pendingPaymentRequests = paymentRequests.filter((r) => r.status === 'pending');

  const allStaffUsers = React.useMemo(() => {
    const map = new Map<string, AppUserAccess>();
    const addEntry = (u: AppUserAccess, fallbackBizId: string) => {
      const cleanEmail = (u.email || '').toLowerCase().trim();
      if (cleanEmail === 'fileb2027@gmail.com') return;
      const bizId = u.businessId || fallbackBizId;
      const key = `${bizId}::${cleanEmail || u.uid}`;
      const normalized: AppUserAccess = { ...u, businessId: bizId };
      const prev = map.get(key);
      map.set(key, prev ? { ...prev, ...normalized } : normalized);
    };
    (db.userAccessList || []).forEach((u) => addEntry(u, activeBusinessId));
    (saasRegistry.staffAccounts || []).forEach((u) => addEntry(u, DEFAULT_BUSINESS_ID));
    return Array.from(map.values());
  }, [db.userAccessList, saasRegistry.staffAccounts, activeBusinessId]);

  const pendingStaffUsers = allStaffUsers.filter((u) => u.status === 'pending');

  const filteredBusinesses = businesses.filter((b) => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      b.name.toLowerCase().includes(q) ||
      (b.ownerEmail || '').toLowerCase().includes(q) ||
      (b.ownerName || '').toLowerCase().includes(q) ||
      (b.phone || '').toLowerCase().includes(q);
    if (!matchSearch) return false;

    const exp = getBizExpiryInfo(b);
    if (statusFilter === 'pending') return b.status === 'pending';
    if (statusFilter === 'approved') return b.status === 'approved' && !exp.isExpired;
    if (statusFilter === 'expired') return exp.isExpired && b.status === 'approved';
    if (statusFilter === 'suspended') return b.status === 'suspended';
    return true;
  });

  const stats = {
    total: businesses.length,
    pending: businesses.filter((b) => b.status === 'pending').length,
    active: businesses.filter((b) => b.status === 'approved' && !getBizExpiryInfo(b).isExpired).length,
    expired: businesses.filter((b) => b.status === 'approved' && getBizExpiryInfo(b).isExpired).length,
    totalPaid: businesses.reduce((s, b) => s + (Number(b.paidAmount) || 0), 0),
    totalDue: businesses.reduce(
      (s, b) => s + Math.max(0, (Number(b.finalPrice) || 0) - (Number(b.paidAmount) || 0)),
      0
    ),
  };

  const openEditModal = (biz: RegisteredBusiness) => {
    const plans = saasRegistry.platformSettings.plans;
    const isLife = biz.planType === 'one_time' || biz.planType === 'lifetime';
    const fallbackDays =
      biz.planType === 'yearly'
        ? plans.yearly.durationDays || 365
        : biz.planType === 'monthly'
        ? plans.monthly.durationDays || 30
        : saasRegistry.platformSettings.defaultTrialDays || 7;

    setEditingBiz(biz);
    setEditStatus(biz.status);
    setEditPlan(biz.planType);
    setEditCustomPrice(biz.customPrice ?? 0);
    setEditDiscountType(biz.discountType || 'amount');
    setEditDiscountValue(biz.discountValue ?? biz.discountAmount ?? 0);
    setEditPaid(biz.paidAmount ?? 0);
    setEditRenewDays(isLife ? '' : String(biz.durationDays ?? fallbackDays));
    setEditShopPassword(biz.shopPassword || '');
    setShowEditShopPwd(false);
    setEditNotes(biz.notes || '');
  };

  const handlePlanChangeInEdit = (plan: SubscriptionPlanType) => {
    setEditPlan(plan);
    const plans = saasRegistry.platformSettings.plans;
    if (plan === 'trial') {
      setEditCustomPrice(plans.trial.basePrice);
      setEditRenewDays(String(saasRegistry.platformSettings.defaultTrialDays || 7));
    } else if (plan === 'monthly') {
      setEditCustomPrice(plans.monthly.basePrice);
      setEditRenewDays(String(plans.monthly.durationDays || 30));
    } else if (plan === 'yearly') {
      setEditCustomPrice(plans.yearly.basePrice);
      setEditRenewDays(String(plans.yearly.durationDays || 365));
    } else {
      setEditCustomPrice(plans.one_time.basePrice);
      setEditRenewDays('');
    }
  };

  const computeEditDiscountAmount = (price: number, dType: 'amount' | 'percent', dVal: number) => {
    const cleanVal = Math.max(0, Number(dVal) || 0);
    if (dType === 'percent') {
      return Math.round((price * Math.min(100, cleanVal)) / 100);
    }
    return Math.min(price, cleanVal);
  };

  const handleSaveBusinessEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBiz) return;
    setSavingBiz(true);
    try {
      const isLife = editPlan === 'one_time' || editPlan === 'lifetime';
      const plans = saasRegistry.platformSettings.plans;
      const defaultPlanDays =
        editPlan === 'yearly'
          ? plans.yearly.durationDays || 365
          : editPlan === 'monthly'
          ? plans.monthly.durationDays || 30
          : saasRegistry.platformSettings.defaultTrialDays || 7;
      const parsedDays = isLife ? null : parseInt(editRenewDays, 10);
      const effectiveDays = isLife ? null : !isNaN(parsedDays as number) && (parsedDays as number) > 0 ? parsedDays : defaultPlanDays;
      const calcDiscount = computeEditDiscountAmount(Number(editCustomPrice) || 0, editDiscountType, editDiscountValue);

      await updateRegisteredBusiness(editingBiz.id, {
        status: editStatus,
        planType: editPlan,
        customPrice: Number(editCustomPrice) || 0,
        discountType: editDiscountType,
        discountValue: Number(editDiscountValue) || 0,
        discountAmount: calcDiscount,
        paidAmount: Number(editPaid) || 0,
        shopPassword: editShopPassword.trim() || undefined,
        notes: editNotes,
        renewDays: effectiveDays,
      });
      setEditingBiz(null);
    } finally {
      setSavingBiz(false);
    }
  };

  const handleAddBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddBizError('');
    if (!newName.trim()) {
      setAddBizError('প্রতিষ্ঠানের নাম লিখুন।');
      return;
    }
    if (!newShopPassword.trim() || newShopPassword.trim().length < 4) {
      setAddBizError('দোকানের নিরাপত্তা পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।');
      return;
    }
    setAddingBiz(true);
    try {
      const res = await registerNewBusiness({
        name: newName,
        phone: newPhone,
        address: newAddress,
        planType: newPlan,
        shopPassword: newShopPassword.trim(),
      });
      if (res.success) {
        setIsAddModalOpen(false);
        setNewName('');
        setNewPhone('');
        setNewAddress('');
        setNewPlan('trial');
        setNewShopPassword('');
        setAddBizError('');
      } else if (res.error) {
        setAddBizError(res.error);
      }
    } finally {
      setAddingBiz(false);
    }
  };

  const handleReviewPaymentRequest = async (reqId: string, decision: 'approved' | 'rejected') => {
    setReviewingReqId(reqId);
    try {
      await reviewSubscriptionPaymentRequest(reqId, decision);
    } finally {
      setReviewingReqId(null);
    }
  };

  const addPaymentMethodRow = () => {
    const newMethod: PaymentMethodConfig = {
      id: `pm_${Date.now()}`,
      name: 'নতুন পেমেন্ট মাধ্যম',
      accountType: 'Personal',
      accountNumber: '',
      instructions: 'Send Money করে TrxID দিন',
      enabled: true,
    };
    setPlatformForm((prev) => ({
      ...prev,
      paymentMethods: [...(prev.paymentMethods || []), newMethod],
    }));
  };

  const updatePaymentMethodRow = (id: string, patch: Partial<PaymentMethodConfig>) => {
    setPlatformForm((prev) => ({
      ...prev,
      paymentMethods: (prev.paymentMethods || []).map((pm) => (pm.id === id ? { ...pm, ...patch } : pm)),
    }));
  };

  const removePaymentMethodRow = (id: string) => {
    setPlatformForm((prev) => ({
      ...prev,
      paymentMethods: (prev.paymentMethods || []).filter((pm) => pm.id !== id),
    }));
  };

  const toggleModuleTier = (modKey: AppPermissionModule, targetTier: 'free' | 'paid') => {
    setPlatformForm((prev) => {
      const freeSet = new Set(prev.freeModules || []);
      const paidSet = new Set(prev.paidModules || []);
      if (targetTier === 'free') {
        freeSet.add(modKey);
        paidSet.delete(modKey);
      } else {
        paidSet.add(modKey);
        freeSet.delete(modKey);
      }
      return {
        ...prev,
        freeModules: Array.from(freeSet),
        paidModules: Array.from(paidSet),
      };
    });
  };

  const handleSavePlatformSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSaaSPlatformSettings(platformForm);
    setSavedNotice('প্যাকেজ, ফ্রি ট্রায়াল ও মডিউল নীতি সফলভাবে সংরক্ষণ ও সিঙ্ক করা হয়েছে!');
    setTimeout(() => setSavedNotice(''), 4000);
  };

  const planLabel = (plan: SubscriptionPlanType) => {
    if (plan === 'trial') return 'ফ্রি ট্রায়াল';
    if (plan === 'monthly') return 'মাসিক';
    if (plan === 'yearly') return 'বাৎসরিক';
    return 'এককালীন / আজীবন';
  };

  return (
    <div className="space-y-6">
      {/* Top Hero */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-xl border border-indigo-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                সুপার এডমিন মাস্টার কন্ট্রোল (সকল ব্যবসা ও সাবস্ক্রিপশন)
              </h1>
              <p className="text-xs sm:text-sm text-indigo-200 mt-0.5">
                সকল নিবন্ধিত প্রেস/দোকান অনুমোদন করুন, যেকোনো দোকানে প্রবেশ করে সমস্যা সমাধান করুন, ফ্রি ট্রায়াল, প্যাকেজ ও কাস্টম ছাড় নিয়ন্ত্রণ করুন
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setMyNewPwd('');
                setMyConfirmPwd('');
                setMyPwdError('');
                setShowMyPwd(false);
                setIsMyPwdModalOpen(true);
              }}
              className="px-3.5 py-2 bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-400/40 font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-md transition"
              title="আপনার মেইন সুপার অ্যাডমিন ইমেইলের পাসওয়ার্ড সেট বা পরিবর্তন করুন"
            >
              <KeyRound className="w-4 h-4" />
              <span>সুপার অ্যাডমিন পাসওয়ার্ড</span>
            </button>
            <button
              type="button"
              onClick={() => openStaffProvisionModal()}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-md transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>ইউজার ও পাসওয়ার্ড সেট</span>
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন ব্যবসা যুক্ত করুন</span>
            </button>
          </div>
        </div>

        {savedNotice && (
          <div className="mt-4 bg-emerald-500/20 border border-emerald-400/40 text-emerald-100 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between gap-2">
            <span>✓ {savedNotice}</span>
            <button
              type="button"
              onClick={() => setSavedNotice('')}
              className="text-emerald-200 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 text-xs">
          <div className="bg-white/10 rounded-xl p-3 border border-white/10">
            <p className="text-indigo-200 text-[11px]">মোট নিবন্ধিত দোকান</p>
            <p className="text-xl font-black mt-0.5">{stats.total} টি</p>
          </div>
          <div className="bg-amber-500/20 rounded-xl p-3 border border-amber-400/30">
            <p className="text-amber-200 text-[11px]">অনুমোদনের অপেক্ষায়</p>
            <p className="text-xl font-black text-amber-300 mt-0.5">{stats.pending} টি</p>
          </div>
          <div className="bg-emerald-500/20 rounded-xl p-3 border border-emerald-400/30">
            <p className="text-emerald-200 text-[11px]">সক্রিয় দোকান</p>
            <p className="text-xl font-black text-emerald-300 mt-0.5">{stats.active} টি</p>
          </div>
          <div className="bg-rose-500/20 rounded-xl p-3 border border-rose-400/30">
            <p className="text-rose-200 text-[11px]">মেয়াদোত্তীর্ণ</p>
            <p className="text-xl font-black text-rose-300 mt-0.5">{stats.expired} টি</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 border border-white/10">
            <p className="text-indigo-200 text-[11px]">মোট আদায়</p>
            <p className="text-lg font-black text-emerald-300 mt-0.5">৳{stats.totalPaid.toLocaleString()}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 border border-white/10">
            <p className="text-indigo-200 text-[11px]">মোট বকেয়া</p>
            <p className="text-lg font-black text-amber-300 mt-0.5">৳{stats.totalDue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs">
        <button
          onClick={() => setSubTab('businesses')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition ${
            subTab === 'businesses'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>সকল দোকান ও সাপোর্ট ({businesses.length})</span>
          {pendingPaymentRequests.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
              পেমেন্ট: {pendingPaymentRequests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setSubTab('packages')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition ${
            subTab === 'packages'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Settings2 className="w-4 h-4" />
          <span>ফ্রি ট্রায়াল, প্যাকেজ, পেমেন্ট মেথড ও মডিউল</span>
        </button>
        <button
          onClick={() => setSubTab('staff-accounts')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition ${
            subTab === 'staff-accounts'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>স্টাফ ও ইউজার এক্সেস ({allStaffUsers.length})</span>
          {pendingStaffUsers.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black animate-pulse">
              অপেক্ষমান: {pendingStaffUsers.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setSubTab('party-accounts')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition ${
            subTab === 'party-accounts'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>পার্টি পোর্টাল (সকল প্রেস) ({(saasRegistry.partyAccounts || []).length})</span>
        </button>
      </div>

      {subTab === 'businesses' && (
        <div className="space-y-4">
          {/* Pending Staff Approval Requests Banner */}
          {pendingStaffUsers.length > 0 && (
            <div className="rounded-2xl p-4 sm:p-5 border border-amber-300 bg-amber-50/80 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    স্টাফ / ব্যবহারকারী অনুমোদনের অনুরোধ
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-bold">
                    {pendingStaffUsers.length} জন অপেক্ষমান
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStaffStatusFilter('pending');
                    setSubTab('staff-accounts');
                  }}
                  className="text-xs font-bold text-indigo-700 hover:underline"
                >
                  সব স্টাফ তালিকা দেখুন →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {pendingStaffUsers.map((stUser) => {
                  const bizObj = businesses.find((b) => b.id === stUser.businessId);
                  return (
                    <div
                      key={`${stUser.businessId}_${stUser.uid}_${stUser.email}`}
                      className="p-3.5 rounded-xl border border-amber-300 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">
                          {stUser.displayName || 'ব্যবহারকারী'}
                        </p>
                        <p className="text-[11px] font-mono text-slate-600 truncate">
                          {stUser.loginUsername ? `${stUser.loginUsername} • ` : ''}
                          {stUser.email}
                        </p>
                        <p className="text-[11px] text-indigo-700 font-semibold mt-0.5">
                          প্রেস: {bizObj?.name || 'মক্কা প্রিন্টার্স'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            updateUserAccess(
                              stUser.uid,
                              {
                                status: 'approved',
                                role: stUser.role === 'custom' ? 'operator' : stUser.role,
                                permissions:
                                  stUser.permissions &&
                                  Object.values(stUser.permissions).some(Boolean)
                                    ? stUser.permissions
                                    : {
                                        dashboard: true,
                                        parties: false,
                                        books: true,
                                        production: true,
                                        plates: true,
                                        paperStock: true,
                                        billing: false,
                                        collections: false,
                                        incomeExpense: false,
                                        inkSuppliers: false,
                                        employees: false,
                                        attendance: false,
                                        combinedAttendance: false,
                                        payroll: false,
                                        cutting: true,
                                        putti: false,
                                        reports: false,
                                        dataMgmt: false,
                                        settings: false,
                                        userAccess: false,
                                      },
                              },
                              stUser.businessId
                            );
                            setSavedNotice(
                              `"${stUser.displayName || stUser.email}" কে অনুমোদন দেওয়া হয়েছে!`
                            );
                            setTimeout(() => setSavedNotice(''), 5000);
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs transition"
                        >
                          অনুমোদন করুন
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditStaffModal(stUser)}
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold transition"
                        >
                          মডিউল সেট
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateUserAccess(
                              stUser.uid,
                              { status: 'rejected' },
                              stUser.businessId
                            )
                          }
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold transition"
                        >
                          স্থগিত
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* Pending Payment Requests Card */}
          {paymentRequests.length > 0 && (
            <div
              className={`rounded-2xl p-4 sm:p-5 border shadow-xs space-y-3 ${
                pendingPaymentRequests.length > 0
                  ? 'bg-amber-50/70 border-amber-300'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-amber-600" />
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    কাস্টমার সাবস্ক্রিপশন পেমেন্ট আবেদনসমূহ
                  </h2>
                  {pendingPaymentRequests.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-bold">
                      {pendingPaymentRequests.length} টি অপেক্ষমান
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  অনুমোদন করলে সাথে সাথে প্যাকেজ ও মেয়াদ চালু হয়ে যাবে
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {paymentRequests.slice(0, 8).map((req) => (
                  <div
                    key={req.id}
                    className={`p-3.5 rounded-xl border bg-white flex flex-col justify-between gap-2.5 ${
                      req.status === 'pending'
                        ? 'border-amber-300 shadow-xs'
                        : 'border-slate-200 opacity-85'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-slate-900">{req.businessName}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{req.ownerEmail}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          req.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'rejected'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {req.status === 'approved'
                          ? 'অনুমোদিত'
                          : req.status === 'rejected'
                          ? 'বাতিল'
                          : 'যাচাই বাকি'}
                      </span>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-2.5 space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-600">প্যাকেজ:</span>
                        <span className="font-bold text-indigo-800">{req.planLabel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">মাধ্যম:</span>
                        <span className="font-bold text-slate-800">{req.paymentMethodName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">প্রেরক / TrxID:</span>
                        <span className="font-mono font-bold text-slate-900">
                          {req.senderNumber} • {req.transactionId}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">পরিশোধিত / নির্ধারিত:</span>
                        <span className="font-bold text-emerald-700">
                          ৳{req.paidAmount.toLocaleString()} / ৳{req.payableAmount.toLocaleString()}
                          {req.discountAmount > 0 && (
                            <span className="ml-1 text-[10px] text-amber-700">
                              (ছাড় ৳{req.discountAmount.toLocaleString()})
                            </span>
                          )}
                        </span>
                      </div>
                      {req.notes && <p className="text-slate-500 pt-0.5">নোট: {req.notes}</p>}
                    </div>

                    {req.status === 'pending' && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={reviewingReqId === req.id}
                          onClick={() => handleReviewPaymentRequest(req.id, 'rejected')}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold transition"
                        >
                          বাতিল
                        </button>
                        <button
                          type="button"
                          disabled={reviewingReqId === req.id}
                          onClick={() => handleReviewPaymentRequest(req.id, 'approved')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs transition"
                        >
                          {reviewingReqId === req.id ? 'প্রসেস হচ্ছে...' : 'অনুমোদন ও মেয়াদ চালু'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="দোকানের নাম, মালিকের নাম, ফোন বা ইমেইল দিয়ে খুঁজুন..."
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-indigo-500"
              />
            </div>

            <div className="flex flex-wrap gap-1.5 text-xs font-bold">
              {(
                [
                  { id: 'all', label: 'সব' },
                  { id: 'pending', label: `অপেক্ষমান (${stats.pending})` },
                  { id: 'approved', label: 'সক্রিয়' },
                  { id: 'expired', label: 'মেয়াদ শেষ' },
                  { id: 'suspended', label: 'স্থগিত' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl border transition ${
                    statusFilter === f.id
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Businesses Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">ব্যবসা প্রতিষ্ঠান</th>
                  <th className="py-3 px-3">মালিক ও যোগাযোগ</th>
                  <th className="py-3 px-3 text-center">অবস্থা</th>
                  <th className="py-3 px-3 text-center">প্যাকেজ ও মেয়াদ</th>
                  <th className="py-3 px-3 text-right">মূল্য / ছাড় / বকেয়া</th>
                  <th className="py-3 px-3 text-right">অ্যাকশন ও সাপোর্ট</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBusinesses.map((biz) => {
                  const exp = getBizExpiryInfo(biz);
                  const isActiveShop = biz.id === activeBusinessId;
                  const due = Math.max(0, (Number(biz.finalPrice) || 0) - (Number(biz.paidAmount) || 0));

                  return (
                    <tr
                      key={biz.id}
                      className={`transition ${isActiveShop ? 'bg-emerald-50/60' : 'hover:bg-slate-50'}`}
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 font-black flex items-center justify-center shrink-0">
                            {biz.name[0]}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{biz.name}</span>
                              {biz.shopPassword && (
                                <span
                                  className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded text-[10px] inline-flex items-center gap-0.5"
                                  title="দোকানে পাসওয়ার্ড সুরক্ষা চালু আছে"
                                >
                                  <KeyRound className="w-2.5 h-2.5 text-amber-600" />
                                  <span>সুরক্ষিত</span>
                                </span>
                              )}
                              {biz.id === DEFAULT_BUSINESS_ID && (
                                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded text-[10px]">
                                  ★ মূল প্রেস
                                </span>
                              )}
                              {isActiveShop && (
                                <span className="px-1.5 py-0.2 bg-emerald-600 text-white rounded text-[10px]">
                                  বর্তমানে ওপেন
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500">{biz.address || 'ঠিকানা যুক্ত হয়নি'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-800">{biz.ownerName || 'অজানা'}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{biz.ownerEmail}</p>
                        {biz.phone && <p className="text-[11px] text-emerald-700 font-semibold">{biz.phone}</p>}
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {biz.status === 'pending' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px]">
                            <Clock className="w-3.5 h-3.5" />
                            <span>অপেক্ষমান</span>
                          </span>
                        ) : biz.status === 'suspended' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px]">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>স্থগিত</span>
                          </span>
                        ) : exp.isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 font-bold text-[11px]">
                            <Lock className="w-3.5 h-3.5" />
                            <span>মেয়াদ শেষ</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>অনুমোদিত</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 font-bold block w-fit mx-auto">
                          {planLabel(biz.planType)}
                        </span>
                        {exp.daysLeft === null ? (
                          <span className="text-[11px] text-emerald-700 font-bold">আজীবন আনলিমিটেড</span>
                        ) : exp.isExpired ? (
                          <span className="text-[11px] text-rose-600 font-bold">মেয়াদ উত্তীর্ণ ({formatDate(biz.expiresAt?.split('T')[0] || '')})</span>
                        ) : (
                          <span className="text-[11px] text-slate-600 font-semibold">
                            বাকি {exp.daysLeft} দিন ({formatDate(biz.expiresAt?.split('T')[0] || '')})
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="font-bold text-slate-800">চূড়ান্ত: ৳{(biz.finalPrice || 0).toLocaleString()}</div>
                        {(biz.discountAmount || 0) > 0 && (
                          <div className="text-[11px] text-emerald-700 font-semibold">
                            {biz.discountType === 'percent' && (biz.discountValue || 0) > 0
                              ? `ছাড়: ${biz.discountValue}% (৳${biz.discountAmount.toLocaleString()})`
                              : `ছাড়: ৳${biz.discountAmount.toLocaleString()}`}
                          </div>
                        )}
                        <div className="text-[11px] text-slate-500">
                          জমা: ৳{(biz.paidAmount || 0).toLocaleString()} •{' '}
                          <span className={due > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600'}>
                            বাকি: ৳{due.toLocaleString()}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {biz.status === 'pending' && (
                            <button
                              onClick={() => updateRegisteredBusiness(biz.id, { status: 'approved' })}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] transition"
                              title="এই ব্যবসা প্রতিষ্ঠান অনুমোদন করুন"
                            >
                              অনুমোদন
                            </button>
                          )}

                          <button
                            onClick={() => {
                              switchBusiness(biz.id);
                              if (onNavigate) onNavigate('dashboard');
                            }}
                            className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] flex items-center space-x-1 transition ${
                              isActiveShop
                                ? 'bg-emerald-700 text-white'
                                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                            }`}
                            title="এই দোকানের খাতায় প্রবেশ করে হিসাব দেখুন ও সমস্যা সমাধান করুন"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            <span>{isActiveShop ? 'চলমান দোকান' : 'দোকানে প্রবেশ'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openStaffProvisionModal(biz.id)}
                            className="px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold rounded-lg text-[11px] flex items-center space-x-1 transition"
                            title="এই দোকানের জন্য ইউজারনেম, পাসওয়ার্ড ও দায়িত্ব সেট করুন"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>ইউজার</span>
                          </button>

                          <button
                            onClick={() => openEditModal(biz)}
                            className="p-1.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800 rounded-lg transition"
                            title="প্যাকেজ, মেয়াদ ও ছাড় পরিবর্তন করুন"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {biz.id !== DEFAULT_BUSINESS_ID && (
                            <button
                              onClick={() => setDeleteTarget(biz)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                              title="তালিকা থেকে মুছে ফেলুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      )}

      {subTab === 'staff-accounts' && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <span>সকল প্রেসের স্টাফ ও ব্যবহারকারী (সুপার এডমিন কন্ট্রোল)</span>
              </h2>
              <p className="text-xs text-slate-500">
                অপেক্ষমান ব্যবহারকারীদের ১ ক্লিকে অনুমোদন দিন অথবা যেকোনো প্রেসের স্টাফের আইডি, পাসওয়ার্ড ও মডিউল পরিবর্তন করুন
              </p>
            </div>

            <button
              type="button"
              onClick={() => openStaffProvisionModal()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ নতুন ইউজার ও পাসওয়ার্ড তৈরি</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  placeholder="নাম, ইউজারনেম বা ইমেইল..."
                  className="pl-8 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500"
                />
              </div>
              <select
                value={staffBizFilter}
                onChange={(e) => setStaffBizFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white"
              >
                <option value="all">সকল প্রেস ({businesses.length})</option>
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-1.5 font-bold">
              {(
                [
                  { id: 'all', label: `সব (${allStaffUsers.length})` },
                  { id: 'pending', label: `অপেক্ষমান (${pendingStaffUsers.length})` },
                  {
                    id: 'approved',
                    label: `অনুমোদিত (${allStaffUsers.filter((u) => u.status === 'approved').length})`,
                  },
                  {
                    id: 'rejected',
                    label: `স্থগিত (${allStaffUsers.filter((u) => u.status === 'rejected').length})`,
                  },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStaffStatusFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl border transition ${
                    staffStatusFilter === f.id
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b">
                <tr>
                  <th className="p-3">ব্যবহারকারী</th>
                  <th className="p-3">প্রেস প্রতিষ্ঠান</th>
                  <th className="p-3">লগইন আইডি / ইমেইল ও পাসওয়ার্ড</th>
                  <th className="p-3 text-center">অবস্থা</th>
                  <th className="p-3 text-center">রোল ও মডিউল</th>
                  <th className="p-3 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(() => {
                  const q = staffSearch.trim().toLowerCase();
                  const filtered = allStaffUsers.filter((u) => {
                    if (staffBizFilter !== 'all' && u.businessId !== staffBizFilter) return false;
                    if (staffStatusFilter !== 'all' && u.status !== staffStatusFilter) return false;
                    if (!q) return true;
                    const bizName = businesses.find((b) => b.id === u.businessId)?.name || '';
                    return (
                      (u.displayName || '').toLowerCase().includes(q) ||
                      (u.email || '').toLowerCase().includes(q) ||
                      (u.loginUsername || '').toLowerCase().includes(q) ||
                      bizName.toLowerCase().includes(q)
                    );
                  });

                  if (filtered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">
                          কোনো স্টাফ বা ব্যবহারকারী পাওয়া যায়নি।
                        </td>
                      </tr>
                    );
                  }

                  return filtered.map((u) => {
                    const bizObj = businesses.find((b) => b.id === u.businessId);
                    const pwdKey = `staff_${u.businessId}_${u.uid}_${u.email}`;
                    const showPwd = !!visiblePwdMap[pwdKey];
                    const modCount = u.permissions
                      ? Object.values(u.permissions).filter(Boolean).length
                      : 0;

                    return (
                      <tr key={pwdKey} className="hover:bg-slate-50">
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0">
                              {(u.displayName || u.email || 'U')[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate">
                                {u.displayName || 'নামহীন'}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {formatDate(u.requestedAt?.split('T')[0] || '')}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-semibold text-indigo-800">
                          {bizObj?.name || 'মক্কা প্রিন্টার্স'}
                        </td>
                        <td className="p-3">
                          {u.loginUsername && (
                            <div className="inline-block px-2 py-0.5 mb-0.5 rounded bg-indigo-50 text-indigo-800 font-mono font-bold text-[11px]">
                              আইডি: {u.loginUsername}
                            </div>
                          )}
                          <div className="font-mono text-[11px] text-slate-600">{u.email}</div>
                          {u.assignedPassword && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mt-0.5">
                              <span>পাসওয়ার্ড:</span>
                              <span className="font-mono font-bold text-slate-900">
                                {showPwd ? u.assignedPassword : '••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setVisiblePwdMap((prev) => ({
                                    ...prev,
                                    [pwdKey]: !prev[pwdKey],
                                  }))
                                }
                                className="text-slate-400 hover:text-indigo-600"
                              >
                                {showPwd ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          {u.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-emerald-100 text-emerald-800">
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>অনুমোদিত</span>
                            </span>
                          ) : u.status === 'pending' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-amber-100 text-amber-800 animate-pulse">
                              <Clock className="w-3.5 h-3.5" />
                              <span>অপেক্ষমান</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-rose-100 text-rose-800">
                              <UserX className="w-3.5 h-3.5" />
                              <span>স্থগিত</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded-md text-[11px] block w-fit mx-auto">
                            {u.role === 'super_admin'
                              ? 'সুপার অ্যাডমিন'
                              : u.role === 'admin'
                              ? 'অ্যাডমিন'
                              : u.role === 'manager'
                              ? 'ম্যানেজার'
                              : u.role === 'accountant'
                              ? 'হিসাবরক্ষক'
                              : u.role === 'operator'
                              ? 'অপারেটর'
                              : u.role === 'viewer'
                              ? 'দর্শক (Viewer)'
                              : 'কাস্টম'}
                          </span>
                          <span className="text-[11px] text-slate-500 font-semibold">
                            {modCount} টি মডিউল
                          </span>
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {u.status !== 'approved' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  updateUserAccess(
                                    u.uid,
                                    {
                                      status: 'approved',
                                      role: u.role === 'custom' ? 'operator' : u.role,
                                      permissions:
                                        u.permissions &&
                                        Object.values(u.permissions).some(Boolean)
                                          ? u.permissions
                                          : {
                                              dashboard: true,
                                              parties: false,
                                              books: true,
                                              production: true,
                                              plates: true,
                                              paperStock: true,
                                              billing: false,
                                              collections: false,
                                              incomeExpense: false,
                                              inkSuppliers: false,
                                              employees: false,
                                              attendance: false,
                                              combinedAttendance: false,
                                              payroll: false,
                                              cutting: true,
                                              putti: false,
                                              reports: false,
                                              dataMgmt: false,
                                              settings: false,
                                              userAccess: false,
                                            },
                                    },
                                    u.businessId
                                  );
                                  setSavedNotice(
                                    `"${u.displayName || u.email}" অনুমোদন করা হয়েছে!`
                                  );
                                  setTimeout(() => setSavedNotice(''), 5000);
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px]"
                              >
                                অনুমোদন
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  updateUserAccess(u.uid, { status: 'rejected' }, u.businessId)
                                }
                                className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg font-bold text-[11px]"
                              >
                                স্থগিত
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openEditStaffModal(u)}
                              className="p-1.5 bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-800 rounded-lg"
                              title="রোল, মডিউল ও পাসওয়ার্ড পরিবর্তন"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteStaffTarget(u)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'party-accounts' && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>সকল প্রেসের পার্টি পোর্টাল অ্যাকাউন্ট (সুপার এডমিন কন্ট্রোল)</span>
              </h2>
              <p className="text-xs text-slate-500">
                যেকোনো প্রেসের পার্টির লগইন আইডি, পাসওয়ার্ড, অনুমোদন অবস্থা দেখুন ও সংশোধন করুন
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={partySearch}
                  onChange={(e) => setPartySearch(e.target.value)}
                  placeholder="পার্টি, মোবাইল বা লগইন আইডি..."
                  className="pl-8 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-indigo-500"
                />
              </div>
              <select
                value={partyBizFilter}
                onChange={(e) => setPartyBizFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white"
              >
                <option value="all">সকল প্রেস ({businesses.length})</option>
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b">
                <tr>
                  <th className="p-3">পার্টির নাম ও ফোন</th>
                  <th className="p-3">প্রেস প্রতিষ্ঠান</th>
                  <th className="p-3">লগইন আইডি ও পাসওয়ার্ড</th>
                  <th className="p-3 text-center">অবস্থা</th>
                  <th className="p-3 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(() => {
                  const q = partySearch.trim().toLowerCase();
                  const filtered = (saasRegistry.partyAccounts || []).filter((acc) => {
                    if (partyBizFilter !== 'all' && acc.businessId !== partyBizFilter) return false;
                    if (!q) return true;
                    return (
                      acc.partyName.toLowerCase().includes(q) ||
                      acc.loginId.toLowerCase().includes(q) ||
                      (acc.phone || '').includes(q) ||
                      (acc.businessName || '').toLowerCase().includes(q)
                    );
                  });

                  if (filtered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">
                          কোনো পার্টি পোর্টাল অ্যাকাউন্ট পাওয়া যায়নি।
                        </td>
                      </tr>
                    );
                  }

                  return filtered.map((acc) => {
                    const bizObj = businesses.find((b) => b.id === acc.businessId);
                    const isPwdVisible = !!visiblePwdMap[acc.id];
                    return (
                      <tr key={acc.id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <p className="font-bold text-slate-900">{acc.partyName}</p>
                          <p className="text-[11px] text-slate-500">
                            {acc.contactPerson ? `${acc.contactPerson} • ` : ''}
                            {acc.phone || '-'}
                          </p>
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-indigo-800">
                            {bizObj?.name || acc.businessName || 'সংযুক্ত নয়'}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-mono font-bold text-slate-900">আইডি: {acc.loginId}</div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mt-0.5">
                            <span>পাসওয়ার্ড:</span>
                            <span className="font-mono font-bold">
                              {isPwdVisible ? acc.password || '—' : '••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setVisiblePwdMap((prev) => ({ ...prev, [acc.id]: !prev[acc.id] }))
                              }
                              className="text-slate-400 hover:text-slate-700"
                              title="দেখুন/লুকান"
                            >
                              {isPwdVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              acc.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : acc.status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {acc.status === 'approved'
                              ? 'চালু (Approved)'
                              : acc.status === 'pending'
                              ? 'অপেক্ষমান (Pending)'
                              : acc.status === 'disabled'
                              ? 'বন্ধ (Disabled)'
                              : 'বাতিল'}
                          </span>
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {acc.status !== 'approved' ? (
                              <button
                                type="button"
                                onClick={() => adminUpdatePartyAccount(acc.id, { status: 'approved' })}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px]"
                              >
                                চালু
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => adminUpdatePartyAccount(acc.id, { status: 'disabled' })}
                                className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg font-bold text-[11px]"
                              >
                                বন্ধ
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPartyAcc(acc);
                                setEditPartyLoginId(acc.loginId);
                                setEditPartyPwd(acc.password || '');
                                setShowEditPartyPwd(false);
                                setEditPartyStatus(acc.status);
                                setEditPartyBizId(acc.businessId || '');
                                setEditPartyAccError('');
                              }}
                              className="p-1.5 bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-800 rounded-lg"
                              title="আইডি ও পাসওয়ার্ড পরিবর্তন"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletePartyAccTarget(acc)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'packages' && (
        <form onSubmit={handleSavePlatformSettings} className="space-y-6">
          {savedNotice && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{savedNotice}</span>
            </div>
          )}

          {/* Trial & Packages Card */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-indigo-600" />
                  <span>ফ্রি ট্রায়াল দিন ও সাবস্ক্রিপশন প্যাকেজসমূহ</span>
                </h2>
                <p className="text-xs text-slate-500">
                  নতুন কাস্টমার ব্যবসা খুললে কত দিন ফ্রি ট্রায়াল পাবে এবং মাসিক/বাৎসরিক/এককালীন প্যাকেজের মূল্য নির্ধারণ করুন
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              {/* Default Trial */}
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900">ডিফল্ট ফ্রি ট্রায়াল</span>
                  <Gift className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">ফ্রি ট্রায়াল দিন (Days)</label>
                  <input
                    type="number"
                    min={0}
                    value={platformForm.defaultTrialDays}
                    onChange={(e) => {
                      const days = Math.max(0, parseInt(e.target.value, 10) || 0);
                      setPlatformForm((prev) => ({
                        ...prev,
                        defaultTrialDays: days,
                        plans: {
                          ...prev.plans,
                          trial: { ...prev.plans.trial, durationDays: days },
                        },
                      }));
                    }}
                    className="w-full px-3 py-2 border border-amber-300 rounded-lg bg-white font-bold"
                  />
                </div>
              </div>

              {/* Monthly */}
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2">
                <span className="font-bold text-blue-900 block">মাসিক প্যাকেজ (Monthly)</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">দিন</label>
                    <input
                      type="number"
                      min={1}
                      value={platformForm.plans.monthly.durationDays || 30}
                      onChange={(e) =>
                        setPlatformForm((p) => ({
                          ...p,
                          plans: {
                            ...p.plans,
                            monthly: { ...p.plans.monthly, durationDays: parseInt(e.target.value, 10) || 30 },
                          },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">মূল্য (৳)</label>
                    <input
                      type="number"
                      min={0}
                      value={platformForm.plans.monthly.basePrice}
                      onChange={(e) =>
                        setPlatformForm((p) => ({
                          ...p,
                          plans: {
                            ...p.plans,
                            monthly: { ...p.plans.monthly, basePrice: parseFloat(e.target.value) || 0 },
                          },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Yearly */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2">
                <span className="font-bold text-emerald-900 block">বাৎসরিক প্যাকেজ (Yearly)</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">দিন</label>
                    <input
                      type="number"
                      min={1}
                      value={platformForm.plans.yearly.durationDays || 365}
                      onChange={(e) =>
                        setPlatformForm((p) => ({
                          ...p,
                          plans: {
                            ...p.plans,
                            yearly: { ...p.plans.yearly, durationDays: parseInt(e.target.value, 10) || 365 },
                          },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">মূল্য (৳)</label>
                    <input
                      type="number"
                      min={0}
                      value={platformForm.plans.yearly.basePrice}
                      onChange={(e) =>
                        setPlatformForm((p) => ({
                          ...p,
                          plans: {
                            ...p.plans,
                            yearly: { ...p.plans.yearly, basePrice: parseFloat(e.target.value) || 0 },
                          },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* One-Time / Lifetime */}
              <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/40 space-y-2">
                <span className="font-bold text-purple-900 block">এককালীন / আজীবন (One-Time)</span>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">প্যাকেজ মূল্য (৳)</label>
                  <input
                    type="number"
                    min={0}
                    value={platformForm.plans.one_time.basePrice}
                    onChange={(e) =>
                      setPlatformForm((p) => ({
                        ...p,
                        plans: {
                          ...p.plans,
                          one_time: { ...p.plans.one_time, basePrice: parseFloat(e.target.value) || 0 },
                        },
                      }))
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Support / Payment Instructions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">সাপোর্ট মোবাইল নম্বর</label>
                <input
                  type="text"
                  value={platformForm.supportPhone || ''}
                  onChange={(e) => setPlatformForm((p) => ({ ...p, supportPhone: e.target.value }))}
                  placeholder="যেমন: 017XXXXXXXX"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">সাপোর্ট ইমেইল</label>
                <input
                  type="email"
                  value={platformForm.supportEmail || ''}
                  onChange={(e) => setPlatformForm((p) => ({ ...p, supportEmail: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">সাধারণ পেমেন্ট নির্দেশনা</label>
                <input
                  type="text"
                  value={platformForm.paymentInstructions || ''}
                  onChange={(e) => setPlatformForm((p) => ({ ...p, paymentInstructions: e.target.value }))}
                  placeholder="বিকাশ / নগদ / ব্যাংক বিবরণ"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Payment Methods CRUD Card */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  <span>পেমেন্ট মেথডসমূহ (বিকাশ / নগদ / রকেট / ব্যাংক)</span>
                </h2>
                <p className="text-xs text-slate-500">
                  এখানে যে পেমেন্ট নম্বর ও নির্দেশনা সেট করবেন তা কাস্টমারের পেমেন্ট স্ক্রিনে দেখাবে
                </p>
              </div>
              <button
                type="button"
                onClick={addPaymentMethodRow}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center space-x-1 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>নতুন মেথড যোগ</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {(platformForm.paymentMethods || []).map((pm) => (
                <div
                  key={pm.id}
                  className={`p-3.5 rounded-xl border grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end ${
                    pm.enabled ? 'bg-slate-50/70 border-slate-200' : 'bg-slate-100/70 border-slate-200 opacity-70'
                  }`}
                >
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">মাধ্যমের নাম</label>
                    <input
                      type="text"
                      value={pm.name}
                      onChange={(e) => updatePaymentMethodRow(pm.id, { name: e.target.value })}
                      placeholder="বিকাশ (bKash)"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-bold"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">ধরন</label>
                    <input
                      type="text"
                      value={pm.accountType}
                      onChange={(e) => updatePaymentMethodRow(pm.id, { accountType: e.target.value })}
                      placeholder="Personal / Merchant"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">একাউন্ট / মোবাইল নম্বর</label>
                    <input
                      type="text"
                      value={pm.accountNumber}
                      onChange={(e) => updatePaymentMethodRow(pm.id, { accountNumber: e.target.value })}
                      placeholder="01XXXXXXXXX"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-mono font-bold"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">নির্দেশনা</label>
                    <input
                      type="text"
                      value={pm.instructions || ''}
                      onChange={(e) => updatePaymentMethodRow(pm.id, { instructions: e.target.value })}
                      placeholder="Send Money করে TrxID দিন"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div className="md:col-span-2 flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => updatePaymentMethodRow(pm.id, { enabled: !pm.enabled })}
                      className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] border transition ${
                        pm.enabled
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-slate-200 text-slate-600 border-slate-300'
                      }`}
                    >
                      {pm.enabled ? 'চালু' : 'বন্ধ'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removePaymentMethodRow(pm.id)}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {(platformForm.paymentMethods || []).length === 0 && (
                <p className="text-center text-slate-400 py-3">
                  কোনো পেমেন্ট মেথড যুক্ত নেই। উপরের "নতুন মেথড যোগ" বাটনে ক্লিক করুন।
                </p>
              )}
            </div>
          </div>

          {/* Free vs Paid Features Matrix */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <span>ফ্রি বনাম পেইড মডিউল নীতি (সাবস্ক্রিপশন শেষে অটো-লক)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                যেসব মডিউল <strong>ফ্রি</strong> হিসেবে নির্ধারণ করবেন তা সাবস্ক্রিপশন ছাড়াই চলবে। আর <strong>পেইড</strong> মডিউলগুলো ট্রায়াল/মেয়াদ শেষ হলে স্বয়ংক্রিয়ভাবে লক হয়ে যাবে।
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
              {ALL_CONFIGURABLE_MODULES.map((mod) => {
                const isFree = (platformForm.freeModules || []).includes(mod.key);
                return (
                  <div
                    key={mod.key}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                      isFree ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50/40 border-amber-200'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-slate-800">{mod.label}</p>
                      <p className="text-[10px] text-slate-500">{mod.category}</p>
                    </div>
                    <div className="flex rounded-lg overflow-hidden border border-slate-200 bg-white text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => toggleModuleTier(mod.key, 'free')}
                        className={`px-2.5 py-1 transition ${
                          isFree ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        ফ্রি
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleModuleTier(mod.key, 'paid')}
                        className={`px-2.5 py-1 transition ${
                          !isFree ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        পেইড 🔒
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center space-x-2 shadow-md transition"
              >
                <Save className="w-4 h-4" />
                <span>প্যাকেজ ও মডিউল সেটিংস সংরক্ষণ করুন</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Modal: Edit Business Subscription & Custom Discount */}
      {editingBiz && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">ব্যবসা ও সাবস্ক্রিপশন নিয়ন্ত্রণ: {editingBiz.name}</h3>
                <p className="text-xs text-slate-500 font-mono">{editingBiz.ownerEmail}</p>
              </div>
              <button onClick={() => setEditingBiz(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBusinessEdit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">অনুমোদন অবস্থা (Status)</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as BusinessApprovalStatus)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white"
                  >
                    <option value="approved">অনুমোদিত (Approved)</option>
                    <option value="pending">অপেক্ষমান (Pending)</option>
                    <option value="suspended">স্থগিত / লকড (Suspended)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">প্যাকেজ ক্যাটাগরি</label>
                  <select
                    value={editPlan}
                    onChange={(e) => handlePlanChangeInEdit(e.target.value as SubscriptionPlanType)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white"
                  >
                    <option value="trial">ফ্রি ট্রায়াল (Trial)</option>
                    <option value="monthly">মাসিক (Monthly)</option>
                    <option value="yearly">বাৎসরিক (Yearly)</option>
                    <option value="one_time">এককালীন / আজীবন (Lifetime)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">প্যাকেজ মূল্য (৳)</label>
                  <input
                    type="number"
                    min={0}
                    value={editCustomPrice}
                    onChange={(e) => setEditCustomPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white font-bold"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-emerald-700">বিশেষ ছাড়</label>
                    <div className="inline-flex rounded-md border border-emerald-300 overflow-hidden bg-white text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setEditDiscountType('amount')}
                        className={`px-1.5 py-0.5 ${
                          editDiscountType === 'amount' ? 'bg-emerald-600 text-white' : 'text-emerald-700'
                        }`}
                      >
                        ৳ টাকা
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditDiscountType('percent')}
                        className={`px-1.5 py-0.5 ${
                          editDiscountType === 'percent' ? 'bg-emerald-600 text-white' : 'text-emerald-700'
                        }`}
                      >
                        % শতকরা
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={editDiscountType === 'percent' ? 100 : undefined}
                    value={editDiscountValue}
                    onChange={(e) => setEditDiscountValue(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-2 border border-emerald-300 rounded-lg bg-white font-bold text-emerald-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-indigo-700 mb-1">জমা টাকা (৳)</label>
                  <input
                    type="number"
                    min={0}
                    value={editPaid}
                    onChange={(e) => setEditPaid(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-2 border border-indigo-300 rounded-lg bg-white font-bold text-indigo-700"
                  />
                </div>
              </div>

              {(() => {
                const calcDisc = computeEditDiscountAmount(editCustomPrice, editDiscountType, editDiscountValue);
                const netPrice = Math.max(0, editCustomPrice - calcDisc);
                const netDue = Math.max(0, netPrice - editPaid);
                return (
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-indigo-50 rounded-xl border border-indigo-200 font-bold text-indigo-900">
                    <span>
                      ছাড় ({editDiscountType === 'percent' ? `${editDiscountValue}%` : `৳${editDiscountValue}`}): ৳
                      {calcDisc.toLocaleString()}
                    </span>
                    <span>নিট মূল্য: ৳{netPrice.toLocaleString()}</span>
                    <span>বকেয়া: ৳{netDue.toLocaleString()}</span>
                  </div>
                );
              })()}

              {editPlan !== 'one_time' && editPlan !== 'lifetime' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    নতুন মেয়াদ নির্ধারণ (আজ থেকে কত দিন চলবে)
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={editRenewDays}
                      onChange={(e) => setEditRenewDays(e.target.value)}
                      placeholder="দিন লিখুন (যেমন: 30)"
                      className="flex-1 min-w-[100px] px-3 py-2 border border-slate-300 rounded-xl font-bold"
                    />
                    {[7, 14, 30, 90, 365].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setEditRenewDays(String(d))}
                        className="px-2.5 py-2 bg-slate-100 hover:bg-indigo-100 text-slate-700 rounded-lg font-bold"
                      >
                        {d} দিন
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  দোকানের নিরাপত্তা পাসওয়ার্ড (প্রবেশের সময় লাগবে)
                </label>
                <div className="relative">
                  <input
                    type={showEditShopPwd ? 'text' : 'password'}
                    value={editShopPassword}
                    onChange={(e) => setEditShopPassword(e.target.value)}
                    placeholder="দোকানের পাসওয়ার্ড সেট বা পরিবর্তন করুন (ঐচ্ছিক)"
                    className="w-full pl-3 pr-14 py-2 border border-slate-300 rounded-xl font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditShopPwd(!showEditShopPwd)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showEditShopPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">অ্যাডমিন নোট (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="পেমেন্ট বা ডিসকাউন্ট নোট..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingBiz(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={savingBiz}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md"
                >
                  {savingBiz ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add New Business Directly */}
      {isAddModalOpen && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">নতুন প্রেস / ব্যবসা প্রতিষ্ঠান যুক্ত করুন</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddBusinessSubmit} className="space-y-3 text-xs">
              {addBizError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                  {addBizError}
                </div>
              )}
              <div>
                <label className="block font-bold text-slate-700 mb-1">প্রতিষ্ঠানের নাম *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="যেমন: মদিনা অফসেট প্রেস"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  দোকানের নিরাপত্তা পাসওয়ার্ড * (কমপক্ষে ৪ অক্ষর)
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={newShopPassword}
                  onChange={(e) => setNewShopPassword(e.target.value)}
                  placeholder="এই দোকানে প্রবেশের গোপন পাসওয়ার্ড দিন"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">মোবাইল নম্বর</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">ঠিকানা</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="প্রতিষ্ঠানের ঠিকানা"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">প্রাথমিক প্যাকেজ</label>
                <select
                  value={newPlan}
                  onChange={(e) => setNewPlan(e.target.value as SubscriptionPlanType)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white"
                >
                  <option value="trial">ফ্রি ট্রায়াল ({saasRegistry.platformSettings.defaultTrialDays} দিন)</option>
                  <option value="monthly">মাসিক প্যাকেজ (৳{saasRegistry.platformSettings.plans.monthly.basePrice})</option>
                  <option value="yearly">বাৎসরিক প্যাকেজ (৳{saasRegistry.platformSettings.plans.yearly.basePrice})</option>
                  <option value="one_time">এককালীন / আজীবন (৳{saasRegistry.platformSettings.plans.one_time.basePrice})</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={addingBiz}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                >
                  {addingBiz ? 'যুক্ত হচ্ছে...' : 'তৈরি ও চালু করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Party Portal Account Modal (Super Admin) */}
      {editingPartyAcc && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">পার্টি পোর্টাল অ্যাকাউন্ট সম্পাদনা</h3>
                <p className="text-xs text-slate-500">{editingPartyAcc.partyName}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPartyAcc(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editPartyAccError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                {editPartyAccError}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setEditPartyAccError('');
                setSavingPartyAcc(true);
                try {
                  const chosenBiz = businesses.find((b) => b.id === editPartyBizId);
                  const res = await adminUpdatePartyAccount(editingPartyAcc.id, {
                    loginId: editPartyLoginId,
                    password: editPartyPwd,
                    status: editPartyStatus,
                    businessId: editPartyBizId,
                    businessName: chosenBiz?.name || editingPartyAcc.businessName,
                  });
                  if (res.success) {
                    setEditingPartyAcc(null);
                  } else {
                    setEditPartyAccError(res.error || 'আপডেট ব্যর্থ হয়েছে');
                  }
                } finally {
                  setSavingPartyAcc(false);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">প্রেস প্রতিষ্ঠান</label>
                <select
                  value={editPartyBizId}
                  onChange={(e) => setEditPartyBizId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-bold"
                >
                  <option value="">-- অসংযুক্ত --</option>
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">পার্টি লগইন আইডি</label>
                <input
                  type="text"
                  required
                  value={editPartyLoginId}
                  onChange={(e) => setEditPartyLoginId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">পাসওয়ার্ড (কমপক্ষে ৪ অক্ষর)</label>
                <div className="relative">
                  <input
                    type={showEditPartyPwd ? 'text' : 'password'}
                    required
                    minLength={4}
                    value={editPartyPwd}
                    onChange={(e) => setEditPartyPwd(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-xl font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPartyPwd(!showEditPartyPwd)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showEditPartyPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">অবস্থা</label>
                <select
                  value={editPartyStatus}
                  onChange={(e) => setEditPartyStatus(e.target.value as PartyPortalAccount['status'])}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-bold"
                >
                  <option value="approved">চালু (Approved)</option>
                  <option value="pending">অপেক্ষমান (Pending)</option>
                  <option value="disabled">বন্ধ (Disabled)</option>
                  <option value="rejected">বাতিল (Rejected)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setEditingPartyAcc(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={savingPartyAcc}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold"
                >
                  {savingPartyAcc ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Super Admin Staff Credential Provisioning */}
      {isStaffModalOpen && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingStaffTarget
                      ? `এক্সেস ও পাসওয়ার্ড সম্পাদনা: ${editingStaffTarget.displayName}`
                      : 'সুপার এডমিন: ইউজারনেম, পাসওয়ার্ড ও দায়িত্ব সেট করুন'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingStaffTarget
                      ? editingStaffTarget.email
                      : 'যেকোনো প্রেসের জন্য ইউজার আইডি/ইমেইল ও পাসওয়ার্ড তৈরি করুন — কর্মচারী সরাসরি লগইন করে নির্ধারিত দায়িত্ব পালন করবেন'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsStaffModalOpen(false);
                  setEditingStaffTarget(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {staffError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                {staffError}
              </div>
            )}

            <form onSubmit={handleSaveStaffUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">প্রেস / দোকান নির্বাচন করুন *</label>
                  <select
                    value={staffBizId}
                    disabled={!!editingStaffTarget}
                    onChange={(e) => setStaffBizId(e.target.value)}
                    className={`w-full px-3 py-2 border border-slate-300 rounded-xl font-bold focus:outline-indigo-500 ${
                      editingStaffTarget ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'
                    }`}
                  >
                    {businesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">রোল / পদবি *</label>
                  <select
                    value={staffRole}
                    onChange={(e) => applyStaffRolePreset(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-bold focus:outline-indigo-500"
                  >
                    <option value="manager">ম্যানেজার</option>
                    <option value="operator">মেশিন অপারেটর</option>
                    <option value="accountant">হিসাবরক্ষক</option>
                    <option value="viewer">দর্শক (Read-Only)</option>
                    <option value="admin">প্রেস অ্যাডমিন (সব মডিউল)</option>
                    <option value="super_admin">সুপার অ্যাডমিন</option>
                    <option value="custom">কাস্টম (নিজে নির্বাচন করুন)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">অবস্থা (Status)</label>
                  <select
                    value={staffStatusField}
                    onChange={(e) => setStaffStatusField(e.target.value as AppUserAccess['status'])}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-bold focus:outline-indigo-500"
                  >
                    <option value="approved">অনুমোদিত (সরাসরি লগইন)</option>
                    <option value="pending">অপেক্ষমান (Pending)</option>
                    <option value="rejected">স্থগিত (Suspended)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-200/80">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ব্যবহারকারীর নাম *</label>
                  <input
                    type="text"
                    required
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    placeholder="যেমন: মো. করিম"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-bold focus:outline-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">ইউজারনেম বা ইমেইল *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingStaffTarget}
                    value={staffIdentifier}
                    onChange={(e) => setStaffIdentifier(e.target.value)}
                    placeholder="karim1 বা mail@gmail.com"
                    className={`w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold focus:outline-indigo-500 ${
                      editingStaffTarget ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {editingStaffTarget ? 'নতুন পাসওয়ার্ড (ঐচ্ছিক)' : 'পাসওয়ার্ড * (কমপক্ষে ৬ অক্ষর)'}
                  </label>
                  <div className="relative">
                    <input
                      type={showStaffPwd ? 'text' : 'password'}
                      required={!editingStaffTarget}
                      minLength={editingStaffTarget ? undefined : 6}
                      value={staffPassword}
                      onChange={(e) => setStaffPassword(e.target.value)}
                      placeholder={editingStaffTarget ? 'পরিবর্তন করতে লিখুন...' : 'কমপক্ষে ৬ অক্ষর'}
                      className="w-full pl-3 pr-9 py-2 border border-slate-300 rounded-xl bg-white font-bold focus:outline-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowStaffPwd(!showStaffPwd)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showStaffPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="superAdminStaffReadOnly"
                  checked={staffReadOnly}
                  onChange={(e) => setStaffReadOnly(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-amber-600 cursor-pointer"
                />
                <label htmlFor="superAdminStaffReadOnly" className="cursor-pointer select-none">
                  <span className="font-bold text-amber-900 block">
                    শুধুমাত্র প্রদর্শন মোড (Read-Only):
                  </span>
                  <span className="text-amber-800 text-[11px] block">
                    নতুন ডাটা যোগ বা পরিবর্তন করতে পারবে না, কেবল অনুমোদিত মডিউল দেখতে পারবে।
                  </span>
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800 text-sm">
                    দায়িত্ব ও মডিউল অনুমতি ({Object.values(staffPerms).filter(Boolean).length} টি নির্বাচিত)
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        const all: any = { settings: true, userAccess: false };
                        ALL_CONFIGURABLE_MODULES.forEach((m) => (all[m.key] = true));
                        setStaffPerms(all);
                      }}
                      className="text-xs text-indigo-600 hover:underline font-bold"
                    >
                      সব সিলেক্ট
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        const none: any = { settings: false, userAccess: false };
                        ALL_CONFIGURABLE_MODULES.forEach((m) => (none[m.key] = false));
                        setStaffPerms(none);
                      }}
                      className="text-xs text-rose-600 hover:underline font-bold"
                    >
                      সব বাতিল
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50/50">
                  {ALL_CONFIGURABLE_MODULES.map((mod) => {
                    const checked = !!staffPerms[mod.key];
                    return (
                      <label
                        key={mod.key}
                        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                          checked
                            ? 'bg-indigo-50/70 border-indigo-200 text-indigo-950'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setStaffPerms((prev) => ({ ...prev, [mod.key]: !prev[mod.key] }))
                            }
                            className="rounded text-indigo-600"
                          />
                          <span className="font-bold">{mod.label}</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                          {mod.category}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsStaffModalOpen(false);
                    setEditingStaffTarget(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={savingStaff}
                  className="inline-flex items-center space-x-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl font-bold shadow-md"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {savingStaff
                      ? 'সংরক্ষণ হচ্ছে...'
                      : editingStaffTarget
                      ? 'পরিবর্তন সংরক্ষণ করুন'
                      : 'ইউজার ও পাসওয়ার্ড সেট করুন'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Super Admin Own Login Password Setup */}
      {isMyPwdModalOpen && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    সুপার অ্যাডমিন পাসওয়ার্ড সেট / পরিবর্তন
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {currentUser?.email || 'fileb2027@gmail.com'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMyPwdModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {myPwdError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                {myPwdError}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setMyPwdError('');
                if (myNewPwd.trim().length < 6) {
                  setMyPwdError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
                  return;
                }
                if (myNewPwd !== myConfirmPwd) {
                  setMyPwdError('দুইটি পাসওয়ার্ড মেলেনি!');
                  return;
                }
                setSavingMyPwd(true);
                try {
                  const res = await setMyLoginPassword(myNewPwd.trim());
                  if (!res.success) {
                    setMyPwdError(res.error || 'পাসওয়ার্ড সেট করা যায়নি।');
                    return;
                  }
                  setIsMyPwdModalOpen(false);
                  setSavedNotice(
                    `${currentUser?.email || 'fileb2027@gmail.com'}-এর লগইন পাসওয়ার্ড সফলভাবে সেট হয়েছে! এখন থেকে ইমেইল ও এই পাসওয়ার্ড দিয়েও লগইন করতে পারবেন।`
                  );
                  setTimeout(() => setSavedNotice(''), 7000);
                } finally {
                  setSavingMyPwd(false);
                }
              }}
              className="space-y-3 text-xs"
            >
              <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200 leading-relaxed">
                Google দিয়ে লগইন করা অবস্থায় এখান থেকে আপনার ইমেইলের জন্য পাসওয়ার্ড সেট করলে পরবর্তীতে <strong>Vercel / মোবাইল / পিসি</strong> যেকোনো জায়গা থেকে ইমেইল ও পাসওয়ার্ড দিয়ে সরাসরি লগইন করতে পারবেন।
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  নতুন পাসওয়ার্ড * (কমপক্ষে ৬ অক্ষর)
                </label>
                <div className="relative">
                  <input
                    type={showMyPwd ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={myNewPwd}
                    onChange={(e) => setMyNewPwd(e.target.value)}
                    placeholder="আপনার পছন্দের পাসওয়ার্ড লিখুন"
                    className="w-full pl-3 pr-9 py-2 border border-slate-300 rounded-xl font-bold focus:outline-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMyPwd(!showMyPwd)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showMyPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  পাসওয়ার্ড নিশ্চিত করুন *
                </label>
                <input
                  type={showMyPwd ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={myConfirmPwd}
                  onChange={(e) => setMyConfirmPwd(e.target.value)}
                  placeholder="আবার পাসওয়ার্ড লিখুন"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold focus:outline-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMyPwdModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={savingMyPwd}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl font-bold"
                >
                  {savingMyPwd ? 'সেট হচ্ছে...' : 'পাসওয়ার্ড সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="ব্যবসা প্রতিষ্ঠান মুছে ফেলুন"
        message={`আপনি কি "${deleteTarget?.name}" প্রতিষ্ঠানটি মাস্টার তালিকা থেকে মুছে ফেলতে চান?`}
        onConfirm={() => {
          if (deleteTarget) deleteRegisteredBusiness(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Delete Party Portal Account Confirm */}
      <ConfirmModal
        isOpen={!!deletePartyAccTarget}
        title="পার্টি পোর্টাল অ্যাকাউন্ট মুছে ফেলুন"
        message={`আপনি কি "${deletePartyAccTarget?.partyName}" (${deletePartyAccTarget?.loginId}) এর পোর্টাল অ্যাক্সেস মুছে ফেলতে চান?`}
        onConfirm={() => {
          if (deletePartyAccTarget) deletePartyAccount(deletePartyAccTarget.id);
          setDeletePartyAccTarget(null);
        }}
        onCancel={() => setDeletePartyAccTarget(null)}
      />

      {/* Delete Staff User Confirm */}
      <ConfirmModal
        isOpen={!!deleteStaffTarget}
        title="ব্যবহারকারী মুছে ফেলুন"
        message={`আপনি কি "${deleteStaffTarget?.displayName}" (${deleteStaffTarget?.email}) এর অ্যাক্সেস মুছে ফেলতে চান?`}
        onConfirm={() => {
          if (deleteStaffTarget) {
            deleteUserAccess(deleteStaffTarget.uid, deleteStaffTarget.businessId);
          }
          setDeleteStaffTarget(null);
        }}
        onCancel={() => setDeleteStaffTarget(null)}
      />
    </div>
  );
};
