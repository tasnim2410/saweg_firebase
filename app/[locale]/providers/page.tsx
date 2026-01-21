import Header from '@/components/Header';
import Footer from '@/components/Footer';
import styles from '@/components/CarouselSection.module.css';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getLocationLabel } from '@/lib/locations';

type ProviderListItem = {
  id: number;
  name: string;
  location: string;
  destination: string | null;
  description: string | null;
  image: string | null;
  createdAt: string | Date;
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
    },
    orderBy: { createdAt: 'desc' },
  })) as ProviderListItem[];

  const title = locale === 'ar' ? 'كل عروض السوّاق' : 'All shippers offers';
  const countLabel = locale === 'ar' ? `${providers.length} عرض` : `${providers.length} offers`;

  return (
    <main>
      <Header />
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

            const description = (p.description || '').trim();
            const shortDesc = description.length > 160 ? `${description.slice(0, 160)}...` : description;

            return (
              <Link key={p.id} href={`/${locale}/providers/${p.id}`} className={styles.listItem}>
                <div className={styles.listItemMedia}>
                  <img
                    src={p.image || 'https://via.placeholder.com/520x340/F3F3F3/666666?text=Truck'}
                    alt={p.name}
                  />
                </div>

                <div className={styles.listItemBody}>
                  <div className={styles.listItemTitleRow}>
                    <h3 className={styles.listItemTitle}>{p.name}</h3>
                  </div>

                  <div className={styles.listItemMeta}>
                    <span>{locLabel}</span>
                    {destLabel ? <span>{`→ ${destLabel}`}</span> : null}
                  </div>

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
