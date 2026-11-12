import * as admin from 'firebase-admin';

/**
 * The platform's cut of an agreed price, recorded on every transaction.
 *
 * Defaults to 0 because v1 settles directly between the parties: the sender
 * pays the traveler the agreed price at handover and the platform collects
 * nothing. Recording the figure now keeps the schema ready for when a payment
 * provider does collect it (`app_config/main.feeSchedule.platformFeePercent`).
 *
 * Resolved lazily: this module is imported before index.ts calls
 * admin.initializeApp(), so touching admin.firestore() at module scope would
 * throw "the default Firebase app does not exist".
 */
export async function getPlatformFeePercent(): Promise<number> {
  try {
    const snap = await admin.firestore().collection('app_config').doc('main').get();
    const value = snap.exists ? snap.data()?.feeSchedule?.platformFeePercent : undefined;
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 30
      ? value
      : 0;
  } catch {
    return 0;
  }
}
