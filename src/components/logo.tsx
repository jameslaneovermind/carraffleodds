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
        {/* Back die — grouped so rect + dots rotate together */}
        <g transform="rotate(10 21 13)">
          <rect
            x="10"
            y="2"
            width="22"
            height="22"
            rx="4"
            fill="url(#dice-gradient-1)"
          />
          {/* 5-pip pattern */}
          <circle cx="15.5" cy="7.5" r="1.7" fill="#1e3a5f" />
          <circle cx="26.5" cy="7.5" r="1.7" fill="#1e3a5f" />
          <circle cx="21" cy="13" r="1.7" fill="#1e3a5f" />
          <circle cx="15.5" cy="18.5" r="1.7" fill="#1e3a5f" />
          <circle cx="26.5" cy="18.5" r="1.7" fill="#1e3a5f" />
        </g>

        {/* Front die */}
        <rect
          x="2"
          y="10"
          width="22"
          height="22"
          rx="4"
          fill="url(#dice-gradient-2)"
        />
        {/* 5-pip pattern */}
        <circle cx="7.5" cy="15.5" r="1.8" fill="#1e3a5f" />
        <circle cx="18.5" cy="15.5" r="1.8" fill="#1e3a5f" />
        <circle cx="13" cy="21" r="1.8" fill="#1e3a5f" />
        <circle cx="7.5" cy="26.5" r="1.8" fill="#1e3a5f" />
        <circle cx="18.5" cy="26.5" r="1.8" fill="#1e3a5f" />

        <defs>
          <linearGradient id="dice-gradient-1" x1="10" y1="2" x2="32" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fbbf24" />
            <stop offset="1" stopColor="#ea580c" />
          </linearGradient>
          <linearGradient id="dice-gradient-2" x1="2" y1="10" x2="24" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f59e0b" />
            <stop offset="1" stopColor="#dc2626" stopOpacity="0.85" />
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
