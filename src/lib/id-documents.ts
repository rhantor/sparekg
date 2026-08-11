import type { IdType } from './types';

/**
 * Shape of each accepted identity document. A passport is a bound booklet, so
 * only its photo page is captured; ID cards and licences carry data on both
 * faces and require two images.
 *
 * Shared by the applicant form and the admin review queue so the two can never
 * disagree about what a complete submission looks like.
 */
export interface IdDocumentSpec {
  /** Human-readable name for the document itself. */
  name: string;
  frontLabel: string;
  frontHint: string;
  /** null when the document has no second side. */
  backLabel: string | null;
  backHint: string | null;
}

export const ID_DOC_SPEC: Record<IdType, IdDocumentSpec> = {
  PASSPORT: {
    name: 'Passport',
    frontLabel: 'Passport photo page',
    frontHint: 'The page with your photo and the machine-readable code at the bottom.',
    backLabel: null,
    backHint: null,
  },
  NATIONAL_ID: {
    name: 'National ID',
    frontLabel: 'National ID — front',
    frontHint: 'The side showing your photo and ID number.',
    backLabel: 'National ID — back',
    backHint: 'The side showing your address or signature.',
  },
  DRIVERS_LICENSE: {
    name: "Driver's licence",
    frontLabel: "Driver's licence — front",
    frontHint: 'The side showing your photo and licence number.',
    backLabel: "Driver's licence — back",
    backHint: 'The side showing your address or signature.',
  },
};

/** Falls back gracefully for submissions stored before a type was added. */
export function getIdDocSpec(idType: string): IdDocumentSpec {
  return (
    ID_DOC_SPEC[idType as IdType] ?? {
      name: idType || 'Unknown document',
      frontLabel: 'Document — front',
      frontHint: '',
      backLabel: 'Document — back',
      backHint: '',
    }
  );
}
