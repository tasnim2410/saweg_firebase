import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { prisma } from '@/lib/prisma';
import { getLocationLabel } from '@/lib/locations';
import { isAdminIdentifier } from '@/lib/admin';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import styles from './merchant-goods-posts.module.css';

type MerchantGoodsPostDetails = {
  id: number;
  name: string;
  phone: string;
  startingPoint: string;
  destination: string;
  goodsType: string;
  goodsWeight: number;
  goodsWeightUnit: string;
  budget: number | null;
  budgetCurrency: string | null;
  loadingDate: string | Date;
  vehicleTypeDesired: string;
  image: string | null;
  description: string | null;
  createdAt: string | Date;
  user: {
    fullName: string;
    email?: string | null;
    phone?: string | null;
    profileImage: string | null;
  };
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const postId = Number(id);

  const defaultTitle = locale === 'ar' ? 'Saweg - طلب تاجر' : 'Saweg - Merchant request';
  const defaultDescription =
    locale === 'ar'
      ? 'اطّلع على طلبات التجّار على ساوج'
      : 'See merchant requests on Saweg';

  if (!Number.isFinite(postId)) {
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

  const post = await (prisma as any).merchantGoodsPost.findUnique({
    where: { id: postId },
    select: {
      id: true,
      name: true,
      startingPoint: true,
      destination: true,
      goodsType: true,
      image: true,
      description: true,
      user: { select: { fullName: true } },
    },
  });

  if (!post) {
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

  const merchantName = (post.name || post.user?.fullName || '').trim() || (locale === 'ar' ? 'تاجر' : 'Merchant');
  const title = locale === 'ar' ? `Saweg - ${merchantName}` : `Saweg - ${merchantName}`;

  const rawDescription = String(post.description || '').trim();
  const routePart = `${post.startingPoint || ''} → ${post.destination || ''}`.trim();
  const fallbackDesc = [post.goodsType, routePart].filter(Boolean).join(' • ');
  const description = (rawDescription || fallbackDesc || defaultDescription).slice(0, 200);

  const imageUrl = post.image || '/images/logo.png';

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

export default async function MerchantGoodsPostDetailsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  const tCarousel = await getTranslations('carousel');

  const postId = Number(id);
  if (!Number.isFinite(postId)) {
    return (
      <main className={styles.main}>
        <Header />
        <section className={styles.section}>
          <div className={styles.card}>{locale === 'ar' ? 'الطلب غير موجود' : 'Post not found'}</div>
        </section>
        <Footer />
      </main>
    );
  }

  const post = (await (prisma as any).merchantGoodsPost.findUnique({
    where: { id: postId },
    select: {
      id: true,
      name: true,
      phone: true,
      startingPoint: true,
      destination: true,
      goodsType: true,
      goodsWeight: true,
      goodsWeightUnit: true,
      budget: true,
      budgetCurrency: true,
      loadingDate: true,
      vehicleTypeDesired: true,
      image: true,
      description: true,
      createdAt: true,
      user: {
        select: {
          fullName: true,
          email: true,
          phone: true,
          profileImage: true,
        },
      },
    },
  })) as MerchantGoodsPostDetails | null;

  if (!post) {
    return (
      <main className={styles.main}>
        <Header />
        <section className={styles.section}>
          <div className={styles.card}>{locale === 'ar' ? 'الطلب غير موجود' : 'Post not found'}</div>
        </section>
        <Footer />
      </main>
    );
  }

  const coverImage = post.image || '/images/logo.png';
  const profileImage = post.user?.profileImage || null;

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

  const formatDate = (d: string | Date) => {
    const date = new Date(d as any);
    if (Number.isNaN(date.getTime())) return '-';
    try {
      return date.toLocaleDateString(locale === 'ar' ? 'ar' : 'en');
    } catch {
      return date.toISOString().slice(0, 10);
    }
  };

  const labels = {
    route: locale === 'ar' ? 'المسار' : 'Route',
    goods: locale === 'ar' ? 'نوع البضاعة' : 'Goods',
    weight: locale === 'ar' ? 'الوزن' : 'Weight',
    budget: locale === 'ar' ? 'الميزانية' : 'Budget',
    loadingDate: locale === 'ar' ? 'تاريخ التحميل' : 'Loading date',
    vehicle: locale === 'ar' ? 'نوع المركبة المطلوبة' : 'Vehicle needed',
    description: locale === 'ar' ? 'الوصف' : 'Description',
    phone: locale === 'ar' ? 'الهاتف' : 'Phone',
  };

  const startLabel = getLocationLabel(post.startingPoint, locale === 'ar' ? 'ar' : 'en');
  const destLabel = getLocationLabel(post.destination, locale === 'ar' ? 'ar' : 'en');

  const merchantName = (post.name || post.user.fullName || '').trim() || (locale === 'ar' ? 'تاجر' : 'Merchant');
  const isAdminPost = Boolean(
    (post.user.email && isAdminIdentifier(String(post.user.email))) ||
      (post.user.phone && isAdminIdentifier(String(post.user.phone)))
  );

  return (
    <main className={styles.main}>
      <Header />
      <section className={styles.section}>
        <div className={styles.card}>
          <img className={styles.coverImage} src={coverImage} alt={merchantName} />

          <div className={styles.headerRow}>
            <div className={styles.avatarWrapper}>
              {profileImage ? (
                <img className={styles.avatar} src={profileImage} alt={post.user.fullName} />
              ) : (
                <div className={styles.avatarPlaceholder} aria-hidden="true">
                  {(post.user.fullName || merchantName || '?').trim().slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>

            <div className={styles.headerText}>
              <h1 className={styles.title}>{merchantName}</h1>
            </div>
          </div>

          <div className={styles.grid}>
            <div className={styles.infoBlockFull}>
              <div className={styles.infoLabel}>{labels.route}</div>
              <div className={styles.infoValue}>
                {startLabel} → {destLabel}
              </div>
            </div>

            <div className={styles.infoBlock}>
              <div className={styles.infoLabel}>{labels.goods}</div>
              <div className={styles.infoValue}>{post.goodsType || '-'}</div>
            </div>

            <div className={styles.infoBlock}>
              <div className={styles.infoLabel}>{labels.weight}</div>
              <div className={styles.infoValue}>
                {typeof post.goodsWeight === 'number' ? `${post.goodsWeight} ${post.goodsWeightUnit || ''}`.trim() : '-'}
              </div>
            </div>

            <div className={styles.infoBlock}>
              <div className={styles.infoLabel}>{labels.budget}</div>
              <div className={styles.infoValue}>
                {post.budget ? `${post.budget}${post.budgetCurrency ? ` ${post.budgetCurrency}` : ''}` : '-'}
              </div>
            </div>

            <div className={styles.infoBlock}>
              <div className={styles.infoLabel}>{labels.loadingDate}</div>
              <div className={styles.infoValue}>{formatDate(post.loadingDate)}</div>
            </div>

            <div className={styles.infoBlock}>
              <div className={styles.infoLabel}>{labels.vehicle}</div>
              <div className={styles.infoValue}>{post.vehicleTypeDesired || '-'}</div>
            </div>

            <div className={styles.infoBlockFull}>
              <div className={styles.infoLabel}>{labels.description}</div>
              <div className={styles.infoValue}>{post.description || '-'}</div>
            </div>

            <div className={styles.infoBlockFull}>
              <div className={styles.infoLabel}>{labels.phone}</div>
              {post.phone ? (
                <a className={styles.callButton} href={toTelHref(post.phone)} title={tCarousel('call')}>
                  <span dir="ltr" className={styles.phoneNumberLtr}>
                    {formatPhoneForDisplay(post.phone)}
                  </span>
                </a>
              ) : (
                <span className={`${styles.callButton} ${styles.callButtonDisabled}`}>
                  <span dir="ltr" className={styles.phoneNumberLtr}>
                    -
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
