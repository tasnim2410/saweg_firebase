import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { prisma } from '@/lib/prisma';
import { getTranslations } from 'next-intl/server';
import styles from './users.module.css';

type PublicUser = {
  id: string;
  fullName: string;
  phone: string | null;
  type: 'SHIPPER' | 'MERCHANT' | 'ADMIN' | null;
  profileImage: string | null;
  merchantCity: string | null;
  shipperCity: string | null;
  carKind: string | null;
  maxCharge: string | null;
  maxChargeUnit: string | null;
  trucksNeeded: string | null;
  placeOfBusiness: string | null;
  truckImage: string | null;
};

export default async function PublicUserProfilePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  const tRegister = await getTranslations('register');

  const userId = typeof id === 'string' ? id.trim() : '';
  if (!userId) {
    return (
      <main className={styles.main}>
        <Header />
        <section className={styles.section}>
          <div className={styles.card}>User not found</div>
        </section>
        <Footer />
      </main>
    );
  }

  const user = (await (prisma as any).user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      phone: true,
      type: true,
      profileImage: true,
      merchantCity: true,
      shipperCity: true,
      carKind: true,
      maxCharge: true,
      maxChargeUnit: true,
      trucksNeeded: true,
      placeOfBusiness: true,
      truckImage: true,
    },
  })) as PublicUser | null;

  if (!user) {
    return (
      <main className={styles.main}>
        <Header />
        <section className={styles.section}>
          <div className={styles.card}>User not found</div>
        </section>
        <Footer />
      </main>
    );
  }

  const isRtl = locale === 'ar';
  const coverImage = user.type === 'SHIPPER' ? user.truckImage : null;

  return (
    <main className={styles.main}>
      <Header />
      <section className={styles.section} dir={isRtl ? 'rtl' : 'ltr'}>
        <div className={styles.card}>
          {coverImage ? <img className={styles.coverImage} src={coverImage} alt={user.fullName} /> : null}

          <div className={styles.headerRow}>
            <div className={styles.avatarWrapper}>
              {user.profileImage ? (
                <img className={styles.avatar} src={user.profileImage} alt={user.fullName} />
              ) : (
                <div className={styles.avatarPlaceholder} aria-hidden="true">
                  {(user.fullName || '?').trim().slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>

            <div className={styles.headerText}>
              <h1 className={styles.title}>{user.fullName}</h1>
            </div>
          </div>

          <div className={styles.grid}>
            <div className={styles.infoBlock}>
              <div className={styles.infoLabel}>{tRegister('phone')}</div>
              <div className={styles.infoValue}>{user.phone || '-'}</div>
            </div>

            {user.type === 'SHIPPER' ? (
              <>
                <div className={styles.infoBlock}>
                  <div className={styles.infoLabel}>{tRegister('shipperCity')}</div>
                  <div className={styles.infoValue}>{user.shipperCity || '-'}</div>
                </div>

                <div className={styles.infoBlock}>
                  <div className={styles.infoLabel}>{tRegister('carKind')}</div>
                  <div className={styles.infoValue}>{user.carKind || '-'}</div>
                </div>

                <div className={styles.infoBlock}>
                  <div className={styles.infoLabel}>{tRegister('maxCharge')}</div>
                  <div className={styles.infoValue}>
                    {user.maxCharge
                      ? `${user.maxCharge}${user.maxChargeUnit ? ` ${user.maxChargeUnit}` : ''}`
                      : '-'}
                  </div>
                </div>
              </>
            ) : null}

            {user.type === 'MERCHANT' ? (
              <>
                <div className={styles.infoBlock}>
                  <div className={styles.infoLabel}>{tRegister('merchantCity')}</div>
                  <div className={styles.infoValue}>{user.merchantCity || '-'}</div>
                </div>

                <div className={styles.infoBlock}>
                  <div className={styles.infoLabel}>{tRegister('placeOfBusiness')}</div>
                  <div className={styles.infoValue}>{user.placeOfBusiness || '-'}</div>
                </div>

                <div className={styles.infoBlock}>
                  <div className={styles.infoLabel}>{tRegister('trucksNeeded')}</div>
                  <div className={styles.infoValue}>{user.trucksNeeded || '-'}</div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
