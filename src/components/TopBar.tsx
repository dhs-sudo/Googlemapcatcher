import React from 'react';
import { Navigation, Settings, Plus, Smartphone, History, ListOrdered, Camera, ShieldCheck, Download } from 'lucide-react';

interface TopBarProps {
  activeTab: 'orders' | 'history' | 'capture' | 'photo';
  setActiveTab: (tab: 'orders' | 'history' | 'capture' | 'photo') => void;
  onOpenSettings: () => void;
  onOpenNewOrder: () => void;
  onOpenInstall?: () => void;
  pendingCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  setActiveTab,
  onOpenSettings,
  onOpenNewOrder,
  onOpenInstall,
  pendingCount,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single Brand Element */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-bold">
            <Navigation className="w-5 h-5 -rotate-45" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              AutoNav
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('photo')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'photo'
                ? 'bg-slate-800 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Camera className="w-4 h-4 text-emerald-400" />
            <span>Screen Reader</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'orders'
                ? 'bg-slate-800 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            <span>Orders Queue</span>
            {pendingCount > 0 && (
              <span className="text-[11px] font-mono tabular-nums bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-slate-800 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Route Log</span>
          </button>

          <button
            onClick={() => setActiveTab('capture')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'capture'
                ? 'bg-slate-800 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Smart Text/Voice</span>
          </button>
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-2">
          {onOpenInstall && (
            <button
              onClick={onOpenInstall}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg shadow-sm transition-all whitespace-nowrap cursor-pointer hover:border-emerald-500/50"
              title="Install app on your phone"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Install App</span>
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-500/30 rounded-lg transition-colors whitespace-nowrap"
            title="Safe Mode: No accessibility API abuse, no app tampering"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Account Safe</span>
          </button>

          <button
            onClick={onOpenNewOrder}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-sm transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>New Order</span>
          </button>

          <button
            onClick={onOpenSettings}
            aria-label="Settings"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

