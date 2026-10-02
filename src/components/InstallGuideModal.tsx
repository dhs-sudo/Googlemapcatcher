import React, { useState } from 'react';
import {
  X,
  Download,
  Smartphone,
  Share,
  PlusSquare,
  CheckCircle2,
  ExternalLink,
  Zap,
  ArrowRight,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';
import { triggerHaptic } from '../utils/audio';

interface InstallGuideModalProps {
  onClose: () => void;
}

export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({ onClose }) => {
  const { canInstall, isInstalled, isIOS, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'android' | 'ios'>(isIOS ? 'ios' : 'android');
  const [installSuccess, setInstallSuccess] = useState(false);

  const handleInstallClick = async () => {
    triggerHaptic(50);
    const success = await install();
    if (success) {
      setInstallSuccess(true);
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-100 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 shadow-md">
              <Download className="w-5 h-5 font-bold" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Install on Your Phone</h2>
              <p className="text-[11px] text-slate-400">Native fullscreen home-screen app</p>
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

        {/* Status: Already Installed Notification */}
        {isInstalled && (
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            <span>
              <strong>AutoNav is already installed!</strong> You are running in standalone fullscreen app mode.
            </span>
          </div>
        )}

        {/* 1-Tap Native Install Trigger (for Android / Chromium) */}
        {canInstall && !isInstalled && (
          <div className="bg-gradient-to-r from-emerald-950/50 to-teal-950/50 border border-emerald-500/40 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-white text-sm block">1-Tap Direct Install</span>
                <span className="text-xs text-emerald-300/90">Chrome / Edge / Android supported</span>
              </div>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                READY
              </span>
            </div>
            <button
              onClick={handleInstallClick}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Install AutoNav Now</span>
            </button>
          </div>
        )}

        {/* Device Platform Tabs: Android vs iPhone */}
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
          <button
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'android'
                ? 'bg-slate-800 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android (Chrome)</span>
          </button>
          <button
            onClick={() => setActiveTab('ios')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'ios'
                ? 'bg-slate-800 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>iPhone (Safari)</span>
          </button>
        </div>

        {/* Instructions Body */}
        {activeTab === 'android' ? (
          <div className="space-y-3 text-xs bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                1
              </span>
              <div>
                <p className="font-semibold text-white">Open in Chrome Browser</p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Ensure you are viewing this page in Google Chrome on your phone.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-2 border-t border-slate-800/80">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                2
              </span>
              <div>
                <p className="font-semibold text-white">Tap Chrome Menu (⋮)</p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Tap the three vertical dots in the top-right corner of Chrome.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-2 border-t border-slate-800/80">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                3
              </span>
              <div>
                <p className="font-semibold text-white">Tap "Install App" or "Add to Home Screen"</p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Confirm the prompt. The AutoNav icon will be added to your home screen!
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-xs bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                1
              </span>
              <div>
                <p className="font-semibold text-white">Open in Apple Safari</p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Apple only allows Home Screen installations via Safari.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-2 border-t border-slate-800/80">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                2
              </span>
              <div>
                <p className="font-semibold text-white flex items-center gap-1.5">
                  <span>Tap Share Button</span>
                  <Share className="w-3.5 h-3.5 text-sky-400 inline" />
                </p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Tap the blue Share icon (square with arrow pointing up) at the bottom toolbar.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-2 border-t border-slate-800/80">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                3
              </span>
              <div>
                <p className="font-semibold text-white flex items-center gap-1.5">
                  <span>Select "Add to Home Screen"</span>
                  <PlusSquare className="w-3.5 h-3.5 text-emerald-400 inline" />
                </p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Scroll down the share sheet and tap <strong>Add to Home Screen</strong>, then tap <strong>Add</strong> in the top right.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Benefits for Couriers */}
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] space-y-1.5 text-slate-300">
          <div className="font-bold text-white flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Why install as a home screen app?</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            • <strong>No browser address bars:</strong> Gives you 100% of your screen for navigation.<br />
            • <strong>Fastest 1-tap launch:</strong> Lives right next to Uber, DoorDash, and Google Maps.<br />
            • <strong>Persistent GPS tracking:</strong> Keeps satellite fixes accurate while driving.
          </p>
        </div>

        {/* Bottom Done button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
        >
          Got It
        </button>
      </div>
    </div>
  );
};
