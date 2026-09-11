'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle } from 'lucide-react';
import { useReviewFlightTicketMutation } from '@/lib/store/api';
import { TICKET_REJECTION_REASONS } from '@/lib/ticket-review';
import type { TicketRejectionReason } from '@/lib/types';

const REASONS = Object.entries(TICKET_REJECTION_REASONS) as [TicketRejectionReason, { label: string }][];

export function TicketReviewForm({ flightId }: { flightId: string }) {
  const router = useRouter();
  const [review, { isLoading }] = useReviewFlightTicketMutation();
  const [isRejecting, setIsRejecting] = useState(false);
  const [reason, setReason] = useState<TicketRejectionReason>('NAME_MISMATCH');
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: 'VERIFY' | 'REJECT') {
    setError(null);
    try {
      await review({ flightId, decision, ...(decision === 'REJECT' ? { reason } : {}) }).unwrap();
      router.refresh();
    } catch (err) {
      // The callable says which guard fired — "already reviewed" must not read
      // like a generic failure.
      setError((err as { message?: string })?.message ?? 'Could not save the decision.');
    }
  }

  const errorBanner = error ? (
    <p role="alert" className="rounded border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
      {error}
    </p>
  ) : null;

  if (isRejecting) {
    return (
      <div className="space-y-4">
        {errorBanner}
        <label className="block text-sm text-slate-300 font-medium">Rejection reason</label>
        <select
          className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
          value={reason}
          onChange={(e) => setReason(e.target.value as TicketRejectionReason)}
        >
          {REASONS.map(([value, { label }]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <p className="text-xs text-slate-400">
          Rejecting cancels the listing and returns every pending bidder&apos;s points.
        </p>
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => setIsRejecting(false)}
            disabled={isLoading}
            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white"
          >
            Cancel
          </button>
          <button
            onClick={() => decide('REJECT')}
            disabled={isLoading}
            className="flex-1 py-2 bg-red-600 hover:bg-red-700 rounded text-white disabled:opacity-50"
          >
            {isLoading ? 'Processing…' : 'Confirm reject'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {errorBanner}
      <button
        onClick={() => decide('VERIFY')}
        disabled={isLoading}
        className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium disabled:opacity-50"
      >
        <CheckCircle className="w-5 h-5" />
        {isLoading ? 'Processing…' : 'Verify ticket'}
      </button>
      <button
        onClick={() => setIsRejecting(true)}
        disabled={isLoading}
        className="flex items-center justify-center gap-2 w-full py-3 bg-slate-800 hover:bg-slate-700 text-red-400 rounded font-medium border border-slate-700 disabled:opacity-50"
      >
        <XCircle className="w-5 h-5" />
        Reject ticket
      </button>
    </div>
  );
}
