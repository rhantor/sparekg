import type {
  User, KycSubmission, Flight, Bid, Transaction, PointsLedgerEntry,
  Dispute, Report, AuditLogEntry, OnboardingVideo, DashboardKpis,
  PointsEconomySnapshot, RouteConfig, AppConfig
} from './types';

// ---- Users ----
export const mockUsers: User[] = [
  {
    uid: 'u1', email: 'rahim.khan@gmail.com', phone: '+60123456789',
    displayName: 'Rahim Khan', photoUrl: null, roles: ['traveler', 'sender'],
    kycStatus: 'APPROVED', kycSubmissionRef: 'kyc1', pointsBalance: 340,
    promoBalance: 40, lifetimePointsEarned: 890, lifetimePointsSpent: 550,
    completedTripsAsTraveler: 12, completedTripsAsSender: 3,
    averageRating: 4.8, ratingCount: 15, preferredLanguage: 'EN',
    homeAirportCode: 'KUL', createdAt: '2026-03-01T10:00:00Z',
    lastActiveAt: '2026-05-16T02:00:00Z', suspended: false, suspensionReason: null,
  },
  {
    uid: 'u2', email: 'fatima.begum@yahoo.com', phone: '+60198765432',
    displayName: 'Fatima Begum', photoUrl: null, roles: ['sender'],
    kycStatus: 'APPROVED', kycSubmissionRef: 'kyc2', pointsBalance: 120,
    promoBalance: 20, lifetimePointsEarned: 300, lifetimePointsSpent: 180,
    completedTripsAsTraveler: 0, completedTripsAsSender: 8,
    averageRating: 4.5, ratingCount: 8, preferredLanguage: 'BN',
    homeAirportCode: 'KUL', createdAt: '2026-03-15T08:00:00Z',
    lastActiveAt: '2026-05-15T18:00:00Z', suspended: false, suspensionReason: null,
  },
  {
    uid: 'u3', email: 'arif.hossain@hotmail.com', phone: '+60177654321',
    displayName: 'Arif Hossain', photoUrl: null, roles: ['traveler'],
    kycStatus: 'PENDING', kycSubmissionRef: 'kyc3', pointsBalance: 0,
    promoBalance: 0, lifetimePointsEarned: 0, lifetimePointsSpent: 0,
    completedTripsAsTraveler: 0, completedTripsAsSender: 0,
    averageRating: 0, ratingCount: 0, preferredLanguage: 'BN',
    homeAirportCode: null, createdAt: '2026-05-14T12:00:00Z',
    lastActiveAt: '2026-05-14T12:00:00Z', suspended: false, suspensionReason: null,
  },
  {
    uid: 'u4', email: 'nadia.sultana@gmail.com', phone: '+60145556677',
    displayName: 'Nadia Sultana', photoUrl: null, roles: ['traveler', 'sender'],
    kycStatus: 'REJECTED', kycSubmissionRef: 'kyc4', pointsBalance: 0,
    promoBalance: 0, lifetimePointsEarned: 0, lifetimePointsSpent: 0,
    completedTripsAsTraveler: 0, completedTripsAsSender: 0,
    averageRating: 0, ratingCount: 0, preferredLanguage: 'EN',
    homeAirportCode: 'KUL', createdAt: '2026-05-10T09:00:00Z',
    lastActiveAt: '2026-05-12T14:00:00Z', suspended: false, suspensionReason: null,
  },
  {
    uid: 'u5', email: 'kamal.uddin@gmail.com', phone: '+60166778899',
    displayName: 'Kamal Uddin', photoUrl: null, roles: ['traveler', 'sender'],
    kycStatus: 'APPROVED', kycSubmissionRef: 'kyc5', pointsBalance: 85,
    promoBalance: 10, lifetimePointsEarned: 450, lifetimePointsSpent: 365,
    completedTripsAsTraveler: 6, completedTripsAsSender: 5,
    averageRating: 4.2, ratingCount: 11, preferredLanguage: 'EN',
    homeAirportCode: 'KUL', createdAt: '2026-04-01T07:00:00Z',
    lastActiveAt: '2026-05-16T01:00:00Z', suspended: true,
    suspensionReason: 'Multiple dispute losses within 90 days',
  },
];

