import { Zap, Clock, Calendar, CalendarRange } from 'lucide-react';
import type { ReactNode } from 'react';

export type PriorityLevel = 'express' | 'priority' | 'standard' | 'flexible';

interface PriorityBadgeProps {
  level: PriorityLevel;
  label: string;
}

const STYLES: Record<PriorityLevel, { cls: string; bar: string; icon: ReactNode }> = {
  express: { cls: 'bg-rose-500/[0.08] text-rose-600 border-rose-500/15', bar: 'from-rose-500 to-orange-500', icon: <Zap className="w-3 h-3" /> },
  priority: { cls: 'bg-amber-500/[0.08] text-amber-600 border-amber-500/15', bar: 'from-amber-500 to-amber-300', icon: <Clock className="w-3 h-3" /> },
  standard: { cls: 'bg-ocean/[0.07] text-ocean border-ocean/15', bar: 'from-ocean to-ocean-700', icon: <Calendar className="w-3 h-3" /> },
  flexible: { cls: 'bg-teal/[0.07] text-teal-700 border-teal/15', bar: 'from-teal-500 to-teal-700', icon: <CalendarRange className="w-3 h-3" /> },
};

/** Delivery-urgency badge (Express / Priority / Standard / Flexible). */
export function PriorityBadge({ level, label }: PriorityBadgeProps) {
  const { cls, icon } = STYLES[level];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[0.72rem] font-semibold ${cls}`}>
      {icon}
      {label}
    </span>
  );
}

/** Thin colored accent bar shown at the top of a feed card for the same levels. */
export function PriorityBar({ level }: { level: PriorityLevel }) {
  return <div className={`h-0.5 bg-gradient-to-r ${STYLES[level].bar}`} />;
}
