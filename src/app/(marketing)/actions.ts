'use server';

import { createHash } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebaseAdmin';
import { BETA_ROLES, BETA_ROUTES, type BetaSignupInput } from '@/lib/beta';

/**
 * Early-access sign-ups from the public landing page.
 *
 * A public, unauthenticated endpoint, so every field is re-validated here and
 * nothing from the payload is spread into the write. `beta_signups` has no
 * client rules at all (it falls through to deny-all); only this action writes it.
 */

export interface BetaResult {
  success: boolean;
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9 ()-]{7,20}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function joinBeta(raw: unknown): Promise<BetaResult> {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof BetaSignupInput, unknown>>;

  // A filled honeypot is a bot. Report success so it has no signal to adapt to.
  if (text(input.website, 200)) return { success: true };

  const name = text(input.name, 80);
  const email = text(input.email, 120).toLowerCase();
  const phone = text(input.phone, 30);
  const role = text(input.role, 20);
  const route = text(input.route, 60);
  const travelDate = text(input.travelDate, 10);

  if (name.length < 2) return { success: false, error: 'Please enter your name.' };
  if (!EMAIL_RE.test(email)) return { success: false, error: 'Please enter a valid email address.' };
  if (phone && !PHONE_RE.test(phone)) return { success: false, error: 'Please check the phone number.' };
  if (!(BETA_ROLES as readonly string[]).includes(role)) return { success: false, error: 'Choose traveler, sender or both.' };
  if (route && !(BETA_ROUTES as readonly string[]).includes(route)) return { success: false, error: 'Choose a route from the list.' };
  if (travelDate && (!DATE_RE.test(travelDate) || Number.isNaN(Date.parse(travelDate)))) {
    return { success: false, error: 'Please check the travel date.' };
  }

  // One row per email: signing up twice updates the answers instead of
  // creating a duplicate. The id is a hash so the email is not in a URL path.
  const ref = adminDb.collection('beta_signups').doc(createHash('sha256').update(email).digest('hex').slice(0, 32));

  try {
    await adminDb.runTransaction(async (tx) => {
      const existing = await tx.get(ref);
      tx.set(ref, {
        name,
        email,
        phone: phone || null,
        role,
        route: route || null,
        travelDate: travelDate || null,
        updatedAt: FieldValue.serverTimestamp(),
        ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      }, { merge: true });
    });
    return { success: true };
  } catch (error) {
    console.error('[beta] sign-up failed:', error);
    return { success: false, error: 'We couldn’t save your sign-up just now. Please try again in a moment.' };
  }
}
