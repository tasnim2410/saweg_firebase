'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { MapPin, Power, AlertCircle, WifiOff, Navigation } from 'lucide-react';
import styles from './LocationSharing.module.css';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
  timestamp: number;
  address?: string | null;
}

interface LocationSharingProps {
  tripId?: string;
  providerId?: string;
  onStatusChange?: (enabled: boolean) => void;
}

const STORAGE_KEY = 'saweg:locationSharing:v1';
const CITY_INTERVAL = 30000; // 30 seconds
const HIGHWAY_INTERVAL = 120000; // 2 minutes
const MIN_DISTANCE_THRESHOLD = 50; // meters - minimum movement to trigger update

export default function LocationSharing({ tripId, providerId, onStatusChange }: LocationSharingProps) {
  const t = useTranslations('locationSharing');
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const [isSharing, setIsSharing] = useState(false);
  const [permissionState, setPermissionState] = useState<PermissionState | null>(null);
  const [lastLocation, setLastLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [intervalSeconds, setIntervalSeconds] = useState(CITY_INTERVAL / 1000);
  const [lastAddress, setLastAddress] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentLocationRef = useRef<LocationData | null>(null);
  const retryCountRef = useRef(0);

  // Load saved state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.enabled) {
          // Don't auto-start, just restore the intent
          setIsSharing(false);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Save state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ enabled: isSharing, timestamp: Date.now() })
      );
    } catch {
      // Ignore storage errors
    }
  }, [isSharing]);

  // Check geolocation permission
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions) return;

    const checkPermission = async () => {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        setPermissionState(result.state as PermissionState);

        result.addEventListener('change', () => {
          setPermissionState(result.state as PermissionState);
          if (result.state === 'denied' && isSharing) {
            stopSharing();
            setError(t('permissionDenied'));
          }
        });
      } catch {
        // Some browsers don't support querying geolocation permission
      }
    };

    checkPermission();
  }, [t, isSharing]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Calculate distance between two coordinates in meters
  const calculateDistance = useCallback((loc1: LocationData, loc2: LocationData): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (loc1.latitude * Math.PI) / 180;
    const φ2 = (loc2.latitude * Math.PI) / 180;
    const Δφ = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
    const Δλ = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }, []);

  // Determine interval based on speed
  const getIntervalForSpeed = useCallback((speed: number | null): number => {
    // speed is in meters/second
    // ~30 km/h = 8.3 m/s threshold for city vs highway
    if (speed === null) return CITY_INTERVAL;
    return speed > 8 ? HIGHWAY_INTERVAL : CITY_INTERVAL;
  }, []);

  // Send location to backend
  const sendLocation = useCallback(async (location: LocationData) => {
    if (isOffline) {
      // Queue for later if offline
      queueLocationUpdate(location);
      return;
    }

    setUpdateStatus('sending');

    try {
      const response = await fetch('/api/location/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          speed: location.speed,
          timestamp: location.timestamp,
          tripId,
          providerId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update location');
      }

      const data = await response.json();
      
      // Store address from API response
      if (data.ok && data.location?.address) {
        setLastAddress(data.location.address);
      }

      setUpdateStatus('success');
      retryCountRef.current = 0;
      lastSentLocationRef.current = location;

      // Reset status after 2 seconds
      setTimeout(() => setUpdateStatus('idle'), 2000);
    } catch (err) {
      setUpdateStatus('error');
      retryCountRef.current++;

      // Queue for retry if network error
      if (retryCountRef.current >= 3) {
        queueLocationUpdate(location);
      }

      setTimeout(() => setUpdateStatus('idle'), 2000);
    }
  }, [isOffline, tripId, providerId]);

  // Queue location update for offline sync
  const queueLocationUpdate = (location: LocationData) => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // Store in IndexedDB for later sync
    const request = indexedDB.open('saweg-location-queue', 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('locations')) {
        db.createObjectStore('locations', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['locations'], 'readwrite');
      const store = transaction.objectStore('locations');

      store.add({
        ...location,
        tripId,
        providerId,
        queuedAt: Date.now(),
      });
    };
  };

  // Start location sharing
  const startSharing = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError(t('geolocationNotSupported'));
      return;
    }

    setError(null);

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          timestamp: position.timestamp,
        };

        setLastLocation(location);
        lastSentLocationRef.current = location;
        sendLocation(location);

        // Start watching position
        watchIdRef.current = navigator.geolocation.watchPosition(
          (newPosition) => {
            const newLocation: LocationData = {
              latitude: newPosition.coords.latitude,
              longitude: newPosition.coords.longitude,
              accuracy: newPosition.coords.accuracy,
              speed: newPosition.coords.speed,
              timestamp: newPosition.timestamp,
            };

            setLastLocation(newLocation);

            // Calculate dynamic interval based on speed
            const newInterval = getIntervalForSpeed(newLocation.speed);
            setIntervalSeconds(newInterval / 1000);

            // Check if we've moved enough to warrant an update
            if (lastSentLocationRef.current) {
              const distance = calculateDistance(lastSentLocationRef.current, newLocation);
              if (distance < MIN_DISTANCE_THRESHOLD) {
                return; // Skip update if haven't moved enough
              }
            }
          },
          (err) => {
            console.error('Geolocation error:', err);
            if (err.code === err.PERMISSION_DENIED) {
              setError(t('permissionDenied'));
              stopSharing();
            } else {
              setError(t('locationError'));
            }
          },
          {
            enableHighAccuracy: true,
            maximumAge: 10000,
            timeout: 10000,
          }
        );

        // Start periodic sending
        const sendInterval = getIntervalForSpeed(location.speed);
        intervalRef.current = setInterval(() => {
          if (lastLocation) {
            // Only send if we've moved since last send
            if (lastSentLocationRef.current) {
              const distance = calculateDistance(lastSentLocationRef.current, lastLocation);
              if (distance >= MIN_DISTANCE_THRESHOLD) {
                sendLocation(lastLocation);
              }
            } else {
              sendLocation(lastLocation);
            }
          }
        }, sendInterval);

        setIsSharing(true);
        onStatusChange?.(true);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setError(t('permissionDenied'));
        } else {
          setError(t('locationError'));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [t, lastLocation, sendLocation, calculateDistance, getIntervalForSpeed, onStatusChange]);

  // Stop location sharing
  const stopSharing = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsSharing(false);
    setUpdateStatus('idle');
    onStatusChange?.(false);
  }, [onStatusChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSharing();
    };
  }, [stopSharing]);

  // Toggle sharing
  const toggleSharing = () => {
    if (isSharing) {
      stopSharing();
    } else {
      startSharing();
    }
  };

  return (
    <div className={styles.container} data-rtl={isRTL}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <MapPin className={styles.icon} size={24} />
          <h3 className={styles.title}>{t('title')}</h3>
        </div>
        <button
          type="button"
          onClick={toggleSharing}
          disabled={!!error && !isSharing}
          className={`${styles.toggleButton} ${isSharing ? styles.active : styles.inactive}`}
          aria-pressed={isSharing}
        >
          <Power size={20} />
          <span>{isSharing ? t('stopSharing') : t('startSharing')}</span>
        </button>
      </div>

      {/* Status indicator */}
      <div className={styles.statusRow}>
        <div className={`${styles.statusBadge} ${isSharing ? styles.enabled : styles.disabled}`}>
          <span className={styles.statusDot} />
          <span>{isSharing ? t('sharingEnabled') : t('sharingDisabled')}</span>
        </div>
        {updateStatus === 'sending' && (
          <span className={styles.updateStatus}>{t('sending')}</span>
        )}
        {updateStatus === 'success' && (
          <span className={`${styles.updateStatus} ${styles.success}`}>{t('sent')}</span>
        )}
        {updateStatus === 'error' && (
          <span className={`${styles.updateStatus} ${styles.error}`}>{t('failed')}</span>
        )}
      </div>

      {/* Warning message when disabled */}
      {!isSharing && (
        <div className={styles.warning}>
          <AlertCircle size={16} />
          <span>{t('deactivationWarning')}</span>
        </div>
      )}

      {/* Active sharing info */}
      {isSharing && (
        <div className={styles.activeInfo}>
          <div className={styles.infoRow}>
            <Navigation size={16} />
            <span>{t('updateInterval', { seconds: intervalSeconds })}</span>
          </div>
          {lastLocation && (
            <div className={styles.coordinates}>
              <span>{t('lastUpdate')}</span>
              <span className={styles.coords} title={`${lastLocation.latitude.toFixed(6)}, ${lastLocation.longitude.toFixed(6)}`}>
                {lastAddress || `${lastLocation.latitude.toFixed(4)}, ${lastLocation.longitude.toFixed(4)}`}
              </span>
              {lastLocation.speed !== null && (
                <span className={styles.speed}>
                  {(lastLocation.speed * 3.6).toFixed(1)} km/h
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className={styles.error}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Offline indicator */}
      {isOffline && (
        <div className={styles.offline}>
          <WifiOff size={16} />
          <span>{t('offlineMode')}</span>
        </div>
      )}

      {/* Battery hint */}
      {isSharing && (
        <div className={styles.batteryHint}>
          <span>{t('batteryWarning')}</span>
        </div>
      )}
    </div>
  );
}
