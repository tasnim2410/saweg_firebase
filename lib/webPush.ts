import webpush from 'web-push';

type PushSubscriptionInput = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

let configured = false;

function ensureConfigured() {
  if (configured) return;

  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!subject || !publicKey || !privateKey) {
    throw new Error('Missing VAPID_SUBJECT, VAPID_PUBLIC_KEY, or VAPID_PRIVATE_KEY');
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export function getVapidPublicKey() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) throw new Error('Missing VAPID_PUBLIC_KEY');
  return publicKey;
}

export async function sendPushToSubscription(
  subscription: PushSubscriptionInput,
  payload: Record<string, unknown>
): Promise<{ ok: true } | { ok: false; gone: boolean; statusCode?: number }> {
  try {
    ensureConfigured();

    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime ?? null,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      JSON.stringify(payload)
    );

    return { ok: true };
  } catch (err: any) {
    const statusCode = typeof err?.statusCode === 'number' ? err.statusCode : undefined;
    const gone = statusCode === 404 || statusCode === 410;
    return { ok: false, gone, statusCode };
  }
}
