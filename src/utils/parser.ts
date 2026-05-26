/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { EcotrackRow } from '../types';

/**
 * Parser utility for ECOTRACK Excel/CSV exports.
 * Rule: skiprows=1 (skips the first row, headers are on row 1, data starts on row 2).
 * Columns:
 * - J (index 9) / "Total": COD amount in DA
 * - M (index 12) / "Livreur": Delivery rider name
 * - O (index 14) / "Station": Station name
 * - R (index 17) / "Livré le": Delivery date (YYYY-MM-DD HH:MM:SS)
 * - A (index 0) / "ID": Unique parcel ID
 */
export async function parseEcotrackFile(file: File): Promise<{ rows: EcotrackRow[]; ignoredCount: number }> {
  return new Promise((resolve, reject) => {
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (extension === '.csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        // Parse CSV with PapaParse
        Papa.parse(text, {
          skipEmptyLines: true,
          complete: (results) => {
            try {
              const data = results.data as string[][];
              if (data.length <= 2) {
                // Not enough data
                resolve({ rows: [], ignoredCount: 0 });
                return;
              }
              // Skip first row, headers are row 1
              const headers = data[1].map(h => String(h).trim());
              const rawRows = data.slice(2);
              
              const parsed = processRawDataRows(rawRows, headers);
              resolve(parsed);
            } catch (err) {
              reject(err);
            }
          },
          error: (err) => {
            reject(err);
          }
        });
      };
      reader.onerror = (err) => reject(err);
      reader.readAsText(file, 'UTF-8');
    } else if (extension === '.xlsx' || extension === '.xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const ab = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(ab, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheetName];
          
          // Convert sheet to 2D array
          const data = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
          
          if (data.length <= 2) {
            resolve({ rows: [], ignoredCount: 0 });
            return;
          }
          
          // Skip first row, headers on row 1
          const headers = data[1].map(h => String(h || '').trim());
          const rawRows = data.slice(2);
          
          const parsed = processRawDataRows(rawRows, headers);
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error("Format de fichier non supporté. Veuillez importer un fichier .xlsx, .xls ou .csv."));
    }
  });
}

function processRawDataRows(rawRows: any[][], headers: string[]): { rows: EcotrackRow[]; ignoredCount: number } {
  // Let's find index of important headers
  let idIndex = headers.findIndex(h => /^(id|id colis|code|barcode|n°|n° colis|référence|reference)$/i.test(h));
  let totalIndex = headers.findIndex(h => /^(total|montant|cod|cash)$/i.test(h));
  let livreurIndex = headers.findIndex(h => /^(livreur|nom livreur|nom du livreur)$/i.test(h));
  let stationIndex = headers.findIndex(h => /^(station|nom station|nom de la station)$/i.test(h));
  let livreLeIndex = headers.findIndex(h => /^(livré le|livre le|date|date livraison|livraison|date de livraison)$/i.test(h));

  // Fallbacks based on fixed columns J, M, O, R if headers didn't match perfectly
  if (idIndex === -1) idIndex = 0; // Col A
  if (totalIndex === -1) totalIndex = 9; // Col J
  if (livreurIndex === -1) livreurIndex = 12; // Col M
  if (stationIndex === -1) stationIndex = 14; // Col O
  if (livreLeIndex === -1) livreLeIndex = 17; // Col R

  const rows: EcotrackRow[] = [];
  let ignoredCount = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const rawRow = rawRows[i];
    if (!rawRow || rawRow.length === 0) continue;
    
    // Extracted raw values
    const rawId = rawRow[idIndex] !== undefined ? String(rawRow[idIndex]).trim() : '';
    const rawTotal = rawRow[totalIndex];
    const rawLivreur = rawRow[livreurIndex] !== undefined ? String(rawRow[livreurIndex]).trim() : 'Inconnu';
    const rawStation = rawRow[stationIndex] !== undefined ? String(rawRow[stationIndex]).trim() : 'Inconnu';
    const rawLivreLe = rawRow[livreLeIndex] !== undefined ? String(rawRow[livreLeIndex]).trim() : '';

    // If there's absolutely no data in critical fields, skip
    if (!rawId && !rawTotal && !rawLivreLe) {
      continue;
    }

    // Process ID (guaranteeing one, generate fallback if missing)
    const id = rawId || `ROW-${i}-${Date.now()}`;

    // Process Total
    let total = 0;
    if (rawTotal !== undefined && rawTotal !== null && rawTotal !== '') {
      // Clean string currency symbols or spaces if it's a string
      if (typeof rawTotal === 'string') {
        const cleanedStr = rawTotal.replace(/[^\d.,-]/g, '').replace(',', '.');
        total = parseFloat(cleanedStr);
      } else if (typeof rawTotal === 'number') {
        total = rawTotal;
      }
    }
    if (isNaN(total)) total = 0;

    // Process Date
    let dateStr = 'Inconnu';
    let livreLe = rawLivreLe;
    if (rawLivreLe) {
      // Regex check YYYY-MM-DD
      const dateMatch = rawLivreLe.match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
      if (dateMatch) {
        dateStr = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
      } else {
        // SheetJS can sometimes parse dates into serial numbers or date objects
        // If it's a number, convert Excel serial to Date
        const numDate = Number(rawLivreLe);
        if (!isNaN(numDate) && numDate > 20000 && numDate < 60000) {
          const dateObj = XLSX.SSF.parse_date_code(numDate);
          if (dateObj) {
            const m = String(dateObj.m).padStart(2, '0');
            const d = String(dateObj.d).padStart(2, '0');
            dateStr = `${dateObj.y}-${m}-${d}`;
            livreLe = `${dateStr} ${String(dateObj.hh).padStart(2, '0')}:${String(dateObj.mm).padStart(2, '0')}:${String(dateObj.ss).padStart(2, '0')}`;
          }
        }
      }
    }

    // Trim station name to normalize whitespace as per "Noms de stations: appliquer .trim() pour normaliser les espaces."
    const station = rawStation.trim();

    rows.push({
      id,
      total,
      livreur: rawLivreur,
      station,
      livreLe,
      dateStr
    });
  }

  return { rows, ignoredCount };
}
