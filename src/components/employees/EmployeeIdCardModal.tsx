import React, { useState, useRef } from 'react';
import { Employee, CompanySettings } from '../../types';
import { formatDate } from '../../utils/calculations';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import {
  Printer,
  Download,
  X,
  CreditCard,
  QrCode,
  ShieldCheck,
  Sparkles,
  Phone,
  Calendar,
  Palette,
  MapPin,
  Maximize2,
  User,
  Edit3,
} from 'lucide-react';

interface EmployeeIdCardModalProps {
  employee: Employee;
  settings: CompanySettings;
  isOpen: boolean;
  onClose: () => void;
}

export type CardTemplate = 'emerald' | 'navy' | 'cmyk' | 'dark' | 'minimal' | 'badge';
export type CardSize = 'cr80-portrait' | 'cr80-landscape' | 'large-pass' | 'mini-pocket';

interface SizeMetrics {
  width: string;
  height: string;
  widthPx: number;
  heightPx: number;
  isLandscape: boolean;
  widthMm: number;
  heightMm: number;
  labelBn: string;
  headerPad: string;
  logoPx: number;
  companyTitlePx: number;
  companySubPx: number;
  bodyPad: string;
  photoPx: number;
  empNamePx: number;
  badgePx: number;
  boxPad: string;
  rowPad: string;
  detailPx: number;
  footerPad: string;
  qrPx: number;
  backFontPx: number;
  backBoxPad: string;
}

const SIZE_CONFIGS: Record<CardSize, SizeMetrics> = {
  'cr80-portrait': {
    width: '324px',
    height: '516px',
    widthPx: 324,
    heightPx: 516,
    isLandscape: false,
    widthMm: 54,
    heightMm: 86,
    labelBn: 'পোর্ট্রেট CR80 (৫৪×৮৬ মিমি)',
    headerPad: '10px 12px',
    logoPx: 32,
    companyTitlePx: 14,
    companySubPx: 9,
    bodyPad: '10px 14px',
    photoPx: 76,
    empNamePx: 14.5,
    badgePx: 10,
    boxPad: '6px 12px',
    rowPad: '5px 0',
    detailPx: 10.5,
    footerPad: '8px 14px',
    qrPx: 26,
    backFontPx: 9.5,
    backBoxPad: '8px 10px',
  },
  'cr80-landscape': {
    width: '516px',
    height: '324px',
    widthPx: 516,
    heightPx: 324,
    isLandscape: true,
    widthMm: 86,
    heightMm: 54,
    labelBn: 'ল্যান্ডস্কেপ CR80 (৮৬×৫৪ মিমি)',
    headerPad: '9px 14px',
    logoPx: 32,
    companyTitlePx: 14.5,
    companySubPx: 9,
    bodyPad: '10px 16px',
    photoPx: 84,
    empNamePx: 15,
    badgePx: 10,
    boxPad: '6px 12px',
    rowPad: '4px 0',
    detailPx: 10.5,
    footerPad: '6px 14px',
    qrPx: 20,
    backFontPx: 9,
    backBoxPad: '7px 10px',
  },
  'large-pass': {
    width: '370px',
    height: '525px',
    widthPx: 370,
    heightPx: 525,
    isLandscape: false,
    widthMm: 74,
    heightMm: 105,
    labelBn: 'বড় প্রেস পাস A7 (৭৪×১০৫ মিমি)',
    headerPad: '12px 16px',
    logoPx: 36,
    companyTitlePx: 16,
    companySubPx: 10,
    bodyPad: '12px 16px',
    photoPx: 86,
    empNamePx: 16,
    badgePx: 11,
    boxPad: '8px 14px',
    rowPad: '6px 0',
    detailPx: 11.5,
    footerPad: '10px 16px',
    qrPx: 30,
    backFontPx: 10,
    backBoxPad: '9px 12px',
  },
  'mini-pocket': {
    width: '300px',
    height: '480px',
    widthPx: 300,
    heightPx: 480,
    isLandscape: false,
    widthMm: 50,
    heightMm: 80,
    labelBn: 'স্মার্ট পকেট মিনি (৫০×৮০ মিমি)',
    headerPad: '8px 10px',
    logoPx: 28,
    companyTitlePx: 13,
    companySubPx: 8.5,
    bodyPad: '8px 12px',
    photoPx: 66,
    empNamePx: 13,
    badgePx: 9.5,
    boxPad: '5px 10px',
    rowPad: '4px 0',
    detailPx: 9.5,
    footerPad: '7px 12px',
    qrPx: 24,
    backFontPx: 8.5,
    backBoxPad: '6px 9px',
  },
};

