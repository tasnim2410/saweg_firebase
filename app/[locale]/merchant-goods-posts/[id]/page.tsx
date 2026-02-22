import Footer from '@/components/Footer';
import { prisma } from '@/lib/prisma';
import { getLocationLabel } from '@/lib/locations';
import { isAdminIdentifier } from '@/lib/admin';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import styles from './merchant-goods-posts.module.css';
import { getVehicleLabel, VEHICLE_TYPE_CONFIG } from '@/lib/vehicleTypes';
import PhoneDisplay from './PhoneDisplay';
import ShareButton from '@/components/ShareButton';

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
        type: 'article',
      },
      twitter: {
        card: 'summary',
        title: defaultTitle,
        description: defaultDescription,
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
        type: 'article',
      },
      twitter: {
        card: 'summary',
        title: defaultTitle,
        description: defaultDescription,
      },
    };
  }

  const rawDescription = String(post.description || '').trim();
  const cleanDescription = rawDescription.split(/\n|\r/).map((l) => l.replace(/^\s*-\s*/, '').trim()).filter(Boolean).join(' - ');
  const startAr = getLocationLabel(post.startingPoint, 'ar');
  const endAr = getLocationLabel(post.destination, 'ar');
  const routePart = startAr && endAr
    ? `من ${startAr} إلى ${endAr}`
    : startAr || endAr || '';
  const fallbackDesc = [post.goodsType, routePart].filter(Boolean).join(' • ');
  const descriptionText = (cleanDescription || fallbackDesc || defaultDescription).slice(0, 200);

  const title = defaultTitle;
  const description = descriptionText;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://saweg.app';
  const pageUrl = `${baseUrl}/${locale}/merchant-goods-posts/${postId}`;
  // Use original post image for OG, fallback to generated OG image if no image
  const rawImage = post.image;
  const ogImageUrl = rawImage
    ? (rawImage.startsWith('http') ? rawImage : `${baseUrl}${rawImage}`)
    : `${baseUrl}/api/og/merchant/${postId}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      images: [{ 
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: title
      }],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function MerchantGoodsPostDetailsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  const arrow = locale === 'ar' ? '→' : '←';

  const tCarousel = await getTranslations('carousel');

  const postId = Number(id);
  if (!Number.isFinite(postId)) {
    return (
      <main className={styles.main}>
        <Link href={`/${locale}`} className={styles.backButton} aria-label={locale === 'ar' ? 'الرجوع إلى الرئيسية' : 'Back to home'}>
          {arrow}
        </Link>
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
        <Link href={`/${locale}`} className={styles.backButton} aria-label={locale === 'ar' ? 'الرجوع إلى الرئيسية' : 'Back to home'}>
          {arrow}
        </Link>
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

  const toWhatsAppHref = (phoneNumber: string) => {
    const normalized = phoneNumber.replace(/[^\d]/g, '');
    return `https://wa.me/${normalized}`;
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

  // Translate units for Arabic locale
  const weightUnitDisplay = (unit: string | null) => {
    if (!unit) return locale === 'ar' ? 'كغ' : 'kg';
    const normalized = unit.toLowerCase().trim();
    if (locale === 'ar') {
      if (normalized === 'kg') return 'كغ';
      if (normalized === 'tons' || normalized === 'ton') return 'طن';
    }
    return unit;
  };

  const currencyDisplay = (currency: string | null) => {
    if (!currency) return '';
    const normalized = currency.toUpperCase().trim();
    if (locale === 'ar') {
      if (normalized === 'TND') return 'د.ت';
      if (normalized === 'USD') return '$';
      if (normalized === 'EUR') return '€';
    }
    return currency;
  };

  const vehicleLabelDisplay = (vehicleType: string | null) => {
    if (!vehicleType) return '-';
    if (locale === 'ar') {
      const vehicleConfig = VEHICLE_TYPE_CONFIG.find(v => v.id === vehicleType);
      if (vehicleConfig) return vehicleConfig.labelAR;
    }
    return vehicleType;
  };

  const merchantName = (post.name || post.user.fullName || '').trim() || (locale === 'ar' ? 'تاجر' : 'Merchant');
  const isAdminPost = Boolean(
    (post.user.email && isAdminIdentifier(String(post.user.email))) ||
      (post.user.phone && isAdminIdentifier(String(post.user.phone)))
  );

  const createdAtMs = post.createdAt ? new Date(post.createdAt as any).getTime() : NaN;
  const timeAgo = timeAgoLabelFromMs(createdAtMs);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://saweg.app';
  const shareUrl = `${baseUrl}/${locale}/merchant-goods-posts/${postId}`;

  return (
    <main className={styles.main}>
      <Link href={`/${locale}`} className={styles.backButton} aria-label={locale === 'ar' ? 'الرجوع إلى الرئيسية' : 'Back to home'}>
        {arrow}
      </Link>
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
              {timeAgo ? <div className={styles.subtitle}>{timeAgo}</div> : null}
            </div>

            <ShareButton 
              url={shareUrl} 
              title={merchantName}
              description={post.description}
              locale={locale}
            />
          </div>

          <div className={styles.grid}>
            <div className={styles.infoBlockFull}>
              <div className={styles.infoLabel}>{labels.description}</div>
              <div className={styles.infoValue}>{post.description || '-'}</div>
            </div>

            
            <div className={styles.infoBlockFull}>
              <div className={styles.infoLabel}>{locale === 'ar' ? 'المسار' : 'Route'}</div>
              <div className={styles.infoValue}>
                {locale === 'ar' 
                  ? `من ${startLabel || '-'} إلى ${destLabel || '-'}`
                  : `From ${startLabel || '-'} to ${destLabel || '-'}`
                }
              </div>
            </div>

            <div className={styles.infoBlock}>
              <div className={styles.infoLabel}>{labels.goods}</div>
              <div className={styles.infoValue}>{post.goodsType || '-'}</div>
            </div>

            <div className={styles.infoBlock}>
              <div className={styles.infoLabel}>{labels.weight}</div>
              <div className={styles.infoValue}>
                {typeof post.goodsWeight === 'number' ? `${post.goodsWeight} ${weightUnitDisplay(post.goodsWeightUnit)}`.trim() : '-'}
              </div>
            </div>

            <div className={styles.infoBlock}>
              <div className={styles.infoLabel}>{labels.budget}</div>
              <div className={styles.infoValue}>
                {post.budget ? `${post.budget}${post.budgetCurrency ? ` ${currencyDisplay(post.budgetCurrency)}` : ''}` : '-'}
              </div>
            </div>

            {/* <div className={styles.infoBlock}>
              <div className={styles.infoLabel}>{labels.loadingDate}</div>
              <div className={styles.infoValue}>{formatDate(post.loadingDate)}</div>
            </div> */}

            <div className={styles.infoBlock}>
              <div className={styles.infoLabel}>{labels.vehicle}</div>
              <div className={styles.infoValue}>{vehicleLabelDisplay(post.vehicleTypeDesired)}</div>
            </div>
           

            <div className={styles.infoBlockFull}>
              <div className={styles.infoLabel}>{labels.phone}</div>
              <PhoneDisplay
                phone={post.phone}
                locale={locale}
                callButtonClass={styles.callButton}
                callButtonDisabledClass={styles.callButtonDisabled}
                phoneNumberLtrClass={styles.phoneNumberLtr}
              />
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
