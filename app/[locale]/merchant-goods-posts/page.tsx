import Footer from '@/components/Footer';
import styles from '@/components/CarouselSection.module.css';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getLocationLabel } from '@/lib/locations';

type MerchantGoodsPostListItem = {
  id: number;
  name: string | null;
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
      startingPoint: true,
      destination: true,
      goodsType: true,
      goodsWeight: true,
      goodsWeightUnit: true,
      loadingDate: true,
      image: true,
      description: true,
      createdAt: true,
      user: { select: { fullName: true } },
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

            return (
              <Link key={post.id} href={`/${locale}/merchant-goods-posts/${post.id}`} className={styles.listItem}>
                <div className={styles.listItemMedia}>
                  <img
                    src={post.image || '/images/logo.png'}
                    alt={merchantName}
                    style={!post.image ? { filter: 'grayscale(100%)' } : undefined}
                  />
                </div>

                <div className={styles.listItemBody}>
                  <div className={styles.listItemTitleRow}>
                    <h3 className={styles.listItemTitle}>{merchantName}</h3>
                  </div>

                  <div className={styles.listItemMeta}>
                    <span>{startLabel}</span>
                    <span>{`→ ${destLabel}`}</span>
                  </div>

                  {summary ? <div className={styles.listItemSummary}>{summary}</div> : null}
                  {shortDesc ? <div className={styles.listItemSummary}>{shortDesc}</div> : null}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      <Footer />
    </main>
  );
}
