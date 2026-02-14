'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import VehicleTypeSlider from '@/components/VehicleTypeSlider';
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

export default function HomePage() {
  const [selectedVehicleType, setSelectedVehicleType] = useState<string | null>(null);

  return (
    <main className={styles.main}>
      <Header />
      <HeroSection />
      <VehicleTypeSlider 
        selectedType={selectedVehicleType} 
        onSelect={setSelectedVehicleType} 
      />
      <CarouselSection
        vehicleTypeFilter={selectedVehicleType}
        maxChargeFilter={null}
        destinationsFilter={null}
        distanceFilter={null}
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
