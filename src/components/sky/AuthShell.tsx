import Link from 'next/link';
import { Plane } from 'lucide-react';
import { SkyBackdrop } from './SkyBackdrop';

/**
 * Sign-in, sign-up and password reset: a single white card held above the
 * clouds. `footer` sits inside the card so it stays readable over any part of
 * the sky.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="site relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden">
      <SkyBackdrop />
      <div className="relative w-full max-w-[410px]">
        <div className="text-center mb-7">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white font-semibold text-lg"
            aria-label="SpareKG home"
          >
            <span className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 backdrop-blur flex items-center justify-center">
              <Plane className="w-5 h-5" />
            </span>
            <span>Spare<span className="text-gold">KG</span></span>
          </Link>
          <h1 className="font-display text-4xl mt-6 text-white!">{title}</h1>
          <p className="text-sm text-white/75 mt-2">{subtitle}</p>
        </div>

        <div className="bg-white rounded-3xl shadow-[0_40px_90px_rgba(4,16,38,0.35)] p-6 sm:p-7">
          {children}
          {footer && <div className="mt-6 pt-5 border-t border-line text-center text-sm text-ash">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
