import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { AppUserAccess, AppPermissionModule } from '../../types';
import { formatDate } from '../../utils/calculations';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  ShieldCheck,
  UserCheck,
  UserX,
  Clock,
  Edit2,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Lock,
  Unlock,
  Key,
  Users,
  Search,
  CheckSquare,
  Square,
  X,
  Save,
  Mail,
  User,
} from 'lucide-react';

interface ModuleConfig {
  key: AppPermissionModule;
  label: string;
  category: string;
  description: string;
}

const MODULES_CONFIG: ModuleConfig[] = [
  { key: 'dashboard', label: 'ড্যাশবোর্ড', category: 'সাধারণ', description: 'দৈনিক প্রেসের সার্বিক সামারি ও নোটিশ' },
  { key: 'parties', label: 'পার্টি খাতা', category: 'ব্যবসায়িক', description: 'প্রকাশনী ও কাস্টমারদের প্রোফাইল ও বাকি খাতা' },
  { key: 'books', label: 'বই ব্যবস্থাপনা', category: 'প্রোডাকশন', description: 'বইয়ের ফরম্যাট, সাইজ, ডাবল ক্রাউন ও ডাবল ডিমাই' },
  { key: 'production', label: 'ছাপা ও প্রোডাকশন', category: 'প্রোডাকশন', description: 'দৈনিক প্রিন্টিং প্রেস রিম ও প্লেট ছাপা এন্ট্রি' },
  { key: 'plates', label: 'প্লেট রেজিস্টার', category: 'প্রোডাকশন', description: 'পার্টির প্লেটের অবস্থান ও ফেরত খাতা' },
  { key: 'paperStock', label: 'কাগজ স্টক', category: 'ইনভেন্টরি', description: 'কাগজ আগমন ও মজুত স্টক হিসাব' },
  { key: 'billing', label: 'বিল ও চালান', category: 'হিসাব', description: 'ইনভয়েস তৈরি, দর নির্ধারণ ও বিল প্রিন্ট' },
  { key: 'collections', label: 'তাগাদা ও কালেকশন', category: 'হিসাব', description: 'পার্টি থেকে টাকা আদায় ও মানি রিসিট' },
  { key: 'incomeExpense', label: 'দৈনিক আয়-ব্যয় (ক্যাশ বুক)', category: 'হিসাব', description: 'দৈনিক ক্যাশ বুক ও খরচের হিসাব' },
  { key: 'inkSuppliers', label: 'কালির দোকান ও মালামাল', category: 'ইনভেন্টরি', description: 'কালি, কেমিক্যাল ক্রয় ও বাকি খাতা' },
  { key: 'employees', label: 'কর্মচারী ব্যবস্থাপনা', category: 'এইচআর', description: 'কর্মচারীর বায়োডাটা, আইডি কার্ড ও পদবি' },
  { key: 'attendance', label: 'দৈনিক হাজিরা খাতা', category: 'এইচআর', description: 'দৈনিক উপস্থিতি, ওভারটাইম ও হাজিরা এন্ট্রি' },
  { key: 'combinedAttendance', label: 'সম্মিলিত হাজিরা রিপোর্ট', category: 'এইচআর', description: 'সকল কর্মচারীর মাসিক হাজিরা ও ওভারটাইম রিপোর্ট' },
  { key: 'payroll', label: 'বেতন বিল ও পে-রোল', category: 'এইচআর', description: 'মাসিক বেতন স্লিপ, অগ্রিম কর্তন ও পরিশোধ' },
  { key: 'cutting', label: 'কাটিং ও ফিনিশিং খাতা', category: 'প্রোডাকশন', description: 'কাটিং কারিগরদের রিম কাটিং ও বিল' },
  { key: 'putti', label: 'পুট্টি / ছাঁট কাগজ বিক্রয়', category: 'ব্যবসায়িক', description: 'ছাঁট কাগজ বিক্রয় ও আয় রেজিস্টার' },
  { key: 'reports', label: 'রিপোর্ট ও বিশ্লেষণ', category: 'হিসাব', description: 'মাসিক ও বাৎসরিক লাভ-ক্ষতি ও স্টেটমেন্ট' },
  { key: 'dataMgmt', label: 'ডাটা ব্যাকআপ ও রিস্টোর', category: 'সিস্টেম', description: 'অনুমোদিত মডিউলের অনলাইন/অফলাইন ব্যাকআপ ও রিস্টোর (রিসেট শুধু অ্যাডমিন/ম্যানেজার)' },
  { key: 'settings', label: 'প্রেস ও কোম্পানি সেটিংস', category: 'সিস্টেম', description: 'প্রেসের নাম, ঠিকানা, রেট ও এডমিন পিন' },
];

