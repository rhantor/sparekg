/**
 * Early-access sign-up options, shared by the landing form and the server
 * action that validates it — so the two can never accept different values.
 */

export const BETA_ROLES = ['Traveler', 'Sender', 'Both'] as const;
export type BetaRole = (typeof BETA_ROLES)[number];

export const BETA_ROUTES = [
  'Kuala Lumpur → Dhaka',
  'Kuala Lumpur → Chittagong',
  'Penang → Dhaka',
  'Malaysia → Bangladesh (other)',
  'Other',
] as const;

export interface BetaSignupInput {
  name: string;
  email: string;
  phone: string;
  role: BetaRole;
  route: string;
  travelDate: string;
  /** Honeypot: hidden from people, filled in by bots. */
  website: string;
}
