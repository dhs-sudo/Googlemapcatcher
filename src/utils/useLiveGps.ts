import { useState, useEffect, useCallback, useRef } from 'react';
import { LatLng, DEFAULT_ORIGIN } from './routeOptimizer';

export interface GpsState {
  coords: LatLng | null;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  status: 'active' | 'acquiring' | 'fallback' | 'denied';
  lastUpdated: number | null;
  errorMessage: string | null;
}

export function useLiveGps(fallbackOrigin: LatLng = DEFAULT_ORIGIN) {
  const [gps, setGps] = useState<GpsState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('autonav_last_gps');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
            return {
              coords: { lat: parsed.lat, lng: parsed.lng },
              accuracy: parsed.accuracy || 15,
              heading: null,
              speed: null,
              status: 'fallback',
              lastUpdated: parsed.lastUpdated || Date.now(),
              errorMessage: null,
            };
          }
        } catch {
          // ignore
        }
      }
    }
    return {
      coords: fallbackOrigin,
      accuracy: null,
      heading: null,
      speed: null,
      status: 'acquiring',
      lastUpdated: null,
      errorMessage: null,
    };
  });

  const watchIdRef = useRef<number | null>(null);

  // Force single position update
  const refreshLocation = useCallback(async (): Promise<LatLng | null> => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGps((prev) => ({
        ...prev,
        status: 'denied',
        errorMessage: 'Geolocation is not supported by your browser',
      }));
      return null;
    }

    setGps((prev) => ({ ...prev, status: 'acquiring' }));

    return new Promise((resolve) => {
      // Try high-accuracy first
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newCoords: LatLng = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          const state: GpsState = {
            coords: newCoords,
            accuracy: Math.round(pos.coords.accuracy),
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            status: 'active',
            lastUpdated: Date.now(),
            errorMessage: null,
          };
          setGps(state);
          localStorage.setItem(
            'autonav_last_gps',
            JSON.stringify({ ...newCoords, accuracy: pos.coords.accuracy, lastUpdated: Date.now() })
          );
          resolve(newCoords);
        },
        (err) => {
          // Fallback to low-accuracy if high-accuracy timed out
          navigator.geolocation.getCurrentPosition(
            (fallbackPos) => {
              const fallbackCoords: LatLng = {
                lat: fallbackPos.coords.latitude,
                lng: fallbackPos.coords.longitude,
              };
              setGps({
                coords: fallbackCoords,
                accuracy: Math.round(fallbackPos.coords.accuracy),
                heading: null,
                speed: null,
                status: 'active',
                lastUpdated: Date.now(),
                errorMessage: null,
              });
              localStorage.setItem(
                'autonav_last_gps',
                JSON.stringify({
                  ...fallbackCoords,
                  accuracy: fallbackPos.coords.accuracy,
                  lastUpdated: Date.now(),
                })
              );
              resolve(fallbackCoords);
            },
            (fallbackErr) => {
              console.warn('Geolocation failed:', err.message, fallbackErr.message);
              setGps((prev) => {
                resolve(prev.coords || fallbackOrigin);
                return {
                  ...prev,
                  status: prev.coords ? 'fallback' : 'denied',
                  errorMessage: err.message || 'Unable to retrieve location',
                };
              });
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
          );
        },
        { enableHighAccuracy: true, timeout: 7000, maximumAge: 5000 }
      );
    });
  }, [fallbackOrigin]);

  // Set up continuous watch
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return;

    // Initial update
    refreshLocation();

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const newCoords: LatLng = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setGps({
            coords: newCoords,
            accuracy: Math.round(pos.coords.accuracy),
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            status: 'active',
            lastUpdated: Date.now(),
            errorMessage: null,
          });
          localStorage.setItem(
            'autonav_last_gps',
            JSON.stringify({
              ...newCoords,
              accuracy: pos.coords.accuracy,
              lastUpdated: Date.now(),
            })
          );
        },
        (err) => {
          console.warn('GPS Watch warning:', err.message);
          if (err.code === 1) {
            setGps((prev) => ({ ...prev, status: 'denied', errorMessage: 'Permission denied' }));
          }
        },
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
      );
    } catch (e) {
      console.warn('WatchPosition error:', e);
    }

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [refreshLocation]);

  return {
    ...gps,
    refreshLocation,
  };
}
