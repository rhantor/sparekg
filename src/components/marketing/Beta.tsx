'use client';
import { useState } from 'react';
import { Plane, Package, Users, Check, ArrowRight } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Reveal } from '@/components/ui/Reveal';

const ROLES = [
  { key: 'Traveler', Icon: Plane },
  { key: 'Sender', Icon: Package },
  { key: 'Both', Icon: Users },
];
const ROUTES = [
  'Kuala Lumpur → Dhaka',
  'Kuala Lumpur → Chittagong',
  'Penang → Dhaka',
  'Malaysia → Bangladesh',
  'Other',
];

export function Beta() {
  const [role, setRole] = useState('Traveler');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const inputCls =
    'w-full px-4 py-2.5 rounded-lg border border-line bg-white text-navy text-sm outline-none transition-colors focus:border-teal placeholder:text-ash/60';

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email) {
      alert('Please fill in your name and email.');
      return;
    }
    setSubmitted(true);
  }

  return (
    <section id="beta" className="bg-white py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <Reveal>
          <SectionHeader
            center
            label="Early Access"
            title="Join the beta community"
            desc="Be among the first to use SpareKG. Sign up for early access and help shape the platform."
          />
        </Reveal>

        {submitted ? (
          <div className="mt-12 bg-sand rounded-2xl border border-line p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-teal/10 flex items-center justify-center mx-auto mb-5">
              <Check className="w-7 h-7 text-teal" />
            </div>
            <h3 className="font-display text-2xl text-navy mb-2">You&apos;re on the list</h3>
            <p className="text-ash">
              Thanks for joining SpareKG&apos;s beta. We&apos;ll reach out soon with your early access details.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-12 bg-sand rounded-2xl border border-line p-8">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-navy mb-1.5">Full Name</label>
                <input className={inputCls} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy mb-1.5">Phone Number</label>
                <input className={inputCls} placeholder="+60 12 345 6789" type="tel" />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-navy mb-1.5">Email Address</label>
              <input className={inputCls} placeholder="you@email.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-navy mb-2">I am a…</label>
              <div className="flex flex-wrap gap-2.5">
                {ROLES.map(({ key, Icon }) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setRole(key)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      role === key ? 'border-teal text-teal bg-teal/[0.07]' : 'border-line text-ash hover:border-ash/40'
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {key}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-navy mb-1.5">Travel Route</label>
                <select className={inputCls} defaultValue="">
                  <option value="" disabled>Select route</option>
                  {ROUTES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy mb-1.5">Travel Date (Optional)</label>
                <input className={inputCls} type="date" />
              </div>
            </div>

            <button
              type="submit"
              className="flex items-center justify-center gap-2 w-full mt-6 py-3.5 rounded-xl bg-navy text-white font-semibold hover:bg-navy-700 transition-colors"
            >
              Join Early Access — it&apos;s free <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
