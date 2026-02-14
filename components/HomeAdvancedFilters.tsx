"use client";

import { useEffect, useState, useRef } from "react";
import { useLocale } from "next-intl";
import { Sliders } from "lucide-react";
import MaxChargeFilter, { MaxChargeValue } from "@/app/[locale]/providers/MaxChargeFilter";
import DistanceFilter, {
  DistanceSource,
  DistanceValue,
} from "@/app/[locale]/providers/DistanceFilter";
import DestinationFilter from "@/app/[locale]/providers/DestinationFilter";
import styles from "./HomeAdvancedFilters.module.css";

interface HomeAdvancedFiltersProps {
  onFiltersChange?: (filters: {
    maxChargeOptions: MaxChargeValue[];
    distance: DistanceValue | null;
    distanceSource: DistanceSource;
    distanceCity: string | null;
    currentLocation: { lat: number; lon: number } | null;
    classifiedCity: string | null;
    destinations: string[];
  }) => void;
  sticky?: boolean; // Default true for sticky behavior, false for inline
}

export default function HomeAdvancedFilters({ onFiltersChange, sticky = true }: HomeAdvancedFiltersProps) {
  const locale = useLocale();

  const [pendingMaxChargeOptions, setPendingMaxChargeOptions] = useState<MaxChargeValue[]>([]);
  const [pendingDistance, setPendingDistance] = useState<DistanceValue | null>(null);
  const [pendingDistanceSource, setPendingDistanceSource] = useState<DistanceSource>("selected-city");
  const [pendingDistanceCity, setPendingDistanceCity] = useState<string | null>(null);
  const [pendingCurrentLocation, setPendingCurrentLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [pendingClassifiedCity, setPendingClassifiedCity] = useState<string | null>(null);
  const [pendingDestinations, setPendingDestinations] = useState<string[]>([]);
  const [merchantCity, setMerchantCity] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(true);
  const lastScrollYRef = useRef(0);
  const [headerOffset, setHeaderOffset] = useState(0);

  useEffect(() => {
    const fetchUserCity = async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (data?.merchantCity && typeof data.merchantCity === "string") {
          setMerchantCity(data.merchantCity);
        }
      } catch {
        // ignore
      }
    };
    fetchUserCity();
  }, []);

  // Measure header height so the sticky bar sits exactly underneath it on all screen sizes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateOffset = () => {
      const headerEl = document.querySelector<HTMLElement>("header");
      if (!headerEl) return;
      const rect = headerEl.getBoundingClientRect();
      setHeaderOffset(rect.height);
    };

    updateOffset();
    window.addEventListener("resize", updateOffset);
    return () => window.removeEventListener("resize", updateOffset);
  }, []);

  // Only handle scroll hide/show when sticky
  useEffect(() => {
    if (!sticky) return;
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollYRef.current) {
        setShowStickyBar(false);
      } else {
        setShowStickyBar(true);
      }
      
      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sticky]);

  const hasAnyFilter =
    pendingMaxChargeOptions.length > 0 ||
    pendingDistance !== null ||
    pendingDestinations.length > 0;

  // Notify parent whenever filters change
  useEffect(() => {
    if (!onFiltersChange) return;
    onFiltersChange({
      maxChargeOptions: pendingMaxChargeOptions,
      distance: pendingDistance,
      distanceSource: pendingDistanceSource,
      distanceCity: pendingDistanceCity,
      currentLocation: pendingCurrentLocation,
      classifiedCity: pendingClassifiedCity,
      destinations: pendingDestinations,
    });
  }, [
    onFiltersChange,
    pendingMaxChargeOptions,
    pendingDistance,
    pendingDistanceSource,
    pendingDistanceCity,
    pendingCurrentLocation,
    pendingClassifiedCity,
    pendingDestinations,
  ]);

  const onClearAll = () => {
    setPendingMaxChargeOptions([]);
    setPendingDistance(null);
    setPendingDistanceSource("selected-city");
    setPendingDistanceCity(null);
    setPendingCurrentLocation(null);
    setPendingClassifiedCity(null);
    setPendingDestinations([]);
  };

  const handleClose = () => {
    setOpen(false);
    setShowStickyBar(true);
  };

  const title = locale === "ar" ? "فلترة متقدمة" : "Advanced filtering";
  const subtitle =
    locale === "ar"
      ? "استخدم فلاتر إضافية للعثور على السائق المناسب"
      : "Use extra filters to find the right shipper";

  return (
    <>
      {/* Toggle Button - Sticky or Inline based on prop */}
      <div
        className={`${sticky ? styles.stickyBar : styles.inlineBar} ${open ? styles.stickyBarHidden : ''} ${!showStickyBar && sticky ? styles.stickyBarHidden : ''}`}
        style={sticky ? { top: headerOffset } : undefined}
      >
        <div className={styles.stickyBarInner}>
          <button
            type="button"
            className={styles.toggleButton}
            onClick={() => {
              setOpen(true);
              setShowStickyBar(false);
            }}
            aria-expanded={open}
          >
            <div className={styles.toggleIcon}>
              <Sliders size={18} />
            </div>
            <span className={styles.toggleLabel}>{title}</span>
            {hasAnyFilter && <span className={styles.badge}>✓</span>}
          </button>
        </div>
      </div>

      {/* Full-Screen Overlay */}
      {open && (
        <>
          <div className={styles.backdrop} onClick={() => {
            handleClose();
            setShowStickyBar(true);
          }} />
          <div className={styles.overlay}>
            <div className={styles.overlayContent}>
              <div className={styles.overlayHeader}>
                <button type="button" className={styles.backButton} onClick={() => {
                  handleClose();
                  setShowStickyBar(true);
                }}>
                  <span className={styles.backIcon}>←</span>
                  <span>{locale === "ar" ? "رجوع" : "Back"}</span>
                </button>
                {hasAnyFilter && (
                  <button type="button" className={styles.resetButton} onClick={onClearAll}>
                    <span className={styles.resetIcon}>⊖</span>
                    <span>{locale === "ar" ? "إعادة تعيين" : "Reset"}</span>
                  </button>
                )}
              </div>

              <div className={styles.filtersGrid}>
                <div className={styles.filterCol}>
                  <MaxChargeFilter
                    selectedOptions={pendingMaxChargeOptions}
                    onChange={(opts) => setPendingMaxChargeOptions(opts)}
                    onClear={() => setPendingMaxChargeOptions([])}
                  />
                </div>
                <div className={styles.filterCol}>
                  <DistanceFilter
                    selectedOption={pendingDistance}
                    onChange={(value) => setPendingDistance(value)}
                    onClear={() => {
                      setPendingDistance(null);
                      setPendingDistanceSource("selected-city");
                      setPendingDistanceCity(null);
                      setPendingCurrentLocation(null);
                      setPendingClassifiedCity(null);
                    }}
                    merchantCity={merchantCity}
                    distanceSource={pendingDistanceSource}
                    onSourceChange={(src) => setPendingDistanceSource(src)}
                    selectedCity={pendingDistanceCity}
                    onSelectedCityChange={(city) => setPendingDistanceCity(city)}
                    currentLocation={pendingCurrentLocation}
                    onCurrentLocationChange={(loc) => setPendingCurrentLocation(loc)}
                    classifiedCity={pendingClassifiedCity}
                    onClassifiedCityChange={(city) => setPendingClassifiedCity(city)}
                  />
                </div>
                <div className={styles.filterCol}>
                  <DestinationFilter
                    selectedDestinations={pendingDestinations}
                    onChange={(dests) => setPendingDestinations(dests)}
                    onClear={() => setPendingDestinations([])}
                  />
                </div>
              </div>

              <div className={styles.overlayFooter}>
                <button type="button" className={styles.applyButton} onClick={() => {
                  handleClose();
                  setShowStickyBar(true);
                }}>
                  <span>{locale === "ar" ? "تطبيق الفلاتر" : "Apply Filters"}</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
