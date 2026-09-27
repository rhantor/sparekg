/**
 * Seeds the running emulators with two demo users and one deal at each stage,
 * for driving the UI locally (`npm run dev:emulators`).
 *
 *   npx firebase emulators:start --only auth,firestore,functions --project demo-sparekg
 *   node functions/test/seed-emulator.cjs
 *
 * Emulator-only: the `demo-` project id cannot reach production. These accounts
 * exist only in the emulator's memory and vanish when it stops.
 */

process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
process.env.GCLOUD_PROJECT ??= 'demo-sparekg';

const admin = require('firebase-admin');
const { Timestamp } = require('firebase-admin/firestore');
const { initializeApp } = require('firebase/app');
const { getAuth, connectAuthEmulator, signInWithEmailAndPassword } = require('firebase/auth');
const { getFunctions, connectFunctionsEmulator, httpsCallable } = require('firebase/functions');

const PROJECT = process.env.GCLOUD_PROJECT;
admin.initializeApp({ projectId: PROJECT });
const db = admin.firestore();

/** Emulator-only demo accounts. Not real credentials anywhere. */
const DEMO_PASSWORD = 'sparekg-demo-1';
const USERS = {
  traveler: { email: 'traveler@demo.test', name: 'Rahim Traveler', phone: '+60111111111' },
  sender: { email: 'sender@demo.test', name: 'Nadia Sender', phone: '+8801711111111' },
  staff: { email: 'staff@demo.test', name: 'Sara Staff', phone: '+60122222222', claims: { admin: true, superAdmin: true } },
};

async function ensureUser({ email, name, phone, claims = {} }) {
  let user;
  try {
    user = await admin.auth().getUserByEmail(email);
  } catch {
    user = await admin.auth().createUser({ email, password: DEMO_PASSWORD, displayName: name });
  }
  // onUserCreate seeds the profile and bonus; wait for it, then fill it in.
  for (let i = 0; i < 60 && !(await db.doc(`users/${user.uid}`).get()).exists; i++) {
    await new Promise((r) => setTimeout(r, 250));
  }
  await db.doc(`users/${user.uid}`).update({ displayName: name, phone, kycStatus: 'APPROVED' });
  await admin.auth().setCustomUserClaims(user.uid, { kycApproved: true, ...claims });
  return user.uid;
}

async function client(key) {
  const app = initializeApp({ apiKey: 'demo-key', projectId: PROJECT }, key);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const functions = getFunctions(app, 'us-central1');
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  await signInWithEmailAndPassword(auth, USERS[key].email, DEMO_PASSWORD);
  return (fn, data) => httpsCallable(functions, fn)(data).then((r) => r.data);
}

async function flight(id, travelerId, hoursFromNow, flightNumber) {
  const departure = Date.now() + hoursFromNow * 3600_000;
  await db.doc(`flights/${id}`).set({
    flightId: id,
    travelerId,
    traveler: { displayName: USERS.traveler.name, photoUrl: null, averageRating: 0, completedTripsAsTraveler: 0, kycVerified: true },
    originAirport: 'KUL', destinationAirport: 'DAC', routeKey: 'KUL-DAC',
    departureAt: Timestamp.fromMillis(departure),
    arrivalAt: Timestamp.fromMillis(departure + 4 * 3600_000),
    airline: 'Malaysia Airlines', flightNumber,
    totalKgAvailable: 20, kgRemaining: 20, pricePerKg: 25, fixedTotalPrice: null, currency: 'MYR',
    acceptedCategories: ['Documents', 'Clothing', 'Gifts'], prohibitedItems: [], specialNotes: null,
    status: 'LIVE', isFeatured: false, featuredUntil: null, bidCount: 0, ticketStatus: 'VERIFIED',
    createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
  });
}

(async () => {
  const travelerId = await ensureUser(USERS.traveler);
  await ensureUser(USERS.sender);
  await ensureUser(USERS.staff);
  const asTraveler = await client('traveler');
  const asSender = await client('sender');

  const deal = async (flightId, kg, description) => {
    const { bidId } = await asSender('submitBid', {
      flightId, kgRequested: kg, itemCategory: 'Gifts', itemDescription: description, declaredValue: 120,
    });
    await asTraveler('acceptBid', { bidId });
    return bidId;
  };

  // 1. Just agreed: handover not done yet.
  await flight('DEMO-1', travelerId, 48, 'MH196');
  const agreed = await deal('DEMO-1', 3, 'Winter clothes for my mother');

  // 2. Handed over, flight departed: the traveler can enter the code.
  await flight('DEMO-2', travelerId, 30, 'BG087');
  const inTransit = await deal('DEMO-2', 2, 'Two boxes of Malaysian chocolates');
  await asSender('confirmHandover', { bidId: inTransit, note: 'Handed over at KLIA2' });
  await asTraveler('confirmHandover', { bidId: inTransit, note: 'Contents checked' });
  const past = Timestamp.fromMillis(Date.now() - 2 * 3600_000);
  await db.doc('flights/DEMO-2').update({ departureAt: past, status: 'IN_TRANSIT' });
  await db.doc(`transactions/${inTransit}`).update({ 'flight.departureAt': past });

  // 3. Disputed: the sender reports a no-show, for the admin console.
  await flight('DEMO-3', travelerId, 60, 'OD162');
  const disputed = await deal('DEMO-3', 4, 'Spices and dried fruit for Eid');
  await asSender('openDispute', {
    bidId: disputed,
    reason: 'The traveler did not come to the agreed meeting point at KL Sentral and stopped replying.',
  });

  const codes = {};
  for (const id of [agreed, inTransit]) {
    codes[id] = (await db.doc(`delivery_codes/${id}`).get()).get('code');
  }

  console.log('\nSeeded the emulators (password for all: %s)', DEMO_PASSWORD);
  console.log('  traveler: %s', USERS.traveler.email);
  console.log('  sender:   %s', USERS.sender.email);
  console.log('  staff:    %s  (super admin → /admin)', USERS.staff.email);
  console.log('\nDeals:');
  console.log('  AGREED       /deliveries/%s  (code %s)', agreed, codes[agreed]);
  console.log('  HANDED_OVER  /deliveries/%s  (code %s)', inTransit, codes[inTransit]);
  console.log('  DISPUTED     /deliveries/%s  (resolve at /admin/disputes)', disputed);
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
