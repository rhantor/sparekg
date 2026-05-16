'use client';
import { useState } from 'react';
import { mockAuditLog } from '@/lib/mock-data';
import { ClipboardList, Search, Filter } from 'lucide-react';

const ACTION_BADGE: Record<string, string> = {
  KYC_APPROVED: 'badge-success', KYC_REJECTED: 'badge-danger', KYC_ESCALATED: 'badge-warning',
  USER_SUSPENDED: 'badge-danger', USER_UNSUSPENDED: 'badge-success', USER_DELETED: 'badge-danger',
  POINTS_ADJUSTED: 'badge-info', ROLE_GRANTED: 'badge-purple', ROLE_REVOKED: 'badge-warning',
  DISPUTE_RESOLVED: 'badge-success', CONTENT_UPDATED: 'badge-info', CONFIG_CHANGED: 'badge-warning',
};

export default function AuditPage() {
  const [search, setSearch] = useState('');

  const filtered = mockAuditLog.filter(e =>
    !search || e.actorName.toLowerCase().includes(search.toLowerCase()) ||
    e.action.toLowerCase().includes(search.toLowerCase()) ||
    e.targetId.includes(search) || e.reason.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-brand-400" /> Audit Log
        </h1>
        <p className="text-sm text-gray-500 mt-1">Immutable record of all admin actions. Read-only.</p>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-10" placeholder="Search by actor, action, target, or reason..." />
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr><th>Timestamp</th><th>Actor</th><th>Action</th><th>Target</th><th>Reason</th></tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.entryId}>
                <td className="text-xs text-gray-500 whitespace-nowrap">{new Date(e.timestamp).toLocaleString()}</td>
                <td className="text-sm text-white">{e.actorName}</td>
                <td><span className={`badge ${ACTION_BADGE[e.action] ?? 'badge-neutral'}`}>{e.action}</span></td>
                <td className="text-xs"><span className="text-gray-400">{e.targetType}/</span><span className="text-white font-mono">{e.targetId}</span></td>
                <td className="text-sm text-gray-400 max-w-[300px] truncate">{e.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
