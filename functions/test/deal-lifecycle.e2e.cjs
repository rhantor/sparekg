/**
 * End-to-end test of the agreed-deal lifecycle, against the Firebase emulators.
 *
 *   npm --prefix functions run build
 *   npx firebase emulators:exec --only auth,firestore,functions --project demo-sparekg \
 *     "node functions/test/deal-lifecycle.e2e.cjs"
 *
 * The `demo-` project id keeps everything inside the emulators: nothing here can
 * reach production. Callables are driven through the client SDK as real signed-in
 * users, so the security rules and auth checks are exercised exactly as the app
 * would hit them. Scheduled functions are invoked directly through `.run()`.
 */

const assert = require('node:assert/strict');

// Loaded first: it calls admin.initializeApp(), and the test shares that app.
const fns = require('../lib/index.js');
const admin = require('firebase-admin');

const { initializeApp } = require('firebase/app');
const { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } = require('firebase/auth');
const {
  getFirestore, connectFirestoreEmulator, doc, getDoc,
} = require('firebase/firestore');
const { getFunctions, connectFunctionsEmulator, httpsCallable } = require('firebase/functions');

const PROJECT = process.env.GCLOUD_PROJECT || 'demo-sparekg';
const db = admin.firestore();
const { Timestamp } = admin.firestore;

