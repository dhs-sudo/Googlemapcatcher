import React, { useState, useMemo } from 'react';
import {
  Layers,
  Sparkles,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  MapPin,
  Store,
  ArrowRight,
  DollarSign,
  Clock,
  Car,
  X,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { CustomerOrder } from '../types';
import {
  analyzeTripStack,
  ActiveTripInfo,
  IncomingOfferInfo,
  TripStackAnalysis,
} from '../utils/tripStackAnalyzer';
import { openInPhoneMaps } from '../utils/navigation';
import { triggerHaptic, sound } from '../utils/audio';

interface TripStackAnalyzerModalProps {
  currentOrder: CustomerOrder | null;
  onAcceptStackedTrip: (newOrders: CustomerOrder[], launchMaps?: boolean) => void;
  onClose: () => void;
}

export const TripStackAnalyzerModal: React.FC<TripStackAnalyzerModalProps> = ({
  currentOrder,
  onAcceptStackedTrip,
  onClose,
}) => {
  // Preset demo scenarios drivers encounter everyday
  const presetOffers: { name: string; info: IncomingOfferInfo }[] = [
    {
      name: '🟢 High Profit Stack (Directly on the way)',
      info: {
        offerSource: 'Uber Eats',
        pickupAddress: 'McDonalds, 42 High Street, DY1 1QP Dudley',
        dropoffAddress: '34 Richmond Road, DY1 3BT Dudley',
        payoutAmount: '£7.20',
      },
    },
    {
      name: '🟡 Minor Detour (+1.8 mi, high payout)',
      info: {
        offerSource: 'Deliveroo',
        pickupAddress: 'KFC, Birmingham New Road, DY1 4TA Dudley',
        dropoffAddress: '15 Vicarage Prospect, DY2 7JL Dudley',
        payoutAmount: '£9.50',
      },
    },
    {
      name: '🔴 Bad Fit (Opposite direction, 5+ miles away)',
      info: {
        offerSource: 'DoorDash',
        pickupAddress: 'Subway, Stourbridge Road, B63 3HA Halesowen',
        dropoffAddress: '9 Hagley Road, B62 8LL Halesowen',
        payoutAmount: '£5.00',
      },
    },
  ];

  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [offerSource, setOfferSource] = useState('Uber Eats');
  const [pickupAddress, setPickupAddress] = useState(presetOffers[0].info.pickupAddress);
  const [dropoffAddress, setDropoffAddress] = useState(presetOffers[0].info.dropoffAddress);
  const [payoutAmount, setPayoutAmount] = useState(presetOffers[0].info.payoutAmount || '£7.20');

  // Load preset
  const handleSelectPreset = (idx: number) => {
    setSelectedPresetIndex(idx);
    const p = presetOffers[idx].info;
    setOfferSource(p.offerSource || 'Uber Eats');
    setPickupAddress(p.pickupAddress);
    setDropoffAddress(p.dropoffAddress);
    setPayoutAmount(p.payoutAmount || '');
    triggerHaptic(30);
  };

  // Build active trip representation
  const activeTrip: ActiveTripInfo = useMemo(() => {
    return {
      customerName: currentOrder?.customerName || 'Primary Customer Trip',
      destinationAddress: currentOrder?.address || '19 Summerfield Road, DY2 8JY Dudley',
      coords: currentOrder?.coordinates || { lat: 37.7891, lng: -122.4082 },
      originCoords: { lat: 37.7879, lng: -122.4075 },
    };
  }, [currentOrder]);

  const incomingOffer: IncomingOfferInfo = useMemo(() => {
    return {
      offerSource,
      pickupAddress,
      dropoffAddress,
      payoutAmount,
    };
  }, [offerSource, pickupAddress, dropoffAddress, payoutAmount]);

  // Compute live stack fit analysis
  const analysis: TripStackAnalysis = useMemo(() => {
    return analyzeTripStack(activeTrip, incomingOffer);
  }, [activeTrip, incomingOffer]);

  // Accept offer and update navigation
  const handleAcceptAndReroute = () => {
    triggerHaptic(60);
    sound.playLockSuccess();

    // Create 2 new customer orders for the stacked trip
    const pickupOrder: CustomerOrder = {
      id: `stacked-pickup-${Date.now()}`,
      orderNumber: `#STACK-PICKUP`,
      customerName: `Collect: ${pickupAddress.split(',')[0]} (${offerSource})`,
      address: pickupAddress,
      city: 'Dudley',
      state: 'UK',
      rawText: `${pickupAddress} (${offerSource})`,
      itemCount: 1,
      totalAmount: payoutAmount,
      status: 'pending',
      timestamp: 'Just now',
    };

    const dropoffOrder: CustomerOrder = {
      id: `stacked-dropoff-${Date.now()}`,
      orderNumber: `#STACK-DROP`,
      customerName: `Deliver: ${dropoffAddress.split(',')[0]} (${offerSource})`,
      address: dropoffAddress,
      city: 'Dudley',
      state: 'UK',
      rawText: `${dropoffAddress} (${offerSource})`,
      itemCount: 1,
      totalAmount: payoutAmount,
      status: 'pending',
      timestamp: 'Just now',
    };

    // Construct multi-stop Google Maps URL
    const nextStopAddress = analysis.optimalSequence[1]?.address || pickupAddress;
    openInPhoneMaps(nextStopAddress, 'driving', true);

    onAcceptStackedTrip([pickupOrder, dropoffOrder], true);
    onClose();
  };

  // Badge styling based on fit score
  const badgeConfig = {
    excellent: {
      color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      icon: CheckCircle2,
      border: 'border-emerald-500/60',
      glow: 'shadow-emerald-500/10',
    },
    good: {
      color: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      icon: TrendingUp,
      border: 'border-teal-500/60',
      glow: 'shadow-teal-500/10',
    },
    moderate: {
      color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      icon: AlertTriangle,
      border: 'border-amber-500/60',
      glow: 'shadow-amber-500/10',
    },
    poor: {
      color: 'bg-red-500/20 text-red-400 border-red-500/40',
      icon: XCircle,
      border: 'border-red-500/60',
      glow: 'shadow-red-500/10',
    },
  }[analysis.fitLevel];

  const BadgeIcon = badgeConfig.icon;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl relative my-auto animate-in zoom-in-95 duration-150 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                Multi-App On-The-Way Analyzer
              </h2>
            </div>
            <p className="text-xs text-slate-300">
              Evaluates if an incoming trip offer from another app is along your route or an expensive detour.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Preset Selector */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Test Real-World Scenarios:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {presetOffers.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectPreset(idx)}
                className={`p-2.5 rounded-xl text-xs font-semibold text-left transition-all border cursor-pointer ${
                  selectedPresetIndex === idx
                    ? 'bg-slate-800 text-white border-emerald-500/80 shadow-md ring-1 ring-emerald-500/40'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Currently Active Trip */}
        <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              🚗 Your Active En-Route Trip
            </span>
            <span className="font-mono text-emerald-400 font-bold">Currently Navigating</span>
          </div>
          <div className="flex items-start gap-2 text-xs text-slate-200">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white">{activeTrip.customerName}: </span>
              <span className="text-slate-300">{activeTrip.destinationAddress}</span>
            </div>
          </div>
        </div>

        {/* Live Recommendation Score Box */}
        <div
          className={`p-4 rounded-2xl border ${badgeConfig.border} bg-slate-950/90 shadow-xl ${badgeConfig.glow} space-y-3`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-sm border ${badgeConfig.color}`}
              >
                {analysis.fitScore}%
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                  Route Stack Score
                </span>
                <span className="text-sm font-extrabold text-white">
                  {analysis.recommendation}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono self-start sm:self-auto">
              <span className="text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                Detour: +{analysis.detourMiles} mi
              </span>
              <span className="text-sky-400 bg-sky-500/10 px-2 py-1 rounded-lg border border-sky-500/20">
                Drive Time: +{analysis.estimatedExtraMinutes} mins
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {analysis.explanation}
          </p>
        </div>

        {/* Optimal Turn-by-Turn Stop Sequence */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              ⚡ Optimal 4-Point Multi-App Route
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Total Stacked: ~{analysis.stackedMiles} mi
            </span>
          </div>

          <div className="space-y-1.5">
            {analysis.optimalSequence.map((step, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                  step.isNew
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      step.isNew
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {step.step}
                  </span>
                  <div className="min-w-0">
                    <span className="font-bold text-white block truncate">{step.title}</span>
                    <span className="text-[11px] text-slate-400 truncate block">
                      {step.address}
                    </span>
                  </div>
                </div>

                {step.isNew && (
                  <span className="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30 shrink-0">
                    New Offer
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Read-Only Safety Assurance */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong className="text-white">100% Read-Only Safety:</strong> AutoNav only reads address text and plots navigation. It never accepts, declines, or simulates taps on your courier apps.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
          <button
            onClick={handleAcceptAndReroute}
            className="w-full sm:flex-1 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            <Navigation className="w-4 h-4 -rotate-45" />
            <span>Plot Stops in Google Maps</span>
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-2xl text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
