import { HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

/**
 * The points ledger (blueprint §5).
 *
 * Every point that enters or leaves an account does so as one append-only row in
 * `points_ledger`. The balance fields on the user document are a cache of that
 * ledger, never an independent source of truth: `sum(delta) == pointsBalance +
 * promoBalance` must hold for every user, forever. That invariant is the whole
 * reason this module exists, and it is why `onUserCreate` seeds balances at 0
 * rather than handing out a flat opening balance no entry accounts for.
 *
 * Two rules follow from it and are enforced here rather than left to callers:
 *
 *  1. Balance is written as an absolute value computed from the balance we just
 *     read — never `FieldValue.increment`. Increment cannot tell us the
 *     resulting figure, and `balanceAfter` has to be recorded on the row for
 *     reconciliation to be able to walk the ledger and check it.
 *
 *  2. Every entry has a caller-supplied deterministic id. Callables retry, users
 *     double-click, and schedulers overlap; a replay must land on the id that is
 *     already there and become a no-op instead of moving points twice.
 */

// Lazily resolved: this module is imported before index.ts calls
// admin.initializeApp(), so touching admin.firestore() at module scope would
// throw "the default Firebase app does not exist".
const db = () => admin.firestore();
const FieldValue = () => admin.firestore.FieldValue;

export type PointsCategory =
  | 'SIGNUP' | 'MONTHLY' | 'REFERRAL' | 'TRIP_REWARD'
  | 'BID_HOLD' | 'BID_CAPTURE' | 'BID_REFUND'
  | 'FLIGHT_POST' | 'FEATURE' | 'URGENCY'
  | 'PURCHASE' | 'ADMIN_ADJUSTMENT' | 'DISPUTE_RESOLUTION';

export type ReferenceType = 'FLIGHT' | 'BID' | 'TRANSACTION' | 'PURCHASE' | 'DISPUTE' | 'NONE';

export type LedgerActor = 'USER' | 'SYSTEM' | 'ADMIN';

// ---------------------------------------------------------------------------
// Economy configuration
// ---------------------------------------------------------------------------

export interface PointsEconomyConfig {
  signupBonus: number;
  monthlyFree: number;
  /** Ceiling on the balance the monthly top-up will lift a user to. */
  monthlyFreeCap: number;
  flightPostCost: number;
  bidSubmitCost: number;
  /** Price of one 24-hour block of featured placement on a flight listing. */
  featuredCostPer24h: number;
  /** Urgency tiers. Each level is sold as one fixed block, not by the hour. */
  urgencyLevel1CostPer24h: number;
  urgencyLevel2CostPer48h: number;
  urgencyLevel3CostPer72h: number;
  relistCost: number;
  tripRewardTraveler: number;
  deliveryRewardSender: number;
  referralRewardReferrer: number;
  referralRewardInvitee: number;
}

/**
 * Defaults live in code so the economy works on a fresh project with no
 * `app_config` document seeded. Anything present in `app_config/main` overrides
 * the matching field, so pricing can be tuned without a deploy.
 */
export const DEFAULT_POINTS_ECONOMY: PointsEconomyConfig = {
  signupBonus: 100,
  monthlyFree: 50,
  monthlyFreeCap: 200,
  flightPostCost: 0,
  bidSubmitCost: 10,
  featuredCostPer24h: 15,
  urgencyLevel1CostPer24h: 10,
  urgencyLevel2CostPer48h: 25,
  urgencyLevel3CostPer72h: 50,
  relistCost: 5,
  tripRewardTraveler: 25,
  deliveryRewardSender: 10,
  referralRewardReferrer: 50,
  referralRewardInvitee: 25,
};

export async function getPointsEconomy(): Promise<PointsEconomyConfig> {
  try {
    const snap = await db().collection('app_config').doc('main').get();
    const override = snap.exists ? snap.data()?.pointsEconomy : null;
    if (!override) return DEFAULT_POINTS_ECONOMY;

    // Merge field by field and ignore anything non-numeric: a malformed config
    // document must not be able to make bidding free or infinitely expensive.
    const merged = { ...DEFAULT_POINTS_ECONOMY };
    for (const key of Object.keys(DEFAULT_POINTS_ECONOMY) as (keyof PointsEconomyConfig)[]) {
      const value = override[key];
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
        merged[key] = Math.round(value);
      }
    }
    return merged;
  } catch {
    return DEFAULT_POINTS_ECONOMY;
  }
}

/**
 * Feature flags from `app_config/main`.
 *
 * Both boosts default to OFF: production has no `app_config/main` document, so
 * a default of ON would put both paid features live the moment this deploys —
 * before their pricing is settled. Shipping the code dark lets an admin switch
 * either on from `/admin/settings` without a deploy, and switch it back off as
 * a kill switch if pricing is wrong or a promotion has to stop mid-flight.
 * Absent or non-boolean values fall back to the default rather than to `true`,
 * so a malformed document cannot silently start charging people.
 */
export interface FeatureFlags {
  enableFeaturedListings: boolean;
  enableUrgencyBoosts: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  enableFeaturedListings: false,
  enableUrgencyBoosts: false,
};

