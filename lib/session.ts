export const AUTH_COOKIE_NAME = '__session';

// Lightweight cookie parser for standard Request objects
function parseCookieHeader(header: string | null | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!header) return result;
  for (const part of header.split(';')) {
    const [rawKey, ...rest] = part.split('=');
    const key = rawKey?.trim();
    if (!key) continue;
    const value = rest.join('=').trim();
    try {
      result[key] = decodeURIComponent(value);
    } catch {
      result[key] = value;
    }
  }
  return result;
}

// Returns a session object compatible with callers expecting session.user.id
export async function getSession(req: Request) {
  const { adminAuth } = await import('./firebase-admin');
  const { prisma } = await import('./prisma');

  const anyReq = req as any;
  let token: string | undefined;
  if (anyReq?.cookies && typeof anyReq.cookies.get === 'function') {
    token = anyReq.cookies.get(AUTH_COOKIE_NAME)?.value;
  }
  if (!token) {
    const cookies = parseCookieHeader(req.headers?.get('cookie'));
    token = cookies[AUTH_COOKIE_NAME];
  }

  if (!token) return null;

  try {
    const decoded = await adminAuth.verifySessionCookie(token, true);
    const user = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
      select: { id: true, email: true, phone: true, type: true },
    });
    if (!user) return null;
    return {
      user: {
        id: user.id,
        email: user.email ?? null,
        phone: user.phone ?? null,
        type: user.type as string ?? null,
      },
    };
  } catch {
    return null;
  }
}
