// ============================================================
// SpareKG — Full TypeScript Type Definitions
// Mirrors the Firestore schema from the blueprint
// ============================================================

// ---- Enums ----

export type KycStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

export type FlightStatus = 'DRAFT' | 'LIVE' | 'LOCKED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

export type BidStatus = 'PENDING' | 'AGREED' | 'DECLINED' | 'EXPIRED' | 'HANDED_OVER' | 'DELIVERED' | 'DISPUTED' | 'RESOLVED';

export type PayoutStatus = 'ESCROWED' | 'RELEASED' | 'REFUNDED' | 'DISPUTED';

export type DisputeStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED_FOR_SENDER' | 'RESOLVED_FOR_TRAVELER' | 'SPLIT' | 'CLOSED_INVALID';

export type PointsCategory =
  | 'SIGNUP' | 'MONTHLY' | 'REFERRAL' | 'TRIP_REWARD'
  | 'BID_HOLD' | 'BID_CAPTURE' | 'BID_REFUND'
  | 'FLIGHT_POST' | 'FEATURE' | 'URGENCY'
  | 'PURCHASE' | 'ADMIN_ADJUSTMENT' | 'DISPUTE_RESOLUTION';

export type ReferenceType = 'FLIGHT' | 'BID' | 'TRANSACTION' | 'PURCHASE' | 'DISPUTE' | 'NONE';

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
  | 'REPORT_DISMISSED' | 'REPORT_ACTION_TAKEN';

export type PurchaseStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

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
  pointsBalance: number;
  promoBalance: number;
  lifetimePointsEarned: number;
  lifetimePointsSpent: number;
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
  isFeatured: boolean;
  featuredUntil: string | null;
  bidCount: number;
  createdAt: string;
  updatedAt: string;
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
  urgencyLevel: 0 | 1 | 2 | 3;
  urgencyExpiresAt: string | null;
  pointsHeld: number;
  status: BidStatus;
  agreedAt: string | null;
  expiresAt: string;
  transactionId: string | null;
  createdAt: string;
}

export interface Transaction {
  transactionId: string;
  bidId: string;
  flightId: string;
  travelerId: string;
  senderId: string;
  kg: number;
  totalPrice: number;
  platformFee: number;
  payoutToTraveler: number;
  payoutStatus: PayoutStatus;
  handoffPhotos: string[];
  handoffConfirmedAt: string | null;
  pickupConfirmedAt: string | null;
  deliveryCode: string;
  deliveredAt: string | null;
  recipientConfirmedAt: string | null;
  disputeId: string | null;
  ratingByTravelerOfSender: number | null;
  ratingBySenderOfTraveler: number | null;
  createdAt: string;
  closedAt: string | null;
}

export interface PointsLedgerEntry {
  entryId: string;
  userId: string;
  delta: number;
  balanceAfter: number;
  category: PointsCategory;
  referenceType: ReferenceType;
  referenceId: string | null;
  refundOf: string | null;
  promoPortion: number;
  description: string;
  createdAt: string;
  createdBy: 'USER' | 'SYSTEM' | 'ADMIN';
  adminId: string | null;
}

export interface PointsPurchase {
  purchaseId: string;
  userId: string;
  packageName: string;
  points: number;
  amountMyr: number;
  status: PurchaseStatus;
  providerRef: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface Dispute {
  disputeId: string;
  transactionId: string;
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

export interface AppConfig {
  feeSchedule: {
    platformFeePercent: number;
    cancellationRefundWindowHours: number;
  };
  pointsPricing: {
    packages: {
      name: string;
      points: number;
      priceMyr: number;
    }[];
  };
  pointsEconomy: {
    signupBonus: number;
    monthlyFree: number;
    monthlyFreeCap: number;
    flightPostCost: number;
    bidSubmitCost: number;
    counterAcceptCost: number;
    featuredCostPer24h: number;
    urgencyLevel1CostPer24h: number;
    urgencyLevel2CostPer48h: number;
    urgencyLevel3CostPer72h: number;
    relistCost: number;
    tripRewardTraveler: number;
    deliveryRewardSender: number;
    referralRewardReferrer: number;
    referralRewardInvitee: number;
  };
  kycRejectionReasons: {
    code: RejectionReason;
    messageEn: string;
    messageBn: string;
  }[];
  featureFlags: Record<string, boolean>;
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

// ---- Dashboard Aggregates ----

export interface DashboardKpis {
  dau: number;
  wau: number;
  mau: number;
  dauMauRatio: number;
  flightsPostedToday: number;
  flightsPostedWeek: number;
  flightsPostedMonth: number;
  bidsSubmittedToday: number;
  bidsAcceptedToday: number;
  matchRate: number;
  gmvMyr: number;
  platformRevenueMyr: number;
  kycQueueDepth: number;
  kycMedianAgeHours: number;
  disputeQueueDepth: number;
  disputeMedianAgeHours: number;
  totalPointsOutstanding: number;
  reconciliationOk: boolean;
}

export interface PointsEconomySnapshot {
  totalOutstanding: number;
  reconciliationOk: boolean;
  last24h: {
    issued: Record<PointsCategory, number>;
    spent: Record<PointsCategory, number>;
    purchasedPoints: number;
    purchasedMyr: number;
  };
  last7dTrend: {
    date: string;
    issued: number;
    spent: number;
    purchased: number;
  }[];
  topSpenders: { userId: string; name: string; amount: number }[];
  topEarners: { userId: string; name: string; amount: number }[];
}

// ---- Auth Context ----

export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  photoUrl: string | null;
  role: AdminRole;
}
