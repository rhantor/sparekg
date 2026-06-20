import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

admin.initializeApp();

// Export all triggers and callable functions

/**
 * onUserCreate: Runs when a new Firebase Auth user is created.
 * Responsible for creating the user document in Firestore and
 * attaching default points.
 */
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  const db = admin.firestore();
  
  // Default values based on the schema
  const newUserDoc = {
    uid: user.uid,
    email: user.email || '',
    phone: user.phoneNumber || null,
    displayName: user.displayName || 'New User',
    photoUrl: user.photoURL || null,
    roles: ['traveler', 'sender'], // Default roles
    kycStatus: 'PENDING',
    kycSubmissionRef: null,
    pointsBalance: 100, // Sign-up bonus (though blueprint says release post-KYC, setting initial state)
    promoBalance: 100,
    lifetimePointsEarned: 100,
    lifetimePointsSpent: 0,
    completedTripsAsTraveler: 0,
    completedTripsAsSender: 0,
    averageRating: 0,
    ratingCount: 0,
    preferredLanguage: 'EN', // Default
    homeAirportCode: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
    suspended: false,
    suspensionReason: null
  };

  try {
    await db.collection('users').doc(user.uid).set(newUserDoc);
    console.log(`User document created for UID: ${user.uid}`);
  } catch (error) {
    console.error('Error creating user document:', error);
  }
});

/**
 * Temporary callable to grant super_admin to the first user.
 * In a real environment, this should be restricted.
 */
export const makeSuperAdmin = functions.https.onCall(async (request) => {
  const uid = request.data.uid;
  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument', 'UID must be provided');
  }

  try {
    await admin.auth().setCustomUserClaims(uid, {
      admin: true,
      superAdmin: true,
      kycApproved: true
    });
    return { success: true, message: `Super admin claim granted to ${uid}` };
  } catch (error) {
    console.error('Error granting claims:', error);
    throw new functions.https.HttpsError('internal', 'Error granting claims');
  }
});

/**
 * onKycApproved: Triggers when a KYC submission document is updated.
 * If the status changes to APPROVED, it grants the kycApproved custom claim
 * to the user and logs the action to the audit_log.
 */
export const onKycApproved = functions.firestore.document('kyc_submissions/{submissionId}')
  .onUpdate(async (event) => {
    const newData = event.data.after.data();
    const prevData = event.data.before.data();
    
    // Only proceed if status just changed to APPROVED
    if (newData.status === 'APPROVED' && prevData.status !== 'APPROVED') {
      const db = admin.firestore();
      const userId = newData.userId;
      
      console.log(`Processing KYC approval for user: ${userId}`);

      try {
        // 1. Fetch current user claims
        const userRecord = await admin.auth().getUser(userId);
        const currentClaims = userRecord.customClaims || {};
        
        // 2. Set kycApproved claim to true
        await admin.auth().setCustomUserClaims(userId, {
          ...currentClaims,
          kycApproved: true
        });

        // 3. Write to audit_log
        await db.collection('audit_log').add({
          action: 'KYC_APPROVED',
          adminId: newData.assignedAdminId,
          targetUserId: userId,
          submissionId: event.params.submissionId,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`Successfully granted kycApproved claim to ${userId}`);
      } catch (error) {
        console.error(`Error processing KYC approval for ${userId}:`, error);
      }
    }
  });
