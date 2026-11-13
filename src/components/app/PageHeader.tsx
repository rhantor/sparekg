import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

/**
 * Page title for the signed-in app. It sits on the strip of sky the app shell
 * draws behind the top of every page, so it is set in white.
 */
export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-8 md:mb-10">
      <div>
        <h1 className="font-display text-[2.6rem] md:text-5xl leading-none text-white!">{title}</h1>
        {subtitle && <p className="text-white/75 mt-3 max-w-xl">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
