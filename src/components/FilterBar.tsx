/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Filter, List, Grid, FileText, CheckSquare, Square, Download } from 'lucide-react';

interface FilterBarProps {
  stations: string[];
  dates: string[];
  livreurs: string[];
  selectedStation: string;
  selectedDate: string;
  selectedType: string;
  selectedLivreur: string;
  selectedSort: string;
  hideZeroDA: boolean;
  activeView: 'ligne' | 'station';
  onStationChange: (station: string) => void;
  onDateChange: (date: string) => void;
  onTypeChange: (type: string) => void;
  onLivreurChange: (livreur: string) => void;
  onSortChange: (sort: string) => void;
  onHideZeroDAChange: (hide: boolean) => void;
  onViewChange: (view: 'ligne' | 'station') => void;
  onReset: () => void;
  onDownloadPDF: () => void;
  onDownloadCSV: () => void;
  isDownloadable: boolean;
}

export default function FilterBar({
  stations,
  dates,
  livreurs,
  selectedStation,
  selectedDate,
  selectedType,
  selectedLivreur,
  selectedSort,
  hideZeroDA,
  activeView,
  onStationChange,
  onDateChange,
  onTypeChange,
  onLivreurChange,
  onSortChange,
  onHideZeroDAChange,
  onViewChange,
  onReset,
  onDownloadPDF,
  onDownloadCSV,
  isDownloadable
}: FilterBarProps) {

  // Helper to color non-default selections crimson #C0392B
  const getSelectClass = (hasNonDefaultValue: boolean) => {
    return `px-3 py-1.5 text-sm bg-[#0A0A0B] border rounded focus:outline-none focus:ring-1 transition-all ${
      hasNonDefaultValue 
        ? 'text-[#C0392B] border-[#C0392B]/50 focus:ring-[#C0392B] focus:border-[#C0392B] font-medium' 
        : 'text-zinc-300 border-zinc-800 focus:ring-emerald-500 focus:border-emerald-500 font-normal'
    }`;
  };

  return (
    <div className="w-full bg-[#0F0F11] rounded-lg shadow-lg border border-zinc-800/50 p-4 mb-6 flex flex-col gap-4">
      {/* Ligne 1 : Station, Date, Type, Livreur */}
      <div className="flex flex-wrap items-center gap-4 border-b border-zinc-800/20 pb-4">
        {/* Header Icon / Label */}
        <div className="flex items-center gap-2 text-zinc-400 mr-2 text-sm font-medium">
          <Filter className="h-4 w-4 text-emerald-500" />
          <span>Filtres :</span>
        </div>

        {/* Station Selector */}
        <div className="flex flex-col min-w-[200px] flex-1 sm:flex-initial">
          <label htmlFor="select-station" className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500 mb-1">Station</label>
          <select
            id="select-station"
            value={selectedStation}
            onChange={(e) => onStationChange(e.target.value)}
            className={getSelectClass(selectedStation !== "")}
          >
            <option value="">Toutes les stations ({stations.length})</option>
            {stations.map((sta) => (
              <option key={sta} value={sta} className="bg-[#0F0F11] text-zinc-200">
                {sta}
              </option>
            ))}
          </select>
        </div>

        <div className="hidden sm:block text-zinc-800 font-light select-none">|</div>

        {/* Date Selector */}
        <div className="flex flex-col min-w-[150px] flex-1 sm:flex-initial">
          <label htmlFor="select-date" className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500 mb-1">Date de livraison</label>
          <select
            id="select-date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className={getSelectClass(selectedDate !== "")}
          >
            <option value="">Toutes les dates ({dates.length})</option>
            {dates.map((date) => {
              const parts = date.split('-');
              const displayDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : date;
              return (
                <option key={date} value={date} className="bg-[#0F0F11] text-zinc-200">
                  {displayDate}
                </option>
              );
            })}
          </select>
        </div>

        <div className="hidden sm:block text-zinc-800 font-light select-none">|</div>

        {/* Type Selector (Stop Desk / Livreur) */}
        <div className="flex flex-col min-w-[180px] flex-1 sm:flex-initial">
          <label htmlFor="select-type" className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500 mb-1">Type de livraison</label>
          <select
            id="select-type"
            value={selectedType}
            onChange={(e) => onTypeChange(e.target.value)}
            className={getSelectClass(selectedType !== "all")}
          >
            <option value="all" className="bg-[#0F0F11] text-zinc-200">Tous les colis</option>
            <option value="livreur" className="bg-[#0F0F11] text-zinc-200">Livreurs uniquement</option>
            <option value="stopdesk" className="bg-[#0F0F11] text-zinc-200">Stop Desk uniquement</option>
          </select>
        </div>

        {/* Livreur Selector (Conditional based on Type) */}
        {selectedType !== 'stopdesk' && (
          <>
            <div className="hidden sm:block text-zinc-800 font-light select-none">|</div>
            <div className="flex flex-col min-w-[180px] flex-1 sm:flex-initial">
              <label htmlFor="select-livreur" className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500 mb-1">Livreur</label>
              <select
                id="select-livreur"
                value={selectedLivreur}
                onChange={(e) => onLivreurChange(e.target.value)}
                className={getSelectClass(selectedLivreur !== "")}
              >
                <option value="">Tous les livreurs ({livreurs.length})</option>
                {livreurs.map((liv) => (
                  <option key={liv} value={liv} className="bg-[#0F0F11] text-zinc-200">
                    {liv}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      {/* Ligne 2 : Tri, Masquer 0 DA, View, Reset, PDF */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Sorter Selector */}
          <div className="flex flex-col min-w-[180px] flex-1 sm:flex-initial">
            <label htmlFor="select-sort" className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500 mb-1">Trier par</label>
            <select
              id="select-sort"
              value={selectedSort}
              onChange={(e) => onSortChange(e.target.value)}
              className={getSelectClass(selectedSort !== "date_desc")}
            >
              <option value="amount_desc" className="bg-[#0F0F11] text-zinc-200">Montant ↓ (plus grand en 1er)</option>
              <option value="amount_asc" className="bg-[#0F0F11] text-zinc-200">Montant ↑ (plus petit en 1er)</option>
              <option value="station_asc" className="bg-[#0F0F11] text-zinc-200">Station 1 → 66 (numérique ↑)</option>
              <option value="station_desc" className="bg-[#0F0F11] text-zinc-200">Station 66 → 1 (numérique ↓)</option>
              <option value="station_alpha" className="bg-[#0F0F11] text-zinc-200">Station A → Z (alphabétique)</option>
              <option value="date_desc" className="bg-[#0F0F11] text-zinc-200">Date ↓ (plus récente en 1er)</option>
              <option value="date_asc" className="bg-[#0F0F11] text-zinc-200">Date ↑ (plus ancienne en 1er)</option>
              <option value="colis_desc" className="bg-[#0F0F11] text-zinc-200">Nb colis ↓</option>
            </select>
          </div>

          <div className="hidden sm:block text-zinc-800 font-light select-none">|</div>

          {/* Mask 0 DA Checkbox */}
          <div className="flex items-center h-[38px] cursor-pointer select-none self-end">
            <button
              id="checkbox-hide-zero"
              onClick={() => onHideZeroDAChange(!hideZeroDA)}
              className="flex items-center gap-2 text-sm text-zinc-400 font-medium hover:text-zinc-200 focus:outline-none"
            >
              <span>
                {hideZeroDA ? (
                  <CheckSquare className="h-4 w-4 text-emerald-500 fill-emerald-500/10" />
                ) : (
                  <Square className="h-4 w-4 text-zinc-600" />
                )}
              </span>
              <span>Masquer 0 DA</span>
            </button>
          </div>
        </div>

        {/* View Toggle + Action Group */}
        <div className="flex flex-wrap items-center gap-3 self-end shrink-0">
          {/* View Segmented Control */}
          <div className="flex bg-[#0A0A0B] p-1 rounded-lg border border-zinc-800/50">
            <button
              id="view-ligne-btn"
              onClick={() => onViewChange('ligne')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold tracking-wide transition-all ${
                activeView === 'ligne'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Ligne à ligne
            </button>
            <button
              id="view-station-btn"
              onClick={() => onViewChange('station')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold tracking-wide transition-all ${
                activeView === 'station'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Grid className="h-3.5 w-3.5" />
              Par station
            </button>
          </div>

          <div className="hidden sm:block text-zinc-800 font-light select-none">|</div>

          {/* Reset Filters / Réinitialiser */}
          <button
            id="btn-filters-reset"
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-300 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 active:bg-zinc-850 rounded transition-all shrink-0 cursor-pointer"
          >
            <span className="w-2 h-2 bg-[#C0392B] rounded-sm"></span>
            Réinitialiser
          </button>

          {/* CSV Download Button */}
          <button
            id="btn-download-csv"
            disabled={!isDownloadable}
            onClick={onDownloadCSV}
            className={`flex items-center gap-2 px-4 py-2 font-semibold text-xs rounded transition-all shadow-lg shrink-0 ${
              isDownloadable
                ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-850 hover:border-zinc-700 cursor-pointer'
                : 'bg-zinc-950 text-zinc-605 text-zinc-600 border border-zinc-900 cursor-not-allowed'
            }`}
          >
            <Download className="h-4 w-4 text-emerald-500" />
            Télécharger CSV (Brutes)
          </button>

          {/* Emerald Download PDF Button */}
          <button
            id="btn-download-pdf"
            disabled={!isDownloadable}
            onClick={onDownloadPDF}
            className={`flex items-center gap-2 px-4 py-2 font-semibold text-xs text-white rounded transition-all shadow-lg shrink-0 ${
              isDownloadable
                ? 'bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/30 shadow-emerald-950/25 cursor-pointer'
                : 'bg-zinc-900 border border-zinc-800/50 text-zinc-500 cursor-not-allowed'
            }`}
          >
            <FileText className="h-4 w-4" />
            Télécharger PDF
          </button>
        </div>
      </div>
    </div>
  );
}