export async function getFeatureFlags(): Promise<FeatureFlags> {
  try {
    const snap = await db().collection('app_config').doc('main').get();
    const override = snap.exists ? snap.data()?.featureFlags : null;
    if (!override) return DEFAULT_FEATURE_FLAGS;

    const merged = { ...DEFAULT_FEATURE_FLAGS };
    for (const key of Object.keys(DEFAULT_FEATURE_FLAGS) as (keyof FeatureFlags)[]) {
      if (typeof override[key] === 'boolean') merged[key] = override[key];
    }
    return merged;
  } catch {
    return DEFAULT_FEATURE_FLAGS;
  }
}

// ---------------------------------------------------------------------------
// Boost pricing
// ---------------------------------------------------------------------------

export type UrgencyLevel = 1 | 2 | 3;

/** Hours of visibility bought at each urgency tier. Fixed blocks, not hourly. */
export const URGENCY_HOURS: Record<UrgencyLevel, number> = { 1: 24, 2: 48, 3: 72 };

export function urgencyCost(economy: PointsEconomyConfig, level: UrgencyLevel): number {
  switch (level) {
    case 1: return economy.urgencyLevel1CostPer24h;
    case 2: return economy.urgencyLevel2CostPer48h;
    case 3: return economy.urgencyLevel3CostPer72h;
  }
}

/**
 * Extends an existing boost instead of truncating it.
 *
 * Buying a second block while the first is still running has to add to the time
 * remaining — starting the clock again from now would silently destroy paid-for
 * visibility, which is a refund request waiting to happen.
 */
export function extendExpiry(current: Date | null, hours: number, now = new Date()): Date {
  const base = current && current > now ? current : now;
  return new Date(base.getTime() + hours * 3600_000);
}

// ---------------------------------------------------------------------------
// Ledger core
// ---------------------------------------------------------------------------

export interface LedgerWrite {
  /** Deterministic document id — the idempotency key. */
  entryId: string;
  userId: string;
  /** Signed. Negative spends, positive credits, 0 records a state change only. */
  delta: number;
  category: PointsCategory;
  referenceType: ReferenceType;
  referenceId: string | null;
  description: string;
  createdBy: LedgerActor;
  adminId?: string | null;
  /** Entry id of the hold this reverses, for BID_REFUND. */
  refundOf?: string | null;
  /**
   * Credit only: send it to the promotional bucket, which is spent first and is
   * not withdrawable. Ignored for debits.
   */
  toPromo?: boolean;
  /**
   * Refund only: how much of the original debit came out of promo, so the
   * reversal puts each part back where it came from.
   */
  restorePromo?: number;
}

export interface PreparedEntry {
  write: LedgerWrite;
  /** True when this id is already in the ledger; committing is then a no-op. */
  alreadyApplied: boolean;
  userRef: admin.firestore.DocumentReference;
  entryRef: admin.firestore.DocumentReference;
  pointsBalance: number;
  promoBalance: number;
  promoPortion: number;
  balanceAfter: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
}

/**
 * Read half of a ledger write.
 *
 * Firestore requires every read in a transaction to precede every write, so a
 * caller that already writes other documents must call this before it starts
 * writing. Splitting the operation is what makes that possible — a single
 * read-and-write helper could not be composed into `submitBid` at all.
 *
 * One entry per user per transaction. Two prepared entries for the same user
 * would both compute from the balance as it was before either ran, and the
 * second commit would overwrite the first — losing points silently rather than
 * failing loudly. To move points twice, post two transactions.
 */