export const UserAccessManager: React.FC = () => {
  const { db, currentUser, isMainAdmin, updateUserAccess, deleteUserAccess } = useDatabase();

  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<AppUserAccess | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    uid: string;
    email: string;
  }>({ isOpen: false, uid: '', email: '' });

  // Permissions form in modal
  const [editRole, setEditRole] = useState<AppUserAccess['role']>('operator');
  const [editStatus, setEditStatus] = useState<AppUserAccess['status']>('approved');
  const [editIsReadOnly, setEditIsReadOnly] = useState<boolean>(false);
  const [editPermissions, setEditPermissions] = useState<Record<AppPermissionModule, boolean>>({
    dashboard: true,
    parties: false,
    books: false,
    production: false,
    plates: false,
    paperStock: false,
    billing: false,
    collections: false,
    incomeExpense: false,
    inkSuppliers: false,
    employees: false,
    attendance: false,
    combinedAttendance: false,
    payroll: false,
    cutting: false,
    putti: false,
    reports: false,
    dataMgmt: false,
    settings: false,
    userAccess: false,
  });

  const usersList = db.userAccessList || [];

  const filteredUsers = usersList.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.displayName.toLowerCase().includes(search.toLowerCase())
  );

  const openEditModal = (user: AppUserAccess) => {
    setSelectedUser(user);
    setEditRole(user.role);
    setEditStatus(user.status);
    setEditIsReadOnly(user.role === 'viewer' || !!user.isReadOnly);
    setEditPermissions({
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
    });
    setIsEditModalOpen(true);
  };

  // Quick preset: Attendance Supervisor (Only Daily Attendance)
  const applyAttendanceOnlyPreset = () => {
    setEditRole('custom');
    setEditIsReadOnly(false);
    setEditPermissions({
      dashboard: false,
      parties: false,
      books: false,
      production: false,
      plates: false,
      paperStock: false,
      billing: false,
      collections: false,
      incomeExpense: false,
      inkSuppliers: false,
      employees: false,
      attendance: true,
      combinedAttendance: false,
      payroll: false,
      cutting: false,
      putti: false,
      reports: false,
      dataMgmt: false,
      settings: false,
      userAccess: false,
    });
  };

  // Quick preset application based on role
  const handleRolePreset = (role: AppUserAccess['role']) => {
    setEditRole(role);
    if (role === 'viewer') {
      setEditIsReadOnly(true);
      setEditPermissions({
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
      setEditIsReadOnly(false);
      const allTrue: any = {};
      MODULES_CONFIG.forEach((m) => (allTrue[m.key] = true));
      allTrue.userAccess = role === 'super_admin';
      setEditPermissions(allTrue);
    } else if (role === 'manager') {
      setEditIsReadOnly(false);
      setEditPermissions({
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
      setEditPermissions({
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
      setEditPermissions({
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

  const selectAllModules = () => {
    const updated: any = {};
    MODULES_CONFIG.forEach((m) => (updated[m.key] = true));
    setEditPermissions(updated);
  };

  const deselectAllModules = () => {
    const updated: any = {};
    MODULES_CONFIG.forEach((m) => (updated[m.key] = false));
    setEditPermissions(updated);
  };

  const toggleModule = (key: AppPermissionModule) => {
    setEditPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSaveAccess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    updateUserAccess(selectedUser.uid, {
      role: editRole,
      status: editStatus,
      isReadOnly: editIsReadOnly,
      permissions: editPermissions,
    });

    setIsEditModalOpen(false);
  };

  const handleQuickApprove = (user: AppUserAccess) => {
    // Default approve as operator with basic permissions or existing
    updateUserAccess(user.uid, {
      status: 'approved',
      role: user.role === 'custom' ? 'operator' : user.role,
      permissions:
        user.permissions && Object.values(user.permissions).some(Boolean)
          ? user.permissions
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
    });
  };

  const handleQuickReject = (user: AppUserAccess) => {
    updateUserAccess(user.uid, {
      status: 'rejected',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
                  ব্যবহারকারী ও এক্সেস নিয়ন্ত্রণ (RBAC)
                </h1>
                <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  সিকিউরিটি গেট
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                একাউন্ট অনুমোদন করুন এবং কোন কর্মচারী কোন কোন মডিউল দেখতে ও কাজ করতে পারবে তা নির্দিষ্ট করুন
              </p>
            </div>
          </div>
        </div>

        {/* Super Admin Notice Card */}
        <div className="mt-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-amber-300">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base">মেইন সুপার অ্যাডমিন:</span>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  fileb2027@gmail.com
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                এই আইডির সর্বদা ১০০% সব মডিউলে পূর্ণ এক্সেস থাকবে। অন্য কোনো ব্যবহারকারী অনুমোদন না পাওয়া পর্যন্ত প্রেসের কোনো তথ্য দেখতে পারবে না।
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200 space-y-4">
        {/* Search & Counter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="নাম বা ইমেইল দিয়ে খুঁজুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl font-bold">
              মোট নিবন্ধিত ব্যবহারকারী: {usersList.length} জন
            </span>
            <span className="bg-amber-100 text-amber-800 px-3 py-1.5 rounded-xl font-bold">
              অপেক্ষমান: {usersList.filter((u) => u.status === 'pending').length} জন
            </span>
          </div>
        </div>

        {/* Users Table */}
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-600 text-sm font-semibold">কোনো ব্যবহারকারী পাওয়া যায়নি</p>
            <p className="text-slate-400 text-xs mt-1">
              কেউ অ্যাপে গুগল দিয়ে সাইন-ইন করলে এখানে স্বয়ংক্রিয়ভাবে তার তালিকা ও অনুমোদনের রিকোয়েস্ট চলে আসবে
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-xl">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">ব্যবহারকারী</th>
                  <th className="py-3 px-3">ইমেইল</th>
                  <th className="py-3 px-3 text-center">অবস্থা (Status)</th>
                  <th className="py-3 px-3 text-center">রোল / পদবি</th>
                  <th className="py-3 px-3 text-center">অনুমোদিত মডিউল</th>
                  <th className="py-3 px-3">অনুরোধের তারিখ</th>
                  <th className="py-3 px-3 text-right">এক্সেস কন্ট্রোল</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => {
                  const isMain = user.email.toLowerCase() === 'fileb2027@gmail.com';
                  const activeModulesCount = user.permissions
                    ? Object.values(user.permissions).filter(Boolean).length
                    : 0;

                  return (
                    <tr key={user.uid} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3 font-bold text-slate-800">
                        <div className="flex items-center space-x-2.5">
                          {user.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt={user.displayName}
                              className="w-8 h-8 rounded-full border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0">
                              {(user.displayName || user.email || 'U')[0].toUpperCase()}
                            </div>
                          )}
                          <div className="truncate">
                            <div className="truncate">{user.displayName || 'নামহীন'}</div>
                            {isMain && (
                              <span className="text-[10px] text-amber-600 font-bold block">
                                ★ মেইন সুপার অ্যাডমিন
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-slate-600 font-mono">{user.email}</td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {user.status === 'approved' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-emerald-100 text-emerald-800">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>অনুমোদিত</span>
                          </span>
                        ) : user.status === 'pending' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-amber-100 text-amber-800 animate-pulse">
                            <Clock className="w-3.5 h-3.5" />
                            <span>অপেক্ষমান</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-rose-100 text-rose-800">
                            <UserX className="w-3.5 h-3.5" />
                            <span>স্থগিত / বাতিল</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex flex-col items-center gap-1">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded-md text-[11px]">
                            {user.role === 'super_admin'
                              ? 'সুপার অ্যাডমিন'
                              : user.role === 'admin'
                              ? 'অ্যাডমিন'
                              : user.role === 'manager'
                              ? 'ম্যানেজার'
                              : user.role === 'accountant'
                              ? 'হিসাবরক্ষক'
                              : user.role === 'operator'
                              ? 'অপারেটর'
                              : user.role === 'viewer'
                              ? 'দর্শক (Viewer)'
                              : 'কাস্টম'}
                          </span>
                          {(user.role === 'viewer' || user.isReadOnly) && (
                            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">
                              🔒 শুধু দেখা (Read-Only)
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {isMain || user.role === 'super_admin' ? (
                          <span className="text-emerald-700 font-bold text-xs">
                            সব মডিউল ({MODULES_CONFIG.length}টি)
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-700">
                            {activeModulesCount} টি মডিউল
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                        {formatDate(user.requestedAt?.split('T')[0] || '')}
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          {user.status === 'pending' && !isMain && (
                            <button
                              onClick={() => handleQuickApprove(user)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition"
                              title="অনুমোদন করুন"
                            >
                              অনুমোদন
                            </button>
                          )}

                          {user.status === 'approved' && !isMain && (
                            <button
                              onClick={() => handleQuickReject(user)}
                              className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded-lg text-xs transition"
                              title="এক্সেস স্থগিত করুন"
                            >
                              স্থগিত
                            </button>
                          )}

                          <button
                            onClick={() => openEditModal(user)}
                            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition"
                            title="মডিউল পারমিশন পরিবর্তন করুন"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {!isMain && (
                            <button
                              onClick={() =>
                                setDeleteConfirm({
                                  isOpen: true,
                                  uid: user.uid,
                                  email: user.email,
                                })
                              }
                              className="p-1.5 hover:bg-rose-100 rounded-lg text-rose-600 transition"
                              title="মুছে ফেলুন"
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
        )}
      </div>

      {/* ==================================================== */}
      {/* MODAL: EDIT USER ROLE & GRANULAR PERMISSIONS        */}
      {/* ==================================================== */}
      {isEditModalOpen && selectedUser && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    এক্সেস পারমিশন পরিবর্তন: {selectedUser.displayName}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAccess} className="space-y-4 text-xs">
              {/* Row 1: Approval Status & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">একাউন্টের অবস্থা (Status)</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-bold focus:outline-indigo-500"
                  >
                    <option value="approved">অনুমোদিত (Approved - অ্যাক্টিভ)</option>
                    <option value="pending">অপেক্ষমান (Pending - ব্লকড)</option>
                    <option value="rejected">স্থগিত / অননুমোদিত (Suspended)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">রোল ও পদবি (Presets)</label>
                  <select
                    value={editRole}
                    onChange={(e) => handleRolePreset(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-bold focus:outline-indigo-500"
                  >
                    <option value="operator">মেশিন অপারেটর (ছাপা, বই, প্লেট, কাটিং)</option>
                    <option value="manager">ম্যানেজার (প্রোডাকশন, বিলিং, পার্টি, রিপোর্ট)</option>
                    <option value="accountant">হিসাবরক্ষক (বিলিং, ক্যাশ বুক, পে-রোল)</option>
                    <option value="viewer">দর্শক / শুধুমাত্র প্রদর্শন (Read-Only Viewer - পরিবর্তন নিষিদ্ধ)</option>
                    <option value="admin">অ্যাডমিন (সব মডিউল এক্সেস)</option>
                    <option value="super_admin">সুপার অ্যাডমিন (পূর্ণ এক্সেস)</option>
                    <option value="custom">কাস্টম এক্সেস (নিজে নির্বাচন করুন)</option>
                  </select>
                </div>
              </div>

              {/* Dedicated Quick-Preset Bar + Read-Only Mode Card */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-indigo-50/70 border border-indigo-200 rounded-xl p-2.5">
                <span className="text-[11px] font-bold text-indigo-950">দ্রুত এক্সেস প্রিসেট:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={applyAttendanceOnlyPreset}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition"
                  >
                    ✓ শুধু দৈনিক হাজিরা এক্সেস
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRolePreset('viewer')}
                    className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition"
                  >
                    🔒 শুধু প্রদর্শন (Read-Only)
                  </button>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="editIsReadOnlyCheck"
                  checked={editIsReadOnly}
                  onChange={(e) => setEditIsReadOnly(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="editIsReadOnlyCheck" className="cursor-pointer select-none space-y-0.5">
                  <span className="font-bold text-amber-900 block text-xs">
                    শুধুমাত্র প্রদর্শন এক্সেস (Read-Only Mode):
                  </span>
                  <span className="text-amber-800 text-[11px] block leading-tight">
                    ব্যবহারকারী সকল অনুমোদিত মডিউল দেখতে ও সার্চ অপশন ব্যবহার করতে পারবে, কিন্তু নতুন কোনো ডাটা যোগ, পরিবর্তন বা মুছে ফেলতে পারবে না।
                  </span>
                </label>
              </div>

              {/* Granular Module Checkboxes Header */}
              <div className="flex items-center justify-between pt-1">
                <span className="font-bold text-slate-800 text-sm">
                  মডিউলভিত্তিক এক্সেস পারমিশন ({Object.values(editPermissions).filter(Boolean).length}/
                  {MODULES_CONFIG.length} টি নির্বাচিত)
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={selectAllModules}
                    className="text-xs text-indigo-600 hover:underline font-bold"
                  >
                    সব সিলেক্ট করুন
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={deselectAllModules}
                    className="text-xs text-rose-600 hover:underline font-bold"
                  >
                    সব বাতিল করুন
                  </button>
                </div>
              </div>

              {/* Checkboxes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50/50">
                {MODULES_CONFIG.map((mod) => {
                  const isChecked = !!editPermissions[mod.key];
                  return (
                    <label
                      key={mod.key}
                      onClick={() => toggleModule(mod.key)}
                      className={`flex items-start space-x-2.5 p-2.5 rounded-xl border transition cursor-pointer ${
                        isChecked
                          ? 'bg-indigo-50/60 border-indigo-200 text-indigo-950'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by parent onClick
                        className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">{mod.label}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-medium">
                            {mod.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                          {mod.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-bold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center space-x-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20"
                >
                  <Save className="w-4 h-4" />
                  <span>পারমিশন সংরক্ষণ করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="ব্যবহারকারী মুছে ফেলুন"
        message={`আপনি কি "${deleteConfirm.email}" ব্যবহারকারীকে সিস্টেম থেকে মুছে ফেলতে চান? পরবর্তীতে তিনি আবার লগইন করলে পুনরায় পেন্ডিং লিস্টে যুক্ত হবেন।`}
        onConfirm={() => {
          deleteUserAccess(deleteConfirm.uid);
          setDeleteConfirm({ isOpen: false, uid: '', email: '' });
        }}
        onCancel={() => setDeleteConfirm({ isOpen: false, uid: '', email: '' })}
      />
    </div>
  );
};
