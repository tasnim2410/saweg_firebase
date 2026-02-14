'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import VehicleTypeSlider from '@/components/VehicleTypeSlider';
import HomeAdvancedFilters from '@/components/HomeAdvancedFilters';
import type { MaxChargeValue } from '@/app/[locale]/providers/MaxChargeFilter';
import type { DistanceSource, DistanceValue } from '@/app/[locale]/providers/DistanceFilter';
import dynamic from 'next/dynamic';
import styles from './home.module.css';

const CarouselSection = dynamic(() => import('@/components/CarouselSection'), {
  loading: () => null,
});

const CarouselSectionMerchant = dynamic(() => import('@/components/CarouselSectionMerchant'), {
  loading: () => null,
});

const FeaturesSection = dynamic(() => import('@/components/FeaturesSection'), {
  loading: () => null,
});

const HowToUseSection = dynamic(() => import('@/components/HowToUseSection'), {
  loading: () => null,
});

const WhyUseSection = dynamic(() => import('@/components/WhyUseSection'), {
  loading: () => null,
});

const ContactSection = dynamic(() => import('@/components/ContactSection'), {
  loading: () => null,
});

const Footer = dynamic(() => import('@/components/Footer'), {
  loading: () => null,
});

type HomeAdvancedFilterState = {
  maxChargeOptions: MaxChargeValue[];
  distance: DistanceValue | null;
  distanceSource: DistanceSource;
  distanceCity: string | null;
  currentLocation: { lat: number; lon: number } | null;
  classifiedCity: string | null;
  destinations: string[];
};

export default function HomePage() {
  const [selectedVehicleType, setSelectedVehicleType] = useState<string | null>(null);
  const [advancedFilters, setAdvancedFilters] = useState<HomeAdvancedFilterState | null>(null);

  return (
    <main className={styles.main}>
      <Header />
      <HeroSection />
      <HomeAdvancedFilters onFiltersChange={setAdvancedFilters} />
      <VehicleTypeSlider 
        selectedType={selectedVehicleType} 
        onSelect={setSelectedVehicleType} 
      />
      <CarouselSection
        vehicleTypeFilter={selectedVehicleType}
        maxChargeFilter={advancedFilters?.maxChargeOptions ?? null}
        destinationsFilter={advancedFilters?.destinations ?? null}
        distanceFilter={advancedFilters ? {
          distance: advancedFilters.distance,
          source: advancedFilters.distanceSource,
          city: advancedFilters.distanceCity,
          location: advancedFilters.currentLocation,
          classifiedCity: advancedFilters.classifiedCity,
        } : null}
      />
      <CarouselSectionMerchant vehicleTypeFilter={selectedVehicleType} />
      <FeaturesSection />
      <section id="about">
        <HowToUseSection />
      </section>
      
      <WhyUseSection />
      <ContactSection />
      <Footer />
    </main>
  );
}