// ---- KYC Submissions ----
export const mockKycSubmissions: KycSubmission[] = [
  {
    submissionId: 'kyc3', userId: 'u3', idType: 'PASSPORT', idNumber: '***encrypted***',
    idCountry: 'BD', idFrontUrl: '/mock/id-front.jpg', idBackUrl: '/mock/id-back.jpg',
    selfieUrl: '/mock/selfie.jpg', livenessScore: 0.92, fullName: 'Arif Hossain',
    dateOfBirth: '1995-06-15', status: 'PENDING', assignedAdminId: null,
    reviewNotes: null, rejectionReason: null, userRejectionMessage: null,
    submittedAt: '2026-05-14T12:30:00Z', reviewedAt: null,
    user: { displayName: 'Arif Hossain', email: 'arif.hossain@hotmail.com', photoUrl: null, createdAt: '2026-05-14T12:00:00Z' },
  },
  {
    submissionId: 'kyc6', userId: 'u6-mock', idType: 'NATIONAL_ID', idNumber: '***encrypted***',
    idCountry: 'BD', idFrontUrl: '/mock/id-front-2.jpg', idBackUrl: '/mock/id-back-2.jpg',
    selfieUrl: '/mock/selfie-2.jpg', livenessScore: 0.78, fullName: 'Sadia Rahman',
    dateOfBirth: '1998-02-20', status: 'PENDING', assignedAdminId: null,
    reviewNotes: null, rejectionReason: null, userRejectionMessage: null,
    submittedAt: '2026-05-15T08:15:00Z', reviewedAt: null,
    user: { displayName: 'Sadia Rahman', email: 'sadia.r@gmail.com', photoUrl: null, createdAt: '2026-05-15T07:00:00Z' },
  },
  {
    submissionId: 'kyc7', userId: 'u7-mock', idType: 'PASSPORT', idNumber: '***encrypted***',
    idCountry: 'BD', idFrontUrl: '/mock/id-front-3.jpg', idBackUrl: null,
    selfieUrl: '/mock/selfie-3.jpg', livenessScore: 0.55, fullName: 'Tanvir Ahmed',
    dateOfBirth: '2000-11-03', status: 'UNDER_REVIEW', assignedAdminId: 'admin1',
    reviewNotes: 'Low liveness score, checking selfie quality', rejectionReason: null,
    userRejectionMessage: null, submittedAt: '2026-05-14T16:45:00Z', reviewedAt: null,
    user: { displayName: 'Tanvir Ahmed', email: 'tanvir.a@outlook.com', photoUrl: null, createdAt: '2026-05-14T15:00:00Z' },
  },
];

// ---- Flights ----
export const mockFlights: Flight[] = [
  {
    flightId: 'f1', travelerId: 'u1',
    traveler: { displayName: 'Rahim Khan', photoUrl: null, averageRating: 4.8, completedTripsAsTraveler: 12, kycVerified: true },
    originAirport: 'KUL', destinationAirport: 'DAC', routeKey: 'KUL-DAC',
    departureAt: '2026-05-20T08:00:00Z', arrivalAt: '2026-05-20T12:00:00Z',
    airline: 'Malaysia Airlines', flightNumber: 'MH196', totalKgAvailable: 15,
    kgRemaining: 8, pricePerKg: 35, fixedTotalPrice: null, currency: 'MYR',
    acceptedCategories: ['Electronics', 'Clothing', 'Documents'], prohibitedItems: [],
    specialNotes: 'No fragile items please', status: 'LIVE', isFeatured: false,
    featuredUntil: null, bidCount: 3, createdAt: '2026-05-14T10:00:00Z', updatedAt: '2026-05-15T14:00:00Z',
  },
  {
    flightId: 'f2', travelerId: 'u5',
    traveler: { displayName: 'Kamal Uddin', photoUrl: null, averageRating: 4.2, completedTripsAsTraveler: 6, kycVerified: true },
    originAirport: 'KUL', destinationAirport: 'DAC', routeKey: 'KUL-DAC',
    departureAt: '2026-05-22T14:00:00Z', arrivalAt: '2026-05-22T18:00:00Z',
    airline: 'Biman Bangladesh', flightNumber: 'BG386', totalKgAvailable: 20,
    kgRemaining: 20, pricePerKg: null, fixedTotalPrice: 500, currency: 'MYR',
    acceptedCategories: ['Clothing', 'Food Items', 'Cosmetics'], prohibitedItems: ['Liquids'],
    specialNotes: null, status: 'LIVE', isFeatured: true,
    featuredUntil: '2026-05-18T14:00:00Z', bidCount: 1, createdAt: '2026-05-15T09:00:00Z', updatedAt: '2026-05-15T09:00:00Z',
  },
];

