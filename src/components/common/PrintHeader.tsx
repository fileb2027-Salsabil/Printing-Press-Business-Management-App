import React from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { formatDate } from '../../utils/calculations';
import { formatAmountInWords } from '../../utils/numberToWords';
import { PhoneLink } from './PhoneLink';

interface PrintHeaderProps {
  title: string;
  subtitle?: string;
  documentNo?: string;
  date?: string;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({
  title,
  subtitle,
  documentNo,
  date,
}) => {
  const { db } = useDatabase();
  const settings = db.settings;
  const today = date || new Date().toISOString().split('T')[0];

  return (
    <div className="border-b-2 border-slate-800 pb-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt={settings.name}
              className="h-14 w-14 object-contain rounded border border-slate-200"
            />
          ) : (
            <div className="h-14 w-14 bg-emerald-700 text-white rounded flex items-center justify-center font-bold text-2xl">
              {(settings.name || 'P').charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {settings.name}
            </h1>
            <p className="text-xs text-slate-600 font-medium">{settings.address}</p>
            <div className="text-xs text-slate-600 flex items-center flex-wrap gap-1 mt-0.5">
              <span>ফোন:</span>
              <PhoneLink phone={settings.phone} />
              <span>| ইমেইল: {settings.email}</span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="inline-block bg-slate-100 border border-slate-300 px-3 py-1 rounded">
            <h2 className="text-base font-bold text-slate-800">{title}</h2>
          </div>
          {documentNo && (
            <p className="text-xs font-semibold text-slate-700 mt-1">
              নম্বর: <span className="font-mono">{documentNo}</span>
            </p>
          )}
          <p className="text-xs text-slate-500 mt-0.5">
            তারিখ: {formatDate(today, settings.language)}
          </p>
        </div>
      </div>
      {subtitle && (
        <p className="text-xs text-slate-600 mt-2 italic text-center bg-slate-50 py-1 rounded">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export const PrintAmountInWords: React.FC<{ amount: number; lang?: 'bn' | 'en' }> = ({
  amount,
  lang = 'bn',
}) => {
  return (
    <div className="my-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800">
      <span className="text-slate-500 font-bold">কথায় ({lang === 'bn' ? 'কথায়' : 'In words'}): </span>
      <span className="font-bold text-slate-900">{formatAmountInWords(amount, lang)}</span>
    </div>
  );
};

export const PrintSignatures: React.FC = () => {
  return (
    <div className="print-signatures mt-6 sm:mt-8 pt-3 sm:pt-4 flex justify-between items-center text-xs text-slate-700 border-t border-dashed border-slate-300">
      <div className="text-center">
        <div className="w-28 sm:w-36 border-t border-slate-400 mb-1"></div>
        <p className="text-[11px]">প্রস্তুতকারীর স্বাক্ষর</p>
      </div>
      <div className="text-center">
        <div className="w-28 sm:w-36 border-t border-slate-400 mb-1"></div>
        <p className="text-[11px]">যাচাইকারীর স্বাক্ষর</p>
      </div>
      <div className="text-center">
        <div className="w-28 sm:w-36 border-t border-slate-400 mb-1"></div>
        <p className="text-[11px]">গ্রাহক / প্রাপকের স্বাক্ষর</p>
      </div>
      <div className="text-center">
        <div className="w-28 sm:w-36 border-t border-slate-400 mb-1"></div>
        <p className="text-[11px]">ম্যানেজার / স্বত্বাধিকারী</p>
      </div>
    </div>
  );
};

export function triggerPrint(
  customTarget?: HTMLElement | string | null,
  title?: string,
  options?: { mode?: 'print' | 'pdf' }
) {
  try {
    window.focus();

    // Dispatch custom event to activate the PrintPreviewModal Assistant
    window.dispatchEvent(
      new CustomEvent('app-trigger-print', {
        detail: {
          target: customTarget,
          title: title || document.title,
          mode: options?.mode || 'print',
        },
      })
    );

    // Also attempt native window.print() unless explicitly opened in Custom PDF builder mode
    if (options?.mode !== 'pdf' && typeof window.print === 'function') {
      setTimeout(() => {
        try {
          window.print();
        } catch (err) {
          console.warn('Native window.print() was blocked or failed:', err);
        }
      }, 80);
    }
  } catch (err) {
    console.error('Print trigger error:', err);
  }
}

function fallbackIframePrint(customTarget?: HTMLElement | string | null) {
  try {
    let targetEl: HTMLElement | null = null;
    if (typeof customTarget === 'string') {
      targetEl = document.querySelector(customTarget) as HTMLElement;
    } else if (customTarget instanceof HTMLElement) {
      targetEl = customTarget;
    }

    if (!targetEl) {
      targetEl =
        (document.querySelector('.print-container') as HTMLElement) ||
        (document.querySelector('.print-area') as HTMLElement) ||
        (document.querySelector('main') as HTMLElement) ||
        document.body;
    }

    if (!targetEl) return;

    // Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    // Collect all stylesheets and style tags
    let stylesHtml = '';
    const styleSheets = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
    styleSheets.forEach((s) => {
      stylesHtml += s.outerHTML;
    });

    stylesHtml += `
      <style>
        body {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #ffffff !important;
          color: #000000 !important;
          padding: 12px;
          margin: 0;
        }
        .no-print, header, aside, nav, button:not(.printable-button) {
          display: none !important;
        }
        .print-only {
          display: block !important;
        }
        table {
          width: 100% !important;
          border-collapse: collapse;
        }
        @page {
          size: auto;
          margin: 10mm;
        }
      </style>
    `;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>প্রিন্ট ভিউ - Press Business Management</title>
          ${stylesHtml}
        </head>
        <body>
          ${targetEl.outerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Fallback iframe print error', e);
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 1500);
      }
    }, 200);
  } catch (e) {
    console.error('Fallback iframe print failed', e);
  }
}

