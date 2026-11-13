// ============================================================
// SpareKG — Full TypeScript Type Definitions
// Mirrors the Firestore schema from the blueprint
// ============================================================

// ---- Enums ----

export type KycStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

export type FlightStatus =
  | 'DRAFT' | 'LIVE' | 'LOCKED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';

export type BidStatus =
  | 'PENDING' | 'AGREED' | 'DECLINED' | 'EXPIRED' | 'WITHDRAWN'
  | 'HANDED_OVER' | 'DELIVERED' | 'DISPUTED' | 'RESOLVED';

/** Staff check of the ticket behind a listing. acceptBid waits for VERIFIED. */
export type TicketStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

/** Mirrors TICKET_REJECTION_REASONS in functions/src/validation.ts. */
export type TicketRejectionReason =
  | 'NAME_MISMATCH' | 'FLIGHT_MISMATCH' | 'UNREADABLE' | 'NOT_A_TICKET' | 'SUSPICIOUS' | 'OTHER';

/**
 * Settlement state of an agreed deal. v1 settles directly between the parties,
 * so this records where settlement stands — the platform holds no money.
 */
export type PayoutStatus = 'PENDING' | 'RELEASED' | 'REFUNDED' | 'DISPUTED';

export type DisputeStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED_FOR_SENDER' | 'RESOLVED_FOR_TRAVELER' | 'SPLIT' | 'CLOSED_INVALID';

export type IdType = 'PASSPORT' | 'NATIONAL_ID' | 'DRIVERS_LICENSE';

export type RejectionReason =
  | 'DOC_BLURRY' | 'NAME_MISMATCH' | 'EXPIRED_ID'
  | 'SELFIE_MISMATCH' | 'INCOMPLETE_DOC' | 'SUSPICIOUS_DOCUMENT'
  | 'UNDERAGE' | 'OTHER';

export type UserRole = 'traveler' | 'sender';
export type AdminRole = 'admin' | 'super_admin';

export type ReportSeverity = 'prohibited_goods' | 'harassment' | 'off_platform' | 'other';
export type ReportStatus = 'NEW' | 'UNDER_REVIEW' | 'DISMISSED' | 'ACTION_TAKEN' | 'ESCALATED';

export type AuditAction =
  | 'KYC_APPROVED' | 'KYC_REJECTED' | 'KYC_ESCALATED'
  | 'USER_SUSPENDED' | 'USER_UNSUSPENDED' | 'USER_DELETED'
  | 'POINTS_ADJUSTED' | 'ROLE_GRANTED' | 'ROLE_REVOKED'
  | 'DISPUTE_RESOLVED' | 'CONTENT_UPDATED' | 'CONFIG_CHANGED'
  | 'REPORT_DISMISSED' | 'REPORT_ACTION_TAKEN'
  | 'FLIGHT_TICKET_VERIFIED' | 'FLIGHT_TICKET_REJECTED';

// ---- Denormalized Maps ----

export interface TravelerInfo {
  displayName: string;
  photoUrl: string | null;
  averageRating: number;
  completedTripsAsTraveler: number;
  kycVerified: boolean;
}

export interface SenderInfo {
  displayName: string;
  photoUrl: string | null;
  averageRating: number;
  completedTripsAsSender: number;
}

// ---- Collection Documents ----

export interface User {
  uid: string;
  email: string;
  phone: string | null;
  displayName: string;
  photoUrl: string | null;
  roles: UserRole[];
  kycStatus: KycStatus;
  kycSubmissionRef: string | null;
  completedTripsAsTraveler: number;
  completedTripsAsSender: number;
  averageRating: number;
  ratingCount: number;
  preferredLanguage: 'BN' | 'EN';
  homeAirportCode: string | null;
  createdAt: string;
  lastActiveAt: string;
  suspended: boolean;
  suspensionReason: string | null;
}

export interface KycSubmission {
  submissionId: string;
  userId: string;
  idType: IdType;
  idNumber: string; // encrypted
  idCountry: string;
  idFrontUrl: string;
  idBackUrl: string | null;
  selfieUrl: string;
  livenessScore: number | null;
  fullName: string;
  dateOfBirth: string;
  status: KycStatus;
  assignedAdminId: string | null;
  reviewNotes: string | null;
  rejectionReason: RejectionReason | null;
  userRejectionMessage: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  // Denormalized user info for display
  user?: Pick<User, 'displayName' | 'email' | 'photoUrl' | 'createdAt'>;
}

export interface Flight {
  flightId: string;
  travelerId: string;
  traveler: TravelerInfo;
  originAirport: string;
  destinationAirport: string;
  routeKey: string;
  departureAt: string;
  arrivalAt: string;
  airline: string;
  flightNumber: string;
  totalKgAvailable: number;
  kgRemaining: number;
  pricePerKg: number | null;
  fixedTotalPrice: number | null;
  currency: string;
  acceptedCategories: string[];
  prohibitedItems: string[];
  specialNotes: string | null;
  status: FlightStatus;
  bidCount: number;
  /** Absent on listings posted before ticket proof was required. */
  ticketStatus?: TicketStatus;
  createdAt: string;
  updatedAt: string;
}

