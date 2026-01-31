import Footer from '@/components/Footer';
import styles from '@/components/CarouselSection.module.css';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getLocationLabel } from '@/lib/locations';
import { MapPin, Phone, Truck } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type ProviderListItem = {
  id: number;
  name: string;
  location: string;
  destination: string | null;
  description: string | null;
  image: string | null;
  createdAt: string | Date;
  phone: string;
  active: boolean;
  lastLocationUpdateAt: string | Date | null;
};

export default async function ProvidersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const providers = (await (prisma as any).provider.findMany({
    select: {
      id: true,
      name: true,
      location: true,
      destination: true,
      description: true,
      image: true,
      createdAt: true,
      phone: true,
      active: true,
      lastLocationUpdateAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })) as ProviderListItem[];

  const title = locale === 'ar' ? 'كل عروض السوّاق' : 'All shippers offers';
  const countLabel = locale === 'ar' ? `${providers.length} عرض` : `${providers.length} offers`;
  const arrow = locale === 'ar' ? '→' : '←';

  const toTelHref = (phoneNumber: string) => {
    const normalized = String(phoneNumber || '').replace(/[^+\d]/g, '');
    return `tel:${normalized}`;
  };

  const timeAgoLabelFromMs = (ms: number) => {
    if (!Number.isFinite(ms)) return '';
    const diffMs = Date.now() - ms;
    if (!Number.isFinite(diffMs) || diffMs < 0) return '';
    const minutes = Math.floor(diffMs / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const isAr = locale === 'ar';
    if (minutes < 1) return isAr ? 'الآن' : 'now';
    if (minutes < 60) return isAr ? `منذ ${minutes} دقيقة` : `${minutes}m ago`;
    if (hours < 24) return isAr ? `منذ ${hours} ساعة` : `${hours}h ago`;
    if (days < 7) return isAr ? `منذ ${days} يوم` : `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return isAr ? `منذ ${weeks} أسبوع` : `${weeks}w ago`;
    const months = Math.floor(days / 30);
    return isAr ? `منذ ${months} شهر` : `${months}mo ago`;
  };

  return (
    <main>
      <Link href={`/${locale}`} className={styles.backButton} aria-label={locale === 'ar' ? 'الرجوع إلى الرئيسية' : 'Back to home'}>
        {arrow}
      </Link>
      <div className={styles.listPage}>
        <div className={styles.listHeader}>
          <h1 className={styles.listTitle}>{title}</h1>
          <div className={styles.listCount}>{countLabel}</div>
        </div>

        <div className={styles.verticalList}>
          {providers.map((p) => {
            const lang = locale === 'ar' ? 'ar' : 'en';
            const dest = p.destination ?? null;
            const locLabel = getLocationLabel(p.location || '-', lang);
            const destLabel = dest ? getLocationLabel(dest, lang) : '';

            const createdAtMs = p.createdAt ? new Date(p.createdAt as any).getTime() : NaN;
           const timeAgo = timeAgoLabelFromMs(createdAtMs);

            const lastUpdateMs = p.lastLocationUpdateAt ? new Date(p.lastLocationUpdateAt as any).getTime() : NaN;
            const isStale = Number.isFinite(lastUpdateMs) ? Date.now() - lastUpdateMs > 24 * 60 * 60 * 1000 : true;
            const isActive = Boolean(p.active) && !isStale;
            const statusClass = isActive ? styles.statusActive : styles.statusInactive;

            const description = (p.description || '').trim();
            const shortDesc = description.length > 160 ? `${description.slice(0, 160)}...` : description;

            return (
              <div key={p.id} className={styles.listItem}>
                <Link href={`/${locale}/providers/${p.id}`} className={styles.listItemMedia}>
                  <img
                    src={p.image || 'https://via.placeholder.com/520x340/F3F3F3/666666?text=Truck'}
                    alt={p.name}
                  />
                  {timeAgo ? <div className={styles.timeBadge}>{timeAgo}</div> : null}
                </Link>

                <div className={styles.listItemBody}>
                  {/* <Link href={`/${locale}/providers/${p.id}`} className={styles.listItemTitleRow}>
                    <h3 className={styles.listItemTitle}>{p.name}</h3>
                  </Link> */}

                  <div className={styles.metaContainer}>
                    {shortDesc ? (
                      <div className={styles.descriptionContainer}>
                        <Link href={`/${locale}/providers/${p.id}`} className={styles.descriptionLink} aria-label={p.name}>
                          <p className={`${styles.description} ${styles.descriptionClickable}`}>{shortDesc}</p>
                        </Link>
                      </div>
                    ) : null}

                    <div className={styles.locationContainer}>
                      <MapPin size={14} className={styles.locationIcon} />
                      <span className={styles.locationText}>{locLabel}</span>
                      <span className={`${styles.statusDot} ${statusClass}`} />
                    </div>

                    {destLabel ? (
                      <div className={styles.destinationContainer}>
                        <Truck size={14} className={styles.destinationIcon} />
                        <span className={styles.destinationText}>{destLabel}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className={styles.actionContainer}>
                    {p.phone ? (
                      <a
                        className={`${styles.callButton} ${statusClass}`}
                        href={toTelHref(p.phone)}
                        aria-label={locale === 'ar' ? 'اتصال' : 'Call'}
                        title={locale === 'ar' ? 'اتصال' : 'Call'}
                      >
                        <Phone size={16} className={styles.callIcon} aria-hidden="true" />
                        <span className={styles.callText}>{locale === 'ar' ? 'اتصال' : 'Call'}</span>
                      </a>
                    ) : (
                      <span className={`${styles.callButton} ${styles.statusInactive}`}>-</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <Footer />
    </main>
  );
}
