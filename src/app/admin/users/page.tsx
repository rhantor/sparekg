'use client';
import { useState } from 'react';
import { mockUsers } from '@/lib/mock-data';
import type { User, KycStatus } from '@/lib/types';
import Link from 'next/link';
import { Users, Search, Shield, Ban, CheckCircle, Clock, Star, Coins } from 'lucide-react';

const KYC_BADGE: Record<KycStatus, string> = {
  PENDING: 'badge-warning', UNDER_REVIEW: 'badge-info', APPROVED: 'badge-success', REJECTED: 'badge-danger',
};

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [kycFilter, setKycFilter] = useState<KycStatus | 'ALL'>('ALL');

  const filtered = mockUsers.filter(u => {
    const matchSearch = !search || u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) || u.uid.includes(search);
    const matchKyc = kycFilter === 'ALL' || u.kycStatus === kycFilter;
    return matchSearch && matchKyc;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-400" /> User Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">Search and manage all registered users.</p>
        </div>
        <p className="text-sm text-gray-400"><span className="font-bold text-white">{mockUsers.length}</span> total users</p>
      </div>

      {/* Search + Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-10" placeholder="Search by name, email, or UID..." />
        </div>
        <div className="flex gap-2">
          {(['ALL', 'APPROVED', 'PENDING', 'REJECTED'] as const).map(f => (
            <button key={f} onClick={() => setKycFilter(f)} className={`btn text-xs ${kycFilter === f ? 'btn-primary' : 'btn-ghost'}`}>
              {f === 'ALL' ? 'All' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Roles</th>
              <th>KYC</th>
              <th>Rating</th>
              <th>Points</th>
              <th>Trips</th>
              <th>Status</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.uid}>
                <td>
                  <Link href={`/admin/users/${u.uid}`} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {u.displayName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{u.displayName}</p>
                      <p className="text-[0.625rem] text-gray-500">{u.email}</p>
                    </div>
                  </Link>
                </td>
                <td>
                  <div className="flex gap-1">
                    {u.roles.map(r => <span key={r} className="badge badge-neutral text-[0.6rem]">{r}</span>)}
                  </div>
                </td>
                <td><span className={`badge ${KYC_BADGE[u.kycStatus]}`}>{u.kycStatus}</span></td>
                <td>
                  {u.ratingCount > 0 ? (
                    <span className="flex items-center gap-1 text-sm"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> {u.averageRating} <span className="text-gray-500 text-xs">({u.ratingCount})</span></span>
                  ) : <span className="text-gray-600 text-xs">No ratings</span>}
                </td>
                <td><span className="flex items-center gap-1 text-sm"><Coins className="w-3.5 h-3.5 text-brand-400" /> {u.pointsBalance}</span></td>
                <td className="text-sm">{u.completedTripsAsTraveler + u.completedTripsAsSender}</td>
                <td>
                  {u.suspended ? (
                    <span className="badge badge-danger"><Ban className="w-3 h-3" /> Suspended</span>
                  ) : (
                    <span className="badge badge-success"><CheckCircle className="w-3 h-3" /> Active</span>
                  )}
                </td>
                <td className="text-xs text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
