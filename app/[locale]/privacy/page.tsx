'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslations } from 'next-intl';

export default function PrivacyPage() {
  const tFooter = useTranslations('footer');

  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <section className="flex-1 max-w-4xl mx-auto px-4 pt-32 pb-16">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">{tFooter('privacy')}</h1>
        <p className="text-gray-700 leading-relaxed mb-4">
          This is a placeholder for the Privacy Policy. Here you can describe how Saweg collects,
          uses and protects user data. Replace this text later with your real legal content.
        </p>
        <p className="text-gray-700 leading-relaxed">
          Until the final text is ready, you can keep this section as a simple explanation of your
          intentions regarding user privacy and data protection.
        </p>
      </section>
      <Footer />
    </main>
  );
}