export const EmployeeIdCardModal: React.FC<EmployeeIdCardModalProps> = ({
  employee,
  settings,
  isOpen,
  onClose,
}) => {
  const [template, setTemplate] = useState<CardTemplate>('emerald');
  const [cardSize, setCardSize] = useState<CardSize>('cr80-portrait');
  const [cardSide, setCardSide] = useState<'front' | 'back' | 'both'>('front');
  const [bloodGroup, setBloodGroup] = useState<string>('B+');
  const [fatherName, setFatherName] = useState<string>(employee.fatherName || '');
  const [isEditingFatherName, setIsEditingFatherName] = useState<boolean>(false);
  const [address, setAddress] = useState<string>(employee.address || 'বাংলাবাজার, ঢাকা');
  const [isEditingAddress, setIsEditingAddress] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printBlobUrl, setPrintBlobUrl] = useState<string | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  const frontCardRef = useRef<HTMLDivElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);
  const bothCardsRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const currentSize = SIZE_CONFIGS[cardSize];
  const isLandscape = currentSize.isLandscape;

  const captureElementPng = async (el: HTMLElement): Promise<string> => {
    if ('fonts' in document) {
      try {
        await (document as any).fonts.ready;
      } catch {
        // ignore font wait errors
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 60));

    const opts = {
      quality: 1,
      pixelRatio: 3,
      backgroundColor: '#ffffff',
      cacheBust: true,
      skipFonts: true,
      fontEmbedCSS: '',
    };

    return await toPng(el, opts);
  };

  const handlePrintCard = async () => {
    try {
      setIsPrinting(true);
      const { widthMm, heightMm } = currentSize;
      const images: string[] = [];

      if (cardSide === 'front' && frontCardRef.current) {
        images.push(await captureElementPng(frontCardRef.current));
      } else if (cardSide === 'back' && backCardRef.current) {
        images.push(await captureElementPng(backCardRef.current));
      } else if (cardSide === 'both') {
        if (frontCardRef.current) images.push(await captureElementPng(frontCardRef.current));
        if (backCardRef.current) images.push(await captureElementPng(backCardRef.current));
      }

      if (images.length === 0) return;

      const pagesHtml = images
        .map(
          (src, idx) =>
            `<div class="print-page"><img class="card-print-img" src="${src}" alt="ID Card Side ${
              idx + 1
            }" /></div>`
        )
        .join('');

      const printHtml = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <title>আইডি কার্ড - ${employee.name} (${employee.employeeId})</title>
  <style>
    @page {
      size: ${widthMm}mm ${heightMm}mm;
      margin: 0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      min-height: 100%;
      background: #ffffff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .print-page {
      width: 100%;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      page-break-after: always;
      break-after: page;
    }
    .print-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    img.card-print-img {
      width: ${widthMm}mm;
      height: ${heightMm}mm;
      max-width: 100%;
      max-height: 100vh;
      display: block;
      object-fit: contain;
      page-break-inside: avoid;
      break-inside: avoid;
    }
  </style>
</head>
<body>
  ${pagesHtml}
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 150);
    };
  </script>
