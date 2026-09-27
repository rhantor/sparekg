'use server';

import * as admin from 'firebase-admin';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { requireAdmin } from '@/lib/auth-server';
import { auditContext, stageAudit } from '@/lib/audit';

/**
 * Suspending and restoring accounts.
 *
 * A public HTTP endpoint like every server action: authorization comes from the
 * verified session cookie, and arguments are validated from scratch. The
 * `suspended` flag is what every callable checks before acting
 * (requireActiveUser in functions/src/index.ts).
 */

export interface SuspensionResult {
  success: boolean;
  error?: string;
}

/** A guard fired and the message is safe to show; anything else stays generic. */
class SuspensionError extends Error {}

export async function setSuspension(
  uidInput: unknown,
  suspendInput: unknown,
  reasonInput: unknown,
): Promise<SuspensionResult> {
  try {
    const me = await requireAdmin();

    if (typeof uidInput !== 'string' || !uidInput.trim()) throw new SuspensionError('Missing user.');
    if (typeof suspendInput !== 'boolean') throw new SuspensionError('Missing decision.');
    const uid = uidInput.trim();
    const suspend = suspendInput;
    const reason = typeof reasonInput === 'string' ? reasonInput.trim() : '';
    // Mandatory either way (blueprint §6.5.2): the audit row must say why.
    if (reason.length < 10 || reason.length > 500) {
      throw new SuspensionError('Give a reason between 10 and 500 characters.');
    }
    if (uid === me.uid) throw new SuspensionError('You cannot suspend your own account.');

    // Staff accounts are for super admins to act on, so an admin cannot lock a
    // peer (or a super admin) out of the console.
    const target = await adminAuth.getUser(uid).catch(() => null);
    if (!target) throw new SuspensionError('That account no longer exists.');
    if (target.customClaims?.admin === true && !me.superAdmin) {
      throw new SuspensionError('Only a super admin can suspend a staff account.');
    }

    const ctx = await auditContext();
    const ref = adminDb.collection('users').doc(uid);

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new SuspensionError('That account has no profile.');
      const before = {
        suspended: snap.get('suspended') === true,
        suspensionReason: snap.get('suspensionReason') ?? null,
      };
      if (before.suspended === suspend) {
        throw new SuspensionError(suspend ? 'This account is already suspended.' : 'This account is not suspended.');
      }

      const after = { suspended: suspend, suspensionReason: suspend ? reason : null };
      tx.update(ref, {
        ...after,
        suspendedAt: suspend ? admin.firestore.FieldValue.serverTimestamp() : null,
        suspendedBy: suspend ? me.uid : null,
      });
      stageAudit(tx, {
        actorUid: me.uid,
        actorName: me.email ?? me.uid,
        action: suspend ? 'USER_SUSPENDED' : 'USER_UNSUSPENDED',
        targetType: 'user',
        targetId: uid,
        reason,
        beforeState: before,
        afterState: after,
      }, ctx);
    });

    return { success: true };
  } catch (error) {
    if (error instanceof SuspensionError) return { success: false, error: error.message };
    console.error('[admin] setSuspension failed:', error);
    return { success: false, error: 'Could not update the account. Try again.' };
  }
}
