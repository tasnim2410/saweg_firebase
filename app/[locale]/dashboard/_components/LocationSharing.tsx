'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { MapPin, Navigation } from 'lucide-react';
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

const CITY_INTERVAL = 30000;
const HIGHWAY_INTERVAL = 120000;
const MIN_DISTANCE_THRESHOLD = 50;

export default function LocationSharing({ tripId, providerId, onStatusChange }: LocationSharingProps) {
  const t = useTranslations('locationSharing');
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const [isSharing, setIsSharing] = useState(false);
  const [lastLocation, setLastLocation] = useState<LocationData | null>(null);
  const [lastAddress, setLastAddress] = useState<string | null>(null);
  const [intervalSeconds, setIntervalSeconds] = useState(CITY_INTERVAL / 1000);

  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentLocationRef = useRef<LocationData | null>(null);

  const calculateDistance = useCallback((loc1: LocationData, loc2: LocationData): number => {
    const R = 6371e3;
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

  const getIntervalForSpeed = useCallback((speed: number | null): number => {
    return speed === null || speed <= 8 ? CITY_INTERVAL : HIGHWAY_INTERVAL;
  }, []);

  const sendLocation = useCallback(async (location: LocationData) => {
    try {
      const response = await fetch('/api/location/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      if (!response.ok) return;

      const data = await response.json();
      if (data.ok && data.location?.address) {
        setLastAddress(data.location.address);
      }
      lastSentLocationRef.current = location;
    } catch {
      // Silent fail
    }
  }, [tripId, providerId]);

  const startSharing = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

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
            const newInterval = getIntervalForSpeed(newLocation.speed);
            setIntervalSeconds(newInterval / 1000);
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
        );

        const sendInterval = getIntervalForSpeed(location.speed);
        intervalRef.current = setInterval(() => {
          if (lastSentLocationRef.current && lastLocation) {
            const distance = calculateDistance(lastSentLocationRef.current, lastLocation);
            if (distance >= MIN_DISTANCE_THRESHOLD) {
              sendLocation(lastLocation);
            }
          } else if (lastLocation) {
            sendLocation(lastLocation);
          }
        }, sendInterval);

        setIsSharing(true);
        onStatusChange?.(true);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [lastLocation, sendLocation, calculateDistance, getIntervalForSpeed, onStatusChange]);

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
    onStatusChange?.(false);
  }, [onStatusChange]);

  useEffect(() => {
    return () => stopSharing();
  }, [stopSharing]);

  const toggleSharing = () => {
    if (isSharing) {
      stopSharing();
    } else {
      startSharing();
    }
  };

  return (
    <div className={styles.container} data-rtl={isRTL}>
      <div className={styles.simpleHeader}>
        <div className={styles.titleRow}>
          <MapPin className={styles.icon} size={20} />
          <span className={styles.simpleTitle}>{t('title')}</span>
        </div>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={isSharing}
            onChange={toggleSharing}
          />
          <span className={styles.toggleSlider} />
        </label>
      </div>

      {isSharing && lastLocation && (
        <div className={styles.simpleLocation}>
          <Navigation size={14} />
          <span className={styles.locationText}>
            {lastAddress || `${lastLocation.latitude.toFixed(4)}, ${lastLocation.longitude.toFixed(4)}`}
          </span>
        </div>
      )}
    </div>
  );
}
