import { auth as authTriggers } from 'firebase-functions/v1';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';

import {
  canTransitionBid,
  acceptsNewBids,
  type BidStatus,
  type FlightStatus,
} from './state-machines';
import {
  validatePostFlight,
  validateSubmitBid,
  validateBidId,
} from './validation';

admin.initializeApp();

const db = admin.firestore();
const { FieldValue } = admin.firestore;

/** How long a sender's bid stays open for the traveler to answer. */
const BID_WINDOW_HOURS = 48;

// ---------------------------------------------------------------------------
// Auth helpers
//
// Authorization is derived from the verified ID token on every call. A uid or
// role arriving in the request body is ignored — that is the whole point.
// ---------------------------------------------------------------------------

interface Caller {
  uid: string;
  email: string | null;
  kycApproved: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

function requireAuth(request: CallableRequest): Caller {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in.');
  }
  const claims = auth.token as Record<string, unknown>;
  return {
    uid: auth.uid,
    email: typeof claims.email === 'string' ? claims.email : null,
    kycApproved: claims.kycApproved === true,
    isAdmin: claims.admin === true,
    isSuperAdmin: claims.superAdmin === true,
  };
}

/** Posting a flight and bidding both require a passed KYC check (blueprint §1.4). */
function requireVerified(request: CallableRequest): Caller {
  const caller = requireAuth(request);
  if (!caller.kycApproved) {
    throw new HttpsError(
      'permission-denied',
      'Verify your identity before posting flights or bidding.',
    );
  }
  return caller;
}

async function requireActiveUser(uid: string): Promise<admin.firestore.DocumentData> {
  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists) {
    throw new HttpsError('failed-precondition', 'Complete your profile first.');
  }
  const user = snap.data()!;
  if (user.suspended === true) {
    throw new HttpsError('permission-denied', 'Your account is suspended.');
  }
  return user;
}

