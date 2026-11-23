import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';
import { Download, Smartphone, HelpCircle } from 'lucide-react';

export const PWAInstallButton: React.FC<{ variant?: 'header' | 'sidebar' | 'banner' }> = ({
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (!success) {
        setIsModalOpen(true);
      }
    } else {
      setIsModalOpen(true);
    }
  };

  if (variant === 'sidebar') {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full mt-2 px-3 py-2 bg-gradient-to-r from-emerald-800 to-emerald-950 hover:from-emerald-700 hover:to-emerald-900 text-white rounded-xl text-xs font-bold flex items-center justify-between border border-emerald-700/50 shadow-xs transition"
        >
          <div className="flex items-center space-x-2">
            <Smartphone className="w-4 h-4 text-emerald-300" />
            <span>মোবাইল / পিসি অ্যাপ</span>
          </div>
          <span className="text-[10px] bg-emerald-700/80 px-1.5 py-0.5 rounded text-emerald-100">
            গাইড
          </span>
        </button>
        <PWAInstallModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition shrink-0"
        title="মোবাইল বা কম্পিউটারে অ্যাপ ডাউনলোড ও ইনস্টল করুন"
      >
        <Download className="w-3.5 h-3.5 text-emerald-700" />
        <span className="hidden sm:inline">অ্যাপ ডাউনলোড / ইনস্টল</span>
        <span className="sm:hidden">ডাউনলোড</span>
      </button>
      <PWAInstallModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