// ---- Bids ----
export const mockBids: Bid[] = [
  {
    bidId: 'b1', flightId: 'f1', travelerId: 'u1', senderId: 'u2',
    sender: { displayName: 'Fatima Begum', photoUrl: null, averageRating: 4.5, completedTripsAsSender: 8 },
    kgRequested: 5, itemCategory: 'Electronics', itemDescription: 'Samsung Galaxy S24 x2 in original packaging',
    declaredValue: 4000, specialHandling: 'Fragile - original box', offeredPricePerKg: 30,
    offeredTotal: 150, urgencyLevel: 1, urgencyExpiresAt: '2026-05-17T12:00:00Z',
    pointsHeld: 5, status: 'PENDING', agreedAt: null,
    expiresAt: '2026-05-19T08:00:00Z', transactionId: null, createdAt: '2026-05-15T10:00:00Z',
  },
  {
    bidId: 'b2', flightId: 'f1', travelerId: 'u1', senderId: 'u5',
    sender: { displayName: 'Kamal Uddin', photoUrl: null, averageRating: 4.2, completedTripsAsSender: 5 },
    kgRequested: 2, itemCategory: 'Documents', itemDescription: 'Legal documents and certificates',
    declaredValue: 100, specialHandling: null, offeredPricePerKg: 40,
    offeredTotal: 80, urgencyLevel: 0, urgencyExpiresAt: null,
    pointsHeld: 5, status: 'AGREED', agreedAt: '2026-05-15T16:00:00Z',
    expiresAt: '2026-05-19T08:00:00Z', transactionId: 'tx1', createdAt: '2026-05-15T11:00:00Z',
  },
];

// ---- Transactions ----
export const mockTransactions: Transaction[] = [
  {
    transactionId: 'tx1', bidId: 'b2', flightId: 'f1', travelerId: 'u1', senderId: 'u5',
    kg: 2, totalPrice: 80, platformFee: 8, payoutToTraveler: 72,
    payoutStatus: 'ESCROWED', handoffPhotos: [], handoffConfirmedAt: null,
    pickupConfirmedAt: null, deliveryCode: '482916', deliveredAt: null,
    recipientConfirmedAt: null, disputeId: null, ratingByTravelerOfSender: null,
    ratingBySenderOfTraveler: null, createdAt: '2026-05-15T16:00:00Z', closedAt: null,
  },
];

