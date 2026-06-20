import Link from 'next/link';
import { Coins, Star, Plane, ShieldCheck, PlusCircle, Search, ArrowRight, Layers } from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { FlightCard } from '@/components/app/FlightCard';
import { StatusBadge } from '@/components/app/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { currentUser, myFlights, myBids } from '@/lib/app-samples';

const STATS = [
  { icon: Coins, label: 'Points balance', value: `${currentUser.points}`, sub: `${currentUser.promo} promo`, tint: 'bg-teal/10 text-teal' },
  { icon: Star, label: 'Your rating', value: currentUser.rating.toFixed(1), sub: `${currentUser.ratingCount} reviews`, tint: 'bg-gold/10 text-amber-600' },
  { icon: Plane, label: 'Trips completed', value: `${currentUser.tripsAsTraveler + currentUser.tripsAsSender}`, sub: `${currentUser.tripsAsTraveler} carried`, tint: 'bg-ocean/10 text-ocean' },
  { icon: ShieldCheck, label: 'Identity', value: 'Verified', sub: 'KYC approved', tint: 'bg-leaf/10 text-leaf' },
];

const ACTIONS = [
  { href: '/flights/new', icon: PlusCircle, title: 'Post a flight', desc: 'List your spare luggage capacity' },
  { href: '/flights', icon: Search, title: 'Find flights', desc: 'Browse travelers on your route' },
  { href: '/bids', icon: Layers, title: 'Manage bids', desc: 'Track your offers and requests' },
];

export default function HomePage() {
  const activeFlights = myFlights.filter((f) => f.status === 'LIVE');

  return (
    <div>
      <PageHeader title={`Welcome back, ${currentUser.name.split(' ')[0]}`} subtitle="Here's what's happening with your trips." />

      {/* stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STATS.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-2xl border border-line shadow-soft p-5">
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${s.tint}`}>
                <Icon className="w-5 h-5" />
              </span>
              <div className="font-display text-2xl font-semibold text-navy">{s.value}</div>
              <div className="text-sm text-navy mt-0.5">{s.label}</div>
              <div className="text-xs text-ash">{s.sub}</div>
            </div>
          );
        })}
      </div>

      {/* quick actions */}
      <div className="grid sm:grid-cols-3 gap-4 mb-9">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <Link key={a.href} href={a.href} className="group bg-white rounded-2xl border border-line shadow-soft p-5 hover:shadow-float hover:-translate-y-1 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="w-10 h-10 rounded-xl bg-navy/[0.05] flex items-center justify-center">
                  <Icon className="w-5 h-5 text-teal" />
                </span>
                <ArrowRight className="w-4 h-4 text-ash group-hover:text-teal group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="font-semibold text-navy">{a.title}</div>
              <div className="text-sm text-ash">{a.desc}</div>
            </Link>
          );
        })}
      </div>

      {/* your flights */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-semibold text-navy">Your active flights</h2>
        <Link href="/flights/new" className="text-sm font-semibold text-teal hover:text-teal-700 inline-flex items-center gap-1">
          Post a flight <PlusCircle className="w-4 h-4" />
        </Link>
      </div>
      {activeFlights.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-5 mb-9">
          {activeFlights.map((f) => (
            <FlightCard key={f.id} flight={f} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-line p-8 text-center text-ash mb-9">
          You have no active flights. <Link href="/flights/new" className="text-teal font-semibold">Post one</Link>.
        </div>
      )}

      {/* your bids */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-semibold text-navy">Your recent bids</h2>
        <Link href="/bids" className="text-sm font-semibold text-teal hover:text-teal-700 inline-flex items-center gap-1">
          View all <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="bg-white rounded-2xl border border-line shadow-soft divide-y divide-line overflow-hidden">
        {myBids.map((b) => (
          <Link key={b.id} href={`/flights/${b.flightId}`} className="flex items-center gap-4 p-4 hover:bg-sand transition-colors">
            <Avatar name={b.counterpartyName} color={b.counterpartyColor} size={38} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-navy text-sm">{b.counterpartyName}</div>
              <div className="text-xs text-ash truncate">{b.route} · {b.kg} KG · {b.item}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-navy">RM {b.offeredTotal}</div>
              <div className="mt-1"><StatusBadge status={b.status} /></div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
