/**
 * Site-wide facts used by metadata, the manifest and the legal pages — one
 * place to change them.
 */

export const SITE_NAME = 'SpareKG';
export const SITE_TAGLINE = 'Share the Journey, Share the Weight';
export const SITE_DESCRIPTION =
  'SpareKG connects verified travelers who have spare luggage allowance with people who need to send items from Malaysia to Bangladesh — cheaper and faster than a courier.';

/** Public origin for absolute URLs (Open Graph, canonical). Set per environment. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://sparekg.vercel.app';

/**
 * Where users reach a human. Unset until the team confirms a monitored inbox —
 * the legal pages then point to the in-app channels rather than printing an
 * address nobody reads.
 */
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || null;

/** Date the current Terms, Privacy and Prohibited Items text took effect. */
export const LEGAL_UPDATED = '28 September 2026';
