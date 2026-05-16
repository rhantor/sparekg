'use client';
import { useState } from 'react';
import { mockReports } from '@/lib/mock-data';
import type { Report, ReportSeverity, ReportStatus } from '@/lib/types';
import { Flag, AlertTriangle, MessageSquare, Ban, XCircle, ArrowUpCircle, Eye, Clock } from 'lucide-react';

const SEVERITY_BADGE: Record<ReportSeverity, string> = {
  prohibited_goods: 'badge-danger', harassment: 'badge-warning', off_platform: 'badge-info', other: 'badge-neutral',
};

const SEVERITY_LABEL: Record<ReportSeverity, string> = {
  prohibited_goods: 'Prohibited Goods', harassment: 'Harassment', off_platform: 'Off-Platform', other: 'Other',
};

export default function ReportsPage() {
  const [reports, setReports] = useState(mockReports);

  const dismiss = (id: string) => setReports(prev => prev.map(r => r.reportId === id ? { ...r, status: 'DISMISSED' as ReportStatus } : r));
  const action = (id: string) => setReports(prev => prev.map(r => r.reportId === id ? { ...r, status: 'ACTION_TAKEN' as ReportStatus } : r));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Flag className="w-6 h-6 text-brand-400" /> Reports Triage
          </h1>
          <p className="text-sm text-gray-500 mt-1">User-submitted reports sorted by severity.</p>
        </div>
        <p className="text-sm text-gray-400"><span className="font-bold text-white">{reports.filter(r => r.status === 'NEW').length}</span> new</p>
      </div>

      <div className="space-y-4">
        {reports.map(r => (
          <div key={r.reportId} className="glass-card p-5">
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                r.severity === 'prohibited_goods' ? 'bg-red-500/15 text-red-400' :
                r.severity === 'harassment' ? 'bg-amber-500/15 text-amber-400' :
                'bg-blue-500/15 text-blue-400'
              }`}>
                {r.severity === 'prohibited_goods' ? <AlertTriangle className="w-5 h-5" /> : <Flag className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`badge ${SEVERITY_BADGE[r.severity]}`}>{SEVERITY_LABEL[r.severity]}</span>
                  <span className={`badge ${r.status === 'NEW' ? 'badge-warning' : r.status === 'DISMISSED' ? 'badge-neutral' : 'badge-success'}`}>{r.status}</span>
                  <span className="text-xs text-gray-500 ml-auto flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(r.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-300 mb-2">{r.claim}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Reporter: <span className="text-gray-300">{r.reporterName}</span></span>
                  <span>Target: <span className="text-gray-300">{r.targetType} — {r.targetName}</span></span>
                </div>
              </div>
              {r.status === 'NEW' && (
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => action(r.reportId)} className="btn btn-danger text-xs py-1.5"><Ban className="w-3.5 h-3.5" /> Suspend User</button>
                  <button onClick={() => dismiss(r.reportId)} className="btn btn-ghost text-xs py-1.5"><XCircle className="w-3.5 h-3.5" /> Dismiss</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
