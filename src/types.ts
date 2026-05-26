/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface EcotrackRow {
  id: string;      // ID Colis for deduplication
  total: number;   // Montant COD en DA ("Total")
  livreur: string; // Nom du livreur
  station: string; // Nom de la station (trimmed)
  livreLe: string; // Date/heure de livraison (YYYY-MM-DD HH:MM:SS)
  dateStr: string; // Date only (YYYY-MM-DD)
}

export interface GroupedData {
  station: string;
  dateStr: string;
  nbColis: number;
  montant: number;
}

export interface StationGroup {
  station: string;
  nbJours: number;
  nbColis: number;
  totalDA: number;
  items: Array<{
    dateStr: string;
    nbColis: number;
    montant: number;
  }>;
}

export interface ImportSummary {
  fileCount: number;
  totalRows: number;
  ignoredDuplicates: number;
  fileNames: string[];
}
