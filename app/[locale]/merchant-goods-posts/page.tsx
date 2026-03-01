import Footer from '@/components/Footer';
import styles from './MerchantGoodsPosts.module.css';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getLocationLabel } from '@/lib/locations';
import { MapPin, Phone, Truck, Package, Calendar, Scale } from 'lucide-react';

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
  const arrow = locale === 'ar' ? '→' : '←';
  const lang = locale === 'ar' ? 'ar' : 'en';

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
    <main className={styles.main}>
      <Link 
        href={`/${locale}`} 
        className={styles.backButton} 
        aria-label={locale === 'ar' ? 'الرجوع إلى الرئيسية' : 'Back to home'}
      >
        {arrow}
      </Link>

      <div className={styles.pageContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
          <span className={styles.counter}>
            {posts.length} {locale === 'ar' ? (posts.length === 1 ? 'طلب' : 'طلبات') : (posts.length === 1 ? 'request' : 'requests')}
          </span>
        </div>

        <div className={styles.grid}>
          {posts.map((post) => {
            const merchantName = (post.name || post.user?.fullName || '').trim() || (locale === 'ar' ? 'تاجر' : 'Merchant');
            const startLabel = getLocationLabel(post.startingPoint || '-', lang);
            const destLabel = getLocationLabel(post.destination || '-', lang);

            const createdAtMs = post.createdAt ? new Date(post.createdAt as any).getTime() : NaN;
            const timeAgo = timeAgoLabelFromMs(createdAtMs);

            const summaryParts: string[] = [];
            if (post.goodsType) summaryParts.push(post.goodsType);
            if (Number.isFinite(post.goodsWeight as any) && post.goodsWeightUnit) {
              const unitLabel = locale === 'ar' 
                ? (post.goodsWeightUnit === 'ton' ? 'طن' : 'كغ')
                : post.goodsWeightUnit;
              summaryParts.push(`${post.goodsWeight} ${unitLabel}`);
            }
            if (post.loadingDate) {
              const d = formatDate(post.loadingDate);
              if (d) summaryParts.push(d);
            }
            const summary = summaryParts.filter(Boolean).join(' • ');

            const description = (post.description || '').trim();
            const shortDesc = description.length > 120 ? `${description.slice(0, 120)}...` : description;

            const phone = (post.phone || post.user?.phone || '').trim();
            const postHref = `/${locale}/merchant-goods-posts/${post.id}`;

            return (
              <div key={post.id} className={styles.card}>
                <Link href={postHref} className={styles.cardImageLink}>
                  <img
                    src={post.image || '/images/logo.png'}
                    alt={merchantName}
                    className={styles.cardImage}
                    style={!post.image ? { filter: 'grayscale(100%)' } : undefined}
                  />
                  {timeAgo && <span className={styles.timeBadge}>{timeAgo}</span>}
                </Link>

                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{merchantName}</h3>

                  {post.goodsType && (
                    <div className={styles.goodsBadge}>
                      <Package size={16} />
                      <span>{post.goodsType}</span>
                    </div>
                  )}

                  {Number.isFinite(post.goodsWeight as any) && post.goodsWeightUnit && (
                    <div className={styles.weightBadge}>
                      <Scale size={14} />
                      <span>
                        {post.goodsWeight} {locale === 'ar' 
                          ? (post.goodsWeightUnit === 'ton' ? 'طن' : 'كغ')
                          : post.goodsWeightUnit}
                      </span>
                    </div>
                  )}

                  {post.loadingDate && (
                    <div className={styles.dateBadge}>
                      <Calendar size={14} />
                      <span>{formatDate(post.loadingDate)}</span>
                    </div>
                  )}

                  {shortDesc && (
                    <p className={styles.cardDescription}>{shortDesc}</p>
                  )}

                  <div className={styles.cardMeta}>
                    <span className={styles.locationBadge}>
                      <MapPin size={12} />
                      {startLabel}
                    </span>
                    <span className={styles.destinationBadge}>
                      <Truck size={12} />
                      {destLabel}
                    </span>
                  </div>

                  <div className={styles.cardActions}>
                    {phone ? (
                      <a
                        href={toTelHref(phone)}
                        onClick={() => {
                          void fetch(`/api/merchant-goods-posts/${post.id}/calls`, {
                            method: 'POST',
                            keepalive: true,
                          }).catch(() => null);
                        }}
                        className={styles.callButton}
                        aria-label={locale === 'ar' ? 'اتصال' : 'Call'}
                      >
                        <Phone size={16} />
                        <span>{locale === 'ar' ? 'اتصال' : 'Call'}</span>
                      </a>
                    ) : (
                      <span className={`${styles.callButton} ${styles.callButtonInactive}`}>-</span>
                    )}
                    <Link 
                      href={postHref}
                      className={styles.detailsButton}
                    >
                      {locale === 'ar' ? 'التفاصيل' : 'Details'} →
                    </Link>
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