// ---- Points Ledger ----
export const mockPointsLedger: PointsLedgerEntry[] = [
  { entryId: 'pl1', userId: 'u1', delta: 100, balanceAfter: 100, category: 'SIGNUP', referenceType: 'NONE', referenceId: null, refundOf: null, promoPortion: 100, description: 'Sign-up bonus after KYC approval', createdAt: '2026-03-01T10:05:00Z', createdBy: 'SYSTEM', adminId: null },
  { entryId: 'pl2', userId: 'u1', delta: 20, balanceAfter: 120, category: 'MONTHLY', referenceType: 'NONE', referenceId: null, refundOf: null, promoPortion: 20, description: 'Monthly free points - April 2026', createdAt: '2026-04-01T00:00:00Z', createdBy: 'SYSTEM', adminId: null },
  { entryId: 'pl3', userId: 'u1', delta: -20, balanceAfter: 100, category: 'FLIGHT_POST', referenceType: 'FLIGHT', referenceId: 'f1', refundOf: null, promoPortion: 0, description: 'Posted flight KUL→DAC May 20', createdAt: '2026-05-14T10:00:00Z', createdBy: 'USER', adminId: null },
  { entryId: 'pl4', userId: 'u2', delta: -5, balanceAfter: 115, category: 'BID_HOLD', referenceType: 'BID', referenceId: 'b1', refundOf: null, promoPortion: 0, description: 'Bid hold on flight f1', createdAt: '2026-05-15T10:00:00Z', createdBy: 'USER', adminId: null },
  { entryId: 'pl5', userId: 'u1', delta: 30, balanceAfter: 370, category: 'TRIP_REWARD', referenceType: 'TRANSACTION', referenceId: 'tx-old', refundOf: null, promoPortion: 0, description: 'Trip completion reward', createdAt: '2026-05-10T15:00:00Z', createdBy: 'SYSTEM', adminId: null },
  { entryId: 'pl6', userId: 'u5', delta: -50, balanceAfter: 85, category: 'ADMIN_ADJUSTMENT', referenceType: 'NONE', referenceId: null, refundOf: null, promoPortion: 0, description: 'Points forfeiture due to dispute loss', createdAt: '2026-05-13T09:00:00Z', createdBy: 'ADMIN', adminId: 'admin1' },
];

// ---- Disputes ----
export const mockDisputes: Dispute[] = [
  {
    disputeId: 'd1', transactionId: 'tx-old-2', openedBy: 'u2', openedByRole: 'sender',
    claimText: 'Items arrived damaged. Two phone screens cracked despite fragile marking.',
    evidenceUrls: ['/mock/evidence1.jpg', '/mock/evidence2.jpg'],
    status: 'OPEN', assignedAdminId: null, adminNotes: null, resolution: null,
    resolutionDetails: null, createdAt: '2026-05-14T20:00:00Z', resolvedAt: null,
    travelerName: 'Rahim Khan', senderName: 'Fatima Begum',
  },
  {
    disputeId: 'd2', transactionId: 'tx-old-3', openedBy: 'u1', openedByRole: 'traveler',
    claimText: 'Sender provided items exceeding declared weight by 3kg.',
    evidenceUrls: ['/mock/evidence3.jpg'],
    status: 'UNDER_REVIEW', assignedAdminId: 'admin1', adminNotes: 'Checking handoff photos',
    resolution: null, resolutionDetails: null,
    createdAt: '2026-05-12T14:00:00Z', resolvedAt: null,
    travelerName: 'Rahim Khan', senderName: 'Kamal Uddin',
  },
];

// ---- Reports ----
export const mockReports: Report[] = [
  {
    reportId: 'r1', reporterId: 'u2', reporterName: 'Fatima Begum',
    targetType: 'user', targetId: 'u5', targetName: 'Kamal Uddin',
    severity: 'off_platform', claim: 'User tried to share WhatsApp number before bid was agreed.',
    evidenceUrls: ['/mock/chat-screenshot.jpg'], status: 'NEW',
    assignedAdminId: null, adminNotes: null,
    createdAt: '2026-05-15T20:00:00Z', resolvedAt: null,
  },
  {
    reportId: 'r2', reporterId: 'u1', reporterName: 'Rahim Khan',
    targetType: 'bid', targetId: 'b-suspect', targetName: 'Suspicious bid on flight f1',
    severity: 'prohibited_goods', claim: 'Bid description suggests undeclared lithium batteries.',
    evidenceUrls: [], status: 'NEW',
    assignedAdminId: null, adminNotes: null,
    createdAt: '2026-05-16T01:00:00Z', resolvedAt: null,
  },
];

