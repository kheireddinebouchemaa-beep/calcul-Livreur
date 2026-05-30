/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { GroupedData, StationGroup, ImportSummary } from '../types';
import { formatDA, formatDateFR, getStationNum } from '../utils/formatter';

interface ReportPDFProps {
  data: GroupedData[];
  summary: ImportSummary | null;
  activeView: 'ligne' | 'station';
  selectedSort: string;
}

export default function ReportPDF({ data, summary, activeView, selectedSort }: ReportPDFProps) {
  // 1. Prepare State List for Page 1 (Classement par station)
  const stationRankings = useMemo(() => {
    const map = new Map<string, { station: string; dates: Set<string>; nbColis: number; totalDA: number }>();
    data.forEach(item => {
      if (!map.has(item.station)) {
        map.set(item.station, { station: item.station, dates: new Set<string>(), nbColis: 0, totalDA: 0 });
      }
      const g = map.get(item.station)!;
      g.dates.add(item.dateStr);
      g.nbColis += item.nbColis;
      g.totalDA += item.montant;
    });

    return Array.from(map.values())
      .map(g => ({
        station: g.station,
        joursCount: g.dates.size,
        colisCount: g.nbColis,
        totalDA: g.totalDA
      }))
      .sort((a, b) => b.totalDA - a.totalDA);
  }, [data]);

  // Overall sums
  const totalCash = useMemo(() => data.reduce((s, x) => s + x.montant, 0), [data]);
  const totalColis = useMemo(() => data.reduce((s, x) => s + x.nbColis, 0), [data]);
  const totalStations = useMemo(() => new Set(data.map(x => x.station)).size, [data]);
  const totalDays = useMemo(() => new Set(data.map(x => x.dateStr)).size, [data]);

  // 2. Prepare Station Groups if activeView is 'station'
  const stationGroups = useMemo(() => {
    const map = new Map<string, {
      station: string;
      dates: Set<string>;
      nbColis: number;
      totalDA: number;
      items: { dateStr: string; nbColis: number; montant: number }[];
    }>();

    data.forEach(item => {
      if (!map.has(item.station)) {
        map.set(item.station, {
          station: item.station,
          dates: new Set<string>(),
          nbColis: 0,
          totalDA: 0,
          items: []
        });
      }

      const group = map.get(item.station)!;
      group.dates.add(item.dateStr);
      group.nbColis += item.nbColis;
      group.totalDA += item.montant;
      group.items.push({
        dateStr: item.dateStr,
        nbColis: item.nbColis,
        montant: item.montant
      });
    });

    return Array.from(map.values()).map(g => ({
      station: g.station,
      nbJours: g.dates.size,
      nbColis: g.nbColis,
      totalDA: g.totalDA,
      items: g.items.sort((a, b) => b.dateStr.localeCompare(a.dateStr))
    })).sort((a, b) => {
      switch (selectedSort) {
        case 'amount_desc':
          return b.totalDA - a.totalDA;
        case 'amount_asc':
          return a.totalDA - b.totalDA;
        case 'station_asc': {
          const codesA = getStationNum(a.station);
          const codesB = getStationNum(b.station);
          if (codesA !== codesB) return codesA - codesB;
          return a.station.localeCompare(b.station);
        }
        case 'station_desc': {
          const codesA = getStationNum(a.station);
          const codesB = getStationNum(b.station);
          if (codesA !== codesB) return codesB - codesA;
          return b.station.localeCompare(a.station);
        }
        case 'station_alpha':
          return a.station.localeCompare(b.station);
        case 'colis_desc':
          return b.nbColis - a.nbColis;
        default:
          return b.totalDA - a.totalDA;
      }
    });
  }, [data, selectedSort]);

  // 3. Prepare Ligne-à-Ligne List if activeView is 'ligne'
  const detailsSorted = useMemo(() => {
    const list = [...data];
    list.sort((a, b) => {
      switch (selectedSort) {
        case 'amount_desc':
          return b.montant - a.montant;
        case 'amount_asc':
          return a.montant - b.montant;
        case 'station_asc': {
          const numA = getStationNum(a.station);
          const numB = getStationNum(b.station);
          if (numA !== numB) return numA - numB;
          return a.station.localeCompare(b.station);
        }
        case 'station_desc': {
          const numA = getStationNum(a.station);
          const numB = getStationNum(b.station);
          if (numA !== numB) return numB - numA;
          return b.station.localeCompare(a.station);
        }
        case 'station_alpha':
          return a.station.localeCompare(b.station);
        case 'date_desc':
          return b.dateStr.localeCompare(a.dateStr);
        case 'date_asc':
          return a.dateStr.localeCompare(b.dateStr);
        case 'colis_desc':
          return b.nbColis - a.nbColis;
        default:
          return 0;
      }
    });
    return list;
  }, [data, selectedSort]);

  // 4. Flatten all detail lines into a continuous indexable array of rows
  const unifiedFlatRows = useMemo(() => {
    if (activeView === 'station') {
      const list: Array<{
        type: 'station_header' | 'sub_row';
        station: string;
        dateStr?: string;
        nbJours?: number;
        nbColis: number;
        montant: number;
      }> = [];
      stationGroups.forEach(group => {
        list.push({
          type: 'station_header',
          station: group.station,
          nbJours: group.nbJours,
          nbColis: group.nbColis,
          montant: group.totalDA
        });
        group.items.forEach(sub => {
          list.push({
            type: 'sub_row',
            station: group.station,
            dateStr: sub.dateStr,
            nbColis: sub.nbColis,
            montant: sub.montant
          });
        });
      });
      return list;
    } else {
      return detailsSorted.map(item => ({
        type: 'ligne_row' as const,
        station: item.station,
        dateStr: item.dateStr,
        nbColis: item.nbColis,
        montant: item.montant
      }));
    }
  }, [activeView, stationGroups, detailsSorted]);

  // Split unified rows into multiple A4 pages dynamically
  const ROWS_PER_PAGE = 22;
  const detailPages = useMemo(() => {
    const pages: typeof unifiedFlatRows[] = [];
    for (let i = 0; i < unifiedFlatRows.length; i += ROWS_PER_PAGE) {
      pages.push(unifiedFlatRows.slice(i, i + ROWS_PER_PAGE));
    }
    return pages;
  }, [unifiedFlatRows]);

  const totalPDFPages = 1 + Math.max(1, detailPages.length);

  return (
    <div id="pdf-export-root" className="bg-slate-800 p-8 flex flex-col gap-10 items-center justify-center min-h-screen select-none">
      <div className="text-center text-white max-w-md">
        <h3 className="text-lg font-semibold mb-2">Génération du document PDF</h3>
        <p className="text-sm text-slate-400">
          Cette zone est utilisée pour compiler le rapport d'exportation au format A4 réglementaire. Ne pas modifier.
        </p>
      </div>

      {/* PAGE 1: Synthèse par Station (A4 size: 794px x 1123px) */}
      <div
        id="pdf-page-1"
        className="bg-white text-slate-900 shadow-2xl relative flex flex-col justify-between"
        style={{ width: '794px', height: '1123px', padding: '50px 45px 45px 45px', boxSizing: 'border-box' }}
      >
        <div>
          {/* Header block (IMIR LOGISTICS) */}
          <div className="bg-[#1A1D27] text-white p-4 rounded-t flex items-center justify-between">
            <span className="text-xl font-bold tracking-wider font-mono">IMIR LOGISTICS</span>
            <span className="text-xs font-mono text-slate-400">IMIR-FIN-LIV-001</span>
          </div>

          {/* Red banner */}
          <div className="bg-[#C0392B] text-white py-2.5 px-4 rounded-b flex items-center justify-between text-xs mb-6">
            <span className="font-semibold uppercase tracking-wide text-[11px]">Rapport de Synthèse — Cash Livreurs</span>
            <span className="text-[10px] text-red-100 font-mono">Date : {new Date().toISOString().slice(0, 10)}</span>
          </div>

          {/* Business Context */}
          <div className="mb-6">
            <h4 className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">Contexte de l'analyse</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Ce document confidentiel compile les montants COD (Cash On Delivery) encaissés par les livreurs mais non encore reversés en caisse station. Les données proviennent de la fusion sécurisée de <span className="font-semibold text-[#1A1D27]">{summary?.fileCount || 1} export(s) ECOTRACK</span>.
            </p>
          </div>

          {/* KPIs Block */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="border border-slate-200 rounded p-3 bg-red-50/30">
              <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-500">Total Cash</span>
              <span className="block text-[14px] font-bold text-[#C0392B] mt-1 font-mono">
                {totalCash.toLocaleString('fr-DZ')} <span className="text-[10px] font-sans font-normal text-slate-500">DA</span>
              </span>
            </div>
            <div className="border border-slate-200 rounded p-3 bg-blue-50/20">
              <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-500">Total Colis</span>
              <span className="block text-[14px] font-bold text-[#2980B9] mt-1 font-mono">{totalColis}</span>
            </div>
            <div className="border border-slate-200 rounded p-3 bg-emerald-50/20">
              <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-500">Stations Actives</span>
              <span className="block text-[14px] font-bold text-[#27AE60] mt-1 font-mono">{totalStations}</span>
            </div>
            <div className="border border-slate-200 rounded p-3 bg-purple-50/20">
              <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-500">Jours Livrés</span>
              <span className="block text-[14px] font-bold text-[#8E44AD] mt-1 font-mono">{totalDays}</span>
            </div>
          </div>

          {/* Ranking Table */}
          <div>
            <h4 className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">Classement des Stations par montant en attente</h4>
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-[#1A1D27] text-white">
                  <th className="py-2 px-3 rounded-l font-semibold w-12">#</th>
                  <th className="py-2 px-3 font-semibold">Nom de la Station</th>
                  <th className="py-2 px-3 font-semibold text-right w-24">Jours actifs</th>
                  <th className="py-2 px-3 font-semibold text-right w-24">Nombre Colis</th>
                  <th className="py-2 px-3 rounded-r font-semibold text-right w-36">Montant total en attente (DA)</th>
                </tr>
              </thead>
              <tbody>
                {stationRankings.slice(0, 15).map((row, idx) => {
                  const isTop3 = idx < 3;
                  return (
                    <tr
                      key={row.station}
                      style={isTop3 ? { backgroundColor: '#FFFDF0' } : {}}
                      className={`border-b border-slate-100 ${isTop3 ? 'font-semibold text-[#1A1D27] border-[#F0C040]/30' : 'text-slate-700'}`}
                    >
                      <td className="py-1.5 px-3 font-mono text-slate-500 flex items-center gap-1.5">
                        {idx + 1}
                        {isTop3 && <span className="text-[#F0C040]">★</span>}
                      </td>
                      <td className="py-1.5 px-3 uppercase">{row.station}</td>
                      <td className="py-1.5 px-3 text-right font-mono">{row.joursCount}</td>
                      <td className="py-1.5 px-3 text-right font-mono">{row.colisCount}</td>
                      <td className={`py-1.5 px-3 text-right font-mono ${isTop3 ? 'text-[#C0392B] font-bold' : ''}`}>
                        {row.totalDA.toLocaleString('fr-DZ')} DA
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {stationRankings.length > 15 && (
              <p className="text-[10px] text-right font-mono text-slate-400 mt-2">
                + {stationRankings.length - 15} stations additionnelles (détails complets en annexe)
              </p>
            )}
          </div>
        </div>

        {/* Footer info (page 1) */}
        <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>IMIR Logistics — Confidentiel</span>
          <span>Page 1 / {totalPDFPages}</span>
        </div>
      </div>

      {/* PAGE 2+: Detailed Records */}
      {detailPages.length === 0 ? (
        <div
          id="pdf-page-2-empty"
          className="bg-white text-slate-900 shadow-2xl relative flex flex-col justify-between"
          style={{ width: '794px', height: '1123px', padding: '50px 45px 45px 45px', boxSizing: 'border-box' }}
        >
          <div>
            <div className="bg-[#1A1D27] text-white p-3 rounded-t flex items-center justify-between mb-4">
              <span className="text-sm font-bold font-mono">IMIR LOGISTICS</span>
              <span className="text-[10px] font-mono text-slate-400">Annexe détaillée</span>
            </div>
            <h3 className="text-sm font-semibold tracking-wide text-slate-500 mb-4 font-sans">Détail par date et station</h3>
            <p className="text-xs text-slate-400">Aucune ligne de détail disponible.</p>
          </div>
          <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>IMIR Logistics — Confidentiel</span>
            <span>Page 2 / 2</span>
          </div>
        </div>
      ) : (
        detailPages.map((pageRows, pageIdx) => {
          const currentPageNum = 2 + pageIdx;
          return (
            <div
              key={pageIdx}
              id={`pdf-page-${currentPageNum}`}
              className="bg-white text-slate-900 shadow-2xl relative flex flex-col justify-between"
              style={{ width: '794px', height: '1123px', padding: '50px 45px 45px 45px', boxSizing: 'border-box' }}
            >
              <div>
                {/* Minimal Header */}
                <div className="border-b-2 border-slate-200 pb-2.5 mb-4 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-[#1A1D27] font-mono tracking-wider">IMIR LOGISTICS</span>
                    <span className="ml-3 text-[10px] text-slate-400 uppercase tracking-widest font-semibold font-sans">
                      Annexe détaillée ({activeView === 'station' ? 'Vue Station' : 'Vue Ligne'})
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Détail Station - Date</span>
                </div>

                <div className="mb-4">
                  <h4 className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-1 font-sans">
                    Détail par date et station (Suite {pageIdx + 1})
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-none font-sans">
                    {activeView === 'station'
                      ? 'Lignes groupées par station et triées selon vos critères d’affichage.'
                      : 'Lignes individuelles triées selon vos critères de tri.'}
                  </p>
                </div>

                {/* Table */}
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-[#1A1D27] text-white">
                      <th className="py-1.5 px-3 rounded-l font-semibold w-12">#</th>
                      <th className="py-1.5 px-3 font-semibold w-40">
                        {activeView === 'station' ? 'Station / Date' : 'Date livraison'}
                      </th>
                      <th className="py-1.5 px-3 font-semibold">
                        {activeView === 'station' ? 'Type' : 'Nom de la Station'}
                      </th>
                      <th className="py-1.5 px-3 font-semibold text-right w-24">Nb Colis</th>
                      <th className="py-1.5 px-3 rounded-r font-semibold text-right w-32 font-mono">Montant (DA)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((row, rowIdx) => {
                      const absoluteIndex = pageIdx * ROWS_PER_PAGE + rowIdx + 1;
                      if (row.type === 'station_header') {
                        return (
                          <tr
                            key={`header-${row.station}-${rowIdx}`}
                            className="bg-slate-100 font-bold border-b border-slate-200 text-slate-800"
                          >
                            <td className="py-1 px-3 font-mono text-slate-500">{absoluteIndex}</td>
                            <td colSpan={2} className="py-1 px-3 uppercase text-slate-950 font-bold truncate max-w-[320px]">
                              ★ {row.station} ({row.nbJours} j)
                            </td>
                            <td className="py-1 px-3 text-right font-mono text-slate-800">{row.nbColis}</td>
                            <td className="py-1 px-3 text-right font-mono text-slate-950 font-bold">
                              {row.montant.toLocaleString('fr-DZ')} DA
                            </td>
                          </tr>
                        );
                      } else if (row.type === 'sub_row') {
                        return (
                          <tr
                            key={`sub-${row.station}-${row.dateStr}-${rowIdx}`}
                            className="border-b border-slate-100/50 hover:bg-slate-50/40 text-slate-700"
                          >
                            <td className="py-1 px-3 font-mono text-slate-400">{absoluteIndex}</td>
                            <td className="py-1 px-3 font-mono text-slate-400 pl-6">
                              └ {formatDateFR(row.dateStr || '')}
                            </td>
                            <td className="py-1 px-3 text-slate-400 font-sans">—</td>
                            <td className="py-1 px-3 text-right font-mono text-slate-500">{row.nbColis}</td>
                            <td className="py-1 px-3 text-right font-mono text-slate-600">
                              {row.montant.toLocaleString('fr-DZ')} DA
                            </td>
                          </tr>
                        );
                      } else {
                        return (
                          <tr
                            key={`ligne-${row.station}-${row.dateStr}-${rowIdx}`}
                            className="border-b border-slate-100 hover:bg-slate-50/40 text-slate-700"
                          >
                            <td className="py-1 px-3 font-mono text-slate-400">{absoluteIndex}</td>
                            <td className="py-1 px-3 font-mono">{formatDateFR(row.dateStr || '')}</td>
                            <td className="py-1 px-3 uppercase truncate max-w-[280px]">{row.station}</td>
                            <td className="py-1 px-3 text-right font-mono">{row.nbColis}</td>
                            <td className="py-1 px-3 text-right font-mono font-medium text-slate-900">
                              {row.montant.toLocaleString('fr-DZ')} DA
                            </td>
                          </tr>
                        );
                      }
                    })}
                  </tbody>
                </table>
              </div>

              {/* Running Footer */}
              <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>IMIR Logistics — Confidentiel</span>
                <span>Page {currentPageNum} / {totalPDFPages}</span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
