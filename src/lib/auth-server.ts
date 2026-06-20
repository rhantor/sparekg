import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { adminAuth } from './firebaseAdmin';

export const SESSION_COOKIE = 'session';
// Firebase session cookies can live up to 14 days.
export const SESSION_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export interface ServerUser {
  uid: string;
  email: string | null;
  admin: boolean;
  superAdmin: boolean;
  kycApproved: boolean;
}

/**
 * Mint a Firebase session cookie from a freshly-issued ID token.
 * The ID token is verified by the Admin SDK before the cookie is created.
 */
export async function createSessionCookie(idToken: string): Promise<string> {
  return adminAuth.createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
}

/**
 * Read and verify the current user from the session cookie.
 * Returns null when there is no valid session. Memoized per request.
 */
export const getServerUser = cache(async (): Promise<ServerUser | null> => {
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!cookie) return null;

  try {
    // checkRevoked = true so disabled/revoked accounts lose access immediately.
    const decoded = await adminAuth.verifySessionCookie(cookie, true);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      admin: decoded.admin === true,
      superAdmin: decoded.superAdmin === true,
      kycApproved: decoded.kycApproved === true,
    };
  } catch {
    // Invalid/expired/revoked cookie — treat as signed out.
    return null;
  }
});

/**
 * Authorization guard for admin-only server work. Returns the verified admin
 * user, or throws so the caller fails closed. Never trust a client-supplied uid.
 */
export async function requireAdmin(): Promise<ServerUser> {
  const user = await getServerUser();
  if (!user || !user.admin) {
    throw new Error('Unauthorized: admin privileges required.');
  }
  return user;
}
