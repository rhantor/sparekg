import { auth as authTriggers } from 'firebase-functions/v1';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';
// Modular imports for the Firestore value types: the namespaced
// `admin.firestore.FieldValue` is undefined under the emulator's firebase-admin
// proxy with SDK v13, and the modular form is what the SDK now recommends.
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { randomInt } from 'node:crypto';

import {
  canTransitionBid,
  canTransitionFlight,
  acceptsNewBids,
  AGREEMENT_STATUSES,
  OPEN_AGREEMENT_STATUSES,
  type Actor,
  type BidStatus,
  type FlightStatus,
} from './state-machines';
import {
  validatePostFlight,
  validateSubmitBid,
  validateBidId,
  validateFlightId,
  validateConfirmHandover,
  validateMarkDelivered,
  validateSubmitRating,
  validateOpenDispute,
  validateResolveDispute,
  type DisputeOutcome,
  validateReviewFlightTicket,
  validateLookupFlight,
  servedRoute,
} from './validation';
import { getPlatformFeePercent } from './config';

admin.initializeApp();

const db = admin.firestore();

/** How long a sender's bid stays open for the traveler to answer. */
const BID_WINDOW_HOURS = 48;

/**
 * Offers one sender may have waiting on travelers at once, across all flights.
 *
 * Bidding is free, so this is what keeps one account from flooding every
 * listing on a route: each bid has to be answered, withdrawn or expire before
 * a sixth can be placed.
 */
const MAX_OPEN_BIDS_PER_SENDER = 5;

/** Either party may dispute until this long after delivery (blueprint §5.5). */
const DISPUTE_WINDOW_HOURS = 72;

