import type { TicketRejectionReason } from './types';

/**
 * Wording for each ticket rejection reason: `label` for the staff form,
 * `message` for the traveler. Keyed by the full union, so it doubles as the
 * list of reasons the admin form offers.
 */
export const TICKET_REJECTION_REASONS: Record<TicketRejectionReason, { label: string; message: string }> = {
  NAME_MISMATCH: {
    label: 'Name does not match verified identity',
    message: 'The name on the ticket does not match your verified identity.',
  },
  FLIGHT_MISMATCH: {
    label: 'Flight, date or route does not match',
    message: 'The flight number, date or route on the ticket does not match this listing.',
  },
  UNREADABLE: {
    label: 'Unreadable / blurry',
    message: 'We could not read your ticket. Post the flight again with a clearer picture.',
  },
  NOT_A_TICKET: {
    label: 'Not a ticket or booking',
    message: 'The file you uploaded is not a ticket or booking confirmation.',
  },
  SUSPICIOUS: {
    label: 'Suspicious / edited',
    message: 'Your ticket could not be accepted. Contact support if you think this is a mistake.',
  },
  OTHER: {
    label: 'Other',
    message: 'Your ticket could not be verified. Contact support for details.',
  },
};
