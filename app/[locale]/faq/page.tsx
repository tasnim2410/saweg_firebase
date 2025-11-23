'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslations } from 'next-intl';

export default function FaqPage() {
  const tFooter = useTranslations('footer');

  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <section className="flex-1 max-w-4xl mx-auto px-4 pt-32 pb-16">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">{tFooter('faq')}</h1>
        <p className="text-gray-700 leading-relaxed mb-4">
          This is a placeholder for Frequently Asked Questions. Add the most common questions your
          users have about Saweg and clear, concise answers.
        </p>

      </section>
      <Footer />
    </main>
  );
}
