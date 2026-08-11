'use client';
import Link from 'next/link';
import {
  Star, ShieldCheck, ShieldAlert, Clock, Coins, Plane, Package, ChevronRight,
  Wallet, Settings, IdCard, LogOut, Pencil,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Avatar } from '@/components/ui/Avatar';
import { currentUser } from '@/lib/app-samples';
import { getMyKycStatus } from './kyc/actions';
import { presentKycStatus } from '@/lib/kyc-status';
import type { KycStatus } from '@/lib/types';

export default function ProfilePage() {
  const { user, kycApproved, logout } = useAuth();
  const name = user?.displayName || currentUser.name;
  const email = user?.email || currentUser.email;

  // The custom claim only ever says "approved". Read the stored status so a
  // pending or rejected submission is not indistinguishable from never having
  // applied at all.
  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null);
  // Tracked separately from the value: until this resolves, `null` is
  // indistinguishable from "never applied", and rendering that would flash
  // "Verify identity" at a user who is actually under review.
  const [kycLoaded, setKycLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    getMyKycStatus().then((res) => {
      if (!active) return;
      setKycStatus(res?.status ?? null);
      setKycLoaded(true);
    });
    return () => { active = false; };
  }, [user?.uid]);

  const effectiveStatus: KycStatus | null = kycApproved ? 'APPROVED' : kycStatus;
  const kycPresentation = presentKycStatus(effectiveStatus);
  const verified = effectiveStatus === 'APPROVED';

  const STATS = [
    { icon: Coins, label: 'Points', value: `${currentUser.points}`, tint: 'text-teal' },
    { icon: Star, label: 'Rating', value: currentUser.rating.toFixed(1), tint: 'text-amber-500' },
    { icon: Plane, label: 'Carried', value: `${currentUser.tripsAsTraveler}`, tint: 'text-ocean' },
    { icon: Package, label: 'Sent', value: `${currentUser.tripsAsSender}`, tint: 'text-teal' },
  ];

  const LINKS = [
    { href: '/profile/edit', icon: Pencil, label: 'Edit profile', note: '' },
    {
      href: '/profile/kyc',
      icon: IdCard,
      label: 'Identity verification',
      note: !kycLoaded && !kycApproved
        ? <span className="inline-block h-3 w-20 rounded bg-line/70 animate-pulse" />
        : kycPresentation.label,
    },
    { href: '/bids', icon: Wallet, label: 'Points & wallet', note: `${currentUser.points} pts` },
    { href: '/home', icon: Settings, label: 'Account settings', note: '' },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      {/* identity card */}
      <div className="bg-white rounded-2xl border border-line shadow-soft p-6 mb-6">
        <div className="flex items-center gap-4">
          <Avatar name={name} color={currentUser.color} verified={verified} size={64} />
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl font-semibold text-navy">{name}</h1>
            <p className="text-sm text-ash truncate">{email}</p>
            <div className="mt-2">
              {!kycLoaded && !kycApproved ? (
                <span className="inline-block h-6 w-36 rounded-full bg-line/70 animate-pulse align-middle">
                  <span className="sr-only">Loading verification status</span>
                </span>
              ) : verified ? (
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${kycPresentation.badgeCls}`}>
                  <ShieldCheck className="w-3.5 h-3.5" /> Identity verified
                </span>
              ) : (
                <Link
                  href="/profile/kyc"
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${kycPresentation.badgeCls}`}
                >
                  {effectiveStatus === 'PENDING' || effectiveStatus === 'UNDER_REVIEW' ? (
                    <><Clock className="w-3.5 h-3.5" /> Verification under review</>
                  ) : effectiveStatus === 'REJECTED' ? (
                    <><ShieldAlert className="w-3.5 h-3.5" /> Verification rejected — resubmit</>
                  ) : (
                    <><ShieldAlert className="w-3.5 h-3.5" /> Verify identity</>
                  )}
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mt-6 pt-6 border-t border-line">
          {STATS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="text-center">
                <Icon className={`w-5 h-5 mx-auto mb-1.5 ${s.tint}`} />
                <div className="font-display text-lg font-semibold text-navy">{s.value}</div>
                <div className="text-[0.7rem] text-ash">{s.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* account links */}
      <div className="bg-white rounded-2xl border border-line shadow-soft divide-y divide-line overflow-hidden">
        {LINKS.map((l) => {
          const Icon = l.icon;
          return (
            <Link key={l.label} href={l.href} className="flex items-center gap-3 p-4 hover:bg-sand transition-colors">
              <span className="w-9 h-9 rounded-lg bg-navy/[0.04] flex items-center justify-center">
                <Icon className="w-4 h-4 text-ash" />
              </span>
              <span className="flex-1 text-sm font-medium text-navy">{l.label}</span>
              {l.note && <span className="text-xs text-ash">{l.note}</span>}
              <ChevronRight className="w-4 h-4 text-ash" />
            </Link>
          );
        })}
        <button onClick={logout} className="w-full flex items-center gap-3 p-4 hover:bg-rose-500/[0.04] transition-colors text-left">
          <span className="w-9 h-9 rounded-lg bg-rose-500/[0.06] flex items-center justify-center">
            <LogOut className="w-4 h-4 text-rose-600" />
          </span>
          <span className="flex-1 text-sm font-medium text-rose-600">Sign out</span>
        </button>
      </div>
    </div>
  );
}
