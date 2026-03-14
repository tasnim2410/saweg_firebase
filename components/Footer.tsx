'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Facebook, Twitter, Instagram, Linkedin, Youtube, Phone } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './Footer.module.css';
import logoImg from '@/public/images/logo.png';

export default function Footer() {
  const t = useTranslations('footer');
  const locale = useLocale();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.grid}>
          {/* Logo and Social Media */}
          <div>
            <div className={styles.logoWrapper}>
              <Image
                src={logoImg}
                alt="Saweg logo"
                width={240}
                height={140}
                className={styles.logoImage}
                sizes="240px"
                loading="lazy"
              />
            </div>
            <h3 className={styles.columnTitle}>{t('followUs')}</h3>
            <div className={styles.socialLinks}>
              <a
                href="https://www.facebook.com/profile.php?id=100089299780324"
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.socialIcon} ${styles.facebook}`}
              >
                <Facebook className={styles.iconSvg} />
              </a>
              {/* <a
                href="#"
                className={`${styles.socialIcon} ${styles.twitter}`}
              >
                <Twitter className={styles.iconSvg} />
              </a> */}
              <a
                href="#"
                className={`${styles.socialIcon} ${styles.instagram}`}
              >
                <Instagram className={styles.iconSvg} />
              </a>
              <a
                href="#"
                className={`${styles.socialIcon} ${styles.linkedin}`}
              >
                <Linkedin className={styles.iconSvg} />
              </a>
              {/* <a
                href="#"
                className={`${styles.socialIcon} ${styles.youtube}`}
              >
                <Youtube className={styles.iconSvg} />
              </a> */}
            </div>
          </div>

          {/* Useful Links */}
          <div>
            <h3 className={styles.columnTitle}>{t('usefulLinks')}</h3>
            <ul className={styles.linksList}>
              <li>
                <Link
                  href={`/${locale}/privacy`}
                  className={styles.link}
                >
                  {t('privacy')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/terms`}
                  className={styles.link}
                >
                  {t('terms')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/support`}
                  className={styles.link}
                >
                  {t('support')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/faq`}
                  className={styles.link}
                >
                  {t('faq')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className={styles.columnTitle}>Contact</h3>
            <ul className={styles.contactList}>
              <li>Email: Contact.saweg@gmail.com</li>
              <li>Phone: +218 930755020</li>
              {/* <li>Address: 123 Street, City, Country</li> */}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className={styles.copyright}>
          <p>&copy; 2025 Saweg. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