/** Wrong delivery codes a traveler may enter before the delivery needs staff. */
const MAX_CODE_ATTEMPTS = 5;

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

  // One listing per real flight. Two listings for the same seat split the
  // senders between them, and one ticket cannot back both. Closed listings
  // don't count, so a traveler whose ticket was rejected can post again.
  // Equality on two fields needs no composite index.
  const sameFlight = await db.collection('flights')
    .where('travelerId', '==', caller.uid)
    .where('flightNumber', '==', input.flightNumber)
    .get();
  const duplicate = sameFlight.docs.some((doc) => {
    const existing = doc.data();
    if (['CANCELLED', 'EXPIRED', 'COMPLETED'].includes(existing.status)) return false;
    const gap = Math.abs(existing.departureAt.toMillis() - input.departureAt.getTime());
    return gap < 24 * 3600_000;
  });
  if (duplicate) {
    throw new HttpsError('already-exists', 'You have already listed this flight.');
  }

  const scheduleCheck = await scheduleCheckFor(input);

  // The payload only names a path, so prove it is a real file in the caller's
  // own folder. Otherwise a listing could cite someone else's ticket, or none.
  if (!input.ticketPath.startsWith(`tickets/${caller.uid}/`)) {
    throw new HttpsError('permission-denied', 'That ticket does not belong to you.');
  }
  const ticketFile = admin.storage().bucket().file(input.ticketPath);
  const [ticketExists] = await ticketFile.exists();
  if (!ticketExists) {
    throw new HttpsError('failed-precondition', 'Upload your ticket.');
  }
  const [ticketMeta] = await ticketFile.getMetadata();
  const ticketType = String(ticketMeta.contentType ?? '');
  // Same list as storage.rules. Checked again here because the rules only
  // govern new uploads, not whatever already sits at the path.
  if (!/^(image\/(jpeg|png|webp|heic|heif)|application\/pdf)$/.test(ticketType)) {
    throw new HttpsError('invalid-argument', 'The ticket must be a photo (JPG, PNG, WebP, HEIC) or a PDF.');
  }

  const flightRef = db.collection('flights').doc();
  const ticketRef = db.collection('flight_tickets').doc(flightRef.id);
  const batch = db.batch();
  batch.set(flightRef, {
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
    departureAt: Timestamp.fromDate(input.departureAt),
    arrivalAt: Timestamp.fromDate(input.arrivalAt),
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
    // Posting is free, so a listing goes straight to LIVE.
    status: 'LIVE' satisfies FlightStatus,
    bidCount: 0,
    // Staff check the ticket against the listing; acceptBid waits for VERIFIED.
    ticketStatus: 'PENDING',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  // Written with the flight so a listing never exists without its proof.
  batch.set(ticketRef, {
    flightId: flightRef.id,
    travelerId: caller.uid,
    storagePath: input.ticketPath,
    contentType: ticketType,
    // Staff-facing only, which is why it lives here and not on the public flight.
    scheduleCheck,
    createdAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

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

    // Bidding is free, so two limits stand in for a fee: one open offer per
    // flight (what a traveler expects to see), and a cap on open offers overall
    // so one account cannot paper every listing on a route. Read inside the
    // transaction so a double-click cannot slip two past the first.
    const open = await tx.get(
      db.collection('bids')
        .where('senderId', '==', caller.uid)
        .where('status', '==', 'PENDING' satisfies BidStatus)
        .limit(MAX_OPEN_BIDS_PER_SENDER),
    );
    if (open.docs.some((d) => d.get('flightId') === input.flightId)) {
      throw new HttpsError(
        'already-exists',
        'You already have an offer waiting on this flight. Withdraw it first to change it.',
      );
    }
    if (open.size >= MAX_OPEN_BIDS_PER_SENDER) {
      throw new HttpsError(
        'resource-exhausted',
        `You have ${MAX_OPEN_BIDS_PER_SENDER} offers waiting for an answer, which is the most you can `
          + 'have at once. Withdraw one, or wait for a traveler to reply.',
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
      status: 'PENDING' satisfies BidStatus,
      agreedAt: null,
      expiresAt: Timestamp.fromDate(expiresAt),
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
  // A transaction shares its bid's id: one bid yields at most one deal, and a
  // retried accept lands on the same document instead of a second one.
  const txRef = db.collection('transactions').doc(bidId);
  const codeRef = db.collection('delivery_codes').doc(bidId);

  // Config is not part of the atomic unit; reading it inside would only add contention.
  const feePercent = await getPlatformFeePercent();

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

    // Only an open listing takes on new agreements. Cancelled, expired or
    // departed flights are rejected here rather than relying on every path that
    // closes a flight to have swept its pending bids first.
    if (flight.status !== ('LIVE' satisfies FlightStatus)) {
      throw new HttpsError('failed-precondition', 'This flight is no longer taking bids.');
    }

    // A deal is only struck on a listing whose ticket staff have checked. This is
    // also what lets a ticket rejection close a listing without unwinding an
    // agreed bid — there can never be one.
    if (flight.ticketStatus !== 'VERIFIED') {
      throw new HttpsError(
        'failed-precondition',
        'You can accept bids once our team has verified your ticket.',
      );
    }

    if (bid.kgRequested > flight.kgRemaining) {
      throw new HttpsError(
        'failed-precondition',
        `Only ${flight.kgRemaining}kg remain — not enough for this bid.`,
      );
    }

    // Contact details are exchanged the moment a deal is struck (blueprint §5.4),
    // so both parties must be reachable before one exists. submitBid already
    // demands the sender's phone; the traveler's is checked here.
    const [travelerSnap, senderSnap] = await Promise.all([
      tx.get(db.collection('users').doc(caller.uid)),
      tx.get(db.collection('users').doc(bid.senderId as string)),
    ]);
    const travelerUser = travelerSnap.data() ?? {};
    const senderUser = senderSnap.data() ?? {};
    if (travelerUser.suspended === true) {
      throw new HttpsError('permission-denied', 'Your account is suspended.');
    }
    if (!travelerUser.phone) {
      throw new HttpsError(
        'failed-precondition',
        'Add a phone number to your profile first — the sender needs a way to reach you.',
      );
    }

    const kgRemaining = Math.round((flight.kgRemaining - bid.kgRequested) * 100) / 100;

    tx.update(bidRef, {
      status: 'AGREED' satisfies BidStatus,
      agreedAt: FieldValue.serverTimestamp(),
      transactionId: bidId,
    });

    tx.update(flightRef, {
      kgRemaining,
      // Capacity exhausted: hide from search but keep it reachable for existing bidders.
      ...(kgRemaining <= 0 ? { status: 'LOCKED' satisfies FlightStatus } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const totalPrice: number = bid.offeredTotal;
    const platformFee = Math.round(totalPrice * feePercent) / 100;
    tx.set(txRef, {
      transactionId: bidId,
      bidId,
      flightId: bid.flightId,
      travelerId: caller.uid,
      senderId: bid.senderId,
      // Mirrors the bid's status from here on, so either party's list of deals
      // can be read without joining back to bids.
      status: 'AGREED' satisfies BidStatus,
      // Snapshot of the trip, so the deal still reads correctly if the listing
      // is later edited or closed.
      flight: {
        originAirport: flight.originAirport,
        destinationAirport: flight.destinationAirport,
        airline: flight.airline ?? '',
        flightNumber: flight.flightNumber ?? '',
        departureAt: flight.departureAt,
        arrivalAt: flight.arrivalAt ?? null,
      },
      item: {
        description: bid.itemDescription ?? '',
        category: bid.itemCategory ?? '',
        declaredValue: bid.declaredValue ?? 0,
        specialHandling: bid.specialHandling ?? null,
      },
      kg: bid.kgRequested,
      totalPrice,
      currency: bid.currency ?? flight.currency ?? 'MYR',
      platformFee,
      payoutToTraveler: Math.round((totalPrice - platformFee) * 100) / 100,
      // v1 settles directly between the parties: this records the state of that
      // settlement, it does not mean the platform is holding money.
      payoutStatus: 'PENDING',
      // Revealed only now that a deal exists; the transaction is readable by
      // its two parties alone (firestore.rules).
      parties: {
        traveler: {
          displayName: travelerUser.displayName || 'Traveler',
          phone: travelerUser.phone,
        },
        sender: {
          displayName: senderUser.displayName || bid.sender?.displayName || 'Sender',
          phone: senderUser.phone ?? null,
        },
      },
      handoffConfirmedAt: null,
      handoffNote: null,
      pickupConfirmedAt: null,
      pickupNote: null,
      deliveredAt: null,
      recipientConfirmedAt: null,
      codeAttempts: 0,
      disputeId: null,
      ratingBySenderOfTraveler: null,
      reviewBySender: null,
      ratingByTravelerOfSender: null,
      reviewByTraveler: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      closedAt: null,
    });

    // The sender passes this to the recipient, who hands it to the traveler on
    // delivery. Kept out of the transaction document because the traveler can
    // read that — a code they could look up would prove nothing.
    tx.set(codeRef, {
      transactionId: bidId,
      senderId: bid.senderId,
      code: String(randomInt(0, 1_000_000)).padStart(6, '0'),
      createdAt: FieldValue.serverTimestamp(),
    });

    return { flightId: bid.flightId as string, kgRemaining, transactionId: bidId };
  });

  logger.info('Bid accepted', { bidId, uid: caller.uid, kgRemaining: result.kgRemaining });
  return { success: true, ...result };
});

/** Bids on one flight in the given states, read inside a transaction. */
function bidsOnFlight(
  tx: admin.firestore.Transaction,
  flightId: string,
  statuses: BidStatus[],
  max: number,
) {
  return tx.get(
    db.collection('bids')
      .where('flightId', '==', flightId)
      .where('status', 'in', statuses)
      .limit(max),
  );
}

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
  const now = Timestamp.now();
  const stale = await db
    .collection('bids')
    .where('status', '==', 'PENDING')
    .where('expiresAt', '<=', now)
    .limit(400)
    .get();

  if (stale.empty) return;

  // One transaction per bid rather than a single batch: each status is
  // re-checked before it is written, and a batch cannot read. Bids are
  // independent, so a failure on one must not abandon the rest.
  let expired = 0;
  let failed = 0;

  for (const doc of stale.docs) {
    try {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(doc.ref);
        if (!snap.exists) return;
        const bid = snap.data()!;

        // Re-checked inside the transaction: the traveler may have answered this
        // bid between the query above and now.
        const check = canTransitionBid(bid.status as BidStatus, 'EXPIRED', 'SYSTEM');
        if (!check.allowed) return;

        tx.update(doc.ref, { status: 'EXPIRED' satisfies BidStatus });
        expired++;
      });
    } catch (error) {
      failed++;
      logger.error('Failed to expire bid', { bidId: doc.id, error });
    }
  }

  logger.info('Expired stale bids', { scanned: stale.size, expired, failed });
});

/**
 * Closes listings the plane has already left behind: LIVE/DRAFT -> EXPIRED.
 *
 * Browse already hides these — `listFlights` ranges on `departureAt >= now` — so
 * without this sweep a departed listing is invisible to everyone *except* its
 * own traveler, whose "my flights" view reads the stored status and keeps
 * showing LIVE. The status is what the owner-facing UI trusts, so it has to
 * become true rather than being inferred in three separate places.
 *
 * Pending bids on the flight are expired in the same transaction. Their own
 * `expiresAt` is set at submit time and can easily fall after departure, so
 * leaving them to `expireStaleBids` would keep an offer open — and counting
 * toward the sender's open-bid cap — on a flight that can never accept it.
 */
export const expireFlights = onSchedule('every 60 minutes', async () => {
  const now = Timestamp.now();

  // LOCKED is included: its capacity is committed to agreements, so at
  // departure it becomes a trip in progress (IN_TRANSIT), never EXPIRED.
  const departed = await db
    .collection('flights')
    .where('status', 'in', ['LIVE', 'DRAFT', 'LOCKED'] satisfies FlightStatus[])
    .where('departureAt', '<=', now)
    .limit(200)
    .get();

  if (departed.empty) return;

  const outcomes: Record<string, number> = { EXPIRED: 0, IN_TRANSIT: 0, COMPLETED: 0 };
  let bidsExpired = 0;
  let failed = 0;

  // One transaction per flight, so the flight and its pending bids close
  // together. Flights are independent — a failure on one must not abandon the rest.
  for (const doc of departed.docs) {
    try {
      await db.runTransaction(async (tx) => {
        // Every read first: Firestore forbids a read after a write in the same
        // transaction, so the flight's bids are fetched before anything is set.
        const snap = await tx.get(doc.ref);
        if (!snap.exists) return;
        const flight = snap.data()!;
        const from = flight.status as FlightStatus;

        // Re-checked inside the transaction: the traveler may have cancelled the
        // listing since the query above.
        if (!['LIVE', 'DRAFT', 'LOCKED'].includes(from)) return;
        if (flight.departureAt.toDate() > new Date()) return;

        const [pending, agreements, open] = await Promise.all([
          bidsOnFlight(tx, doc.id, ['PENDING'], 50),
          bidsOnFlight(tx, doc.id, AGREEMENT_STATUSES, 1),
          bidsOnFlight(tx, doc.id, OPEN_AGREEMENT_STATUSES, 1),
        ]);

        // A listing nobody agreed to simply lapsed. One with agreements is a
        // trip that flew: expiring it would strand real parcels in a terminal
        // state. If every delivery already landed, it is done outright.
        const to: FlightStatus = agreements.empty
          ? 'EXPIRED'
          : open.empty ? 'COMPLETED' : 'IN_TRANSIT';

        const path: FlightStatus[] = to === 'COMPLETED' ? ['IN_TRANSIT', 'COMPLETED'] : [to];
        let at = from;
        for (const step of path) {
          const check = canTransitionFlight(at, step, 'SYSTEM');
          if (!check.allowed) {
            logger.warn('Departed flight not moved', { flightId: doc.id, from, to, reason: check.reason });
            return;
          }
          at = step;
        }

        tx.update(doc.ref, {
          status: to,
          updatedAt: FieldValue.serverTimestamp(),
        });

        for (const bidDoc of pending.docs) {
          tx.update(bidDoc.ref, { status: 'EXPIRED' satisfies BidStatus });
          bidsExpired++;
        }
        outcomes[to]++;
      });
    } catch (error) {
      failed++;
      logger.error('Failed to close departed flight', { flightId: doc.id, error });
    }
  }

  logger.info('Closed departed flights', {
    scanned: departed.size, ...outcomes, bidsExpired, failed,
  });
});

// ---------------------------------------------------------------------------
// Flight schedule lookup (AeroDataBox via RapidAPI)
// ---------------------------------------------------------------------------

/** Set with `firebase functions:secrets:set AERODATABOX_KEY` — the RapidAPI key. */
const AERODATABOX_KEY = defineSecret('AERODATABOX_KEY');
const AERODATABOX_HOST = 'aerodatabox.p.rapidapi.com';
/** Provider calls one user may trigger per UTC day. Each call is billed. */
const LOOKUPS_PER_DAY = 20;
/** How long one schedule answer is reused before the provider is asked again. */
const LOOKUP_CACHE_MS = 6 * 3600_000;
/** How far a posted departure may sit from the published one and still match. */
const SCHEDULE_MATCH_TOLERANCE_MS = 90 * 60_000;

/** Stored in `flight_lookups` and returned to the client. Mirrors FlightScheduleMatch in src/lib/types.ts. */
interface ScheduleRow {
  airline: string;
  flightNumber: string;
  originAirport: string;
  destinationAirport: string;
  departureAt: string;
  arrivalAt: string | null;
  served: boolean;
}

/** The slice of the provider's FlightContract we read. Everything is unknown until checked. */
interface ProviderMovement {
  airport?: { iata?: unknown };
  scheduledTime?: { utc?: unknown };
}
interface ProviderFlight {
  number?: unknown;
  isCargo?: unknown;
  airline?: { name?: unknown };
  departure?: ProviderMovement;
  arrival?: ProviderMovement;
}

/** The provider writes "2025-02-01 08:55Z"; ISO-8601 wants a "T" there. */
function providerTime(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const ms = Date.parse(value.replace(' ', 'T'));
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

async function fetchSchedule(flightNumber: string, date: string, key: string): Promise<ScheduleRow[]> {
  const url = `https://${AERODATABOX_HOST}/flights/number/${encodeURIComponent(flightNumber)}/${date}`
    + '?dateLocalRole=Departure&withAircraftImage=false&withLocation=false';

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': AERODATABOX_HOST },
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    logger.warn('Flight lookup request failed', { flightNumber, date, error });
    throw new HttpsError('unavailable', 'Flight lookup is unavailable right now. Enter the details yourself.');
  }

  // 204 is the provider's "no such flight on that date".
  if (res.status === 204 || res.status === 404) return [];
  if (!res.ok) {
    // The status is logged, never the key; 401/403 here means the secret is wrong or the plan lapsed.
    logger.warn('Flight lookup rejected', { flightNumber, date, status: res.status });
    throw new HttpsError('unavailable', 'Flight lookup is unavailable right now. Enter the details yourself.');
  }

  const body: unknown = await res.json();
  if (!Array.isArray(body)) return [];

  const rows: ScheduleRow[] = [];
  for (const f of body as ProviderFlight[]) {
    if (f?.isCargo === true) continue;
    const origin = f?.departure?.airport?.iata;
    const destination = f?.arrival?.airport?.iata;
    const departureAt = providerTime(f?.departure?.scheduledTime?.utc);
    if (typeof origin !== 'string' || typeof destination !== 'string' || !departureAt) continue;
    rows.push({
      airline: typeof f.airline?.name === 'string' ? f.airline.name.slice(0, 80) : '',
      flightNumber: typeof f.number === 'string'
        ? f.number.replace(/\s+/g, '').toUpperCase().slice(0, 8)
        : flightNumber,
      originAirport: origin.toUpperCase(),
      destinationAirport: destination.toUpperCase(),
      departureAt,
      arrivalAt: providerTime(f?.arrival?.scheduledTime?.utc),
      served: servedRoute(origin.toUpperCase(), destination.toUpperCase()),
    });
  }
  return rows.slice(0, 10);
}

/**
 * Looks up a flight's published schedule so the post form can pre-fill it.
 *
 * Answers are cached per flight and date, so repeat lookups — the same traveler
 * pressing the button twice, or two travelers on one plane — cost nothing. Only
 * calls that actually reach the provider count toward the daily cap.
 */
export const lookupFlight = onCall({ secrets: [AERODATABOX_KEY] }, async (request) => {
  const caller = requireVerified(request);
  const input = validateLookupFlight(request.data);

  const cacheRef = db.collection('flight_lookups').doc(`${input.flightNumber}_${input.date}`);
  const cached = await cacheRef.get();
  const fetchedAt = cached.data()?.fetchedAt as Timestamp | undefined;
  if (cached.exists && fetchedAt && Date.now() - fetchedAt.toMillis() < LOOKUP_CACHE_MS) {
    return { flights: cached.data()!.flights as ScheduleRow[] };
  }

  const key = AERODATABOX_KEY.value();
  if (!key) {
    throw new HttpsError('failed-precondition', 'Flight lookup is not set up yet. Enter the details yourself.');
  }

  const day = new Date().toISOString().slice(0, 10);
  const usageRef = db.collection('lookup_usage').doc(`${caller.uid}_${day}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(usageRef);
    const count = snap.exists ? Number(snap.data()!.count) || 0 : 0;
    if (count >= LOOKUPS_PER_DAY) {
      throw new HttpsError('resource-exhausted', 'You have used today\'s flight lookups. Enter the details yourself.');
    }
    tx.set(usageRef, { uid: caller.uid, day, count: count + 1, updatedAt: FieldValue.serverTimestamp() });
  });

  const flights = await fetchSchedule(input.flightNumber, input.date, key);
  // Cached even when empty: "no such flight" is an answer too, and the most likely one to be retried.
  await cacheRef.set({
    flightNumber: input.flightNumber,
    date: input.date,
    flights,
    fetchedAt: FieldValue.serverTimestamp(),
  });

  logger.info('Flight looked up', { uid: caller.uid, flightNumber: input.flightNumber, date: input.date, results: flights.length });
  return { flights };
});

/**
 * Compares a new listing with the published schedule, using cached lookups only.
 *
 * Posting never waits on or pays for a provider call, and never fails because
 * of one. A traveler who did not use the lookup is simply UNCHECKED. The result
 * is shown to staff next to the ticket; it does not block the listing.
 */
async function scheduleCheckFor(input: {
  flightNumber: string;
  originAirport: string;
  destinationAirport: string;
  departureAt: Date;
}): Promise<'MATCH' | 'MISMATCH' | 'UNCHECKED'> {
  try {
    // The cache is keyed by the origin's local date, which can be either side of
    // the UTC date — so read all three.
    const dates = [-1, 0, 1].map((offset) =>
      new Date(input.departureAt.getTime() + offset * 86_400_000).toISOString().slice(0, 10));
    const snaps = await db.getAll(
      ...dates.map((d) => db.collection('flight_lookups').doc(`${input.flightNumber}_${d}`)),
    );
    const rows = snaps.flatMap((s) => (s.exists ? (s.data()!.flights as ScheduleRow[]) ?? [] : []));
    if (rows.length === 0) return 'UNCHECKED';

    const match = rows.some((r) =>
      r.originAirport === input.originAirport
      && r.destinationAirport === input.destinationAirport
      && Math.abs(Date.parse(r.departureAt) - input.departureAt.getTime()) <= SCHEDULE_MATCH_TOLERANCE_MS);
    return match ? 'MATCH' : 'MISMATCH';
  } catch (error) {
    logger.warn('Schedule check failed', { flightNumber: input.flightNumber, error });
    return 'UNCHECKED';
  }
}

/**
 * Staff decision on the ticket behind a listing.
 *
 * VERIFY unlocks acceptBid for the flight. REJECT cancels the listing and
 * declines every pending bid on it.
 * acceptBid refuses unverified listings, so a flight still awaiting review
 * cannot hold an agreed bid and a rejection never strands a deal.
 */
export const reviewFlightTicket = onCall(async (request) => {
  const caller = requireAuth(request);
  if (!caller.isAdmin) {
    throw new HttpsError('permission-denied', 'Only staff can review tickets.');
  }
  const input = validateReviewFlightTicket(request.data);

  const flightRef = db.collection('flights').doc(input.flightId);
  const ticketRef = db.collection('flight_tickets').doc(input.flightId);

  const result = await db.runTransaction(async (tx) => {
    // Every read first — Firestore forbids a read after a write.
    const flightSnap = await tx.get(flightRef);
    const ticketSnap = await tx.get(ticketRef);
    if (!flightSnap.exists) throw new HttpsError('not-found', 'That flight no longer exists.');
    if (!ticketSnap.exists) {
      throw new HttpsError('failed-precondition', 'This flight has no ticket on file.');
    }
    const flight = flightSnap.data()!;
    const fromStatus = flight.status as FlightStatus;

    // Two reviewers opening the same queue item is the ordinary case; the second
    // must be told, not allowed to overwrite the first.
    if (flight.ticketStatus !== 'PENDING') {
      throw new HttpsError(
        'failed-precondition',
        `This ticket was already reviewed (${String(flight.ticketStatus).toLowerCase()}).`,
      );
    }

    // A listing that already lapsed has nothing left to cancel, but the ticket
    // is still marked so the record says what staff decided.
    const cancel = input.decision === 'REJECT'
      && canTransitionFlight(fromStatus, 'CANCELLED', 'ADMIN').allowed;

    const pending = cancel
      ? (await bidsOnFlight(tx, input.flightId, ['PENDING'], 200)).docs
      : [];

    const ticketStatus = input.decision === 'VERIFY' ? 'VERIFIED' : 'REJECTED';
    const toStatus: FlightStatus = cancel ? 'CANCELLED' : fromStatus;
    const now = FieldValue.serverTimestamp();

    tx.update(flightRef, {
      ticketStatus,
      ...(cancel ? { status: toStatus } : {}),
      updatedAt: now,
    });
    tx.update(ticketRef, {
      reviewStatus: ticketStatus,
      rejectionReason: input.reason,
      reviewedBy: caller.uid,
      reviewedAt: now,
    });
    for (const bidDoc of pending) {
      tx.update(bidDoc.ref, { status: 'DECLINED' satisfies BidStatus });
    }

    // Staged in the same transaction so the decision and its audit row land
    // together or not at all.
    const auditRef = db.collection('audit_log').doc();
    tx.create(auditRef, {
      entryId: auditRef.id,
      actorUid: caller.uid,
      actorName: caller.email ?? caller.uid,
      action: ticketStatus === 'VERIFIED' ? 'FLIGHT_TICKET_VERIFIED' : 'FLIGHT_TICKET_REJECTED',
      targetType: 'flight',
      targetId: input.flightId,
      reason: input.reason ?? 'Ticket matches the listing',
      beforeState: { ticketStatus: 'PENDING', status: fromStatus },
      afterState: { ticketStatus, status: toStatus, bidsDeclined: pending.length },
      timestamp: now,
    });

    return { ticketStatus, status: toStatus, bidsDeclined: pending.length };
  });

  logger.info('Flight ticket reviewed', { flightId: input.flightId, by: caller.uid, ...result });
  return result;
});

// ---------------------------------------------------------------------------
// Withdrawing and cancelling before a deal exists
// ---------------------------------------------------------------------------

/** The sender takes back a bid the traveler has not answered: PENDING -> WITHDRAWN. */
export const withdrawBid = onCall(async (request) => {
  const caller = requireAuth(request);
  const bidId = validateBidId(request.data);
  const bidRef = db.collection('bids').doc(bidId);

  await db.runTransaction(async (tx) => {
    const bidSnap = await tx.get(bidRef);
    if (!bidSnap.exists) throw new HttpsError('not-found', 'That bid no longer exists.');
    const bid = bidSnap.data()!;

    if (bid.senderId !== caller.uid) {
      throw new HttpsError('permission-denied', 'Only the sender can withdraw this bid.');
    }
    const check = canTransitionBid(bid.status as BidStatus, 'WITHDRAWN', 'SENDER');
    if (!check.allowed) throw new HttpsError('failed-precondition', check.reason!);

    tx.update(bidRef, { status: 'WITHDRAWN' satisfies BidStatus });
  });

  logger.info('Bid withdrawn', { bidId, uid: caller.uid });
  return { success: true };
});

/**
 * The traveler withdraws a listing: LIVE/DRAFT -> CANCELLED.
 *
 * Only while nothing has been agreed. Once a sender is counting on the trip,
 * cancelling is a broken deal, which goes through a dispute where staff can
 * see both sides — not a button that quietly strands someone's parcel.
 */
export const cancelFlight = onCall(async (request) => {
  const caller = requireAuth(request);
  const flightId = validateFlightId(request.data);
  const flightRef = db.collection('flights').doc(flightId);

  const bidsDeclined = await db.runTransaction(async (tx) => {
    const snap = await tx.get(flightRef);
    if (!snap.exists) throw new HttpsError('not-found', 'That flight no longer exists.');
    const flight = snap.data()!;

    const actor: Actor | null =
      flight.travelerId === caller.uid ? 'TRAVELER' : caller.isAdmin ? 'ADMIN' : null;
    if (!actor) throw new HttpsError('permission-denied', 'Only the traveler can cancel this flight.');

    const check = canTransitionFlight(flight.status as FlightStatus, 'CANCELLED', actor);
    if (!check.allowed) throw new HttpsError('failed-precondition', check.reason!);

    const [agreements, pending] = await Promise.all([
      bidsOnFlight(tx, flightId, AGREEMENT_STATUSES, 1),
      bidsOnFlight(tx, flightId, ['PENDING'], 200),
    ]);
    if (!agreements.empty) {
      throw new HttpsError(
        'failed-precondition',
        'You have accepted bids on this flight, so it cannot be cancelled here. '
          + 'Open a dispute on the affected delivery so our team can help.',
      );
    }

    tx.update(flightRef, {
      status: 'CANCELLED' satisfies FlightStatus,
      updatedAt: FieldValue.serverTimestamp(),
    });
    for (const bidDoc of pending.docs) {
      tx.update(bidDoc.ref, { status: 'DECLINED' satisfies BidStatus });
    }
    return pending.size;
  });

  logger.info('Flight cancelled', { flightId, uid: caller.uid, bidsDeclined });
  return { success: true, bidsDeclined };
});

// ---------------------------------------------------------------------------
// Agreed deals: handover, delivery, disputes, ratings, settlement
//
// A transaction is stored under its bid's id and mirrors the bid's status, so
// each step below moves both documents in one Firestore transaction. The bid
// state machine stays the authority on what may happen next.
// ---------------------------------------------------------------------------

/** Which side of a deal the caller is on, or null if they are not a party to it. */
function partyRole(deal: admin.firestore.DocumentData, uid: string): 'SENDER' | 'TRAVELER' | null {
  if (deal.senderId === uid) return 'SENDER';
  if (deal.travelerId === uid) return 'TRAVELER';
  return null;
}

/** Reads a bid and its transaction together; both must exist for an agreed deal. */
async function readDeal(tx: admin.firestore.Transaction, bidId: string) {
  const bidRef = db.collection('bids').doc(bidId);
  const txRef = db.collection('transactions').doc(bidId);
  const [bidSnap, txSnap] = await Promise.all([tx.get(bidRef), tx.get(txRef)]);
  if (!bidSnap.exists || !txSnap.exists) {
    throw new HttpsError('not-found', 'That delivery could not be found.');
  }
  return { bidRef, txRef, bid: bidSnap.data()!, deal: txSnap.data()! };
}

/**
 * Whether finishing this bid finishes its flight: the trip is under way and no
 * other agreement on it is still open. Read-only — callers write the result.
 */
async function flightCompletesWith(
  tx: admin.firestore.Transaction,
  flightId: string,
  bidId: string,
): Promise<{ ref: admin.firestore.DocumentReference; completes: boolean }> {
  const ref = db.collection('flights').doc(flightId);
  const [flightSnap, open] = await Promise.all([
    tx.get(ref),
    bidsOnFlight(tx, flightId, OPEN_AGREEMENT_STATUSES, 2),
  ]);
  const others = open.docs.filter((d) => d.id !== bidId);
  const status = flightSnap.data()?.status as FlightStatus | undefined;
  // Not yet IN_TRANSIT means expireFlights has not swept it since departure; it
  // completes the flight itself when it does, seeing no open agreements left.
  const completes = status === 'IN_TRANSIT'
    && others.length === 0
    && canTransitionFlight(status, 'COMPLETED', 'SYSTEM').allowed;
  return { ref, completes };
}

/**
 * One side confirms the parcel changed hands. The sender says "handed over",
 * the traveler says "received"; the second confirmation moves the deal to
 * HANDED_OVER, which is when the traveler takes responsibility for it.
 */
export const confirmHandover = onCall(async (request) => {
  const caller = requireAuth(request);
  const input = validateConfirmHandover(request.data);
  await requireActiveUser(caller.uid);

  const result = await db.runTransaction(async (tx) => {
    const { bidRef, txRef, bid, deal } = await readDeal(tx, input.bidId);
    const role = partyRole(deal, caller.uid);
    if (!role) throw new HttpsError('permission-denied', 'You are not part of this delivery.');

    if (bid.status !== ('AGREED' satisfies BidStatus)) {
      throw new HttpsError('failed-precondition', 'This delivery is already past the handover step.');
    }

    const mine = role === 'SENDER' ? 'handoffConfirmedAt' : 'pickupConfirmedAt';
    const theirs = role === 'SENDER' ? 'pickupConfirmedAt' : 'handoffConfirmedAt';
    // A repeat press is harmless: report where things stand without rewriting.
    if (deal[mine]) return { status: bid.status as BidStatus };

    const complete = Boolean(deal[theirs]);
    if (complete) {
      const check = canTransitionBid('AGREED', 'HANDED_OVER', role);
      if (!check.allowed) throw new HttpsError('failed-precondition', check.reason!);
    }
    const status: BidStatus = complete ? 'HANDED_OVER' : 'AGREED';

    tx.update(txRef, {
      [mine]: FieldValue.serverTimestamp(),
      [role === 'SENDER' ? 'handoffNote' : 'pickupNote']: input.note,
      status,
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (complete) tx.update(bidRef, { status });
    return { status };
  });

  logger.info('Handover confirmed', { bidId: input.bidId, uid: caller.uid, status: result.status });
  return result;
});

/**
 * The traveler records delivery with the code the recipient hands them.
 *
 * The code proves the parcel reached the sender's recipient — only the sender
 * can read it, and they share it with the person at the other end. Wrong
 * guesses are counted and capped, so it cannot be brute-forced.
 */
export const markDelivered = onCall(async (request) => {
  const caller = requireAuth(request);
  const input = validateMarkDelivered(request.data);
  await requireActiveUser(caller.uid);

  const outcome = await db.runTransaction(async (tx) => {
    const { bidRef, txRef, bid, deal } = await readDeal(tx, input.bidId);
    if (deal.travelerId !== caller.uid) {
      throw new HttpsError('permission-denied', 'Only the traveler can confirm this delivery.');
    }

    const check = canTransitionBid(bid.status as BidStatus, 'DELIVERED', 'TRAVELER');
    if (!check.allowed) {
      throw new HttpsError(
        'failed-precondition',
        bid.status === 'AGREED'
          ? 'Confirm the handover with the sender before recording delivery.'
          : check.reason!,
      );
    }

    const attempts: number = typeof deal.codeAttempts === 'number' ? deal.codeAttempts : 0;
    if (attempts >= MAX_CODE_ATTEMPTS) {
      throw new HttpsError(
        'resource-exhausted',
        'Too many incorrect codes. Open a dispute and our team will confirm the delivery with you.',
      );
    }

    const departure = deal.flight?.departureAt as Timestamp | undefined;
    if (departure && departure.toDate() > new Date()) {
      throw new HttpsError('failed-precondition', 'You can confirm delivery once your flight has departed.');
    }

    const codeSnap = await tx.get(db.collection('delivery_codes').doc(input.bidId));
    const flight = await flightCompletesWith(tx, bid.flightId as string, input.bidId);

    if (!codeSnap.exists || codeSnap.data()!.code !== input.code) {
      // Committed, not thrown: a throw would roll back the attempt counter and
      // make guessing free.
      tx.update(txRef, { codeAttempts: attempts + 1, updatedAt: FieldValue.serverTimestamp() });
      return { delivered: false as const, attemptsLeft: MAX_CODE_ATTEMPTS - attempts - 1 };
    }

    const now = FieldValue.serverTimestamp();
    tx.update(bidRef, { status: 'DELIVERED' satisfies BidStatus });
    tx.update(txRef, {
      status: 'DELIVERED' satisfies BidStatus,
      deliveredAt: now,
      recipientConfirmedAt: now,
      updatedAt: now,
    });
    if (flight.completes) {
      tx.update(flight.ref, { status: 'COMPLETED' satisfies FlightStatus, updatedAt: now });
    }
    return { delivered: true as const, flightCompleted: flight.completes };
  });

  if (!outcome.delivered) {
    throw new HttpsError(
      'invalid-argument',
      outcome.attemptsLeft > 0
        ? `That code is not right. ${outcome.attemptsLeft} attempt${outcome.attemptsLeft === 1 ? '' : 's'} left.`
        : 'That code is not right, and no attempts are left. Open a dispute and our team will help.',
    );
  }

  logger.info('Delivery confirmed', { bidId: input.bidId, uid: caller.uid, ...outcome });
  return { success: true, flightCompleted: outcome.flightCompleted };
});

/**
 * Either party flags a problem. Freezes settlement until staff resolve it.
 * Open from agreement until DISPUTE_WINDOW_HOURS after delivery.
 */
export const openDispute = onCall(async (request) => {
  const caller = requireAuth(request);
  const input = validateOpenDispute(request.data);
  const disputeRef = db.collection('disputes').doc(input.bidId);

  await db.runTransaction(async (tx) => {
    const { bidRef, txRef, bid, deal } = await readDeal(tx, input.bidId);
    const role = partyRole(deal, caller.uid);
    if (!role) throw new HttpsError('permission-denied', 'You are not part of this delivery.');

    const check = canTransitionBid(bid.status as BidStatus, 'DISPUTED', role);
    if (!check.allowed) throw new HttpsError('failed-precondition', check.reason!);

    if (deal.payoutStatus !== 'PENDING') {
      throw new HttpsError('failed-precondition', 'This delivery has already been settled.');
    }
    const deliveredAt = deal.deliveredAt as Timestamp | null;
    if (deliveredAt && Date.now() - deliveredAt.toMillis() > DISPUTE_WINDOW_HOURS * 3600_000) {
      throw new HttpsError(
        'failed-precondition',
        `The ${DISPUTE_WINDOW_HOURS}-hour window to report a problem with this delivery has closed.`,
      );
    }

    const existing = await tx.get(disputeRef);
    if (existing.exists) {
      throw new HttpsError('already-exists', 'A dispute is already open for this delivery.');
    }

    const now = FieldValue.serverTimestamp();
    tx.set(disputeRef, {
      disputeId: input.bidId,
      transactionId: input.bidId,
      bidId: input.bidId,
      flightId: bid.flightId,
      travelerId: deal.travelerId,
      senderId: deal.senderId,
      travelerName: deal.parties?.traveler?.displayName ?? 'Traveler',
      senderName: deal.parties?.sender?.displayName ?? 'Sender',
      openedBy: caller.uid,
      openedByRole: role === 'SENDER' ? 'sender' : 'traveler',
      claimText: input.reason,
      // Where the deal stood, so staff know whether the parcel ever moved.
      statusWhenOpened: bid.status,
      evidenceUrls: [],
      status: 'OPEN',
      assignedAdminId: null,
      adminNotes: null,
      resolution: null,
      createdAt: now,
      resolvedAt: null,
    });
    tx.update(bidRef, { status: 'DISPUTED' satisfies BidStatus });
    tx.update(txRef, {
      status: 'DISPUTED' satisfies BidStatus,
      payoutStatus: 'DISPUTED',
      disputeId: input.bidId,
      updatedAt: now,
    });
  });

  logger.info('Dispute opened', { bidId: input.bidId, uid: caller.uid });
  return { success: true, disputeId: input.bidId };
});

/** What each staff decision means for the settlement record. */
const PAYOUT_FOR_OUTCOME: Record<DisputeOutcome, 'RELEASED' | 'REFUNDED'> = {
  RESOLVED_FOR_TRAVELER: 'RELEASED',
  RESOLVED_FOR_SENDER: 'REFUNDED',
  SPLIT: 'RELEASED',
  CLOSED_INVALID: 'RELEASED',
};

/** Staff close a dispute: DISPUTED -> RESOLVED, with a rationale both parties see. */
export const resolveDispute = onCall(async (request) => {
  const caller = requireAuth(request);
  if (!caller.isAdmin) throw new HttpsError('permission-denied', 'Staff only.');
  const input = validateResolveDispute(request.data);
  const disputeRef = db.collection('disputes').doc(input.bidId);

  const before = await db.runTransaction(async (tx) => {
    const { bidRef, txRef, bid } = await readDeal(tx, input.bidId);
    const disputeSnap = await tx.get(disputeRef);
    if (!disputeSnap.exists) throw new HttpsError('not-found', 'That dispute could not be found.');

    const check = canTransitionBid(bid.status as BidStatus, 'RESOLVED', 'ADMIN');
    if (!check.allowed) throw new HttpsError('failed-precondition', check.reason!);

    const flight = await flightCompletesWith(tx, bid.flightId as string, input.bidId);

    const now = FieldValue.serverTimestamp();
    tx.update(disputeRef, {
      status: input.outcome,
      resolution: input.outcome,
      adminNotes: input.rationale,
      assignedAdminId: caller.uid,
      resolvedAt: now,
    });
    tx.update(bidRef, { status: 'RESOLVED' satisfies BidStatus });
    tx.update(txRef, {
      status: 'RESOLVED' satisfies BidStatus,
      payoutStatus: PAYOUT_FOR_OUTCOME[input.outcome],
      closedAt: now,
      updatedAt: now,
    });
    if (flight.completes) {
      tx.update(flight.ref, { status: 'COMPLETED' satisfies FlightStatus, updatedAt: now });
    }
    return { status: disputeSnap.data()!.status as string };
  });

  await writeAudit({
    actorUid: caller.uid,
    action: 'DISPUTE_RESOLVED',
    targetType: 'dispute',
    targetId: input.bidId,
    reason: input.rationale,
    beforeState: before,
    afterState: { status: input.outcome },
  });

  logger.info('Dispute resolved', { bidId: input.bidId, uid: caller.uid, outcome: input.outcome });
  return { success: true };
});

/**
 * One rating per party per delivery, 1-5 stars, folded into the counterpart's
 * running average in the same transaction so the two can never disagree.
 */
export const submitRating = onCall(async (request) => {
  const caller = requireAuth(request);
  const input = validateSubmitRating(request.data);

  await db.runTransaction(async (tx) => {
    const { txRef, bid, deal } = await readDeal(tx, input.bidId);
    const role = partyRole(deal, caller.uid);
    if (!role) throw new HttpsError('permission-denied', 'You are not part of this delivery.');

    if (bid.status !== 'DELIVERED' && bid.status !== 'RESOLVED') {
      throw new HttpsError('failed-precondition', 'You can leave a rating once the delivery is complete.');
    }

    const ratingField = role === 'SENDER' ? 'ratingBySenderOfTraveler' : 'ratingByTravelerOfSender';
    const reviewField = role === 'SENDER' ? 'reviewBySender' : 'reviewByTraveler';
    if (deal[ratingField] !== null && deal[ratingField] !== undefined) {
      throw new HttpsError('already-exists', 'You have already rated this delivery.');
    }

    const counterpartRef = db.collection('users').doc(
      (role === 'SENDER' ? deal.travelerId : deal.senderId) as string,
    );
    const counterpart = (await tx.get(counterpartRef)).data() ?? {};
    const count: number = typeof counterpart.ratingCount === 'number' ? counterpart.ratingCount : 0;
    const average: number = typeof counterpart.averageRating === 'number' ? counterpart.averageRating : 0;
    const nextCount = count + 1;

    tx.update(txRef, {
      [ratingField]: input.stars,
      [reviewField]: input.comment,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.update(counterpartRef, {
      ratingCount: nextCount,
      averageRating: Math.round(((average * count + input.stars) / nextCount) * 100) / 100,
    });
  });

  logger.info('Rating submitted', { bidId: input.bidId, uid: caller.uid, stars: input.stars });
  return { success: true };
});

/**
 * Settles deliveries whose dispute window closed quietly: the trip counts
 * toward both parties' records.
 */
export const settleTransactions = onSchedule('every 60 minutes', async () => {
  const cutoff = Timestamp.fromMillis(Date.now() - DISPUTE_WINDOW_HOURS * 3600_000);
  const due = await db
    .collection('transactions')
    .where('status', '==', 'DELIVERED' satisfies BidStatus)
    .where('deliveredAt', '<=', cutoff)
    .limit(200)
    .get();

  if (due.empty) return;

  let settled = 0;
  let failed = 0;

  for (const doc of due.docs) {
    try {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(doc.ref);
        if (!snap.exists) return;
        const deal = snap.data()!;
        // A dispute opened since the query, or a run that already settled it.
        if (deal.status !== 'DELIVERED' || deal.payoutStatus !== 'PENDING') return;

        const travelerId = deal.travelerId as string;
        const senderId = deal.senderId as string;
        const now = FieldValue.serverTimestamp();
        tx.update(doc.ref, { payoutStatus: 'RELEASED', closedAt: now, updatedAt: now });
        tx.update(db.collection('users').doc(travelerId), {
          completedTripsAsTraveler: FieldValue.increment(1),
        });
        tx.update(db.collection('users').doc(senderId), {
          completedTripsAsSender: FieldValue.increment(1),
        });
        settled++;
      });
    } catch (error) {
      failed++;
      logger.error('Failed to settle transaction', { transactionId: doc.id, error });
    }
  }

  logger.info('Settled transactions', { scanned: due.size, settled, failed });
});
