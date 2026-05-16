'use client';
import { useState } from 'react';
import { mockKycSubmissions } from '@/lib/mock-data';
import type { KycSubmission, KycStatus, RejectionReason } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Eye, CheckCircle, XCircle, ArrowUpCircle,
  ChevronLeft, ChevronRight, Clock, User, Calendar, Globe, FileText,
} from 'lucide-react';

const STATUS_BADGE: Record<KycStatus, string> = {
  PENDING: 'badge-warning',
  UNDER_REVIEW: 'badge-info',
  APPROVED: 'badge-success',
  REJECTED: 'badge-danger',
};

const REJECTION_REASONS: { code: RejectionReason; label: string }[] = [
  { code: 'DOC_BLURRY', label: 'Document Blurry' },
  { code: 'NAME_MISMATCH', label: 'Name Mismatch' },
  { code: 'EXPIRED_ID', label: 'Expired ID' },
  { code: 'SELFIE_MISMATCH', label: 'Selfie Mismatch' },
  { code: 'INCOMPLETE_DOC', label: 'Incomplete Document' },
  { code: 'SUSPICIOUS_DOCUMENT', label: 'Suspicious Document' },
];

export default function KycQueuePage() {
  const [submissions, setSubmissions] = useState<KycSubmission[]>(mockKycSubmissions);
  const [filter, setFilter] = useState<KycStatus | 'ALL'>('ALL');
  const [selected, setSelected] = useState<KycSubmission | null>(null);
  const [rejectReason, setRejectReason] = useState<RejectionReason>('DOC_BLURRY');

  const filtered = filter === 'ALL' ? submissions : submissions.filter(s => s.status === filter);

  const handleApprove = (id: string) => {
    setSubmissions(prev => prev.map(s => s.submissionId === id ? { ...s, status: 'APPROVED' as KycStatus, reviewedAt: new Date().toISOString() } : s));
    setSelected(null);
  };

  const handleReject = (id: string) => {
    setSubmissions(prev => prev.map(s => s.submissionId === id ? { ...s, status: 'REJECTED' as KycStatus, rejectionReason: rejectReason, reviewedAt: new Date().toISOString() } : s));
    setSelected(null);
  };

  const handleClaim = (id: string) => {
    setSubmissions(prev => prev.map(s => s.submissionId === id ? { ...s, status: 'UNDER_REVIEW' as KycStatus, assignedAdminId: 'admin1' } : s));
  };

  const timeSince = (ts: string) => {
    const hours = Math.round((Date.now() - new Date(ts).getTime()) / 3600000);
    return hours < 1 ? '<1h ago' : hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-brand-400" /> KYC Moderation Queue
          </h1>
          <p className="text-sm text-gray-500 mt-1">Review and verify user identity documents. SLA target: 12 hours.</p>
        </div>
        <p className="text-sm text-gray-400">
          <span className="font-bold text-white">{submissions.filter(s => s.status === 'PENDING').length}</span> pending
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5">
        {(['ALL', 'PENDING', 'UNDER_REVIEW', 'REJECTED'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`btn text-xs ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
          >
            {f === 'ALL' ? 'All' : f.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Queue List */}
        <div className={`${selected ? 'w-1/2' : 'w-full'} transition-all duration-300`}>
          <div className="glass-card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>ID Type</th>
                  <th>Country</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(sub => (
                  <tr key={sub.submissionId} className={selected?.submissionId === sub.submissionId ? 'bg-brand-500/5' : ''}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-surface-300 flex items-center justify-center text-xs font-bold text-white">
                          {sub.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{sub.fullName}</p>
                          <p className="text-[0.625rem] text-gray-500">{sub.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-xs">{sub.idType.replace('_', ' ')}</td>
                    <td>{sub.idCountry}</td>
                    <td><span className={`badge ${STATUS_BADGE[sub.status]}`}>{sub.status}</span></td>
                    <td className="text-xs">
                      <div className="flex items-center gap-1 text-gray-500">
                        <Clock className="w-3 h-3" /> {timeSince(sub.submittedAt)}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSelected(sub)} className="btn btn-ghost text-xs py-1 px-2">
                          <Eye className="w-3.5 h-3.5" /> Review
                        </button>
                        {sub.status === 'PENDING' && (
                          <button onClick={() => handleClaim(sub.submissionId)} className="btn btn-ghost text-xs py-1 px-2">
                            Claim
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-gray-500 py-8">No submissions in this filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Review Panel */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-1/2"
            >
              <div className="glass-card p-6 sticky top-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-white">Review: {selected.fullName}</h2>
                  <button onClick={() => setSelected(null)} className="btn btn-ghost text-xs py-1">Close</button>
                </div>

                {/* Applicant info */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-2 text-sm"><User className="w-4 h-4 text-gray-500" /> <span className="text-gray-400">Name:</span> <span className="text-white">{selected.fullName}</span></div>
                  <div className="flex items-center gap-2 text-sm"><Calendar className="w-4 h-4 text-gray-500" /> <span className="text-gray-400">DOB:</span> <span className="text-white">{selected.dateOfBirth}</span></div>
                  <div className="flex items-center gap-2 text-sm"><FileText className="w-4 h-4 text-gray-500" /> <span className="text-gray-400">ID:</span> <span className="text-white">{selected.idType}</span></div>
                  <div className="flex items-center gap-2 text-sm"><Globe className="w-4 h-4 text-gray-500" /> <span className="text-gray-400">Country:</span> <span className="text-white">{selected.idCountry}</span></div>
                </div>

                {/* Document images (placeholder boxes) */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {['ID Front', 'ID Back', 'Selfie'].map(label => (
                    <div key={label} className="aspect-[3/4] rounded-xl bg-surface-300 border border-white/5 flex items-center justify-center">
                      <div className="text-center">
                        <FileText className="w-8 h-8 text-gray-600 mx-auto mb-1" />
                        <p className="text-[0.625rem] text-gray-500">{label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Liveness Score */}
                {selected.livenessScore !== null && (
                  <div className="mb-6">
                    <p className="text-xs text-gray-400 mb-1">Liveness Score</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-surface-400 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${selected.livenessScore >= 0.8 ? 'bg-emerald-500' : selected.livenessScore >= 0.6 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${selected.livenessScore * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-white">{(selected.livenessScore * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                )}

                {/* Cross-check */}
                <div className="bg-surface-100 rounded-xl p-4 mb-6">
                  <p className="text-xs font-semibold text-gray-400 mb-3">Cross-Check</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Profile Name</span>
                      <span className="text-white">{selected.user?.displayName ?? '—'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">ID Name</span>
                      <span className={`font-medium ${selected.user?.displayName === selected.fullName ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {selected.fullName}
                        {selected.user?.displayName !== selected.fullName && ' ⚠️'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Decision Actions */}
                {(selected.status === 'PENDING' || selected.status === 'UNDER_REVIEW') && (
                  <div className="space-y-3">
                    <button onClick={() => handleApprove(selected.submissionId)} className="btn btn-success w-full">
                      <CheckCircle className="w-4 h-4" /> Approve (A)
                    </button>
                    <div className="flex gap-2">
                      <select
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value as RejectionReason)}
                        className="input flex-1 text-sm"
                      >
                        {REJECTION_REASONS.map(r => (
                          <option key={r.code} value={r.code}>{r.label}</option>
                        ))}
                      </select>
                      <button onClick={() => handleReject(selected.submissionId)} className="btn btn-danger">
                        <XCircle className="w-4 h-4" /> Reject (R)
                      </button>
                    </div>
                    <button className="btn btn-ghost w-full">
                      <ArrowUpCircle className="w-4 h-4" /> Escalate to Super Admin
                    </button>
                  </div>
                )}

                {/* Already decided */}
                {selected.status === 'APPROVED' && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                    <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-emerald-400">Approved</p>
                  </div>
                )}
                {selected.status === 'REJECTED' && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                    <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-red-400">Rejected — {selected.rejectionReason}</p>
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
