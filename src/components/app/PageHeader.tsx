import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="font-display text-2xl md:text-[1.7rem] font-semibold text-navy">{title}</h1>
        {subtitle && <p className="text-sm text-ash mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
