'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslations } from 'next-intl';

export default function TermsPage() {
  const tFooter = useTranslations('footer');

  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <section className="flex-1 max-w-4xl mx-auto px-4 pt-32 pb-16">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">{tFooter('terms')}</h1>
        <p className="text-gray-700 leading-relaxed mb-4">
          This is a placeholder for the Terms of Service. Use this page to explain how users may
          use the Saweg platform, what is allowed, what is prohibited, and any limitations of
          liability.
        </p>
        <p className="text-gray-700 leading-relaxed">
          Replace this placeholder text later with final legal terms written by your legal advisor
          or team.
        </p>
      </section>
      <Footer />
    </main>
  );
}