let passed = 0;
async function step(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}\n    ${err?.stack || err}`);
    process.exitCode = 1;
    throw err;
  }
}

/** Asserts a callable/read rejects with the given code (e.g. "already-exists"). */
async function rejects(promise, code) {
  try {
    await promise;
  } catch (err) {
    const got = String(err.code || '').replace(/^(functions|firestore)\//, '');
    assert.equal(got, code, `expected ${code}, got ${err.code}: ${err.message}`);
    return err;
  }
  assert.fail(`expected rejection with ${code}, but it succeeded`);
}

async function waitFor(check, what, ms = 15000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`timed out waiting for ${what}`);
}

/** A signed-in client: its own app instance, so several users can act at once. */
async function makeUser(name, { phone = '+60123456789', kyc = true, adminRole = false } = {}) {
  const app = initializeApp(
    { apiKey: 'demo-key', projectId: PROJECT, authDomain: `${PROJECT}.firebaseapp.com` },
    name,
  );
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const fdb = getFirestore(app);
  connectFirestoreEmulator(fdb, '127.0.0.1', 8080);
  const functions = getFunctions(app, 'us-central1');
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);

  const cred = await createUserWithEmailAndPassword(auth, `${name}@test.dev`, 'password123');
  const uid = cred.user.uid;

  // onUserCreate seeds the profile and the sign-up bonus.
  await waitFor(async () => (await db.doc(`users/${uid}`).get()).get('promoBalance') > 0, `${name} profile`);
  await db.doc(`users/${uid}`).update({ phone, displayName: name });
  const claims = {};
  if (kyc) claims.kycApproved = true;
  if (adminRole) claims.admin = true;
  await admin.auth().setCustomUserClaims(uid, claims);
  await cred.user.getIdToken(true);

  const call = (fn, data) => httpsCallable(functions, fn)(data).then((r) => r.data);
  const read = async (path) => (await getDoc(doc(fdb, path))).data();
  return { uid, name, call, read };
}

async function makeFlight(id, travelerId, { departsInHours = 72, kg = 10, pricePerKg = 20 } = {}) {
  const departure = Date.now() + departsInHours * 3600_000;
  await db.doc(`flights/${id}`).set({
    flightId: id,
    travelerId,
    traveler: { displayName: 'T', photoUrl: null, averageRating: 0, completedTripsAsTraveler: 0, kycVerified: true },
    originAirport: 'KUL',
    destinationAirport: 'DAC',
    routeKey: 'KUL-DAC',
    departureAt: Timestamp.fromMillis(departure),
    arrivalAt: Timestamp.fromMillis(departure + 4 * 3600_000),
    airline: 'Malaysia Airlines',
    flightNumber: 'MH196',
    totalKgAvailable: kg,
    kgRemaining: kg,
    pricePerKg,
    fixedTotalPrice: null,
    currency: 'MYR',
    acceptedCategories: ['Documents'],
    prohibitedItems: [],
    specialNotes: null,
    status: 'LIVE',
    isFeatured: false,
    featuredUntil: null,
    bidCount: 0,
    ticketStatus: 'VERIFIED',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

const bid = (flightId, kg = 2) => ({
  flightId, kgRequested: kg, itemCategory: 'Documents', itemDescription: 'Two books', declaredValue: 50,
});

const balanceOf = async (uid) => {
  const u = (await db.doc(`users/${uid}`).get()).data();
  return u.pointsBalance + u.promoBalance;
};

/** Pretends the plane left: moves both the flight and the deal snapshot into the past. */
async function depart(flightId, dealIds) {
  const past = Timestamp.fromMillis(Date.now() - 3600_000);
  await db.doc(`flights/${flightId}`).update({ departureAt: past });
  for (const id of dealIds) await db.doc(`transactions/${id}`).update({ 'flight.departureAt': past });
}

(async () => {
  console.log('Deal lifecycle — emulator e2e');

  const traveler = await makeUser('traveler');
  const sender = await makeUser('sender');
  const sender2 = await makeUser('sender2');
  const stranger = await makeUser('stranger');
  const staff = await makeUser('staff', { adminRole: true });
  const noPhone = await makeUser('nophone', { phone: null });

  await makeFlight('F1', traveler.uid);
  let bidId;

  await step('sender bids; the fee is held', async () => {
    const before = await balanceOf(sender.uid);
    ({ bidId } = await sender.call('submitBid', bid('F1')));
    assert.equal((await db.doc(`bids/${bidId}`).get()).get('status'), 'PENDING');
    assert.ok((await balanceOf(sender.uid)) < before, 'hold should reduce the balance');
  });

  await step('a second pending bid on the same flight is refused', async () => {
    await rejects(sender.call('submitBid', bid('F1')), 'already-exists');
  });

  await step('a traveler without a phone cannot accept', async () => {
    await makeFlight('F-NOPHONE', noPhone.uid);
    const { bidId: b } = await sender2.call('submitBid', bid('F-NOPHONE'));
    await rejects(noPhone.call('acceptBid', { bidId: b }), 'failed-precondition');
  });

  await step('only the traveler can accept', async () => {
    await rejects(stranger.call('acceptBid', { bidId }), 'permission-denied');
    await rejects(sender.call('acceptBid', { bidId }), 'permission-denied');
  });

  await step('accepting opens a deal with both contacts and a separate code', async () => {
    const res = await traveler.call('acceptBid', { bidId });
    assert.equal(res.transactionId, bidId);
    const deal = (await db.doc(`transactions/${bidId}`).get()).data();
    assert.equal(deal.status, 'AGREED');
    assert.equal(deal.payoutStatus, 'PENDING');
    assert.equal(deal.totalPrice, 40);
    assert.equal(deal.parties.traveler.phone, '+60123456789');
    assert.equal(deal.parties.sender.phone, '+60123456789');
    assert.equal(deal.deliveryCode, undefined, 'code must not be on the deal document');
    const code = (await db.doc(`delivery_codes/${bidId}`).get()).get('code');
    assert.match(code, /^\d{6}$/);
    assert.equal((await db.doc('flights/F1').get()).get('kgRemaining'), 8);
  });

  await step('rules: parties read the deal; outsiders cannot', async () => {
    assert.equal((await sender.read(`transactions/${bidId}`)).status, 'AGREED');
    assert.equal((await traveler.read(`transactions/${bidId}`)).status, 'AGREED');
    await rejects(stranger.read(`transactions/${bidId}`), 'permission-denied');
  });

  await step('rules: only the sender can read the delivery code', async () => {
    assert.match((await sender.read(`delivery_codes/${bidId}`)).code, /^\d{6}$/);
    await rejects(traveler.read(`delivery_codes/${bidId}`), 'permission-denied');
    await rejects(stranger.read(`delivery_codes/${bidId}`), 'permission-denied');
  });

  await step('a flight with an agreement cannot be cancelled', async () => {
    await rejects(traveler.call('cancelFlight', { flightId: 'F1' }), 'failed-precondition');
  });

  await step('delivery cannot be recorded before handover', async () => {
    await rejects(traveler.call('markDelivered', { bidId, code: '000000' }), 'failed-precondition');
  });

  await step('outsiders cannot confirm a handover', async () => {
    await rejects(stranger.call('confirmHandover', { bidId }), 'permission-denied');
  });

  await step('handover needs both sides; one confirmation keeps it AGREED', async () => {
    const first = await sender.call('confirmHandover', { bidId, note: 'Handed over at KLIA' });
    assert.equal(first.status, 'AGREED');
    const again = await sender.call('confirmHandover', { bidId });
    assert.equal(again.status, 'AGREED', 'a repeat press changes nothing');
    const second = await traveler.call('confirmHandover', { bidId });
    assert.equal(second.status, 'HANDED_OVER');
    assert.equal((await db.doc(`bids/${bidId}`).get()).get('status'), 'HANDED_OVER');
  });

  await step('delivery cannot be recorded before departure', async () => {
    await rejects(traveler.call('markDelivered', { bidId, code: '000000' }), 'failed-precondition');
  });

  await step('departure sweep moves a flight with agreements to IN_TRANSIT, not EXPIRED', async () => {
    await depart('F1', [bidId]);
    await fns.expireFlights.run({});
    assert.equal((await db.doc('flights/F1').get()).get('status'), 'IN_TRANSIT');
  });

  await step('only the sender-side code delivers; wrong codes are counted', async () => {
    const code = (await db.doc(`delivery_codes/${bidId}`).get()).get('code');
    const wrong = code === '123456' ? '654321' : '123456';
    const err = await rejects(traveler.call('markDelivered', { bidId, code: wrong }), 'invalid-argument');
    assert.match(err.message, /4 attempts left/);
    assert.equal((await db.doc(`transactions/${bidId}`).get()).get('codeAttempts'), 1);
    await rejects(sender.call('markDelivered', { bidId, code }), 'permission-denied');
    const res = await traveler.call('markDelivered', { bidId, code });
    assert.equal(res.success, true);
    assert.equal(res.flightCompleted, true);
    assert.equal((await db.doc(`transactions/${bidId}`).get()).get('status'), 'DELIVERED');
    assert.equal((await db.doc('flights/F1').get()).get('status'), 'COMPLETED');
  });

  await step('each side rates once; averages update', async () => {
    await sender.call('submitRating', { bidId, stars: 5, comment: 'Great' });
    await rejects(sender.call('submitRating', { bidId, stars: 1 }), 'already-exists');
    await traveler.call('submitRating', { bidId, stars: 4 });
    const t = (await db.doc(`users/${traveler.uid}`).get()).data();
    assert.equal(t.averageRating, 5);
    assert.equal(t.ratingCount, 1);
    assert.equal((await db.doc(`users/${sender.uid}`).get()).get('averageRating'), 4);
    await rejects(stranger.call('submitRating', { bidId, stars: 1 }), 'permission-denied');
  });

  await step('settlement waits out the dispute window, then rewards both sides once', async () => {
    await fns.settleTransactions.run({});
    assert.equal((await db.doc(`transactions/${bidId}`).get()).get('payoutStatus'), 'PENDING', 'too early');

    const old = Timestamp.fromMillis(Date.now() - 73 * 3600_000);
    await db.doc(`transactions/${bidId}`).update({ deliveredAt: old });
    const tBefore = await balanceOf(traveler.uid);
    await fns.settleTransactions.run({});
    await fns.settleTransactions.run({}); // idempotent: a second run must not pay twice
    const deal = (await db.doc(`transactions/${bidId}`).get()).data();
    assert.equal(deal.payoutStatus, 'RELEASED');
    assert.equal(await balanceOf(traveler.uid), tBefore + 25);
    assert.equal((await db.doc(`users/${traveler.uid}`).get()).get('completedTripsAsTraveler'), 1);
    assert.equal((await db.doc(`users/${sender.uid}`).get()).get('completedTripsAsSender'), 1);
  });

  await step('a settled delivery can no longer be disputed', async () => {
    await rejects(sender.call('openDispute', { bidId, reason: 'The parcel arrived damaged and wet.' }), 'failed-precondition');
  });

  // ---- Dispute path on a second deal ----
  await makeFlight('F2', traveler.uid);
  const { bidId: b2 } = await sender.call('submitBid', bid('F2', 3));
  await traveler.call('acceptBid', { bidId: b2 });

  await step('either party can dispute; a short reason is rejected', async () => {
    await rejects(sender.call('openDispute', { bidId: b2, reason: 'bad' }), 'invalid-argument');
    await rejects(stranger.call('openDispute', { bidId: b2, reason: 'Never received anything at all.' }), 'permission-denied');
    await sender.call('openDispute', { bidId: b2, reason: 'Traveler did not show up at the meeting point.' });
    assert.equal((await db.doc(`transactions/${b2}`).get()).get('status'), 'DISPUTED');
    assert.equal((await sender.read(`disputes/${b2}`)).status, 'OPEN');
    await rejects(stranger.read(`disputes/${b2}`), 'permission-denied');
    await rejects(traveler.call('openDispute', { bidId: b2, reason: 'Sender never showed up either, honestly.' }), 'failed-precondition');
  });

  await step('only staff resolve disputes, with a real rationale, and it is audited', async () => {
    const rationale = 'Both parties confirmed by phone that the meeting never happened; closing for the sender.';
    await rejects(traveler.call('resolveDispute', { bidId: b2, outcome: 'RESOLVED_FOR_TRAVELER', rationale }), 'permission-denied');
    await rejects(staff.call('resolveDispute', { bidId: b2, outcome: 'RESOLVED_FOR_SENDER', rationale: 'too short' }), 'invalid-argument');
    await staff.call('resolveDispute', { bidId: b2, outcome: 'RESOLVED_FOR_SENDER', rationale });
    const deal = (await db.doc(`transactions/${b2}`).get()).data();
    assert.equal(deal.status, 'RESOLVED');
    assert.equal(deal.payoutStatus, 'REFUNDED');
    const audit = await db.collection('audit_log').where('targetId', '==', b2).get();
    assert.equal(audit.size, 1);
  });

  // ---- Withdraw, cancel, expiry ----
  await step('withdrawing a pending bid returns the hold in full', async () => {
    await makeFlight('F3', traveler.uid);
    const before = await balanceOf(sender.uid);
    const { bidId: b3 } = await sender.call('submitBid', bid('F3'));
    await rejects(traveler.call('withdrawBid', { bidId: b3 }), 'permission-denied');
    await sender.call('withdrawBid', { bidId: b3 });
    assert.equal((await db.doc(`bids/${b3}`).get()).get('status'), 'WITHDRAWN');
    assert.equal(await balanceOf(sender.uid), before);
    await rejects(sender.call('withdrawBid', { bidId: b3 }), 'failed-precondition');
  });

  await step('cancelling a flight declines pending bids and refunds them', async () => {
    await makeFlight('F4', traveler.uid);
    const before = await balanceOf(sender2.uid);
    const { bidId: b4 } = await sender2.call('submitBid', bid('F4'));
    await rejects(sender2.call('cancelFlight', { flightId: 'F4' }), 'permission-denied');
    const res = await traveler.call('cancelFlight', { flightId: 'F4' });
    assert.equal(res.bidsDeclined, 1);
    assert.equal((await db.doc('flights/F4').get()).get('status'), 'CANCELLED');
    assert.equal((await db.doc(`bids/${b4}`).get()).get('status'), 'DECLINED');
    assert.equal(await balanceOf(sender2.uid), before);
    await rejects(traveler.call('acceptBid', { bidId: b4 }), 'failed-precondition');
  });

  await step('a departed flight with no agreements expires and refunds its bids', async () => {
    await makeFlight('F5', traveler.uid);
    const before = await balanceOf(sender2.uid);
    const { bidId: b5 } = await sender2.call('submitBid', bid('F5'));
    await depart('F5', []);
    await fns.expireFlights.run({});
    assert.equal((await db.doc('flights/F5').get()).get('status'), 'EXPIRED');
    assert.equal((await db.doc(`bids/${b5}`).get()).get('status'), 'EXPIRED');
    assert.equal(await balanceOf(sender2.uid), before);
  });

  await step('ledger reconciles: sum(delta) equals the cached balance for every user', async () => {
    for (const u of [traveler, sender, sender2, stranger, staff, noPhone]) {
      const rows = await db.collection('points_ledger').where('userId', '==', u.uid).get();
      const sum = rows.docs.reduce((s, d) => s + d.get('delta'), 0);
      assert.equal(sum, await balanceOf(u.uid), `${u.name} ledger drifted`);
    }
  });

  console.log(`\n${passed} checks passed.`);
  process.exit(process.exitCode ?? 0);
})().catch((err) => {
  // Failures inside a step were already reported; anything else lands here.
  if (!process.exitCode) console.error(err);
  process.exit(1);
});
