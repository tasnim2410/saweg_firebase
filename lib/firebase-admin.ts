import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

// Strip BOM (byte-order mark) that may have leaked from secrets
function clean(val: string | undefined): string | undefined {
  return val?.replace(/^\uFEFF/, '');
}

function initAdmin(): App {
  if (getApps().length > 0) return getApps()[0];

  const projectId = clean(process.env.FIREBASE_PROJECT_ID);
  const clientEmail = clean(process.env.FIREBASE_CLIENT_EMAIL);
  const privateKey = clean(process.env.FIREBASE_PRIVATE_KEY)?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.error(
      'Firebase Admin SDK init failed — missing env vars:',
      { projectId: !!projectId, clientEmail: !!clientEmail, privateKey: !!privateKey }
    );
    throw new Error('Firebase Admin SDK credentials not configured');
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket: clean(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  });
}

const adminApp = initAdmin();
export const adminAuth = getAuth(adminApp);
export const adminStorage = getStorage(adminApp);
