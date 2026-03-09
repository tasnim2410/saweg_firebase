import { adminStorage } from './firebase-admin';

export function cloudinaryEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
}

export async function uploadImageBuffer(params: {
  buffer: Buffer;
  folder: string;
  publicId?: string;
  contentType?: string;
}): Promise<{ url: string; publicId: string }> {
  if (!cloudinaryEnabled()) {
    throw new Error('FIREBASE_STORAGE_NOT_CONFIGURED');
  }

  const bucket = adminStorage.bucket();
  const filename = `${params.folder}/${params.publicId ?? `upload-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`}`;
  const file = bucket.file(filename);

  await file.save(params.buffer, {
    metadata: {
      contentType: params.contentType ?? 'image/jpeg',
    },
  });

  await file.makePublic();

  const url = `https://storage.googleapis.com/${bucket.name}/${filename}`;
  return { url, publicId: filename };
}
