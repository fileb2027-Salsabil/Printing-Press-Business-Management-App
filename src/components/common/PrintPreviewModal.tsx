import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  ExternalLink,
  Download,
  Copy,
  Check,
  X,
  FileText,
  ChevronDown,
  FileCode,
  CheckCircle2,
  ArrowLeft,
  SlidersHorizontal,
} from 'lucide-react';
import { exportToPdf, exportToHtml, exportToText } from '../../utils/pdfExport';

interface PrintEventDetail {
  target?: HTMLElement | string | null;
  title?: string;
  html?: string;
  mode?: 'print' | 'pdf';
}

export const PrintPreviewModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [contentHtml, setContentHtml] = useState('');
  const [docTitle, setDocTitle] = useState('Press Business Management - প্রিন্ট ভিউ');
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Custom PDF controls (accessible anywhere via PrintPreviewModal & Navbar PDF button)
  const [showPdfOptions, setShowPdfOptions] = useState(false);
  const [customFilename, setCustomFilename] = useState('');
  const [pdfPaperSize, setPdfPaperSize] = useState<'a4' | 'a5' | 'legal'>('a4');
  const [pdfOrientation, setPdfOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [pdfMargin, setPdfMargin] = useState<number>(8);
  const [pdfScale, setPdfScale] = useState<number>(2);

  useEffect(() => {
    const handlePrintEvent = (e: Event) => {
      const customEvent = e as CustomEvent<PrintEventDetail>;
      const detail = customEvent.detail || {};

      let targetEl: HTMLElement | null = null;
      if (typeof detail.target === 'string') {
        targetEl = document.querySelector(detail.target) as HTMLElement;
      } else if (detail.target instanceof HTMLElement) {
        targetEl = detail.target;
      }

      if (!targetEl) {
        targetEl =
          (document.querySelector('.print-container') as HTMLElement) ||
          (document.querySelector('.print-area') as HTMLElement) ||
          (document.querySelector('main') as HTMLElement);
      }

      const html = detail.html || (targetEl ? targetEl.innerHTML : '');
      const title = detail.title || document.title || 'Press Business Management - প্রিন্ট ও ভাউচার';

      if (html) {
        setContentHtml(html);
        setDocTitle(title);
        const defaultCleanName = title.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 60);
        setCustomFilename(defaultCleanName || 'press_document');
        setShowPdfOptions(detail.mode === 'pdf');

        // Gather all styles from the current document
        const styleSheets = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
        let stylesHtml = '';
        styleSheets.forEach((s) => {
          stylesHtml += s.outerHTML;
        });

        // Create standalone printable HTML document with auto-print
        const fullHtml = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet">
  ${stylesHtml}
  <style>
    body {
      font-family: 'Hind Siliguri', system-ui, -apple-system, sans-serif;
      background: #ffffff !important;
      color: #000000 !important;
      margin: 0;
      padding: 16px;
    }
    .no-print, header, aside, nav, button:not(.printable-button) {
      display: none !important;
    }
    .print-only {
      display: block !important;
    }
    .print-container {
      width: 100% !important;
      max-width: 800px !important;
      margin: 0 auto !important;
      padding: 0 !important;
      box-shadow: none !important;
      border: none !important;
    }
    table {
      width: 100% !important;
      border-collapse: collapse;
    }
    table th, table td {
      padding: 4px 6px !important;
    }
    .print-signatures {
      margin-top: 16px !important;
      padding-top: 8px !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    @page {
      size: auto;
      margin: 6mm 8mm;
    }
    @media print {
      body { padding: 0 !important; }
    }
  </style>
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 350);
    });
  </script>
</head>
<body>
  <div class="print-container">
    ${html}
  </div>
</body>
</html>`;

        const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        setBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });

        setIsOpen(true);
      }
    };

    window.addEventListener('app-trigger-print', handlePrintEvent);
    return () => {
      window.removeEventListener('app-trigger-print', handlePrintEvent);
    };
  }, []);

  // Allow closing with Escape key at any time
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setShowFormatDropdown(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const [downloadFormat, setDownloadFormat] = useState<'pdf' | 'html' | 'txt'>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const handleNativePrint = () => {
    try {
      window.focus();
      window.print();
    } catch (e) {
      console.warn('Native print error', e);
    }
  };

  const printableContentRef = useRef<HTMLDivElement>(null);

  const handleExport = async (format: 'pdf' | 'html' | 'txt' = downloadFormat) => {
    try {
      setIsExporting(true);
      setShowFormatDropdown(false);
      setExportNotice(null);
      const baseName = (customFilename.trim() || docTitle || 'press_document').replace(/[/\\?%*:|"<>]/g, '_');
      const timestamp = Date.now().toString().slice(-6);

      if (format === 'pdf') {
        const target = printableContentRef.current || contentHtml;
        await exportToPdf(target, {
          filename: `${baseName}_${timestamp}.pdf`,
          format: pdfPaperSize,
          orientation: pdfOrientation,
          margin: pdfMargin,
          scale: pdfScale,
          targetElement: printableContentRef.current,
        });
        setExportNotice(`PDF ডাউনলোড সম্পন্ন (${pdfPaperSize.toUpperCase()}, ${pdfOrientation === 'portrait' ? 'লম্বা' : 'আড়াআড়ি'})`);
        setTimeout(() => setExportNotice(null), 4000);
      } else if (format === 'html') {
        const fullHtml = blobUrl
          ? await (await fetch(blobUrl)).text()
          : `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${docTitle}</title></head><body>${contentHtml}</body></html>`;
        exportToHtml(fullHtml, `${baseName}_${timestamp}.html`);
      } else if (format === 'txt') {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = contentHtml;
        const text = tempDiv.innerText || tempDiv.textContent || '';
        exportToText(text, `${baseName}_${timestamp}.txt`);
      }
    } catch (err) {
      console.error('File export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyText = () => {
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = contentHtml;
      const text = tempDiv.innerText || tempDiv.textContent || '';
      navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setShowFormatDropdown(false);
    setExportNotice(null);
  };

  if (!isOpen) return null;

  return (
    <div
      className="no-print fixed inset-0 z-9999 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-start p-2 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {/* Top Action Bar — shrink-0 & sticky so it NEVER shrinks or clips on long statements */}
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 mb-4 shrink-0 sticky top-0 z-50">
        <div className="bg-slate-900 text-white px-4 py-3 rounded-t-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
          <div className="flex items-center justify-between w-full lg:w-auto gap-3">
            <div className="flex items-center space-x-2.5 min-w-0">
              {/* Prominent Back / Close Button (always visible) */}
              <button
                type="button"
                onClick={handleClose}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-md transition shrink-0"
                title="প্রিন্ট প্রিভিউ থেকে ফিরে যান (ESC)"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>ফিরে যান</span>
              </button>

              <div className="w-8 h-8 rounded-xl bg-emerald-600 hidden sm:flex items-center justify-center text-white shadow-xs shrink-0">
                <Printer className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold tracking-wide truncate">
                  প্রিন্ট প্রিভিউ ও কাস্টম PDF সহকারী
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-300 truncate">
                  সাইজ, পেজ ও ফাইলের নাম পছন্দমতো ঠিক করে PDF ডাউনলোড বা প্রিন্ট করুন
                </p>
              </div>
            </div>

            {/* Mobile quick X close button */}
            <button
              type="button"
              onClick={handleClose}
              className="lg:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition shrink-0"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center flex-wrap gap-2 w-full lg:w-auto justify-end">
            {/* Primary Action: Open & auto-print in standalone new tab */}
            {blobUrl && (
              <a
                href={blobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-md transition active:scale-95"
                title="নতুন ট্যাবে ওপেন করে সরাসরি সিস্টেম প্রিন্ট ডায়ালগ চালু করুন"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>নতুন ট্যাবে প্রিন্ট</span>
              </a>
            )}

            {/* In-place browser print button */}
            <button
              type="button"
              onClick={handleNativePrint}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 border border-slate-700 transition"
              title="ব্রাউজার প্রিন্ট ডায়ালগ চেষ্টা করুন"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>সরাসরি প্রিন্ট</span>
            </button>

            {/* Download file with format selection */}
            <div className="relative inline-flex items-center">
              <button
                type="button"
                onClick={() => handleExport(downloadFormat)}
                disabled={isExporting}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-l-xl flex items-center space-x-1.5 transition disabled:opacity-50 shadow-xs"
                title={`${downloadFormat.toUpperCase()} ফাইল ডাউনলোড করুন`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {isExporting
                    ? 'তৈরি হচ্ছে...'
                    : downloadFormat === 'pdf'
                    ? 'PDF ডাউনলোড'
                    : downloadFormat === 'html'
                    ? 'HTML ডাউনলোড'
                    : 'Text ডাউনলোড'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setShowFormatDropdown((prev) => !prev)}
                className="px-2 py-2 bg-indigo-700 hover:bg-indigo-800 text-indigo-100 hover:text-white rounded-r-xl border-l border-indigo-500/60 transition"
                title="ডাউনলোড ফরমেট পরিবর্তন করুন (PDF / HTML / Text)"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {/* Format Dropdown Menu */}
              {showFormatDropdown && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 text-xs">
                  <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    ডাউনলোড ফরমেট বাছুন
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDownloadFormat('pdf');
                      handleExport('pdf');
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition ${
                      downloadFormat === 'pdf'
                        ? 'bg-emerald-600/30 text-emerald-400 font-bold'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center space-x-1.5">
                      <FileText className="w-3.5 h-3.5 text-rose-400" />
                      <span>PDF ফাইল (.pdf)</span>
                    </span>
                    {downloadFormat === 'pdf' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDownloadFormat('html');
                      handleExport('html');
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition ${
                      downloadFormat === 'html'
                        ? 'bg-emerald-600/30 text-emerald-400 font-bold'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center space-x-1.5">
                      <FileCode className="w-3.5 h-3.5 text-blue-400" />
                      <span>HTML ওয়েব ফাইল (.html)</span>
                    </span>
                    {downloadFormat === 'html' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDownloadFormat('txt');
                      handleExport('txt');
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition ${
                      downloadFormat === 'txt'
                        ? 'bg-emerald-600/30 text-emerald-400 font-bold'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center space-x-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      <span>প্লেইন টেক্সট ফাইল (.txt)</span>
                    </span>
                    {downloadFormat === 'txt' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                  </button>
                </div>
              )}
            </div>

            {/* Toggle Custom PDF Options */}
            <button
              type="button"
              onClick={() => setShowPdfOptions((prev) => !prev)}
              className={`px-3 py-2 font-bold text-xs rounded-xl flex items-center space-x-1.5 border transition ${
                showPdfOptions
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
              }`}
              title="আপনার ইচ্ছামত PDF সাইজ, মার্জিন এবং নাম পরিবর্তন করুন"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>কাস্টম PDF সেটিংস</span>
            </button>

            {/* Copy Text */}
            <button
              type="button"
              onClick={handleCopyText}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium text-xs rounded-xl flex items-center space-x-1 border border-slate-700 transition"
              title="সকল হিসাব ও লেখা কপি করুন"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'কপি হয়েছে!' : 'কপি'}</span>
            </button>

            {/* Desktop Close X */}
            <button
              type="button"
              onClick={handleClose}
              className="hidden lg:inline-flex p-2 text-slate-300 hover:text-white hover:bg-rose-600/80 rounded-xl transition"
              title="বন্ধ করুন (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Custom PDF Settings Panel (expandable anytime) */}
        {showPdfOptions && (
          <div className="bg-indigo-50/90 border-b border-indigo-200 px-4 py-3 text-xs space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 items-end">
              <div className="lg:col-span-2">
                <label className="block text-[11px] font-bold text-indigo-950 mb-1">
                  PDF ফাইলের নাম (ইচ্ছামত লিখুন)
                </label>
                <input
                  type="text"
                  value={customFilename}
                  onChange={(e) => setCustomFilename(e.target.value)}
                  placeholder="ফাইলের নাম লিখুন..."
                  className="w-full px-2.5 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-indigo-950 mb-1">কাগজের সাইজ</label>
                <select
                  value={pdfPaperSize}
                  onChange={(e) => setPdfPaperSize(e.target.value as 'a4' | 'a5' | 'legal')}
                  className="w-full px-2.5 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-bold text-slate-900"
                >
                  <option value="a4">A4 (২১০×২৯৭ মিমি)</option>
                  <option value="a5">A5 (১৪৮×২১০ মিমি)</option>
                  <option value="legal">Legal (২১৬×৩৫৬ মিমি)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-indigo-950 mb-1">দিক (Orientation)</label>
                <select
                  value={pdfOrientation}
                  onChange={(e) => setPdfOrientation(e.target.value as 'portrait' | 'landscape')}
                  className="w-full px-2.5 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-bold text-slate-900"
                >
                  <option value="portrait">লম্বা (Portrait)</option>
                  <option value="landscape">আড়াআড়ি (Landscape)</option>
                </select>
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-indigo-950 mb-1">মার্জিন / মান</label>
                  <div className="flex gap-1">
                    <select
                      value={pdfMargin}
                      onChange={(e) => setPdfMargin(Number(e.target.value))}
                      className="w-1/2 px-1.5 py-1.5 bg-white border border-indigo-300 rounded-lg text-[11px] font-bold text-slate-900"
                      title="পেজ মার্জিন"
                    >
                      <option value={4}>কম</option>
                      <option value={8}>স্বাভাবিক</option>
                      <option value={14}>বড়</option>
                    </select>
                    <select
                      value={pdfScale}
                      onChange={(e) => setPdfScale(Number(e.target.value))}
                      className="w-1/2 px-1.5 py-1.5 bg-white border border-indigo-300 rounded-lg text-[11px] font-bold text-slate-900"
                      title="রেজুলেশন কোয়ালিটি"
                    >
                      <option value={2}>স্ট্যান্ডার্ড</option>
                      <option value={3}>HD</option>
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleExport('pdf')}
                  disabled={isExporting}
                  className="px-3.5 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-xs shrink-0 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ডাউনলোড</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Helpful Banner / Export Status */}
        <div className="bg-emerald-50 border-t border-emerald-100 px-4 py-2 rounded-b-2xl text-xs text-emerald-900 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <span>
              {exportNotice ? (
                <strong className="text-emerald-800">✓ {exportNotice}</strong>
              ) : (
                <>
                  <b>টিপস:</b> <b>&quot;PDF ডাউনলোড&quot;</b> অথবা <b>&quot;কাস্টম PDF সেটিংস&quot;</b> থেকে যেকোনো পেজের কাস্টম PDF বানিয়ে নিতে পারেন।
                </>
              )}
            </span>
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold">ESC চাপলেও বন্ধ হবে</span>
        </div>
      </div>

      {/* Printable Sheet Viewer */}
      <div
        className={`w-full ${
          pdfOrientation === 'landscape' ? 'max-w-5xl' : 'max-w-4xl'
        } bg-white rounded-2xl shadow-2xl border border-slate-300 p-6 sm:p-10 mb-4 min-h-[420px] shrink-0`}
      >
        <div
          ref={printableContentRef}
          className="print-rendered-content text-slate-900"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </div>

      {/* Bottom Return Bar so users scrolling to the bottom can return immediately */}
      <div className="w-full max-w-4xl flex justify-center pb-6 shrink-0">
        <button
          type="button"
          onClick={handleClose}
          className="px-6 py-2.5 bg-white hover:bg-rose-50 text-slate-900 hover:text-rose-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>← প্রিন্ট প্রিভিউ বন্ধ করে ফিরে যান</span>
        </button>
      </div>
    </div>
  );
};
