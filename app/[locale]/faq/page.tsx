'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslations } from 'next-intl';
import styles from '../shared-pages.module.css';

export default function FaqPage() {
  const tFooter = useTranslations('footer');

  return (
    <main className={styles.main}>
      <Header />
      <section className={styles.section}>
        <h1 className={styles.title}>{tFooter('faq')}</h1>
        <p className={styles.content}>
          This is a placeholder for Frequently Asked Questions. Add the most common questions your
          users have about Saweg and clear, concise answers.
        </p>

      </section>
      <Footer />
    </main>
  );
}
