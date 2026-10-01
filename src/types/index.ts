export interface CustomerOrder {
  id: string;
  customerName: string;
  phone?: string;
  rawText: string;
  address: string;
  unit?: string;
  city: string;
  state: string;
  zipCode?: string;
  deliveryNotes?: string;
  gateCode?: string;
  orderNumber: string;
  itemCount: number;
  totalAmount?: string;
  status: 'pending' | 'in_transit' | 'delivered';
  timestamp: string;
  coordinates?: { lat: number; lng: number };
  proximityDistanceMiles?: number;
  stopIndex?: number;
}

export interface ParsedAddress {
  raw: string;
  customerName?: string;
  phone?: string;
  formattedAddress: string;
  street: string;
  unit?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
  gateCode?: string;
  confidence: number;
  source: 'clipboard' | 'active_order' | 'manual_paste' | 'speech' | 'ocr_label';
}

export interface NavigationHistoryItem {
  id: string;
  address: string;
  customerName?: string;
  phone?: string;
  timestamp: number;
  travelMode: 'driving' | 'bicycling' | 'walking' | 'transit';
  openedInApp: boolean;
  notes?: string;
}

export interface AppSettings {
  autoLaunchGoogleMaps: boolean; // Launch instantly on press or show preview sheet
  travelMode: 'driving' | 'bicycling' | 'walking' | 'transit';
  soundEnabled: boolean;
  voiceAnnouncement: boolean;
  hapticFeedback: boolean;
  preferredApp: 'google_maps_native' | 'google_maps_web';
  buttonPosition: { x: number; y: number } | null;
  buttonDock: 'bottom-right' | 'bottom-left' | 'top-right' | 'custom';
  buttonScale?: 'compact' | 'normal' | 'large';
  buttonOpacity?: number; // 0.4 to 1.0 (translucent ghost mode)
  autoSnapToEdge?: boolean;
  showAnalyzeButton?: boolean;
}
