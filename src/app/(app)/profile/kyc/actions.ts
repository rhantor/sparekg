'use server';

import { adminDb } from '@/lib/firebaseAdmin';
import { getServerUser } from '@/lib/auth-server';
import { signStoragePath, isOwnKycPath } from '@/lib/storage-admin';
import { encryptData } from '@/lib/encryption';
import { getIdDocSpec } from '@/lib/id-documents';
import { isRejectionReason } from '@/lib/kyc-status';
import type { IdType, KycStatus, RejectionReason } from '@/lib/types';
import { randomUUID } from 'crypto';

interface KycSubmissionData {
  idType: IdType;
  idNumber: string;
  idCountry: string;
  idFrontUrl: string;
  idBackUrl: string | null;
  selfieUrl: string;
  fullName: string;
  dateOfBirth: string;
}

/** Statuses that mean a submission is already in flight or settled favourably. */
const ACTIVE_STATUSES: KycStatus[] = ['PENDING', 'UNDER_REVIEW', 'APPROVED'];

export async function submitKyc(data: KycSubmissionData) {
  // The signed-in user is taken from the verified session cookie, never from
  // the request body — a client-supplied uid would let anyone file documents
  // against another account and flip that account's kycStatus.
  const me = await getServerUser();
  if (!me) return { success: false, error: 'You must be signed in to submit.' };

  try {
    // Storage paths must live under this user's own folder, otherwise a crafted
    // payload could attach someone else's uploaded documents to this account.
    const paths = [data.idFrontUrl, data.selfieUrl, ...(data.idBackUrl ? [data.idBackUrl] : [])];
    if (paths.some((p) => !isOwnKycPath(p, me.uid))) {
      return { success: false, error: 'Invalid document reference.' };
    }

    // Re-check the document rules server-side; the client form can be bypassed.
    const spec = getIdDocSpec(data.idType);
    if (!data.idFrontUrl || !data.selfieUrl) {
      return { success: false, error: 'Missing required documents.' };
    }
    if (spec.backLabel && !data.idBackUrl) {
      return { success: false, error: `${spec.backLabel} is required.` };
    }
    if (!data.fullName?.trim() || !data.dateOfBirth || !data.idNumber?.trim()) {
      return { success: false, error: 'Missing required personal details.' };
    }

    const userRef = adminDb.collection('users').doc(me.uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return { success: false, error: 'Your profile is not set up yet. Please reload and try again.' };
    }

    // One active submission per user: without this, revisiting the form files a
    // second document set and orphans the first in the moderation queue.
    //
    // Gated on the submission reference, not on kycStatus alone: new accounts are
    // seeded with 'PENDING', so checking the status by itself would reject every
    // first-time applicant as a duplicate.
    const existingStatus = userSnap.data()?.kycStatus as KycStatus | undefined;
    const existingRef = userSnap.data()?.kycSubmissionRef as string | undefined;
    if (existingStatus === 'APPROVED') {
      return { success: false, error: 'Your identity is already verified.' };
    }
    if (existingRef && existingStatus && ACTIVE_STATUSES.includes(existingStatus)) {
      return { success: false, error: 'You already have a submission under review.' };
    }

    const submissionId = randomUUID();
    const submissionDoc = {
      submissionId,
      userId: me.uid,
      idType: data.idType,
      idNumber: encryptData(data.idNumber), // Encrypted at rest
      idCountry: data.idCountry,
      idFrontUrl: data.idFrontUrl,
      idBackUrl: data.idBackUrl,
      selfieUrl: data.selfieUrl,
      livenessScore: null,
      fullName: data.fullName,
      dateOfBirth: data.dateOfBirth,
      status: 'PENDING' as KycStatus,
      assignedAdminId: null,
      reviewNotes: null,
      rejectionReason: null,
      userRejectionMessage: null,
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
    };

    const batch = adminDb.batch();
    batch.set(adminDb.collection('kyc_submissions').doc(submissionId), submissionDoc);
    batch.update(userRef, { kycStatus: 'PENDING', kycSubmissionRef: submissionId });
    await batch.commit();

    return { success: true };
  } catch (error) {
    console.error('Error submitting KYC:', error);
    return { success: false, error: 'Failed to submit KYC documentation.' };
  }
}

export interface KycDocumentView {
  label: string;
  url: string | null;
}

export interface MyKycStatus {
  /** null when the user has never submitted. */
  status: KycStatus | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  idTypeName: string | null;
  /**
   * Narrowed, not passed through: submissions decided before the reason was
   * validated server-side can hold an arbitrary string, and that must not be
   * used to index the applicant-facing wording.
   */
  rejectionReason: RejectionReason | null;
  userRejectionMessage: string | null;
  documents: KycDocumentView[];
}

/**
 * The signed-in user's own KYC state, including short-lived URLs for the
 * documents they uploaded. Scoped to the caller's session — a user can only
 * ever read their own submission.
 */
export async function getMyKycStatus(): Promise<MyKycStatus | null> {
  const me = await getServerUser();
  if (!me) return null;

  const empty: MyKycStatus = {
    status: null,
    submittedAt: null,
    reviewedAt: null,
    idTypeName: null,
    rejectionReason: null,
    userRejectionMessage: null,
    documents: [],
  };

  try {
    const userSnap = await adminDb.collection('users').doc(me.uid).get();
    const userData = userSnap.data();
    const submissionId = userData?.kycSubmissionRef as string | undefined;
    const rawStatus = (userData?.kycStatus as KycStatus | undefined) ?? null;

    if (!submissionId) {
      // `onUserCreate` seeds every account with kycStatus 'PENDING' because the
      // enum has no "not submitted" member, so that field alone cannot tell a
      // brand-new user apart from one awaiting review. The submission reference
      // is the only thing that proves documents were actually filed.
      const neverApplied = rawStatus === null || rawStatus === 'PENDING' || rawStatus === 'UNDER_REVIEW';
      return { ...empty, status: neverApplied ? null : rawStatus };
    }

    const subSnap = await adminDb.collection('kyc_submissions').doc(submissionId).get();
    const sub = subSnap.data();
    // Defence in depth: the reference came from the user's own document, but a
    // mismatch here must never expose another applicant's files.
    if (!sub || sub.userId !== me.uid) return { ...empty, status: rawStatus };

    const spec = getIdDocSpec(sub.idType);
    // Deliberately short-lived: just long enough to render the page.
    const ttl = 10 * 60 * 1000;
    const [frontUrl, backUrl, selfieUrl] = await Promise.all([
      sub.idFrontUrl ? signStoragePath(sub.idFrontUrl, ttl) : Promise.resolve(null),
      sub.idBackUrl ? signStoragePath(sub.idBackUrl, ttl) : Promise.resolve(null),
      sub.selfieUrl ? signStoragePath(sub.selfieUrl, ttl) : Promise.resolve(null),
    ]);

    const documents: KycDocumentView[] = [{ label: spec.frontLabel, url: frontUrl }];
    if (spec.backLabel && sub.idBackUrl) documents.push({ label: spec.backLabel, url: backUrl });
    documents.push({ label: 'Selfie', url: selfieUrl });

    return {
      status: (sub.status as KycStatus) ?? rawStatus,
      submittedAt: sub.submittedAt ?? null,
      reviewedAt: sub.reviewedAt ?? null,
      idTypeName: spec.name,
      rejectionReason: isRejectionReason(sub.rejectionReason) ? sub.rejectionReason : null,
      userRejectionMessage: sub.userRejectionMessage ?? null,
      documents,
    };
  } catch (error) {
    console.error('Failed to load KYC status:', error);
    return empty;
  }
}
