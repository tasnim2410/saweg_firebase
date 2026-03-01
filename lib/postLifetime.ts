export const POST_LIFETIME_DAYS = 4;

export function getDaysRemaining(createdAt: string | Date | null | undefined): {
  daysRemaining: number;
  isExpired: boolean;
  expiresAt: Date | null;
} {
  if (!createdAt) {
    return { daysRemaining: 0, isExpired: true, expiresAt: null };
  }

  const created = new Date(createdAt);
  const expiresAt = new Date(created);
  expiresAt.setDate(expiresAt.getDate() + POST_LIFETIME_DAYS);

  const now = new Date();
  const diffMs = expiresAt.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return {
    daysRemaining: Math.max(0, daysRemaining),
    isExpired: daysRemaining <= 0,
    expiresAt,
  };
}

export function formatDaysRemaining(
  daysRemaining: number,
  locale: string
): string {
  if (daysRemaining <= 0) {
    return locale === 'ar' ? 'منتهي الصلاحية' : 'Expired';
  }
  if (daysRemaining === 1) {
    return locale === 'ar' ? 'يوم متبقي' : '1 day left';
  }
  return locale === 'ar'
    ? `${daysRemaining} أيام متبقية`
    : `${daysRemaining} days left`;
}
