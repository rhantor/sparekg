'use client';
import { mockEconomySnapshot, mockPointsLedger } from '@/lib/mock-data';
import {
  Coins, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle,
  Download, Search, ArrowUpDown,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useState } from 'react';

const snap = mockEconomySnapshot;

export default function EconomyPage() {
  const [ledgerSearch, setLedgerSearch] = useState('');

  const filteredLedger = mockPointsLedger.filter(e =>
    !ledgerSearch || e.description.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
    e.userId.includes(ledgerSearch) || e.category.toLowerCase().includes(ledgerSearch.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Coins className="w-6 h-6 text-brand-400" /> Economy Oversight
        </h1>
        <p className="text-sm text-gray-500 mt-1">Monitor the points economy health, reconciliation, and transaction patterns.</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="kpi-card">
          <p className="text-xs text-gray-400 mb-2">Total Outstanding</p>
          <p className="text-2xl font-bold text-white">{snap.totalOutstanding.toLocaleString()}</p>
          <span className={`badge mt-2 ${snap.reconciliationOk ? 'badge-success' : 'badge-danger'}`}>
            {snap.reconciliationOk ? <><CheckCircle2 className="w-3 h-3" /> Reconciled</> : <><AlertTriangle className="w-3 h-3" /> Drift</>}
          </span>
        </div>
        <div className="kpi-card">
          <p className="text-xs text-gray-400 mb-2">24h Issued</p>
          <p className="text-2xl font-bold text-emerald-400 flex items-center gap-1">
            <TrendingUp className="w-5 h-5" /> {Object.values(snap.last24h.issued).reduce((a, b) => a + b, 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">pts across all categories</p>
        </div>
        <div className="kpi-card">
          <p className="text-xs text-gray-400 mb-2">24h Spent</p>
          <p className="text-2xl font-bold text-red-400 flex items-center gap-1">
            <TrendingDown className="w-5 h-5" /> {Object.values(snap.last24h.spent).reduce((a, b) => a + b, 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">pts consumed</p>
        </div>
        <div className="kpi-card">
          <p className="text-xs text-gray-400 mb-2">24h Purchased</p>
          <p className="text-2xl font-bold text-white">{snap.last24h.purchasedPoints} pts</p>
          <p className="text-xs text-gray-500 mt-1">MYR {snap.last24h.purchasedMyr}</p>
        </div>
      </div>

      {/* 7-Day Trend Chart */}
      <div className="glass-card p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-4">7-Day Trend</h3>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={snap.last7dTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1c1c2b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '12px' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Line type="monotone" dataKey="issued" stroke="#10b981" strokeWidth={2} dot={false} name="Issued" />
              <Line type="monotone" dataKey="spent" stroke="#ef4444" strokeWidth={2} dot={false} name="Spent" />
              <Line type="monotone" dataKey="purchased" stroke="#6366f1" strokeWidth={2} dot={false} name="Purchased" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Spenders + Earners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Top Spenders (7d)</h3>
          <div className="space-y-2">
            {snap.topSpenders.map((u, i) => (
              <div key={u.userId} className="flex items-center gap-3 bg-surface-100 rounded-lg p-3">
                <span className="text-xs font-bold text-gray-500 w-5">#{i + 1}</span>
                <div className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 text-xs font-bold">{u.name.charAt(0)}</div>
                <span className="flex-1 text-sm text-white">{u.name}</span>
                <span className="text-sm font-semibold text-red-400">-{u.amount} pts</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Top Earners (7d)</h3>
          <div className="space-y-2">
            {snap.topEarners.map((u, i) => (
              <div key={u.userId} className="flex items-center gap-3 bg-surface-100 rounded-lg p-3">
                <span className="text-xs font-bold text-gray-500 w-5">#{i + 1}</span>
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">{u.name.charAt(0)}</div>
                <span className="flex-1 text-sm text-white">{u.name}</span>
                <span className="text-sm font-semibold text-emerald-400">+{u.amount} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Points Ledger */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Points Ledger</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input value={ledgerSearch} onChange={e => setLedgerSearch(e.target.value)} className="input pl-8 text-xs w-52" placeholder="Search ledger..." />
            </div>
            <button className="btn btn-ghost text-xs"><Download className="w-3.5 h-3.5" /> CSV</button>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Date</th><th>User</th><th>Description</th><th>Category</th><th>Delta</th><th>Balance After</th><th>By</th></tr>
          </thead>
          <tbody>
            {filteredLedger.map(e => (
              <tr key={e.entryId}>
                <td className="text-xs text-gray-500">{new Date(e.createdAt).toLocaleString()}</td>
                <td className="text-xs font-mono text-gray-400">{e.userId}</td>
                <td className="text-sm">{e.description}</td>
                <td><span className="badge badge-neutral text-[0.6rem]">{e.category}</span></td>
                <td className={`text-sm font-semibold ${e.delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{e.delta > 0 ? '+' : ''}{e.delta}</td>
                <td className="text-sm text-white">{e.balanceAfter}</td>
                <td><span className="badge badge-neutral text-[0.6rem]">{e.createdBy}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
