import { jsPDF } from 'jspdf';
import { toJpeg } from 'html-to-image';
import html2canvas from 'html2canvas';

export interface PdfExportOptions {
  filename?: string;
  margin?: [number, number, number, number] | number; // in mm: [top, left, bottom, right] or single margin
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'a5' | 'legal' | 'a7' | 'cr80' | [number, number];
  scale?: number;
  targetElement?: HTMLElement | null;
}

/**
 * Robust Client-Side PDF Exporter using native jsPDF & html-to-image / html2canvas
 * Supports single-page auto-fit, multi-page documents, and custom badge/card sizes.
 */
export async function exportToPdf(
  elementOrHtml: HTMLElement | string,
  options: PdfExportOptions = {}
): Promise<void> {
  const {
    filename = `makkah_printers_${Date.now()}.pdf`,
    margin = 6,
    orientation = 'portrait',
    format = 'a4',
    scale = 2.5,
    targetElement = null,
  } = options;

  const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

  // Parse margins [top, left, bottom, right]
  const [mTop, mLeft, mBottom, mRight] = Array.isArray(margin)
    ? margin
    : [margin, margin, margin, margin];

  let targetEl: HTMLElement;
  let shouldCleanup = false;

  if (targetElement && targetElement instanceof HTMLElement) {
    targetEl = targetElement;
  } else if (elementOrHtml instanceof HTMLElement) {
    targetEl = elementOrHtml;
  } else {
    // If it's an HTML string, check if an existing rendered preview element is already in the DOM
    const visibleContent =
      (document.querySelector('.print-rendered-content') as HTMLElement) ||
      (document.querySelector('.print-container') as HTMLElement);

    if (visibleContent && visibleContent.innerHTML.length > 50) {
      targetEl = visibleContent;
    } else {
      // Create a temporary off-screen container with full stylesheets and font rendering
      shouldCleanup = true;
      targetEl = document.createElement('div');
      targetEl.className = 'print-container print-pdf-capture print-rendered-content';
      targetEl.style.position = 'fixed';
      targetEl.style.top = '0';
      targetEl.style.left = '0';
      targetEl.style.width = orientation === 'landscape' ? '1120px' : '820px';
      targetEl.style.zIndex = '-99999';
      targetEl.style.opacity = '0';
      targetEl.style.pointerEvents = 'none';
      targetEl.style.backgroundColor = '#ffffff';
      targetEl.style.color = '#000000';
      targetEl.style.fontFamily = "'Hind Siliguri', 'Noto Sans Bengali', system-ui, sans-serif";

      // Append all existing styles so Tailwind classes are preserved
      const styleSheets = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
      let stylesHtml = '';
      styleSheets.forEach((s) => {
        stylesHtml += s.outerHTML;
      });

      targetEl.innerHTML = `${stylesHtml}<div style="padding: 16px;">${elementOrHtml}</div>`;
      document.body.appendChild(targetEl);
    }
  }

  try {
    // Wait for fonts and layouts to settle
    if ('fonts' in document) {
      try {
        await (document as any).fonts.ready;
      } catch {
        // ignore font timeout
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 150));

    let imgData: string = '';

    try {
      // Primary engine: html-to-image (SVG foreignObject), immune to oklch / Tailwind v4 parse errors.
      // skipFonts: true prevents html-to-image from reading cross-origin cssRules / fetching remote Google Fonts CSS inside sandboxed iframes.
      imgData = await toJpeg(targetEl, {
        quality: 0.98,
        pixelRatio: Math.min(scale || 2.5, 3),
        backgroundColor: '#ffffff',
        cacheBust: true,
        skipFonts: true,
        fontEmbedCSS: '',
      });
    } catch (renderErr) {
      console.warn('toJpeg failed, attempting html2canvas fallback:', renderErr);
      const canvas = await html2canvas(targetEl, {
        scale: Math.min(scale, 2.5),
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: targetEl.scrollWidth || 1024,
      });
      imgData = canvas.toDataURL('image/jpeg', 0.98);
    }

    // Handling ID card or badge custom sizes
    if (format === 'cr80' || (Array.isArray(format) && format.length === 2)) {
      const isLandscape = orientation === 'landscape';
      const cardWidth = Array.isArray(format) ? format[0] : (isLandscape ? 86 : 54);
      const cardHeight = Array.isArray(format) ? format[1] : (isLandscape ? 54 : 86);

      // Sizing in jsPDF: [width, height] in mm
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [cardWidth, cardHeight],
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, cardWidth, cardHeight, undefined, 'FAST');

      // Trigger file download reliably
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
      return;
    }

    // Standard document dimensions in mm
    const baseSizes: Record<'a4' | 'a5' | 'legal' | 'a7', [number, number]> = {
      a4: [210, 297],
      a5: [148, 210],
      legal: [216, 356],
      a7: [74, 105],
    };
    const [baseW, baseH] = baseSizes[format] || baseSizes.a4;
    const pageWidth = orientation === 'landscape' ? baseH : baseW;
    const pageHeight = orientation === 'landscape' ? baseW : baseH;

    const printableWidth = Math.max(20, pageWidth - (mLeft + mRight));
    const printableHeight = Math.max(20, pageHeight - (mTop + mBottom));

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format,
    });

    const imgProps = pdf.getImageProperties(imgData);
    const imgWidth = printableWidth;
    const imgHeight = imgProps.width > 0 ? (imgProps.height * imgWidth) / imgProps.width : printableHeight;

    // If it fits nicely on a single page
    if (imgHeight <= printableHeight) {
      pdf.addImage(imgData, 'JPEG', mLeft, mTop, imgWidth, imgHeight, undefined, 'FAST');
    } else {
      // Multi-page document
      let heightLeft = imgHeight;
      let position = mTop;

      pdf.addImage(imgData, 'JPEG', mLeft, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= printableHeight;

      while (heightLeft > 0) {
        position = position - printableHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', mLeft, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= printableHeight;
      }
    }

    // Trigger standard document download reliably
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
  } catch (error) {
    console.error('exportToPdf failed:', error);
    throw error;
  } finally {
    if (shouldCleanup && targetEl && targetEl.parentNode) {
      targetEl.parentNode.removeChild(targetEl);
    }
  }
}

/**
 * Downloads plain text file
 */
export function exportToText(text: string, filename: string = 'document.txt'): void {
  const cleanFilename = filename.endsWith('.txt') ? filename : `${filename}.txt`;
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = cleanFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Downloads HTML file
 */
export function exportToHtml(html: string, filename: string = 'document.html'): void {
  const cleanFilename = filename.endsWith('.html') ? filename : `${filename}.html`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = cleanFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
