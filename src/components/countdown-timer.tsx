'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  endDate: string | null;
  className?: string;
}

function formatCountdown(endDate: Date): { text: string; urgent: boolean; warning: boolean } {
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();

  if (diff <= 0) {
    return { text: 'Ended', urgent: true, warning: false };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (days > 7) {
    const date = endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return { text: date, urgent: false, warning: false };
  }

  if (days > 0) {
    return { text: `${days}d ${remainingHours}h`, urgent: false, warning: days <= 2 };
  }

  if (hours > 0) {
    return { text: `${hours}h ${minutes}m`, urgent: hours <= 6, warning: true };
  }

  return { text: `${minutes}m`, urgent: true, warning: true };
}

export function CountdownTimer({ endDate, className }: CountdownTimerProps) {
  const [mounted, setMounted] = useState(false);
  const [countdown, setCountdown] = useState<{ text: string; urgent: boolean; warning: boolean }>({
    text: '',
    urgent: false,
    warning: false,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!endDate || !mounted) return;

    const end = new Date(endDate);

    const update = () => setCountdown(formatCountdown(end));
    update();

    // Only tick every second if within 24 hours
    const diff = end.getTime() - Date.now();
    const interval = diff < 24 * 60 * 60 * 1000 ? 1000 : 60000;

    const timer = setInterval(update, interval);
    return () => clearInterval(timer);
  }, [endDate, mounted]);

  if (!endDate) {
    return <span className={cn('text-sm text-slate-400', className)}>TBD</span>;
  }

  if (!mounted) {
    // SSR fallback — show the date
    const date = new Date(endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return <span className={cn('text-sm tabular-nums text-slate-600', className)}>{date}</span>;
  }

  return (
    <span
      className={cn(
        'text-sm tabular-nums font-medium',
        countdown.urgent ? 'text-rose-600' : countdown.warning ? 'text-amber-600' : 'text-slate-700',
        className
      )}
    >
      {countdown.text}
    </span>
  );
}