async function writeAudit(entry: {
  actorUid: string;
  action: string;
  targetType: string;
  targetId: string;
  reason: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
}) {
  await db.collection('audit_log').add({
    ...entry,
    beforeState: entry.beforeState ?? null,
    afterState: entry.afterState ?? null,
    timestamp: FieldValue.serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// User lifecycle
// ---------------------------------------------------------------------------

/**
 * Seeds the Firestore user document when a Firebase Auth account is created.
 *
 * Auth lifecycle triggers only exist in the v1 SDK — the v2 equivalent is a
 * *blocking* function that needs Identity Platform, so this stays on v1.
 */
export const onUserCreate = authTriggers.user().onCreate(async (user) => {
  const newUserDoc = {
    uid: user.uid,
    email: user.email || '',
    phone: user.phoneNumber || null,
    displayName: user.displayName || 'New User',
    photoUrl: user.photoURL || null,
    roles: ['traveler', 'sender'],
    kycStatus: 'PENDING',
    kycSubmissionRef: null,
    // Points are issued by the ledger in Phase 3; a flat balance here would be
    // unbacked by any ledger entry and break reconciliation.
    pointsBalance: 0,
    promoBalance: 0,
    lifetimePointsEarned: 0,
    lifetimePointsSpent: 0,
    completedTripsAsTraveler: 0,
    completedTripsAsSender: 0,
    averageRating: 0,
    ratingCount: 0,
    preferredLanguage: 'EN',
    homeAirportCode: null,
    createdAt: FieldValue.serverTimestamp(),
    lastActiveAt: FieldValue.serverTimestamp(),
    suspended: false,
    suspensionReason: null,
  };

  try {
    // create() rather than set() so a replayed trigger cannot clobber a live profile.
    await db.collection('users').doc(user.uid).create(newUserDoc);
    logger.info('User document created', { uid: user.uid });
  } catch (error) {
    logger.error('Failed to create user document', { uid: user.uid, error });
  }
});

// ---------------------------------------------------------------------------
// Admin bootstrap
// ---------------------------------------------------------------------------

/**
 * Grants admin / super-admin claims.
 *
 * Two ways in, and no others:
 *   1. An existing super admin promotes someone.
 *   2. One-time bootstrap: the address in BOOTSTRAP_SUPERADMIN_EMAIL claims the
 *      first super-admin seat for itself, and only while the seat is unclaimed.
 *
 * The bootstrap path is guarded by a transaction on system/bootstrap so it
 * cannot be replayed or raced, and it refuses to promote anyone but the caller.
 */
export const makeSuperAdmin = onCall(async (request) => {
  const caller = requireAuth(request);
  const targetUid = typeof request.data?.uid === 'string' ? request.data.uid : null;
  if (!targetUid) {
    throw new HttpsError('invalid-argument', 'A target uid is required.');
  }

  const bootstrapRef = db.doc('system/bootstrap');

  if (!caller.isSuperAdmin) {
    const allowed = (process.env.BOOTSTRAP_SUPERADMIN_EMAIL || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    // Deliberately identical error for every failed path — a caller learns
    // nothing about whether the seat is taken or who is on the allowlist.
    const denied = new HttpsError('permission-denied', 'Not authorized to grant admin access.');

    if (allowed.length === 0) throw denied;
    if (!caller.email || !allowed.includes(caller.email.toLowerCase())) throw denied;
    if (targetUid !== caller.uid) throw denied;

    // Require a verified address so an unverified signup on that email can't claim the seat.
    const callerRecord = await admin.auth().getUser(caller.uid);
    if (!callerRecord.emailVerified) throw denied;

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(bootstrapRef);
      if (snap.exists && snap.data()?.superAdminClaimed === true) throw denied;
      tx.set(bootstrapRef, {
        superAdminClaimed: true,
        claimedBy: caller.uid,
        claimedAt: FieldValue.serverTimestamp(),
      });
    });
  }

  const targetRecord = await admin.auth().getUser(targetUid);
  await admin.auth().setCustomUserClaims(targetUid, {
    ...(targetRecord.customClaims || {}),
    admin: true,
    superAdmin: true,
  });

  await writeAudit({
    actorUid: caller.uid,
    action: 'ROLE_GRANTED',
    targetType: 'user',
    targetId: targetUid,
    reason: caller.isSuperAdmin ? 'Granted by super admin' : 'Initial super-admin bootstrap',
    afterState: { admin: true, superAdmin: true },
  });

  logger.info('Super admin granted', { actor: caller.uid, target: targetUid });
  return { success: true };
});

// ---------------------------------------------------------------------------
// Team access
// ---------------------------------------------------------------------------

/**
 * Grants or revokes staff access.
 *
 * Custom claims are the authority, but they cannot be queried — so every change
 * is mirrored into `admin_roles/{uid}` purely so the console can list who has
 * access. The mirror is never read for an authorisation decision.
 *
 * Two locks prevent a super admin from locking everyone out: you cannot change
 * your own role, and the last remaining super admin cannot be demoted.
 */
export const setUserRole = onCall(async (request) => {
  const caller = requireAuth(request);
  if (!caller.isSuperAdmin) {
    throw new HttpsError('permission-denied', 'Only a super admin can change team access.');
  }

  const data = (request.data ?? {}) as Record<string, unknown>;
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  const role = data.role as 'admin' | 'super_admin' | null;

  if (!email) throw new HttpsError('invalid-argument', 'An email address is required.');
  if (role !== null && role !== 'admin' && role !== 'super_admin') {
    throw new HttpsError('invalid-argument', 'Role must be "admin", "super_admin", or null to revoke.');
  }

  let target;
  try {
    target = await admin.auth().getUserByEmail(email);
  } catch {
    throw new HttpsError(
      'not-found',
      'No account with that email. Ask them to sign in once first, then try again.',
    );
  }

  if (target.uid === caller.uid) {
    throw new HttpsError('failed-precondition', 'You cannot change your own role.');
  }

  const existing = target.customClaims || {};

  // Don't strand the project with no super admin.
  if (existing.superAdmin === true && role !== 'super_admin') {
    const remaining = await db
      .collection('admin_roles')
      .where('role', '==', 'super_admin')
      .get();
    const others = remaining.docs.filter((d) => d.id !== target.uid);
    if (others.length === 0) {
      throw new HttpsError('failed-precondition', 'This is the last super admin — promote someone else first.');
    }
  }

  await admin.auth().setCustomUserClaims(target.uid, {
    ...existing,
    admin: role !== null,
    superAdmin: role === 'super_admin',
  });

  const roleRef = db.collection('admin_roles').doc(target.uid);
  if (role === null) {
    await roleRef.delete();
  } else {
    await roleRef.set({
      uid: target.uid,
      email: target.email || email,
      displayName: target.displayName || null,
      role,
      grantedBy: caller.email || caller.uid,
      grantedAt: FieldValue.serverTimestamp(),
    });
  }

  await writeAudit({
    actorUid: caller.uid,
    action: role === null ? 'ROLE_REVOKED' : 'ROLE_GRANTED',
    targetType: 'user',
    targetId: target.uid,
    reason: role === null ? `Revoked staff access for ${email}` : `Granted ${role} to ${email}`,
    beforeState: { admin: existing.admin === true, superAdmin: existing.superAdmin === true },
    afterState: { admin: role !== null, superAdmin: role === 'super_admin' },
  });

  logger.info('Team access changed', { actor: caller.uid, target: target.uid, role });
  return { success: true, uid: target.uid, role };
});

// ---------------------------------------------------------------------------
// KYC
// ---------------------------------------------------------------------------

/** Grants the kycApproved claim once a submission is approved by an admin. */
export const onKycApproved = onDocumentUpdated(
  'kyc_submissions/{submissionId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    if (after.status !== 'APPROVED' || before.status === 'APPROVED') return;

    const userId = after.userId as string;
    try {
      const userRecord = await admin.auth().getUser(userId);
      await admin.auth().setCustomUserClaims(userId, {
        ...(userRecord.customClaims || {}),
        kycApproved: true,
      });

      await db.collection('users').doc(userId).update({ kycStatus: 'APPROVED' });

      await writeAudit({
        actorUid: (after.assignedAdminId as string) || 'SYSTEM',
        action: 'KYC_APPROVED',
        targetType: 'kyc_submission',
        targetId: event.params.submissionId,
        reason: 'KYC submission approved',
        beforeState: { status: before.status },
        afterState: { status: 'APPROVED' },
      });

      logger.info('kycApproved claim granted', { uid: userId });
    } catch (error) {
      logger.error('KYC approval processing failed', { uid: userId, error });
    }
  },
);

// ---------------------------------------------------------------------------
// Phase 2 — marketplace
// ---------------------------------------------------------------------------

/**
 * Creates a flight listing.
 *
 * The client supplies trip details only. Status, capacity counters, denormalized
 * traveler info and all timestamps are set here, so a tampered payload cannot
 * publish a flight that is already LOCKED, pre-loaded with bids, or attributed
 * to someone else.
 */
export const postFlight = onCall(async (request) => {
  const caller = requireVerified(request);
  const input = validatePostFlight(request.data);
  const user = await requireActiveUser(caller.uid);

  const flightRef = db.collection('flights').doc();
  await flightRef.set({
    flightId: flightRef.id,
    travelerId: caller.uid,
    traveler: {
      displayName: user.displayName || 'Traveler',
      photoUrl: user.photoUrl || null,
      averageRating: user.averageRating || 0,
      completedTripsAsTraveler: user.completedTripsAsTraveler || 0,
      kycVerified: true,
    },
    originAirport: input.originAirport,
    destinationAirport: input.destinationAirport,
    routeKey: input.routeKey,
    departureAt: admin.firestore.Timestamp.fromDate(input.departureAt),
    arrivalAt: admin.firestore.Timestamp.fromDate(input.arrivalAt),
    airline: input.airline,
    flightNumber: input.flightNumber,
    totalKgAvailable: input.totalKgAvailable,
    kgRemaining: input.totalKgAvailable,
    pricePerKg: input.pricePerKg,
    fixedTotalPrice: input.fixedTotalPrice,
    currency: input.currency,
    acceptedCategories: input.acceptedCategories,
    prohibitedItems: input.prohibitedItems,
    specialNotes: input.specialNotes,
    // Phase 2 posts are free, so a listing goes straight to LIVE. When the points
    // economy lands, an underfunded post starts as DRAFT instead.
    status: 'LIVE' satisfies FlightStatus,
    isFeatured: false,
    featuredUntil: null,
    bidCount: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  logger.info('Flight posted', { flightId: flightRef.id, uid: caller.uid });
  return { flightId: flightRef.id };
});

/**
 * Places a bid on a flight.
 *
 * The offered total is computed server-side from the flight's own pricing, so a
 * sender cannot name their own total and a traveler cannot be shown a figure the
 * system didn't derive.
 */
export const submitBid = onCall(async (request) => {
  const caller = requireVerified(request);
  const input = validateSubmitBid(request.data);
  const user = await requireActiveUser(caller.uid);

  // Required before bidding so an accepted deal always has a reachable sender.
  if (!user.phone) {
    throw new HttpsError('failed-precondition', 'Add a phone number to your profile before bidding.');
  }

  const flightRef = db.collection('flights').doc(input.flightId);
  const bidRef = db.collection('bids').doc();
  const expiresAt = new Date(Date.now() + BID_WINDOW_HOURS * 3600_000);

  await db.runTransaction(async (tx) => {
    const flightSnap = await tx.get(flightRef);
    if (!flightSnap.exists) {
      throw new HttpsError('not-found', 'That flight no longer exists.');
    }
    const flight = flightSnap.data()!;

    if (flight.travelerId === caller.uid) {
      throw new HttpsError('failed-precondition', 'You cannot bid on your own flight.');
    }
    if (!acceptsNewBids(flight.status as FlightStatus)) {
      throw new HttpsError('failed-precondition', 'This flight is no longer accepting bids.');
    }
    if (flight.departureAt.toDate() <= new Date()) {
      throw new HttpsError('failed-precondition', 'This flight has already departed.');
    }
    if (input.kgRequested > flight.kgRemaining) {
      throw new HttpsError(
        'failed-precondition',
        `Only ${flight.kgRemaining}kg remain on this flight.`,
      );
    }

    // Price is the traveler's, not the bidder's. An offer below the asking rate
    // is rejected rather than silently accepted.
    let offeredTotal: number;
    let offeredPricePerKg: number | null = null;
    if (flight.pricePerKg !== null && flight.pricePerKg !== undefined) {
      const rate: number = input.offeredPricePerKg ?? flight.pricePerKg;
      if (rate < flight.pricePerKg) {
        throw new HttpsError(
          'failed-precondition',
          `The traveler's rate is ${flight.pricePerKg} ${flight.currency}/kg.`,
        );
      }
      offeredPricePerKg = rate;
      offeredTotal = Math.round(rate * input.kgRequested * 100) / 100;
    } else {
      // Fixed-price listing: the whole allowance goes as one deal.
      if (input.kgRequested !== flight.totalKgAvailable) {
        throw new HttpsError(
          'failed-precondition',
          'This listing is offered as a single fixed-price allowance.',
        );
      }
      offeredTotal = flight.fixedTotalPrice;
    }

    tx.set(bidRef, {
      bidId: bidRef.id,
      flightId: input.flightId,
      travelerId: flight.travelerId,
      senderId: caller.uid,
      sender: {
        displayName: user.displayName || 'Sender',
        photoUrl: user.photoUrl || null,
        averageRating: user.averageRating || 0,
        completedTripsAsSender: user.completedTripsAsSender || 0,
      },
      kgRequested: input.kgRequested,
      itemCategory: input.itemCategory,
      itemDescription: input.itemDescription,
      declaredValue: input.declaredValue,
      specialHandling: input.specialHandling,
      offeredPricePerKg,
      offeredTotal,
      currency: flight.currency,
      urgencyLevel: 0,
      urgencyExpiresAt: null,
      pointsHeld: 0, // Phase 3 holds points here.
      status: 'PENDING' satisfies BidStatus,
      agreedAt: null,
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      transactionId: null,
      createdAt: FieldValue.serverTimestamp(),
    });

    tx.update(flightRef, {
      bidCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  logger.info('Bid submitted', { bidId: bidRef.id, flightId: input.flightId, uid: caller.uid });
  return { bidId: bidRef.id };
});

/**
 * Accepts a bid: PENDING -> AGREED.
 *
 * Runs entirely in a transaction because two travelers' accepts on the same
 * flight race for the same kg. Reading capacity and writing it back atomically
 * is what stops a flight being oversold.
 */
export const acceptBid = onCall(async (request) => {
  const caller = requireVerified(request);
  const bidId = validateBidId(request.data);

  const bidRef = db.collection('bids').doc(bidId);

  const result = await db.runTransaction(async (tx) => {
    const bidSnap = await tx.get(bidRef);
    if (!bidSnap.exists) throw new HttpsError('not-found', 'That bid no longer exists.');
    const bid = bidSnap.data()!;

    // Ownership check before anything else — this is the IDOR guard.
    if (bid.travelerId !== caller.uid) {
      throw new HttpsError('permission-denied', 'Only the traveler can accept this bid.');
    }

    const check = canTransitionBid(bid.status as BidStatus, 'AGREED', 'TRAVELER');
    if (!check.allowed) throw new HttpsError('failed-precondition', check.reason!);

    if (bid.expiresAt.toDate() <= new Date()) {
      throw new HttpsError('failed-precondition', 'This bid has expired.');
    }

    const flightRef = db.collection('flights').doc(bid.flightId as string);
    const flightSnap = await tx.get(flightRef);
    if (!flightSnap.exists) throw new HttpsError('not-found', 'That flight no longer exists.');
    const flight = flightSnap.data()!;

    if (bid.kgRequested > flight.kgRemaining) {
      throw new HttpsError(
        'failed-precondition',
        `Only ${flight.kgRemaining}kg remain — not enough for this bid.`,
      );
    }

    const kgRemaining = Math.round((flight.kgRemaining - bid.kgRequested) * 100) / 100;

    tx.update(bidRef, {
      status: 'AGREED' satisfies BidStatus,
      agreedAt: FieldValue.serverTimestamp(),
    });

    tx.update(flightRef, {
      kgRemaining,
      // Capacity exhausted: hide from search but keep it reachable for existing bidders.
      ...(kgRemaining <= 0 ? { status: 'LOCKED' satisfies FlightStatus } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { flightId: bid.flightId as string, kgRemaining };
  });

  logger.info('Bid accepted', { bidId, uid: caller.uid, kgRemaining: result.kgRemaining });
  return { success: true, ...result };
});

/** Declines a bid: PENDING -> DECLINED. */
export const declineBid = onCall(async (request) => {
  const caller = requireAuth(request);
  const bidId = validateBidId(request.data);
  const bidRef = db.collection('bids').doc(bidId);

  await db.runTransaction(async (tx) => {
    const bidSnap = await tx.get(bidRef);
    if (!bidSnap.exists) throw new HttpsError('not-found', 'That bid no longer exists.');
    const bid = bidSnap.data()!;

    const actor = bid.travelerId === caller.uid ? 'TRAVELER' : caller.isAdmin ? 'ADMIN' : null;
    if (!actor) {
      throw new HttpsError('permission-denied', 'Only the traveler can decline this bid.');
    }

    const check = canTransitionBid(bid.status as BidStatus, 'DECLINED', actor);
    if (!check.allowed) throw new HttpsError('failed-precondition', check.reason!);

    tx.update(bidRef, { status: 'DECLINED' satisfies BidStatus });
  });

  logger.info('Bid declined', { bidId, uid: caller.uid });
  return { success: true };
});

/**
 * Expires bids the traveler never answered: PENDING -> EXPIRED.
 * This is the SYSTEM actor in the bid state machine.
 */
export const expireStaleBids = onSchedule('every 60 minutes', async () => {
  const now = admin.firestore.Timestamp.now();
  const stale = await db
    .collection('bids')
    .where('status', '==', 'PENDING')
    .where('expiresAt', '<=', now)
    .limit(400)
    .get();

  if (stale.empty) return;

  const batch = db.batch();
  stale.docs.forEach((doc) => {
    const check = canTransitionBid(doc.data().status as BidStatus, 'EXPIRED', 'SYSTEM');
    if (check.allowed) batch.update(doc.ref, { status: 'EXPIRED' satisfies BidStatus });
  });
  await batch.commit();

  logger.info('Expired stale bids', { count: stale.size });
});
