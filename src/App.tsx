/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Package, ShieldAlert, Sparkles, RefreshCw, Layers } from 'lucide-react';
import { EcotrackRow, ImportSummary } from './types';
import FileImportZone from './components/FileImportZone';
import KPICards from './components/KPICards';
import FilterBar from './components/FilterBar';
import LigneALigneView from './components/LigneALigneView';
import ParStationView from './components/ParStationView';
import ReportPDF from './components/ReportPDF';
import { generateAndDownloadPDF } from './utils/pdfGenerator';

export default function App() {
  const [rows, setRows] = useState<EcotrackRow[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  // Filter states
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all'); // default 'all'
  const [selectedLivreur, setSelectedLivreur] = useState<string>(''); // default ''
  const [selectedSort, setSelectedSort] = useState<string>('date_desc'); // default 'date_desc'
  const [hideZeroDA, setHideZeroDA] = useState<boolean>(false);
  
  const [activeView, setActiveView] = useState<'ligne' | 'station'>('ligne');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);

  // Helper to reset filters to defaults when required (e.g. on manual Reset or new dataset load)
  const handleFiltersReset = () => {
    setSelectedStation('');
    setSelectedDate('');
    setSelectedType('all');
    setSelectedLivreur('');
    setSelectedSort('date_desc');
    setHideZeroDA(false);
  };

  // Load Demo Data Handler for frictionless first-impression testing
  const handleLoadDemoData = () => {
    const demoStations = [
      '03 - Station Laghouat', 
      '16 - Station Alger Est', 
      '31 - Station Oran Ouest', 
      '25 - Station Constantine', 
      '19 - Station Sétif Ville', 
      '09 - Station Blida Centre', 
      '15 - Station Tizi Ouzou'
    ];
    
    const demoLivreurs = [
      'Amine Bouchemaa', 
      'Sofiane K.', 
      'Yacine Tazrout', 
      'Rachid Belkaid', 
      'Mohamed S.', 
      'Karim Meziane'
    ];

    const demoRows: EcotrackRow[] = [];
    const dates = ['2026-05-25', '2026-05-24', '2026-05-23', '2026-05-22'];

    // Generate ~70 realistic rows to showcase filters, STOP DESK, and sorting
    for (let i = 1; i <= 70; i++) {
      const station = demoStations[i % demoStations.length];
      const dateStr = dates[i % dates.length];
      const id = `ECO-DZ-${100000 + i}`;
      
      // Introduce STOP DESK deliveries for ~15% of parcels
      const isStopDeskDelivery = i % 7 === 0;
      const livreur = isStopDeskDelivery ? 'STOP DESK' : demoLivreurs[i % demoLivreurs.length];
      
      // Assure realistic spread of amounts (some 0, some mid, some high)
      let total = 0;
      if (i % 8 !== 0) {
        if (i % 3 === 0) {
          total = Math.floor(Math.random() * 4) * 80000 + 40000; // 40K to 280K DA
        } else {
          total = Math.floor(Math.random() * 6) * 6000 + 12000;  // 12K to 42K DA
        }
      }

      demoRows.push({
        id,
        total,
        livreur,
        station,
        livreLe: `${dateStr} ${String(10 + (i % 8)).padStart(2, '0')}:${String(10 + (i % 45)).padStart(2, '0')}:00`,
        dateStr
      });
    }

    setRows(demoRows);
    setSummary({
      fileCount: 3,
      totalRows: demoRows.length,
      ignoredDuplicates: 4,
      fileNames: ['ecotrack_export_alger_25_05.xlsx', 'ecotrack_export_oran_25_05.xlsx', 'ecotrack_export_constantine_25_05.csv']
    });

    handleFiltersReset();
  };

  const handleDataLoaded = (newRows: EcotrackRow[], newSummary: ImportSummary) => {
    setRows(newRows);
    setSummary(newSummary);
    handleFiltersReset();
  };

  const handleResetAll = () => {
    setRows([]);
    setSummary(null);
    handleFiltersReset();
  };

  // Derive unique stations for filters
  const uniqueStations = useMemo(() => {
    const list = Array.from(new Set(rows.map(r => r.station)))
      .filter((item): item is string => !!item && item !== 'Inconnu')
      .sort((a, b) => a.localeCompare(b));
    return list;
  }, [rows]);

  // Derive unique dates for filters (sorted descending)
  const uniqueDates = useMemo(() => {
    const list = Array.from(new Set(rows.map(r => r.dateStr)))
      .filter((item): item is string => !!item && item !== 'Inconnu')
      .sort((a, b) => b.localeCompare(a));
    return list;
  }, [rows]);

  // Derive unique livreurs excluding STOP DESK representational names
  const uniqueLivreurs = useMemo(() => {
    const list = Array.from(new Set<string>(rows.map(r => r.livreur)))
      .filter((item): item is string => {
        if (!item) return false;
        const upper = item.toUpperCase().trim();
        return upper !== 'STOP DESK' && upper !== 'INCONNU' && upper !== '';
      })
      .sort((a, b) => a.localeCompare(b));
    return list;
  }, [rows]);

  // 1. Filter raw Ecotrack rows cumulatively
  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      // Station
      if (selectedStation && row.station !== selectedStation) {
        return false;
      }
      // Date
      if (selectedDate && row.dateStr !== selectedDate) {
        return false;
      }
      // Type (Livreurs vs Stop Desk)
      const isStopDesk = row.livreur?.toUpperCase().trim() === 'STOP DESK';
      if (selectedType === 'stopdesk' && !isStopDesk) {
        return false;
      }
      if (selectedType === 'livreur' && isStopDesk) {
        return false;
      }
      // Named Livreurs filter (ignored if Stop Desk option is chosen since Stop Desks have no names)
      if (selectedType !== 'stopdesk' && selectedLivreur) {
        if (row.livreur !== selectedLivreur) {
          return false;
        }
      }
      return true;
    });
  }, [rows, selectedStation, selectedDate, selectedType, selectedLivreur]);

  // 2. Aggregate filtered rows into Station + Date pairs
  const filteredGroupedData = useMemo(() => {
    const map = new Map<string, { station: string; dateStr: string; nbColis: number; montant: number }>();
    
    filteredRows.forEach(row => {
      const key = `${row.station}_${row.dateStr}`;
      if (!map.has(key)) {
        map.set(key, {
          station: row.station,
          dateStr: row.dateStr,
          nbColis: 0,
          montant: 0
        });
      }
      const item = map.get(key)!;
      item.nbColis += 1;
      item.montant += row.total;
    });

    let result = Array.from(map.values());

    // Masquer 0 DA filter
    if (hideZeroDA) {
      result = result.filter(item => item.montant !== 0);
    }

    return result;
  }, [filteredRows, hideZeroDA]);

  // Recalculated dynamic KPI stats based on cumulative filtered rows
  const kpiStats = useMemo(() => {
    let cashSum = 0;
    let colisSum = 0;
    const stationsSet = new Set<string>();
    const datesSet = new Set<string>();

    filteredGroupedData.forEach(item => {
      cashSum += item.montant;
      colisSum += item.nbColis;
      stationsSet.add(item.station);
      datesSet.add(item.dateStr);
    });

    return {
      totalCash: cashSum,
      totalColis: colisSum,
      stationsCount: stationsSet.size,
      joursCount: datesSet.size
    };
  }, [filteredGroupedData]);

  // Trigger PDF Build and download
  const handleDownloadPDF = async () => {
    if (isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    
    const ROWS_PER_PAGE = 22;
    const detailPagesCount = Math.max(1, Math.ceil(filteredGroupedData.length / ROWS_PER_PAGE));
    const totalPages = 1 + detailPagesCount;

    try {
      // Tiny delay so React render is fully complete and paints everything
      await new Promise(resolve => setTimeout(resolve, 500));
      await generateAndDownloadPDF(totalPages);
    } catch (error) {
      console.error('Failed to export PDF:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-400 pb-12 selection:bg-emerald-500/30">
      {/* Upper Navigation / Decorative Banner */}
      <header className="bg-[#0F0F11] border-b border-zinc-800/50 text-zinc-100 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/20">
              <span className="font-mono font-bold tracking-tight text-sm">IMIR</span>
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-zinc-100 uppercase font-mono">IMIR LOGISTICS</h1>
              <p className="text-[10px] text-zinc-500 font-mono">Système Interactif d'Encaissement des Livreurs • NEXUS_EXEC ENGINE</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 font-mono">
            <span>Réf: </span>
            <span className="bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800 text-zinc-300 font-semibold uppercase tracking-wider text-[10px]">
              IMIR-FIN-LIV-001
            </span>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="max-w-7xl mx-auto px-4 mt-6 sm:px-6 lg:px-8">
        
        {/* Pitch / Goal Alert banner */}
        <div className="bg-gradient-to-r from-[#0F0F11] to-[#141417] text-zinc-300 rounded-lg p-6 mb-6 shadow-xl border border-zinc-800/50 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 transform translate-x-4 -translate-y-4 opacity-10 pointer-events-none select-none">
            <Layers className="h-44 w-44 text-emerald-500" />
          </div>
          <div className="space-y-2 max-w-2xl relative z-10">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
              <Sparkles className="h-3 w-3" />
              Cash Livreurs
            </div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-100">Dépôt & Versements en Caisse Station</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Les livreurs encaissent les montants COD auprès des clients finaux, mais ne sont pas toujours en mesure de reverser les fonds en caisse de leur station d'affectation le même jour. Cet outil standalone permet de charger vos exports ECOTRACK pour analyser et identifier instantanément les montants en attente.
            </p>
          </div>

          <div className="shrink-0 flex items-center md:self-center relative z-10">
            {rows.length === 0 ? (
              <button
                onClick={handleLoadDemoData}
                id="btn-demo"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded shadow-lg shadow-emerald-950/20 transition-all border border-emerald-500/30"
              >
                <Sparkles className="h-4 w-4 text-amber-300" />
                Charger des données de démonstration
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 text-xs font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                {rows.length} Colis Chargés
              </span>
            )}
          </div>
        </div>

        {/* File Import Zone Section */}
        <FileImportZone
          onDataLoaded={handleDataLoaded}
          onReset={handleResetAll}
          summary={summary}
        />

        {rows.length === 0 ? (
          /* Blank state if no file loaded */
          <div className="w-full py-16 bg-[#0F0F11] rounded-lg border border-zinc-800/50 shadow-lg flex flex-col items-center justify-center text-center px-4">
            <div className="p-4 bg-zinc-950 text-zinc-500 rounded-full mb-4 border border-zinc-800/50">
              <Package className="h-10 w-10 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-bold text-zinc-100 mb-1">Aucune donnée à visualiser</h3>
            <p className="text-xs text-zinc-500 max-w-md leading-relaxed mb-6">
              Veuillez importer un ou plusieurs fichiers Excel (.xlsx) ou CSV correspondants aux exports ECOTRACK ci-dessus pour activer l'analyse des caisses.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleLoadDemoData}
                id="btn-demo-sec"
                className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold rounded shadow transition-all border border-zinc-700"
              >
                Simuler avec un exemple
              </button>
            </div>
          </div>
        ) : (
          /* Main Analytical Content */
          <>
            {/* 4 KPIs Section */}
            <KPICards 
              totalCash={kpiStats.totalCash}
              totalColis={kpiStats.totalColis}
              stationsCount={kpiStats.stationsCount}
              joursCount={kpiStats.joursCount}
            />

            {/* Filter Bar */}
            <FilterBar
              stations={uniqueStations}
              dates={uniqueDates}
              livreurs={uniqueLivreurs}
              selectedStation={selectedStation}
              selectedDate={selectedDate}
              selectedType={selectedType}
              selectedLivreur={selectedLivreur}
              selectedSort={selectedSort}
              hideZeroDA={hideZeroDA}
              activeView={activeView}
              onStationChange={setSelectedStation}
              onDateChange={setSelectedDate}
              onTypeChange={(type) => {
                setSelectedType(type);
                // Clear livreur choice if moving between types
                setSelectedLivreur('');
              }}
              onLivreurChange={setSelectedLivreur}
              onSortChange={setSelectedSort}
              onHideZeroDAChange={setHideZeroDA}
              onViewChange={setActiveView}
              onReset={handleFiltersReset}
              onDownloadPDF={handleDownloadPDF}
              isDownloadable={filteredGroupedData.length > 0 && !isGeneratingPDF}
            />

            {/* Selected View renderer */}
            {isGeneratingPDF && (
              <div className="w-full bg-amber-500/10 border border-amber-500/20 rounded-lg p-3.5 mb-6 text-amber-500 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-amber-500" />
                <span>Compiler les pages et générer le document PDF final... Veuillez patienter.</span>
              </div>
            )}

            <div className="mb-8">
              {activeView === 'ligne' ? (
                <LigneALigneView 
                  data={filteredGroupedData} 
                  selectedSort={selectedSort}
                  onSortChange={setSelectedSort}
                />
              ) : (
                <ParStationView 
                  data={filteredGroupedData} 
                  selectedSort={selectedSort}
                />
              )}
            </div>
          </>
        )}

        {/* Floating Offline Disclaimer Footer */}
        <footer className="mt-12 pt-6 border-t border-zinc-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5 font-medium">
            <ShieldAlert className="h-4 w-4 text-zinc-600" />
            <span>Sécurité : Les fichiers sont traités exclusivement en local. Aucune donnée n'est hébergée ou transmise.</span>
          </div>
          <span className="font-mono text-[10px] text-zinc-600">IMIR Logistics — Confidentiel</span>
        </footer>
      </main>

      {/* OFF-SCREEN DOM FOR A4 PDF EXPORT (COMPLETELY RENDERS ON FLY AND HIDDEN FOR VISUAL PERFECTION) */}
      <div 
        style={{ 
          position: 'absolute', 
          top: '-9999px', 
          left: '-9999px', 
          zIndex: -1000, 
          pointerEvents: 'none' 
        }}
      >
        <ReportPDF data={filteredGroupedData} summary={summary} />
      </div>
    </div>
  );
}
