'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, CheckCircle, Loader2 } from 'lucide-react';
import { setSuspension } from '../actions';

export function SuspendForm({ uid, suspended }: { uid: string; suspended: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    const result = await setSuspension(uid, !suspended, reason);
    setBusy(false);
    if (!result.success) return setError(result.error ?? 'Could not update the account.');
    setOpen(false);
    setReason('');
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`btn ${suspended ? 'btn-success' : 'btn-danger'} w-full`}
      >
        {suspended ? <><CheckCircle className="w-4 h-4" /> Restore account</> : <><Ban className="w-4 h-4" /> Suspend account</>}
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm text-gray-300 font-medium">
        {suspended ? 'Why is this account being restored?' : 'Why is this account being suspended?'}
      </label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        maxLength={500}
        className="input resize-none"
        placeholder="Recorded in the audit log. At least 10 characters."
      />
      {!suspended && (
        <p className="text-xs text-gray-500">
          A suspended user can still sign in and read, but cannot post, bid, accept or confirm anything.
        </p>
      )}
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => setOpen(false)} disabled={busy} className="btn btn-ghost flex-1">Cancel</button>
        <button
          onClick={submit}
          disabled={busy || reason.trim().length < 10}
          className={`btn ${suspended ? 'btn-success' : 'btn-danger'} flex-1 disabled:opacity-60`}
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {suspended ? 'Restore' : 'Suspend'}
        </button>
      </div>
    </div>
  );
}
