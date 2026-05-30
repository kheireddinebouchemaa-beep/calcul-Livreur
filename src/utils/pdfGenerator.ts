/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Converts OKLCH and OKLAB color string definitions into browser-safe, standard HSL/HSLA equivalents that
 * html2canvas can successfully parse and render without throwing fatal color parser errors.
 */
function sanitizeCssColor(val: string): string {
  if (!val) return val;
  let result = val;

  // 1. Match oklch(L C H) or oklch(L C H / A)
  const oklchRegex = /oklch\s*\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/gi;
  result = result.replace(oklchRegex, (_match, p1, p2, p3, p4) => {
    const l = p1.endsWith('%') ? parseFloat(p1) / 100 : parseFloat(p1);
    const c = parseFloat(p2);
    const h = parseFloat(p3);
    const alpha = p4 ? (p4.endsWith('%') ? parseFloat(p4) / 100 : parseFloat(p4)) : 1;

    // Convert OKLCH to standard HSL
    // Hue 'h' maps directly to HSL hue.
    // Chroma 'c' is mapped relative to standard max chroma ~0.4.
    const s = Math.min(100, Math.max(0, (c / 0.4) * 100));
    const light = Math.min(100, Math.max(0, l * 100));
    
    return alpha === 1 
      ? `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, ${light.toFixed(1)}%)`
      : `hsla(${h.toFixed(1)}, ${s.toFixed(1)}%, ${light.toFixed(1)}%, ${alpha})`;
  });

  // 2. Match oklab(L A B) or oklab(L A B / A)
  const oklabRegex = /oklab\s*\(\s*([\d.]+%?)\s+([+-]?[\d.]+)\s+([+-]?[\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/gi;
  result = result.replace(oklabRegex, (_match, p1, p2, p3, p4) => {
    const l = p1.endsWith('%') ? parseFloat(p1) / 100 : parseFloat(p1);
    const aVal = parseFloat(p2);
    const bVal = parseFloat(p3);
    const alpha = p4 ? (p4.endsWith('%') ? parseFloat(p4) / 100 : parseFloat(p4)) : 1;

    // Convert OKLAB to OKLCH coordinates
    const c = Math.sqrt(aVal * aVal + bVal * bVal);
    let h = Math.atan2(bVal, aVal) * (180 / Math.PI);
    if (h < 0) h += 360;

    // Convert OKLCH to standard HSL
    const s = Math.min(100, Math.max(0, (c / 0.4) * 100));
    const light = Math.min(100, Math.max(0, l * 100));

    return alpha === 1 
      ? `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, ${light.toFixed(1)}%)`
      : `hsla(${h.toFixed(1)}, ${s.toFixed(1)}%, ${light.toFixed(1)}%, ${alpha})`;
  });

  // 3. Match modern color(oklch ... / oklab ...) variations
  const colorSpaceRegex = /color\s*\(\s*(oklch|oklab)\s+([\d.%]+)\s+([+-]?[\d.]+)\s+([+-]?[\d.]+)(?:\s*\/\s*([\d.%]+))?\s*\)/gi;
  result = result.replace(colorSpaceRegex, (_match, space, p1, p2, p3, p4) => {
    const l = p1.endsWith('%') ? parseFloat(p1) / 100 : parseFloat(p1);
    const arg1 = parseFloat(p2);
    const arg2 = parseFloat(p3);
    const alpha = p4 ? (p4.endsWith('%') ? parseFloat(p4) / 100 : parseFloat(p4)) : 1;

    let c = arg1;
    let h = arg2;

    if (space.toLowerCase() === 'oklab') {
      c = Math.sqrt(arg1 * arg1 + arg2 * arg2);
      h = Math.atan2(arg2, arg1) * (180 / Math.PI);
      if (h < 0) h += 360;
    }

    const s = Math.min(100, Math.max(0, (c / 0.4) * 100));
    const light = Math.min(100, Math.max(0, l * 100));

    return alpha === 1 
      ? `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, ${light.toFixed(1)}%)`
      : `hsla(${h.toFixed(1)}, ${s.toFixed(1)}%, ${light.toFixed(1)}%, ${alpha})`;
  });

  return result;
}

/**
 * Temporarily wraps style tags, link elements, AND monkeypatches window.getComputedStyle to translate
 * all oklch() and oklab() colors into safe HSL colors while html2canvas captures.
 */
async function withModernColorWorkaround<T>(fn: () => Promise<T>): Promise<T> {
  const stylesToRestore: { element: HTMLStyleElement; originalText: string }[] = [];
  const linksToRestore: { element: HTMLLinkElement; tempStyle: HTMLStyleElement }[] = [];

  const sanitizeCss = (css: string) => {
    return sanitizeCssColor(css);
  };

  // Keep reference to the browser's original getComputedStyle API
  const originalGetComputedStyle = window.getComputedStyle;

  try {
    // 1. Sanitize style blocks text content
    const styleElements = Array.from(document.querySelectorAll('style'));
    for (const styleEl of styleElements) {
      const text = styleEl.textContent || '';
      if (text.includes('oklch') || text.includes('oklab')) {
        stylesToRestore.push({ element: styleEl, originalText: text });
        styleEl.textContent = sanitizeCss(text);
      }
    }

    // 2. Fetch and sanitize accessible style sheets linked externally or locally
    const linkElements = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
    for (const linkEl of linkElements) {
      try {
        const url = linkEl.href;
        if (url.startsWith(window.location.origin) || url.startsWith('/') || !url.startsWith('http')) {
          const response = await fetch(url);
          if (response.ok) {
            const cssText = await response.text();
            if (cssText.includes('oklch') || cssText.includes('oklab')) {
              const tempStyle = document.createElement('style');
              tempStyle.id = 'temp-pdf-fallback-style';
              tempStyle.textContent = sanitizeCss(cssText);
              document.head.appendChild(tempStyle);

              linkEl.disabled = true;
              linksToRestore.push({ element: linkEl, tempStyle });
            }
          }
        }
      } catch (err) {
        console.warn('Preprocessing of stylesheet link bypassed:', linkEl.href, err);
      }
    }

    // 3. Monkeypatch getComputedStyle so returned color attributes match standard HSL syntax
    window.getComputedStyle = function (elt, pseudoElt) {
      const style = originalGetComputedStyle(elt, pseudoElt);
      return new Proxy(style, {
        get(target, prop) {
          const val = target[prop as any];
          if (typeof val === 'string') {
            if (val.toLowerCase().includes('oklch') || val.toLowerCase().includes('oklab')) {
              return sanitizeCssColor(val);
            }
          } else if (typeof val === 'function') {
            if (prop === 'getPropertyValue') {
              return function(propertyName: string) {
                const originalVal = target.getPropertyValue(propertyName);
                if (typeof originalVal === 'string' && (originalVal.toLowerCase().includes('oklch') || originalVal.toLowerCase().includes('oklab'))) {
                  return sanitizeCssColor(originalVal);
                }
                return originalVal;
              };
            }
            return (val as Function).bind(target);
          }
          return val;
        }
      });
    };

    // Call the actual capture worker
    return await fn();

  } finally {
    // Restore raw style tag contents
    for (const item of stylesToRestore) {
      item.element.textContent = item.originalText;
    }

    // Restore standard stylesheet links
    for (const item of linksToRestore) {
      item.element.disabled = false;
      if (item.tempStyle.parentNode) {
        item.tempStyle.parentNode.removeChild(item.tempStyle);
      }
    }

    // Restore the browser's original getComputedStyle API
    window.getComputedStyle = originalGetComputedStyle;
  }
}

/**
 * Captures the HTML pages and downloads them as a professional A4 report PDF.
 */
export async function generateAndDownloadPDF(): Promise<void> {
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  // Scroll window to top so that absolute elements at (0, 0) are perfectly in viewport for html2canvas
  window.scrollTo(0, 0);

  try {
    await withModernColorWorkaround(async () => {
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

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4',
        compress: true, // Compress option reduces file size and avoids Android viewer rendering bugs
      });

      // Create an offscreen temporary container at the very top of document body 
      // to ensure html2canvas handles layouts, styles, and dimensions pristine-style
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.top = '0px';
      tempContainer.style.left = '0px';
      tempContainer.style.width = '794px';
      tempContainer.style.zIndex = '-999999';
      tempContainer.style.backgroundColor = '#FFFFFF';
      tempContainer.style.pointerEvents = 'none';
      document.body.appendChild(tempContainer);

      for (let i = 0; i < pageElements.length; i++) {
        const originalPage = pageElements[i];

        // Add new page after the first page
        if (i > 0) {
          pdf.addPage();
        }

        try {
          // Clone the target page node into the temporary container
          const clone = originalPage.cloneNode(true) as HTMLElement;
          clone.style.position = 'relative';
          clone.style.top = '0';
          clone.style.left = '0';
          clone.style.margin = '0';
          clone.style.boxSizing = 'border-box';
          tempContainer.appendChild(clone);

          // Capture the cloned page perfectly with zero scroll shift offsets
          const canvas = await html2canvas(clone, {
            scale: 2, // 2x scale for premium crispness
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#FFFFFF',
            logging: false,
            windowWidth: 794,
            windowHeight: 1123,
            scrollX: 0,
            scrollY: 0,
          });

          // Clear the clone immediately for the next iteration
          tempContainer.removeChild(clone);

          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();

          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        } catch (err) {
          console.error(`Error rendering page ${i + 1} to PDF:`, err);
        }
      }

      // Clean up temporary container
      if (tempContainer.parentNode) {
        tempContainer.parentNode.removeChild(tempContainer);
      }

      // Save the final PDF document
      const fileName = `IMIR_LOGISTICS_Cash_Livreurs_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);
    });
  } finally {
    // Restore window scroll position
    window.scrollTo(scrollX, scrollY);
  }
}

/**
 * Captures and exports the exact dashboard and table currently on screen (including dark styling, current filters & state)
 */
export async function generateAndDownloadCurrentViewPDF(): Promise<void> {
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  // Scroll window to top so that elements are fully in viewport for html2canvas
  window.scrollTo(0, 0);

  try {
    await withModernColorWorkaround(async () => {
      const element = document.getElementById('dashboard-capture-area');
      if (!element) {
        console.warn('Could not find dashboard-capture-area element.');
        return;
      }

      try {
        const rect = element.getBoundingClientRect();
        const originalWidth = rect.width;
        const originalHeight = rect.height;

        // Perfect unclipped capturing with scroll variables normalized
        const canvas = await html2canvas(element, {
          scale: 2, // High resolution crispness
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#0A0A0B', // Matches dark background exactly
          logging: false,
          scrollX: 0,
          scrollY: 0,
          width: originalWidth,
          height: originalHeight,
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        const pdf = new jsPDF({
          orientation: originalWidth > originalHeight ? 'landscape' : 'portrait',
          unit: 'px',
          format: [originalWidth, originalHeight],
          compress: true, // Prevents giant files or blank pages on modern viewers
        });

        pdf.addImage(imgData, 'JPEG', 0, 0, originalWidth, originalHeight, undefined, 'FAST');

        const fileName = `IMIR_LIVREURS_Vue_Actuelle_${new Date().toISOString().slice(0, 10)}.pdf`;
        pdf.save(fileName);
      } catch (error) {
        console.error('Failed to export current view to PDF:', error);
      }
    });
  } finally {
    // Restore window scroll position
    window.scrollTo(scrollX, scrollY);
  }
}
