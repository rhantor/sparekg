'use client';
import { use } from 'react';
import { mockUsers, mockPointsLedger, mockBids, mockFlights } from '@/lib/mock-data';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import {
  ArrowLeft, Star, Coins, Plane, Send, Shield, Ban, CheckCircle,
  Clock, Mail, Phone, Globe, Calendar, AlertTriangle,
} from 'lucide-react';

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isSuperAdmin } = useAuth();
  const user = mockUsers.find(u => u.uid === id);
  const ledger = mockPointsLedger.filter(e => e.userId === id).slice(0, 10);
  const userFlights = mockFlights.filter(f => f.travelerId === id);
  const userBids = mockBids.filter(b => b.senderId === id);

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">User not found.</p>
        <Link href="/admin/users" className="btn btn-ghost mt-4"><ArrowLeft className="w-4 h-4" /> Back to Users</Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </Link>

      {/* Header */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {user.displayName.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-white">{user.displayName}</h1>
              {user.suspended ? (
                <span className="badge badge-danger"><Ban className="w-3 h-3" /> Suspended</span>
              ) : (
                <span className="badge badge-success"><CheckCircle className="w-3 h-3" /> Active</span>
              )}
              <span className={`badge ${user.kycStatus === 'APPROVED' ? 'badge-success' : user.kycStatus === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`}>
                KYC: {user.kycStatus}
              </span>
            </div>
            <div className="flex items-center gap-5 text-sm text-gray-400 flex-wrap">
              <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {user.email}</span>
              {user.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {user.phone}</span>}
              <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> {user.preferredLanguage}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Joined {new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
            {user.suspensionReason && (
              <div className="mt-3 flex items-center gap-2 text-sm text-red-400 bg-red-500/10 rounded-lg p-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {user.suspensionReason}
              </div>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            {!user.suspended ? (
              <button className="btn btn-danger text-xs"><Ban className="w-3.5 h-3.5" /> Suspend</button>
            ) : (
              <button className="btn btn-success text-xs"><CheckCircle className="w-3.5 h-3.5" /> Unsuspend</button>
            )}
            <button className="btn btn-ghost text-xs"><Shield className="w-3.5 h-3.5" /> Force Re-KYC</button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="kpi-card">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2"><Star className="w-4 h-4 text-amber-400" /> Rating</div>
          <p className="text-2xl font-bold text-white">{user.ratingCount > 0 ? user.averageRating : '—'}</p>
          <p className="text-xs text-gray-500">{user.ratingCount} reviews</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2"><Coins className="w-4 h-4 text-brand-400" /> Points</div>
          <p className="text-2xl font-bold text-white">{user.pointsBalance}</p>
          <p className="text-xs text-gray-500">Earned: {user.lifetimePointsEarned} · Spent: {user.lifetimePointsSpent}</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2"><Plane className="w-4 h-4 text-emerald-400" /> As Traveler</div>
          <p className="text-2xl font-bold text-white">{user.completedTripsAsTraveler}</p>
          <p className="text-xs text-gray-500">completed trips</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2"><Send className="w-4 h-4 text-sky-400" /> As Sender</div>
          <p className="text-2xl font-bold text-white">{user.completedTripsAsSender}</p>
          <p className="text-xs text-gray-500">deliveries made</p>
        </div>
      </div>

      {/* Points Ledger */}
      <div className="glass-card p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-4">Recent Points Activity</h3>
        {ledger.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No points activity yet.</p>
        ) : (
          <table className="data-table">
            <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Delta</th><th>Balance</th></tr></thead>
            <tbody>
              {ledger.map(e => (
                <tr key={e.entryId}>
                  <td className="text-xs text-gray-500">{new Date(e.createdAt).toLocaleString()}</td>
                  <td className="text-sm">{e.description}</td>
                  <td><span className="badge badge-neutral text-[0.6rem]">{e.category}</span></td>
                  <td className={`text-sm font-semibold ${e.delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {e.delta > 0 ? '+' : ''}{e.delta}
                  </td>
                  <td className="text-sm text-white">{e.balanceAfter}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Flights + Bids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Flights ({userFlights.length})</h3>
          {userFlights.length === 0 ? <p className="text-sm text-gray-500 text-center py-4">No flights posted.</p> : (
            <div className="space-y-2">
              {userFlights.map(f => (
                <div key={f.flightId} className="bg-surface-100 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{f.originAirport} → {f.destinationAirport}</p>
                    <p className="text-xs text-gray-500">{f.airline} {f.flightNumber} · {new Date(f.departureAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`badge ${f.status === 'LIVE' ? 'badge-success' : f.status === 'COMPLETED' ? 'badge-info' : 'badge-neutral'}`}>{f.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Bids ({userBids.length})</h3>
          {userBids.length === 0 ? <p className="text-sm text-gray-500 text-center py-4">No bids placed.</p> : (
            <div className="space-y-2">
              {userBids.map(b => (
                <div key={b.bidId} className="bg-surface-100 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{b.itemCategory} · {b.kgRequested}kg</p>
                    <p className="text-xs text-gray-500">MYR {b.offeredTotal} · Flight {b.flightId}</p>
                  </div>
                  <span className={`badge ${b.status === 'AGREED' ? 'badge-success' : b.status === 'PENDING' ? 'badge-warning' : 'badge-neutral'}`}>{b.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
