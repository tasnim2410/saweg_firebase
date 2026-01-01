import { SignJWT, jwtVerify } from 'jose';

export const AUTH_COOKIE_NAME = 'saweg_session';

type SessionPayload = {
  sub: string;
  email?: string | null;
  phone?: string | null;
  type?: string | null;
};

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('Missing AUTH_SECRET');
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(payload: SessionPayload) {
  const secretKey = getSecretKey();

  return new SignJWT({
    email: payload.email ?? undefined,
    phone: payload.phone ?? undefined,
    type: payload.type ?? undefined,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);
}

export async function verifySessionToken(token: string) {
  const secretKey = getSecretKey();
  const { payload } = await jwtVerify(token, secretKey);

  const sub = typeof payload.sub === 'string' ? payload.sub : undefined;
  const email = typeof payload.email === 'string' ? payload.email : undefined;
  const phone = typeof payload.phone === 'string' ? payload.phone : undefined;
  const type = typeof payload.type === 'string' ? payload.type : undefined;

  if (!sub) throw new Error('Invalid session token');

  return { userId: sub, email, phone, type };
}

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
  // Try NextRequest-style cookies first if available
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
    const { userId, email, phone, type } = await verifySessionToken(token);
    return { user: { id: userId, email: email ?? null, phone: phone ?? null, type: type ?? null } };
  } catch {
    return null;
  }
}
