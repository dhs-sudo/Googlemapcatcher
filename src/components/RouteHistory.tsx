import React from 'react';
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
  CheckCircle,
} from 'lucide-react';
import { openInPhoneMaps } from '../utils/navigation';
import { triggerHaptic } from '../utils/audio';

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

  const exportCsv = () => {
    if (history.length === 0) return;
    const headers = ['Timestamp', 'Customer Name', 'Address', 'Phone', 'Travel Mode'];
    const rows = history.map((item) => [
      new Date(item.timestamp).toISOString(),
      `"${item.customerName || ''}"`,
      `"${item.address.replace(/"/g, '""')}"`,
      `"${item.phone || ''}"`,
      item.travelMode,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `autonav_route_history_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReLaunch = (item: NavigationHistoryItem) => {
    triggerHaptic(40);
    openInPhoneMaps(item.address, item.travelMode, true);
  };

  return (
    <div className="space-y-4">
      {/* Metrics Row */}
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
          <span className="text-xs text-slate-400 block">Preferred Mode</span>
          <span className="text-lg font-bold text-white capitalize mt-1 block">
            {history.length > 0 ? history[0].travelMode : 'Driving'}
          </span>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">Export Logs</span>
            <span className="text-xs text-slate-500">CSV spreadsheet</span>
          </div>
          <button
            onClick={exportCsv}
            disabled={history.length === 0}
            className="p-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white rounded-xl transition-colors"
            title="Download CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* History Table / List */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl overflow-hidden shadow-lg">
        <div className="px-5 py-4 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Dispatched Route Log</h3>
          </div>

          {history.length > 0 && (
            <button
              onClick={onClearHistory}
              className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <Navigation className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
            <p>No navigation dispatches recorded yet.</p>
            <p className="mt-1 text-slate-600">
              Press the Floating GO Button to auto-capture customer destination!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {history.map((item) => (
              <div
                key={item.id}
                className="p-4 hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="text-slate-300 font-semibold truncate">
                      {item.customerName || 'Customer Destination'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums text-[11px]">
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span aria-hidden="true">·</span>
                    <div className="flex items-center gap-1 capitalize">
                      {getModeIcon(item.travelMode)}
                      <span>{item.travelMode}</span>
                    </div>
                  </div>

                  <p className="text-white font-medium truncate text-sm">
                    {item.address}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleReLaunch(item)}
                    className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
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
