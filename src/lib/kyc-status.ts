import type { KycStatus, RejectionReason } from './types';

export interface KycStatusPresentation {
  /** Short label for badges and list rows. */
  label: string;
  /** Sentence shown on the verification screen. */
  detail: string;
  /** Tailwind classes for a pill badge. */
  badgeCls: string;
  /** Whether the user may (re)submit documents in this state. */
  canSubmit: boolean;
}

const NOT_SUBMITTED: KycStatusPresentation = {
  label: 'Not verified',
  detail: 'Verify your identity to post flights or place bids.',
  badgeCls: 'text-amber-700 bg-amber-500/10',
  canSubmit: true,
};

const BY_STATUS: Record<KycStatus, KycStatusPresentation> = {
  PENDING: {
    label: 'Under review',
    detail: 'Your documents are in the review queue. This usually completes within a few hours.',
    badgeCls: 'text-ocean bg-ocean/10',
    canSubmit: false,
  },
  UNDER_REVIEW: {
    label: 'Under review',
    detail: 'A reviewer is checking your documents right now.',
    badgeCls: 'text-ocean bg-ocean/10',
    canSubmit: false,
  },
  APPROVED: {
    label: 'Verified',
    detail: 'Your identity has been verified. You have full access to flights and bidding.',
    badgeCls: 'text-leaf bg-leaf/10',
    canSubmit: false,
  },
  REJECTED: {
    label: 'Rejected',
    detail: 'Your submission was not accepted. Review the reason below and submit again.',
    badgeCls: 'text-rose-700 bg-rose-500/10',
    canSubmit: true,
  },
};

export function presentKycStatus(status: KycStatus | null): KycStatusPresentation {
  return status ? BY_STATUS[status] ?? NOT_SUBMITTED : NOT_SUBMITTED;
}

/**
 * Reviewer-selected reasons, phrased for the applicant.
 *
 * Keyed by the `RejectionReason` union rather than by `string`, so adding a
 * reason without applicant-facing wording is a compile error instead of an
 * `undefined` message on someone's verification screen. It doubles as the
 * server-side allowlist — see `isRejectionReason`.
 */
export const REJECTION_REASON_TEXT: Record<RejectionReason, string> = {
  DOC_BLURRY: 'The document image was too blurry or unreadable.',
  NAME_MISMATCH: 'The name on the document did not match your account.',
  EXPIRED_ID: 'The document has expired.',
  SELFIE_MISMATCH: 'The selfie did not match the photo on the document.',
  INCOMPLETE_DOC: 'The document was incomplete — part of it was cut off or missing.',
  SUSPICIOUS_DOCUMENT: 'The document could not be accepted. Please contact support.',
  UNDERAGE: 'The date of birth on the document does not meet the minimum age.',
  OTHER: 'Your submission could not be accepted.',
};

/**
 * Narrows an untrusted value to a `RejectionReason`.
 *
 * A server action is a public HTTP endpoint — the `<select>` in the review form
 * constrains nothing. Without this, an arbitrary string lands in a field the
 * schema declares as this union and is echoed back to the applicant.
 */
export function isRejectionReason(value: unknown): value is RejectionReason {
  return typeof value === 'string' && value in REJECTION_REASON_TEXT;
}
