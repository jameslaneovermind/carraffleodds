import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  /** Show the text wordmark alongside the dice icon */
  showText?: boolean;
}

export function Logo({ className, showText = true }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Dice icon */}
      <svg
        width="36"
        height="36"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-hidden="true"
      >
        <rect x="4" y="4" width="28" height="28" rx="5" fill="url(#dice-gradient)" />
        {/* 5-pip pattern */}
        <circle cx="10.5" cy="10.5" r="2.2" fill="#7c2d12" />
        <circle cx="25.5" cy="10.5" r="2.2" fill="#7c2d12" />
        <circle cx="18" cy="18" r="2.2" fill="#7c2d12" />
        <circle cx="10.5" cy="25.5" r="2.2" fill="#7c2d12" />
        <circle cx="25.5" cy="25.5" r="2.2" fill="#7c2d12" />

        <defs>
          <linearGradient id="dice-gradient" x1="4" y1="4" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fbbf24" />
            <stop offset="1" stopColor="#ea580c" />
          </linearGradient>
        </defs>
      </svg>

      {/* Wordmark */}
      {showText && (
        <span className="text-xl font-extrabold tracking-tight text-slate-900">
          Car
          <span className="text-slate-900">Raffle</span>
          <span className="text-amber-600">Odds</span>
        </span>
      )}
    </div>
  );
}
