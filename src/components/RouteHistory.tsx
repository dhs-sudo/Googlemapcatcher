import React, { useState } from 'react';
import { NavigationHistoryItem } from '../types';
import {
  Navigation,
  Clock,
  Trash2,
  Download,
  Car,
  Bike,
  Footprints,
  Bus,
  Search,
  FileSpreadsheet,
  Calendar,
  Key,
  Phone,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { openInPhoneMaps } from '../utils/navigation';
import { triggerHaptic } from '../utils/audio';
import { downloadTripsCsv } from '../utils/csvExporter';

interface RouteHistoryProps {
  history: NavigationHistoryItem[];
  onClearHistory: () => void;
  onSelectDestination: (item: NavigationHistoryItem) => void;
}

export const RouteHistory: React.FC<RouteHistoryProps> = ({
  history,
  onClearHistory,
  onSelectDestination,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'today' | 'week'>('all');

  const getModeIcon = (mode: NavigationHistoryItem['travelMode']) => {
    switch (mode) {
      case 'bicycling':
        return <Bike className="w-3.5 h-3.5 text-emerald-400" />;
      case 'walking':
        return <Footprints className="w-3.5 h-3.5 text-blue-400" />;
      case 'transit':
        return <Bus className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Car className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  const handleExportAll = () => {
    triggerHaptic(40);
    downloadTripsCsv(
      history,
      `autonav_all_trips_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const handleExportFiltered = () => {
    triggerHaptic(40);
    downloadTripsCsv(
      filteredHistory,
      `autonav_filtered_trips_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const handleReLaunch = (item: NavigationHistoryItem) => {
    triggerHaptic(40);
    openInPhoneMaps(item.address, item.travelMode, true);
  };

  // Filter history by period and search term
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const filteredHistory = history.filter((item) => {
    if (filterPeriod === 'today' && item.timestamp < startOfToday) return false;
    if (filterPeriod === 'week' && item.timestamp < sevenDaysAgo) return false;

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.address.toLowerCase().includes(term) ||
      (item.customerName && item.customerName.toLowerCase().includes(term)) ||
      (item.orderNumber && item.orderNumber.toLowerCase().includes(term)) ||
      (item.zipCode && item.zipCode.toLowerCase().includes(term)) ||
      (item.city && item.city.toLowerCase().includes(term)) ||
      (item.gateCode && item.gateCode.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-5">
      {/* Metrics & CSV Export Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Trip History & Mileage CSV Log
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full font-bold">
                Auto-Logged
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Every time you tap for directions, the trip details and timestamps are logged into this CSV database for tax and delivery records.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportAll}
            disabled={history.length === 0}
            className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Trip Log (.CSV)</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block">Total Dispatches</span>
          <span className="text-2xl font-bold font-mono text-white tabular-nums">
            {history.length}
          </span>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block">Google Maps Launches</span>
          <span className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {history.filter((h) => h.openedInApp).length}
          </span>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block">Logged Today</span>
          <span className="text-2xl font-bold font-mono text-sky-400 tabular-nums">
            {history.filter((h) => h.timestamp >= startOfToday).length}
          </span>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block">Preferred Mode</span>
          <span className="text-lg font-bold text-white capitalize mt-1 block">
            {history.length > 0 ? history[0].travelMode : 'Driving'}
          </span>
        </div>
      </div>

      {/* Search & Period Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search trips by customer, address, postcode, or gate code..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {(['all', 'today', 'week'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setFilterPeriod(period)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer border ${
                filterPeriod === period
                  ? 'bg-slate-800 text-emerald-400 border-slate-700'
                  : 'bg-transparent text-slate-400 border-transparent hover:text-white'
              }`}
            >
              {period === 'all' ? 'All Trips' : period === 'today' ? 'Today' : 'Last 7 Days'}
            </button>
          ))}

          {filteredHistory.length !== history.length && (
            <button
              onClick={handleExportFiltered}
              className="text-xs text-emerald-400 hover:text-emerald-300 px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export ({filteredHistory.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* History Table / List */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl overflow-hidden shadow-lg">
        <div className="px-5 py-4 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Dispatched Route Log</h3>
            <span className="text-[11px] font-mono text-slate-400">
              ({filteredHistory.length} {filteredHistory.length === 1 ? 'trip' : 'trips'})
            </span>
          </div>

          {history.length > 0 && (
            <button
              onClick={onClearHistory}
              className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Log</span>
            </button>
          )}
        </div>

        {filteredHistory.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <Navigation className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
            <p>
              {history.length === 0
                ? 'No navigation dispatches recorded yet.'
                : 'No trips matching your filter.'}
            </p>
            <p className="mt-1 text-slate-600">
              Press the Floating GO Button to auto-capture customer destination!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className="p-4 hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-slate-400">
                    <span className="text-white font-semibold truncate text-xs">
                      {item.customerName || 'Customer Destination'}
                    </span>
                    {item.orderNumber && (
                      <span className="text-[10px] font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                        #{item.orderNumber}
                      </span>
                    )}
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="font-mono tabular-nums text-[11px] text-slate-300">
                      {item.dateStr || new Date(item.timestamp).toLocaleDateString()} at{' '}
                      {item.timeStr || new Date(item.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <div className="flex items-center gap-1 capitalize text-slate-300">
                      {getModeIcon(item.travelMode)}
                      <span>{item.travelMode}</span>
                    </div>
                  </div>

                  <p className="text-slate-100 font-medium truncate text-sm">
                    {item.address}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                    {item.gateCode && (
                      <span className="flex items-center gap-1 text-amber-300 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        <Key className="w-3 h-3" />
                        <span>Code: {item.gateCode}</span>
                      </span>
                    )}
                    {item.phone && (
                      <span className="flex items-center gap-1 text-slate-300">
                        <Phone className="w-3 h-3 text-sky-400" />
                        <span>{item.phone}</span>
                      </span>
                    )}
                    {item.source && (
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                        via {item.source.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleReLaunch(item)}
                    className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5 -rotate-45" />
                    <span>Re-Open Maps</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
