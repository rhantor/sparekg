'use client';
import { useState } from 'react';
import { Plane, Package, Users, Check, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Reveal } from '@/components/ui/Reveal';
import { joinBeta } from '@/app/(marketing)/actions';
import { BETA_ROUTES, type BetaRole, type BetaSignupInput } from '@/lib/beta';

const ROLES: { key: BetaRole; Icon: React.ElementType }[] = [
  { key: 'Traveler', Icon: Plane },
  { key: 'Sender', Icon: Package },
  { key: 'Both', Icon: Users },
];

const EMPTY: BetaSignupInput = {
  name: '', email: '', phone: '', role: 'Traveler', route: '', travelDate: '', website: '',
};

export function Beta() {
  const [form, setForm] = useState<BetaSignupInput>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof BetaSignupInput>(key: K, value: BetaSignupInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const inputCls =
    'w-full px-4 py-2.5 rounded-lg border border-line bg-white text-navy text-sm outline-none transition-colors focus:border-teal placeholder:text-ash/60';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.email.trim()) {
      setError('Please fill in your name and email.');
      return;
    }
    setSubmitting(true);
    const result = await joinBeta(form);
    setSubmitting(false);
    if (result.success) setSubmitted(true);
    else setError(result.error ?? 'Something went wrong. Please try again.');
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
          <form onSubmit={submit} className="mt-12 bg-sand rounded-2xl border border-line p-8" noValidate>
            {/* Honeypot: invisible to people and screen readers, tempting to bots. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={form.website}
              onChange={(e) => set('website', e.target.value)}
              className="absolute -left-[9999px] w-px h-px opacity-0"
            />

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="beta-name" className="block text-sm font-medium text-navy mb-1.5">Full Name</label>
                <input id="beta-name" className={inputCls} placeholder="Your name" autoComplete="name"
                  value={form.name} onChange={(e) => set('name', e.target.value)} />
              </div>
              <div>
                <label htmlFor="beta-phone" className="block text-sm font-medium text-navy mb-1.5">Phone Number (Optional)</label>
                <input id="beta-phone" className={inputCls} placeholder="+60 12 345 6789" type="tel" autoComplete="tel"
                  value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </div>
            </div>
            <div className="mt-4">
              <label htmlFor="beta-email" className="block text-sm font-medium text-navy mb-1.5">Email Address</label>
              <input id="beta-email" className={inputCls} placeholder="you@email.com" type="email" autoComplete="email"
                value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>

            <div className="mt-4">
              <span className="block text-sm font-medium text-navy mb-2">I am a…</span>
              <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="I am a">
                {ROLES.map(({ key, Icon }) => (
                  <button
                    type="button"
                    key={key}
                    role="radio"
                    aria-checked={form.role === key}
                    onClick={() => set('role', key)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      form.role === key ? 'border-teal text-teal bg-teal/[0.07]' : 'border-line text-ash hover:border-ash/40'
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {key}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label htmlFor="beta-route" className="block text-sm font-medium text-navy mb-1.5">Travel Route</label>
                <select id="beta-route" className={inputCls} value={form.route} onChange={(e) => set('route', e.target.value)}>
                  <option value="">Select route</option>
                  {BETA_ROUTES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="beta-date" className="block text-sm font-medium text-navy mb-1.5">Travel Date (Optional)</label>
                <input id="beta-date" className={inputCls} type="date"
                  value={form.travelDate} onChange={(e) => set('travelDate', e.target.value)} />
              </div>
            </div>

            {error && (
              <div role="alert" className="flex items-start gap-2 mt-5 px-4 py-3 rounded-lg bg-rose-500/[0.07] border border-rose-500/20 text-sm text-rose-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 w-full mt-6 py-3.5 rounded-xl bg-navy text-white font-semibold hover:bg-navy-700 transition-colors disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {submitting ? 'Saving…' : <>Join Early Access — it&apos;s free <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
