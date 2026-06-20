import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  as?: 'div' | 'article' | 'section';
}

/** White, rounded, softly-shadowed surface — the base for feed/trust/how panels. */
export function Card({ children, className = '', hover = false, as: Tag = 'div' }: CardProps) {
  return (
    <Tag
      className={`bg-white rounded-2xl border border-line shadow-soft ${
        hover ? 'transition-transform transition-shadow duration-200 hover:-translate-y-1 hover:shadow-float' : ''
      } ${className}`}
    >
      {children}
    </Tag>
  );
}
