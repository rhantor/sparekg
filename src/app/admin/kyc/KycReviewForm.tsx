'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { approveKycSubmission, rejectKycSubmission } from './actions';
import { CheckCircle, XCircle } from 'lucide-react';
import type { RejectionReason } from '@/lib/types';

export function KycReviewForm({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<RejectionReason>('DOC_BLURRY');

  const handleApprove = async () => {
    setLoading(true);

    const res = await approveKycSubmission(submissionId);
    if (res.success) {
      router.refresh();
    } else {
      alert("Error approving submission");
    }
    setLoading(false);
  };

  const handleReject = async () => {
    setLoading(true);

    const res = await rejectKycSubmission(submissionId, rejectionReason);
    if (res.success) {
      router.refresh();
      setIsRejecting(false);
    } else {
      alert("Error rejecting submission");
    }
    setLoading(false);
  };

  if (isRejecting) {
    return (
      <div className="space-y-4">
        <label className="block text-sm text-slate-300 font-medium">Rejection Reason</label>
        <select 
          className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value as RejectionReason)}
        >
          <option value="DOC_BLURRY">Document Blurry / Unreadable</option>
          <option value="NAME_MISMATCH">Name Does Not Match</option>
          <option value="EXPIRED_ID">Expired ID</option>
          <option value="SELFIE_MISMATCH">Selfie Does Not Match ID</option>
          <option value="INCOMPLETE_DOC">Incomplete Document</option>
          <option value="SUSPICIOUS_DOCUMENT">Suspicious / Fraudulent</option>
          <option value="UNDERAGE">Underage</option>
          <option value="OTHER">Other</option>
        </select>
        
        <div className="flex gap-2 pt-2">
          <button 
            onClick={() => setIsRejecting(false)}
            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white"
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            onClick={handleReject}
            className="flex-1 py-2 bg-red-600 hover:bg-red-700 rounded text-white"
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Confirm Reject'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handleApprove}
        disabled={loading}
        className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium disabled:opacity-50"
      >
        <CheckCircle className="w-5 h-5" />
        Approve Identity
      </button>
      
      <button
        onClick={() => setIsRejecting(true)}
        disabled={loading}
        className="flex items-center justify-center gap-2 w-full py-3 bg-slate-800 hover:bg-slate-700 text-red-400 rounded font-medium border border-slate-700 disabled:opacity-50"
      >
        <XCircle className="w-5 h-5" />
        Reject Application
      </button>
    </div>
  );
}
