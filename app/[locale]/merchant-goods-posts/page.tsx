import Footer from '@/components/Footer';
import styles from '@/components/CarouselSection.module.css';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getLocationLabel } from '@/lib/locations';
import { MapPin, Phone, Truck } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type MerchantGoodsPostListItem = {
  id: number;
  name: string | null;
  phone: string | null;
  startingPoint: string;
  destination: string;
  goodsType: string;
  goodsWeight: number;
  goodsWeightUnit: string;
  loadingDate: string | Date;
  image: string | null;
  description: string | null;
  createdAt: string | Date;
  user: {
    fullName: string;
    phone: string | null;
  };
};

export default async function MerchantGoodsPostsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const posts = (await (prisma as any).merchantGoodsPost.findMany({
    select: {
      id: true,
      name: true,
      phone: true,
      startingPoint: true,
      destination: true,
      goodsType: true,
      goodsWeight: true,
      goodsWeightUnit: true,
      loadingDate: true,
      image: true,
      description: true,
      createdAt: true,
      user: { select: { fullName: true, phone: true } },
    },
    orderBy: { createdAt: 'desc' },
  })) as MerchantGoodsPostListItem[];

  const title = locale === 'ar' ? 'كل طلبات التجّار' : 'All merchants requests';
  const countLabel = locale === 'ar' ? `${posts.length} طلب` : `${posts.length} requests`;
  const lang = locale === 'ar' ? 'ar' : 'en';
  const arrow = locale === 'ar' ? '→' : '←';

  const formatDate = (d: string | Date) => {
    const date = new Date(d as any);
    if (Number.isNaN(date.getTime())) return '';
    try {
      return date.toLocaleDateString(lang);
    } catch {
      return date.toISOString().slice(0, 10);
    }
  };

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
          {posts.map((post) => {
            const merchantName = (post.name || post.user?.fullName || '').trim() || (locale === 'ar' ? 'تاجر' : 'Merchant');
            const startLabel = getLocationLabel(post.startingPoint || '-', lang);
            const destLabel = getLocationLabel(post.destination || '-', lang);

            const createdAtMs = post.createdAt ? new Date(post.createdAt as any).getTime() : NaN;
            const timeAgo = timeAgoLabelFromMs(createdAtMs);

            const isRecent = Number.isFinite(createdAtMs)
              ? Date.now() - createdAtMs <= 24 * 60 * 60 * 1000
              : false;
            const statusClass = isRecent ? styles.statusActive : styles.statusInactive;

            const summaryParts: string[] = [];
            if (post.goodsType) summaryParts.push(post.goodsType);
            if (Number.isFinite(post.goodsWeight as any) && post.goodsWeightUnit) {
              summaryParts.push(`${post.goodsWeight} ${post.goodsWeightUnit}`);
            }
            if (post.loadingDate) {
              const d = formatDate(post.loadingDate);
              if (d) summaryParts.push(d);
            }
            const summary = summaryParts.filter(Boolean).join(' • ');

            const description = (post.description || '').trim();
            const shortDesc = description.length > 160 ? `${description.slice(0, 160)}...` : description;

            const phone = (post.phone || post.user?.phone || '').trim();

            const postHref = `/${locale}/merchant-goods-posts/${post.id}`;

            return (
              <div key={post.id} className={styles.listItem}>
                <Link href={postHref} className={styles.listItemMedia}>
                  <img
                    src={post.image || '/images/logo.png'}
                    alt={merchantName}
                    style={!post.image ? { filter: 'grayscale(100%)' } : undefined}
                  />
                  {timeAgo ? <div className={styles.timeBadge}>{timeAgo}</div> : null}
                </Link>

                <div className={styles.listItemBody}>
                  {/* <Link href={postHref} className={styles.listItemTitleRow}>
                    <h3 className={styles.listItemTitle}>{merchantName}</h3>
                  </Link> */}

                  <div className={styles.metaContainer}>
                    {shortDesc ? (
                      <div className={styles.descriptionContainer}>
                        <Link href={postHref} className={styles.descriptionLink} aria-label={merchantName}>
                          <p className={`${styles.description} ${styles.descriptionClickable}`}>{shortDesc}</p>
                        </Link>
                      </div>
                    ) : null}

                    <div className={styles.locationContainer}>
                      <MapPin size={14} className={styles.locationIcon} />
                      <span className={styles.locationText}>{startLabel}</span>
                    </div>

                    <div className={styles.destinationContainer}>
                      <Truck size={14} className={styles.destinationIcon} />
                      <span className={styles.destinationText}>{destLabel}</span>
                    </div>

                    {summary ? (
                      <div className={styles.descriptionContainer}>
                        <Link href={postHref} className={styles.descriptionLink} aria-label={merchantName}>
                          <p className={`${styles.description} ${styles.descriptionClickable}`}>{summary}</p>
                        </Link>
                      </div>
                    ) : null}
                  </div>

                  <div className={styles.actionContainer}>
                    {phone ? (
                      <a
                        className={`${styles.callButton} ${statusClass}`}
                        href={toTelHref(phone)}
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
