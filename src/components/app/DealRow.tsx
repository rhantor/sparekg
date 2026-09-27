import Link from 'next/link';
import { ArrowRight, Package, Plane } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/app/StatusBadge';
import { colorFor } from '@/lib/view-models';
import { counterpart, dealRole, money, nextStep, routeLabel } from '@/lib/deals';
import type { Transaction } from '@/lib/types';

/** One agreed deal in a list, told from the viewer's side. */
export function DealRow({ deal, uid }: { deal: Transaction; uid: string }) {
  const role = dealRole(deal, uid);
  if (!role) return null;

  const other = counterpart(deal, role);
  const step = nextStep(deal, role);
  const RoleIcon = role === 'sender' ? Package : Plane;

  return (
    <Link
      href={`/deliveries/${deal.transactionId}`}
      className="bg-white rounded-2xl border border-line shadow-soft p-4 flex items-center gap-4 hover:shadow-float hover:-translate-y-0.5 transition-all"
    >
      <Avatar
        name={other.displayName}
        color={colorFor(role === 'sender' ? deal.travelerId : deal.senderId)}
        size={42}
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-navy flex items-center gap-2">
          {other.displayName}
          <span className="inline-flex items-center gap-1 text-[0.68rem] font-semibold text-ash">
            <RoleIcon className="w-3 h-3" /> {role === 'sender' ? 'Your parcel' : 'You carry'}
          </span>
        </div>
        <div className="text-xs text-ash truncate">
          {routeLabel(deal)} · {deal.kg} KG · {deal.item.description}
        </div>
        <div className={`text-xs mt-1 font-medium ${step.yourMove ? 'text-teal-700' : 'text-ash'}`}>
          {step.yourMove && <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal mr-1.5 align-middle" />}
          {step.text}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-semibold text-navy">{money(deal.totalPrice, deal.currency)}</div>
        <div className="mt-1"><StatusBadge status={deal.status} /></div>
      </div>
      <ArrowRight className="w-5 h-5 text-ash shrink-0 hidden sm:block" />
    </Link>
  );
}
