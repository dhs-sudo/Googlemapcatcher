import React, { useState, useEffect, useRef } from 'react';
import {
  Navigation,
  Compass,
  Sparkles,
  Mic,
  Camera,
  ShieldCheck,
  Layers,
  Settings as SettingsIcon,
} from 'lucide-react';
import { triggerHaptic } from '../utils/audio';

interface FloatingButtonProps {
  onCapture: () => void;
  onVoiceCapture: () => void;
  onManualCapture: () => void;
  onPhotoCapture: () => void;
  onOpenStackAnalyzer?: () => void;
  onOpenSettings?: () => void;
  activeTargetName?: string;
  isCapturing: boolean;
  autoLaunch: boolean;
  scale?: 'compact' | 'normal' | 'large';
  opacity?: number;
  autoSnapToEdge?: boolean;
  showAnalyzeButton?: boolean;
}

export const FloatingButton: React.FC<FloatingButtonProps> = ({
  onCapture,
  onVoiceCapture,
  onManualCapture,
  onPhotoCapture,
  onOpenStackAnalyzer,
  onOpenSettings,
  activeTargetName,
  isCapturing,
  autoLaunch,
  scale = 'normal',
  opacity = 0.95,
  autoSnapToEdge = true,
  showAnalyzeButton = true,
}) => {
  // Draggable position state
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('autonav_button_pos');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // fallback
        }
      }
      return {
        x: Math.max(16, window.innerWidth - 160),
        y: Math.max(16, window.innerHeight - 110),
      };
    }
    return { x: 220, y: 560 };
  });

  const [isDragging, setIsDragging] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [dragMoved, setDragMoved] = useState(false);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialBtnPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep button within window bounds on resize
  useEffect(() => {
    const handleResize = () => {
      const widthAllowance = showAnalyzeButton && onOpenStackAnalyzer ? 150 : 80;
      setPosition((prev) => ({
        x: Math.min(Math.max(12, prev.x), window.innerWidth - widthAllowance),
        y: Math.min(Math.max(12, prev.y), window.innerHeight - 90),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showAnalyzeButton, onOpenStackAnalyzer]);

  // Save position on change
  useEffect(() => {
    if (position.x && position.y) {
      localStorage.setItem('autonav_button_pos', JSON.stringify(position));
    }
  }, [position]);

  // Pointer drag handling for desktop and mobile touch
  const handlePointerDown = (e: React.PointerEvent) => {
    startPosRef.current = { x: e.clientX, y: e.clientY };
    initialBtnPosRef.current = { x: position.x, y: position.y };
    setIsDragging(true);
    setDragMoved(false);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - startPosRef.current.x;
    const dy = e.clientY - startPosRef.current.y;

    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
      setDragMoved(true);
    }

    const widthAllowance = showAnalyzeButton && onOpenStackAnalyzer ? 150 : 80;
    const newX = Math.min(Math.max(12, initialBtnPosRef.current.x + dx), window.innerWidth - widthAllowance);
    const newY = Math.min(Math.max(12, initialBtnPosRef.current.y + dy), window.innerHeight - 90);

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    // Auto-Snap to Edge feature: Parks safely against the left or right phone edge
    if (dragMoved && autoSnapToEdge) {
      const screenMid = window.innerWidth / 2;
      const widthAllowance = showAnalyzeButton && onOpenStackAnalyzer ? 150 : 80;
      const snappedX = position.x < screenMid ? 12 : window.innerWidth - widthAllowance;
      setPosition((prev) => ({ ...prev, x: snappedX }));
    }

    if (!dragMoved) {
      // Genuine tap on primary navigate button
      triggerHaptic(40);
      onCapture();
    }
  };

  // Dimensions based on user scale setting
  const goBtnSizeClass =
    scale === 'compact'
      ? 'w-12 h-12'
      : scale === 'large'
      ? 'w-16 h-16'
      : 'w-14 h-14';

  const analyzeBtnSizeClass =
    scale === 'compact'
      ? 'w-10 h-10'
      : scale === 'large'
      ? 'w-13 h-13'
      : 'w-11 h-11';

  return (
    // Outer container has pointer-events-none so touches anywhere outside the round buttons pass straight to the underlying app
    <div
      ref={containerRef}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: 'none',
      }}
      className="fixed z-50 select-none flex flex-col items-center pointer-events-none transition-all duration-150"
    >
      {/* Quick context menu popping above when activated */}
      {showQuickMenu && (
        <div className="pointer-events-auto mb-2 bg-slate-900/95 border border-slate-700/80 backdrop-blur-md rounded-2xl p-1.5 shadow-2xl flex flex-col gap-1 text-xs w-52 transition-all animate-in fade-in zoom-in-95">
          <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 border-b border-slate-800 flex items-center justify-between">
            <span>Read Options</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>

          <button
            onClick={() => {
              setShowQuickMenu(false);
              onCapture();
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white transition-colors text-left cursor-pointer"
          >
            <Navigation className="w-4 h-4 text-emerald-400 -rotate-45" />
            <span>Read & Route (GO Maps)</span>
          </button>

          {onOpenStackAnalyzer && (
            <button
              onClick={() => {
                setShowQuickMenu(false);
                onOpenStackAnalyzer();
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-purple-200 hover:bg-purple-950/40 hover:text-white transition-colors text-left cursor-pointer font-semibold"
            >
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Analyze Mid-Trip Offer</span>
            </button>
          )}

          <button
            onClick={() => {
              setShowQuickMenu(false);
              onPhotoCapture();
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white transition-colors text-left cursor-pointer"
          >
            <Camera className="w-4 h-4 text-emerald-400" />
            <span>Scan Screen / Photo</span>
          </button>

          <button
            onClick={() => {
              setShowQuickMenu(false);
              onVoiceCapture();
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white transition-colors text-left cursor-pointer"
          >
            <Mic className="w-4 h-4 text-amber-400" />
            <span>Voice Address Dictate</span>
          </button>

          {onOpenSettings && (
            <button
              onClick={() => {
                setShowQuickMenu(false);
                onOpenSettings();
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left cursor-pointer border-t border-slate-800/80 pt-2"
            >
              <SettingsIcon className="w-4 h-4 text-slate-400" />
              <span>Button Customization</span>
            </button>
          )}

          <div className="px-2 py-1 text-[10px] text-slate-400 border-t border-slate-800 italic">
            100% Read-Only: Never touches accept/decline.
          </div>
        </div>
      )}

      {/* Floating Target Label Pill */}
      {activeTargetName && !isDragging && (
        <div className="absolute -top-7 whitespace-nowrap bg-slate-900/90 text-slate-200 text-[11px] font-medium px-2.5 py-0.5 rounded-full border border-slate-700 shadow-md backdrop-blur-xs pointer-events-none flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="truncate max-w-[160px]">{activeTargetName}</span>
        </div>
      )}

      {/* Floating Buttons Cluster with customizable Opacity & Scale */}
      <div
        style={{ opacity: isDragging ? 1 : opacity }}
        className="pointer-events-auto flex items-end gap-2 bg-slate-900/80 p-1.5 rounded-3xl border border-slate-700/80 shadow-2xl backdrop-blur-md transition-opacity duration-200"
      >
        {/* BUTTON 1: Dedicated ANALYZE MID-TRIP OFFER Button */}
        {showAnalyzeButton && onOpenStackAnalyzer && (
          <div className="flex flex-col items-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic(40);
                onOpenStackAnalyzer();
              }}
              aria-label="Analyze Middle Trip Offer During Delivery (Read Only)"
              title="Analyze if incoming mid-trip offer from another app is on your way (100% Read-Only, never accepts or declines)"
              className={`relative ${analyzeBtnSizeClass} rounded-full bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-700 text-white shadow-lg flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 border-2 border-indigo-300/40`}
            >
              <Layers className="w-4 h-4 text-indigo-100" />
              <span className="text-[7px] font-black tracking-wider uppercase text-indigo-100 leading-none mt-0.5">
                ANALYZE
              </span>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-purple-400 border border-slate-900 animate-pulse" />
            </button>
            <span className="mt-1 text-[8px] font-bold text-indigo-300 tracking-tight text-center pointer-events-none drop-shadow">
              Mid-Trip
            </span>
          </div>
        )}

        {/* BUTTON 2: PRIMARY READ & GO MAPS Button */}
        <div className="flex flex-col items-center">
          <div className="relative group">
            {/* Subtle radar ring */}
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-radar pointer-events-none" />

            {/* Ambient glow */}
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-50 blur-xs group-hover:opacity-90 transition-opacity pointer-events-none" />

            {/* Main Go Button */}
            <button
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              aria-label="Read Address and Open in Google Maps (Read Only)"
              title="Read screen address and launch Google Maps (Passive reading only - never accepts or declines trips)"
              className={`relative ${goBtnSizeClass} rounded-full bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 text-white shadow-2xl flex items-center justify-center cursor-pointer transition-transform active:scale-95 border-2 border-emerald-300/40 select-none ${
                isDragging ? 'cursor-grabbing scale-105 shadow-emerald-500/50' : 'cursor-grab'
              } ${isCapturing ? 'animate-pulse' : ''}`}
            >
              {isCapturing ? (
                <div className="relative flex items-center justify-center pointer-events-none">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <Navigation className="w-3 h-3 text-white absolute" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center pointer-events-none">
                  <Navigation className="w-5 h-5 text-white filter drop-shadow -rotate-45" />
                  <span className="text-[7.5px] font-extrabold tracking-wider uppercase text-emerald-100 mt-0.5 leading-none">
                    GO
                  </span>
                </div>
              )}

              {/* Instant Mode Indicator Dot */}
              <span
                className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full border border-slate-900 pointer-events-none ${
                  autoLaunch ? 'bg-emerald-300' : 'bg-amber-400'
                }`}
                title={autoLaunch ? 'Instant Navigation' : 'Preview Mode'}
              />
            </button>

            {/* Mini Quick-Menu Trigger Beside Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowQuickMenu((prev) => !prev);
              }}
              aria-label="Toggle options"
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-90 cursor-pointer"
            >
              <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
            </button>
          </div>

          <span className="mt-1 text-[8px] font-bold text-emerald-300 tracking-tight text-center pointer-events-none drop-shadow">
            GO Maps
          </span>
        </div>
      </div>
    </div>
  );
};
