import { prisma } from './prisma';

export async function getNotificationClickCounts(
  postType: 'provider' | 'merchant-post' | 'merchant-goods-post',
  postIds: number[]
): Promise<Record<number, number>> {
  if (postIds.length === 0) return {};

  try {
    const clicks = await (prisma as any).notificationClick.groupBy({
      by: ['postId'],
      where: {
        postType,
        postId: { in: postIds },
      },
      _count: {
        id: true,
      },
    });

    const result: Record<number, number> = {};
    for (const click of clicks) {
      if (click.postId) {
        result[click.postId] = click._count.id;
      }
    }

    return result;
  } catch (error) {
    console.error('Error fetching notification click counts:', error);
    return {};
  }
}
