import { SignJWT, jwtVerify } from 'jose';

export const AUTH_COOKIE_NAME = 'saweg_session';

type SessionPayload = {
  sub: string;
  email?: string | null;
  phone?: string | null;
};

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('Missing AUTH_SECRET');
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(payload: SessionPayload) {
  const secretKey = getSecretKey();

  return new SignJWT({ email: payload.email ?? undefined, phone: payload.phone ?? undefined })
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

  if (!sub) throw new Error('Invalid session token');

  return { userId: sub, email, phone };
}
