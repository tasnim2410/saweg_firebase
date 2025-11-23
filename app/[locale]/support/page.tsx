'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslations } from 'next-intl';

export default function SupportPage() {
  const tFooter = useTranslations('footer');

  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <section className="flex-1 max-w-4xl mx-auto px-4 pt-32 pb-16">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">{tFooter('support')}</h1>
        <p className="text-gray-700 leading-relaxed mb-4">
          This is a placeholder for Support information. Here you can explain how users can reach
          you for help, typical response times, and any support channels such as email, phone, or
          in-app chat.
        </p>
        <p className="text-gray-700 leading-relaxed">
          For now, this placeholder text can stay while you finalize your support process and
          contact details.
        </p>
      </section>
      <Footer />
    </main>
  );
}
