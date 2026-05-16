'use client';
import { useState } from 'react';
import { mockDisputes } from '@/lib/mock-data';
import type { Dispute, DisputeStatus } from '@/lib/types';
import { Scale, Eye, Clock, MessageSquare, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_BADGE: Record<DisputeStatus, string> = {
  OPEN: 'badge-danger', UNDER_REVIEW: 'badge-info',
  RESOLVED_FOR_SENDER: 'badge-success', RESOLVED_FOR_TRAVELER: 'badge-success',
  SPLIT: 'badge-warning', CLOSED_INVALID: 'badge-neutral',
};

export default function DisputesPage() {
  const [disputes, setDisputes] = useState(mockDisputes);
  const [selected, setSelected] = useState<Dispute | null>(null);
  const [rationale, setRationale] = useState('');
  const [filter, setFilter] = useState<DisputeStatus | 'ALL'>('ALL');

  const filtered = filter === 'ALL' ? disputes : disputes.filter(d => d.status === filter);

  const timeSince = (ts: string) => {
    const hours = Math.round((Date.now() - new Date(ts).getTime()) / 3600000);
    return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
  };

  const resolve = (id: string, status: DisputeStatus) => {
    if (rationale.length < 50) return;
    setDisputes(prev => prev.map(d => d.disputeId === id ? { ...d, status, adminNotes: rationale, resolvedAt: new Date().toISOString() } : d));
    setSelected(null);
    setRationale('');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Scale className="w-6 h-6 text-brand-400" /> Dispute Console
          </h1>
          <p className="text-sm text-gray-500 mt-1">Review and resolve transaction disputes. Mandatory rationale ≥ 50 chars.</p>
        </div>
        <p className="text-sm text-gray-400"><span className="font-bold text-white">{disputes.filter(d => d.status === 'OPEN').length}</span> open</p>
      </div>

      <div className="flex gap-2 mb-5">
        {(['ALL', 'OPEN', 'UNDER_REVIEW'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`btn text-xs ${filter === f ? 'btn-primary' : 'btn-ghost'}`}>
            {f === 'ALL' ? 'All' : f.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        <div className={`${selected ? 'w-1/2' : 'w-full'} transition-all`}>
          <div className="glass-card overflow-hidden">
            <table className="data-table">
              <thead><tr><th>Dispute</th><th>Opened By</th><th>Status</th><th>Filed</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.disputeId} className={selected?.disputeId === d.disputeId ? 'bg-brand-500/5' : ''}>
                    <td>
                      <p className="text-sm text-white font-medium">TX: {d.transactionId}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[250px]">{d.claimText}</p>
                    </td>
                    <td>
                      <p className="text-sm text-white">{d.openedByRole === 'sender' ? d.senderName : d.travelerName}</p>
                      <span className="badge badge-neutral text-[0.6rem]">{d.openedByRole}</span>
                    </td>
                    <td><span className={`badge ${STATUS_BADGE[d.status]}`}>{d.status}</span></td>
                    <td className="text-xs text-gray-500"><Clock className="w-3 h-3 inline mr-1" />{timeSince(d.createdAt)}</td>
                    <td>
                      <button onClick={() => setSelected(d)} className="btn btn-ghost text-xs py-1 px-2"><Eye className="w-3.5 h-3.5" /> Review</button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={5} className="text-center text-gray-500 py-8">No disputes.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <AnimatePresence>
          {selected && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="w-1/2">
              <div className="glass-card p-6 sticky top-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-white">Dispute #{selected.disputeId}</h2>
                  <button onClick={() => setSelected(null)} className="btn btn-ghost text-xs py-1">Close</button>
                </div>

                <div className="bg-surface-100 rounded-xl p-4 mb-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-500">Traveler:</span> <span className="text-white ml-1">{selected.travelerName}</span></div>
                    <div><span className="text-gray-500">Sender:</span> <span className="text-white ml-1">{selected.senderName}</span></div>
                    <div><span className="text-gray-500">Transaction:</span> <span className="text-white ml-1 font-mono text-xs">{selected.transactionId}</span></div>
                    <div><span className="text-gray-500">Opened by:</span> <span className="text-white ml-1">{selected.openedByRole}</span></div>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> Claim</p>
                  <p className="text-sm text-gray-300 bg-surface-100 rounded-lg p-3">{selected.claimText}</p>
                </div>

                {selected.evidenceUrls.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-400 mb-2">Evidence ({selected.evidenceUrls.length} files)</p>
                    <div className="flex gap-2">
                      {selected.evidenceUrls.map((url, i) => (
                        <div key={i} className="w-16 h-16 rounded-lg bg-surface-300 flex items-center justify-center text-[0.625rem] text-gray-500">File {i + 1}</div>
                      ))}
                    </div>
                  </div>
                )}

                {(selected.status === 'OPEN' || selected.status === 'UNDER_REVIEW') && (
                  <div className="space-y-3 mt-6">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Rationale (min 50 chars) — <span className={rationale.length >= 50 ? 'text-emerald-400' : 'text-red-400'}>{rationale.length}/50</span></label>
                      <textarea value={rationale} onChange={e => setRationale(e.target.value)} className="input min-h-[80px] resize-y" placeholder="Explain your decision..." />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => resolve(selected.disputeId, 'RESOLVED_FOR_TRAVELER')} disabled={rationale.length < 50} className="btn btn-primary text-xs py-2.5">
                        <CheckCircle className="w-3.5 h-3.5" /> Payout to Traveler
                      </button>
                      <button onClick={() => resolve(selected.disputeId, 'RESOLVED_FOR_SENDER')} disabled={rationale.length < 50} className="btn btn-success text-xs py-2.5">
                        <CheckCircle className="w-3.5 h-3.5" /> Refund Sender
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => resolve(selected.disputeId, 'SPLIT')} disabled={rationale.length < 50} className="btn btn-ghost text-xs py-2.5">Split</button>
                      <button onClick={() => resolve(selected.disputeId, 'CLOSED_INVALID')} disabled={rationale.length < 50} className="btn btn-ghost text-xs py-2.5">
                        <XCircle className="w-3.5 h-3.5" /> Close Invalid
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
