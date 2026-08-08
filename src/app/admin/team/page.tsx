'use client';
import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import {
  UsersRound, Shield, UserPlus, Trash2, AlertCircle, CheckCircle2, Loader2,
} from 'lucide-react';
import { db, functions } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';

interface TeamMember {
  uid: string;
  email: string;
  displayName: string | null;
  role: 'admin' | 'super_admin';
  grantedBy: string | null;
}

export default function TeamPage() {
  const { isSuperAdmin, user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'super_admin'>('admin');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'admin_roles'), orderBy('role', 'asc')));
      setMembers(snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as TeamMember));
    } catch {
      setError('Could not load the team list.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) load();
  }, [isSuperAdmin, load]);

  async function setUserRole(targetEmail: string, nextRole: 'admin' | 'super_admin' | null) {
    setError(null);
    setNotice(null);
    setBusy(targetEmail);
    try {
      await httpsCallable(functions, 'setUserRole')({ email: targetEmail, role: nextRole });
      setNotice(
        nextRole === null
          ? `Removed access for ${targetEmail}.`
          : `${targetEmail} is now ${nextRole === 'super_admin' ? 'a super admin' : 'an admin'}. They must sign out and back in.`,
      );
      setEmail('');
      await load();
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Could not update that account.');
    } finally {
      setBusy(null);
    }
  }

  if (!isSuperAdmin) {
    return (
      <div className="text-center py-20">
        <Shield className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 text-lg font-medium">Super Admin Only</p>
        <p className="text-sm text-gray-500 mt-1">You need super-admin privileges to manage team access.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <UsersRound className="w-6 h-6 text-brand-400" /> Team Access
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Super-admin only. Every change is written to the audit trail.
        </p>
      </div>

      <div className="glass-card p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-emerald-400" /> Grant access
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          They must sign in with Google at least once first — that creates the account this grants against.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@gmail.com"
            className="input flex-1"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'admin' | 'super_admin')}
            className="input sm:w-48"
          >
            <option value="admin">Admin</option>
            <option value="super_admin">Super admin</option>
          </select>
          <button
            onClick={() => setUserRole(email.trim(), role)}
            disabled={!email.trim() || busy !== null}
            className="btn btn-primary disabled:opacity-60"
          >
            {busy === email.trim() ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Grant
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-3">
          Admins see every console page except this one and Settings. Super admins see everything, including
          identity documents in the KYC queue.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 px-4 py-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      {notice && (
        <div className="flex items-start gap-2 px-4 py-3 mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          {notice}
        </div>
      )}

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Current team</h3>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">
            No one listed yet. Your own access predates this page — grant someone below and they&apos;ll appear here.
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Member</th><th>Role</th><th>Granted by</th><th></th></tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const isSelf = m.uid === user?.uid;
                return (
                  <tr key={m.uid}>
                    <td>
                      <div className="text-white font-medium">{m.displayName || m.email}</div>
                      {m.displayName && <div className="text-xs text-gray-500">{m.email}</div>}
                    </td>
                    <td>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        m.role === 'super_admin'
                          ? 'bg-brand-500/15 text-brand-400'
                          : 'bg-gray-500/15 text-gray-400'
                      }`}>
                        {m.role === 'super_admin' ? 'Super admin' : 'Admin'}
                      </span>
                    </td>
                    <td className="text-gray-400 text-xs">{m.grantedBy ?? '—'}</td>
                    <td className="text-right">
                      {isSelf ? (
                        <span className="text-xs text-gray-600">You</span>
                      ) : (
                        <button
                          onClick={() => setUserRole(m.email, null)}
                          disabled={busy !== null}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 disabled:opacity-60"
                        >
                          {busy === m.email ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
