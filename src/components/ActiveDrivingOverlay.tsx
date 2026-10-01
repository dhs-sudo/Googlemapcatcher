import React, { useState, useEffect } from 'react';
import {
  Navigation,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  Phone,
  CheckCircle2,
  ExternalLink,
  Key,
  X,
  Compass,
  ArrowRight,
  Radio,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { CustomerOrder } from '../types';
import { openInPhoneMaps } from '../utils/navigation';
import {
  haversineDistanceMiles,
  getCoordinatesForAddress,
  LatLng,
  DEFAULT_ORIGIN,
} from '../utils/routeOptimizer';
import { useLiveGps } from '../utils/useLiveGps';
import { triggerHaptic, sound } from '../utils/audio';

interface ActiveDrivingOverlayProps {
  activeOrder: CustomerOrder | null;
  totalPendingCount: number;
  currentStopIndex?: number;
  onMarkDelivered: (orderId: string) => void;
  onSelectNextStop?: () => void;
  onOpenStackAnalyzer?: () => void;
  onClose?: () => void;
}

export const ActiveDrivingOverlay: React.FC<ActiveDrivingOverlayProps> = ({
  activeOrder,
  totalPendingCount,
  currentStopIndex = 1,
  onMarkDelivered,
  onSelectNextStop,
  onOpenStackAnalyzer,
  onClose,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isRefreshingGps, setIsRefreshingGps] = useState(false);

  // Hook for live GPS tracking
  const { coords: liveCoords, accuracy, status: gpsStatus, refreshLocation } = useLiveGps();
  const [liveDistance, setLiveDistance] = useState<number | null>(null);

  // Calculate live distance to active stop whenever position or active order changes
  useEffect(() => {
    if (!activeOrder) return;

    const stopCoords =
      activeOrder.coordinates ||
      getCoordinatesForAddress(activeOrder.address, activeOrder.city);

    const origin = liveCoords || DEFAULT_ORIGIN;
    const dist = haversineDistanceMiles(origin, stopCoords);
    setLiveDistance(dist);
  }, [activeOrder, liveCoords]);

  if (!activeOrder || activeOrder.status === 'delivered') return null;

  const displayDistance = liveDistance !== null ? `${liveDistance} mi` : '0.8 mi';
  const displayEta =
    liveDistance !== null ? `${Math.max(2, Math.round(liveDistance * 2.5))} min` : '3 min';

  const handleLaunchMaps = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(40);
    const dest = `${activeOrder.address}, ${activeOrder.city || ''} ${activeOrder.zipCode || ''}`.trim();
    openInPhoneMaps(dest, 'driving', true);
  };

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(60);
    sound.playLockSuccess();
    onMarkDelivered(activeOrder.id);
  };

  const handleRefreshGps = async (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(40);
    setIsRefreshingGps(true);
    await refreshLocation();
    setIsRefreshingGps(false);
  };

  return (
    <div className="fixed top-20 sm:top-20 inset-x-0 mx-auto max-w-lg px-3 z-40 pointer-events-none transition-all duration-300">
      <div className="pointer-events-auto bg-slate-900/95 border border-slate-700/90 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ring-1 ring-slate-800">
        {/* Top Header / Collapsed Strip */}
        <div
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-800/60 transition-colors select-none"
        >
          {/* Left: Active Nav Indicator + Next Stop Name */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex items-center justify-center shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 relative" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white truncate">
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                  NEXT STOP
                </span>
                <span className="truncate">{activeOrder.customerName}</span>
              </div>
              {isCollapsed && (
                <p className="text-[11px] text-slate-400 truncate">
                  {activeOrder.address}
                </p>
              )}
            </div>
          </div>

          {/* Right: Distance & ETA + Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Live Distance & ETA Pill */}
            <div
              onClick={handleRefreshGps}
              title="Click to update GPS position"
              className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 text-[11px] font-mono font-bold text-emerald-300 cursor-pointer hover:border-slate-700 transition-colors"
            >
              <Compass className={`w-3.5 h-3.5 text-emerald-400 shrink-0 ${isRefreshingGps ? 'animate-spin' : ''}`} />
              <span>{displayDistance}</span>
              <span className="text-slate-500">·</span>
              <span className="text-sky-300">{displayEta}</span>
            </div>

            {/* Quick 1-Tap Google Maps Button */}
            <button
              onClick={handleLaunchMaps}
              title="Open Google Maps Turn-by-Turn"
              className="p-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5 -rotate-45" />
            </button>

            {/* Collapse / Expand Toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsCollapsed(!isCollapsed);
              }}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              aria-label={isCollapsed ? 'Expand Driving Details' : 'Collapse Driving Details'}
            >
              {isCollapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Expanded View: Full Details & Driver Tools */}
        {!isCollapsed && (
          <div className="px-4 pb-3.5 pt-1 border-t border-slate-800/80 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
            {/* Live GPS Status & Update Button */}
            <div className="flex items-center justify-between bg-slate-950/70 px-3 py-2 rounded-xl border border-slate-800 text-[11px]">
              <div className="flex items-center gap-2">
                <Radio
                  className={`w-3.5 h-3.5 ${
                    gpsStatus === 'active'
                      ? 'text-emerald-400 animate-pulse'
                      : 'text-amber-400'
                  }`}
                />
                <span className="text-slate-300 font-medium">
                  {gpsStatus === 'active'
                    ? `GPS Active (${liveCoords ? `${liveCoords.lat.toFixed(3)}, ${liveCoords.lng.toFixed(3)}` : ''} · ±${accuracy || 10}m)`
                    : gpsStatus === 'acquiring'
                    ? 'Updating GPS position...'
                    : 'GPS Ready (Tap Update)'}
                </span>
              </div>
              <button
                onClick={handleRefreshGps}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer border border-slate-700"
                title="Force refresh device GPS location"
              >
                <RefreshCw
                  className={`w-3 h-3 ${isRefreshingGps ? 'animate-spin' : ''}`}
                />
                <span>Update GPS</span>
              </button>
            </div>

            {/* Address Row */}
            <div className="flex items-start gap-2 text-xs text-slate-200 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white leading-snug break-words">
                  {activeOrder.address}
                </p>
                {(activeOrder.city || activeOrder.zipCode) && (
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {[activeOrder.city, activeOrder.zipCode].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>

            {/* Delivery Notes / Gate Code / Phone (if present) */}
            {(activeOrder.gateCode || activeOrder.phone || activeOrder.deliveryNotes) && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {activeOrder.gateCode && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[11px] font-mono">
                    <Key className="w-3 h-3 text-amber-400" />
                    <span>Gate: {activeOrder.gateCode}</span>
                  </div>
                )}

                {activeOrder.phone && (
                  <a
                    href={`tel:${activeOrder.phone.replace(/[^0-9+]/g, '')}`}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold hover:bg-emerald-500/20 transition-colors"
                  >
                    <Phone className="w-3 h-3 text-emerald-400" />
                    <span>Call Customer</span>
                  </a>
                )}

                {activeOrder.deliveryNotes && (
                  <p className="text-[11px] text-slate-400 italic line-clamp-1 w-full pl-0.5">
                    "{activeOrder.deliveryNotes}"
                  </p>
                )}
              </div>
            )}

            {/* Analyze Mid-Trip Offer Button */}
            {onOpenStackAnalyzer && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic(40);
                  onOpenStackAnalyzer();
                }}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 hover:from-indigo-600/40 hover:to-purple-600/40 text-purple-200 border border-purple-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <Layers className="w-4 h-4 text-purple-400 shrink-0" />
                <span>⚡ Analyze Mid-Trip Offer (Is It On The Way?)</span>
              </button>
            )}

            {/* Action Buttons: Launch Google Maps + Mark Delivered */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleLaunchMaps}
                className="py-2.5 px-3 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5 -rotate-45" />
                <span>Open Google Maps</span>
              </button>

              <button
                onClick={handleComplete}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mark Delivered</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
