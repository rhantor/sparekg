const STYLES: Record<string, string> = {
  // flight
  LIVE: 'bg-leaf/10 text-leaf',
  LOCKED: 'bg-amber-500/10 text-amber-600',
  IN_TRANSIT: 'bg-ocean/10 text-ocean',
  COMPLETED: 'bg-navy/[0.06] text-navy',
  DRAFT: 'bg-ash/10 text-ash',
  // bid
  PENDING: 'bg-amber-500/10 text-amber-600',
  AGREED: 'bg-teal/10 text-teal-700',
  HANDED_OVER: 'bg-ocean/10 text-ocean',
  DELIVERED: 'bg-leaf/10 text-leaf',
  DECLINED: 'bg-rose-500/10 text-rose-600',
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STYLES[status] ?? 'bg-ash/10 text-ash';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[0.68rem] font-semibold uppercase tracking-wide ${cls}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
