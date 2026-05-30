/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Captures the HTML pages and downloads them as a professional PDF.
 */
export async function generateAndDownloadPDF(): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: 'a4',
  });

  // Query all page elements dynamically that start with pdf-page- and sort them numerically
  const pageElements = Array.from(document.querySelectorAll('[id^="pdf-page-"]')) as HTMLElement[];
  pageElements.sort((a, b) => {
    const numA = parseInt(a.id.replace('pdf-page-', '').split('-')[0], 10);
    const numB = parseInt(b.id.replace('pdf-page-', '').split('-')[0], 10);
    return numA - numB;
  });

  if (pageElements.length === 0) {
    console.warn('No PDF pages found to generate PDF.');
    return;
  }

  for (let i = 0; i < pageElements.length; i++) {
    const pageElement = pageElements[i];

    // Add new page after the first page
    if (i > 0) {
      pdf.addPage();
    }

    try {
      // Capture canvas of the page with correct coordinates to avoid offset or clipping
      const canvas = await html2canvas(pageElement, {
        scale: 2, // 2x scale for premium print-ready resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FFFFFF',
        logging: false,
        scrollX: 0,
        scrollY: 0,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
    } catch (err) {
      console.error(`Error rendering page ${i + 1} to PDF:`, err);
    }
  }

  // Save the final PDF document
  const fileName = `IMIR_LOGISTICS_Cash_Livreurs_${new Date().toISOString().slice(0, 10)}.pdf`;
  pdf.save(fileName);
}
