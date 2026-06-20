'use server';

import { adminDb } from '@/lib/firebaseAdmin';
import { encryptData } from '@/lib/encryption';
import type { IdType } from '@/lib/types';
import { randomUUID } from 'crypto';

interface KycSubmissionData {
  userId: string;
  idType: IdType;
  idNumber: string;
  idCountry: string;
  idFrontUrl: string;
  idBackUrl: string | null;
  selfieUrl: string;
  fullName: string;
  dateOfBirth: string;
}

export async function submitKyc(data: KycSubmissionData) {
  try {
    const submissionId = randomUUID();
    
    // Encrypt the ID number at rest
    const encryptedIdNumber = encryptData(data.idNumber);

    const submissionDoc = {
      submissionId,
      userId: data.userId,
      idType: data.idType,
      idNumber: encryptedIdNumber, // Encrypted!
      idCountry: data.idCountry,
      idFrontUrl: data.idFrontUrl,
      idBackUrl: data.idBackUrl,
      selfieUrl: data.selfieUrl,
      livenessScore: null,
      fullName: data.fullName,
      dateOfBirth: data.dateOfBirth,
      status: 'PENDING',
      assignedAdminId: null,
      reviewNotes: null,
      rejectionReason: null,
      userRejectionMessage: null,
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
    };

    const batch = adminDb.batch();
    
    // Write the submission doc
    const submissionRef = adminDb.collection('kyc_submissions').doc(submissionId);
    batch.set(submissionRef, submissionDoc);

    // Update the user's kycStatus to PENDING
    const userRef = adminDb.collection('users').doc(data.userId);
    batch.update(userRef, { 
      kycStatus: 'PENDING',
      kycSubmissionRef: submissionId
    });

    await batch.commit();
    return { success: true };
    
  } catch (error) {
    console.error('Error submitting KYC:', error);
    return { success: false, error: 'Failed to submit KYC documentation.' };
  }
}
