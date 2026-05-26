/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useMemo } from 'react';
import { GroupedData, StationGroup } from '../types';
import { formatDA, formatDateFR, getStationNum } from '../utils/formatter';

interface ParStationViewProps {
  data: GroupedData[];
  selectedSort: string;
}

export default function ParStationView({ data, selectedSort }: ParStationViewProps) {
  
  // Aggregate data by station and sort based on selectedSort
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

    // Convert to array and sort stations based on selectedSort
    const result: StationGroup[] = Array.from(map.values()).map(g => ({
      station: g.station,
      nbJours: g.dates.size,
      nbColis: g.nbColis,
      totalDA: g.totalDA,
      // Sort station subrows chronologically by dateStr descending
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
          // Fallback sort for date-based sorts on station group headers (by total DA descending)
          return b.totalDA - a.totalDA;
      }
    });

    return result;
  }, [data, selectedSort]);

  // Overall calculations
  const totalDays = useMemo(() => {
    const allDates = new Set(data.map(item => item.dateStr));
    return allDates.size;
  }, [data]);

  const totalColis = useMemo(() => {
    return data.reduce((sum, item) => sum + item.nbColis, 0);
  }, [data]);

  const totalMontant = useMemo(() => {
    return data.reduce((sum, item) => sum + item.montant, 0);
  }, [data]);

  const getAmountStyle = (val: number) => {
    if (val === 0) return 'text-zinc-650 text-zinc-600 font-normal';
    if (val > 200000) return 'text-rose-500 font-semibold';
    if (val >= 50000) return 'text-amber-400 font-medium';
    return 'text-zinc-200 font-medium';
  };

  return (
    <div className="w-full bg-[#0F0F11] rounded-lg shadow-lg border border-zinc-800/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-[#0F0F11] text-zinc-300 border-b border-zinc-800 select-none">
              <th className="py-3.5 px-4 font-semibold text-[11px] uppercase tracking-wider text-zinc-400">Station / Date</th>
              <th className="py-3.5 px-4 font-semibold text-[11px] uppercase tracking-wider text-right w-36 text-zinc-400">Nb jours</th>
              <th className="py-3.5 px-4 font-semibold text-[11px] uppercase tracking-wider text-right w-32 text-zinc-400">Nb colis</th>
              <th className="py-3.5 px-4 font-semibold text-[11px] uppercase tracking-wider text-right w-48 text-zinc-400">Montant total (DA)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/20">
            {stationGroups.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-zinc-500 font-medium">
                  Aucune donnée disponible pour les filtres sélectionnés.
                </td>
              </tr>
            ) : (
              stationGroups.map((group) => (
                <React.Fragment key={group.station}>
                  {/* Station Header Row */}
                  <tr className="bg-zinc-900/40 font-bold border-b border-zinc-800/45 text-zinc-100">
                    <td className="py-3 px-4 flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded shadow-[0_0_6px_#10B981]"></span>
                      <span className="font-semibold">{group.station}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-zinc-400">
                      {group.nbJours}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-zinc-400">
                      {group.nbColis}
                    </td>
                    <td className={`py-3 px-4 text-right font-mono text-sm ${getAmountStyle(group.totalDA)}`}>
                      {formatDA(group.totalDA)}
                    </td>
                  </tr>

                  {/* Indented Sub-lines (dates) */}
                  {group.items.map((sub, sIdx) => (
                    <tr 
                      key={`${group.station}-${sub.dateStr}-${sIdx}`}
                      className="hover:bg-zinc-900/30 transition-colors border-b border-zinc-800/10"
                    >
                      <td className="py-2.5 px-4 pl-10 flex items-center gap-2 text-zinc-400">
                        <span className="text-zinc-700 text-[10px] font-mono">└</span>
                        <span className="font-mono text-xs text-zinc-405 text-zinc-455 text-zinc-400">{formatDateFR(sub.dateStr)}</span>
                      </td>
                      <td className="py-2.5 px-4 text-right text-zinc-600 font-mono text-xs">
                        —
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs text-zinc-300">
                        {sub.nbColis}
                      </td>
                      <td className={`py-2.5 px-4 text-right font-mono text-xs ${getAmountStyle(sub.montant)}`}>
                        {formatDA(sub.montant)}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))
            )}

            {/* General Total Row */}
            {stationGroups.length > 0 && (
              <tr className="bg-zinc-950 text-zinc-100 font-semibold border-t border-zinc-800">
                <td className="py-3.5 px-4 uppercase text-xs tracking-wider font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded shadow-[0_0_8px_#10B981]"></span>
                  <span>TOTAL GÉNÉRAL</span>
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-zinc-300 text-xs text-zinc-400">
                  {totalDays} {totalDays > 1 ? 'jours' : 'jour'}
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-zinc-300">
                  {totalColis}
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-emerald-400 text-base font-bold">
                  {formatDA(totalMontant)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
