/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CustomerOrder, ParsedAddress, NavigationHistoryItem, AppSettings } from './types';
import { INITIAL_ORDERS } from './data/mockOrders';
import { parseCustomerAddress } from './utils/addressParser';
import { sound, speakAddress, triggerHaptic } from './utils/audio';
import { openInPhoneMaps } from './utils/navigation';
import { TopBar } from './components/TopBar';
import { FloatingButton } from './components/FloatingButton';
import { NavigationSheet } from './components/NavigationSheet';
import { OrderSimulator } from './components/OrderSimulator';
import { SmartCaptureView } from './components/ManualCaptureModal';
import { RouteHistory } from './components/RouteHistory';
import { SettingsModal } from './components/SettingsModal';
import { NewOrderModal } from './components/NewOrderModal';
import { PhotoScannerModal } from './components/PhotoScannerModal';
import { TripStackAnalyzerModal } from './components/TripStackAnalyzerModal';
import { ActiveDrivingOverlay } from './components/ActiveDrivingOverlay';
import { Compass, CheckCircle2, Navigation, Smartphone, Zap, MapPin, Info, Camera, Layers } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function App() {
  // Orders State (Completely clean slate, only stores what the user scans or enters)
  const [orders, setOrders] = useState<CustomerOrder[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('autonav_orders');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Purge legacy mock items so the user's view is 100% their own real data
          if (Array.isArray(parsed)) {
            const userOnlyOrders = parsed.filter(
              (o: CustomerOrder) => !o.id?.startsWith('ord-10')
            );
            return userOnlyOrders;
          }
        } catch {
          // ignore
        }
      }
    }
    return [];
  });

  // Active target order ID
  const [activeOrderId, setActiveOrderId] = useState<string | null>(() => {
    return orders.length > 0 ? orders[0].id : null;
  });

  // Navigation History
  const [history, setHistory] = useState<NavigationHistoryItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('autonav_history');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    return [];
  });

  // Settings State
  const [settings, setSettings] = useState<AppSettings>(() => {
    const defaultSettings: AppSettings = {
      autoLaunchGoogleMaps: true, // Default to directly launching Google Maps
      travelMode: 'driving',
      soundEnabled: true,
      voiceAnnouncement: true,
      hapticFeedback: true,
      preferredApp: 'google_maps_native',
      buttonPosition: null,
      buttonDock: 'bottom-right',
    };

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('autonav_settings');
      if (saved) {
        try {
          return { ...defaultSettings, ...JSON.parse(saved) };
        } catch {
          // ignore
        }
      }
    }
    return defaultSettings;
  });

  // Active Tab defaults directly to 'photo' so user can scan their screen immediately
  const [activeTab, setActiveTab] = useState<'orders' | 'history' | 'capture' | 'photo'>('photo');

  // UI Modals
  const [showSettings, setShowSettings] = useState(false);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showTripStackModal, setShowTripStackModal] = useState(false);
  const [showDrivingOverlay, setShowDrivingOverlay] = useState(true);
  const [capturedAddress, setCapturedAddress] = useState<ParsedAddress | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem('autonav_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('autonav_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('autonav_settings', JSON.stringify(settings));
  }, [settings]);

  // Show temporary toast notification
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // The active order object
  const activeOrder = orders.find((o) => o.id === activeOrderId) || orders[0] || null;

  // Handle Photo OCR result
  const handlePhotoExtracted = (parsed: ParsedAddress) => {
    // Add to orders queue as newly captured photo ticket
    const newOrder: CustomerOrder = {
      id: `photo-${Date.now()}`,
      orderNumber: `#SCAN-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: parsed.customerName || 'Photo Customer',
      address: parsed.street || parsed.formattedAddress,
      unit: parsed.unit,
      city: parsed.city || 'San Francisco',
      state: parsed.state || 'CA',
      zipCode: parsed.zipCode,
      phone: parsed.phone,
      gateCode: parsed.gateCode,
      deliveryNotes: parsed.notes || 'Extracted from photo example',
      rawText: parsed.raw || parsed.formattedAddress,
      itemCount: 1,
      totalAmount: '$35.00',
      status: 'pending',
      timestamp: 'Just now',
    };

    setOrders((prev) => [newOrder, ...prev]);
    setActiveOrderId(newOrder.id);
    triggerToast(`Scanned photo for ${newOrder.customerName}!`);

    // Record in History
    const historyEntry: NavigationHistoryItem = {
      id: `nav-${Date.now()}`,
      address: parsed.formattedAddress,
      customerName: parsed.customerName,
      phone: parsed.phone,
      timestamp: Date.now(),
      travelMode: settings.travelMode,
      openedInApp: settings.autoLaunchGoogleMaps,
      notes: parsed.notes,
    };
    setHistory((prev) => [historyEntry, ...prev]);

    // Handle Launch
    if (settings.autoLaunchGoogleMaps) {
      openInPhoneMaps(parsed.formattedAddress, settings.travelMode, true);
    } else {
      setCapturedAddress(parsed);
    }
  };

  // Primary Action: Pressing the Floating Action Button
  const handleFloatingButtonPress = async () => {
    setIsCapturing(true);
    triggerHaptic(50);

    if (settings.soundEnabled) {
      sound.playScan();
    }

    let parsedResult: ParsedAddress | null = null;

    // Step 1: If there is an active order in your delivery queue, ALWAYS route to it!
    if (activeOrder) {
      parsedResult = {
        raw: activeOrder.rawText,
        customerName: activeOrder.customerName,
        phone: activeOrder.phone,
        formattedAddress: `${activeOrder.address}, ${activeOrder.city}, ${activeOrder.state} ${activeOrder.zipCode || ''}`.trim(),
        street: activeOrder.address,
        unit: activeOrder.unit,
        city: activeOrder.city,
        state: activeOrder.state,
        zipCode: activeOrder.zipCode,
        notes: activeOrder.deliveryNotes,
        gateCode: activeOrder.gateCode,
        confidence: 0.98,
        source: 'active_order',
      };
      triggerToast(`Navigating to: ${activeOrder.customerName} (${activeOrder.address})`);
    } else {
      // Step 2: Only check clipboard if there are NO pending stops in your queue!
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
          const clipboardText = await navigator.clipboard.readText();
          if (clipboardText && clipboardText.trim().length > 5) {
            const parsed = parseCustomerAddress(clipboardText, 'clipboard');
            if (parsed && parsed.confidence >= 0.7) {
              parsedResult = parsed;
              triggerToast(`Navigating to clipboard address: ${parsed.formattedAddress}`);
            }
          }
        }
      } catch {
        // Clipboard read may be blocked
      }
    }

    setIsCapturing(false);

    if (!parsedResult) {
      if (settings.soundEnabled) sound.playAlert();
      triggerToast('No address detected. Please copy an address or select an order.');
      setActiveTab('capture');
      return;
    }

    // Play lock sound
    if (settings.soundEnabled) {
      sound.playLockSuccess();
    }

    // Optional voice announcement
    if (settings.voiceAnnouncement) {
      speakAddress(`Navigating to ${parsedResult.formattedAddress}`);
    }

    // Record in History
    const historyEntry: NavigationHistoryItem = {
      id: `nav-${Date.now()}`,
      address: parsedResult.formattedAddress,
      customerName: parsedResult.customerName,
      phone: parsedResult.phone,
      timestamp: Date.now(),
      travelMode: settings.travelMode,
      openedInApp: settings.autoLaunchGoogleMaps,
      notes: parsedResult.notes,
    };
    setHistory((prev) => [historyEntry, ...prev]);

    // Handle Launch: Instant vs Preview Sheet
    if (settings.autoLaunchGoogleMaps) {
      // Instant Mode: Launch Google Maps turn-by-turn navigation directly
      openInPhoneMaps(parsedResult.formattedAddress, settings.travelMode, true);
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
        });
      } catch {
        // ignore
      }
    } else {
      // Preview Mode: Open the action sheet with customer info, QR phone beam, and Google Maps CTA
      setCapturedAddress(parsedResult);
    }
  };

  // Direct manual/speech capture handler
  const handleManualCaptureAndNavigate = (parsed: ParsedAddress) => {
    if (settings.soundEnabled) sound.playLockSuccess();
    if (settings.voiceAnnouncement) speakAddress(`Routing to ${parsed.formattedAddress}`);

    const historyEntry: NavigationHistoryItem = {
      id: `nav-${Date.now()}`,
      address: parsed.formattedAddress,
      customerName: parsed.customerName,
      phone: parsed.phone,
      timestamp: Date.now(),
      travelMode: settings.travelMode,
      openedInApp: false,
      notes: parsed.notes,
    };
    setHistory((prev) => [historyEntry, ...prev]);
    setCapturedAddress(parsed);
  };

  // Direct route from order card
  const handleNavigateDirect = (order: CustomerOrder) => {
    setActiveOrderId(order.id);
    const parsed: ParsedAddress = {
      raw: order.rawText,
      customerName: order.customerName,
      phone: order.phone,
      formattedAddress: `${order.address}, ${order.city}, ${order.state} ${order.zipCode || ''}`.trim(),
      street: order.address,
      unit: order.unit,
      city: order.city,
      state: order.state,
      zipCode: order.zipCode,
      notes: order.deliveryNotes,
      gateCode: order.gateCode,
      confidence: 1.0,
      source: 'active_order',
    };

    if (settings.soundEnabled) sound.playLockSuccess();
    if (settings.voiceAnnouncement) speakAddress(`Routing to ${order.customerName}`);

    const historyEntry: NavigationHistoryItem = {
      id: `nav-${Date.now()}`,
      address: parsed.formattedAddress,
      customerName: parsed.customerName,
      phone: parsed.phone,
      timestamp: Date.now(),
      travelMode: settings.travelMode,
      openedInApp: settings.autoLaunchGoogleMaps,
      notes: parsed.notes,
    };
    setHistory((prev) => [historyEntry, ...prev]);

    if (settings.autoLaunchGoogleMaps) {
      openInPhoneMaps(parsed.formattedAddress, settings.travelMode, true);
    } else {
      setCapturedAddress(parsed);
    }
  };

  const handleUpdateStatus = (orderId: string, status: CustomerOrder['status']) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
  };

  const handleMarkStopDelivered = (orderId: string) => {
    handleUpdateStatus(orderId, 'delivered');
    const remaining = orders.filter((o) => o.id !== orderId && o.status !== 'delivered');
    if (remaining.length > 0) {
      setActiveOrderId(remaining[0].id);
      triggerToast(`Delivered! Next stop: ${remaining[0].customerName}`);
    } else {
      triggerToast('All deliveries completed! Great job!');
      try {
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      } catch {
        // ignore
      }
    }
  };

  const handleAddOrder = (newOrder: CustomerOrder) => {
    setOrders((prev) => [newOrder, ...prev]);
    setActiveOrderId(newOrder.id);
    triggerToast(`Added customer ticket for ${newOrder.customerName}`);
  };

  const handleResetButtonPosition = () => {
    localStorage.removeItem('autonav_button_pos');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative selection:bg-emerald-500 selection:text-slate-950 pb-28">
      {/* Top Header */}
      <TopBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setShowSettings(true)}
        onOpenNewOrder={() => setShowNewOrder(true)}
        pendingCount={orders.filter((o) => o.status !== 'delivered').length}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Floating Button Demo Callout */}
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5 -rotate-45" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                AutoNav Floating Direction Trigger
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono">
                  Ready
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Press the circular green <span className="text-emerald-400 font-semibold">"GO"</span> button (floating on screen) at any time. It automatically captures the customer address and opens Google Maps on your phone for turn-by-turn driving!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowTripStackModal(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Analyze if an incoming offer from another app is on your way"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Analyze Multi-App Offer</span>
            </button>

            <button
              onClick={() => setActiveTab('photo')}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Test Photo / Label OCR</span>
            </button>

            <button
              onClick={() => setShowDrivingOverlay((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                showDrivingOverlay
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title="Toggle compact collapsible next stop driving widget"
            >
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              <span>{showDrivingOverlay ? 'Driving HUD: ON' : 'Driving HUD: OFF'}</span>
            </button>

            <button
              onClick={() =>
                setSettings((prev) => ({
                  ...prev,
                  autoLaunchGoogleMaps: !prev.autoLaunchGoogleMaps,
                }))
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                settings.autoLaunchGoogleMaps
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>
                {settings.autoLaunchGoogleMaps ? 'Instant 1-Tap' : 'Preview Sheet'}
              </span>
            </button>
          </div>
        </div>

        {/* Tab Views */}
        {activeTab === 'orders' && (
          <OrderSimulator
            orders={orders}
            history={history}
            activeOrderId={activeOrderId}
            onSelectActiveOrder={(order) => {
              setActiveOrderId(order.id);
              triggerToast(`Active target set to ${order.customerName}`);
            }}
            onNavigateDirect={handleNavigateDirect}
            onUpdateStatus={handleUpdateStatus}
            onReorderOrders={(newOrders) => {
              setOrders(newOrders);
              triggerToast('Active orders sorted into fastest route sequence!');
            }}
            lastDestinationAddress={history[0]?.address}
            onOpenPhotoScanner={() => setActiveTab('photo')}
          />
        )}

        {activeTab === 'photo' && (
          <PhotoScannerModal
            onAddressExtracted={handlePhotoExtracted}
            onImportMultipleOrders={(newOrders) => {
              setOrders((prev) => [...newOrders, ...prev]);
              setActiveOrderId(newOrders[0].id);
              setActiveTab('orders');
              triggerToast(`Imported ${newOrders.length} stops from screenshot!`);
            }}
          />
        )}

        {activeTab === 'history' && (
          <RouteHistory
            history={history}
            onClearHistory={() => setHistory([])}
            onSelectDestination={(item) => {
              const parsed: ParsedAddress = {
                raw: item.address,
                customerName: item.customerName,
                phone: item.phone,
                formattedAddress: item.address,
                street: item.address,
                confidence: 1.0,
                source: 'active_order',
              };
              setCapturedAddress(parsed);
            }}
          />
        )}

        {activeTab === 'capture' && (
          <SmartCaptureView onCaptureAndNavigate={handleManualCaptureAndNavigate} />
        )}
      </main>

      {/* Floating Action Button Group (Primary GO + Dedicated Second ANALYZE Button) */}
      <FloatingButton
        onCapture={handleFloatingButtonPress}
        onOpenStackAnalyzer={() => setShowTripStackModal(true)}
        onOpenSettings={() => setShowSettings(true)}
        onVoiceCapture={() => setActiveTab('capture')}
        onManualCapture={() => setActiveTab('capture')}
        onPhotoCapture={() => setActiveTab('photo')}
        activeTargetName={activeOrder ? `${activeOrder.customerName}: ${activeOrder.address}` : undefined}
        isCapturing={isCapturing}
        autoLaunch={settings.autoLaunchGoogleMaps}
        scale={settings.buttonScale}
        opacity={settings.buttonOpacity}
        autoSnapToEdge={settings.autoSnapToEdge}
        showAnalyzeButton={settings.showAnalyzeButton}
      />

      {/* Compact Collapsible Active Driving Overlay (Shows next stop & live distance while driving) */}
      {showDrivingOverlay && activeOrder && activeOrder.status !== 'delivered' && (
        <ActiveDrivingOverlay
          activeOrder={activeOrder}
          totalPendingCount={orders.filter((o) => o.status !== 'delivered').length}
          onMarkDelivered={handleMarkStopDelivered}
          onOpenStackAnalyzer={() => setShowTripStackModal(true)}
          onClose={() => setShowDrivingOverlay(false)}
        />
      )}

      {/* Dedicated Multi-App On-The-Way Stack Fit Analyzer Modal */}
      {showTripStackModal && (
        <TripStackAnalyzerModal
          currentOrder={activeOrder}
          onAcceptStackedTrip={(newOrders) => {
            setOrders((prev) => [...newOrders, ...prev]);
            setActiveOrderId(newOrders[0].id);
            triggerToast(`Stacked ${newOrders.length} stops into your Google Maps route!`);
          }}
          onClose={() => setShowTripStackModal(false)}
        />
      )}

      {/* Navigation Preview Bottom Drawer / Modal */}
      {capturedAddress && (
        <NavigationSheet
          capturedAddress={capturedAddress}
          onClose={() => setCapturedAddress(null)}
          travelMode={settings.travelMode}
          setTravelMode={(mode) =>
            setSettings((prev) => ({ ...prev, travelMode: mode }))
          }
          onConfirmComplete={() => setCapturedAddress(null)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={(newSettings) =>
            setSettings((prev) => ({ ...prev, ...newSettings }))
          }
          onClose={() => setShowSettings(false)}
          onResetButtonPosition={handleResetButtonPosition}
        />
      )}

      {/* Add Order Modal */}
      {showNewOrder && (
        <NewOrderModal
          onClose={() => setShowNewOrder(false)}
          onAddOrder={handleAddOrder}
        />
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-emerald-500/50 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
