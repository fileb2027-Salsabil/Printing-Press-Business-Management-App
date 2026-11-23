import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { Lock, Unlock, Key, X, AlertCircle, ShieldAlert } from 'lucide-react';

interface AdminPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  title?: string;
  description?: string;
}

export const AdminPasswordModal: React.FC<AdminPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'অ্যাডমিন প্যানেলে প্রবেশের পাসওয়ার্ড',
  description = 'প্রেসের ইউজার পারমিশন, কোম্পানি সেটিংস ও ডেটাবেজ ব্যবস্থাপনায় প্রবেশের জন্য মেইন অ্যাডমিন পাসওয়ার্ড দিন।',
}) => {
  const { unlockAdminPanel } = useDatabase();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password.trim()) {
      setError('পাসওয়ার্ড লিখুন');
      return;
    }

    const res = unlockAdminPanel(password);
    if (res.success) {
      setPassword('');
      setError('');
      if (onSuccess) onSuccess();
      onClose();
    } else {
      setError(res.error || 'ভুল পাসওয়ার্ড!');
    }
  };

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 my-auto max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">{title}</h3>
              <p className="text-[11px] text-slate-500">মেইন অ্যাডমিন সুরক্ষা গেট</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 text-xs text-amber-900 flex items-start space-x-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{description}</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              মেইন অ্যাডমিন পাসওয়ার্ড *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="এডমিন পাসওয়ার্ড দিন"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                required
                className="w-full pl-9 pr-14 py-2.5 border border-slate-300 rounded-xl focus:outline-amber-500 font-medium text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 text-[11px] font-bold"
              >
                {showPassword ? 'লুকান' : 'দেখুন'}
              </button>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-bold"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl font-bold shadow-md transition flex items-center space-x-1.5"
            >
              <Unlock className="w-3.5 h-3.5 text-amber-400" />
              <span>আনলক করুন</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
