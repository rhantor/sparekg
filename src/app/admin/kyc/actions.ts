'use server';

import { adminDb } from '@/lib/firebaseAdmin';
import { requireAdmin } from '@/lib/auth-server';
import * as admin from 'firebase-admin';

// Re-export the getSignedUrl for components that need to display KYC images securely
export async function getSignedImageUrl(storagePath: string) {
  if (!storagePath) return null;

  // KYC documents are sensitive — only admins may mint signed URLs for them.
  await requireAdmin();

  try {
    const bucket = admin.storage().bucket();
    const file = bucket.file(storagePath);
    
    // Generate a URL valid for 1 hour
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, 
    });
    
    return url;
  } catch (error) {
    console.error('Failed to get signed URL for:', storagePath, error);
    return null;
  }
}

export async function approveKycSubmission(submissionId: string) {
  try {
    // Authorize from the verified session — never trust a client-supplied uid.
    const adminUser = await requireAdmin();
    const batch = adminDb.batch();

    // 1. Update the submission document
    const submissionRef = adminDb.collection('kyc_submissions').doc(submissionId);
    batch.update(submissionRef, {
      status: 'APPROVED',
      assignedAdminId: adminUser.uid,
      reviewedAt: new Date().toISOString()
    });

    // 2. We need the userId from the submission to update the user doc
    const submissionDoc = await submissionRef.get();
    if (!submissionDoc.exists) throw new Error('Submission not found');
    
    const userId = submissionDoc.data()?.userId;
    
    // 3. Update the user's status 
    const userRef = adminDb.collection('users').doc(userId);
    batch.update(userRef, {
      kycStatus: 'APPROVED'
    });

    // Note: The actual custom claim assignment will be handled by the 
    // Cloud Function `onKycApproved` listening to this document change.
    
    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error approving KYC:', error);
    return { success: false, error: 'Failed to approve.' };
  }
}

export async function rejectKycSubmission(submissionId: string, reason: string) {
  try {
    const adminUser = await requireAdmin();
    const batch = adminDb.batch();

    const submissionRef = adminDb.collection('kyc_submissions').doc(submissionId);
    batch.update(submissionRef, {
      status: 'REJECTED',
      assignedAdminId: adminUser.uid,
      rejectionReason: reason,
      reviewedAt: new Date().toISOString()
    });

    const submissionDoc = await submissionRef.get();
    const userId = submissionDoc.data()?.userId;
    
    const userRef = adminDb.collection('users').doc(userId);
    batch.update(userRef, {
      kycStatus: 'REJECTED'
    });

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error rejecting KYC:', error);
    return { success: false, error: 'Failed to reject.' };
  }
}
