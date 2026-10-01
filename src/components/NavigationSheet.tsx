import React, { useState, useEffect } from 'react';
import {
  Navigation,
  Phone,
  Key,
  FileText,
  QrCode,
  ExternalLink,
  X,
  Share2,
  Check,
  Compass,
  Car,
  Bike,
  Footprints,
  Bus,
  Clock,
  MapPin,
  Gauge,
  RotateCw,
} from 'lucide-react';
import { ParsedAddress } from '../types';
import { buildNavigationUrls, openInPhoneMaps, generateQrCode } from '../utils/navigation';
import { triggerHaptic } from '../utils/audio';

interface DistanceMatrixData {
  distance?: { text: string; value: number };
  duration?: { text: string; value: number };
  duration_in_traffic?: { text: string; value: number };
  originAddress?: string;
  trafficCondition?: string;
  apiSource?: string;
  status: string;
}

interface NavigationSheetProps {
  capturedAddress: ParsedAddress | null;
  onClose: () => void;
  travelMode: 'driving' | 'bicycling' | 'walking' | 'transit';
  setTravelMode: (mode: 'driving' | 'bicycling' | 'walking' | 'transit') => void;
  onConfirmComplete?: () => void;
}

export const NavigationSheet: React.FC<NavigationSheetProps> = ({
  capturedAddress,
  onClose,
  travelMode,
  setTravelMode,
  onConfirmComplete,
}) => {
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Distance Matrix State
  const [distanceData, setDistanceData] = useState<DistanceMatrixData | null>(null);
  const [isLoadingEta, setIsLoadingEta] = useState(false);
  const [driverCoords, setDriverCoords] = useState<string>('');

  // Fetch driver's live GPS coordinates once if available
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setDriverCoords(`${pos.coords.latitude},${pos.coords.longitude}`);
        },
        () => {
          // GPS not allowed or unavailable
        },
        { timeout: 5000 }
      );
    }
  }, []);

  // Call Google Maps Distance Matrix API endpoint whenever destination or mode changes
  const fetchDistanceMatrix = async () => {
    if (!capturedAddress) return;
    setIsLoadingEta(true);

    try {
      const res = await fetch('/api/distance-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: driverCoords || 'Current Driver Location',
          destination: capturedAddress.formattedAddress,
          travelMode,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setDistanceData(data);
      }
    } catch (err) {
      console.warn('Failed to fetch distance matrix:', err);
    } finally {
      setIsLoadingEta(false);
    }
  };

  useEffect(() => {
    fetchDistanceMatrix();
  }, [capturedAddress, travelMode, driverCoords]);

  useEffect(() => {
    if (!capturedAddress) return;
    const { universalUrl } = buildNavigationUrls(capturedAddress.formattedAddress, travelMode);
    generateQrCode(universalUrl).then(setQrDataUrl);
  }, [capturedAddress, travelMode]);

  if (!capturedAddress) return null;

  const { universalUrl, wazeUrl, appleMapsUrl } = buildNavigationUrls(
    capturedAddress.formattedAddress,
    travelMode
  );

  const handleLaunchMaps = () => {
    triggerHaptic(60);
    openInPhoneMaps(capturedAddress.formattedAddress, travelMode, true);
    if (onConfirmComplete) onConfirmComplete();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(universalUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(capturedAddress.formattedAddress);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 transition-opacity"
      />

      {/* Slide-Up Bottom Drawer / Modal */}
      <div className="fixed inset-x-0 bottom-0 z-50 max-w-2xl mx-auto bg-slate-900 border-t border-slate-800 rounded-t-3xl shadow-2xl p-5 sm:p-6 text-slate-100 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
        {/* Grab Handle */}
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4" />

        {/* Header with Title and Close Button */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  Address Auto-Captured
                </span>
                <span className="text-[11px] text-slate-500">
                  via {capturedAddress.source.replace('_', ' ')}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {capturedAddress.customerName || 'Customer Destination'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Google Maps Distance Matrix ETA & Route Card */}
        <div className="bg-gradient-to-r from-emerald-950/40 via-slate-800/90 to-slate-800/80 border border-emerald-500/30 rounded-2xl p-4 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Distance Matrix ETA & Route
              </span>
            </div>

            <button
              onClick={fetchDistanceMatrix}
              className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              title="Refresh ETA"
            >
              <RotateCw className={`w-3 h-3 ${isLoadingEta ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {isLoadingEta ? (
            <div className="py-2 flex items-center gap-3 animate-pulse">
              <div className="h-7 w-24 bg-slate-700/60 rounded-lg" />
              <div className="h-7 w-20 bg-slate-700/60 rounded-lg" />
              <div className="h-7 w-28 bg-slate-700/60 rounded-lg" />
            </div>
          ) : distanceData && distanceData.status === 'OK' ? (
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {/* Estimated Duration */}
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/60">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">
                  Est. Travel Time
                </span>
                <span className="text-lg font-bold text-emerald-400 font-mono tabular-nums leading-tight">
                  {distanceData.duration?.text || '—'}
                </span>
              </div>

              {/* Distance */}
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/60">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">
                  Route Distance
                </span>
                <span className="text-lg font-bold text-white font-mono tabular-nums leading-tight">
                  {distanceData.distance?.text || '—'}
                </span>
              </div>

              {/* Traffic / Condition */}
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/60">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">
                  Traffic Status
                </span>
                <span className="text-xs font-bold text-emerald-300 block truncate mt-1">
                  {distanceData.trafficCondition || 'Normal Traffic'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 py-1 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-emerald-400" />
              <span>Calculating live distance and ETA matrix...</span>
            </div>
          )}

          <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5 truncate max-w-[260px]">
              <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
              <span className="truncate">
                {driverCoords ? 'From Live GPS Location' : 'From Dispatch Origin'}
              </span>
            </span>

            <span className="font-mono text-[10px] text-slate-500">
              {distanceData?.apiSource === 'google_maps_distance_matrix'
                ? 'Google Maps API'
                : 'Smart Matrix'}
            </span>
          </div>
        </div>

        {/* Address Card */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 mb-4 shadow-inner">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-base font-semibold text-white leading-snug">
                {capturedAddress.formattedAddress}
              </p>
              {capturedAddress.unit && (
                <p className="text-xs font-medium text-emerald-400">
                  Unit / Suite: {capturedAddress.unit}
                </p>
              )}
            </div>

            <button
              onClick={handleCopyAddress}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg text-xs flex items-center gap-1 transition-colors shrink-0"
              title="Copy Address"
            >
              {copiedAddress ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Customer details badges */}
          <div className="mt-3 pt-3 border-t border-slate-700/60 flex flex-wrap items-center gap-3 text-xs text-slate-300">
            {capturedAddress.phone && (
              <a
                href={`tel:${capturedAddress.phone.replace(/[^0-9+]/g, '')}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{capturedAddress.phone}</span>
              </a>
            )}

            {capturedAddress.gateCode && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                <Key className="w-3.5 h-3.5" />
                <span>Gate: {capturedAddress.gateCode}</span>
              </div>
            )}

            {capturedAddress.notes && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-700/50 text-slate-300">
                <FileText className="w-3.5 h-3.5" />
                <span className="truncate max-w-[220px]">{capturedAddress.notes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Travel Mode Selector */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
            Navigation Mode
          </label>
          <div className="grid grid-cols-4 gap-2 p-1 bg-slate-800/90 rounded-xl border border-slate-700">
            <button
              onClick={() => setTravelMode('driving')}
              className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                travelMode === 'driving'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Drive</span>
            </button>
            <button
              onClick={() => setTravelMode('bicycling')}
              className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                travelMode === 'bicycling'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Bike</span>
            </button>
            <button
              onClick={() => setTravelMode('walking')}
              className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                travelMode === 'walking'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>Walk</span>
            </button>
            <button
              onClick={() => setTravelMode('transit')}
              className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                travelMode === 'transit'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bus className="w-3.5 h-3.5" />
              <span>Transit</span>
            </button>
          </div>
        </div>

        {/* Primary Action Button: Open In Google Maps */}
        <div className="space-y-2.5">
          <button
            onClick={handleLaunchMaps}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] text-base"
          >
            <Navigation className="w-5 h-5 -rotate-45" />
            <span>Launch Google Maps Directions</span>
          </button>

          {/* Secondary Actions: Google Maps only */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowQrModal(true)}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span>Beam to Phone (QR)</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copied Maps Link!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-slate-400" />
                  <span>Copy Google Maps Link</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* QR Code Scan Modal (for beaming to physical phone from computer/tablet) */}
      {showQrModal && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Scan with Your Phone</h3>
            <p className="text-xs text-slate-400 mb-4">
              Point your phone camera here to immediately launch turn-by-turn navigation in Google Maps
            </p>

            {qrDataUrl && (
              <div className="p-3 bg-white rounded-2xl inline-block shadow-lg mb-4">
                <img
                  src={qrDataUrl}
                  alt="Google Maps QR code"
                  className="w-52 h-52 object-contain"
                />
              </div>
            )}

            <p className="text-[11px] font-mono text-emerald-400 break-all bg-slate-800/80 p-2 rounded-lg border border-slate-700 mb-4">
              {capturedAddress.formattedAddress}
            </p>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};
