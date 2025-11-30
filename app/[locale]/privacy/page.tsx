'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslations } from 'next-intl';
import styles from '../shared-pages.module.css';

export default function PrivacyPage() {
  const tFooter = useTranslations('footer');

  return (
    <main className={styles.main}>
      <Header />
      <section className={styles.section}>
        <h1 className={styles.title}>{tFooter('privacy')}</h1>
        <p className={styles.content}>Placeholder text.</p>
      </section>
      <Footer />
    </main>
  );
}
