import React, { useState } from 'react';
import { CustomerOrder, NavigationHistoryItem } from '../types';
import { DeliveryAnalyticsChart } from './DeliveryAnalyticsChart';
import {
  MapPin,
  Phone,
  Copy,
  Check,
  Navigation,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Key,
  ExternalLink,
  ArrowUpDown,
  Route,
  Compass,
  Camera,
  Upload,
  BarChart2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { triggerHaptic, sound } from '../utils/audio';
import {
  optimizeRouteByProximity,
  LatLng,
  getCoordinatesForAddress,
  DEFAULT_ORIGIN,
} from '../utils/routeOptimizer';

interface OrderSimulatorProps {
  orders: CustomerOrder[];
  history?: NavigationHistoryItem[];
  activeOrderId: string | null;
  onSelectActiveOrder: (order: CustomerOrder) => void;
  onNavigateDirect: (order: CustomerOrder) => void;
  onUpdateStatus: (orderId: string, status: CustomerOrder['status']) => void;
  onReorderOrders: (newOrders: CustomerOrder[]) => void;
  lastDestinationAddress?: string;
  onOpenPhotoScanner?: () => void;
}

export const OrderSimulator: React.FC<OrderSimulatorProps> = ({
  orders,
  history = [],
  activeOrderId,
  onSelectActiveOrder,
  onNavigateDirect,
  onUpdateStatus,
  onReorderOrders,
  lastDestinationAddress,
  onOpenPhotoScanner,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'delivered'>('all');
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationSummary, setOptimizationSummary] = useState<{
    totalMiles: number;
    originName: string;
    stopCount: number;
  } | null>(null);

  const handleCopyClipboard = async (order: CustomerOrder) => {
    try {
      await navigator.clipboard.writeText(order.rawText);
      setCopiedId(order.id);
      triggerHaptic(30);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (err) {
      console.warn('Clipboard write error', err);
    }
  };

  // Route Optimization Algorithm: Sort by Proximity
  const handleSortByProximity = () => {
    setIsOptimizing(true);
    triggerHaptic(45);
    sound.playScan();

    const runOptimization = (originPos: LatLng, originName: string) => {
      const result = optimizeRouteByProximity(orders, originPos, originName);
      onReorderOrders(result.optimizedOrders);

      // Auto-target the nearest stop (#1) for the floating button
      const firstPending = result.optimizedOrders.find((o) => o.status !== 'delivered');
      if (firstPending) {
        onSelectActiveOrder(firstPending);
      }

      setOptimizationSummary({
        totalMiles: result.totalDistanceMiles,
        originName,
        stopCount: result.optimizedOrders.filter((o) => o.status !== 'delivered').length,
      });

      setIsOptimizing(false);
      sound.playLockSuccess();
      triggerHaptic(60);
    };

    // Try live GPS first
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          runOptimization(
            { lat: pos.coords.latitude, lng: pos.coords.longitude },
            'Current Driver GPS'
          );
        },
        () => {
          // Fallback to last destination or default hub
          if (lastDestinationAddress) {
            const lastCoords = getCoordinatesForAddress(lastDestinationAddress);
            runOptimization(lastCoords, 'Last Destination Stop');
          } else {
            runOptimization(DEFAULT_ORIGIN, 'Current Dispatch Hub');
          }
        },
        { timeout: 4000 }
      );
    } else {
      if (lastDestinationAddress) {
        const lastCoords = getCoordinatesForAddress(lastDestinationAddress);
        runOptimization(lastCoords, 'Last Destination Stop');
      } else {
        runOptimization(DEFAULT_ORIGIN, 'Current Dispatch Hub');
      }
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (filter === 'pending') return o.status !== 'delivered';
    if (filter === 'delivered') return o.status === 'delivered';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Banner / Test instructions */}
      <div className="bg-gradient-to-r from-slate-800/90 to-slate-800/40 border border-slate-700/80 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Live Delivery Feed & Auto-Capture Station
              </h2>
            </div>
            <p className="text-xs text-slate-300">
              Press the <span className="text-emerald-400 font-semibold">Floating GO Button</span> at any time to instantly auto-capture customer destination and open Google Maps turn-by-turn directions.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-700/60 shrink-0">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Reads clipboard or active ticket</span>
          </div>
        </div>
      </div>

      {/* Optimization Summary Alert (if sorted by proximity) */}
      {optimizationSummary && (
        <div className="p-3.5 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/50 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-1 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Route className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white block">
                Optimized by Geographic Proximity ({optimizationSummary.stopCount} stops)
              </span>
              <span className="text-[11px] text-slate-400">
                Starting from <strong className="text-slate-200">{optimizationSummary.originName}</strong> · Total route ~{optimizationSummary.totalMiles} mi
              </span>
            </div>
          </div>

          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/30 shrink-0">
            Fastest Sequence
          </span>
        </div>
      )}

      {/* 7-Day Deliveries Summary Chart with Recharts */}
      {showAnalytics && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          <DeliveryAnalyticsChart orders={orders} history={history} />
        </div>
      )}

      {/* Filter Segmented Controls & Sort by Proximity Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1 p-1 bg-slate-800/80 border border-slate-700 rounded-xl overflow-x-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              filter === 'all'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Orders ({orders.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              filter === 'pending'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Pending ({orders.filter((o) => o.status !== 'delivered').length})
          </button>
          <button
            onClick={() => setFilter('delivered')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              filter === 'delivered'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Completed ({orders.filter((o) => o.status === 'delivered').length})
          </button>

          <button
            onClick={() => setShowAnalytics((prev) => !prev)}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 cursor-pointer ${
              showAnalytics ? 'text-emerald-400 bg-slate-900/80' : 'text-slate-400 hover:text-white'
            }`}
            title="Toggle 7-Day Chart Summary"
          >
            <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Analytics</span>
            {showAnalytics ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Sort by Proximity Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSortByProximity}
            disabled={isOptimizing}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            title="Sort orders by geographic distance from your current location or last stop"
          >
            <ArrowUpDown className={`w-3.5 h-3.5 ${isOptimizing ? 'animate-spin' : ''}`} />
            <span>{isOptimizing ? 'Calculating Proximity...' : 'Sort by Proximity'}</span>
          </button>
        </div>
      </div>

      {/* Orders List or Clean Empty State */}
      {filteredOrders.length === 0 ? (
        <div className="p-8 sm:p-12 border-2 border-dashed border-slate-800 rounded-3xl text-center space-y-4 bg-slate-900/40">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-sm">
            <Camera className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-white tracking-tight">
              Ready to Read Your Screen
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              No test data. Upload a screenshot from your delivery app (e.g. Tesco, Uber Eats, DoorDash, Deliveroo, Amazon Flex) or take a photo to immediately extract your real drop-off destinations.
            </p>
          </div>
          {onOpenPhotoScanner && (
            <button
              onClick={onOpenPhotoScanner}
              className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs inline-flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Delivery Screenshot Now</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredOrders.map((order) => {
            const isActive = order.id === activeOrderId;
            const isCopied = copiedId === order.id;
            const isDelivered = order.status === 'delivered';

            return (
              <div
                key={order.id}
                className={`relative rounded-2xl p-4 transition-all border ${
                  isActive
                    ? 'bg-slate-800/95 border-emerald-500/80 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/50'
                    : 'bg-slate-800/60 border-slate-700/70 hover:border-slate-600'
                } ${isDelivered ? 'opacity-70' : ''}`}
              >
                {/* Active Indicator Top Edge */}
                {isActive && (
                  <div className="absolute top-0 right-6 -translate-y-1/2 px-2.5 py-0.5 bg-emerald-500 text-slate-950 text-[10px] font-extrabold uppercase rounded-full shadow-sm tracking-wider">
                    Targeted by Floating Button
                  </div>
                )}

                {/* Stop Number Badge if route is optimized */}
                {order.stopIndex && !isDelivered && (
                  <div className="absolute top-3 right-12 flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold bg-slate-900/90 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/30">
                      Location {order.stopIndex}
                      {order.proximityDistanceMiles !== undefined && (
                        <span className="text-slate-400 font-normal ml-1">
                          · {order.proximityDistanceMiles} mi
                        </span>
                      )}
                    </span>
                  </div>
                )}

                {/* Order Header */}
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="font-mono font-semibold text-slate-300">
                        {order.orderNumber}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{order.timestamp}</span>
                      {order.totalAmount && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums font-mono">{order.totalAmount}</span>
                        </>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      {order.customerName}
                    </h3>
                  </div>

                  {/* Status Toggle */}
                  <button
                    onClick={() =>
                      onUpdateStatus(
                        order.id,
                        order.status === 'delivered' ? 'pending' : 'delivered'
                      )
                    }
                    className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
                      isDelivered
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-700/40 text-slate-400 border-slate-600 hover:text-white'
                    }`}
                    title="Toggle delivery status"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Address Row */}
                <div className="flex items-start gap-2.5 text-xs text-slate-200 mb-3 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="font-medium text-white">
                      {order.address}
                      {order.unit && (
                        <span className="text-emerald-400 ml-1.5 font-semibold">
                          ({order.unit})
                        </span>
                      )}
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      {order.city} {order.state} {order.zipCode}
                    </div>
                  </div>
                </div>

                {/* Delivery Notes & Details */}
                <div className="space-y-1.5 mb-3 text-xs text-slate-400">
                  {order.gateCode && (
                    <div className="flex items-center gap-1.5 text-amber-300 font-mono text-[11px]">
                      <Key className="w-3.5 h-3.5" />
                      <span>Gate/Access: {order.gateCode}</span>
                    </div>
                  )}

                  {order.deliveryNotes && (
                    <p className="text-[11px] text-slate-300 line-clamp-2 italic">
                      "{order.deliveryNotes}"
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-2 border-t border-slate-700/50 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Copy to Clipboard */}
                    <button
                      onClick={() => handleCopyClipboard(order)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
                      title="Copy full text to clipboard"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Copy Raw</span>
                        </>
                      )}
                    </button>

                    {/* Customer phone link */}
                    {order.phone && (
                      <a
                        href={`tel:${order.phone.replace(/[^0-9+]/g, '')}`}
                        className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 text-xs flex items-center transition-colors"
                        title={`Call ${order.customerName}`}
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Set as Active Order for Floating Button */}
                    {!isActive && (
                      <button
                        onClick={() => onSelectActiveOrder(order)}
                        className="px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-medium transition-colors cursor-pointer"
                      >
                        Target this
                      </button>
                    )}

                    {/* Direct Route */}
                    <button
                      onClick={() => onNavigateDirect(order)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                    >
                      <Navigation className="w-3.5 h-3.5 -rotate-45" />
                      <span>Navigate</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
