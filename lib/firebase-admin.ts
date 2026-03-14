import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getStorage, type Storage } from 'firebase-admin/storage';

// Strip BOM (byte-order mark) that may have leaked from secrets
function clean(val: string | undefined): string | undefined {
  return val?.replace(/^\uFEFF/, '');
}

let _app: App | null = null;
let _auth: Auth | null = null;
let _storage: Storage | null = null;

function getAdminApp(): App {
  if (_app) return _app;
  if (getApps().length > 0) {
    _app = getApps()[0];
    return _app;
  }

  const projectId = clean(process.env.FIREBASE_PROJECT_ID);
  const clientEmail = clean(process.env.FIREBASE_CLIENT_EMAIL);
  const privateKey = clean(process.env.FIREBASE_PRIVATE_KEY)?.replace(/\\n/g, '\n');

  console.log('Firebase Admin SDK init — env check:', {
    projectId: projectId ? `${projectId.substring(0, 8)}...` : 'MISSING',
    clientEmail: clientEmail ? `${clientEmail.substring(0, 12)}...` : 'MISSING',
    privateKey: privateKey ? `${privateKey.substring(0, 20)}...` : 'MISSING',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'MISSING',
  });

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin SDK credentials not configured');
  }

  _app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket: clean(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  });
  return _app;
}

// Lazy getters — module loads successfully even if env vars are missing
export const adminAuth: Auth = new Proxy({} as Auth, {
  get(_, prop) {
    if (!_auth) _auth = getAuth(getAdminApp());
    return (_auth as any)[prop];
  },
});

export const adminStorage: Storage = new Proxy({} as Storage, {
  get(_, prop) {
    if (!_storage) _storage = getStorage(getAdminApp());
    return (_storage as any)[prop];
  },
});
