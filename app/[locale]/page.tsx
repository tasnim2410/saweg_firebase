import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import FeaturesSection from '@/components/FeaturesSection';
import HowToUseSection from '@/components/HowToUseSection';
import WhyUseSection from '@/components/WhyUseSection';
import ContactSection from '@/components/ContactSection';
import Footer from '@/components/Footer';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Header />
      <HeroSection />
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