/** One scheduled flight as reported by the flight-data provider (lookupFlight). */
export interface FlightScheduleMatch {
  airline: string;
  flightNumber: string;
  originAirport: string;
  destinationAirport: string;
  /** ISO-8601 UTC. */
  departureAt: string;
  arrivalAt: string | null;
  /** Both airports are on a corridor the marketplace serves. */
  served: boolean;
}

export interface LookupFlightResult {
  flights: FlightScheduleMatch[];
}

/** Private proof behind a listing (`flight_tickets/{flightId}`) — traveler and staff only. */
export interface FlightTicket {
  flightId: string;
  travelerId: string;
  storagePath: string;
  contentType: string;
  /** Listing vs. the provider's published schedule, from cached lookups only. */
  scheduleCheck?: 'MATCH' | 'MISMATCH' | 'UNCHECKED';
  reviewStatus?: TicketStatus;
  rejectionReason?: TicketRejectionReason | null;
  reviewedAt?: string | null;
  createdAt: string;
}

export interface Bid {
  bidId: string;
  flightId: string;
  travelerId: string;
  senderId: string;
  sender: SenderInfo;
  kgRequested: number;
  itemCategory: string;
  itemDescription: string;
  declaredValue: number;
  specialHandling: string | null;
  offeredPricePerKg: number | null;
  offeredTotal: number;
  status: BidStatus;
  agreedAt: string | null;
  expiresAt: string;
  transactionId: string | null;
  createdAt: string;
}

/** A party to a deal, as revealed to the other once the bid is AGREED. */
export interface DealParty {
  displayName: string;
  phone: string | null;
}

/**
 * An agreed deal (`transactions/{bidId}`) — created by acceptBid, readable by
 * its two parties only. Shares its bid's id and mirrors its status.
 */
export interface Transaction {
  transactionId: string;
  bidId: string;
  flightId: string;
  travelerId: string;
  senderId: string;
  status: BidStatus;
  flight: {
    originAirport: string;
    destinationAirport: string;
    airline: string;
    flightNumber: string;
    departureAt: string;
    arrivalAt: string | null;
  };
  item: {
    description: string;
    category: string;
    declaredValue: number;
    specialHandling: string | null;
  };
  kg: number;
  totalPrice: number;
  currency: string;
  platformFee: number;
  payoutToTraveler: number;
  payoutStatus: PayoutStatus;
  parties: { traveler: DealParty; sender: DealParty };
  /** Sender's "handed over". */
  handoffConfirmedAt: string | null;
  handoffNote: string | null;
  /** Traveler's "received". Both set → HANDED_OVER. */
  pickupConfirmedAt: string | null;
  pickupNote: string | null;
  deliveredAt: string | null;
  recipientConfirmedAt: string | null;
  codeAttempts: number;
  disputeId: string | null;
  ratingBySenderOfTraveler: number | null;
  reviewBySender: string | null;
  ratingByTravelerOfSender: number | null;
  reviewByTraveler: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

/** `delivery_codes/{bidId}` — the sender's copy of the code, unreadable by the traveler. */
export interface DeliveryCode {
  transactionId: string;
  senderId: string;
  code: string;
}

export interface Dispute {
  disputeId: string;
  transactionId: string;
  bidId?: string;
  flightId?: string;
  travelerId?: string;
  senderId?: string;
  /** The deal's status when the dispute was opened — did the parcel ever move? */
  statusWhenOpened?: BidStatus;
  openedBy: string;
  openedByRole: 'traveler' | 'sender';
  claimText: string;
  evidenceUrls: string[];
  status: DisputeStatus;
  assignedAdminId: string | null;
  adminNotes: string | null;
  resolution: string | null;
  resolutionDetails: {
    payoutToTraveler?: number;
    refundToSender?: number;
  } | null;
  createdAt: string;
  resolvedAt: string | null;
  // Denormalized for display
  travelerName?: string;
  senderName?: string;
}

export interface Report {
  reportId: string;
  reporterId: string;
  reporterName: string;
  targetType: 'user' | 'flight' | 'bid' | 'message';
  targetId: string;
  targetName: string;
  severity: ReportSeverity;
  claim: string;
  evidenceUrls: string[];
  status: ReportStatus;
  assignedAdminId: string | null;
  adminNotes: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface RouteConfig {
  routeKey: string;
  originCity: string;
  destinationCity: string;
  isPriority: boolean;
  avgKgTraded: number;
  avgPricePerKg: number;
  transactionCount30d: number;
  liveFlightCount: number;
  pendingBidCount: number;
}

export interface OnboardingVideo {
  videoId: string;
  order: number;
  titleEn: string;
  titleBn: string;
  descriptionEn: string;
  descriptionBn: string;
  videoUrl: string;
  thumbnailUrl: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  entryId: string;
  actorUid: string;
  actorName: string;
  action: AuditAction;
  targetType: string;
  targetId: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  reason: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
}

// ---- Auth Context ----

export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  photoUrl: string | null;
  /** null for ordinary users — only staff carry an admin role. */
  role: AdminRole | null;
}
