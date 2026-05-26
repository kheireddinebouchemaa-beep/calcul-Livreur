/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Formats a number to Algerian Dinar formatting (space as thousands separator, "DA" suffix).
 * Returns '–' in gray if amount is 0.
 */
export function formatDA(amount: number): string {
  if (amount === 0) return '–';
  const formatted = new Intl.NumberFormat('fr-DZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount).replace(/ /g, ' ').replace(/\s/g, ' ');
  return `${formatted} DA`;
}

/**
 * Formats YYYY-MM-DD date to a human readable French format.
 */
export function formatDateFR(dateStr: string): string {
  if (!dateStr || dateStr === 'Inconnu') return 'Inconnu';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function getStationNum(name: string): number {
  const match = name.match(/^[\d\/]+/);
  if (!match) return 9999;
  return parseInt(match[0].split('/')[0], 10);
}
