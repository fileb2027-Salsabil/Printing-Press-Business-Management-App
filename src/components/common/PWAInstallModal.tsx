import React, { useEffect, useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { getCurrentOriginUrl, getSharedAppUrl, isDevPreviewOrigin } from '../../utils/appUrl';
import {
  Smartphone,
  Monitor,
  Download,
  Share2,
  CheckCircle,
  X,
  ExternalLink,
  ShieldCheck,
  WifiOff,
  Sparkles,
  Copy,
  Check,
  FileDown,
  Info,
  RefreshCw,
  Users,
  AlertTriangle,
} from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [activeDeviceTab, setActiveDeviceTab] = useState<'mobile' | 'pc' | 'sync'>('mobile');
  const [installSuccess, setInstallSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState<string | null>(null);
  const [sharedStatus, setSharedStatus] = useState<'checking' | 'live' | 'unpublished'>('checking');
  const [checkNonce, setCheckNonce] = useState(0);

  const currentOrigin = getCurrentOriginUrl();
  const sharedAppUrl = getSharedAppUrl();
  const onDevPreview = isDevPreviewOrigin(currentOrigin);

  useEffect(() => {
    if (!isOpen) return;
    if (!onDevPreview) {
      setSharedStatus('live');
      return;
    }

    let cancelled = false;
    setSharedStatus('checking');

    const img = new Image();
    const timer = window.setTimeout(() => {
      if (!cancelled) {
        setSharedStatus('unpublished');
      }
    }, 3500);

    img.onload = () => {
      if (!cancelled) {
        window.clearTimeout(timer);
        setSharedStatus('live');
      }
    };
    img.onerror = () => {
      if (!cancelled) {
        window.clearTimeout(timer);
        setSharedStatus('unpublished');
      }
    };
    img.src = `${sharedAppUrl}/pwa-192x192.png?v=${Date.now()}`;

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
    };
  }, [isOpen, onDevPreview, sharedAppUrl, checkNonce]);

  if (!isOpen) return null;

  // Use Shared App URL whenever it is published/live; otherwise fall back to active working origin so New Tab never opens a 404 page
  const appUrl = !onDevPreview || sharedStatus === 'live' ? sharedAppUrl : currentOrigin;
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => {
        onClose();
        setInstallSuccess(false);
      }, 1500);
    }
  };

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // 1. Download Windows Desktop Shortcut (.url file)
  const handleDownloadWindowsShortcut = () => {
    const content = `[InternetShortcut]\r\nURL=${appUrl}\r\nIconIndex=0\r\n`;
    const blob = new Blob([content], { type: 'application/internet-shortcut' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Makkah-Printers.url';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadSuccessMsg('উইন্ডোজ ডেস্কটপ শর্টকাট (.url) ডাউনলোড হয়েছে! এটি আপনার কম্পিউটারের Desktop-এ রাখুন।');
    setTimeout(() => setDownloadSuccessMsg(null), 5000);
  };

  // 2. Download Standalone Launcher (.html file)
  const handleDownloadHtmlLauncher = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>মক্কা প্রিন্টার্স - লঞ্চার</title>
  <meta http-equiv="refresh" content="0; url=${appUrl}">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #064e3b 0%, #0f172a 100%);
      color: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      text-align: center;
      padding: 20px;
    }
    .card {
      background: rgba(255, 255, 255, 0.1);
      padding: 30px;
      border-radius: 20px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      max-width: 400px;
    }
    h2 { margin-top: 0; color: #6ee7b7; font-size: 24px; }
    p { font-size: 14px; color: #cbd5e1; line-height: 1.6; }
    a {
      display: inline-block;
      margin-top: 20px;
      background: #059669;
      color: white;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 12px;
      font-weight: bold;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
    }
    a:hover { background: #10b981; }
  </style>
</head>
<body>
  <div class="card">
    <h2>মক্কা প্রিন্টার্স</h2>
    <p>প্রেস ম্যানেজমেন্ট সফটওয়্যার চালু হচ্ছে...</p>
    <p>স্বয়ংক্রিয়ভাবে ওপেন না হলে নিচের বোতামে চাপ দিন:</p>
    <a href="${appUrl}">সফটওয়্যার ওপেন করুন</a>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Makkah-Printers-App.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadSuccessMsg('অ্যাপ লঞ্চার ফাইল (.html) ডাউনলোড হয়েছে! যেকোনো ডিভাইসে ডাবল ক্লিক করে এটি খুলতে পারবেন।');
    setTimeout(() => setDownloadSuccessMsg(null), 5000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-900 text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
              ম
            </div>
            <div>
              <h3 className="text-base font-black text-slate-950 flex items-center space-x-1.5">
                <span>অ্যাপ ডাউনলোড ও ব্যবহার কেন্দ্র</span>
                <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                মোবাইল ও কম্পিউটারে ফুল-স্ক্রিন অ্যাপ হিসেবে চালানোর সহজ উপায়
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Download Success Message */}
        {downloadSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{downloadSuccessMsg}</span>
          </div>
        )}

        {/* Action Center: Direct Actions for Mobile & Computer */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-2xl text-white space-y-4 shadow-lg border border-slate-800">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
              সরাসরি ডাউনলোড ও খোলার বোতাম
            </span>
            <h4 className="text-sm font-bold text-white mt-0.5">
              {!onDevPreview || sharedStatus === 'live'
                ? 'যেকোনো ডিভাইসে ব্যবহারের পাবলিক লিংক:'
                : 'বর্তমান কার্যকরী অ্যাপ লিংক:'}
            </h4>
          </div>

          {/* Clean URL Box */}
          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={appUrl}
              className="bg-transparent text-[11px] text-emerald-300 font-mono flex-1 outline-hidden select-all"
            />
            <button
              onClick={handleCopyLink}
              className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shrink-0 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'কপি হয়েছে' : 'কপি করুন'}</span>
            </button>
          </div>
          {!onDevPreview || sharedStatus === 'live' ? (
            <p className="text-[10px] text-emerald-300/90">
              ✓ এই পাবলিক লিংকটি যেকোনো মোবাইল, কম্পিউটার ও ব্রাউজারে সরাসরি কাজ করে।
            </p>
          ) : sharedStatus === 'checking' ? (
            <p className="text-[10px] text-slate-300 flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
              <span>পাবলিক শেয়ার লিংক যাচাই করা হচ্ছে...</span>
            </p>
          ) : (
            <div className="bg-amber-500/15 border border-amber-500/40 p-2.5 rounded-xl text-[11px] text-amber-100 space-y-1.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <b>পাবলিক লিংক এখনো চালু (Share/Publish) হয়নি:</b> এখন <b>ais-pre-</b> লিংকটি সার্ভার থেকে 404 দেখাচ্ছে। সব মোবাইল ও অন্য মানুষের ফোনে চালানোর জন্য Google AI Studio-এর উপরে ডানদিকে <b>Share / Deploy</b> বাটনে ক্লিক করে পাবলিশ করুন—তারপর এই লিংকটি স্বয়ংক্রিয়ভাবে সবার জন্য চালু হয়ে যাবে।
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 pl-6">
                <button
                  type="button"
                  onClick={() => setCheckNonce((n) => n + 1)}
                  className="px-2 py-0.5 bg-amber-500/25 hover:bg-amber-500/40 border border-amber-400/40 rounded-md text-[10px] font-bold text-amber-200 inline-flex items-center gap-1 transition"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>পুনরায় যাচাই করুন</span>
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* 1. Open in Full Browser Tab */}
            <a
              href={appUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition shadow-xs"
            >
              <ExternalLink className="w-4 h-4" />
              <span>নতুন ব্রাউজার ট্যাবে খুলুন</span>
            </a>

            {/* 2. Download Desktop Shortcut File */}
            <button
              onClick={handleDownloadWindowsShortcut}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition border border-slate-700"
            >
              <Download className="w-4 h-4" />
              <span>ডেস্কটপ শর্টকাট ডাউনলোড (.url)</span>
            </button>

            {/* 3. Download HTML Launcher */}
            <button
              onClick={handleDownloadHtmlLauncher}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition border border-slate-700 sm:col-span-2"
            >
              <FileDown className="w-4 h-4" />
              <span>সরাসরি অ্যাপ ফাইল ডাউনলোড করুন (.html লঞ্চার)</span>
            </button>
          </div>

          {/* 1-Click Native Install if already in browser */}
          {isInstallable && !isInstalled && (
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-300">ব্রাউজার ইনস্টল প্রস্তুত:</span>
              <button
                onClick={handleInstallClick}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black shadow-xs flex items-center space-x-1.5 transition"
              >
                <Download className="w-4 h-4" />
                <span>সরাসরি ১-ক্লিকে ইনস্টল করুন</span>
              </button>
            </div>
          )}

          {/* Preview Warning Notice */}
          {isInIframe && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl text-[11px] text-amber-200 flex items-start space-x-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <b>প্রিভিউ নোট:</b> সব ডিভাইস ও ব্রাউজারে কাজ করতে অ্যাপটি AI Studio থেকে <b>Share / Deploy</b> করে পাবলিক লিংকটি মোবাইলের <b>Chrome</b> ব্রাউজারে খুলুন।
              </span>
            </div>
          )}
        </div>

        {installSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>অভিনন্দন! অ্যাপ সফলভাবে ইন্সটল হয়েছে।</span>
          </div>
        )}

        {/* Device Switcher Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveDeviceTab('mobile')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
              activeDeviceTab === 'mobile'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
            <span>মোবাইল</span>
          </button>

          <button
            onClick={() => setActiveDeviceTab('pc')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
              activeDeviceTab === 'pc'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Monitor className="w-3.5 h-3.5 text-indigo-600" />
            <span>কম্পিউটার</span>
          </button>

          <button
            onClick={() => setActiveDeviceTab('sync')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
              activeDeviceTab === 'sync'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
            <span>একই একাউন্টে সিঙ্ক</span>
          </button>
        </div>

        {/* Tab 1: Mobile Guide */}
        {activeDeviceTab === 'mobile' && (
          <div className="space-y-3.5 text-xs">
            {/* Android Instructions */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <span className="font-bold text-slate-900 flex items-center space-x-1.5 text-xs">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">
                  ১
                </span>
                <span>অ্যান্ড্রয়েড মোবাইলে ইন্সটল করার ৩টি সহজ ধাপ:</span>
              </span>
              <ol className="list-decimal pl-5 space-y-1.5 text-slate-600 text-[11px] leading-relaxed">
                <li>
                  উপরের <b>"অ্যাপের লিংক কপি করুন"</b> চাপুন এবং আপনার মোবাইলের <b>Google Chrome</b> ব্রাউজারে পেস্ট করে খুলুন।
                </li>
                <li>
                  ক্রোমের উপরে ডানপাশের <b>তিন ডট (⋮)</b> মেন্যুতে চাপ দিন।
                </li>
                <li>
                  তালিকা থেকে <strong className="text-emerald-800">"Install app"</strong> অথবা <strong className="text-emerald-800">"Add to Home screen" (হোম স্ক্রিনে যোগ করুন)</strong> চাপুন।
                </li>
                <li>
                  আপনার মোবাইলের স্ক্রিনে <b>"মক্কা প্রেস"</b> অ্যাপের গোল লোগো চলে আসবে। এরপর থেকে ইন্টারনেট ছাড়াও অ্যাপের মতো টাচ করলেই খুলবে।
                </li>
              </ol>
            </div>

            {/* iPhone / iPad Instructions */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <span className="font-bold text-slate-900 flex items-center space-x-1.5 text-xs">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-[10px]">
                  ২
                </span>
                <span>আইফোন বা আইপ্যাডে (Apple Safari):</span>
              </span>
              <ol className="list-decimal pl-5 space-y-1.5 text-slate-600 text-[11px] leading-relaxed">
                <li>আইফোনের <strong>Safari</strong> ব্রাউজারে অ্যাপের লিংকটি খুলুন।</li>
                <li>
                  নিচের মেন্যুবারে <strong>Share বাটন</strong> (<Share2 className="w-3 h-3 inline text-blue-600" /> বক্সের উপর তীর চিহ্ন) চাপুন।
                </li>
                <li>
                  তালিকা থেকে একটু নিচে গিয়ে <strong className="text-indigo-800">"Add to Home Screen"</strong> বেছে নিন।
                </li>
                <li>উপরে ডানদিকে <strong>Add</strong> চাপলেই আইফোনে অ্যাপ তৈরি হয়ে যাবে।</li>
              </ol>
            </div>
          </div>
        )}

        {/* Tab 2: Computer / Laptop Guide */}
        {activeDeviceTab === 'pc' && (
          <div className="space-y-3.5 text-xs">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <span className="font-bold text-slate-900 flex items-center space-x-1.5 text-xs">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-[10px]">
                  ১
                </span>
                <span>কম্পিউটার বা ল্যাপটপে চালানোর নিয়ম:</span>
              </span>
              <ol className="list-decimal pl-5 space-y-1.5 text-slate-600 text-[11px] leading-relaxed">
                <li>
                  <b>পদ্ধতি ১ (সরাসরি শর্টকাট):</b> উপরের <b>"ডেস্কটপ শর্টকাট ডাউনলোড (.url)"</b> বোতামে ক্লিক করুন। ডাউনলোড হওয়া ফাইলটি আপনার Desktop-এ রেখে দিলেই যে কোনো সময় ডাবল ক্লিকে সফটওয়্যার ওপেন হবে।
                </li>
                <li>
                  <b>পদ্ধতি ২ (ব্রাউজার ইনস্টল):</b> গুগল ক্রোম বা এজ ব্রাউজারের অ্যাড্রেস বারের ডানপাশে থাকা <b>কম্পিউটার/ইনস্টল আইকন (⊕ বা 🖥️)</b> এ ক্লিক করে <strong className="text-emerald-800">"Install"</strong> চাপুন।
                </li>
                <li>
                  উইন্ডোজ স্টার্ট মেন্যু ও টাস্কবারে মক্কা প্রেস সফটওয়্যারের আইকন যুক্ত হবে এবং সাধারণ সফটওয়্যারের মতো ফুল-স্ক্রিনে ওপেন হবে।
                </li>
              </ol>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-[11px] text-emerald-900 space-y-1">
              <span className="font-bold block">💡 কিবোর্ড শর্টকাট পরামর্শ:</span>
              <p>
                সারাদিন ব্যবহারের জন্য ব্রাউজারে কিবোর্ডের <strong>Ctrl + D</strong> চেপে বুকমার্ক করে রাখতে পারেন।
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Same Account Sync Guide */}
        {activeDeviceTab === 'sync' && (
          <div className="space-y-3.5 text-xs">
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2.5">
              <span className="font-bold text-emerald-950 flex items-center space-x-1.5 text-xs">
                <Users className="w-4 h-4 text-emerald-700" />
                <span>একই একাউন্টে মোবাইল ও কম্পিউটার সিঙ্ক করার নিয়ম:</span>
              </span>
              <ol className="list-decimal pl-5 space-y-2 text-slate-700 text-[11px] leading-relaxed">
                <li>
                  <b>ধাপ ১:</b> কম্পিউটার এবং মোবাইল—উভয় ডিভাইসেই অ্যাপের লিংকটি খুলুন।
                </li>
                <li>
                  <b>ধাপ ২:</b> উপরের নেভিগেশন বারের ডানপাশে থাকা <strong className="text-indigo-700">"গুগল লগইন (সিঙ্ক)"</strong> বোতামে চাপ দিন।
                </li>
                <li>
                  <b>ধাপ ৩:</b> আপনার মোবাইল ও কম্পিউটার দুটোতেই <b>একই Google Email</b> দিয়ে সাইন-ইন করুন।
                </li>
                <li>
                  <b>ধাপ ৪:</b> লগইন হয়ে গেলেই স্বয়ংক্রিয়ভাবে <strong className="text-emerald-800">"লাইভ সিঙ্ক"</strong> চালু হয়ে যাবে। মোবাইলে কোনো পার্টি, লেজার বা বিল এন্ট্রি করলে কয়েক সেকেন্ডের মধ্যেই কম্পিউটারের স্ক্রিনে ভেসে উঠবে!
                </li>
              </ol>
            </div>

            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl text-[11px] text-indigo-950 space-y-1">
              <span className="font-bold block flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-700" />
                <span>অফলাইন এবং অনলাইনে নিরাপদ ব্যাকআপ:</span>
              </span>
              <p className="text-slate-600">
                কখনো ইন্টারনেট সংযোগ বিচ্ছিন্ন হলেও কোনো সমস্যা নেই—ডাটা আপনার মোবাইলে বা পিসির অফলাইন স্টোরেজে নিরাপদে জমা থাকবে। ইন্টারনেট পেলে স্বয়ংক্রিয়ভাবে ব্যাকআপ নিয়ে অন্য ডিভাইসে আপডেট হয়ে যাবে।
              </p>
            </div>
          </div>
        )}

        {/* Offline & Multi-Year Highlights */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-start space-x-2">
            <WifiOff className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 block">১০০% অফলাইন কার্যকর</span>
              <span className="text-[10px] text-slate-500">
                ইন্টারনেট না থাকলেও মোবাইল ও পিসিতে সমস্ত হিসাব স্বয়ংক্রিয়ভাবে সেভ থাকে।
              </span>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 block">যত বছর ইচ্ছা হিসাব</span>
              <span className="text-[10px] text-slate-500">
                ১০+ বছর বা আজীবন হিসাব সংরক্ষিত থাকবে, কখনো পুরনো বছরের ডাটা ডিলিট হবে না।
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            বুঝেছি, বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
