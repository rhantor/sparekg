import { ShieldCheck, BadgeCheck, Star, Plane } from 'lucide-react';
import type { ReactNode } from 'react';

export type TrustVariant = 'verified' | 'id' | 'top' | 'frequent';

interface TrustBadgeProps {
  variant: TrustVariant;
  label: string;
}

const STYLES: Record<TrustVariant, { cls: string; icon: ReactNode }> = {
  verified: { cls: 'bg-ocean/[0.07] text-ocean border-ocean/15', icon: <ShieldCheck className="w-3 h-3" /> },
  id: { cls: 'bg-teal/[0.07] text-teal-700 border-teal/15', icon: <BadgeCheck className="w-3 h-3" /> },
  top: { cls: 'bg-gold/[0.1] text-amber-600 border-gold/20', icon: <Star className="w-3 h-3 fill-current" /> },
  frequent: { cls: 'bg-navy/[0.06] text-navy border-navy/10', icon: <Plane className="w-3 h-3" /> },
};

/** Small trust pill (Verified Traveler, ID Verified, Top Rated, Frequent Traveler). */
export function TrustBadge({ variant, label }: TrustBadgeProps) {
  const { cls, icon } = STYLES[variant];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[0.7rem] font-medium ${cls}`}>
      {icon}
      {label}
    </span>
  );
}