// ---- Audit Log ----
export const mockAuditLog: AuditLogEntry[] = [
  { entryId: 'a1', actorUid: 'admin1', actorName: 'Admin User', action: 'KYC_APPROVED', targetType: 'kyc_submission', targetId: 'kyc1', beforeState: { status: 'PENDING' }, afterState: { status: 'APPROVED' }, reason: 'Documents verified', timestamp: '2026-03-02T09:00:00Z', ipAddress: '203.0.113.1', userAgent: 'Mozilla/5.0' },
  { entryId: 'a2', actorUid: 'admin1', actorName: 'Admin User', action: 'USER_SUSPENDED', targetType: 'user', targetId: 'u5', beforeState: { suspended: false }, afterState: { suspended: true }, reason: 'Multiple dispute losses within 90 days', timestamp: '2026-05-13T09:30:00Z', ipAddress: '203.0.113.1', userAgent: 'Mozilla/5.0' },
  { entryId: 'a3', actorUid: 'admin1', actorName: 'Admin User', action: 'POINTS_ADJUSTED', targetType: 'user', targetId: 'u5', beforeState: { pointsBalance: 135 }, afterState: { pointsBalance: 85 }, reason: 'Points forfeiture due to dispute loss', timestamp: '2026-05-13T09:00:00Z', ipAddress: '203.0.113.1', userAgent: 'Mozilla/5.0' },
  { entryId: 'a4', actorUid: 'admin1', actorName: 'Admin User', action: 'KYC_REJECTED', targetType: 'kyc_submission', targetId: 'kyc4', beforeState: { status: 'UNDER_REVIEW' }, afterState: { status: 'REJECTED' }, reason: 'Name mismatch between ID and profile', timestamp: '2026-05-11T11:00:00Z', ipAddress: '203.0.113.1', userAgent: 'Mozilla/5.0' },
];

