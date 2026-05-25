'use client';
import { mockDashboardKpis, mockRoutes } from '@/lib/mock-data';
import { useAuth } from '@/lib/auth-context';
import {
  Users, Plane, Send, ArrowRightLeft, DollarSign, TrendingUp,
  ShieldCheck, Scale, CheckCircle2, AlertTriangle, Clock,
} from 'lucide-react';

const kpi = mockDashboardKpis;

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent?: string;
}

function KpiCard({ label, value, sub, icon, accent }: KpiCardProps) {
  return (
    <div className="kpi-card group">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent ?? 'bg-brand-500/15 text-brand-400'}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-[0.625rem] text-gray-600 mt-1">{sub}</p>}
    </div>
  );
}

function QueueCard({ label, depth, ageHours, color }: { label: string; depth: number; ageHours: number; color: 'warning' | 'danger' | 'info' }) {
  const isAlarm = ageHours > 24;
  const colors = {
    warning: 'bg-amber-500/15 text-amber-400',
    danger: 'bg-red-500/15 text-red-400',
    info: 'bg-blue-500/15 text-blue-400',
  };
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">{label}</h3>
        {isAlarm && (
          <span className="badge badge-danger">
            <AlertTriangle className="w-3 h-3" /> SLA Risk
          </span>
        )}
      </div>
      <div className="flex items-end gap-6">
        <div>
          <p className="text-3xl font-bold text-white">{depth}</p>
          <p className="text-xs text-gray-500">pending items</p>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-gray-500" />
            <p className={`text-lg font-semibold ${isAlarm ? 'text-red-400' : 'text-white'}`}>
              {ageHours}h
            </p>
          </div>
          <p className="text-xs text-gray-500">median age</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Welcome back, {user?.displayName?.split(' ')[0]}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Here&apos;s what&apos;s happening on SpareKG today.
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
        <KpiCard label="Daily Active Users" value={kpi.dau} sub={`WAU: ${kpi.wau} · MAU: ${kpi.mau}`} icon={<Users className="w-5 h-5" />} />
        <KpiCard label="Flights Posted Today" value={kpi.flightsPostedToday} sub={`Week: ${kpi.flightsPostedWeek} · Month: ${kpi.flightsPostedMonth}`} icon={<Plane className="w-5 h-5" />} accent="bg-emerald-500/15 text-emerald-400" />
        <KpiCard label="Bids Today" value={kpi.bidsSubmittedToday} sub={`Accepted: ${kpi.bidsAcceptedToday}`} icon={<Send className="w-5 h-5" />} accent="bg-sky-500/15 text-sky-400" />
        <KpiCard label="Match Rate" value={`${(kpi.matchRate * 100).toFixed(1)}%`} icon={<ArrowRightLeft className="w-5 h-5" />} accent="bg-violet-500/15 text-violet-400" />
        <KpiCard label="GMV (MYR)" value={kpi.gmvMyr.toLocaleString()} sub={`Revenue: MYR ${kpi.platformRevenueMyr.toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} accent="bg-amber-500/15 text-amber-400" />
      </div>

      {/* Queue + Economy Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <QueueCard label="KYC Moderation Queue" depth={kpi.kycQueueDepth} ageHours={kpi.kycMedianAgeHours} color="warning" />
        <QueueCard label="Dispute Queue" depth={kpi.disputeQueueDepth} ageHours={kpi.disputeMedianAgeHours} color="danger" />

        {/* Reconciliation Card */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Points Economy</h3>
            <span className={`badge ${kpi.reconciliationOk ? 'badge-success' : 'badge-danger'}`}>
              {kpi.reconciliationOk ? (
                <><CheckCircle2 className="w-3 h-3" /> Reconciled</>
              ) : (
                <><AlertTriangle className="w-3 h-3" /> Drift Detected</>
              )}
            </span>
          </div>
          <p className="text-3xl font-bold text-white">{kpi.totalPointsOutstanding.toLocaleString()}</p>
          <p className="text-xs text-gray-500">total points outstanding</p>
        </div>
      </div>

      {/* Route Heatmap */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Route Activity (30d)</h3>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Corridor</th>
                <th>Priority</th>
                <th>Live Flights</th>
                <th>Pending Bids</th>
                <th>Avg Price/kg</th>
                <th>Transactions (30d)</th>
              </tr>
            </thead>
            <tbody>
              {mockRoutes.map(r => (
                <tr key={r.routeKey}>
                  <td className="font-medium text-white">{r.originCity} → {r.destinationCity}</td>
                  <td>{r.isPriority ? <span className="badge badge-purple">Priority</span> : <span className="badge badge-neutral">Normal</span>}</td>
                  <td>{r.liveFlightCount}</td>
                  <td>{r.pendingBidCount}</td>
                  <td>MYR {r.avgPricePerKg}</td>
                  <td className="font-medium text-white">{r.transactionCount30d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
