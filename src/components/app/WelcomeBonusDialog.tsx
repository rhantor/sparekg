'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Gift, Coins, Search } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useSignupBonusQuery } from '@/lib/store/api';

/**
 * How long after the bonus was credited it is still worth congratulating someone.
 *
 * Acknowledgement is stored per browser, so without a window a user signing in on
 * a second device a year later would be congratulated on a bonus they spent long
 * ago. A few days covers a real sign-up and nothing else.
 */
const FRESH_FOR_DAYS = 7;

/** Poll spacing while the auth trigger catches up, and how long to keep asking. */
const POLL_MS = 2500;
const GIVE_UP_MS = 30_000;

const ackKey = (uid: string) => `sparekg.welcomeBonusSeen.${uid}`;

/** localStorage throws in some privacy modes, where "not acknowledged" is the safe read. */
function alreadySeen(uid: string): boolean {
  try {
    return window.localStorage.getItem(ackKey(uid)) === '1';
  } catch {
    return false;
  }
}

function markSeen(uid: string): void {
  try {
    window.localStorage.setItem(ackKey(uid), '1');
  } catch {
    // A user who cannot persist the flag sees the dialog once more next visit,
    // which is a far better failure than suppressing it for someone who has not
    // seen it at all.
  }
}

/**
 * Congratulates a new user on their sign-up bonus, once.
 *
 * Deliberately driven by the ledger rather than by "did we just come from the
 * sign-up form". The bonus is written by the `onUserCreate` auth trigger, so it
 * lands a beat after the redirect and can fail on its own without failing
 * account creation — announcing a number from the config would sometimes be a
 * promise of points nobody was given. Here the dialog only appears once a real
 * `SIGNUP` row exists, and shows that row's own figure.
 *
 * Reading the ledger also makes the sign-in route irrelevant: email, Google
 * popup and Google redirect all land here the same way.
 */
export function WelcomeBonusDialog({ uid }: { uid: string }) {
  // Read once on mount rather than on every render: markSeen() runs while the
  // dialog is still open, and re-reading would close it under the user.
  const [suppressed, setSuppressed] = useState(true);
  const [gaveUp, setGaveUp] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!uid) return;
    setSuppressed(alreadySeen(uid));
  }, [uid]);

  // Stop polling on any settled outcome, so a returning user with the flag set
  // never opens a repeating query at all.
  const done = suppressed || gaveUp || dismissed;
  const { data } = useSignupBonusQuery(uid, {
    skip: !uid || done,
    pollingInterval: done ? 0 : POLL_MS,
  });

  const entry = data?.[0];

  useEffect(() => {
    if (done || entry) return;
    const timer = setTimeout(() => setGaveUp(true), GIVE_UP_MS);
    return () => clearTimeout(timer);
  }, [done, entry]);

  if (done || !entry) return null;

  const credited = Date.parse(entry.createdAt);
  const fresh =
    Number.isFinite(credited) && Date.now() - credited < FRESH_FOR_DAYS * 86_400_000;
  if (!fresh) return null;

  function close() {
    markSeen(uid);
    setDismissed(true);
  }

  return (
    <Modal open onClose={close} maxWidth={400}>
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-teal/10 flex items-center justify-center mx-auto mb-4">
          <Gift className="w-8 h-8 text-teal" />
        </div>

        <h3 className="font-display text-2xl text-navy mb-1">Welcome to SpareKG</h3>
        <p className="text-sm text-ash mb-5">Your account is ready, and we&apos;ve topped it up.</p>

        <div className="flex items-center justify-center gap-2 bg-sand rounded-xl py-4 mb-5">
          <Coins className="w-6 h-6 text-teal" />
          <span className="font-display text-3xl font-semibold text-navy">
            +{entry.delta}
          </span>
          <span className="text-sm text-ash self-end mb-1.5">points</span>
        </div>

        <p className="text-sm text-ash mb-5">
          Use them to bid on flights. You&apos;ll also get free points each month while
          you&apos;re active on the platform.
        </p>

        <Link
          href="/flights"
          onClick={close}
          className="w-full py-3 rounded-xl bg-navy text-white font-semibold hover:bg-navy-700 transition-colors inline-flex items-center justify-center gap-2"
        >
          <Search className="w-4 h-4" /> Find a flight
        </Link>
        <button
          onClick={close}
          className="w-full py-2.5 mt-2 text-sm font-medium text-ash hover:text-navy transition-colors"
        >
          Maybe later
        </button>
      </div>
    </Modal>
  );
}
