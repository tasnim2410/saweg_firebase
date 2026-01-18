import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { prisma } from '@/lib/prisma';
import { getLocationLabel } from '@/lib/locations';
import { getTranslations } from 'next-intl/server';
import styles from './providers.module.css';

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

export default async function ProviderDetailsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  const tForm = await getTranslations('providerForm');
  const tDash = await getTranslations('providerDashboard');
  const tRegister = await getTranslations('register');
  const tCarousel = await getTranslations('carousel');

  const providerId = Number(id);
  if (!Number.isFinite(providerId)) {
    return (
      <main className={styles.main}>
        <Header />
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
        <Header />
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

  const lastUpdateMs = new Date(provider.lastLocationUpdateAt as any).getTime();
  const isStale = Number.isFinite(lastUpdateMs) ? Date.now() - lastUpdateMs > 24 * 60 * 60 * 1000 : false;
  const canCall = provider.active && !isStale;

  return (
    <main className={styles.main}>
      <Header />
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
             
              <div className={styles.badge} data-active={provider.active ? 'true' : 'false'}>
                {provider.active ? tDash('available') : tDash('notAvailable')}
              </div>
            </div>
          </div>

          <div className={styles.grid}>
            <div className={styles.infoBlock}>
              <div className={styles.infoLabel}>{tForm('location')}</div>
              <div className={styles.infoValue}>{locLabel || '-'}</div>
            </div>

            <div className={styles.infoBlock}>
              <div className={styles.infoLabel}>{tForm('destination')}</div>
              <div className={styles.infoValue}>{destLabel || '-'}</div>
            </div>

            <div className={styles.infoBlock}>
              <div className={styles.infoLabel}>{tRegister('carKind')}</div>
              <div className={styles.infoValue}>{provider.user.carKind || '-'}</div>
            </div>

            <div className={styles.infoBlock}>
              <div className={styles.infoLabel}>{tRegister('maxCharge')}</div>
              <div className={styles.infoValue}>
                {provider.user.maxCharge
                  ? `${provider.user.maxCharge}${provider.user.maxChargeUnit ? ` ${provider.user.maxChargeUnit}` : ''}`
                  : '-'}
              </div>
            </div>

            <div className={styles.infoBlockFull}>
              <div className={styles.infoLabel}>{tForm('description')}</div>
              <div className={styles.infoValue}>{provider.description || '-'}</div>
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
