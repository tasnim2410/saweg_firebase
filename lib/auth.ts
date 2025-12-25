import bcrypt from 'bcryptjs';
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

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
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

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string) {
  return phone.trim();
}

export function getAdminIdentifiers() {
  const raw = process.env.ADMIN_IDENTIFIERS ?? '';
  return raw
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => (x.includes('@') ? x.toLowerCase() : x));
}

export function isAdminIdentifier(identifier: string) {
  const admins = getAdminIdentifiers();
  const normalized = identifier.includes('@') ? identifier.trim().toLowerCase() : identifier.trim();
  return admins.includes(normalized);
}