</body>
</html>`;

      const blob = new Blob([printHtml], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      setPrintBlobUrl(blobUrl);

      const oldIframe = document.getElementById('id-card-print-iframe');
      if (oldIframe) oldIframe.remove();

      const iframe = document.createElement('iframe');
      iframe.id = 'id-card-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = blobUrl;
      document.body.appendChild(iframe);

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (printErr) {
          console.warn('Iframe print blocked by sandbox:', printErr);
          window.print();
        }
      }, 450);

      setDownloadNotice('প্রিন্ট কমান্ড পাঠানো হয়েছে। যেকোনো কাগজ বা কার্ড সাইজে নির্ভুলভাবে প্রিন্ট হবে।');
      setTimeout(() => setDownloadNotice(null), 8000);
    } catch (err) {
      console.error('Print card error:', err);
      window.print();
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      setDownloadNotice('পিডিএফ তৈরি হচ্ছে...');

      const { widthMm, heightMm } = currentSize;
      const images: string[] = [];

      if (cardSide === 'front' && frontCardRef.current) {
        images.push(await captureElementPng(frontCardRef.current));
      } else if (cardSide === 'back' && backCardRef.current) {
        images.push(await captureElementPng(backCardRef.current));
      } else if (cardSide === 'both') {
        if (frontCardRef.current) images.push(await captureElementPng(frontCardRef.current));
        if (backCardRef.current) images.push(await captureElementPng(backCardRef.current));
      }

      if (images.length === 0) return;

      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [widthMm, heightMm],
      });

      images.forEach((imgData, idx) => {
        if (idx > 0) {
          pdf.addPage([widthMm, heightMm], isLandscape ? 'landscape' : 'portrait');
        }
        pdf.addImage(imgData, 'PNG', 0, 0, widthMm, heightMm, undefined, 'FAST');
      });

      const cleanFilename = `ID_Card_${employee.employeeId}_${employee.name.replace(/\s+/g, '_')}.pdf`;
      try {
        const pdfBlob = pdf.output('blob');
        const blobUrl = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = cleanFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      } catch {
        pdf.save(cleanFilename);
      }

      setDownloadNotice(
        `✓ ${currentSize.labelBn} মাপে আইডি কার্ড PDF সফলভাবে ডাউনলোড হয়েছে!`
      );
      setTimeout(() => setDownloadNotice(null), 5000);
    } catch (err: any) {
      console.error('ID Card PDF export error:', err);
      setDownloadNotice(`পিডিএফ ডাউনলোডে ত্রুটি: ${err?.message || 'পুনরায় চেষ্টা করুন'}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadImage = async () => {
    const targetEl =
      cardSide === 'both'
        ? bothCardsRef.current
        : cardSide === 'back'
        ? backCardRef.current
        : frontCardRef.current;

    if (!targetEl) return;
    try {
      setIsDownloading(true);
      const dataUrl = await captureElementPng(targetEl);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `ID_Card_${employee.employeeId}_${employee.name.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setDownloadNotice('✓ আইডি কার্ডের হাই-রেজোলিউশন ছবি (PNG) ডাউনলোড হয়েছে!');
      setTimeout(() => setDownloadNotice(null), 5000);
    } catch (err: any) {
      console.error('Download image error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Helper for color palettes per template (using hex/rgba safe CSS so SVG/Canvas capture stays consistent)
  const getTemplateTheme = () => {
    switch (template) {
      case 'emerald':
        return {
          headerBg: 'bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-900 text-white',
          borderColor: '#065f46',
          badgeBg: '#d1fae5',
          badgeText: '#064e3b',
          badgeBorder: '#6ee7b7',
          subtextColor: '#d1fae5',
          photoBg: '#047857',
          photoBorder: '#34d399',
          boxBg: '#ecfdf5',
          boxBorder: '#a7f3d0',
          boxText: '#064e3b',
          footerBg: '#f8fafc',
          footerBorder: '#e2e8f0',
          backHeaderBg: '#064e3b',
          backHeaderText: '#ffffff',
        };
      case 'navy':
        return {
          headerBg: 'bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 text-white border-b-2 border-amber-400',
          borderColor: '#1e3a8a',
          badgeBg: '#dbeafe',
          badgeText: '#172554',
          badgeBorder: '#93c5fd',
          subtextColor: '#bfdbfe',
          photoBg: '#1e3a8a',
          photoBorder: '#fbbf24',
          boxBg: '#eff6ff',
          boxBorder: '#bfdbfe',
          boxText: '#1e293b',
          footerBg: '#f8fafc',
          footerBorder: '#e2e8f0',
          backHeaderBg: '#172554',
          backHeaderText: '#ffffff',
        };
      case 'cmyk':
        return {
          headerBg: 'bg-slate-900 text-white border-b-4 border-amber-400',
          borderColor: '#0f172a',
          badgeBg: '#fef3c7',
          badgeText: '#451a03',
          badgeBorder: '#fcd34d',
          subtextColor: '#cbd5e1',
          photoBg: '#0f172a',
          photoBorder: '#22d3ee',
          boxBg: '#f8fafc',
          boxBorder: '#cbd5e1',
          boxText: '#1e293b',
          footerBg: '#f1f5f9',
          footerBorder: '#cbd5e1',
          backHeaderBg: '#020617',
          backHeaderText: '#ffffff',
        };
      case 'dark':
        return {
          headerBg: 'bg-gradient-to-r from-slate-950 via-slate-900 to-black text-white border-b border-amber-500/60',
          borderColor: '#d97706',
          badgeBg: '#451a03',
          badgeText: '#fcd34d',
          badgeBorder: '#b45309',
          subtextColor: '#94a3b8',
          photoBg: '#1e293b',
          photoBorder: '#fbbf24',
          boxBg: '#f8fafc',
          boxBorder: '#e2e8f0',
          boxText: '#0f172a',
          footerBg: '#f8fafc',
          footerBorder: '#e2e8f0',
          backHeaderBg: '#09090b',
          backHeaderText: '#fcd34d',
        };
      case 'minimal':
        return {
          headerBg: 'bg-white text-slate-900 border-b-2 border-slate-200',
          borderColor: '#cbd5e1',
          badgeBg: '#f1f5f9',
          badgeText: '#1e293b',
          badgeBorder: '#cbd5e1',
          subtextColor: '#64748b',
          photoBg: '#e2e8f0',
          photoBorder: '#94a3b8',
          boxBg: '#f8fafc',
          boxBorder: '#e2e8f0',
          boxText: '#1e293b',
          footerBg: '#ffffff',
          footerBorder: '#e2e8f0',
          backHeaderBg: '#1e293b',
          backHeaderText: '#ffffff',
        };
      case 'badge':
        return {
          headerBg: 'bg-gradient-to-r from-rose-900 via-rose-800 to-red-950 text-white border-b-2 border-amber-400',
          borderColor: '#881337',
          badgeBg: '#ffe4e6',
          badgeText: '#4c0519',
          badgeBorder: '#fda4af',
          subtextColor: '#fecdd3',
          photoBg: '#9f1239',
          photoBorder: '#fbbf24',
          boxBg: '#fff1f2',
          boxBorder: '#fecdd3',
          boxText: '#4c0519',
          footerBg: '#f8fafc',
          footerBorder: '#e2e8f0',
          backHeaderBg: '#4c0519',
          backHeaderText: '#ffffff',
        };
    }
  };

  const theme = getTemplateTheme();

  const cardBaseStyle: React.CSSProperties = {
    width: currentSize.width,
    height: currentSize.height,
    minWidth: currentSize.width,
    minHeight: currentSize.height,
    boxSizing: 'border-box',
    border: `2px solid ${theme.borderColor}`,
    borderRadius: '16px',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    position: 'relative',
    fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif",
  };

  const renderFrontCard = () => (
    <div
      ref={frontCardRef}
      className="shadow-xl select-none"
      style={cardBaseStyle}
    >
      {isLandscape ? (
        // HORIZONTAL / LANDSCAPE FRONT (86mm x 54mm -> 516px x 324px)
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: '#ffffff',
            color: '#0f172a',
          }}
        >
          {/* Top Header */}
          <div
            className={theme.headerBg}
            style={{
              padding: currentSize.headerPad,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt="Logo"
                  style={{
                    width: `${currentSize.logoPx}px`,
                    height: `${currentSize.logoPx}px`,
                    borderRadius: '8px',
                    objectFit: 'contain',
                    backgroundColor: '#ffffff',
                    padding: '2px',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: `${currentSize.logoPx}px`,
                    height: `${currentSize.logoPx}px`,
                    borderRadius: '8px',
                    backgroundColor: '#fbbf24',
                    color: '#020617',
                    fontWeight: 900,
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {(settings.name || 'ম')[0]}
                </div>
              )}
              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <h2
                  style={{
                    fontSize: `${currentSize.companyTitlePx}px`,
                    fontWeight: 800,
                    lineHeight: 1.25,
                    margin: 0,
                    wordBreak: 'break-word',
                  }}
                >
                  {settings.name}
                </h2>
                <p
                  style={{
                    fontSize: `${currentSize.companySubPx}px`,
                    lineHeight: 1.25,
                    margin: 0,
                    color: theme.subtextColor,
                  }}
                >
                  {settings.nameEn || 'Makkah Printers & Packaging'}
                </p>
              </div>
            </div>

            <div style={{ flexShrink: 0 }}>
              <span
                style={{
                  fontSize: '10px',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  display: 'inline-block',
                }}
              >
                {employee.employeeId}
              </span>
            </div>
          </div>

          {/* Landscape Body */}
          <div
            style={{
              padding: currentSize.bodyPad,
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              flex: 1,
              minHeight: 0,
            }}
          >
            {/* Left Photo + Blood Group */}
            <div
              style={{
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '7px',
              }}
            >
              <div
                style={{
                  width: `${currentSize.photoPx}px`,
                  height: `${currentSize.photoPx}px`,
                  borderRadius: '14px',
                  padding: '2px',
                  backgroundColor: theme.photoBg,
                  border: `2px solid ${theme.photoBorder}`,
                  position: 'relative',
                  boxSizing: 'border-box',
                }}
              >
                {employee.photoUrl ? (
                  <img
                    src={employee.photoUrl}
                    alt={employee.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '10px',
                      objectFit: 'cover',
                      backgroundColor: '#ffffff',
                      display: 'block',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '10px',
                      backgroundColor: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '24px',
                      color: '#334155',
                    }}
                  >
                    {employee.name.slice(0, 1)}
                  </div>
                )}
                <span
                  style={{
                    position: 'absolute',
                    bottom: '-4px',
                    right: '-4px',
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    borderRadius: '9999px',
                    padding: '3px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShieldCheck style={{ width: '11px', height: '11px' }} />
                </span>
              </div>

              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: 800,
                  color: '#e11d48',
                  backgroundColor: '#fff1f2',
                  border: '1px solid #fecdd3',
                  padding: '2px 9px',
                  borderRadius: '9999px',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.3,
                }}
              >
                রক্ত: {bloodGroup}
              </span>
            </div>

            {/* Right Info */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '5px' }}>
                <h3
                  style={{
                    fontSize: `${currentSize.empNamePx}px`,
                    fontWeight: 800,
                    color: '#0f172a',
                    margin: 0,
                    lineHeight: 1.3,
                    wordBreak: 'break-word',
                  }}
                >
                  {employee.name}
                </h3>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    fontSize: `${currentSize.badgePx}px`,
                    fontWeight: 700,
                    lineHeight: 1.3,
                    whiteSpace: 'nowrap',
                    backgroundColor: theme.badgeBg,
                    color: theme.badgeText,
                    border: `1px solid ${theme.badgeBorder}`,
                  }}
                >
                  {employee.designation}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  marginTop: '4px',
                  fontSize: `${currentSize.detailPx}px`,
                  color: '#334155',
                }}
              >
                {fatherName ? (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', lineHeight: 1.35 }}>
                    <User style={{ width: '12px', height: '12px', color: '#64748b', flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ wordBreak: 'break-word' }}>
                      পিতা: <b style={{ color: '#0f172a' }}>{fatherName}</b>
                    </span>
                  </div>
                ) : null}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', lineHeight: 1.35 }}>
                  <Phone style={{ width: '12px', height: '12px', color: '#059669', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                    {employee.phone || 'ফোন নেই'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', lineHeight: 1.35, fontSize: '9.5px', color: '#64748b' }}>
                  <Calendar style={{ width: '11px', height: '11px', color: '#94a3b8', flexShrink: 0 }} />
                  <span style={{ whiteSpace: 'nowrap' }}>যোগদান: {formatDate(employee.joiningDate, 'bn')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Landscape Footer */}
          <div
            style={{
              padding: currentSize.footerPad,
              backgroundColor: theme.footerBg,
              borderTop: `1px solid ${theme.footerBorder}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '8.5px', color: '#64748b' }}>
              <QrCode style={{ width: `${currentSize.qrPx}px`, height: `${currentSize.qrPx}px`, color: '#334155', flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>অথরাইজড আইডি কার্ড</span>
            </div>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ width: '82px', borderTop: '1px solid #94a3b8', marginBottom: '3px' }} />
              <p style={{ fontSize: '8px', fontWeight: 700, color: '#475569', margin: 0, whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                কর্তৃপক্ষের স্বাক্ষর
              </p>
            </div>
          </div>
        </div>
      ) : (
        // VERTICAL / PORTRAIT FRONT (CR80 Portrait, Large A7, or Mini Pocket)
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: '#ffffff',
            color: '#0f172a',
          }}
        >
          {/* Top Header */}
          <div
            className={theme.headerBg}
            style={{
              padding: currentSize.headerPad,
              flexShrink: 0,
            }}
          >
            {template === 'cmyk' && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '5px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '9999px', backgroundColor: '#22d3ee' }} />
                <span style={{ width: '7px', height: '7px', borderRadius: '9999px', backgroundColor: '#ec4899' }} />
                <span style={{ width: '7px', height: '7px', borderRadius: '9999px', backgroundColor: '#facc15' }} />
                <span style={{ width: '7px', height: '7px', borderRadius: '9999px', backgroundColor: '#020617', border: '1px solid #ffffff' }} />
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt="Logo"
                  style={{
                    width: `${currentSize.logoPx}px`,
                    height: `${currentSize.logoPx}px`,
                    borderRadius: '8px',
                    objectFit: 'contain',
                    backgroundColor: '#ffffff',
                    padding: '2px',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: `${currentSize.logoPx}px`,
                    height: `${currentSize.logoPx}px`,
                    borderRadius: '8px',
                    backgroundColor: '#fbbf24',
                    color: '#020617',
                    fontWeight: 900,
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {(settings.name || 'ম')[0]}
                </div>
              )}

              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
                <h2
                  style={{
                    fontSize: `${currentSize.companyTitlePx}px`,
                    fontWeight: 800,
                    lineHeight: 1.25,
                    margin: 0,
                    wordBreak: 'break-word',
                  }}
                >
                  {settings.name}
                </h2>
                <p
                  style={{
                    fontSize: `${currentSize.companySubPx}px`,
                    lineHeight: 1.25,
                    margin: 0,
                    color: theme.subtextColor,
                  }}
                >
                  {settings.nameEn || 'Makkah Printers & Packaging'}
                </p>
              </div>
            </div>
          </div>

          {/* Middle Body */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-around',
              padding: currentSize.bodyPad,
              gap: '8px',
            }}
          >
            {/* Photo, Name & Designation */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%',
                gap: '6px',
              }}
            >
              <div
                style={{
                  width: `${currentSize.photoPx}px`,
                  height: `${currentSize.photoPx}px`,
                  borderRadius: '16px',
                  padding: '2px',
                  backgroundColor: theme.photoBg,
                  border: `2px solid ${theme.photoBorder}`,
                  position: 'relative',
                  flexShrink: 0,
                  boxSizing: 'border-box',
                }}
              >
                {employee.photoUrl ? (
                  <img
                    src={employee.photoUrl}
                    alt={employee.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '12px',
                      objectFit: 'cover',
                      backgroundColor: '#ffffff',
                      display: 'block',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '12px',
                      backgroundColor: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '24px',
                      color: '#334155',
                    }}
                  >
                    {employee.name.slice(0, 1)}
                  </div>
                )}
                <span
                  style={{
                    position: 'absolute',
                    bottom: '-4px',
                    right: '-4px',
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    borderRadius: '9999px',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShieldCheck style={{ width: '12px', height: '12px' }} />
                </span>
              </div>

              <h3
                style={{
                  margin: '4px 0 0 0',
                  fontSize: `${currentSize.empNamePx}px`,
                  fontWeight: 800,
                  textAlign: 'center',
                  color: '#0f172a',
                  lineHeight: 1.32,
                  width: '100%',
                  wordBreak: 'break-word',
                }}
              >
                {employee.name}
              </h3>

              <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '3px 12px',
                    borderRadius: '9999px',
                    fontSize: `${currentSize.badgePx}px`,
                    fontWeight: 700,
                    lineHeight: 1.3,
                    whiteSpace: 'nowrap',
                    backgroundColor: theme.badgeBg,
                    color: theme.badgeText,
                    border: `1px solid ${theme.badgeBorder}`,
                  }}
                >
                  {employee.designation}
                </span>
              </div>
            </div>

            {/* Structured Info Table */}
            <div
              style={{
                width: '100%',
                borderRadius: '12px',
                padding: currentSize.boxPad,
                fontSize: `${currentSize.detailPx}px`,
                backgroundColor: theme.boxBg,
                border: `1px solid ${theme.boxBorder}`,
                color: theme.boxText,
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: currentSize.rowPad,
                  lineHeight: 1.35,
                }}
              >
                <span style={{ color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  আইডি নং:
                </span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                  {employee.employeeId}
                </span>
              </div>

              {fatherName ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: currentSize.rowPad,
                    borderTop: '1px solid rgba(148,163,184,0.28)',
                    lineHeight: 1.35,
                  }}
                >
                  <span style={{ color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    পিতার নাম:
                  </span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: '#0f172a',
                      textAlign: 'right',
                      wordBreak: 'break-word',
                      minWidth: 0,
                    }}
                  >
                    {fatherName}
                  </span>
                </div>
              ) : null}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: currentSize.rowPad,
                  borderTop: '1px solid rgba(148,163,184,0.28)',
                  lineHeight: 1.35,
                }}
              >
                <span style={{ color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  মোবাইল:
                </span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                  {employee.phone || 'ফোন নেই'}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: currentSize.rowPad,
                  borderTop: '1px solid rgba(148,163,184,0.28)',
                  lineHeight: 1.35,
                }}
              >
                <span style={{ color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  রক্তের গ্রুপ:
                </span>
                <span style={{ fontWeight: 900, color: '#e11d48', whiteSpace: 'nowrap' }}>
                  {bloodGroup}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: currentSize.footerPad,
              backgroundColor: theme.footerBg,
              borderTop: `1px solid ${theme.footerBorder}`,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <QrCode style={{ width: `${currentSize.qrPx}px`, height: `${currentSize.qrPx}px`, color: '#334155', opacity: 0.85 }} />
              <p style={{ fontSize: '6.5px', color: '#94a3b8', fontFamily: 'monospace', margin: '1px 0 0 0', lineHeight: 1.2 }}>
                VERIFIED
              </p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '92px', borderTop: '1px solid #94a3b8', marginBottom: '3px' }} />
              <p style={{ fontSize: '8.5px', fontWeight: 700, color: '#475569', margin: 0, whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                কর্তৃপক্ষের স্বাক্ষর
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderBackCard = () => (
    <div
      ref={backCardRef}
      className="shadow-xl select-none"
      style={cardBaseStyle}
    >
      {/* Back Header */}
      <div
        style={{
          padding: isLandscape ? '8px 14px' : '10px 12px',
          textAlign: 'center',
          backgroundColor: theme.backHeaderBg,
          color: theme.backHeaderText,
          flexShrink: 0,
        }}
      >
        <h4 style={{ fontSize: isLandscape ? '11.5px' : '12px', fontWeight: 800, margin: 0, lineHeight: 1.3 }}>
          কার্ডের সাধারণ নির্দেশনাবলী
        </h4>
        <p style={{ fontSize: '8.5px', opacity: 0.85, margin: '2px 0 0 0', lineHeight: 1.25 }}>
          {settings.name}{settings.address ? `, ${settings.address}` : ''}
        </p>
      </div>

      {/* Back Body */}
      {isLandscape ? (
        // LANDSCAPE BACK (2-column layout so nothing clips inside 324px height)
        <div
          style={{
            flex: 1,
            minHeight: 0,
            padding: '10px 14px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            alignItems: 'stretch',
            fontSize: `${currentSize.backFontPx}px`,
            lineHeight: 1.45,
          }}
        >
          {/* Left Column: Rules */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: currentSize.backBoxPad,
              color: '#475569',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <p style={{ margin: 0 }}>১. এই কার্ডটি প্রতিষ্ঠানের সম্পত্তি এবং ডিউটির সময় সবসময় প্রদর্শনযোগ্য।</p>
              <p style={{ margin: 0 }}>২. কার্ডটি হস্তান্তরযোগ্য নয়। চাকরি সমাপ্তিতে ফেরত দিতে হবে।</p>
              <p style={{ margin: 0 }}>৩. কার্ডটি হারিয়ে গেলে অবিলম্বে কর্তৃপক্ষকে অবগত করতে হবে।</p>
            </div>
            <div
              style={{
                marginTop: '6px',
                paddingTop: '5px',
                borderTop: '1px dashed #cbd5e1',
                fontSize: '8.5px',
                fontWeight: 700,
                color: '#0f172a',
              }}
            >
              আইডি: <span style={{ fontFamily: 'monospace' }}>{employee.employeeId}</span> | রক্ত: <span style={{ color: '#e11d48' }}>{bloodGroup}</span>
            </div>
          </div>

          {/* Right Column: Employee Address & Return Address */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px' }}>
            <div
              style={{
                backgroundColor: '#f8fafc',
                padding: currentSize.backBoxPad,
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                color: '#1e293b',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px', fontWeight: 700 }}>
                <MapPin style={{ width: '12px', height: '12px', color: '#f43f5e', flexShrink: 0, marginTop: '2px' }} />
                <span style={{ wordBreak: 'break-word' }}>
                  ঠিকানা: <b style={{ color: '#020617' }}>{address}</b>
                </span>
              </div>
              {fatherName ? (
                <p style={{ margin: 0, paddingLeft: '17px', fontSize: '8.5px', color: '#475569' }}>
                  পিতার নাম: <b style={{ color: '#0f172a' }}>{fatherName}</b>
                </p>
              ) : null}
              <p style={{ margin: 0, paddingLeft: '17px', fontSize: '8.5px', color: '#475569' }}>
                জরুরি ফোন: <b style={{ color: '#0f172a', fontFamily: 'monospace' }}>{employee.phone || 'নেই'}</b>
              </p>
            </div>

            <div
              style={{
                backgroundColor: '#ecfdf5',
                padding: currentSize.backBoxPad,
                borderRadius: '10px',
                border: '1px solid #a7f3d0',
                color: '#064e3b',
                fontSize: '8.5px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <p style={{ margin: 0, fontWeight: 800 }}>হারিয়ে গেলে ফেরত দেওয়ার ঠিকানা:</p>
              <p style={{ margin: 0, fontWeight: 700 }}>{settings.name}</p>
              {settings.address ? <p style={{ margin: 0 }}>{settings.address}</p> : null}
              <p style={{ margin: 0, fontFamily: 'monospace', fontWeight: 700 }}>ফোন: {settings.phone || 'নেই'}</p>
            </div>
          </div>
        </div>
      ) : (
        // PORTRAIT BACK (scales across mini-pocket, cr80-portrait, large-pass)
        <div
          style={{
            flex: 1,
            minHeight: 0,
            padding: cardSize === 'mini-pocket' ? '8px 10px' : '11px 13px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-around',
            gap: cardSize === 'mini-pocket' ? '6px' : '8px',
            fontSize: `${currentSize.backFontPx}px`,
            lineHeight: 1.45,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#475569' }}>
            <p style={{ margin: 0 }}>১. এই কার্ডটি প্রতিষ্ঠানের সম্পত্তি এবং ডিউটির সময় সবসময় প্রদর্শনযোগ্য।</p>
            <p style={{ margin: 0 }}>২. কার্ডটি হস্তান্তরযোগ্য নয়। চাকরি সমাপ্তি বা প্রত্যাহারে ফেরত দিতে হবে।</p>
            <p style={{ margin: 0 }}>৩. কার্ডটি হারিয়ে গেলে অবিলম্বে কর্তৃপক্ষকে অবগত করতে হবে।</p>
          </div>

          <div
            style={{
              backgroundColor: '#f8fafc',
              padding: currentSize.backBoxPad,
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              color: '#1e293b',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px', fontWeight: 700 }}>
              <MapPin style={{ width: '13px', height: '13px', color: '#f43f5e', flexShrink: 0, marginTop: '2px' }} />
              <span style={{ wordBreak: 'break-word' }}>
                কর্মচারীর ঠিকানা: <b style={{ color: '#020617' }}>{address}</b>
              </span>
            </div>
            {fatherName ? (
              <p style={{ margin: 0, paddingLeft: '18px', fontSize: `${Math.max(8, currentSize.backFontPx - 0.5)}px`, color: '#475569' }}>
                পিতার নাম: <b style={{ color: '#0f172a' }}>{fatherName}</b>
              </p>
            ) : null}
            <p style={{ margin: 0, paddingLeft: '18px', fontSize: `${Math.max(8, currentSize.backFontPx - 0.5)}px`, color: '#475569' }}>
              জরুরি যোগাযোগ: <b style={{ color: '#0f172a', fontFamily: 'monospace' }}>{employee.phone || 'ফোন নেই'}</b>
            </p>
          </div>

          <div
            style={{
              backgroundColor: '#ecfdf5',
              padding: currentSize.backBoxPad,
              borderRadius: '12px',
              border: '1px solid #a7f3d0',
              color: '#064e3b',
              fontSize: `${Math.max(8, currentSize.backFontPx - 0.8)}px`,
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            <p style={{ margin: 0, fontWeight: 800 }}>হারিয়ে গেলে ফেরত দেওয়ার ঠিকানা:</p>
            <p style={{ margin: 0, fontWeight: 700 }}>{settings.name}</p>
            {settings.address ? <p style={{ margin: 0 }}>{settings.address}</p> : null}
            <p style={{ margin: 0, fontFamily: 'monospace', fontWeight: 700 }}>ফোন: {settings.phone || 'নেই'}</p>
          </div>
        </div>
      )}

      {/* Back Footer */}
      <div
        style={{
          padding: isLandscape ? '6px 12px' : '7px 12px',
          textAlign: 'center',
          borderTop: `1px solid ${theme.footerBorder}`,
          backgroundColor: theme.footerBg,
          fontSize: '8px',
          color: '#64748b',
          flexShrink: 0,
        }}
      >
        <p style={{ margin: 0, lineHeight: 1.3 }}>
          জরুরি রক্তের প্রয়োজনে: <span style={{ fontWeight: 800, color: '#e11d48' }}>{bloodGroup}</span>
          {isLandscape ? ' • অফসেট ছাপা, বাঁধাই ও প্রকাশনা সহকারী' : ''}
        </p>
        {!isLandscape && (
          <p style={{ margin: '2px 0 0 0', lineHeight: 1.25 }}>অফসেট ছাপা, বাঁধাই ও প্রকাশনা সহকারী</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="no-print fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-auto animate-fade-in max-h-[96vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <span>কর্মচারী ডিজিটাল আইডি কার্ড মেকার</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                  {employee.employeeId}
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                ভিন্ন সাইজ, একাধিক ডিজাইন ও পূর্ণাঙ্গ ঠিকানা সহ প্রফেশনাল আইডি কার্ড
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls Section: Sizes, Templates, and Options */}
        <div className="space-y-3 bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-200 text-xs">
          {/* Row 1: Size Selector */}
          <div>
            <label className="font-bold text-slate-700 flex items-center space-x-1.5 mb-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>আইডি কার্ড সাইজ বাছুন (Card Size):</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                {
                  id: 'cr80-portrait',
                  label: '১. পোর্ট্রেট CR80 (স্ট্যান্ডার্ড উল্লম্ব)',
                  dim: '৫৪ মিমি × ৮৬ মিমি (ঝুলানো ব্যাজ)',
                },
                {
                  id: 'cr80-landscape',
                  label: '২. ল্যান্ডস্কেপ CR80 (অনুভূমিক)',
                  dim: '৮৬ মিমি × ৫৪ মিমি (ক্লিপ কার্ড)',
                },
                {
                  id: 'large-pass',
                  label: '৩. বড় প্রেস পাস (A7 সাইজ)',
                  dim: '৭৪ মিমি × ১০৫ মিমি (অ্যাক্রিডিটেশন)',
                },
                {
                  id: 'mini-pocket',
                  label: '৪. স্মার্ট পকেট মিনি',
                  dim: '৫০ মিমি × ৮০ মিমি (ওয়ালেট সাইজ)',
                },
              ].map((sz) => (
                <button
                  key={sz.id}
                  onClick={() => setCardSize(sz.id as CardSize)}
                  className={`p-2 rounded-xl text-left border transition ${
                    cardSize === sz.id
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/50 text-emerald-950 font-bold shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <p className="font-bold text-[11px] truncate">{sz.label}</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">{sz.dim}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Template Design Selector */}
          <div>
            <label className="font-bold text-slate-700 flex items-center space-x-1.5 mb-1.5">
              <Palette className="w-3.5 h-3.5 text-emerald-600" />
              <span>কার্ডের ডিজাইন বাছুন (৬টি ভিন্ন ডিজাইন):</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
              {[
                { id: 'emerald', label: '১. প্রেস এমারেল্ড', color: 'bg-emerald-700' },
                { id: 'navy', label: '২. রয়্যাল নেভি', color: 'bg-blue-900' },
                { id: 'cmyk', label: '৩. সিএমওয়াইকে প্রেস', color: 'bg-cyan-500' },
                { id: 'dark', label: '৪. লাক্সারি ডার্ক', color: 'bg-slate-950' },
                { id: 'minimal', label: '৫. মডার্ন হোয়াইট', color: 'bg-slate-100 border border-slate-400' },
                { id: 'badge', label: '৬. অথরিটি ব্যাজ', color: 'bg-rose-800' },
              ].map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => setTemplate(tpl.id as CardTemplate)}
                  className={`px-2.5 py-1.5 rounded-xl transition flex items-center space-x-1.5 border ${
                    template === tpl.id
                      ? 'bg-white text-slate-900 border-slate-400 shadow-xs ring-2 ring-emerald-500 font-bold'
                      : 'bg-white/80 text-slate-600 border-slate-200 hover:bg-white'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${tpl.color}`}></span>
                  <span className="truncate text-[11px]">{tpl.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Row 3: Employee Father's Name, Address, Blood Group & Card Side Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-slate-200">
            {/* Father's Name field (optional) */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-[10px] font-bold text-slate-600 flex items-center space-x-1">
                  <User className="w-3 h-3 text-blue-600" />
                  <span>পিতার নাম (কার্ডের সামনে):</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsEditingFatherName((prev) => !prev)}
                  className="text-[10px] text-blue-700 hover:underline flex items-center space-x-0.5 font-bold"
                >
                  <Edit3 className="w-2.5 h-2.5" />
                  <span>{isEditingFatherName ? 'সম্পন্ন' : 'বদল'}</span>
                </button>
              </div>
              {isEditingFatherName ? (
                <input
                  type="text"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  placeholder="পিতার নাম লিখুন (ঐচ্ছিক)"
                  className="w-full text-xs p-1.5 border border-blue-400 rounded-lg bg-white outline-none font-medium"
                />
              ) : (
                <p className="text-xs font-semibold text-slate-800 bg-white px-2 py-1 rounded-lg border border-slate-200 truncate">
                  {fatherName ? `পিতা: ${fatherName}` : 'পিতার নাম দেওয়া হয়নি (ঐচ্ছিক)'}
                </p>
              )}
            </div>

            {/* Address field */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-[10px] font-bold text-slate-600 flex items-center space-x-1">
                  <MapPin className="w-3 h-3 text-rose-500" />
                  <span>ঠিকানা (পেছনের পাশে):</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsEditingAddress((prev) => !prev)}
                  className="text-[10px] text-emerald-700 hover:underline flex items-center space-x-0.5 font-bold"
                >
                  <Edit3 className="w-2.5 h-2.5" />
                  <span>{isEditingAddress ? 'সম্পন্ন' : 'ঠিকানা বদল'}</span>
                </button>
              </div>
              {isEditingAddress ? (
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="কর্মচারীর বর্তমান/স্থায়ী ঠিকানা লিখুন"
                  className="w-full text-xs p-1.5 border border-emerald-400 rounded-lg bg-white outline-none font-medium"
                />
              ) : (
                <p className="text-xs font-semibold text-slate-800 bg-white px-2 py-1 rounded-lg border border-slate-200 truncate">
                  {address || 'ঠিকানা দেওয়া হয়নি'}
                </p>
              )}
            </div>

            {/* Blood group & side toggler */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">রক্তের গ্রুপ:</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="text-xs border rounded-lg p-1 bg-white font-bold"
                >
                  {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-1 pt-3.5">
                <button
                  type="button"
                  onClick={() => setCardSide('front')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                    cardSide === 'front'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  সামনের পিঠ
                </button>
                <button
                  type="button"
                  onClick={() => setCardSide('back')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                    cardSide === 'back'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  পেছনের পিঠ
                </button>
                <button
                  type="button"
                  onClick={() => setCardSide('both')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                    cardSide === 'both'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  উভয় পিঠ
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Live ID Card Preview Canvas */}
        <div className="bg-slate-100 rounded-2xl p-4 sm:p-6 overflow-x-auto border border-slate-200 min-h-[360px] flex items-center justify-center">
          {cardSide === 'both' ? (
            <div
              ref={bothCardsRef}
              className="p-4 bg-white rounded-2xl inline-flex flex-wrap items-center justify-center gap-6 mx-auto"
            >
              {renderFrontCard()}
              {renderBackCard()}
            </div>
          ) : cardSide === 'front' ? (
            <div className="mx-auto shrink-0">{renderFrontCard()}</div>
          ) : (
            <div className="mx-auto shrink-0">{renderBackCard()}</div>
          )}
        </div>

        {/* Status / Success notification */}
        {downloadNotice && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center justify-between animate-fade-in">
            <span>{downloadNotice}</span>
            {printBlobUrl && (
              <a
                href={printBlobUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold inline-flex items-center space-x-1 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>নতুন ট্যাবে খুলুন / প্রিন্ট</span>
              </a>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t">
          <div className="text-xs text-slate-500 flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              নির্বাচিত সাইজ: <b>{currentSize.labelBn}</b> | ঠিকানা পেছনের পাশে
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            {printBlobUrl && (
              <a
                href={printBlobUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center space-x-1 transition border border-slate-300"
                title="ব্রাউজারে সরাসরি নতুন ট্যাবে প্রিন্ট ভিউ খুলুন"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>নতুন ট্যাবে প্রিন্ট</span>
              </a>
            )}

            <button
              type="button"
              disabled={isPrinting}
              onClick={handlePrintCard}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition shadow-xs disabled:opacity-50"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>{isPrinting ? 'প্রিন্ট হচ্ছে...' : 'আইডি কার্ড প্রিন্ট করুন'}</span>
            </button>

            <button
              type="button"
              disabled={isDownloading}
              onClick={handleDownloadPdf}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md transition disabled:opacity-50"
              title="আইডি কার্ডের আসল সাইজে PDF ফাইল ডাউনলোড করুন"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloading ? 'পিডিএফ তৈরি হচ্ছে...' : 'PDF ডাউনলোড (.pdf)'}</span>
            </button>

            <button
              type="button"
              disabled={isDownloading}
              onClick={handleDownloadImage}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1 transition"
              title="হাই-রেজোলিউশন ইমেজ (PNG) ডাউনলোড করুন"
            >
              <Download className="w-3.5 h-3.5 text-amber-300" />
              <span>ছবি (PNG)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
