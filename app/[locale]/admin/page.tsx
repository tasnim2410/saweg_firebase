import { getLocale, getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AUTH_COOKIE_NAME, verifySessionToken } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { isAdminIdentifier } from '@/lib/admin';

export default async function AdminPage() {
  const locale = await getLocale();
  const t = await getTranslations('admin');

  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) redirect(`/${locale}/login?next=/${locale}/admin`);

  let session;
  try {
    session = await verifySessionToken(token);
  } catch {
    redirect(`/${locale}/login?next=/${locale}/admin`);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, fullName: true, email: true, phone: true },
  });

  if (!user) redirect(`/${locale}/login?next=/${locale}/admin`);

  const isAdmin = Boolean(
    (user.email && isAdminIdentifier(user.email)) || (user.phone && isAdminIdentifier(user.phone))
  );

  if (!isAdmin) redirect(`/${locale}`);

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>{t('title')}</h1>
      <p style={{ marginTop: '0.5rem' }}>{t('welcome', { name: user.fullName })}</p>
    </div>
  );
}
