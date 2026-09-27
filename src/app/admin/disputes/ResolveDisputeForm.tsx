'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Scale } from 'lucide-react';
import { useResolveDisputeMutation } from '@/lib/store/api';

const OUTCOMES = [
  { value: 'RESOLVED_FOR_SENDER', label: 'In favour of the sender' },
  { value: 'RESOLVED_FOR_TRAVELER', label: 'In favour of the traveler' },
  { value: 'SPLIT', label: 'Split — both partly at fault' },
  { value: 'CLOSED_INVALID', label: 'Close as invalid' },
] as const;

type Outcome = (typeof OUTCOMES)[number]['value'];

/** Mirrors the callable's minimum: the rationale is shown to both parties. */
const MIN_RATIONALE = 50;

export function ResolveDisputeForm({ bidId }: { bidId: string }) {
  const router = useRouter();
  const [resolve, { isLoading }] = useResolveDisputeMutation();
  const [outcome, setOutcome] = useState<Outcome>('RESOLVED_FOR_SENDER');
  const [rationale, setRationale] = useState('');
  const [error, setError] = useState<string | null>(null);
  const remaining = MIN_RATIONALE - rationale.trim().length;

  async function submit() {
    setError(null);
    try {
      await resolve({ bidId, outcome, rationale: rationale.trim() }).unwrap();
      router.refresh();
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Could not resolve the dispute.');
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm text-gray-300 font-medium">Decision</label>
      <select className="input" value={outcome} onChange={(e) => setOutcome(e.target.value as Outcome)}>
        {OUTCOMES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <label className="block text-sm text-gray-300 font-medium">Rationale (shown to both parties)</label>
      <textarea
        value={rationale}
        onChange={(e) => setRationale(e.target.value)}
        rows={4}
        maxLength={2000}
        className="input resize-none"
        placeholder="What you checked, who you spoke to, and why this outcome."
      />
      <p className={`text-xs ${remaining > 0 ? 'text-gray-500' : 'text-emerald-400'}`}>
        {remaining > 0 ? `${remaining} more characters needed.` : 'Ready to submit.'}
      </p>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <button onClick={submit} disabled={isLoading || remaining > 0} className="btn btn-primary w-full disabled:opacity-60">
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scale className="w-4 h-4" />} Resolve dispute
      </button>
    </div>
  );
}