// ---- Onboarding Videos ----
export const mockOnboardingVideos: OnboardingVideo[] = [
  { videoId: 'v1', order: 1, titleEn: 'Welcome to SpareKG', titleBn: 'SpareKG তে স্বাগতম', descriptionEn: 'Learn how the platform connects travelers with senders.', descriptionBn: 'প্ল্যাটফর্ম কীভাবে ভ্রমণকারী ও প্রেরকদের সংযুক্ত করে।', videoUrl: '/mock/video1.mp4', thumbnailUrl: '/mock/thumb1.jpg', isActive: true, createdBy: 'admin1', createdAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z' },
  { videoId: 'v2', order: 2, titleEn: 'How Bidding Works', titleBn: 'বিডিং কীভাবে কাজ করে', descriptionEn: 'Understand the bidding process and points economy.', descriptionBn: 'বিডিং প্রক্রিয়া এবং পয়েন্ট ইকোনমি।', videoUrl: '/mock/video2.mp4', thumbnailUrl: '/mock/thumb2.jpg', isActive: true, createdBy: 'admin1', createdAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z' },
];

// ---- Routes Config ----
export const mockRoutes: RouteConfig[] = [
  { routeKey: 'KUL-DAC', originCity: 'Kuala Lumpur', destinationCity: 'Dhaka', isPriority: true, avgKgTraded: 8.5, avgPricePerKg: 32, transactionCount30d: 47, liveFlightCount: 5, pendingBidCount: 12 },
  { routeKey: 'DAC-KUL', originCity: 'Dhaka', destinationCity: 'Kuala Lumpur', isPriority: false, avgKgTraded: 4.2, avgPricePerKg: 28, transactionCount30d: 18, liveFlightCount: 2, pendingBidCount: 6 },
];

// ---- Dashboard KPIs ----
export const mockDashboardKpis: DashboardKpis = {
  dau: 142, wau: 523, mau: 1847, dauMauRatio: 0.077,
  flightsPostedToday: 8, flightsPostedWeek: 34, flightsPostedMonth: 127,
  bidsSubmittedToday: 23, bidsAcceptedToday: 7, matchRate: 0.304,
  gmvMyr: 45820, platformRevenueMyr: 4582,
  kycQueueDepth: 3, kycMedianAgeHours: 6.5,
  disputeQueueDepth: 2, disputeMedianAgeHours: 18,
  totalPointsOutstanding: 128450, reconciliationOk: true,
};

// ---- Economy Snapshot ----
export const mockEconomySnapshot: PointsEconomySnapshot = {
  totalOutstanding: 128450,
  reconciliationOk: true,
  last24h: {
    issued: { SIGNUP: 200, MONTHLY: 0, REFERRAL: 150, TRIP_REWARD: 180, BID_HOLD: 0, BID_CAPTURE: 0, BID_REFUND: 35, FLIGHT_POST: 0, FEATURE: 0, URGENCY: 0, PURCHASE: 550, ADMIN_ADJUSTMENT: 0, DISPUTE_RESOLUTION: 0 } as Record<string, number> as never,
    spent: { SIGNUP: 0, MONTHLY: 0, REFERRAL: 0, TRIP_REWARD: 0, BID_HOLD: 45, BID_CAPTURE: 25, BID_REFUND: 0, FLIGHT_POST: 120, FEATURE: 30, URGENCY: 60, PURCHASE: 0, ADMIN_ADJUSTMENT: 50, DISPUTE_RESOLUTION: 0 } as Record<string, number> as never,
    purchasedPoints: 550,
    purchasedMyr: 50,
  },
  last7dTrend: [
    { date: '2026-05-10', issued: 420, spent: 380, purchased: 200 },
    { date: '2026-05-11', issued: 510, spent: 450, purchased: 300 },
    { date: '2026-05-12', issued: 380, spent: 420, purchased: 150 },
    { date: '2026-05-13', issued: 600, spent: 520, purchased: 500 },
    { date: '2026-05-14', issued: 450, spent: 390, purchased: 250 },
    { date: '2026-05-15', issued: 700, spent: 580, purchased: 400 },
    { date: '2026-05-16', issued: 330, spent: 280, purchased: 100 },
  ],
  topSpenders: [
    { userId: 'u1', name: 'Rahim Khan', amount: 180 },
    { userId: 'u2', name: 'Fatima Begum', amount: 120 },
    { userId: 'u5', name: 'Kamal Uddin', amount: 95 },
  ],
  topEarners: [
    { userId: 'u1', name: 'Rahim Khan', amount: 210 },
    { userId: 'u5', name: 'Kamal Uddin', amount: 150 },
    { userId: 'u2', name: 'Fatima Begum', amount: 80 },
  ],
};

// ---- App Config ----
export const mockAppConfig: AppConfig = {
  feeSchedule: { platformFeePercent: 10, cancellationRefundWindowHours: 1 },
  pointsPricing: {
    packages: [
      { name: 'Starter', points: 100, priceMyr: 10 },
      { name: 'Standard', points: 550, priceMyr: 50 },
      { name: 'Pro', points: 1200, priceMyr: 100 },
      { name: 'Power', points: 3500, priceMyr: 250 },
    ],
  },
  pointsEconomy: {
    signupBonus: 100, monthlyFree: 20, monthlyFreeCap: 60,
    flightPostCost: 20, bidSubmitCost: 5, counterAcceptCost: 3,
    featuredCostPer24h: 15, urgencyLevel1CostPer24h: 10,
    urgencyLevel2CostPer48h: 25, urgencyLevel3CostPer72h: 50,
    relistCost: 10, tripRewardTraveler: 30, deliveryRewardSender: 15,
    referralRewardReferrer: 50, referralRewardInvitee: 25,
  },
  kycRejectionReasons: [
    { code: 'DOC_BLURRY', messageEn: 'Your ID document is blurry. Please resubmit with a clearer photo.', messageBn: 'আপনার আইডি ডকুমেন্ট ঝাপসা। অনুগ্রহ করে পরিষ্কার ছবি দিয়ে পুনরায় জমা দিন।' },
    { code: 'NAME_MISMATCH', messageEn: 'The name on your ID does not match your profile name.', messageBn: 'আপনার আইডিতে নাম প্রোফাইল নামের সাথে মেলে না।' },
    { code: 'EXPIRED_ID', messageEn: 'Your ID document has expired.', messageBn: 'আপনার আইডি ডকুমেন্টের মেয়াদ শেষ হয়ে গেছে।' },
    { code: 'SELFIE_MISMATCH', messageEn: 'Your selfie does not match the photo on your ID.', messageBn: 'আপনার সেলফি আইডির ছবির সাথে মেলে না।' },
  ],
  featureFlags: { enableUrgencyBoosts: true, enableFeaturedListings: true, enableReferrals: true, enableBengaliUI: true, maintenanceMode: false },
};
