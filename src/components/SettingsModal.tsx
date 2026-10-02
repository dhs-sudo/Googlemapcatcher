import React from 'react';
import {
  X,
  Volume2,
  VolumeX,
  Smartphone,
  Navigation,
  Sparkles,
  RotateCcw,
  Zap,
  Mic,
  Car,
  Bike,
  Footprints,
  Bus,
  ShieldCheck,
  Eye,
  Sliders,
  Maximize2,
  Compass,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsModalProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onClose: () => void;
  onResetButtonPosition: () => void;
  onSetPresetPosition?: (dock: 'bottom-right' | 'bottom-left' | 'top-right') => void;
  onOpenInstall?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
  onResetButtonPosition,
  onSetPresetPosition,
  onOpenInstall,
}) => {
  return (
    <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6 text-slate-100 my-8 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Driver App Safe Customs</h2>
              <p className="text-[11px] text-slate-400">Zero interference settings for courier apps</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SECTION 1: Zero-Interference Screen Customs */}
        <div className="space-y-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Screen Interference Prevention</span>
          </div>

          {/* Setting A: Auto-Snap to Edge */}
          <div className="flex items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-semibold text-white block">Auto-Snap to Safe Edge</span>
              <p className="text-[11px] text-slate-400">
                Automatically parks the button along the screen bezel away from center offers.
              </p>
            </div>
            <button
              onClick={() =>
                onUpdateSettings({ autoSnapToEdge: !(settings.autoSnapToEdge ?? true) })
              }
              className={`w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                (settings.autoSnapToEdge ?? true) ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  (settings.autoSnapToEdge ?? true) ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Setting B: Ghost Mode (Transparency / Opacity) */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">Ghost Transparency (See-Through)</span>
              <span className="text-emerald-400 font-mono text-[11px]">
                {Math.round((settings.buttonOpacity ?? 0.95) * 100)}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Allows you to read street maps and driver offer details directly through the button.
            </p>
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[
                { val: 0.45, label: '45% Ghost' },
                { val: 0.65, label: '65% Light' },
                { val: 0.85, label: '85% Balanced' },
                { val: 1.0, label: '100% Solid' },
              ].map((opt) => {
                const isSelected = Math.abs((settings.buttonOpacity ?? 0.95) - opt.val) < 0.08;
                return (
                  <button
                    key={opt.val}
                    onClick={() => onUpdateSettings({ buttonOpacity: opt.val })}
                    className={`py-1.5 rounded-lg text-[10px] font-bold transition-colors border cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Setting C: Button Scale / Size */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <span className="font-semibold text-white text-xs block">Button Profile & Size</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'compact', label: 'Compact (48px)', desc: 'Smallest footprint' },
                { id: 'normal', label: 'Standard (56px)', desc: 'Recommended' },
                { id: 'large', label: 'Large (64px)', desc: 'High accessibility' },
              ].map((sz) => {
                const isSelected = (settings.buttonScale || 'normal') === sz.id;
                return (
                  <button
                    key={sz.id}
                    onClick={() =>
                      onUpdateSettings({ buttonScale: sz.id as 'compact' | 'normal' | 'large' })
                    }
                    className={`p-2 rounded-xl text-xs flex flex-col items-center gap-1 transition-colors border cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="font-bold text-[11px]">{sz.label}</span>
                    <span className="text-[9px] text-slate-400">{sz.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Setting D: Show / Hide Mid-Trip Analyze Button */}
          <div className="flex items-center justify-between gap-3 text-xs pt-2 border-t border-slate-800/80">
            <div>
              <span className="font-semibold text-white block">Floating Mid-Trip Analyze Button</span>
              <p className="text-[11px] text-slate-400">
                Keep the purple ANALYZE button floating beside GO Maps, or hide it to save space.
              </p>
            </div>
            <button
              onClick={() =>
                onUpdateSettings({ showAnalyzeButton: !(settings.showAnalyzeButton ?? true) })
              }
              className={`w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                (settings.showAnalyzeButton ?? true) ? 'bg-indigo-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  (settings.showAnalyzeButton ?? true) ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* SECTION 2: Recommended Safe Screen Docks */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">
            Recommended Safe Docks (Avoids Courier Accept/Decline Buttons)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                id: 'bottom-right',
                title: 'Right Edge',
                desc: 'Right thumb zone',
                coords: { x: typeof window !== 'undefined' ? window.innerWidth - 165 : 220, y: 460 },
              },
              {
                id: 'bottom-left',
                title: 'Left Edge',
                desc: 'Avoids bottom slider',
                coords: { x: 14, y: 460 },
              },
              {
                id: 'top-right',
                title: 'Top Right',
                desc: 'Above all offer cards',
                coords: { x: typeof window !== 'undefined' ? window.innerWidth - 165 : 220, y: 120 },
              },
            ].map((dock) => (
              <button
                key={dock.id}
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('autonav_button_pos', JSON.stringify(dock.coords));
                  }
                  if (onSetPresetPosition) onSetPresetPosition(dock.id as any);
                  onResetButtonPosition();
                }}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition-colors cursor-pointer group"
              >
                <div className="text-[11px] font-bold text-white group-hover:text-emerald-300">
                  {dock.title}
                </div>
                <div className="text-[9.5px] text-slate-400 mt-0.5">{dock.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* SECTION 3: Navigation Launch Mode */}
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">Instant Google Maps Launch</span>
            <button
              onClick={() =>
                onUpdateSettings({ autoLaunchGoogleMaps: !settings.autoLaunchGoogleMaps })
              }
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                settings.autoLaunchGoogleMaps ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  settings.autoLaunchGoogleMaps ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
          <p className="text-xs text-slate-400">
            {settings.autoLaunchGoogleMaps
              ? '1-Tap Mode: Reading the address launches Google Maps turn-by-turn immediately.'
              : 'Preview Mode: Shows customer notes, gate code, and route details before launching maps.'}
          </p>
        </div>

        {/* SECTION 4: Courier Multi-App Best Practices Guide */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 space-y-2 text-xs">
          <div className="font-bold text-slate-200 flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-sky-400" />
            <span>Driver App Best Practice Recommendations:</span>
          </div>
          <ul className="space-y-1.5 text-[11px] text-slate-400 list-disc pl-4 leading-relaxed">
            <li>
              <strong className="text-slate-200">Uber Eats / DoorDash:</strong> "Accept" buttons are at the bottom center. Dock the button along the <strong>upper-right or middle-left</strong> edge so your thumbs never mis-tap.
            </li>
            <li>
              <strong className="text-slate-200">Deliveroo / Stuart:</strong> Offer acceptance timer is centered. Keep <strong>Auto-Snap to Edge</strong> enabled to automatically hug the side bezels.
            </li>
            <li>
              <strong className="text-slate-200">Use 65% Ghost Mode:</strong> Turn on Ghost mode so you can see offer payouts and dropoff street names through the button before deciding.
            </li>
          </ul>
        </div>

        {/* SECTION 5: Install App on Phone */}
        {onOpenInstall && (
          <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-3.5 flex items-center justify-between gap-3">
            <div>
              <span className="font-bold text-white text-xs block">Install on Your Phone</span>
              <p className="text-[11px] text-slate-400">Run fullscreen on iOS Safari or Android Chrome</p>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenInstall();
              }}
              className="py-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer shrink-0"
            >
              Install Guide
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-800">
          <button
            onClick={() => {
              onResetButtonPosition();
              onClose();
            }}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Position</span>
          </button>

          <button
            onClick={onClose}
            className="py-2 px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
