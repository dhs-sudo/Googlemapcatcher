import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Phone,
  Key,
  MapPin,
  X,
  Store,
  ListPlus,
} from 'lucide-react';
import { ParsedAddress, CustomerOrder } from '../types';
import { triggerHaptic, sound } from '../utils/audio';
import {
  isScreenCaptureSupported,
  isScreenStreamActive,
  initScreenStream,
  captureCurrentScreenFrame,
  stopScreenStream,
} from '../utils/screenStream';

export interface ExtractedStop extends ParsedAddress {
  stopNumber?: number;
  locationIndex?: number;
  locationLabel?: string;
}

interface PhotoScannerProps {
  onAddressExtracted: (parsed: ParsedAddress) => void;
  onImportMultipleOrders?: (orders: CustomerOrder[]) => void;
  onClose?: () => void;
}

export const PhotoScannerModal: React.FC<PhotoScannerProps> = ({
  onAddressExtracted,
  onImportMultipleOrders,
  onClose,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [extractedStops, setExtractedStops] = useState<ExtractedStop[]>([]);
  const [activeStopIndex, setActiveStopIndex] = useState<number>(0);
  const [pickupInfo, setPickupInfo] = useState<{ name?: string; address?: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [screenLive, setScreenLive] = useState<boolean>(() => isScreenStreamActive());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleConnectScreen = async () => {
    const success = await initScreenStream();
    if (success) {
      setScreenLive(true);
      triggerHaptic(40);
      const frame = captureCurrentScreenFrame();
      if (frame) {
        setSelectedImage(frame);
        scanWithGemini(frame, 'image/jpeg');
      }
    }
  };

  const handleSnapLiveScreen = () => {
    const frame = captureCurrentScreenFrame();
    if (frame) {
      setSelectedImage(frame);
      scanWithGemini(frame, 'image/jpeg');
    } else {
      handleConnectScreen();
    }
  };

  const handleStopScreen = () => {
    stopScreenStream();
    setScreenLive(false);
  };

  // Handle image file selection
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, WebP)');
      return;
    }

    setErrorMsg(null);
    setExtractedStops([]);
    setPickupInfo(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setSelectedImage(dataUrl);
      scanWithGemini(dataUrl, file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  // Perform AI OCR scan via backend /api/scan-photo
  const scanWithGemini = async (base64Image: string, mimeType: string) => {
    setIsScanning(true);
    setErrorMsg(null);
    triggerHaptic(40);
    sound.playScan();

    try {
      const res = await fetch('/api/scan-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Image,
          mimeType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Server returned ${res.status}`);
      }

      if (data.stops && Array.isArray(data.stops) && data.stops.length > 0) {
        let rawStops = [...data.stops];

        // If top store address is present (e.g. Tesco Express) and not in stops, prepend it as Location 1!
        if (data.pickup && (data.pickup.name || data.pickup.address)) {
          const storeName = data.pickup.name || 'Store';
          const storeAddr = data.pickup.address || storeName;
          const hasStore = rawStops.some((s: any) =>
            s.address?.toLowerCase().includes(storeName.toLowerCase()) ||
            s.customerName?.toLowerCase().includes(storeName.toLowerCase())
          );

          if (!hasStore) {
            const fullStoreAddress = storeAddr.toLowerCase().includes(storeName.toLowerCase())
              ? storeAddr
              : `${storeName}, ${storeAddr}`;

            rawStops.unshift({
              address: fullStoreAddress,
              street: storeAddr,
              customerName: storeName,
              confidence: 0.99,
            });
          }
        }

        const stops: ExtractedStop[] = rawStops.map((s: any, idx: number) => ({
          raw: s.address,
          formattedAddress: s.address,
          street: s.street || s.address,
          unit: s.unit || undefined,
          city: s.city || undefined,
          state: s.state || undefined,
          zipCode: s.postcode || s.zipCode || undefined,
          customerName: s.customerName || `Location ${idx + 1}`,
          phone: s.phone || undefined,
          gateCode: s.gateCode || undefined,
          notes: s.notes || undefined,
          confidence: s.confidence || 0.98,
          stopNumber: idx + 1,
          locationIndex: idx + 1,
          locationLabel: `Location ${idx + 1}`,
          source: 'ocr_label',
        }));

        setExtractedStops(stops);
        setActiveStopIndex(0);
        if (data.pickup) setPickupInfo(data.pickup);
        sound.playLockSuccess();
        triggerHaptic(60);
      } else if (data.address) {
        const singleStop: ExtractedStop = {
          raw: data.address,
          formattedAddress: data.address,
          street: data.street || data.address,
          unit: data.unit || undefined,
          city: data.city || undefined,
          state: data.state || undefined,
          zipCode: data.zipCode || undefined,
          customerName: data.customerName || 'Location 1',
          phone: data.phone || undefined,
          gateCode: data.gateCode || undefined,
          notes: data.notes || undefined,
          confidence: data.confidence || 0.98,
          stopNumber: 1,
          locationIndex: 1,
          locationLabel: 'Location 1',
          source: 'ocr_label',
        };
        setExtractedStops([singleStop]);
        setActiveStopIndex(0);
        sound.playLockSuccess();
        triggerHaptic(60);
      } else {
        throw new Error('No addresses could be detected on the image. Please make sure the text is clear.');
      }
    } catch (err: any) {
      console.error('API OCR scan failed:', err);
      setErrorMsg(err?.message || 'Failed to read address from screen. Please try uploading again.');
      sound.playAlert();
    } finally {
      setIsScanning(false);
    }
  };

  const currentStop = extractedStops[activeStopIndex] || extractedStops[0] || null;

  const handleConfirmAndNavigate = (stopToNav?: ExtractedStop) => {
    const target = stopToNav || currentStop;
    if (target) {
      onAddressExtracted(target);
      if (onClose) onClose();
    }
  };

  const handleImportAllStops = () => {
    if (extractedStops.length === 0) return;
    triggerHaptic(50);
    sound.playLockSuccess();

    const ordersToImport: CustomerOrder[] = extractedStops.map((stop, idx) => {
      const isPickup = idx === 0 && extractedStops.length > 1;
      const orderPrefix = isPickup
        ? '#PICKUP'
        : extractedStops.length > 2
        ? `#DROP-${idx}`
        : '#DROP';

      return {
        id: `screen-stop-${Date.now()}-${idx}`,
        orderNumber: orderPrefix,
        customerName: stop.customerName || (isPickup ? 'Pickup' : `Drop-off ${idx}`),
        address: stop.street || stop.formattedAddress,
        unit: stop.unit,
        city: stop.city || '',
        state: stop.state || '',
        zipCode: stop.zipCode,
        phone: stop.phone,
        gateCode: stop.gateCode,
        deliveryNotes: stop.notes,
        rawText: `${stop.customerName || (isPickup ? 'Pickup' : `Drop-off ${idx}`)} - ${stop.formattedAddress}`,
        itemCount: 1,
        totalAmount: '',
        status: 'pending',
        timestamp: 'Just now',
      };
    });

    if (onImportMultipleOrders) {
      onImportMultipleOrders(ordersToImport);
    } else {
      onAddressExtracted(extractedStops[0]);
    }
    if (onClose) onClose();
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-800/80 to-slate-800/40 border border-emerald-500/40 rounded-2xl p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Screen & Photo Address Reader
              </h2>
            </div>
            <p className="text-xs text-slate-300">
              Upload a screenshot of your screen or snap a photo. AutoNav will read all destinations in order (Location 1, Location 2, Location 3, Location 4) and route them to Google Maps.
            </p>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 0-UPLOAD OPTION: Direct Live Screen Snapper */}
      {isScreenCaptureSupported() && (
        <div className="bg-gradient-to-r from-purple-950/50 via-slate-900 to-indigo-950/50 border border-purple-500/40 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  Auto Screen Capture (Zero Manual Uploads)
                  {screenLive && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono font-bold">
                      LIVE
                    </span>
                  )}
                </span>
                <p className="text-[11px] text-slate-300">
                  {screenLive
                    ? 'Screen stream connected! Tap below to snap and analyze instantly with 0 uploads.'
                    : 'Connect screen capture once. Then every button tap snaps and analyzes your screen automatically.'}
                </p>
              </div>
            </div>

            {screenLive && (
              <button
                onClick={handleStopScreen}
                className="text-[11px] text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
              >
                Disconnect
              </button>
            )}
          </div>

          <button
            onClick={screenLive ? handleSnapLiveScreen : handleConnectScreen}
            className="w-full py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>{screenLive ? '📸 Snap Current Screen Now (0 Uploads)' : '⚡ Connect Auto Screen Capture (No Uploading Needed)'}</span>
          </button>
        </div>
      )}

      {/* Manual Upload or Snap Fallbacks */}
      <div className="space-y-1">
        <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">
          Optional Fallbacks:
        </span>
      </div>

      {/* Primary Action Buttons: Upload or Snap */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Upload Existing Screenshot / Photo */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white flex items-center justify-center gap-3.5 shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all cursor-pointer border border-emerald-400/30"
        >
          <Upload className="w-6 h-6 text-white" />
          <div className="text-left">
            <div className="text-base font-bold">Upload Your Screenshot</div>
            <div className="text-xs text-emerald-100">Select image from your phone or device</div>
          </div>
        </button>

        {/* Camera Capture Button */}
        <button
          onClick={() => cameraInputRef.current?.click()}
          className="p-5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center justify-center gap-3.5 shadow-md active:scale-[0.98] transition-all cursor-pointer"
        >
          <Camera className="w-6 h-6 text-emerald-400" />
          <div className="text-left">
            <div className="text-base font-bold text-white">Take Photo with Camera</div>
            <div className="text-xs text-slate-400">Point phone camera at screen or label</div>
          </div>
        </button>

        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Active Scan / Upload Preview Area */}
      {selectedImage ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Your Uploaded Image:</span>
            <button
              onClick={() => {
                setSelectedImage(null);
                setExtractedStops([]);
                setErrorMsg(null);
              }}
              className="text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          </div>

          <div className="relative max-h-80 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center">
            <img
              src={selectedImage}
              alt="Uploaded screenshot"
              className="max-h-80 w-auto object-contain mx-auto"
            />

            {/* Scanning Laser HUD animation */}
            {isScanning && (
              <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-2xs flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin mb-2" />
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-widest animate-pulse">
                  Reading Locations from Your Screen...
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-8 border-2 border-dashed border-slate-800 rounded-2xl text-center space-y-2">
          <Upload className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-sm font-medium text-slate-400">
            No image loaded yet.
          </p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Tap <strong className="text-slate-300">"Upload Your Screenshot"</strong> above to read all locations from your screen.
          </p>
        </div>
      )}

      {/* Extracted Locations List from User's Screen */}
      {extractedStops.length > 0 && (
        <div className="bg-slate-800/95 border-2 border-emerald-500/80 rounded-2xl p-5 shadow-xl shadow-emerald-500/10 space-y-4 animate-in fade-in zoom-in-95">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold block">
                  Found {extractedStops.length} Location{extractedStops.length > 1 ? 's' : ''} on Screen
                </span>
                <h3 className="text-base font-bold text-white">
                  Ready to Navigate
                </h3>
              </div>
            </div>

            {extractedStops.length > 1 && (
              <button
                onClick={handleImportAllStops}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <ListPlus className="w-4 h-4" />
                <span>Import All {extractedStops.length} Locations</span>
              </button>
            )}
          </div>

          {/* Pickup banner if top store (e.g. Tesco Express) is recognized */}
          {pickupInfo?.name && (
            <div className="bg-emerald-950/40 p-4 rounded-2xl border border-emerald-500/40 space-y-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Store className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      🟢 Pickup
                    </span>
                    <span className="text-white font-bold text-sm truncate">{pickupInfo.name}</span>
                  </div>
                  {pickupInfo.address && (
                    <p className="text-slate-200 font-mono text-xs mt-1 break-words">
                      {pickupInfo.address}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  const storeName = pickupInfo.name || 'Store';
                  const storeAddr = pickupInfo.address || storeName;
                  const storeStop: ExtractedStop = extractedStops.find(
                    (s) =>
                      (s.customerName && s.customerName.toLowerCase().includes(storeName.toLowerCase())) ||
                      s.stopNumber === 1
                  ) || {
                    raw: `${storeName}, ${storeAddr}`,
                    formattedAddress: `${storeName}, ${storeAddr}`,
                    street: storeAddr,
                    customerName: storeName,
                    confidence: 0.99,
                    stopNumber: 1,
                    locationIndex: 1,
                    locationLabel: 'Pickup',
                    source: 'ocr_label' as const,
                  };
                  handleConfirmAndNavigate(storeStop);
                }}
                className="w-full py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
              >
                <Navigation className="w-4 h-4 -rotate-45" />
                <span>Navigate to Pickup ({pickupInfo.name || 'Store'})</span>
              </button>
            </div>
          )}

          {/* Cards List: Address gets full width, button at bottom */}
          <div className="space-y-3">
            {extractedStops.map((stop, idx) => {
              const isSelected = activeStopIndex === idx;
              const isPickup = idx === 0 && extractedStops.length > 1;
              const label = isPickup
                ? '🟢 Pickup'
                : extractedStops.length > 2
                ? `🏁 Drop-off ${idx}`
                : extractedStops.length === 2 && idx === 1
                ? '🏁 Drop-off'
                : `Location ${idx + 1}`;

              const navButtonText = isPickup
                ? 'Navigate to Pickup'
                : extractedStops.length > 2
                ? `Navigate to Drop-off ${idx}`
                : extractedStops.length === 2 && idx === 1
                ? 'Navigate to Drop-off'
                : `Navigate to Location ${idx + 1}`;

              return (
                <div
                  key={idx}
                  onClick={() => setActiveStopIndex(idx)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-emerald-500 shadow-md ring-1 ring-emerald-500/40'
                      : 'bg-slate-900/60 border-slate-700/70 hover:border-slate-600'
                  }`}
                >
                  {/* Full width Address & Details */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border ${
                            isPickup
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                          }`}
                        >
                          {label}
                        </span>

                        <span className="font-bold text-white text-sm">
                          {stop.customerName}
                        </span>
                      </div>

                      {stop.zipCode && (
                        <span className="font-mono text-xs font-bold text-emerald-300 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                          {stop.zipCode}
                        </span>
                      )}
                    </div>

                    {/* Address Box: 100% width with clear readable text */}
                    <div className="flex items-start gap-2.5 text-sm text-slate-100 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                      <MapPin
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          isPickup ? 'text-emerald-400' : 'text-cyan-400'
                        }`}
                      />
                      <span className="font-medium text-white leading-relaxed break-words">
                        {stop.formattedAddress}
                      </span>
                    </div>

                    {stop.notes && (
                      <p className="text-xs text-slate-400 italic pl-1">
                        {stop.notes}
                      </p>
                    )}
                  </div>

                  {/* Navigation button at the bottom of the card */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfirmAndNavigate(stop);
                    }}
                    className={`w-full py-2.5 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer ${
                      isPickup
                        ? 'bg-emerald-400 hover:bg-emerald-300'
                        : 'bg-cyan-400 hover:bg-cyan-300'
                    }`}
                  >
                    <Navigation className="w-4 h-4 -rotate-45" />
                    <span>{navButtonText}</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Primary Action Button */}
          {currentStop && (
            <button
              onClick={() => handleConfirmAndNavigate(currentStop)}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2.5 text-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              <Navigation className="w-5 h-5 -rotate-45" />
              <span>
                Launch Google Maps for{' '}
                {activeStopIndex === 0 && extractedStops.length > 1
                  ? 'Pickup'
                  : extractedStops.length > 2
                  ? `Drop-off ${activeStopIndex}`
                  : extractedStops.length === 2 && activeStopIndex === 1
                  ? 'Drop-off'
                  : `Location ${activeStopIndex + 1}`}{' '}
                ({currentStop.customerName})
              </span>
            </button>
          )}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-amber-500/40 text-xs space-y-3.5 shadow-xl animate-in fade-in slide-in-from-top-1">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-white text-sm block">Image OCR Needs Clearer Text</span>
              <p className="text-slate-300 text-xs leading-relaxed">{errorMsg}</p>
            </div>
          </div>

          {/* Quick Manual Entry Recovery Box */}
          <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2.5">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
              Quick Option: Type or Paste Address Directly
            </span>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="e.g. 19 Summerfield Road, Dudley DY2 8JY"
                id="manual-ocr-fallback-input"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) {
                      const manualStop: ExtractedStop = {
                        raw: val,
                        formattedAddress: val,
                        street: val,
                        customerName: 'Customer',
                        confidence: 1.0,
                        source: 'manual_paste',
                      };
                      onAddressExtracted(manualStop);
                      if (onClose) onClose();
                    }
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const inputEl = document.getElementById('manual-ocr-fallback-input') as HTMLInputElement;
                  const val = inputEl?.value.trim();
                  if (val) {
                    const manualStop: ExtractedStop = {
                      raw: val,
                      formattedAddress: val,
                      street: val,
                      customerName: 'Customer',
                      confidence: 1.0,
                      source: 'manual_paste',
                    };
                    onAddressExtracted(manualStop);
                    if (onClose) onClose();
                  }
                }}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5 -rotate-45" />
                <span>Navigate</span>
              </button>
            </div>
          </div>

          {/* Quick Test Samples */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              Or Test With Sample Multi-Stop Route:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const sampleStops: ExtractedStop[] = [
                    {
                      raw: 'Tesco Express, Highland Road, DY1 3BT Dudley',
                      formattedAddress: 'Tesco Express, Highland Road, DY1 3BT Dudley',
                      street: 'Highland Road',
                      city: 'Dudley',
                      zipCode: 'DY1 3BT',
                      customerName: 'Tesco Express',
                      confidence: 0.99,
                      stopNumber: 1,
                      locationIndex: 1,
                      locationLabel: 'Location 1',
                      source: 'ocr_label',
                    },
                    {
                      raw: '19 Summerfield Road, DY2 8JY Dudley',
                      formattedAddress: '19 Summerfield Road, DY2 8JY Dudley',
                      street: '19 Summerfield Road',
                      city: 'Dudley',
                      zipCode: 'DY2 8JY',
                      customerName: 'Keith Banner',
                      confidence: 0.98,
                      stopNumber: 2,
                      locationIndex: 2,
                      locationLabel: 'Location 2',
                      source: 'ocr_label',
                    },
                    {
                      raw: '73 Davis Avenue, DY4 8JY Tipton',
                      formattedAddress: '73 Davis Avenue, DY4 8JY Tipton',
                      street: '73 Davis Avenue',
                      city: 'Tipton',
                      zipCode: 'DY4 8JY',
                      customerName: 'Carole Grainger',
                      confidence: 0.97,
                      stopNumber: 3,
                      locationIndex: 3,
                      locationLabel: 'Location 3',
                      source: 'ocr_label',
                    },
                  ];
                  setExtractedStops(sampleStops);
                  setActiveStopIndex(0);
                  setErrorMsg(null);
                  triggerHaptic(40);
                  sound.playLockSuccess();
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
              >
                Load Dudley 3-Stop Sample Route
              </button>

              <button
                type="button"
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold border border-emerald-500/40 transition-colors cursor-pointer"
              >
                Upload Different Image
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
