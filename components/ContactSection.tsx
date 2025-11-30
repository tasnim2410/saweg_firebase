'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useState } from 'react';
import Image from 'next/image';
import styles from './ContactSection.module.css';

export default function ContactSection() {
  const t = useTranslations('contact');
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setToast(null);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        setToast({ type: 'error', message: t('errorToast') });
        setTimeout(() => setToast(null), 4000);
        return;
      }

      setToast({ type: 'success', message: t('successToast') });
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: t('errorToast') });
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <section id="contact" className={styles.section}>
      {/* Top brown band with title/description */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h2 className={styles.title}>{t('title')}</h2>
          <p className={styles.description}>
            {t('description')}
          </p>
        </div>
      </div>

      {/* Overlapping white card with image + form */}
      <div className={styles.cardWrapper}>
        <div className={styles.card}>
          <div
            className={`${styles.cardContent} ${
              isRTL ? styles.cardContentReverse : ''
            }`}
          >
            {/* Image side */}
            <div className={styles.imageSide}>
              <div className={styles.imageContainer}>
                <Image
                  src="/images/contact.jpg"
                  alt={locale === 'ar' ? 'صورة شاحنات سواق' : 'Saweg contact trucks'}
                  fill
                  className={styles.image}
                  priority
                />
              </div>
            </div>

            {/* Form side */}
            <div className={styles.formSide}>
              <form onSubmit={handleSubmit} className={styles.form}>
                <div>
                  <input
                    type="text"
                    name="name"
                    placeholder={t('name')}
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className={styles.input}
                  />
                </div>

                <div>
                  <input
                    type="email"
                    name="email"
                    placeholder={t('email')}
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className={styles.input}
                  />
                </div>

                {/* <div>
                  <input
                    type="text"
                    name="subject"
                    placeholder={t('subject')}
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className={styles.input}
                  />
                </div> */}

                <div>
                  <textarea
                    name="message"
                    placeholder={t('message')}
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={4}
                    className={styles.textarea}
                  ></textarea>
                </div>

                <div>
                  <input
                    type="tel"
                    name="phone"
                    placeholder={t('phone')}
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className={styles.input}
                  />
                </div>

                <button
                  type="submit"
                  className={styles.submitButton}
                >
                  {t('send')}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`${styles.toast} ${
          toast
            ? styles.toastVisible
            : ''
        } ${
          toast?.type === 'success'
            ? styles.toastSuccess
            : toast?.type === 'error'
            ? styles.toastError
            : styles.toastDefault
        }`}
      >
        {toast?.message}
      </div>
    </section>
  );
}
