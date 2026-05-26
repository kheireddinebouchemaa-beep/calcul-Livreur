/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useMemo } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { GroupedData } from '../types';
import { formatDA, formatDateFR, getStationNum } from '../utils/formatter';

interface LigneALigneViewProps {
  data: GroupedData[];
  selectedSort: string;
  onSortChange: (sort: string) => void;
}

export default function LigneALigneView({ data, selectedSort, onSortChange }: LigneALigneViewProps) {

  // Add initial/original index to the rows
  const indexedData = useMemo(() => {
    return data.map((item, idx) => ({
      ...item,
      originalIndex: idx + 1
    }));
  }, [data]);

  // Sort flat list based on active selectedSort from props
  const sortedData = useMemo(() => {
    const list = [...indexedData];
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
  }, [indexedData, selectedSort]);

  // Calculations
  const totalColis = useMemo(() => {
    return data.reduce((sum, item) => sum + item.nbColis, 0);
  }, [data]);

  const totalMontant = useMemo(() => {
    return data.reduce((sum, item) => sum + item.montant, 0);
  }, [data]);

  // Column headers sorting click handler
  const handleSortClick = (field: 'index' | 'dateStr' | 'station' | 'nbColis' | 'montant') => {
    if (field === 'dateStr') {
      onSortChange(selectedSort === 'date_desc' ? 'date_asc' : 'date_desc');
    } else if (field === 'station') {
      if (selectedSort === 'station_asc') {
        onSortChange('station_desc');
      } else if (selectedSort === 'station_desc') {
        onSortChange('station_alpha');
      } else {
        onSortChange('station_asc');
      }
    } else if (field === 'nbColis') {
      onSortChange('colis_desc');
    } else if (field === 'montant') {
      onSortChange(selectedSort === 'amount_desc' ? 'amount_asc' : 'amount_desc');
    } else {
      onSortChange('date_desc');
    }
  };

  // Render indicators for active column sorts
  const getSortIconState = (field: 'index' | 'dateStr' | 'station' | 'nbColis' | 'montant') => {
    let active = false;
    let direction: 'asc' | 'desc' = 'asc';

    if (field === 'dateStr') {
      active = selectedSort === 'date_desc' || selectedSort === 'date_asc';
      direction = selectedSort === 'date_desc' ? 'desc' : 'asc';
    } else if (field === 'station') {
      active = selectedSort === 'station_asc' || selectedSort === 'station_desc' || selectedSort === 'station_alpha';
      direction = selectedSort === 'station_desc' ? 'desc' : 'asc';
    } else if (field === 'nbColis') {
      active = selectedSort === 'colis_desc';
      direction = 'desc';
    } else if (field === 'montant') {
      active = selectedSort === 'amount_desc' || selectedSort === 'amount_asc';
      direction = selectedSort === 'amount_desc' ? 'desc' : 'asc';
    }

    return { active, direction };
  };

  const renderSortIcon = (field: 'index' | 'dateStr' | 'station' | 'nbColis' | 'montant') => {
    const { active, direction } = getSortIconState(field);
    if (!active) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return direction === 'asc' 
      ? <ArrowUp className="h-3.5 w-3.5 text-emerald-500" /> 
      : <ArrowDown className="h-3.5 w-3.5 text-emerald-500" />;
  };

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
              {/* index col */}
              <th className="py-3.5 px-4 font-semibold text-[11px] uppercase tracking-wider w-16 text-zinc-400">
                #
              </th>

              {/* date col */}
              <th 
                onClick={() => handleSortClick('dateStr')}
                className="py-3.5 px-4 font-semibold text-[11px] uppercase tracking-wider cursor-pointer hover:bg-zinc-900 transition-colors group text-zinc-400"
              >
                <div className="flex items-center gap-1.5">
                  <span>Date livraison</span>
                  {renderSortIcon('dateStr')}
                </div>
              </th>

              {/* station col */}
              <th 
                onClick={() => handleSortClick('station')}
                className="py-3.5 px-4 font-semibold text-[11px] uppercase tracking-wider cursor-pointer hover:bg-zinc-900 transition-colors group text-zinc-400"
              >
                <div className="flex items-center gap-1.5">
                  <span>Station</span>
                  {renderSortIcon('station')}
                </div>
              </th>

              {/* nb colis col */}
              <th 
                onClick={() => handleSortClick('nbColis')}
                className="py-3.5 px-4 font-semibold text-[11px] uppercase tracking-wider cursor-pointer hover:bg-zinc-900 transition-colors group text-right w-32 text-zinc-400"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Nb colis</span>
                  {renderSortIcon('nbColis')}
                </div>
              </th>

              {/* montant col */}
              <th 
                onClick={() => handleSortClick('montant')}
                className="py-3.5 px-4 font-semibold text-[11px] uppercase tracking-wider cursor-pointer hover:bg-zinc-900 transition-colors group text-right w-48 text-zinc-400"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Montant (DA)</span>
                  {renderSortIcon('montant')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/40">
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-zinc-500 font-medium">
                  Aucune donnée disponible pour les filtres sélectionnés.
                </td>
              </tr>
            ) : (
              sortedData.map((item) => (
                <tr 
                  key={`${item.station}-${item.dateStr}`}
                  className="hover:bg-zinc-900/45 transition-colors border-b border-zinc-800/30"
                >
                  <td className="py-3 px-4 font-mono text-xs text-zinc-500">
                    {item.originalIndex}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-zinc-400">
                    {formatDateFR(item.dateStr)}
                  </td>
                  <td className="py-3 px-4 font-medium text-zinc-100">
                    {item.station}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-zinc-300">
                    {item.nbColis}
                  </td>
                  <td className={`py-3 px-4 text-right font-mono ${getAmountStyle(item.montant)}`}>
                    {formatDA(item.montant)}
                  </td>
                </tr>
              ))
            )}

            {/* Total Row */}
            {sortedData.length > 0 && (
              <tr className="bg-zinc-950 text-zinc-100 font-semibold border-t border-zinc-800">
                <td className="py-3.5 px-4 text-xs font-mono text-zinc-600">
                  —
                </td>
                <td className="py-3.5 px-4 uppercase text-xs tracking-wider font-semibold text-zinc-300">
                  TOTAL
                </td>
                <td className="py-3.5 px-4 text-xs text-zinc-600">
                  —
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-zinc-300">
                  {totalColis}
                </td>
                <td className="py-3.5 px-4 text-right font-[#F0C040] text-emerald-450 text-emerald-400 text-base font-bold font-mono">
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
