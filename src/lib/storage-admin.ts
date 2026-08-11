import 'server-only';
import * as admin from 'firebase-admin';
import './firebaseAdmin'; // side-effect: ensures the Admin app is initialized

/**
 * Mints a short-lived read URL for a private Storage object.
 *
 * KYC objects are unreadable by clients (`allow read: if false` in
 * storage.rules) — a V4 signed URL is authorized by the service-account
 * signature over the GCS API instead, which is why it can serve them without
 * weakening those rules.
 *
 * Callers are responsible for authorizing the request BEFORE calling this;
 * this function performs no access control of its own.
 */
export async function signStoragePath(
  storagePath: string,
  expiresInMs = 60 * 60 * 1000
): Promise<string | null> {
  if (!storagePath) return null;

  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!bucketName) {
    console.error('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not set — cannot sign storage paths.');
    return null;
  }

  try {
    // Named explicitly rather than relying on the app default: a hot-reloaded
    // dev server reuses the already-registered Admin app, so a storageBucket
    // added to initializeApp later would not take effect.
    const [url] = await admin
      .storage()
      .bucket(bucketName)
      .file(storagePath)
      .getSignedUrl({ version: 'v4', action: 'read', expires: Date.now() + expiresInMs });
    return url;
  } catch (error) {
    console.error('Failed to sign storage path:', storagePath, error);
    return null;
  }
}

/** True when `storagePath` lives inside the given user's own KYC folder. */
export function isOwnKycPath(storagePath: string, uid: string): boolean {
  return typeof storagePath === 'string' && storagePath.startsWith(`kyc/${uid}/`);
}
