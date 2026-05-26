/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DollarSign, Package, MapPin, Calendar } from 'lucide-react';
import { formatDA } from '../utils/formatter';

interface KPICardsProps {
  totalCash: number;
  totalColis: number;
  stationsCount: number;
  joursCount: number;
}

export function formatDAHelper(amount: number): React.ReactNode {
  if (amount === 0) {
    return <span className="text-zinc-600 font-normal">—</span>;
  }
  // Algerian style: Space as thousand separator, suffix " DA"
  const formatted = new Intl.NumberFormat('fr-DZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount).replace(/ /g, ' ').replace(/\s/g, ' ');

  return <span className="font-mono font-bold text-emerald-400">{formatted} <span className="text-xs font-sans text-zinc-500 font-normal">DA</span></span>;
}

export default function KPICards({ totalCash, totalColis, stationsCount, joursCount }: KPICardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total cash livreurs - Crimson Accent */}
      <div id="kpi-cash" className="bg-[#0F0F11] rounded-lg p-5 shadow-lg border border-zinc-800/50 flex items-center gap-4 hover:border-emerald-500/20 transition-all">
        <div className="p-3 bg-emerald-500/5 text-emerald-500 rounded-lg border border-emerald-500/10">
          <DollarSign className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Total Cash Livreurs</p>
          <p className="text-xl font-bold mt-0.5" id="val-kpi-cash">
            {formatDAHelper(totalCash)}
          </p>
        </div>
      </div>

      {/* Total colis */}
      <div id="kpi-colis" className="bg-[#0F0F11] rounded-lg p-5 shadow-lg border border-zinc-800/50 flex items-center gap-4 hover:border-zinc-700/50 transition-all">
        <div className="p-3 bg-zinc-900 text-zinc-400 rounded-lg border border-zinc-800/50">
          <Package className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Total Colis</p>
          <p className="text-xl font-bold text-zinc-100 mt-0.5 font-mono" id="val-kpi-colis">
            {totalColis || <span className="text-zinc-600 font-normal">—</span>}
          </p>
        </div>
      </div>

      {/* Stations actives */}
      <div id="kpi-stations" className="bg-[#0F0F11] rounded-lg p-5 shadow-lg border border-zinc-800/50 flex items-center gap-4 hover:border-emerald-500/20 transition-all">
        <div className="p-3 bg-emerald-500/5 text-emerald-500 rounded-lg border border-emerald-500/10">
          <MapPin className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Stations Actives</p>
          <p className="text-xl font-bold text-emerald-400 mt-0.5 font-mono" id="val-kpi-stations">
            {stationsCount || <span className="text-zinc-600 font-normal">—</span>}
          </p>
        </div>
      </div>

      {/* Jours de livraison */}
      <div id="kpi-jours" className="bg-[#0F0F11] rounded-lg p-5 shadow-lg border border-zinc-800/50 flex items-center gap-4 hover:border-zinc-700/50 transition-all">
        <div className="p-3 bg-zinc-900 text-zinc-400 rounded-lg border border-zinc-800/50">
          <Calendar className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Jours de Livraison</p>
          <p className="text-xl font-bold text-zinc-100 mt-0.5 font-mono" id="val-kpi-jours">
            {joursCount || <span className="text-zinc-600 font-normal">—</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
