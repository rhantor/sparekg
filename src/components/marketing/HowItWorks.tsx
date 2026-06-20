import { Plane, Package } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Reveal } from '@/components/ui/Reveal';

const TRAVELER_STEPS = [
  { t: 'Post your travel details', s: 'Share your route, date, and available luggage weight.' },
  { t: 'Set your capacity & terms', s: 'Choose how much weight you carry and what items you accept.' },
  { t: 'Connect with senders & earn', s: 'Agree on terms, carry safely, and get paid on delivery.' },
];

const SENDER_STEPS = [
  { t: 'Find travelers on your route', s: 'Browse verified travelers flying with spare capacity.' },
  { t: 'Agree on item and price', s: 'Discuss item type, weight, and fee directly with the traveler.' },
  { t: 'Receive at destination', s: 'Your item is delivered to an agreed pickup point in Dhaka.' },
];

function Panel({
  icon, title, badge, accent, ring, steps,
}: {
  icon: React.ReactNode; title: string; badge: string; accent: string; ring: string;
  steps: { t: string; s: string }[];
}) {
  return (
    <div className="bg-white rounded-2xl border border-line shadow-soft p-8">
      <div className="flex items-center gap-3 mb-7">
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${ring}`}>{icon}</span>
        <span className="font-display text-xl text-navy">{title}</span>
        <span className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${accent}`}>{badge}</span>
      </div>
      <div className="space-y-5">
        {steps.map((step, i) => (
          <div key={i} className="flex gap-4">
            <div className={`min-w-7 h-7 rounded-full flex items-center justify-center font-semibold text-[0.8rem] ${accent}`}>
              {i + 1}
            </div>
            <div>
              <strong className="block font-semibold text-navy text-[0.95rem] mb-0.5">{step.t}</strong>
              <span className="text-sm text-ash">{step.s}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section id="how" className="bg-sand py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <SectionHeader
            center
            label="Simple Process"
            title="How SpareKG works"
            desc="Whether you're flying or sending, getting started takes just three steps."
          />
        </Reveal>
        <div className="grid md:grid-cols-2 gap-7 mt-16">
          <Reveal delay={0.05}>
            <Panel
              icon={<Plane className="w-5 h-5 text-ocean" />}
              title="For Travelers"
              badge="Earn Money"
              accent="bg-ocean/10 text-ocean"
              ring="bg-ocean/10"
              steps={TRAVELER_STEPS}
            />
          </Reveal>
          <Reveal delay={0.15}>
            <Panel
              icon={<Package className="w-5 h-5 text-teal" />}
              title="For Senders"
              badge="Save on Shipping"
              accent="bg-teal/10 text-teal-700"
              ring="bg-teal/10"
              steps={SENDER_STEPS}
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
