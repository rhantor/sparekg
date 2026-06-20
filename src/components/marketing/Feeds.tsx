'use client';
import { useState, useEffect } from 'react';
import { Plane, Package, Flame, CheckCircle2, MessageCircle, ArrowRight } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Modal } from '@/components/ui/Modal';
import { Reveal } from '@/components/ui/Reveal';
import { FeedCard } from './FeedCard';
import {
  travelerFeed, senderFeed, tickerItems, WHATSAPP_NUMBER, type FeedItem,
} from '@/lib/marketing-samples';

function useBiddingCountdown() {
  const [label, setLabel] = useState('--:--:--');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(18, 0, 0, 0);
      if (now >= next) next.setDate(next.getDate() + 1);
      const d = next.getTime() - now.getTime();
      const h = String(Math.floor(d / 3600000)).padStart(2, '0');
      const m = String(Math.floor((d % 3600000) / 60000)).padStart(2, '0');
      const s = String(Math.floor((d % 60000) / 1000)).padStart(2, '0');
      setLabel(`${h}:${m}:${s}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  return label;
}

function waLink(text: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

export function Feeds() {
  const [tab, setTab] = useState<'traveler' | 'sender'>('traveler');
  const [contact, setContact] = useState<FeedItem | null>(null);
  const [bid, setBid] = useState<FeedItem | null>(null);
  const [bidMode, setBidMode] = useState<'accept' | 'counter'>('accept');
  const [counter, setCounter] = useState('');
  const countdown = useBiddingCountdown();

  const items = tab === 'traveler' ? travelerFeed : senderFeed;

  function openBid(item: FeedItem) {
    setBidMode('accept');
    setCounter('');
    setBid(item);
  }

  function submitBid() {
    if (!bid) return;
    let text: string;
    if (bidMode === 'accept') {
      text = `Hi ${bid.name}, I found you on SpareKG and accept your offer of ${bid.price} ${bid.priceUnit}. I'd like to proceed!`;
    } else {
      if (!counter) {
        alert('Please enter your counter price.');
        return;
      }
      text = `Hi ${bid.name}, I found you on SpareKG. Your price is ${bid.price} ${bid.priceUnit}. I'd like to counter at RM ${counter}/kg. Open to negotiate!`;
    }
    window.open(waLink(text), '_blank');
    setBid(null);
  }

  return (
    <section id="feeds" className="bg-sand py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <SectionHeader
            center
            label="Live Community"
            title="Browse travelers & senders"
            desc="Find a traveler with spare capacity, or connect with someone who needs to send on your route."
          />
        </Reveal>

        {/* ticker */}
        <div className="flex items-center gap-4 bg-navy rounded-xl px-5 py-3 mt-10 mb-5 max-w-2xl mx-auto overflow-hidden">
          <span className="flex items-center gap-1.5 whitespace-nowrap text-[0.8rem] font-semibold text-teal-300">
            <Flame className="w-3.5 h-3.5" /> Active today
          </span>
          <div className="flex-1 overflow-hidden">
            <div className="marquee">
              {[...tickerItems, ...tickerItems].map((t, i) => (
                <span key={i} className="text-[0.8rem] text-white/70 pr-8">{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* bidding window */}
        <div className="flex items-center justify-center gap-4 flex-wrap bg-white border border-line rounded-xl px-6 py-3 mb-9 max-w-xl mx-auto shadow-soft">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-leaf/40 animate-ping" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-leaf" />
          </span>
          <span className="text-sm font-medium text-navy">
            Bidding window <span className="text-leaf font-semibold">open</span> — closes 12:00 PM
          </span>
          <span className="text-xs text-ash">
            Next 6 PM · <span className="font-semibold text-navy tabular-nums">{countdown}</span>
          </span>
        </div>

        {/* tabs */}
        <div className="flex justify-center mb-9">
          <div className="inline-flex bg-white border border-line rounded-xl p-1 shadow-soft">
            <button
              onClick={() => setTab('traveler')}
              className={`flex items-center gap-2 px-7 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                tab === 'traveler' ? 'bg-ocean text-white' : 'text-ash hover:text-navy'
              }`}
            >
              <Plane className="w-4 h-4" /> Travelers
            </button>
            <button
              onClick={() => setTab('sender')}
              className={`flex items-center gap-2 px-7 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                tab === 'sender' ? 'bg-teal text-white' : 'text-ash hover:text-navy'
              }`}
            >
              <Package className="w-4 h-4" /> Senders
            </button>
          </div>
        </div>

        {/* cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, i) => (
            <Reveal key={`${tab}-${item.name}`} delay={i * 0.07}>
              <FeedCard item={item} onContact={setContact} onBid={openBid} />
            </Reveal>
          ))}
        </div>
      </div>

      {/* Contact modal */}
      <Modal
        open={contact !== null}
        onClose={() => setContact(null)}
        title={contact ? `Contact ${contact.name}` : ''}
        subtitle={
          contact
            ? `Reach out about their ${contact.side === 'traveler' ? 'trip' : 'sending request'}.`
            : ''
        }
      >
        {contact && (
          <div className="space-y-3">
            <a
              href={waLink(`Hi ${contact.name}, I found you on SpareKG and I'm interested in connecting!`)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#25d366] text-white font-semibold hover:bg-[#22bf5b] transition-colors"
            >
              <MessageCircle className="w-4 h-4" /> Continue on WhatsApp
            </a>
            <p className="text-xs text-ash text-center">
              Personal details are only shared after both parties agree to connect.
            </p>
          </div>
        )}
      </Modal>

      {/* Bid modal */}
      <Modal
        open={bid !== null}
        onClose={() => setBid(null)}
        title={bid ? `Offer to ${bid.name}` : ''}
        subtitle={bid ? `Current price: ${bid.price} ${bid.priceUnit}. Accept or counter.` : ''}
      >
        {bid && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {(['accept', 'counter'] as const).map((mode) => {
                const Icon = mode === 'accept' ? CheckCircle2 : MessageCircle;
                return (
                  <button
                    key={mode}
                    onClick={() => setBidMode(mode)}
                    className={`p-4 rounded-xl border text-center transition-colors ${
                      bidMode === mode ? 'border-teal bg-teal/[0.06]' : 'border-line hover:border-teal/50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mx-auto mb-1.5 ${bidMode === mode ? 'text-teal' : 'text-ash'}`} />
                    <div className="font-semibold text-sm text-navy">{mode === 'accept' ? 'Accept' : 'Counter'}</div>
                    <div className="text-xs text-ash mt-0.5">
                      {mode === 'accept' ? `${bid.price} ${bid.priceUnit}` : 'Name your price'}
                    </div>
                  </button>
                );
              })}
            </div>

            {bidMode === 'counter' && (
              <div className="mb-5">
                <label className="block text-sm font-medium text-navy mb-1.5">Your counter price (RM per KG)</label>
                <input
                  type="number"
                  min={5}
                  max={50}
                  value={counter}
                  onChange={(e) => setCounter(e.target.value)}
                  placeholder="e.g. 19"
                  className="w-full px-4 py-2.5 rounded-lg border border-line text-center font-semibold text-navy outline-none focus:border-teal"
                />
              </div>
            )}

            <button
              onClick={submitBid}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-navy text-white font-semibold hover:bg-navy-700 transition-colors"
            >
              Submit via WhatsApp <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-xs text-ash text-center mt-2.5">
              Opens WhatsApp to complete your negotiation directly.
            </p>
          </>
        )}
      </Modal>
    </section>
  );
}
