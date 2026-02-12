import Footer from '@/components/Footer';
import { prisma } from '@/lib/prisma';
import { getLocationLabel } from '@/lib/locations';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import styles from './providers.module.css';
import { VEHICLE_TYPE_CONFIG } from '@/lib/vehicleTypes';

type ProviderDetails = {
  id: number;
  name: string;
  location: string;
  phone: string;
  destination: string | null;
  description: string | null;
  image: string | null;
  active: boolean;
  lastLocationUpdateAt: string | Date;
  createdAt: string | Date;
  user: {
    fullName: string;
    profileImage: string | null;
    truckImage: string | null;
    carKind: string | null;
    maxCharge: string | null;
    maxChargeUnit: string | null;
  };
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const providerId = Number(id);

  const defaultTitle = locale === 'ar' ? 'Saweg - عرض سوّاق' : 'Saweg - Shipper offer';
  const defaultDescription =
    locale === 'ar'
      ? 'اطّلع على عروض السوّاق على ساوج'
      : 'See shippers offers on Saweg';

  if (!Number.isFinite(providerId)) {
    return {
      title: defaultTitle,
      description: defaultDescription,
      openGraph: {
        title: defaultTitle,
        description: defaultDescription,
        images: [{ url: '/images/logo.png' }],
        type: 'article',
      },
      twitter: {
        card: 'summary_large_image',
        title: defaultTitle,
        description: defaultDescription,
        images: ['/images/logo.png'],
      },
    };
  }

  const provider = await (prisma as any).provider.findUnique({
    where: { id: providerId },
    select: {
      id: true,
      name: true,
      location: true,
      destination: true,
      description: true,
      image: true,
      user: {
        select: {
          truckImage: true,
        },
      },
    },
  });

  if (!provider) {
    return {
      title: defaultTitle,
      description: defaultDescription,
      openGraph: {
        title: defaultTitle,
        description: defaultDescription,
        images: [{ url: '/images/logo.png' }],
        type: 'article',
      },
      twitter: {
        card: 'summary_large_image',
        title: defaultTitle,
        description: defaultDescription,
        images: ['/images/logo.png'],
      },
    };
  }

  const title = 'Saweg';
  const rawDescription = String(provider.description || '').trim();
  const routePart = [provider.location, provider.destination].filter(Boolean).join(' → ');
  const description = (rawDescription || routePart || defaultDescription).slice(0, 200);
  const imageUrl = provider.image || provider.user?.truckImage || '/images/logo.png';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: imageUrl }],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ProviderDetailsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  const arrow = locale === 'ar' ? '→' : '←';

  const tForm = await getTranslations('providerForm');
  const tDash = await getTranslations('providerDashboard');
  const tRegister = await getTranslations('register');
  const tCarousel = await getTranslations('carousel');

  const providerId = Number(id);
  if (!Number.isFinite(providerId)) {
    return (
      <main className={styles.main}>
        <Link href={`/${locale}`} className={styles.backButton} aria-label={locale === 'ar' ? 'الرجوع إلى الرئيسية' : 'Back to home'}>
          {arrow}
        </Link>
        <section className={styles.section}>
          <div className={styles.card}>Provider not found</div>
        </section>
        <Footer />
      </main>
    );
  }

  const provider = (await (prisma as any).provider.findUnique({
    where: { id: providerId },
    select: {
      id: true,
      name: true,
      location: true,
      phone: true,
      destination: true,
      description: true,
      image: true,
      active: true,
      lastLocationUpdateAt: true,
      createdAt: true,
      user: {
        select: {
          fullName: true,
          profileImage: true,
          truckImage: true,
          carKind: true,
          maxCharge: true,
          maxChargeUnit: true,
        },
      },
    },
  })) as ProviderDetails | null;

  if (!provider) {
    return (
      <main className={styles.main}>
        <Link href={`/${locale}`} className={styles.backButton} aria-label={locale === 'ar' ? 'الرجوع إلى الرئيسية' : 'Back to home'}>
          {arrow}
        </Link>
        <section className={styles.section}>
          <div className={styles.card}>Provider not found</div>
        </section>
        <Footer />
      </main>
    );
  }

  const postImage = provider.image || provider.user?.truckImage || 'https://via.placeholder.com/900x480/F3F3F3/666666?text=Truck';
  const profileImage = provider.user?.profileImage || null;

  const toTelHref = (phoneNumber: string) => {
    const normalized = phoneNumber.replace(/[^+\d]/g, '');
    return `tel:${normalized}`;
  };

  const timeAgoLabelFromMs = (ms: number) => {
    if (!Number.isFinite(ms)) return '';
    const diffMs = Date.now() - ms;
    if (!Number.isFinite(diffMs) || diffMs < 0) return '';

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
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

  const formatPhoneForDisplay = (phoneNumber: string) => {
    const trimmed = (phoneNumber || '').trim();
    if (trimmed.endsWith('+') && !trimmed.startsWith('+')) {
      return `+${trimmed.slice(0, -1)}`;
    }
    return trimmed;
  };

  const locLabel = getLocationLabel(provider.location || '-', locale === 'ar' ? 'ar' : 'en');
  const destLabel = provider.destination
    ? getLocationLabel(provider.destination, locale === 'ar' ? 'ar' : 'en')
    : '';

  // Translate units and labels for Arabic locale
  const weightUnitDisplay = (unit: string | null) => {
    if (!unit) return locale === 'ar' ? 'كغ' : 'kg';
    const normalized = unit.toLowerCase().trim();
    if (locale === 'ar') {
      if (normalized === 'kg') return 'كغ';
      if (normalized === 'tons' || normalized === 'ton') return 'طن';
    }
    return unit;
  };

  const vehicleLabelDisplay = (vehicleType: string | null) => {
    if (!vehicleType) return '-';
    if (locale === 'ar') {
      const vehicleConfig = VEHICLE_TYPE_CONFIG.find(v => v.id === vehicleType);
      if (vehicleConfig) return vehicleConfig.labelAR;
    }
    return vehicleType;
  };

  const createdAtMs = provider.createdAt ? new Date(provider.createdAt as any).getTime() : NaN;
  const timeAgo = timeAgoLabelFromMs(createdAtMs);

  const lastUpdateMs = new Date(provider.lastLocationUpdateAt as any).getTime();
  const isStale = Number.isFinite(lastUpdateMs) ? Date.now() - lastUpdateMs > 24 * 60 * 60 * 1000 : false;
  const canCall = provider.active && !isStale;

  return (
    <main className={styles.main}>
      <Link href={`/${locale}`} className={styles.backButton} aria-label={locale === 'ar' ? 'الرجوع إلى الرئيسية' : 'Back to home'}>
        {arrow}
      </Link>
      <section className={styles.section}>
        <div className={styles.card}>
          <img className={styles.coverImage} src={postImage} alt={provider.name} />

          <div className={styles.headerRow}>
            <div className={styles.avatarWrapper}>
              {profileImage ? (
                <img className={styles.avatar} src={profileImage} alt={provider.user.fullName} />
              ) : (
                <div className={styles.avatarPlaceholder} aria-hidden="true">
                  {(provider.user.fullName || provider.name || '?').trim().slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>

            <div className={styles.headerText}>
              <h1 className={styles.title}>{provider.name}</h1>

              {timeAgo ? <div className={styles.subtitle}>{timeAgo}</div> : null}

              <div className={styles.badge} data-active={provider.active ? 'true' : 'false'}>
                {provider.active ? tDash('available') : tDash('notAvailable')}
              </div>
            </div>
          </div>

          <div className={styles.grid}>
            <div className={styles.infoBlockFull}>
              <div className={styles.infoLabel}>{tForm('description')}</div>
              <div className={styles.infoValue}>{provider.description || '-'}</div>
            </div>

            <div className={styles.infoBlockFull}>
              <div className={styles.infoLabel}>{locale === 'ar' ? 'المسار' : 'Route'}</div>
              <div className={styles.infoValue}>
                {locLabel || '-'} → {destLabel || '-'}
              </div>
            </div>

            <div className={styles.infoBlock}>
              <div className={styles.infoLabel}>{tRegister('carKind')}</div>
              <div className={styles.infoValue}>{vehicleLabelDisplay(provider.user.carKind)}</div>
            </div>

            <div className={styles.infoBlock}>
              <div className={styles.infoLabel}>{tRegister('maxCharge')}</div>
              <div className={styles.infoValue}>
                {provider.user.maxCharge
                  ? `${provider.user.maxCharge}${provider.user.maxChargeUnit ? ` ${weightUnitDisplay(provider.user.maxChargeUnit)}` : ''}`
                  : '-'}
              </div>
            </div>

            <div className={styles.infoBlockFull}>
              <div className={styles.infoLabel}>{tForm('phone')}</div>
              {canCall ? (
                <a className={styles.callButton} href={toTelHref(provider.phone)} title={tCarousel('call')}>
                  <span dir="ltr" className={styles.phoneNumberLtr}>
                    {formatPhoneForDisplay(provider.phone)}
                  </span>
                </a>
              ) : (
                <span className={`${styles.callButton} ${styles.callButtonDisabled}`}>
                  <span dir="ltr" className={styles.phoneNumberLtr}>
                    {formatPhoneForDisplay(provider.phone)}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
