import { Check } from 'lucide-react';

type AvatarColor = 'ocean' | 'teal' | 'navy';

interface AvatarProps {
  name: string;
  color?: AvatarColor;
  verified?: boolean;
  size?: number;
}

const GRADIENTS: Record<AvatarColor, string> = {
  ocean: 'from-ocean to-ocean-700',
  teal: 'from-teal-500 to-teal-700',
  navy: 'from-navy-700 to-navy',
};

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

/** Gradient initials avatar with an optional verified tick. */
export function Avatar({ name, color = 'ocean', verified = false, size = 44 }: AvatarProps) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className={`w-full h-full rounded-full bg-gradient-to-br ${GRADIENTS[color]} flex items-center justify-center font-semibold text-white`}
        style={{ fontSize: size * 0.36 }}
      >
        {initials(name)}
      </div>
      {verified && (
        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-teal border-2 border-white flex items-center justify-center">
          <Check className="w-2 h-2 text-white" strokeWidth={4} />
        </span>
      )}
    </div>
  );
}
