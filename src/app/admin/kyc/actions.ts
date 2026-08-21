'use server';

import * as admin from 'firebase-admin';
import { adminDb } from '@/lib/firebaseAdmin';
import { requireAdmin } from '@/lib/auth-server';
import { signStoragePath } from '@/lib/storage-admin';
import { auditContext, stageAudit } from '@/lib/audit';
import { REJECTION_REASON_TEXT, isRejectionReason } from '@/lib/kyc-status';
import type { KycStatus } from '@/lib/types';

/**
 * Admin review of identity submissions.
 *
 * Every export here is a public HTTP endpoint. The `<select>` and the button
 * states in KycReviewForm constrain nothing — authorization comes from the
 * verified session cookie and arguments are validated from scratch.
 */

export interface KycActionResult {
  success: boolean;
  error?: string;
}

/**
 * A failure whose message is safe to show the reviewer — a guard fired, and the
 * reviewer needs to know which one. Anything else is reported generically so an
 * internal error string never reaches the browser.
 */
class ReviewError extends Error {}

/** Statuses a submission can still be decided from. */
const DECIDABLE: KycStatus[] = ['PENDING', 'UNDER_REVIEW'];

function requireSubmissionId(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ReviewError('Missing submission reference.');
  }
  return value.trim();
}

/**
 * What both decisions do identically: load the submission and its applicant,
 * refuse anything already settled, then hand the writes to the caller.
 * Authorization is the caller's — it happens before any argument is trusted.
 *
 * Runs as a transaction so the status guard actually holds. Two reviewers
 * opening the same queue item is the ordinary case, not the exotic one, and a
 * read-then-write outside a transaction lets both of them pass the guard and
 * the second overwrite the first.
 */
async function decide(
  submissionIdInput: unknown,
  decision: 'APPROVED' | 'REJECTED',
  apply: (args: {
    tx: admin.firestore.Transaction;
    submissionRef: admin.firestore.DocumentReference;
    userRef: admin.firestore.DocumentReference;
    submission: admin.firestore.DocumentData;
    fromStatus: KycStatus;
    reviewedAt: string;
  }) => void,
): Promise<void> {
  const submissionId = requireSubmissionId(submissionIdInput);
  const reviewedAt = new Date().toISOString();

  const submissionRef = adminDb.collection('kyc_submissions').doc(submissionId);

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(submissionRef);
    if (!snap.exists) throw new ReviewError('That submission no longer exists.');
    const submission = snap.data()!;

    const fromStatus = submission.status as KycStatus;
    if (!DECIDABLE.includes(fromStatus)) {
      // Re-deciding a settled submission is the bug that lets a rejection be
      // silently flipped back to approved. Suspension (`users.suspended`) is the
      // route for withdrawing access after the fact, not a second review.
      throw new ReviewError(
        fromStatus === decision
          ? `This submission was already ${decision.toLowerCase()}.`
          : `This submission was already reviewed (${fromStatus.toLowerCase()}) and cannot be changed.`,
      );
    }

    const userId = submission.userId;
    if (typeof userId !== 'string' || !userId) {
      throw new ReviewError('This submission is not linked to an account.');
    }

    // Read before writing, and before `apply` — Firestore requires every read in
    // a transaction to precede every write. `tx.update` on a missing document
    // fails the whole transaction with an opaque error, so check it here where
    // the reviewer can be told what actually went wrong.
    const userRef = adminDb.collection('users').doc(userId);
    if (!(await tx.get(userRef)).exists) {
      throw new ReviewError('The applicant’s account no longer exists.');
    }

    apply({ tx, submissionRef, userRef, submission, fromStatus, reviewedAt });
  });
}

/** Maps a thrown error onto the form's result shape. */
function toResult(error: unknown, verb: string): KycActionResult {
  if (error instanceof ReviewError) {
    return { success: false, error: error.message };
  }
  // requireAdmin throws a plain Error; don't echo it, but don't call it a
  // generic failure either — the reviewer's session may simply have expired.
  if (error instanceof Error && error.message.startsWith('Unauthorized')) {
    return { success: false, error: 'Your session is not authorised to review submissions. Sign in again.' };
  }
  console.error(`Error ${verb} KYC:`, error);
  return { success: false, error: `Failed to ${verb} the submission. Please try again.` };
}

// ---------------------------------------------------------------------------

/** Mints a short-lived signed URL for a KYC document. Admins only. */
export async function getSignedImageUrl(storagePath: string) {
  if (!storagePath) return null;

  // KYC documents are sensitive — only admins may mint signed URLs for them.
  await requireAdmin();

  return signStoragePath(storagePath);
}

/**
 * Approves a submission.
 *
 * Deliberately writes no audit row: `onKycApproved` (functions/src/index.ts)
 * logs KYC_APPROVED, and it does so only after `setCustomUserClaims` actually
 * succeeds. Logging here as well would double every approval and, worse, would
 * record an approval that the claim grant later failed to complete. The trigger
 * attributes the row to `assignedAdminId`, which this write sets.
 */
export async function approveKycSubmission(submissionId: string): Promise<KycActionResult> {
  try {
    const adminUser = await requireAdmin();

    await decide(submissionId, 'APPROVED', ({ tx, submissionRef, userRef, reviewedAt }) => {
      tx.update(submissionRef, {
        status: 'APPROVED' satisfies KycStatus,
        assignedAdminId: adminUser.uid,
        reviewedAt,
        rejectionReason: null,
        userRejectionMessage: null,
      });
      // The kycApproved custom claim is granted by the onKycApproved trigger
      // watching this document; the claim, not this field, is what the callables
      // check before allowing a user to post or bid.
      tx.update(userRef, { kycStatus: 'APPROVED' satisfies KycStatus });
    });

    return { success: true };
  } catch (error) {
    return toResult(error, 'approve');
  }
}

/**
 * Rejects a submission with a reason from the fixed set.
 *
 * Audited here because nothing else is: there is no `onKycRejected` trigger, so
 * without this row a rejection leaves no trace of who made it.
 */
export async function rejectKycSubmission(
  submissionId: string,
  reason: string,
): Promise<KycActionResult> {
  try {
    const adminUser = await requireAdmin();

    if (!isRejectionReason(reason)) {
      throw new ReviewError('Choose a rejection reason from the list.');
    }
    // Read outside the transaction: transaction bodies retry, and request
    // headers do not change between attempts.
    const ctx = await auditContext();

    await decide(
      submissionId,
      'REJECTED',
      ({ tx, submissionRef, userRef, submission, fromStatus, reviewedAt }) => {
        tx.update(submissionRef, {
          status: 'REJECTED' satisfies KycStatus,
          assignedAdminId: adminUser.uid,
          reviewedAt,
          rejectionReason: reason,
          // Surfaced to the applicant by getMyKycStatus. Previously never set,
          // so a rejected user saw a reason code and no explanation.
          userRejectionMessage: REJECTION_REASON_TEXT[reason],
        });
        tx.update(userRef, { kycStatus: 'REJECTED' satisfies KycStatus });

        stageAudit(
          tx,
          {
            actorUid: adminUser.uid,
            actorName: adminUser.email ?? adminUser.uid,
            action: 'KYC_REJECTED',
            targetType: 'kyc_submission',
            targetId: submissionRef.id,
            reason,
            beforeState: { status: fromStatus },
            afterState: { status: 'REJECTED', userId: submission.userId },
          },
          ctx,
        );
      },
    );

    return { success: true };
  } catch (error) {
    return toResult(error, 'reject');
  }
}
