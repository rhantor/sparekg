interface SectionHeaderProps {
  label?: string;
  title: string;
  desc?: string;
  center?: boolean;
  dark?: boolean;
  className?: string;
}

/** Section eyebrow + display title + supporting copy. */
export function SectionHeader({ label, title, desc, center, dark, className = '' }: SectionHeaderProps) {
  return (
    <div className={`${center ? 'text-center' : ''} ${className}`}>
      {label && (
        <p className={`text-xs font-semibold uppercase tracking-[0.18em] mb-3 ${dark ? 'text-teal-300' : 'text-teal'}`}>
          {label}
        </p>
      )}
      <h2 className={`font-display text-3xl md:text-[2.5rem] leading-[1.1] mb-3 ${dark ? 'text-white' : 'text-navy'}`}>
        {title}
      </h2>
      {desc && (
        <p className={`text-[0.975rem] leading-relaxed ${center ? 'mx-auto' : ''} max-w-xl ${dark ? 'text-white/55' : 'text-ash'}`}>
          {desc}
        </p>
      )}
    </div>
  );
}
