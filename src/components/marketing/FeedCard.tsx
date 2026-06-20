import { ArrowRight, Luggage, Package, Flame, MessageCircle, Star } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { TrustBadge } from '@/components/ui/TrustBadge';
import { PriorityBadge, PriorityBar } from '@/components/ui/PriorityBadge';
import type { FeedItem } from '@/lib/marketing-samples';

interface FeedCardProps {
  item: FeedItem;
  onContact: (item: FeedItem) => void;
  onBid: (item: FeedItem) => void;
}

export function FeedCard({ item, onContact, onBid }: FeedCardProps) {
  const isTraveler = item.side === 'traveler';
  const TripIcon = isTraveler ? Luggage : Package;
  const BidIcon = item.bids >= 3 ? Flame : MessageCircle;
  const tripLabel = isTraveler ? 'successful deliveries' : 'completed sends';
  const bidLabel = isTraveler ? 'bids received' : 'traveler offers';

  return (
    <div className="bg-white rounded-2xl border border-line shadow-soft overflow-hidden hover:shadow-float hover:-translate-y-1 transition-all">
      <PriorityBar level={item.priority.level} />
      <div className="p-5">
        {/* header */}
        <div className="flex items-start gap-3 mb-4">
          <Avatar name={item.name} color={item.color} verified={item.verified} />
          <div className="min-w-0">
            <div className="font-semibold text-navy text-[0.95rem]">{item.name}</div>
            <div className="flex items-center gap-1 text-[0.78rem] text-ash mt-0.5">
              <Star className="w-3 h-3 fill-gold text-gold" />
              <span className="font-medium text-navy">{item.rating.toFixed(1)}</span>
              <span>({item.reviews})</span>
              <span className="mx-1 text-line">·</span>
              <TripIcon className="w-3 h-3" />
              <span>{item.trips} {tripLabel}</span>
            </div>
          </div>
        </div>

        {/* trust badges */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {item.badges.map((b) => (
            <TrustBadge key={b.label} variant={b.variant} label={b.label} />
          ))}
        </div>

        {/* route */}
        <div className="flex items-center gap-2 bg-sand rounded-lg px-3.5 py-2.5 mb-4 text-sm font-semibold text-navy">
          <span>{item.route[0]}</span>
          <ArrowRight className="w-3.5 h-3.5 text-ash" />
          <span>{item.route[1]}</span>
        </div>

        {/* details */}
        <div className="space-y-2 mb-4">
          {item.details.map((d) => (
            <div key={d.label} className="flex justify-between text-[0.85rem]">
              <span className="text-ash">{d.label}</span>
              <span className="font-medium text-navy">{d.value}</span>
            </div>
          ))}
        </div>

        <div className="mb-4">
          <PriorityBadge level={item.priority.level} label={item.priority.label} />
        </div>

        {/* bid row */}
        <div className="flex items-center justify-between bg-sand rounded-xl px-3.5 py-3 mb-4">
          <div>
            <div className="text-[0.7rem] text-ash">{item.priceLabel}</div>
            <div className="font-semibold text-lg text-navy">
              {item.price} <span className="text-[0.78rem] font-normal text-ash">{item.priceUnit}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 text-[0.78rem] font-semibold text-teal-700">
              <BidIcon className="w-3.5 h-3.5" /> {item.bids} {bidLabel}
            </div>
            <div className="text-[0.73rem] text-ash mt-0.5">
              Ends in <strong className="font-semibold text-rose-600">{item.timer}</strong>
            </div>
          </div>
        </div>

        {/* actions */}
        <div className="flex gap-2.5">
          <button
            onClick={() => onContact(item)}
            className={`flex-1 py-2.5 rounded-lg font-semibold text-sm text-white transition-colors ${
              isTraveler ? 'bg-ocean hover:bg-ocean-700' : 'bg-teal hover:bg-teal-700'
            }`}
          >
            Contact
          </button>
          <button
            onClick={() => onBid(item)}
            className="px-4 py-2.5 rounded-lg border border-line bg-white font-semibold text-sm text-navy hover:border-navy/25 transition-colors whitespace-nowrap"
          >
            {isTraveler ? 'Counter' : 'Place Bid'}
          </button>
        </div>
      </div>
    </div>
  );
}
