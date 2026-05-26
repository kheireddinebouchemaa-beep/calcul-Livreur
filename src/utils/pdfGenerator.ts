/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Captures the HTML pages and downloads them as a professional PDF.
 */
export async function generateAndDownloadPDF(totalPages: number): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: 'a4',
  });

  // A4 size standard dimensions at 72 DPI are 595 x 842.
  // In our HTML layout, we use 794px x 1123px (which matches A4 aspect ratio at ~96 DPI).
  // We will scale it in jsPDF when printing.
  
  for (let i = 1; i <= totalPages; i++) {
    const pageId = `pdf-page-${i}`;
    const pageElement = document.getElementById(pageId);
    
    if (!pageElement) {
      console.warn(`Could not find element with id: ${pageId}. Skipping.`);
      continue;
    }

    // Add new page after the first page
    if (i > 1) {
      pdf.addPage();
    }

    try {
      // Capture canvas of the page
      const canvas = await html2canvas(pageElement, {
        scale: 2, // 2x scale for premium print-ready resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FFFFFF',
        logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      // A4 dimensions in pixels inside jsPDF (approx 446 x 631 at standard PDF point grid)
      // Standard px dimensions for jsPDF with A4 form:
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
    } catch (err) {
      console.error(`Error rendering page ${i} to PDF:`, err);
    }
  }

  // Save the final PDF document
  const fileName = `IMIR_LOGISTICS_Cash_Livreurs_${new Date().toISOString().slice(0, 10)}.pdf`;
  pdf.save(fileName);
}