export async function prepareEntry(
  tx: admin.firestore.Transaction,
  write: LedgerWrite,
): Promise<PreparedEntry> {
  if (!Number.isFinite(write.delta) || !Number.isInteger(write.delta)) {
    throw new HttpsError('internal', 'Points must move in whole units.');
  }

  const userRef = db().collection('users').doc(write.userId);
  const entryRef = db().collection('points_ledger').doc(write.entryId);

  const [userSnap, entrySnap] = await Promise.all([tx.get(userRef), tx.get(entryRef)]);

  if (!userSnap.exists) {
    throw new HttpsError('failed-precondition', 'That account has no profile yet.');
  }

  const user = userSnap.data()!;
  const pointsBalance: number = typeof user.pointsBalance === 'number' ? user.pointsBalance : 0;
  const promoBalance: number = typeof user.promoBalance === 'number' ? user.promoBalance : 0;
  const lifetimeEarned: number =
    typeof user.lifetimePointsEarned === 'number' ? user.lifetimePointsEarned : 0;
  const lifetimeSpent: number =
    typeof user.lifetimePointsSpent === 'number' ? user.lifetimePointsSpent : 0;

  const base = {
    write,
    alreadyApplied: entrySnap.exists,
    userRef,
    entryRef,
    lifetimeEarned,
    lifetimeSpent,
  };

  // A replay must not recompute balances off the current figures — the original
  // entry already moved them. Report the untouched state and let commit skip.
  if (entrySnap.exists) {
    return {
      ...base,
      pointsBalance,
      promoBalance,
      promoPortion: 0,
      balanceAfter: pointsBalance + promoBalance,
    };
  }

  let nextPoints = pointsBalance;
  let nextPromo = promoBalance;
  let promoPortion = 0;

  if (write.delta < 0) {
    const cost = -write.delta;
    // Promotional points are spent first: they expire and cannot be withdrawn,
    // so burning them ahead of purchased points is always in the user's favour.
    promoPortion = Math.min(promoBalance, cost);
    const fromPurchased = cost - promoPortion;

    if (fromPurchased > pointsBalance) {
      throw new HttpsError(
        'failed-precondition',
        `Not enough points — this costs ${cost} and you have ${pointsBalance + promoBalance}.`,
      );
    }

    nextPromo = promoBalance - promoPortion;
    nextPoints = pointsBalance - fromPurchased;
  } else if (write.delta > 0) {
    // A refund returns each part to the bucket it was taken from, so a promo
    // credit cannot be laundered into withdrawable points by bidding and
    // cancelling.
    const toPromo = write.restorePromo ?? (write.toPromo ? write.delta : 0);
    const promoShare = Math.max(0, Math.min(toPromo, write.delta));
    promoPortion = promoShare;
    nextPromo = promoBalance + promoShare;
    nextPoints = pointsBalance + (write.delta - promoShare);
  }

  return {
    ...base,
    pointsBalance: nextPoints,
    promoBalance: nextPromo,
    promoPortion,
    balanceAfter: nextPoints + nextPromo,
  };
}

/**
 * Write half of a ledger write. Appends the row and refreshes the cached
 * balance in the same transaction, so the two can never diverge.
 */
export function commitEntry(tx: admin.firestore.Transaction, prepared: PreparedEntry): void {
  if (prepared.alreadyApplied) return;

  const { write } = prepared;

  tx.set(prepared.entryRef, {
    entryId: write.entryId,
    userId: write.userId,
    delta: write.delta,
    balanceAfter: prepared.balanceAfter,
    category: write.category,
    referenceType: write.referenceType,
    referenceId: write.referenceId,
    refundOf: write.refundOf ?? null,
    promoPortion: prepared.promoPortion,
    description: write.description,
    createdAt: FieldValue().serverTimestamp(),
    createdBy: write.createdBy,
    adminId: write.adminId ?? null,
  });

  // Lifetime counters track gross flows and are what the economy dashboard
  // reconciles against. A refund reverses its hold rather than counting as new
  // earnings, otherwise bidding and cancelling in a loop would inflate both
  // totals without a single point changing hands.
  const isReversal = write.category === 'BID_REFUND';
  const lifetimeDelta =
    write.delta < 0
      ? { lifetimePointsSpent: prepared.lifetimeSpent - write.delta }
      : write.delta > 0 && isReversal
        ? { lifetimePointsSpent: Math.max(0, prepared.lifetimeSpent - write.delta) }
        : write.delta > 0
          ? { lifetimePointsEarned: prepared.lifetimeEarned + write.delta }
          : {};

  tx.update(prepared.userRef, {
    pointsBalance: prepared.pointsBalance,
    promoBalance: prepared.promoBalance,
    ...lifetimeDelta,
  });
}

/**
 * Convenience wrapper for the common case: a points move that is the only thing
 * the transaction touches. Callers that also write other documents must use
 * `prepareEntry` / `commitEntry` directly so all reads stay ahead of all writes.
 */
export async function postEntry(write: LedgerWrite): Promise<PreparedEntry> {
  return db().runTransaction(async (tx) => {
    const prepared = await prepareEntry(tx, write);
    commitEntry(tx, prepared);
    return prepared;
  });
}

// ---------------------------------------------------------------------------
// Deterministic entry ids
//
// Derived from the thing that caused the move, so a retry of that same cause
// resolves to the same row. Never random.
// ---------------------------------------------------------------------------

export const entryIds = {
  signup: (uid: string) => `signup_${uid}`,
  /** `period` is YYYY-MM — one free top-up per calendar month, per user. */
  monthly: (uid: string, period: string) => `monthly_${uid}_${period}`,
  bidHold: (bidId: string) => `hold_${bidId}`,
  bidCapture: (bidId: string) => `capture_${bidId}`,
  bidRefund: (bidId: string) => `refund_${bidId}`,
  flightPost: (flightId: string) => `post_${flightId}`,
  /**
   * Boosts are repeatable on the same document, so the id carries a purchase
   * sequence taken from a counter on that document. Within one transaction the
   * counter is re-read on every retry, so a retried attempt reuses the same id
   * and cannot double-charge; a committed purchase advances it, so the next one
   * gets a fresh row.
   */
  feature: (flightId: string, seq: number) => `feature_${flightId}_${seq}`,
  urgency: (bidId: string, seq: number) => `urgency_${bidId}_${seq}`,
};

/** Current UTC year-month, the period key for the monthly free grant. */
export function currentPeriod(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** First instant of the period `currentPeriod` names, for the activity window. */
export function periodStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
